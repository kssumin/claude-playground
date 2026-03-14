---
name: code-review
description: "Comprehensive code review for quality and security. Use when user says /code-review, 코드 리뷰, or after completing feature implementation."
allowed-tools: ["Read", "Grep", "Glob", "Bash", "Task"]
---

# /code-review - 코드 리뷰

> `requesting-code-review` superpowers 스킬을 함께 활용한다.
> 리뷰 피드백 반영 시 `receiving-code-review` 스킬로 기술적 검증 후 반영한다.

## Workflow

```
Phase 1: 컨텍스트 수집 ─────── (Silent, 사용자에게 출력 안함)
  │
Phase 2: 아키텍처 이해 ─────── 데이터 흐름, 동시성 모델, 모듈 경계 파악
  │
Phase 3: 변경사항 분석 ─────── 체크리스트 기반 이슈 도출
  │
Phase 4: 자기 검증 게이트 ──── 각 이슈를 프로젝트 아키텍처로 검증
  │                            (통과하지 못한 이슈 제거)
  │
Phase 5: 리포트 작성 ────────── What / Why / How 형식
  │
Phase 6: 사용자 확인 대기 ──── 자동 수정 절대 금지
  │
Phase 7: 승인된 이슈만 수정 ── 최소 변경 원칙
```

---

## Phase 0: 프로젝트 컨텍스트 로드

`.claude/project-context.md`의 `## [code-review]` 섹션이 있으면 읽는다.
- 프로젝트 특화 체크리스트 항목을 Phase 3에 추가한다.
- 없으면 범용 체크리스트만 사용한다.

---

## Phase 1: 컨텍스트 수집

사용자에게 출력하지 않고 조용히 수집한다.

1. `git diff --name-only` — 변경된 파일 목록
2. `git diff` — 전체 변경 내용
3. 변경된 파일을 **전체** 읽기 (diff만 보면 맥락을 놓침)
4. 변경된 파일이 의존하는 인터페이스/모델 파일 읽기

---

## Phase 2: 아키텍처 이해

분석 전에 반드시 파악해야 할 것:

| 항목 | 확인 내용 |
|------|----------|
| **데이터 흐름** | 요청이 어디서 시작해서 어디서 끝나는가 (API → Domain → Infra → External) |
| **동시성 모델** | Consumer Group 수, 파티션 할당 전략, 스레드 풀 구조 |
| **트랜잭션 경계** | 어디서 트랜잭션이 시작/종료되는가, Outbox 패턴 여부 |
| **에러 처리 전략** | 재시도 정책, DLQ, Circuit Breaker 유무 |
| **모듈 경계** | 어떤 모듈이 어떤 책임을 가지는가, 의존성 방향 |

이 이해가 없으면 Phase 3에서 잘못된 이슈를 만든다.

---

## Phase 3: 변경사항 분석

병렬 리뷰 (`dispatching-parallel-agents`):
- code-reviewer 에이전트 → 코드 품질
- security-reviewer 에이전트 → 보안

### 체크리스트

| 카테고리 | 심각도 | 검사 항목 |
|----------|--------|----------|
| Security | CRITICAL | 하드코딩 비밀, SQL Injection, 입력 미검증 |
| Multi-Module | CRITICAL | 의존성 방향 위반, domain 순수성 훼손 |
| Runtime | CRITICAL | 앱 기동 불가, 메시지 유실, 데이터 정합성 깨짐 |
| Code Quality | HIGH | 함수/파일 크기, 깊은 중첩, 에러 처리 누락 |
| Kotlin Idiom | HIGH | val/var 오용, null safety 미활용, data class 미사용 |
| Performance | MEDIUM | N+1 쿼리, EAGER 로딩, 불필요한 쿼리 |

---

## Phase 4: 자기 검증 게이트 (CRITICAL)

**Phase 3에서 도출된 모든 이슈는 반드시 이 게이트를 통과해야 한다.**

각 이슈에 대해 아래 3개 질문에 답한다. 하나라도 NO면 해당 이슈를 제거한다.

### 검증 1: 이 시나리오가 실제로 가능한가?

```
질문: 이 프로젝트의 아키텍처(Phase 2에서 파악한)에서 이 문제가 실제로 발생할 수 있는가?
판단: 구체적인 트리거 → 중간 과정 → 최종 결과를 단계별로 추적한다.
       한 단계라도 이 프로젝트에서 불가능하면 → 이슈 제거.
```

**탈락 예시:**
- "두 Consumer가 동시에 같은 메시지를 처리" → Consumer Group에서 파티션은 하나의 Consumer에만 할당됨 → **불가능**
- "API가 INSERT한 row를 Consumer가 못 찾음" → API가 트랜잭션으로 INSERT → Outbox → Kafka → Consumer가 조회. 트랜잭션 커밋 후 메시지가 발행되므로 row는 반드시 존재 → **불가능**

**통과 예시:**
- "send 실패 시 Redis에 이미 마킹됨 → 재전달 시 중복으로 판단 → 메시지 영원히 미발송" → markAsProcessed가 send 전에 호출됨 → 코드에서 확인 가능 → **가능**

### 검증 2: 심각도가 적절한가?

```
질문: 이 문제의 실제 영향 범위와 빈도를 고려했을 때 심각도가 맞는가?
판단: CRITICAL = 데이터 유실/보안 취약점/서비스 불가
      HIGH = 명확한 버그/규칙 위반
      MEDIUM = 개선 사항/잠재적 문제
      LOW = 스타일/선호도
```

### 검증 3: 제안된 수정이 비례하는가?

```
질문: 문제의 크기에 비해 수정 범위가 과도하지 않은가?
판단: 1줄 이동으로 해결 가능한 문제 → 1줄 이동 제안
      인터페이스 변경이 필요한 문제 → 인터페이스 변경 제안
      수정 규모 > 문제 규모 → 더 작은 수정 방법 찾기
```

**탈락 예시:**
- markAsProcessed 호출 순서 문제 → 인터페이스를 isDuplicateAndMark/unmark로 재설계 제안 → **과잉** (1줄 이동이면 충분)

---

## Phase 5: 리포트 작성

### 형식 (STRICT — 이 형식을 반드시 따른다)

각 이슈는 반드시 아래 3가지를 **모두** 포함한다:

```
## {심각도}: {파일명} - {한 줄 요약}

**문제**: {파일경로}:{라인} — 무엇이 문제인가 (코드 레벨)
**근거**: {트리거} → {중간 과정} → {최종 결과} (이 프로젝트의 구체적 시나리오)
**제안**: {최소한의 변경으로 어떻게 해결하는가}
```

### GOOD 예시

```
## CRITICAL: NotificationProcessor - 발송 전 마킹으로 인한 메시지 유실

**문제**: NotificationProcessor.kt:19 — markAsProcessed를 send 전에 호출
**근거**: send 실패 시 Redis에 이미 마킹됨 → Kafka 재전달 시 isDuplicate=true
        → 알림 영원히 미발송. 피크 시 외부 API 타임아웃 빈도 ↑ → 유실 규모 ↑
**제안**: markAsProcessed를 send 성공 후로 한 줄 이동 (인터페이스 변경 불필요)
```

```
## HIGH: KafkaConfig - DomainBeanConfig이 infra 모듈에 위치

**문제**: alarm-infra/config/DomainBeanConfig.kt — domain 서비스 빈 등록이 infra에 있음
**근거**: 빈 조합(composition)은 애플리케이션 모듈의 책임.
        infra에 있으면 alarm-api와 alarm-consumer가 불필요한 빈까지 로드하게 됨.
        (api는 NotificationProcessor 불필요, consumer는 NotificationService 불필요)
**제안**: DomainBeanConfig를 각 app 모듈(alarm-api, alarm-consumer)로 이동.
        각 모듈이 필요한 domain 빈만 등록.
```

### BAD 예시 (이렇게 쓰면 안 된다)

```
❌ 근거 없음:
## CRITICAL: DuplicateChecker - 동시성 문제
**문제**: RedisDuplicateChecker에서 race condition 발생 가능
**제안**: SET NX 원자적 연산으로 변경

→ 왜 race condition이 발생하는지 구체적 시나리오가 없음.
  실제로 Consumer Group 파티션 할당 구조에서 같은 메시지를 두 Consumer가
  동시에 처리하는 건 불가능함. Phase 4에서 탈락해야 할 이슈.
```

```
❌ 불가능한 시나리오:
## HIGH: NotificationRepositoryImpl - entity 조회 실패 시 무시

**문제**: updateStatus에서 entity가 없으면 조용히 return
**근거**: entity가 없으면 상태 업데이트가 누락됨
**제안**: entity가 없을 때 로그 경고 추가

→ API에서 INSERT → Outbox → Kafka → Consumer에서 updateStatus 호출.
  트랜잭션 커밋 후 메시지가 발행되므로 entity는 반드시 존재.
  "entity가 없는 상황"이 이 프로젝트에서 발생할 수 없음.
```

```
❌ 과잉 수정:
## CRITICAL: DuplicateChecker - markAsProcessed 호출 순서

**문제**: send 전에 markAsProcessed 호출
**제안**: 인터페이스를 isDuplicateAndMark/unmark 패턴으로 재설계.
        Redis SET NX로 원자적 마킹 + 실패 시 unmark 롤백.

→ 1줄 이동(markAsProcessed를 send 뒤로)이면 충분한 문제에
  인터페이스 재설계는 과잉. 수정 규모 ∝ 문제 규모 원칙 위반.
```

### 리포트 순서

CRITICAL → HIGH → MEDIUM → LOW 순서로 정렬.

---

## Phase 6: 사용자 확인 대기

**자동 수정 절대 금지. 이 단계를 건너뛸 수 없다.**

1. 리포트를 사용자에게 제시
2. 사용자의 피드백 대기
3. 사용자가 각 이슈에 대해 결정:
   - 수정 동의 → Phase 7에서 수정
   - 수정 거부 → 건너뜀
   - 반론 → 기술적 토론 후 재결정

---

## Phase 7: 승인된 이슈 수정

사용자가 동의한 이슈만 수정한다.

### 수정 원칙

- **최소 변경**: 문제 해결에 필요한 최소한의 코드만 변경
- **비례 원칙**: 수정 규모 ∝ 문제 규모
- **빌드 확인**: 수정 후 `./gradlew build` (또는 관련 모듈 빌드) 실행
- **테스트 확인**: 기존 테스트가 통과하는지 확인
- **변경 요약**: 각 수정 후 무엇을 왜 어떻게 변경했는지 보고

### refactor-cleaner 실행

- 수정 완료 후 **사용자 확인을 받은 뒤에만** refactor-cleaner 실행
- 자동 실행 금지

---

## Phase 8: 검증 파이프라인

Phase 7 완료 후 **자동으로** 실행한다.

### Step 1: 구조 + 커버리지 검증 (병렬)

`/arch-test`와 `/test-coverage`를 **병렬 에이전트로 동시 실행**한다.

- `/arch-test` — 모듈 의존성 방향, 패키지 격리, domain 순수성
- `/test-coverage` — 80%+ 커버리지 확인, 미달 영역 보고

### Step 2: 사용자 확인

검증 결과를 보고하고 사용자 확인을 받는다.
- 모두 PASS → "/perf-test를 실행할까요?" 확인
- FAIL 있음 → 실패 항목 보고, 수정 후 재검증

### Step 3: 성능 테스트

사용자 확인 후 `/perf-test`를 실행한다.
- ADR에 정의된 성능 목표 기준으로 판정
- 대상: 변경된 API 엔드포인트 자동 감지

---

## Blocking Rules

| 심각도 | 판정 | 의미 |
|--------|------|------|
| CRITICAL | BLOCK | 반드시 수정 필요 (데이터 유실, 보안, 서비스 불가) |
| HIGH | BLOCK | 수정 권장 (명확한 버그, 규칙 위반) |
| MEDIUM | WARN | 개선 권장 (성능, 가독성) |
| LOW | INFO | 참고 사항 (스타일, 선호) |

---

## 피드백 반영 원칙

- 리뷰 피드백은 **기술적으로 검증** 후 반영 (맹목적 동의 금지)
- 피드백이 기술적으로 틀리면 근거와 함께 반론
- `receiving-code-review` 스킬의 원칙을 따른다

---

## Phase 9: Compound 제안 (복리화)

> Phase 8 완료 후 자동으로 실행한다.

### 판단 기준

이번 작업에서 아래 중 하나라도 해당하면 복리화 가치가 있다:

| 가치 있음 | 가치 없음 |
|----------|----------|
| 새로운 패턴 도입 | 단순 오타/설정값 수정 |
| 반복 가능한 버그 수정 | 이미 문서화된 패턴 |
| 트레이드오프가 있는 결정 | 보일러플레이트 추가 |
| 외부 API/라이브러리 노하우 | 단순 CRUD |

### 실행 흐름

1. 리뷰 결과에서 복리화 가치가 있는 항목 식별
2. **가치 있음**: 사용자에게 제안
   ```
   💡 이번 작업에서 복리화할 패턴이 있습니다:
   - 주제: {주제}
   - 카테고리: {pattern | bugfix | decision | workaround}
   - 이유: {왜 복리화 가치가 있는지}

   /compound를 실행할까요?
   ```
3. **가치 없음**: 제안 없이 조용히 종료
4. 승인 시 → `/compound` 커맨드 실행

### 과거 실수 참조 (2계층 방지)

Phase 3(변경사항 분석) 중 `docs/solutions/`에서 `category: bugfix`인 문서를 검색한다.
동일 유형의 실수가 현재 코드에서 반복되면 리뷰 이슈에 추가:

```
## MEDIUM: {파일명} - 과거 해결된 패턴 미적용

**문제**: {현재 코드의 문제}
**근거**: docs/solutions/{문서명}에서 동일 문제를 해결한 기록이 있음.
        {과거 해결 방법 요약}
**제안**: 기존 솔루션 패턴 적용
```