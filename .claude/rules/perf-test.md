# 성능 테스트 (k6)

## 핵심 원칙
- MUST: 테스트 전 목표 TPS + SLO(p95/p99/에러율/consumer lag) 정의. 목표 없는 테스트 금지
- MUST: **한 라운드에 1개 변수만 변경** (Single Variable Principle). 기여도 분리 불가한 동시 변경 금지
- MUST: 매 라운드 시작 전 reset-test-data.sh (TRUNCATE + FLUSH) + JVM warm-up
- MUST: `ramping-arrival-rate` executor 사용. `ramping-vus` + `sleep()`으로 TPS 측정 금지
- MUST: write/read 시나리오 분리 + 독립 latency 메트릭
- MUST: `dropped_iterations` threshold 설정 — VU 부족 감지
- MUST: k6는 Docker로 실행 (로컬 설치 불필요)
- MUST: Docker Compose 절대값에 **"로컬 Docker Compose 환경 기준"** 단서 필수
- MUST: 에러율 0.01%라도 HTTP status별 분류 + 원인 기록
- NEVER: k6 스크립트 변경 + 설정 변경을 같은 라운드에서 비교

## SLO 기본값
| 지표 | 임계치 |
|------|--------|
| p95 응답시간 | ≤ 200ms |
| p99 응답시간 | ≤ 500ms |
| 에러율 | ≤ 0.1% |
| Consumer lag | ≤ 1,000 |

## 상세 가이드
k6 템플릿, 모니터링 체크리스트, 보고서 템플릿, alarm 특화 가이드는 `perf-test-reference` 스킬을 참조하라.
