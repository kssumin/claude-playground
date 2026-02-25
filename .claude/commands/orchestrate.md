---
name: orchestrate
description: "Sequential and parallel agent workflow orchestration"
allowed-tools: ["Read", "Write", "Edit", "Bash", "Grep", "Glob", "Task", "AskUserQuestion"]
---

# /orchestrate - 에이전트 오케스트레이션

## 핵심 원칙
- **구현은 합의 후에** - 설계/계획 단계에서 반드시 사용자 승인을 받은 후 구현 진행
- **검증은 자동으로** - 리뷰, 테스트, 보안 분석은 자동 실행
- **독립 작업은 병렬로** - `dispatching-parallel-agents` 스킬 활용

## Usage
```
/orchestrate feature "기능 설명"
/orchestrate bugfix "버그 설명"
/orchestrate refactor "리팩토링 대상"
/orchestrate security "보안 검토 대상"
```

## Workflows

### feature (기능 개발)

**설계 (순차, 합의 필수)**
1. `brainstorming` 스킬 → 요구사항 탐색 + 접근법 논의
2. **architect** → 시스템 설계 + 규모 추정
3. **design-reviewer** → ADR 생성
4. → **사용자 승인 대기** ←

**계획 (순차, 합의 필수)**
5. `writing-plans` 스킬 → 상세 구현 계획 작성
6. → **사용자 승인 대기** ←

**구현 (승인 후, 병렬 가능)**
7. `using-git-worktrees` → 기능 브랜치 격리 (선택)
8. **tdd-guide** + `test-driven-development` 스킬 → TDD 구현
   - 독립 모듈은 `dispatching-parallel-agents`로 병렬 구현

**검증 (자동, 병렬 실행)**
9. 아래 3개를 **병렬 실행** (`dispatching-parallel-agents`):
   - **code-reviewer** → 코드 품질 리뷰
   - **security-reviewer** → 보안 리뷰
   - `/perf-test` → 성능 검증
10. `verification-before-completion` 스킬 → 최종 검증
11. `finishing-a-development-branch` 스킬 → 머지/PR

### bugfix (버그 수정)
1. `systematic-debugging` 스킬 → 구조화된 원인 분석
2. → **사용자에게 원인 + 수정 방향 합의** ←
3. **tdd-guide** → 재현 테스트 작성 → 수정
4. **code-reviewer** → 리뷰
5. `verification-before-completion` → 최종 검증

### refactor (리팩토링)
1. **architect** → 설계 검토 + 리팩토링 범위 정의
2. → **사용자 승인 대기** ←
3. **tdd-guide** → 기존 테스트 보강 (안전망)
4. 리팩토링 실행
5. **code-reviewer** + **security-reviewer** → 병렬 리뷰

### security (보안)
1. **security-reviewer** → 취약점 분석
2. **code-reviewer** → 코드 검토
3. **architect** → 아키텍처 검토
4. → 3개 결과 취합 후 **사용자에게 수정 방향 합의** ←
