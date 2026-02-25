# 성능 테스트 (k6)

## 핵심 원칙
- MUST: API 추가/변경 시 k6 성능 테스트 스크립트 함께 작성
- MUST: `/design` 단계에서 성능 목표(TPS, 응답시간) 정의, ADR에 기록
- MUST: k6는 Docker로 실행 (로컬 설치 불필요)
- MUST: 결과 판정 기준 — p95 < 500ms, p99 < 1s, 에러율 < 1%
- MUST: 현실적인 think time (sleep) 포함
- MUST: 랜덤 데이터로 분산 테스트 (캐시만 테스트 방지)
- NEVER: sleep 없는 무한 루프, 하드코딩 ID로만 테스트

## 상세 가이드
k6 스크립트 템플릿, thresholds.json, docker-compose 설정, 실행 명령어는 `perf-test-reference` 스킬을 참조하라.
