# Backend AI Toolkit - Kotlin + Spring Boot 멀티모듈

## 프로젝트 구조

```
project-root/
├── xxx-app-api           # 애플리케이션 모듈 (API 서버)
├── xxx-app-admin         # 애플리케이션 모듈 (어드민)
├── xxx-app-batch         # 애플리케이션 모듈 (배치/컨슈머)
├── xxx-domain            # 도메인 모듈 (핵심 비즈니스)
├── xxx-infra             # 인프라 모듈 (RDB, Redis, Kafka 등)
├── xxx-client-external   # 클라이언트 모듈 (외부 API 연동)
└── xxx-common            # 공통 모듈 (유틸, 상수, 예외)
```

## 기술 스택

- **언어**: Kotlin
- **프레임워크**: Spring Boot
- **빌드**: Gradle (Kotlin DSL)
- **ORM**: Spring Data JPA / Hibernate
- **테스트**: JUnit 5 + MockK + AssertJ + Testcontainers
- **인프라**: Docker + docker-compose (로컬 개발 환경)

## 모듈 의존성 규칙

```
app-api / app-admin / app-batch
    ↓ depends on
domain + infra + client-external + common

domain
    ↓ depends on
common (only)

infra
    ↓ depends on
domain + common

client-external
    ↓ depends on
domain + common

common
    → 의존성 없음 (독립)
```

## 핵심 규칙

1. **domain 모듈은 순수해야 한다** - Spring, JPA 등 프레임워크 의존성 금지
2. **비즈니스 로직은 domain에만** - infra/app 모듈에 비즈니스 로직 작성 금지
3. **모듈 경계 준수** - 하위 모듈이 상위 모듈 참조 금지
4. **Kotlin Idiom 준수** - data class, sealed class, 확장 함수 적극 활용
5. **불변성 우선** - val 사용, data class copy() 활용
6. **인프라는 Docker로** - 새 인프라 추가 시 docker-compose.yml에 서비스 정의 필수
7. **구현은 합의 후에** - 코드 작성 전 반드시 사용자와 접근법 합의. 검증/리뷰는 자동, 구현은 합의 후

## 개발 워크플로우

```
요구사항 탐색 (합의 필수)
  기능 구현 요청 시 → brainstorming 스킬 필수 호출 → 요구사항 명확화 + 접근법 합의

설계 단계 (합의 필수)
  /design → 확정된 요구사항 기반 아키텍처 설계 → ADR 작성

계획 단계 (합의 필수)
  /plan → writing-plans 스킬로 상세 계획 → 사용자 승인 후 진행

구현 단계 (합의 후 실행, 병렬 가능)
  /scaffold → /tdd → 독립 작업은 parallel agents로 병렬 실행
  git worktree로 기능별 격리 작업 가능

검증 단계 (자동 파이프라인)
  /code-review → /refactor-clean (승인 후)
    → /arch-test + /test-coverage (병렬, 자동)
    → 사용자 확인
    → /perf-test
    → verification 스킬로 완료 전 최종 검증
```

**CRITICAL: 기능 구현 요청 시 반드시 brainstorming → /design 순서로 진행한다.**
- brainstorming: 요구사항 명확화, 모듈 구조 합의 (기술 스택 결정은 여기서 하지 않음)
- /design: 규모 추정 → 관심사 도출 → 기술 선택 → 상세 설계 + ADR 작성
- brainstorming 없이 /design 직행 금지 (요구사항이 모호한 채로 설계하면 재작업 발생)
- **brainstorming에서 기술 스택(Kafka, Redis 등)을 미리 정하지 않는다. 기술 선택은 /design의 규모 추정(3-1) 결과에서 도출한다.**

| 단계 | 명령어 | 설명 | superpowers 연동 |
|------|--------|------|------------------|
| 0 | (자동) | 요구사항 탐색 + 합의 | `brainstorming` (필수) |
| 1 | `/design "기능 설명"` | 아키텍처 설계 + ADR | — |
| 2 | `/plan "기능 설명"` | 상세 구현 계획 | `writing-plans` |
| 3 | `/scaffold {도메인}` | 보일러플레이트 (선택) | — |
| 4 | `/tdd` | RED→GREEN→REFACTOR | `test-driven-development` |
| 5 | `/code-review` | 코드 품질 + 보안 + 검증 파이프라인 | `requesting-code-review` |
| 5a | `/refactor-clean` | 리팩토링 (코드 리뷰 후, 승인 필요) | — |
| 5b | `/arch-test` + `/test-coverage` | 구조 + 커버리지 검증 (병렬, 자동) | `verification-before-completion` |
| 5c | `/perf-test` | k6 성능 검증 (사용자 확인 후) | — |
| 6 | `/build-fix` | 빌드 오류 수정 | `systematic-debugging` |

### 속도 향상 도구
- **병렬 에이전트**: 독립적인 작업(리뷰+테스트+보안분석)은 `dispatching-parallel-agents`로 동시 실행
- **Git Worktree**: 기능별 격리 작업으로 충돌 없이 병렬 개발. `using-git-worktrees` 활용
- **브랜치 마무리**: 구현 완료 후 `finishing-a-development-branch`로 머지/PR 자동화

### 버그 대응
- 버그 발생 시 → `systematic-debugging` 스킬 자동 적용 (구조화된 디버깅)
- 코드 리뷰 피드백 → `receiving-code-review` 스킬로 기술적 검증 후 반영

### 하네스 유지보수
- `/memory-distill` — failures/decisions → 스킬 승격 (session-start 경고 시 실행)
- `/analyze-sessions` — 세션 로그 분석 → 반복 실패 패턴 + 하네스 개선 제언 (2주 이상 사용 후)
- `/arch-test` — ArchUnit 검사 + 엔트로피 체크 타임스탬프 기록 (7일 주기 권장)

## ADR (Architecture Decision Records)

기능 추가/아키텍처 변경 시 설계 결정을 문서화합니다.

```
docs/adr/
├── ADR-001-{title}.md
├── ADR-002-{title}.md
└── ...
```

- `/design` 실행 시 자동 생성
- 번호 자동 부여
- Status: Proposed → Accepted → Deprecated/Superseded
- 모듈별 변경 영향도 포함

## 설계 시 자동 제안

`/design` 실행 중 아래 조건에 해당하면 능동적으로 제안:

| 관심사 | 제안 조건 | 설계 항목 |
|--------|----------|----------|
| **캐시** | 반복 조회, 변경 빈도 낮은 데이터 | Redis 전략, TTL, 키 설계, 무효화 |
| **이벤트** | 후속 처리, 모듈 간 디커플링 | Kafka 토픽, 스키마, 멱등성, DLQ |
| **장애 대응** | 외부 API/인프라 연동 | Circuit Breaker, Retry, Fallback, Timeout |

## Skills

| 스킬 | 설명 |
|------|------|
| `kotlin-patterns` | Kotlin 패턴 및 idioms |
| `spring-hexagonal-patterns` | Spring Boot + 멀티모듈 아키텍처 |
| `spring-aop-patterns` | AOP 패턴 (로깅, 감사, 재시도) |
| `spring-jpa-performance` | JPA 성능 최적화 |
| `spring-testing` | MockK, Testcontainers, @WebMvcTest, REST Docs, 테스트 픽스처 |
| `spring-transaction` | 트랜잭션 전파/격리, 낙관적/비관적/분산 락 |
| `spring-cache` | Redis 캐시 설정, @Cacheable, 무효화, Cache-Aside |
| `spring-rest-client` | RestClient + Resilience4j (Circuit Breaker, Retry, Timeout, Fallback) |
| `kafka-patterns` | Kafka Producer/Consumer, 3단계 DLQ, 토픽 설계, Testcontainers 테스트 |
| `transactional-outbox` | Outbox + CDC(Debezium), Polling Publisher, 멱등 Consumer, 장애 복구 |
| `redis-operations` | Redis 운영 (SET NX 중복 체크, 분산 락, Rate Limiting, 키 설계, TTL) |
| `event-driven-patterns` | 최종 일관성, 보상 트랜잭션, 이벤트 순서 보장, DLQ 처리, 스키마 진화 |
| `commit` | Git 커밋 규칙 (제목만, Body/Co-Author 없음, 한국어) |
| `archunit-testing` | ArchUnit 아키텍처 테스트 패턴 (모듈 경계, 패키지 격리, domain 순수성) |
| `context-engineering` | Rule/Skill/Memory 생성·검증 워크플로우 (Progressive Disclosure) |
| `gradle-reference` | Gradle 빌드 템플릿 레퍼런스 (settings, toml, 모듈별 build.gradle.kts) |
| `api-docs-reference` | REST Docs + OpenAPI 3 문서화 레퍼런스 (테스트 패턴, 공통 필드) |
| `docker-reference` | docker-compose 템플릿, 이미지 목록, Graceful Shutdown 코드 |
| `perf-test-reference` | k6 스크립트 템플릿, thresholds, 실행 명령어 |
| `observability-reference` | Actuator, Logback, MDC, Metrics, Tracing 설정 코드 |
| `multi-module-reference` | 모듈별 책임 상세, 패키지 구조, Domain↔Infra 매핑 패턴 |
| `design-principles-reference` | BAD/GOOD 코드 예시, 상태 코드 테이블, ISP 예시, 안티패턴 상세 |
| `patterns-reference` | ApiResponse/ErrorResponse 코드, Idempotency Key 전체 구현, DomainException |
| `agents-reference` | 에이전트 테이블, 자동 트리거, /code-review 연동, 병렬 실행 예제 |
| `coding-style-reference` | Kotlin 스타일 가이드, 코드 품질 체크리스트 |
| `testing-reference` | 프레임워크 테이블, TDD 6단계 상세, 모듈별 테스트 전략 |
| `performance-reference` | 모델별 상세, 컨텍스트 윈도우 전략, 빌드 트러블슈팅 |
| `skill-feedback` | 스킬 산출물에 대한 피드백을 원본 스킬에 일반화하여 반영 |
| `pr-description` | PR 설명 작성 가이드 (diff 반복 금지, Problem→Solution→Design Decisions→Impact) |
| `troubleshooting-doc` | 트러블슈팅 경험을 docs/troubleshooting/에 기록 (증상→증거→원인→해결→예방) |

## Rules

Rules는 원칙만 포함 (30줄 이내). 코드 템플릿·상세 가이드는 Reference Skills로 분리.

| 규칙 | 설명 |
|------|------|
| `context-engineering` | Rules/Skills/Memory 작성 원칙, Progressive Disclosure |
| `multi-module` | 멀티모듈 구조, 의존성 방향 → 상세는 `multi-module-reference` 스킬 |
| `design-principles` | 설계 원칙, DDD 패턴 → 상세는 `design-principles-reference` 스킬 |
| `docker-infra` | Docker 인프라 원칙 → 상세는 `docker-reference` 스킬 |
| `api-docs` | API 문서화 원칙 → 상세는 `api-docs-reference` 스킬 |
| `perf-test` | k6 성능 테스트 원칙 → 상세는 `perf-test-reference` 스킬 |
| `gradle-multimodule` | Gradle 빌드 원칙 → 상세는 `gradle-reference` 스킬 |
| `observability` | 모니터링 원칙 → 상세는 `observability-reference` 스킬 |
| `coding-style` | Kotlin 코딩 스타일, 불변성 → 상세는 `coding-style-reference` 스킬 |
| `testing` | TDD, 80% 커버리지, 모듈별 테스트 → 상세는 `testing-reference` 스킬 |
| `security` | OWASP, 비밀 관리, 입력 검증 |
| `patterns` | API 응답, Repository, Service, 예외 → 상세는 `patterns-reference` 스킬 |
| `git-workflow` | 커밋 형식, PR 프로세스 |
| `agents` | Agent 오케스트레이션 원칙, 병렬 실행 → 상세는 `agents-reference` 스킬 |
| `performance` | 모델 선택, 컨텍스트 윈도우, 빌드 대응 → 상세는 `performance-reference` 스킬 |

## Agents

| Agent | 용도 |
|-------|------|
| `planner` | 기능 계획 수립 |
| `architect` | 시스템 설계 (자기 검증 + 안티패턴 감지 내장) |
| `tdd-guide` | TDD 개발 가이드 |
| `code-reviewer` | 코드 리뷰 |
| `security-reviewer` | 보안 분석 |
| `build-error-resolver` | 빌드 오류 해결 |
| `refactor-cleaner` | 리팩토링 |
| `design-reviewer` | 5단계 설계 검증 + ADR 생성 (BLOCK/WARN/PASS 판정) |
| `perf-tester` | k6 성능 테스트 실행 + 병목 분석 (PASS/WARN/FAIL 판정) |
| `coverage-analyzer` | 테스트 커버리지 분석 + 미달 영역 우선순위 판정 |
| `doc-updater` | 문서 업데이트 |

## 컨텍스트 전략

### 자동 수집 (매 커맨드 실행 시)
`/design`, `/plan`, `/orchestrate` 실행 시 자동으로 수집:
- 모듈 목록 (build.gradle.kts)
- 기존 ADR (docs/adr/)
- 인프라 현황 (docker-compose.yml)
- 관련 도메인 코드 (키워드 기반 Grep)
- 이전 세션 맥락 (memory/MEMORY.md)

### 메모리 활용
- `memory/MEMORY.md` - 프로젝트 상태, 사용자 선호, 세션 간 맥락
- `memory/decisions.jsonl` - 기술 결정 이력 (대안, 선택 이유, 결과) — append-only
- `memory/failures.jsonl` - 실패 기록 (근본 원인, 예방책) — append-only
- 새 ADR 생성, 모듈 추가, 주요 결정 시 메모리 업데이트
