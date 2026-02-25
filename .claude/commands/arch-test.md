---
name: arch-test
description: "ArchUnit 아키텍처 규칙 검사. Use when user says /arch-test, 아키텍처 검사, 계층 검사, 의존성 검사, or after adding new modules/packages."
allowed-tools: ["Read", "Write", "Edit", "Bash", "Grep", "Glob"]
---

# /arch-test - 아키텍처 규칙 검사

Gradle 모듈 의존성 → ArchUnit 코드 레벨 의존성 순서로 아키텍처를 검증한다.

## Workflow

```
Phase 0: Gradle 모듈 의존성 검증 (build.gradle.kts)
  │
  ├─ 위반 있음 → 보고 + 사용자 확인 (여기서 중단 가능)
  │
  └─ 위반 없음 → Phase 1
      │
Phase 1: ArchUnit 테스트 실행 (코드 레벨)
  │
Phase 2: 결과 분석 (PASS / FAIL)
  │
  ├─ 전체 PASS → 요약 보고
  │
  └─ FAIL 있음 → Phase 3
      │
Phase 3: 위반 분석 + 수정 제안
  │
Phase 4: 신규 규칙 필요 여부 판단
```

---

## Phase 0: Gradle 모듈 의존성 검증 (CRITICAL — 최우선)

**ArchUnit은 코드 레벨 검사다.** `build.gradle.kts`에서 이미 금지된 모듈을 의존하고 있으면, 코드 레벨에서 아무리 검사해도 의미가 없다. 따라서 **Gradle 의존성부터 먼저 검증**한다.

이 단계에서는 두 가지를 동시에 검증한다:
1. **실제 의존성이 규칙을 위반하는가** (코드가 규칙을 어겼는가)
2. **규칙 자체가 현재 프로젝트 실상과 맞는가** (규칙이 현실을 반영하는가)

### Step 0-1: 현재 상태 수집

```bash
# 각 모듈의 project 의존성 + 라이브러리 의존성 추출
grep -E 'project\("|implementation\(libs\.' */build.gradle.kts
```

모든 모듈의 `build.gradle.kts`를 읽어 **실제 의존 그래프**를 그린다.

### Step 0-2: 규칙 로드

`multi-module.md`의 의존성 규칙과 ArchUnit 테스트 규칙을 로드한다.

### Step 0-3: 3방향 대조

실제 Gradle 의존성, multi-module.md 규칙, ArchUnit 테스트를 대조한다.

```
| 모듈 | 실제 의존 (build.gradle.kts) | 규칙 (multi-module.md) | ArchUnit 규칙 | 불일치 |
```

불일치가 발견되면 아래 3가지 중 어떤 경우인지 판단한다:

#### Case A: 코드가 규칙을 위반
```
예: domain이 infra를 의존하고 있음
규칙: domain → infra 금지
→ 코드(build.gradle.kts)를 수정해야 한다
```

#### Case B: 규칙이 현실을 반영하지 못함
```
예: domain에 spring-context가 있는데, @Service/@Transactional 등 실제로 필요
규칙: domain은 순수 Kotlin, Spring 금지
→ 규칙(multi-module.md)을 현실에 맞게 갱신해야 한다
  또는 코드를 리팩토링하여 규칙을 지킬 수 있는지 검토
```

#### Case C: ArchUnit 규칙이 Gradle/문서 규칙과 안 맞음
```
예: ArchUnit에서 검사하는 규칙이 multi-module.md에 없거나, 반대로 multi-module.md 규칙이 ArchUnit에 없음
→ ArchUnit 테스트를 추가/수정하여 동기화
```

### 보고 형식

```
## Phase 0: 의존성 검증 결과

### 실제 의존 그래프
| 모듈 | project 의존 | 주요 라이브러리 의존 |
|------|-------------|-------------------|
| common | (없음) | (없음) |
| domain | common | spring-context, spring-tx |
| ... | ... | ... |

### 규칙 대비 판정
| 모듈 | 실제 | 규칙 | 판정 | 비고 |
|------|------|------|------|------|
| domain | common + spring-* | common만 | MISMATCH | Case B: 규칙 재검토 필요? |

### 불일치 상세 (있을 경우)
- **Case {A/B/C}**: {무엇이 안 맞는가}
  - 현재 상태: ...
  - 규칙: ...
  - 제안: 코드 수정 / 규칙 갱신 / ArchUnit 동기화
```

불일치가 있으면 사용자에게 보고한다. 코드를 고칠지, 규칙을 고칠지, 둘 다 고칠지는 **사용자가 결정**한다. 결정 후 Phase 1로 진행.

---

## Phase 1: ArchUnit 테스트 실행 (코드 레벨)

Phase 0을 통과한 후, 코드 레벨에서 패키지 간 의존성을 검증한다.

ArchitectureTest가 존재하는 모듈만 실행한다.

```bash
# ArchitectureTest 파일이 있는 모듈 확인
find . -path '*/test/kotlin/*/ArchitectureTest.kt' -type f

# 존재하는 모듈만 실행 (예시)
./gradlew :alarm-domain:test :alarm-infra:test :alarm-api:test --tests '*ArchitectureTest*' 2>&1
```

ArchitectureTest가 없는 모듈을 `--tests` 필터에 포함하면 "No tests found" 에러가 발생하므로 주의.

---

## Phase 2: 결과 분석

### PASS인 경우

모듈별 검증된 규칙 수를 요약 보고한다.

```
| 모듈 | 규칙 수 | 결과 |
|------|---------|------|
| alarm-domain | 6 | PASS |
| alarm-infra  | 6 | PASS |
| alarm-api    | 2 | PASS |
| 합계         | 14 | ALL PASS |
```

### FAIL인 경우

Phase 3으로 진행한다.

---

## Phase 3: 위반 분석

FAIL된 테스트의 리포트를 읽어 위반 내용을 분석한다.

```bash
# 테스트 리포트 확인
cat {모듈}/build/reports/tests/test/classes/com.alarm.{모듈}.ArchitectureTest.html
```

### 분석 형식

각 위반에 대해 아래를 보고한다:

```
## 위반: {규칙명}

**위치**: {파일경로}:{라인} — {위반 클래스}
**규칙**: {어떤 의존 규칙을 위반했는가}
**원인**: {왜 이 의존이 생겼는가 — import/사용 지점}
**제안**: {최소 변경으로 어떻게 해결하는가}
```

### 자동 수정 금지

위반 분석 결과를 사용자에게 보고하고 확인을 받은 후에만 수정한다.

---

## Phase 4: 신규 규칙 필요 여부 판단

현재 프로젝트의 모듈/패키지 구조를 스캔하여, 기존 ArchUnit 규칙이 커버하지 못하는 경계가 있는지 확인한다.

### 점검 항목

| 점검 | 방법 | 대상 |
|------|------|------|
| 새 모듈 추가됨 | `settings.gradle.kts`의 include와 ArchUnit 테스트 비교 | 모듈 경계 규칙 |
| 새 패키지 추가됨 | `src/main/kotlin` 하위 패키지 목록과 기존 규칙 비교 | 패키지 격리 규칙 |
| 기존 규칙과 불일치 | `multi-module.md` 의존성 규칙과 ArchUnit 규칙 대조 | 누락된 규칙 |

### 신규 규칙 제안 형식

```
## 제안: {규칙 설명}

**근거**: {multi-module.md 또는 design-principles.md의 어떤 규칙을 기반으로}
**대상 모듈**: {어느 모듈의 ArchitectureTest에 추가}
**규칙 코드**:
  noClasses()
    .that().resideInAPackage("...")
    .should().dependOnClassesThat().resideInAPackage("...")
    .because("...")
```

사용자 승인 후에만 추가한다.

---

## 기존 규칙 현황

### alarm-domain (순수성 검증) — 6개
1. Spring 인프라 의존 금지 (stereotype/transaction만 허용)
2. JPA 의존 금지
3. infra 모듈 참조 금지
4. api 모듈 참조 금지
5. client-external 모듈 참조 금지
6. service는 domain/common/JDK/Spring stereotype만 참조 가능

### alarm-infra (패키지 격리 + 모듈 경계) — 6개
1. jpa ↛ kafka
2. redis ↛ kafka
3. kafka ↛ jpa.repository
4. kafka ↛ redis
5. infra ↛ api
6. infra ↛ consumer

### alarm-api (계층 규칙) — 2개
1. controller ↛ infra
2. dto ↛ infra

### alarm-consumer (모듈 경계) — 1개
1. consumer ↛ api

### alarm-client-external (모듈 경계) — 3개
1. client-external ↛ infra
2. client-external ↛ api
3. client-external ↛ consumer

---

## ArchUnit 테스트 작성 규칙

새 ArchUnit 테스트 작성 시 반드시 지킨다:

```kotlin
// MUST: 테스트 클래스 제외 (MockK 등 테스트 의존성 오탐 방지)
private val classes = ClassFileImporter()
    .withImportOption(ImportOption.DoNotIncludeTests())
    .importPackages("com.alarm.{모듈}")

// MUST: because()로 위반 이유 명시 (한국어)
.because("domain → infra 의존은 아키텍처 위반")

// MUST: 각 테스트 이름은 규칙을 한국어로 명확히 서술
fun `Controller는 infra 패키지를 직접 참조하지 않는다`()
```

---

## 의존성 규칙 레퍼런스 (multi-module.md 기반)

```
[CRITICAL] 절대 위반 금지

1. domain → common 만 허용
2. infra → domain, common 허용
3. client-external → domain, common 허용
4. app-* → domain, infra, client-external, common 허용
5. common → 어떤 모듈도 참조 금지
6. domain → infra, client-external 참조 절대 금지
7. app 모듈 간 상호 참조 금지 (api ↔ admin ↔ batch)
```
