---
name: scaffold
description: "Generate boilerplate code for a new domain across multi-module structure"
allowed-tools: ["Read", "Write", "Edit", "Bash", "Grep", "Glob", "AskUserQuestion"]
---

# /scaffold - 새 도메인 보일러플레이트 생성

멀티모듈 구조에 맞춰 새 도메인의 기본 코드를 자동 생성합니다.

## Usage
```
/scaffold order
/scaffold payment
/scaffold notification
```

## 생성되는 파일 구조

`/scaffold {도메인명}` 실행 시 아래 파일을 자동 생성:

```
xxx-domain/src/main/kotlin/com/xxx/domain/{도메인명}/
├── model/
│   └── {Domain}.kt              # 도메인 엔티티
├── port/
│   ├── {Domain}Repository.kt    # Outbound Port (저장소)
│   └── {UseCase}UseCase.kt      # Inbound Port (유스케이스)
├── service/
│   └── {Domain}Service.kt       # 도메인 서비스
└── exception/
    └── {Domain}Exception.kt     # 도메인 예외 (sealed class)

xxx-infra/src/main/kotlin/com/xxx/infra/{도메인명}/
├── entity/
│   └── {Domain}JpaEntity.kt     # JPA 엔티티
├── repository/
│   ├── {Domain}JpaRepository.kt # Spring Data JPA Repository
│   └── {Domain}RepositoryImpl.kt # Port 구현체
└── mapper/                       # (필요 시)

xxx-app-api/src/main/kotlin/com/xxx/api/{도메인명}/
├── controller/
│   └── {Domain}Controller.kt    # REST Controller
└── dto/
    ├── {Domain}Request.kt       # 요청 DTO
    └── {Domain}Response.kt      # 응답 DTO

xxx-domain/src/test/kotlin/com/xxx/domain/{도메인명}/
└── service/
    └── {Domain}ServiceTest.kt   # 도메인 서비스 단위 테스트

xxx-infra/src/test/kotlin/com/xxx/infra/{도메인명}/
└── repository/
    └── {Domain}RepositoryImplTest.kt  # Repository 통합 테스트

xxx-app-api/src/test/kotlin/com/xxx/api/{도메인명}/
├── controller/
│   └── {Domain}ControllerTest.kt      # Controller 슬라이스 테스트
└── docs/
    └── {Domain}ControllerDocsTest.kt   # REST Docs API 문서 테스트
```

## Workflow

### Step 1: 도메인 정보 수집
1. 도메인명 확인 (영문 소문자, 단수형)
2. 프로젝트 패키지명 탐지 (build.gradle.kts 또는 기존 코드에서)
3. 사용자에게 질문:
   - 주요 필드 (이름, 타입)
   - CRUD 중 필요한 기능
   - API 엔드포인트 prefix

### Step 2: 코드 생성
각 모듈에 맞는 보일러플레이트 생성:

#### domain 모듈 - 순수 Kotlin
```kotlin
// model/{Domain}.kt
data class {Domain}(
    val id: Long = 0,
    val name: String,
    val status: {Domain}Status,
    val createdAt: LocalDateTime = LocalDateTime.now()
)

enum class {Domain}Status { ACTIVE, INACTIVE }

// port/{Domain}Repository.kt
interface {Domain}Repository {
    fun findById(id: Long): {Domain}?
    fun save(domain: {Domain}): {Domain}
    fun findAll(pageable: PageRequest): Page<{Domain}>
}

// service/{Domain}Service.kt
class {Domain}Service(
    private val repository: {Domain}Repository
) {
    fun create(command: Create{Domain}Command): {Domain} { ... }
    fun findById(id: Long): {Domain} { ... }
}

// exception/{Domain}Exception.kt
sealed class {Domain}Exception(
    errorCode: String, message: String
) : DomainException(errorCode, message) {
    class NotFound(id: Long) : {Domain}Exception("NOT_FOUND", "{Domain} not found: $id")
}
```

#### infra 모듈 - JPA 매핑
```kotlin
// entity/{Domain}JpaEntity.kt
@Entity @Table(name = "{domains}")
class {Domain}JpaEntity( ... ) {
    fun toDomain(): {Domain} = ...
    companion object { fun from(domain: {Domain}): {Domain}JpaEntity = ... }
}

// repository/{Domain}RepositoryImpl.kt
@Repository
class {Domain}RepositoryImpl(
    private val jpaRepository: {Domain}JpaRepository
) : {Domain}Repository { ... }
```

#### app-api 모듈 - REST API
```kotlin
// controller/{Domain}Controller.kt (문서 어노테이션 없이 깨끗하게)
@RestController
@RequestMapping("/api/v1/{도메인명}s")
class {Domain}Controller( ... ) {
    @PostMapping fun create(...): ApiResponse<{Domain}Response>
    @GetMapping("/{id}") fun getById(...): ApiResponse<{Domain}Response>
    @GetMapping fun getAll(...): ApiResponse<PageResponse<{Domain}Response>>
}

// dto/{Domain}Request.kt, {Domain}Response.kt
```

#### 테스트 코드
```kotlin
// domain: MockK 기반 단위 테스트
// infra: @DataJpaTest + Testcontainers
// app-api: @WebMvcTest + MockMvc
```

#### API 문서 테스트 (REST Docs)
```kotlin
// docs/{Domain}ControllerDocsTest.kt
@WebMvcTest({Domain}Controller::class)
@AutoConfigureRestDocs
class {Domain}ControllerDocsTest {
    // REST Docs + restdocs-api-spec으로 OpenAPI 3 스펙 생성
    // 각 API별 request/response 필드 문서화
}
```

### Step 3: 검증
1. 컴파일 확인: `./gradlew compileKotlin`
2. 생성된 파일 목록 출력
3. 다음 단계 안내

## 네이밍 규칙

| 입력 | 클래스명 | 패키지명 | 테이블명 | API 경로 |
|------|---------|---------|---------|---------|
| order | Order | order | orders | /api/v1/orders |
| payment | Payment | payment | payments | /api/v1/payments |
| user-profile | UserProfile | userprofile | user_profiles | /api/v1/user-profiles |

## 옵션

사용자에게 물어볼 항목:
1. **주요 필드**: "어떤 필드가 필요한가요? (예: name:String, price:Long, status:Enum)"
2. **CRUD 범위**: "전체 CRUD? 또는 특정 기능만? (C/R/U/D)"
3. **Soft Delete**: "소프트 딜리트 필요한가요?"
4. **감사 필드**: "createdAt, updatedAt, createdBy 필요한가요?"
