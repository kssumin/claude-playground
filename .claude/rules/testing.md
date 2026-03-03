# 테스트 요구사항

## 핵심 원칙
- MUST: 최소 커버리지 80%. Unit Test + Integration Test 모두 필수
- MUST: TDD — RED(테스트 먼저) → GREEN(최소 구현) → IMPROVE(리팩토링) → 커버리지 확인
- MUST: E2E 테스트가 TDD의 최외곽 RED. 컴포넌트 구현 후 E2E GREEN 확인 없이 완료 선언 금지
- MUST: 인프라 파이프라인(CDC, 메시지 큐, 외부 API) 포함 기능은 docker-compose E2E 검증 필수
- MUST: 프레임워크 — JUnit 5 + MockK + AssertJ + Testcontainers + WireMock
- MUST: domain은 순수 Unit Test, infra는 @DataJpaTest + Testcontainers, app-api는 @WebMvcTest, client-external은 WireMock

## 트러블슈팅
- MUST: tdd-guide agent 사용. 테스트 격리 확인, Mock 정확성 검증, 구현 수정 우선

## 상세 가이드
프레임워크 테이블, TDD 6단계 상세, 모듈별 테스트 전략 상세는 `testing-reference` 스킬을 참조하라.
