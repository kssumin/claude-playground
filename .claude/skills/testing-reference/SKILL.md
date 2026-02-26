---
name: testing-reference
description: 테스트 요구사항 상세 레퍼런스. 프레임워크 테이블, TDD 6단계 상세, 모듈별 테스트 전략(domain/infra/app-api/client-external), 트러블슈팅 가이드 포함. 테스트 작성 시 참조.
---

# 테스트 레퍼런스

## 테스트 프레임워크

| 용도 | 도구 |
|------|------|
| 테스트 프레임워크 | JUnit 5 |
| Mocking | MockK |
| Assertion | AssertJ |
| Slice Test | @WebMvcTest, @DataJpaTest |
| 컨테이너 | Testcontainers |
| 외부 API Mock | WireMock |

## TDD 6단계 상세

1. **테스트 먼저 작성 (RED)** — 실패하는 테스트를 먼저 작성
2. **테스트 실행** — 반드시 FAIL 확인
3. **최소 구현 (GREEN)** — 테스트를 통과하는 최소한의 코드 작성
4. **테스트 실행** — 반드시 PASS 확인
5. **리팩토링 (IMPROVE)** — 코드 품질 개선 (테스트는 계속 PASS 유지)
6. **커버리지 확인** — 80% 이상 달성

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
2. 테스트 격리 확인 (독립 실행 가능한지)
3. Mock 정확성 검증 (stubbing 누락, 순서 이슈)
4. 구현 수정 (테스트가 틀리지 않은 한 구현을 고침)
