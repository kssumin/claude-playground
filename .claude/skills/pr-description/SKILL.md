---
name: pr-description
description: >
  PR 설명 작성 가이드. "왜 바꿨는가"에 집중하고 diff 반복을 금지한다.
  Use when creating pull requests, writing PR descriptions, or when user says
  "PR 작성", "PR 설명", "PR 만들어줘", "/pr".
---

# PR Description Writing

## 핵심 철학

> PR 설명은 코드 변경 목록이 아니라 **스토리**다.
> diff에서 볼 수 없는 정보를 전달하는 것이 PR 설명의 역할이다.

## 금지 사항 (NEVER)

- NEVER: diff에서 보이는 내용 반복 ("Added X class", "Modified Y method", "Updated Z config")
- NEVER: 파일/클래스/메서드 목록 나열 (Affected Classes, Changed Files 섹션)
- NEVER: 커밋 메시지를 그대로 복붙한 "커밋 내역" 섹션
- NEVER: 기술적 세부사항만 나열하고 의도/맥락 누락
- NEVER: AI가 diff를 요약한 듯한 기계적 톤

## 필수 구조: Problem → Solution → Design Decisions → Impact

### 1. Problem (왜 이 변경이 필요한가)

```markdown
## Problem
[사용자/시스템이 겪고 있던 구체적 문제 서술]
[문제가 발생하는 시나리오와 영향]
```

- 문제에 공감할 수 있도록 구체적 시나리오 제시
- "무엇이 불편했는가", "무엇이 불가능했는가"

### 2. Solution (어떻게 해결했는가 — 접근법 수준)

```markdown
## Solution
[해결 접근법을 1-3문장으로 요약]
[구현 세부사항이 아닌, 아키텍처/설계 수준의 설명]
```

- "X 클래스를 추가했다" (X) → "X 패턴을 도입해서 Y를 달성했다" (O)
- 코드가 아닌 아이디어 수준의 설명

### 3. Design Decisions (왜 이 접근법을 선택했는가)

```markdown
## Design Decisions
- **결정 1**: 근거 (대안이 있었다면 왜 기각했는지)
- **결정 2**: 트레이드오프 (Pro/Con)
```

- diff에서 절대 알 수 없는 정보 = 설계 의도
- "왜 A 대신 B를 선택했는가"
- "어떤 트레이드오프를 감수했는가"

### 4. Impact (이 변경의 영향)

```markdown
## Impact
- 새로 가능해진 것
- Breaking Changes (있다면 ⚠️ 명시)
- 성능/호환성 영향
```

## 작성 후 자가 검증 체크리스트

PR 작성을 완료한 뒤 반드시 아래 4가지를 자문한다:

| 체크 | 질문 | 통과 기준 |
|------|------|----------|
| diff 중복 | "이 내용이 코드 diff에서 보이는가?" | 보인다면 삭제하거나 "왜"를 추가 |
| WHY | "왜 이렇게 했는지 설명했는가?" | 설계 결정의 근거가 명시됨 |
| Impact | "이 변경의 영향을 명시했는가?" | breaking changes, 새 기능, 호환성 |
| 미래 독자 | "6개월 후 이 PR만 보고 맥락을 이해할 수 있는가?" | 배경 지식 없이도 이해 가능 |

하나라도 실패하면 해당 섹션을 수정한다.

## Bad vs Good 예시

### Bad: diff 반복

```markdown
## Changes
- Added UserRepository class
- Implemented findByEmail method using JPQL
- Modified UserService to use new repository
- Added unit tests for UserRepository
```

### Good: 맥락과 의도

```markdown
## Problem
비밀번호 재설정 시 이메일로 사용자를 찾을 수 없었다.
기존 findById는 세션 토큰이 있는 로그인 유저만 조회 가능.

## Solution
이메일 기반 사용자 조회를 도입해 비밀번호 재설정 흐름을 가능하게 했다.

## Design Decisions
- **JPQL 선택**: 네이티브 SQL 대신 DB 독립성 확보
- **대소문자 무시**: 사용자 입력 편차 대응
- **인덱스 추가**: email 컬럼에 인덱스 (마이그레이션 포함)

## Impact
- 비밀번호 재설정 기능 구현 가능
- 기존 findById API 변경 없음 (breaking change 없음)
```

## 적용 순서

1. `git log base..HEAD`와 `git diff base...HEAD --stat`으로 변경 범위 파악
2. 변경의 **동기**(Problem)를 먼저 작성
3. **접근법**(Solution)을 구현 세부사항 없이 서술
4. **설계 결정**(Design Decisions)에서 "왜"를 설명
5. **영향**(Impact)으로 마무리
6. 자가 검증 체크리스트 통과 확인
7. diff에서 보이는 내용이 남아있으면 삭제