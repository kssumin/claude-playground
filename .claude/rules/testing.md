# 테스트 요구사항

## 핵심 원칙
- MUST: 테스트 코드를 먼저 작성하고, 테스트 통과 후에 구현과 함께 커밋한다. 테스트 없는 구현 커밋 금지
- MUST: 최소 커버리지 80%. Unit Test + Integration Test 모두 필수
- MUST: TDD — RED(테스트 먼저) → GREEN(최소 구현) → IMPROVE(리팩토링) → 커버리지 확인
- MUST: E2E 테스트가 TDD의 최외곽 RED. 컴포넌트 구현 후 E2E GREEN 확인 없이 완료 선언 금지
- MUST: 인프라 파이프라인(CDC, 메시지 큐, 외부 API) 포함 기능은 Testcontainers E2E 검증 필수
- MUST: 프레임워크 — JUnit 5 + MockK + AssertJ + Testcontainers + WireMock

## 테스트 3분류 (토스 전략)
- MUST: 도메인 정책 테스트 — 도메인 객체의 비즈니스 규칙 검증. 순수 단위 테스트, 실제 객체 우선
- MUST: 유스케이스 테스트 — 전 계층 블랙박스 E2E. 입력→최종 상태만 검증, 내부 구현 무관
- MUST: 직렬화 테스트 — 모듈 간 JSON/메시지 계약 보호. 필드명·타입 변경 즉시 감지

## 테스트 대역 선택
- MUST: 외부 서비스(발송 API, 외부 연동) → Fake 객체 (동작하는 가벼운 구현체)
- MUST: 내부 서비스(DB, Redis, Kafka) → 실제 객체 (Testcontainers)
- MUST: Mock은 최후의 수단 — domain 단위 테스트의 Port 격리 목적에서만 허용
- NEVER: E2E/유스케이스 테스트에서 Mock 사용 금지

## 모듈별 전략
- domain: Unit Test, infra: @DataJpaTest + Testcontainers, app-api: @WebMvcTest, consumer: E2E (Testcontainers + Fake), client-external: WireMock

## 클래스 네이밍
- MUST: 접미사로 유형 구분 — `Test`(단위), `IntegrationTest`(통합), `E2ETest`(유스케이스), `SerializationTest`(직렬화), `ArchitectureTest`(아키텍처)

## 상세 가이드
3분류 예시, Fake 패턴 템플릿, E2E/직렬화 테스트 템플릿, 트러블슈팅은 `testing-reference` 스킬을 참조하라.
