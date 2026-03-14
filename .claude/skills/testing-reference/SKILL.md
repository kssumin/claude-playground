---
name: testing-reference
description: 테스트 전략 레퍼런스. 토스 테스트 3분류(도메인 정책/유스케이스/직렬화), 테스트 대역 선택 기준(Fake>Mock), TDD 6단계, 우리 프로젝트 실제 예시 포함. 테스트 작성 시 참조.
---

# 테스트 전략 레퍼런스

## 개요

테스트를 **무엇을** 작성할지 결정하는 전략 가이드.
Spring 도구 사용법(MockK, Testcontainers, @WebMvcTest 등)은 `spring-testing` 스킬을 참조하라.

## TDD 6단계

1. **테스트 먼저 작성 (RED)** — 실패하는 테스트를 먼저 작성
2. **테스트 실행** — 반드시 FAIL 확인
3. **최소 구현 (GREEN)** — 테스트를 통과하는 최소한의 코드 작성
4. **테스트 실행** — 반드시 PASS 확인
5. **리팩토링 (IMPROVE)** — 코드 품질 개선 (테스트는 계속 PASS 유지)
6. **커버리지 확인** — 80% 이상 달성

---

## 테스트 3분류

### 1. 도메인 정책 테스트 (단위 테스트)

도메인 객체의 비즈니스 규칙을 **실제 객체**로 검증한다.

**검증 대상**: 상태 전이, 도메인 변환(toDomain/from), 경계값, 불변 조건

```kotlin
// 상태 전이 규칙 — 허용 전이 + 불가능 전이 둘 다 검증
class NotificationTest {
    private fun createNotification(status: NotificationStatus = REQUESTED) = Notification(
        id = 1L, requesterId = "user-1", idempotencyKey = "key-1",
        channel = Channel.SMS, recipient = "recipient-1",
        title = "제목", content = "내용", status = status,
    )

    @Test
    fun `complete - REQUESTED에서 SENT로 전이`() {
        val completed = createNotification(REQUESTED).complete()
        assertThat(completed.status).isEqualTo(SENT)
        assertThat(completed.sentAt).isNotNull()
    }

    @Test
    fun `complete - SENT에서 호출 시 예외`() {
        assertThatThrownBy { createNotification(SENT).complete() }
            .isInstanceOf(IllegalArgumentException::class.java)
    }
}
```

```kotlin
// 도메인 변환 — 라운드트립 + 에러 케이스
class NotificationMessageTest {
    @Test
    fun `toDomain 후 from 변환은 원본과 동일`() {
        val original = NotificationMessage(...)
        assertThat(NotificationMessage.from(original.toDomain())).isEqualTo(original)
    }

    @Test
    fun `잘못된 channel 문자열로 toDomain 호출 시 예외`() {
        assertThatThrownBy { NotificationMessage(..., channel = "INVALID").toDomain() }
            .isInstanceOf(IllegalArgumentException::class.java)
    }
}
```

---

### 2. 유스케이스 테스트 (E2E / 블랙박스)

전 계층을 블랙박스로 커버한다. **입력과 최종 상태만 검증**, 내부 구현 무관.

**검증 대상**: Kafka→Consumer→DB 파이프라인, DLQ 라우팅, 중복 방지, API E2E

```kotlin
@SpringBootTest
@Testcontainers
@Import(TestSenderConfig::class)
@TestPropertySource(properties = ["alarm.kafka.max-retry-attempts=0"])
class DlqRoutingE2ETest {
    // Testcontainers: MySQL + Kafka + Redis (실제 인프라)
    // FakeNotificationSender: 외부 서비스 대체

    @Test
    fun `발송 실패 시 work → retry → dead 라우팅 후 FAILED 상태`() {
        // Given: sender 항상 실패
        val saved = notificationJpaRepository.save(NotificationJpaEntity(...))
        val message = NotificationMessage(id = saved.id, ...)

        // When: Kafka 토픽에 메시지 발행
        kafkaTemplate.send("alarm-notification-work", ...).get()

        // Then: DB 최종 상태만 검증 (블랙박스)
        await().atMost(Duration.ofSeconds(30)).untilAsserted {
            val updated = notificationJpaRepository.findById(saved.id).orElseThrow()
            assertThat(updated.status).isEqualTo(NotificationStatus.FAILED)
        }
    }
}
```

---

### 3. 직렬화 테스트

모듈 간 JSON 계약을 보호한다. 필드 이름/타입 변경 시 즉시 깨짐.

```kotlin
class NotificationMessageSerializationTest {
    private val objectMapper: ObjectMapper = jacksonObjectMapper()

    @Test
    fun `JSON 라운드트립`() {
        val message = NotificationMessage(...)
        val restored = objectMapper.readValue<NotificationMessage>(
            objectMapper.writeValueAsString(message))
        assertThat(restored).isEqualTo(message)
    }

    @Test
    fun `JSON 필드명 계약`() {
        val jsonMap = objectMapper.readValue<Map<String, Any>>(
            objectMapper.writeValueAsString(NotificationMessage(...)))
        assertThat(jsonMap).containsOnlyKeys(
            "id", "requesterId", "idempotencyKey",
            "channel", "recipient", "title", "content",
        )
    }

    @ParameterizedTest
    @ValueSource(strings = ["SMS", "EMAIL", "PUSH"])
    fun `모든 enum 값 직렬화`(channel: String) { ... }
}
```

---

## 테스트 대역 선택 기준

| 상황 | 선택 | 이유 |
|------|------|------|
| 외부 서비스 (발송 API, 외부 연동) | **Fake** | 동작하는 구현체로 실제 시나리오 재현 |
| 내부 인프라 (DB, Redis, Kafka) | **실제 객체** (Testcontainers) | 인프라 호환성 검증 |
| domain 단위 테스트의 Port | **MockK** | 외부 의존 격리 (최후의 수단) |

### Fake 패턴 템플릿

```kotlin
class FakeNotificationSender : NotificationSender {
    private val callCount = AtomicInteger(0)
    @Volatile var failUntilAttempt: Int = Int.MAX_VALUE

    override fun send(notification: Notification): SendResult {
        val attempt = callCount.incrementAndGet()
        return if (attempt >= failUntilAttempt) SendResult(success = true)
        else SendResult(success = false, failReason = "Simulated failure (attempt $attempt)")
    }

    fun reset() { callCount.set(0); failUntilAttempt = Int.MAX_VALUE }
}
```

### Fake Bean 등록

```kotlin
@TestConfiguration
class TestSenderConfig {
    @Bean @Primary
    fun notificationSender(): FakeNotificationSender = FakeNotificationSender()
}

// 사용: @Import(TestSenderConfig::class)
```

---

## 체크리스트

새 기능 구현 시 아래 3가지를 모두 점검한다:

```
□ 도메인 정책 테스트
  - 새 비즈니스 규칙 추가 시 → 허용 케이스 + 불가능 케이스 둘 다
  - 변환 메서드 추가 시 → 라운드트립 + 에러 케이스

□ 유스케이스 테스트
  - 핵심 정상 흐름 E2E + 실패 흐름 E2E
  - 블랙박스 (최종 상태만 검증, 내부 구현 무관)

□ 직렬화 테스트
  - 모듈 간 전달 메시지/DTO → 라운드트립 + 필드명 계약 + enum 커버리지
```

## 모듈별 커버리지 목표

| 모듈 | 목표 | 제외 대상 |
|------|------|----------|
| alarm-domain | **90%+** | — |
| alarm-infra | **80%+** | Config 클래스, JPA Entity (직렬화 테스트로 보완) |
| alarm-api | **80%+** | DTO 클래스 |
| alarm-consumer | **80%+** | KafkaConfig (E2E로 검증) |
| alarm-client-external | **80%+** | Config 클래스 |

---

## Testcontainers 싱글턴 컨테이너 패턴

테스트 스위트 전체에서 컨테이너를 1회만 기동해 속도를 높인다.

```kotlin
abstract class IntegrationTestSupport {
    companion object {
        @JvmStatic
        val mysql: MySQLContainer<*> = MySQLContainer("mysql:8.0")
            .withDatabaseName("alarm_db")
            .withReuse(true)  // ← 핵심

        @JvmStatic
        val kafka: KafkaContainer = KafkaContainer(DockerImageName.parse("apache/kafka:4.0.0"))
            .withReuse(true)

        @JvmStatic
        val redis: GenericContainer<*> = GenericContainer("redis:7-alpine")
            .withExposedPorts(6379)
            .withReuse(true)

        init { mysql.start(); kafka.start(); redis.start() }
    }
}
```

### 베이스 클래스 2종 선택

| 클래스 | 롤백 | 사용 시나리오 |
|--------|------|-------------|
| `IntegrationTestSupport` | **없음** | Kafka→DB E2E (Consumer가 별도 tx로 커밋) |
| `IntegrationTestSupportWithTx` | **@Transactional** | Repository 쿼리 단독 검증 |

**함정**: E2E 테스트에서 `@Transactional` 롤백 베이스 클래스 쓰면 Consumer 커밋 데이터를 볼 수 없다.

로컬 설정 (`~/.testcontainers.properties`):
```properties
testcontainers.reuse.enable=true
```

---

## 트러블슈팅

1. 테스트 격리 확인 (독립 실행 가능한지)
2. Mock 정확성 검증 (stubbing 누락, 순서 이슈)
3. 구현 수정 (테스트가 틀리지 않은 한 구현을 고침)
4. `@ConditionalOnBean` 사용한 Config가 로드 안 되면 → `@ConditionalOnProperty`로 교체
