# 멀티모듈 아키텍처

## 모듈 책임
- **app-api/admin/batch**: Controller, DTO, 인증, 유효성 검증. app 모듈 간 코드 공유 금지
- **domain**: 순수 Kotlin 기반. Entity, VO, Domain Service, Port, Event, Exception. Spring stereotype(`@Service`, `@Transactional`)만 허용 — 인프라 Spring(data, web, boot, kafka, security)/JPA 금지
- **infra**: JPA Entity, Repository 구현, Redis, Kafka Producer, 인프라 Config
- **client-external**: 외부 API Client, Circuit Breaker, Retry
- **common**: 유틸, 상수, 공통 예외. 의존성 없음

## 의존성 방향 [CRITICAL]
- domain → common + Spring stereotype(context, tx)만 허용
- infra → domain + common
- client-external → domain + common
- app-* → domain + infra + client-external + common
- domain → infra, client-external 절대 금지
- app 모듈 간 상호 참조 금지

## 테스트 전략
| 모듈 | 종류 | 도구 |
|------|------|------|
| domain | Unit | JUnit 5 + MockK |
| infra | Integration | @DataJpaTest, Testcontainers |
| client-external | Integration | WireMock |
| app-api | Slice + E2E | @WebMvcTest, MockMvc |

## 상세 가이드
패키지 구조, Domain↔Infra 매핑 패턴, build.gradle.kts 예시는 `multi-module-reference` 스킬을 참조하라.
