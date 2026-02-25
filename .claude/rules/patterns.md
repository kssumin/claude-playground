# 공통 패턴

## API 응답
- MUST: 모든 엔드포인트에서 일관된 응답 구조 (success, data, error)
- MUST: 적절한 HTTP 상태 코드 반환
- MUST: 페이지네이션 메타데이터 포함 (content, page, size, totalElements, totalPages)

## Repository Pattern
- MUST: domain 모듈에 Port 인터페이스 정의, infra 모듈에서 구현
- MUST: 표준 CRUD — findById, save, delete
- SHOULD: findAll에서 필터링, 페이지네이션 지원

## Service Layer Pattern
- MUST: 비즈니스 로직은 Service 레이어에서 처리
- NEVER: Controller나 Repository에 비즈니스 로직 작성 금지

## Idempotency Key Pattern
- 상태 변경 API(POST/PUT/PATCH/DELETE)에 적용
- 흐름: Idempotency-Key 헤더 → 기존 결과 있으면 반환, 없으면 처리 후 저장
- Redis + @ConfigurationProperties TTL로 구현

## Domain Exception Pattern
- sealed class로 정의 (NotFound, AlreadyExists, InvalidState, AccessDenied)
- errorCode + message 포함

## 상세 가이드
ApiResponse/ErrorResponse 코드, Idempotency 전체 구현(Port+Redis+AOP), DomainException 코드는 `patterns-reference` 스킬을 참조하라.
