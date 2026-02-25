# 테스트 요구사항

## 최소 테스트 커버리지: 80%

테스트 종류 (모두 필수):
1. **Unit Test** - 개별 함수, 유틸리티, 도메인 서비스
2. **Integration Test** - API 엔드포인트, DB 연동, 외부 API

## 테스트 프레임워크

| 용도 | 도구 |
|------|------|
| 테스트 프레임워크 | JUnit 5 |
| Mocking | MockK |
| Assertion | AssertJ |
| Slice Test | @WebMvcTest, @DataJpaTest |
| 컨테이너 | Testcontainers |
| 외부 API Mock | WireMock |

## TDD (Test-Driven Development)

필수 워크플로우:
1. 테스트 먼저 작성 (RED)
2. 테스트 실행 - 반드시 FAIL
3. 최소 구현 (GREEN)
4. 테스트 실행 - 반드시 PASS
5. 리팩토링 (IMPROVE)
6. 커버리지 확인 (80%+)

## 모듈별 테스트 전략

### domain 모듈
- 순수 Unit Test (프레임워크 의존성 없음)
- MockK로 Port 인터페이스 Mocking
- 비즈니스 로직 100% 커버리지 목표

### infra 모듈
- @DataJpaTest로 Repository 테스트
- Testcontainers로 실제 DB 테스트
- Domain ↔ JPA Entity 매핑 테스트

### app-api 모듈
- @WebMvcTest로 Controller 슬라이스 테스트
- MockMvc로 HTTP 요청/응답 검증
- 인증/인가 테스트

### client-external 모듈
- WireMock으로 외부 API Mock
- 에러 시나리오 (timeout, 4xx, 5xx) 테스트

## 트러블슈팅

1. **tdd-guide** agent 사용
2. 테스트 격리 확인
3. Mock 정확성 검증
4. 구현 수정 (테스트가 틀리지 않은 한)
