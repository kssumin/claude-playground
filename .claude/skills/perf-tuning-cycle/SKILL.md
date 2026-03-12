---
name: perf-tuning-cycle
description: "성능 튜닝 전체 사이클. 변경 적용 후 성능 테스트 실행 → Grafana/Prometheus 내부 지표 캡처 → 분석 → 개선안 제안까지 한 바퀴. Use when user says '성능 테스트 돌려', '성능 사이클', '지표 캡처', '/perf-cycle', or after applying performance-related config changes."
---

# 성능 튜닝 사이클 (Perf Tuning Cycle)

코드/설정 변경 후 **테스트 → 캡처 → 분석 → 제안**을 한 사이클로 실행한다.
변경만 하고 끝내지 않는다. 항상 테스트로 증명하고 캡처로 기록한다.

> **프로젝트 설정**: 프로젝트별 실제 값(컨테이너명, 대시보드 UID, TPS 목표 등)은
> `references/alarm-project.md` (alarm) 또는 프로젝트 전용 config 파일 참조.

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
  ↓
Step 5: 진단 (Action Item 근거 확보 — 다음 단계 진행 GATE)
```

> **CRITICAL**: Step 5 없이 다음 설계/구현 진행 금지.
> Action Item이 "왜 그 처방인가"를 숫자와 코드로 증명해야 한다.

### 변형: A/B 비교 사이클

BEFORE/AFTER 비교가 필요할 때 (설정 변경 효과 측정):

```
Step 0: 사전 검증
  ↓
Step 0.5: DB TRUNCATE + Redis FLUSH (클린 상태)
  ↓
Step 1A: BEFORE 테스트 → Step 2A: BEFORE 캡처
  ↓
Step 0.5: DB TRUNCATE + Redis FLUSH (클린 상태 복원)
  ↓
Step 1B: AFTER 테스트 → Step 2B: AFTER 캡처
  ↓
Step 3: 비교 분석 → Step 4: 비교 보고서
```

**CRITICAL: 테스트 간 DB/Redis 초기화 필수.** 데이터 누적은 쿼리 성능에 직접 영향.

---

## Step 0: 사전 검증 (GATE)

**내부 메트릭 없이 테스트를 돌리면 HTTP 응답시간만 보게 된다. 원인 분석이 불가. 진행 금지.**

### 메트릭 수집 검증
```bash
# 1. HikariCP 메트릭 노출 확인
curl -sf http://localhost:{app_port}/actuator/prometheus | grep hikaricp_

# 2. Prometheus scrape 대상 확인
curl -s 'http://localhost:9090/api/v1/query?query=up'
# → 앱 이름이 result에 보여야 함
```

### 클린 상태 검증
```bash
# 프로젝트 reset 스크립트 실행 — DB + Redis + Kafka offset + binlog 모두 초기화
bash perf-test/reset-test-data.sh

# Kafka lag 0 확인
docker exec alarm-kafka /opt/kafka/bin/kafka-consumer-groups.sh \
  --bootstrap-server localhost:9092 --describe --group alarm-consumer 2>&1 \
  | awk '/alarm-notification-work/{lag+=$6} END{print "work lag:", lag}'
# → 0이어야 함
```

### ⚠️ 앱 재시작 시 강화 웜업 (CRITICAL)

표준 smoke(50 TPS × 3min)는 JVM JIT 임계치 미달. **앱을 재시작했다면 반드시 강화 웜업 실행:**

```bash
# 1단계: 표준 smoke
docker compose --profile test run --rm k6 run /scripts/smoke.js

# 2단계: 중간 부하로 JIT 완성 (앱 재시작 시에만)
docker compose --profile test run --rm k6 run \
  --env BASE_URL=http://host.docker.internal:8080 \
  -e 'import http from "k6/http"; export const options={scenarios:{w:{executor:"constant-arrival-rate",rate:100,timeUnit:"1s",duration:"2m",preAllocatedVUs:200}}}; export default ()=>http.post(`${__ENV.BASE_URL}/api/v1/notifications`,JSON.stringify({channel:"SMS",recipient:"01012345678",title:"t",content:"c"}),{headers:{"Content-Type":"application/json","X-User-Id":"warmup","Idempotency-Key":Math.random().toString()}}); ' \
  /dev/stdin 2>/dev/null || echo "강화 웜업 완료"
# 간단하게: 수동으로 100 TPS 2분 load.js 실행 후 진행
```

> **언제 앱 재시작이 발생하는가**: 코드 변경 후 `./gradlew bootRun`, 메모리 부족, OOM 킬, 명시적 재시작

**하나라도 실패 → Step 1 진행 금지.**

---

## Step 1: 성능 테스트 실행

```bash
# 1. 전체 환경 시작 (프로젝트 config 참조)
{start_script}

# 2. DB/Redis 초기화
{reset_script}

# 3. Smoke (필수 — JVM warm-up)
docker compose --profile test run --rm k6 run /scripts/smoke.js
# → 100% 성공 확인 후 다음 단계

# 4. Load (필수)
mkdir -p {results_dir}/{round-label}
docker compose --profile test run --rm k6 run \
  --out experimental-prometheus-rw \
  --summary-export=/scripts/results/{round-label}/k6-summary.json \
  /scripts/load.js
```

> **주의**: `--summary-export` 경로는 컨테이너 내부 기준.
> `/scripts/` = 호스트의 `{k6_scripts_volume}/`. `results/` 디렉토리가 그 안에 있어야 함.

### 로컬 Docker Compose TPS 조정 원칙
> **MUST**: 로컬 환경은 운영 목표 TPS의 약 1/4로 시작. 이유: 단일 머신에서 앱+인프라 동시 실행.

| 환경 | write TPS | read TPS | 설정 방법 |
|------|-----------|----------|----------|
| 로컬 Docker Compose | 운영 목표 ÷ 4 | 운영 목표 ÷ 4 | load.js stages.target 값 조정 |
| 운영 목표 | 프로젝트 ADR 기준 | 프로젝트 ADR 기준 | — |

절대값 보고 시 반드시 **"로컬 Docker Compose 환경 기준"** 단서 필수.

---

## ⛔ Step 1.5: 캡처 즉시 실행 (BLOCKING — load 완료 직후 반드시 실행)

**load test가 끝나는 순간 분석보다 캡처가 먼저다. 데이터는 `now-6m` 범위 안에만 있다.**

```bash
DIR="docs/perf-reports/{date}-{label}"
mkdir -p "$DIR"

# Grafana PNG (alarm 프로젝트 기준 — spring_boot_21 대시보드)
python3 -c "
import subprocess, os
dir='$DIR'
uid='spring_boot_21'; slug='spring-boot-3-x-statistics'
TM='from=now-6m&to=now&width=1200&height=400&kiosk&theme=light'
BASE=f'http://admin:admin@localhost:3000/render/d-solo/{uid}/{slug}'
API='orgId=1&var-application=alarm-api&var-instance=host.docker.internal%3A8080&var-hikaricp=HikariPool-1'
CON='orgId=1&var-application=alarm-consumer&var-instance=host.docker.internal%3A8082&var-hikaricp=HikariPool-1'
panels=[
    (API,'36','api-hikaricp-connections.png'),
    (API,'2', 'api-response-time.png'),
    (API,'68','api-threads.png'),
    (CON,'36','consumer-hikaricp-connections.png'),
    (CON,'2', 'consumer-response-time.png'),
    (CON,'68','consumer-threads.png'),
]
for vars,pid,name in panels:
    r=subprocess.run(['curl','-sf',f'{BASE}?{vars}&panelId={pid}&{TM}','-o',f'{dir}/{name}'],capture_output=True)
    size=os.path.getsize(f'{dir}/{name}') if os.path.exists(f'{dir}/{name}') else 0
    print(f'{name}: {\"OK\" if r.returncode==0 and size>1000 else \"FAIL (size=\"+str(size)+\")\"}')
"

# k6 summary 복사
cp perf-test/results/{round-label}/k6-summary.json "$DIR/"

# Prometheus 지표
python3 -c "
import urllib.parse, subprocess, json
dir='$DIR'
def q(name, query):
    r=subprocess.run(['curl','-s',f'http://localhost:9090/api/v1/query?query={urllib.parse.quote(query)}'],capture_output=True,text=True)
    vals=[(x['metric'].get('name','?'),x['value'][1]) for x in json.loads(r.stdout)['data']['result']] or [('N/A','N/A')]
    return f'{name}: {vals}'
lines=[
    q('api_hikaricp_pending_max',  'max_over_time(hikaricp_connections_pending{application=\"alarm-api\"}[6m])'),
    q('api_hikaricp_active_max',   'max_over_time(hikaricp_connections_active{application=\"alarm-api\"}[6m])'),
    q('con_hikaricp_pending_max',  'max_over_time(hikaricp_connections_pending{application=\"alarm-consumer\"}[6m])'),
    q('cb_failure_rate',           'resilience4j_circuitbreaker_failure_rate{application=\"alarm-consumer\"}'),
    q('cb_state_open',             'resilience4j_circuitbreaker_state{application=\"alarm-consumer\",state=\"open\"}'),
    q('api_5xx_total',             'sum(increase(http_server_requests_seconds_count{application=\"alarm-api\",status=~\"5..\"}[6m]))'),
]
open(f'{dir}/prometheus-metrics.txt','w').write('\n'.join(lines))
print('prometheus-metrics.txt 저장 완료')
"
```

**⛔ 캡처 완료 확인 — 이 명령이 성공해야 Step 2(분석)로 진행 가능:**
```bash
ls docs/perf-reports/{date}-{label}/*.png | wc -l
# → 5 이상이어야 함. 0이면 캡처 실패 → 재실행
```

---

## Step 2: 결과 캡처

### 디렉토리 구조
```bash
mkdir -p docs/perf-reports/{date}-{label}/
# A/B 비교: before/, after/ 서브디렉토리 추가
```

### Grafana PNG — 개별 패널 캡처 (CRITICAL)

**전체 대시보드 URL은 접힌(collapsed) 패널이 N/A. 반드시 `d-solo` + `panelId`로 개별 캡처.**

```bash
# 1. 대시보드 UID 조회
curl -s 'http://admin:admin@localhost:3000/api/search?type=dash-db' \
  | python3 -c "import json,sys; [print(d['uid'], d['title']) for d in json.load(sys.stdin)]"

# 2. 패널 ID 조회
curl -s 'http://admin:admin@localhost:3000/api/dashboards/uid/{dashboard_uid}' | python3 -c "
import json, sys
d = json.load(sys.stdin)
for p in d['dashboard']['panels']:
    if p.get('type') == 'row':
        for sub in p.get('panels', []):
            print(f'  sub  ID={sub[\"id\"]:3d}: {sub[\"title\"]}')
    else:
        print(f'panel ID={p[\"id\"]:3d}: {p[\"title\"]}')
"

# 3. 개별 패널 캡처
BASE='http://admin:admin@localhost:3000/render/d-solo/{dashboard_uid}/{slug}'
COMMON='&from=now-6m&to=now&width=1200&height=400&kiosk&theme=light'
APP_VARS='orgId=1&var-application={app_name}&var-instance={instance}&var-hikaricp=HikariPool-1'

curl -sf "${BASE}?${APP_VARS}&panelId={panel_id}${COMMON}" -o "{dir}/{name}.png"
```

**캡처 시간 범위**: `from=now-6m` (이전 실행 데이터 혼입 방지)

### 필수 캡처 패널 (Spring Boot 3.x Micrometer 기준)

| 패널 | 의미 | panelId 확인 방법 |
|------|------|-----------------|
| HikariCP Connections | Active/Idle/Pending — 커넥션 병목 | "Connections" 패널 검색 |
| HTTP Response Time | 엔드포인트별 응답시간 | "Response Time" 패널 검색 |
| HTTP Request Count | 실제 처리 TPS | "Request Count" 패널 검색 |
| GC Count | GC 압박 여부 | "GC Count" 패널 검색 |
| Threads | Tomcat 스레드 사용량 | "Threads" 패널 검색 |

> **주의**: `tomcat_threads_busy_threads` 메트릭은 별도 설정 없이 미수집될 수 있음.
> 패널이 N/A면 Action Item으로 기록. (Spring Boot Actuator → `management.metrics.enable.tomcat=true` 필요)
> 공식 문서: https://docs.spring.io/spring-boot/docs/current/reference/html/actuator.html#actuator.metrics.supported.tomcat

> 프로젝트별 실제 대시보드 UID + panelId + 복붙 스크립트는 `references/{project}-project.md` 참조.

### Prometheus 핵심 지표 수집

```bash
APP="{app_name}"  # 프로젝트 config에서 확인

python3 -c "
import urllib.parse, subprocess, json
queries = [
  ('hikaricp_pending_max',   f'max_over_time(hikaricp_connections_pending{{application=\"{app}\"}}[6m])'),
  ('hikaricp_active_max',    f'max_over_time(hikaricp_connections_active{{application=\"{app}\"}}[6m])'),
  ('heap_used_max_MB',       f'max_over_time(jvm_memory_used_bytes{{application=\"{app}\",area=\"heap\"}}[6m])/1024/1024'),
  ('executor_active_max',    f'max_over_time(executor_active_threads{{application=\"{app}\"}}[6m])'),
  ('http_active_req_max',    f'max_over_time(http_server_requests_active_seconds_count{{application=\"{app}\"}}[6m])'),
  ('http_5xx_total',         f'sum(increase(http_server_requests_seconds_count{{application=\"{app}\",status=~\"5..\"}}[6m]))'),
  ('gc_pause_max_ms',        f'max_over_time(jvm_gc_pause_seconds_max{{application=\"{app}\"}}[6m])*1000'),
]
for name, q in queries:
    r = subprocess.run(['curl','-s',f'http://localhost:9090/api/v1/query?query={urllib.parse.quote(q)}'], capture_output=True, text=True)
    data = json.loads(r.stdout)
    vals = [(x['metric'].get('name','?'), x['value'][1]) for x in data['data']['result']] or [('N/A','N/A')]
    print(f'{name:30s}: {vals}')
"
```

### 검증
- PNG 파일 크기 확인: 0바이트 또는 <1KB면 렌더링 실패
- PNG 1개 이상 Read 도구로 열어 실제 그래프 확인

---

## Step 3: 분석

**두 가지 관점으로 분석. 상세 체크리스트는 `references/analysis-guide.md` 참조.**

### 관점 1: 숨겨진 설정 동작 (Hidden Behavior)
- 갑작스러운 TPS 드롭, 레이턴시 스파이크, 간헐적 타임아웃 등 **이상 현상** 식별
- 프레임워크 내부 동작이 원인인지 추론. **공식 문서 링크 필수**

### 관점 2: 실제 병목 (Bottleneck)
- 부하 조건(목표 TPS)과 설정값의 수치적 불일치
- Prometheus 메트릭으로 근거 뒷받침

### 교차 분석 (핵심)

| k6 현상 | + 내부 지표 | → 원인 유형 |
|---------|------------|------------|
| p95 높음 | HikariCP pending 높음 | [숨겨진] OSIV / [병목] pool size |
| p95 높음 | GC pause 높음 | [병목] 힙 부족 |
| p95 높음 | 내부 정상 | [숨겨진] 외부 호출 blocking |
| 에러율 높음 | active = max | [병목] 커넥션 고갈 |
| TPS 정체 | consumer lag 증가 | [병목] Consumer < 유입 / [숨겨진] 파티션=1 |
| 급격한 저하 (cliff) | 스레드 포화 | [숨겨진] 스레드 vs 커넥션 비대칭 |

### 발견 사항 형식
```
### 발견 N: [제목]
- **유형**: [숨겨진 동작] 또는 [병목]
- **현상**: 관찰된 이상 (수치)
- **원인**: 어떤 설정/동작이 문제인가
- **근거**: 공식 문서 URL, 수치 계산
- **개선안**: 구체적 설정/코드 변경
- **예상 효과**: 변경 후 기대 개선
```

---

## Step 4: 보고서 + Action Items

`docs/perf-reports/{date}-{label}/REPORT.md` 생성. 보고서 템플릿은 `perf-test-reference` 스킬 참조.

이전 보고서(`docs/perf-reports/INDEX.md`)가 있으면 추이 기록 및 업데이트.

### Action Items 형식 (보고서 말미 필수)

```markdown
## Action Items

### 미확인 Hidden Behavior
| ID | 항목 | 잠재 영향 | 확인 방법 | 상태 |
|----|------|----------|----------|------|
| A1 | ... | ... | ... | TODO |

### 성능 병목 개선
| ID | 항목 | 목적 | 방법 | 상태 |
|----|------|------|------|------|
| B1 | ... | ... | ... | TODO |

### 우선순위 (영향도 ÷ 난이도)
| 순위 | ID | 항목 | 영향도 | 난이도 |
|------|-----|------|--------|--------|
```

---

## Step 5: 진단 (다음 설계 진행 GATE)

**Action Item에 처방을 내리기 전, "왜 그 처방인가"를 숫자와 코드로 증명해야 한다.**

### 5-1. HikariCP 커넥션 점유 시간 분석

```bash
# 두 앱 모두 확인
curl -sf http://localhost:{port}/actuator/prometheus | grep "hikaricp_connections_" | grep -v "^#"

# acquire_seconds_sum / acquire_seconds_count = 평균 커넥션 대기 시간
# usage_seconds_sum  / usage_seconds_count  = 평균 커넥션 점유 시간 (≈ 트랜잭션 시간)
```

판단 기준:
- **usage 높음** → 트랜잭션 안에 느린 작업 있음 (외부 API, 느린 쿼리)
- **acquire 높음** → pool 경쟁 심함. pending spike와 함께 보면 pool 크기 문제
- **usage/acquire 비율 > 5x** → 점유가 대기보다 압도적으로 길다 → 트랜잭션 범위 조사 필요

### 5-2. 트랜잭션 경계 정적 분석

각 @Transactional 메서드에서 확인:
- [ ] 트랜잭션 안에 외부 API 호출 있는가?
- [ ] 트랜잭션 안에 Redis 호출 있는가?
- [ ] 필요 없는 SELECT (중복 체크 등)가 INSERT 전에 있는가?
- [ ] N+1 쿼리가 발생하는가?

### 5-3. Consumer 파이프라인 상태 확인

```bash
# Kafka 토픽 메시지 수 확인 (0이면 CDC 문제)
docker exec alarm-kafka /opt/kafka/bin/kafka-consumer-groups.sh \
  --bootstrap-server localhost:9092 --describe --group alarm-consumer

# Debezium connector 상태
curl -s http://localhost:8083/connectors/alarm-outbox-connector/status

# DB outbox vs Kafka 메시지 수 불일치 확인
docker exec alarm-mysql mysql -uroot -proot -e "SELECT COUNT(*) FROM alarm_db.outbox;"
```

### 5-4. 진단 결과 문서화 (필수)

`docs/perf-reports/{date}-{label}/DIAGNOSIS.md` 생성:

```markdown
# 진단 보고서

## HikariCP 커넥션 점유 시간
| 앱 | acquire 평균 | usage 평균 | 해석 |
|---|---|---|---|

## 트랜잭션 경계
(코드 파일 경로 + 라인 번호 + 트랜잭션 안에서 하는 일 목록)

## 파이프라인 상태
(Kafka LOG-END-OFFSET, Debezium 상태, DB 레코드 수)

## 처방 근거
(각 Action Item이 왜 유효한지 숫자로 뒷받침)
```

---

## 체크리스트

- [ ] `/actuator/prometheus` HikariCP 메트릭 수집 확인
- [ ] DB/Redis 클린 상태 확인
- [ ] k6 smoke 100% 통과
- [ ] k6 load 완료 + summary 보존
- [ ] Grafana PNG 개별 패널 캡처 (`d-solo` + `panelId`, 0바이트 없음)
- [ ] 캡처 시간 범위 `now-6m`
- [ ] Prometheus 핵심 지표 숫자로 기록
- [ ] Hidden Behavior + Bottleneck 이중 관점 분석
- [ ] 교차 분석 완료
- [ ] `REPORT.md` + Action Items 작성
- [ ] 이전 보고서 Action Items 상태 업데이트
- [ ] **[Step 5] HikariCP acquire/usage time 계산 및 기록**
- [ ] **[Step 5] 트랜잭션 경계 정적 분석 완료**
- [ ] **[Step 5] Consumer 파이프라인 상태 확인 (Kafka offset, Debezium)**
- [ ] **[Step 5] `DIAGNOSIS.md` 작성 완료 → 다음 설계 진행 허용**

---

## 관련 스킬 / 참조

| 문서 | 용도 |
|------|------|
| `references/alarm-project.md` | alarm 프로젝트 전용 값 (컨테이너명, UID, panelId, TPS) |
| `perf-test-reference` 스킬 | k6 스크립트 템플릿, thresholds, 실행 명령어 |
| `static-perf-analysis` 스킬 | 코드 정적 분석 (테스트 없이 추론) |
| `observability-reference` 스킬 | Actuator, Metrics 설정 |
| `references/analysis-guide.md` | Hidden Behavior + Bottleneck 상세 체크리스트 |
