---
name: perf-test
description: "Run k6 performance tests for APIs. Generates scripts if missing, executes tests, and validates against thresholds defined in /design ADR."
allowed-tools: ["Read", "Write", "Edit", "Bash", "Grep", "Glob", "AskUserQuestion"]
---

# /perf-test - 성능 테스트 실행

API 구현 완료 후 k6 성능 테스트를 실행하여 `/design`에서 정의한 성능 목표 달성 여부를 검증합니다.

## Usage
```
/perf-test                          # 변경된 API 전체 테스트
/perf-test order                    # 특정 도메인만 테스트
/perf-test order/create-order.js    # 특정 스크립트만 실행
/perf-test --stress order           # 스트레스 테스트
```

## Workflow

### Step 1: 대상 파악
1. `git diff`로 변경된 Controller 파일 확인
2. 변경된 API 엔드포인트 추출
3. 해당 도메인의 k6 스크립트 존재 여부 확인
4. ADR에서 성능 목표 확인 (없으면 기본값 사용)

### Step 2: 스크립트 준비
k6 스크립트가 없으면 자동 생성:
1. Controller에서 엔드포인트 정보 추출 (method, path, request body)
2. `perf-test/scripts/{도메인명}/` 에 스크립트 생성
3. 공통 config, checks 모듈 import
4. ADR 성능 목표를 thresholds에 반영

```javascript
// 자동 생성되는 스크립트 구조
import http from 'k6/http';
import { sleep } from 'k6';
import { BASE_URL, defaultHeaders } from '../common/config.js';
import { checkResponse } from '../common/checks.js';

export const options = {
  // ADR에서 정의한 성능 목표 반영
  thresholds: {
    http_req_duration: ['p(95)<{ADR_P95}', 'p(99)<{ADR_P99}'],
    http_req_failed: ['rate<{ADR_ERROR_RATE}'],
  },
};
```

### Step 3: 테스트 실행
```bash
# 1. 앱 서버 실행 확인
curl -sf http://localhost:8080/actuator/health || echo "서버를 먼저 실행하세요"

# 2. Smoke Test (빠른 확인)
docker-compose run --rm k6 run /scripts/{도메인}/smoke-{도메인}.js

# 3. Load Test (부하 테스트)
docker-compose run --rm k6 run /scripts/{도메인}/load-{도메인}.js
```

### Step 4: 결과 분석 & 리포트
실행 결과를 분석하여 리포트 생성:

```markdown
## 성능 테스트 결과

### 대상 API
- POST /api/v1/orders (주문 생성)
- GET /api/v1/orders/{id} (주문 조회)

### 목표 (ADR-003)
| 지표 | 목표 | 결과 | 판정 |
|------|------|------|------|
| p95 응답시간 | < 500ms | 87ms | ✅ PASS |
| p99 응답시간 | < 1000ms | 156ms | ✅ PASS |
| 에러율 | < 1% | 0.0% | ✅ PASS |
| TPS | > 100 | 152/s | ✅ PASS |

### 상세
- 총 요청: 4,560
- 평균 응답시간: 45ms
- 최대 응답시간: 312ms
- VUs: 50 (1분 유지)

### 권장사항
- (이슈 있으면 원인 분석 및 개선 제안)
```

### Step 5: 조치
- **PASS**: 결과 기록, 다음 단계 진행
- **WARN**: 경고 로그, 개선 권장사항 제시
- **FAIL**: 병목 원인 분석 → 개선 → 재테스트

## 테스트 유형

### Smoke Test (기본)
```bash
docker-compose run --rm k6 run /scripts/{도메인}/create-{도메인}.js
# VU: 1, Duration: 10s → 기본 동작 확인
```

### Load Test
```bash
docker-compose run --rm k6 run /scripts/{도메인}/load-{도메인}.js
# Ramp up → Steady → Ramp down → 일반 부하 시뮬레이션
```

### Stress Test
```bash
docker-compose run --rm k6 run \
  --vus 300 --duration 3m \
  /scripts/{도메인}/create-{도메인}.js
# 한계치 확인
```

## 병목 원인 분석 가이드

성능 목표 미달 시 확인 순서:

| 순서 | 확인 항목 | 도구/방법 |
|------|----------|----------|
| 1 | 슬로우 쿼리 | Hibernate SQL 로그, `spring.jpa.properties.hibernate.session.events.log.LOG_QUERIES_SLOWER_THAN_MS` |
| 2 | N+1 쿼리 | Hibernate statistics, 쿼리 카운트 |
| 3 | DB 인덱스 | EXPLAIN ANALYZE |
| 4 | 커넥션 풀 | HikariCP 메트릭 (`/actuator/metrics/hikaricp.connections`) |
| 5 | GC 압박 | `-XX:+PrintGCDetails`, Actuator JVM 메트릭 |
| 6 | 외부 호출 | client-external 응답시간, Circuit Breaker 상태 |
| 7 | 직렬화 | 응답 DTO 크기, 불필요한 필드 |

## Integration
- `/design` → 성능 목표 정의 (ADR에 기록)
- `/tdd` → 기능 구현
- `/perf-test` → 성능 검증
- 실패 시 → 최적화 → `/perf-test` 재실행
