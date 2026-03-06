---
name: perf-tuning-cycle
description: "성능 튜닝 전체 사이클. 변경 적용 후 성능 테스트 실행 → Grafana/Prometheus 내부 지표 캡처 → 분석 → 개선안 제안까지 한 바퀴. Use when user says '성능 테스트 돌려', '성능 사이클', '지표 캡처', '/perf-cycle', or after applying performance-related config changes."
---

# 성능 튜닝 사이클 (Perf Tuning Cycle)

코드/설정 변경 후 **테스트 → 캡처 → 분석 → 제안**을 한 사이클로 실행한다.
변경만 하고 끝내지 않는다. 항상 테스트로 증명하고 캡처로 기록한다.

## 전체 흐름

```
Step 0: 사전 검증 (GATE — 내부 메트릭 + 클린 상태)
  ↓
Step 1: 성능 테스트 실행 (k6 smoke → load)
  ↓
Step 2: 결과 캡처 (k6 summary + Grafana PNG + Prometheus 숫자)
  ↓
Step 3: 분석 (Hidden Behavior + Bottleneck 이중 관점)
  ↓
Step 4: 보고서 + Action Items (REPORT.md)
```

### 변형: A/B 비교 사이클

BEFORE/AFTER 비교가 필요할 때 (설정 변경 효과 측정):

```
Step 0: 사전 검증
  ↓
Step 0.5: DB TRUNCATE + Redis FLUSH (클린 상태)
  ↓
Step 1A: BEFORE 테스트 (변경 전 설정)
  ↓
Step 2A: BEFORE 캡처
  ↓
Step 0.5: DB TRUNCATE + Redis FLUSH (클린 상태 복원)
  ↓
Step 1B: AFTER 테스트 (변경 후 설정)
  ↓
Step 2B: AFTER 캡처
  ↓
Step 3: 비교 분석
  ↓
Step 4: 비교 보고서
```

**CRITICAL: 테스트 간 DB/Redis 초기화 필수.** 데이터 누적은 쿼리 성능에 직접 영향. 초기화 없이 비교하면 AFTER가 불공정하게 불리해진다.

## Step 0: 사전 검증 (GATE)

**내부 메트릭 없이 테스트를 돌리면 HTTP 응답시간만 보게 된다. 원인 분석이 불가. 진행 금지.**

### 메트릭 수집 검증
1. `actuator` + `micrometer-registry-prometheus` 의존성 확인 (모든 app 모듈)
2. `management.endpoints.web.exposure.include: health,info,metrics,prometheus` 설정 확인
3. 앱 실행 후 `curl -sf http://localhost:{port}/actuator/prometheus | grep hikaricp_` → 메트릭 출력 확인
4. Prometheus scrape 대상에 앱 등록 확인 (`curl localhost:9090/api/v1/query?query=up`)

### 클린 상태 검증 (A/B 비교 시 필수)
```bash
# DB 초기화
docker exec alarm-mysql mysql -uroot -proot alarm_db -e "TRUNCATE TABLE outbox; TRUNCATE TABLE notification;"
# Redis 초기화
docker exec alarm-redis redis-cli FLUSHDB
# 검증
docker exec alarm-mysql mysql -uroot -proot alarm_db -e "SELECT COUNT(*) FROM notification;"
```

**하나라도 실패 → Step 1 진행 금지.**

## Step 1: 성능 테스트 실행

1. Docker 인프라 healthy 확인 (mysql, redis, kafka, prometheus, grafana)
2. **Smoke** (필수): `docker compose run --rm k6 run /scripts/smoke.js` → 100% 성공 확인
3. **Load** (필수):
   ```bash
   docker compose run --rm \
     -e K6_PROMETHEUS_RW_SERVER_URL=http://prometheus:9090/api/v1/write \
     -e K6_PROMETHEUS_RW_TREND_AS_NATIVE_HISTOGRAM=true \
     k6 run /scripts/load.js
   ```
   - **summary 전체를 보존** (보고서에 포함)
4. **Stress** (선택): 한계점 확인 시만

k6 스크립트/설정 상세는 `perf-test-reference` 스킬 참조.

## Step 2: 결과 캡처

### 디렉토리 구조
```bash
# 단일 사이클
mkdir -p docs/perf-reports/{date}-{label}/

# A/B 비교 사이클
mkdir -p docs/perf-reports/{date}-{label}/before
mkdir -p docs/perf-reports/{date}-{label}/after
```

### Grafana PNG — 개별 패널 캡처 (CRITICAL)

**전체 대시보드 URL은 접힌(collapsed) 패널이 N/A로 렌더링된다. 반드시 `d-solo` + `panelId`로 개별 캡처.**

```bash
# 대시보드 UID + 패널 ID 확인
curl -s 'http://admin:admin@localhost:3000/api/dashboards/uid/{dashboard_uid}' | python3 -c "
import json, sys
d = json.load(sys.stdin)
for p in d['dashboard']['panels']:
    if p.get('type') == 'row':
        for sub in p.get('panels', []):
            print(f\"  Panel ID={sub['id']}: {sub['title']}\")
    else:
        print(f\"Panel ID={p['id']}: {p['title']}\")
"

# 개별 패널 캡처 (접힌 패널도 정상 렌더링)
BASE='http://admin:admin@localhost:3000/render/d-solo/{dashboard_uid}/{slug}'
COMMON='&from=now-6m&to=now&width=1200&height=500&kiosk'

curl -s "${BASE}?orgId=1&var-application={app}&var-instance={instance}&var-hikaricp=HikariPool-1&panelId={id}${COMMON}" \
  -o "{dir}/{name}.png"
```

**캡처 시간 범위**: 테스트 직후 `from=now-6m` (이전 실행 데이터 혼입 방지. 10m이면 이전 테스트와 겹칠 수 있음)

### 필수 캡처 패널

| 패널 | panelId (Spring Boot 3.x) | 의미 |
|------|---------------------------|------|
| HikariCP Connections | 36 | Active/Idle/Pending — 커넥션 병목 |
| HTTP Response Time | 2 | 엔드포인트별 응답시간 |
| HTTP Request Count | 4 | 실제 처리 TPS |
| GC Count | 74 | GC 압박 여부 |

### Prometheus 핵심 지표 (숫자로 보존)

```bash
# 한 번에 수집
for query in \
  'max_over_time(hikaricp_connections_pending{application="alarm-api"}[10m])' \
  'max_over_time(hikaricp_connections_active{application="alarm-api"}[10m])' \
  'max_over_time(jvm_memory_used_bytes{application="alarm-api",area="heap"}[10m])' \
  'rate(jvm_gc_pause_seconds_sum{application="alarm-api"}[10m])'; do
  echo "=== $query ==="
  curl -s "http://localhost:9090/api/v1/query?query=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$query'))")" | python3 -c "import json,sys; [print(r['value'][1]) for r in json.load(sys.stdin)['data']['result']]" 2>/dev/null
done
```

### 검증
- `ls -la *.png` → 0바이트 또는 <1KB 파일 없는지 확인 (렌더링 실패 시 작은 에러 이미지 생성됨)
- PNG를 Read 도구로 열어 실제 그래프가 보이는지 1개 이상 확인

## Step 3: 분석

**두 가지 관점으로 분석한다. 상세 체크리스트는 `references/analysis-guide.md` 참조.**

### 관점 1: 숨겨진 설정 동작 (Hidden Behavior)
"이 설정이 내부적으로 이렇게 동작하는 줄 몰랐다"에 해당하는 경우.
- 갑작스러운 TPS 드롭, 레이턴시 스파이크, 간헐적 타임아웃 등 **이상 현상** 식별
- 단순 리소스 부족이 아닌 **프레임워크 내부 동작**이 원인인지 추론
- 공식 문서 / 소스 코드 레벨의 **근거** 필수

### 관점 2: 실제 병목 (Bottleneck)
설정값이 부하 조건과 **수치적으로 맞지 않는** 경우.
- 부하 조건(목표 TPS, 동시 사용자)과 설정값의 불일치
- Prometheus 메트릭으로 근거 뒷받침

### 교차 분석 (핵심)
k6(외부)에서 현상을 잡고, Prometheus(내부)로 원인을 특정:

| k6 현상 | + 내부 지표 | → 원인 유형 |
|---------|------------|------------|
| p95 높음 | HikariCP pending 높음 | [숨겨진] OSIV / [병목] pool size |
| p95 높음 | GC pause 높음 | [병목] 힙 부족 |
| p95 높음 | 내부 정상 | [숨겨진] 외부 호출 blocking |
| 에러율 높음 | active = max | [병목] 커넥션 고갈 |
| TPS 정체 | lag 증가 | [병목] Consumer < 유입 / [숨겨진] 파티션=1 |
| 급격한 저하 (cliff) | 스레드 포화 | [숨겨진] 스레드 vs 커넥션 비대칭 |

### 발견 사항 형식
```
### 발견 N: [제목]
- **유형**: [숨겨진 동작] 또는 [병목]
- **현상**: 관찰된 이상 (수치)
- **원인**: 어떤 설정/동작이 문제인가
- **근거**: 공식 문서, 소스 코드, 수치 계산
- **개선안**: 구체적 설정/코드 변경
- **예상 효과**: 변경 후 기대 개선
```

## Step 4: 보고서 + Action Items

`docs/perf-reports/{date}-{label}/REPORT.md` 생성:
- 변경 사항 (Before → After)
- k6 결과 (외부 지표)
- Prometheus 결과 (내부 지표)
- 교차 분석 (발견 사항)
- 판정
- **Action Items** (아래 형식)

이전 보고서(`docs/perf-reports/INDEX.md`)가 있으면 추이 기록. INDEX.md 업데이트.

### Action Items 형식

보고서 말미에 반드시 포함:

```markdown
## Action Items

### 미확인 Hidden Behavior (코드/설정 검토 필요)

| ID | 항목 | 잠재 영향 | 확인 방법 | 상태 |
|----|------|----------|----------|------|
| A1 | ... | ... | ... | TODO/DONE/N/A |

### 성능 병목 개선 (테스트로 확인 필요)

| ID | 항목 | 목적 | 방법 | 상태 |
|----|------|------|------|------|
| B1 | ... | ... | ... | TODO/DONE/N/A |

### 우선순위 (영향도 ÷ 난이도)

| 순위 | ID | 항목 | 영향도 | 난이도 |
|------|-----|------|--------|--------|
```

Action Items는 다음 사이클의 입력이 된다. 이전 보고서의 Action Items 중 TODO 항목을 확인하고, 해당 사이클에서 검증하거나 상태를 업데이트한다.

## 체크리스트

- [ ] `/actuator/prometheus` 내부 메트릭 수집 확인됨
- [ ] DB/Redis 클린 상태 확인 (A/B 비교 시)
- [ ] k6 smoke 100% 통과
- [ ] k6 load 완료 + summary 보존
- [ ] Grafana PNG **개별 패널** 캡처 (`d-solo` + `panelId`, 0바이트 없음)
- [ ] 캡처 시간 범위 `now-6m` (이전 실행 혼입 방지)
- [ ] Prometheus 핵심 지표 숫자로 기록
- [ ] Hidden Behavior + Bottleneck 이중 관점 분석 수행
- [ ] 교차 분석 (외부 + 내부) 완료
- [ ] `REPORT.md` 작성 완료
- [ ] **Action Items 포함** (미확인 Hidden + 병목 개선 + 우선순위)
- [ ] 이전 보고서 Action Items 상태 업데이트

## 관련 스킬

| 스킬 | 용도 | 언제 참조 |
|------|------|-----------|
| `perf-test-reference` | k6 스크립트 템플릿, thresholds, 실행 명령어 | Step 1 |
| `static-perf-analysis` | 코드 정적 분석 (테스트 없이 추론) | Step 3 사전 점검 |
| `observability-reference` | Actuator, Logback, MDC, 커스텀 Metrics | Step 0 설정 |
| `references/analysis-guide.md` | Hidden Behavior + Bottleneck 상세 체크리스트 | Step 3 분석 |
