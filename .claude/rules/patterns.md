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
- 상태 변경 API에 적용. 흐름: 헤더 → 기존 결과 있으면 반환, 없으면 처리 후 저장
- MUST: 세부 정책 결정 — 생성 주체(클라이언트/서버), 유일성 범위(글로벌/사용자), 포맷

## 방어 장치 에러 경로
- MUST: 방어 장치(UNIQUE, 검증) 추가 시, 위반 시 사용자 응답까지 구현 (500 방치 금지)
- MUST: DB 제약 위반 예외는 infra에서 catch → 도메인 예외 변환

## Domain Exception Pattern
- sealed class로 정의 (NotFound, AlreadyExists, InvalidState, AccessDenied)
- errorCode + message 포함

## 상세 가이드
ApiResponse/ErrorResponse 코드, Idempotency 전체 구현(Port+Redis+AOP), DomainException 코드는 `patterns-reference` 스킬을 참조하라.
