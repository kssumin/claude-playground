# Docker 인프라

## 핵심 원칙
- MUST: 새 인프라는 Docker + docker-compose 사용. 직접 설치(brew, apt-get) 금지
- MUST: 모든 컨테이너에 container_name, ports, volumes(named), healthcheck 필수
- MUST: depends_on은 healthcheck condition과 함께 사용
- MUST: 이미지 버전 명시 (latest 태그 금지)
- MUST: 환경 변수는 기본값 사용 (`${VAR:-default}`)
- MUST: `.env` 파일은 `.gitignore`, `.env.example`만 커밋
- MUST: Graceful Shutdown — `server.shutdown=graceful`, `stop_grace_period` > `timeout-per-shutdown-phase`
- MUST: 인프라 추가 4단계 — docker-compose → application.yml → infra Config → Testcontainers

## 상세 가이드
docker-compose 템플릿, 이미지 목록, Graceful Shutdown 코드, 운영 명령어는 `docker-reference` 스킬을 참조하라.
