---
allowed-tools: Bash(git add:*), Bash(git status:*), Bash(git commit:*), Bash(git diff:*), Bash(git log:*)
description: 작업 내역을 분석해 논리적 단위로 커밋 계획을 세우고 사용자 승인 후 커밋을 실행한다.
---

## Context

- Current git status: !`git status`
- Current git diff (staged and unstaged): !`git diff --stat HEAD`
- Recent commits: !`git log --oneline -10`

## Rules

1. **Author**: `git config에 설정된 author` 필수
2. **형식**: `type: 한국어 간결한 설명` (제목만, body 없음)
3. **Co-Authored-By 금지**: 절대 추가하지 않음
4. **제목**: 50자 이내 (한글 25자), 마침표 없음
5. **Types**: feat, fix, refactor, docs, test, chore, perf, ci, infra
6. **staging**: 관련 파일만 선택적으로 add (`git add -A` 금지)
7. **.env, credentials 등 민감 파일은 절대 커밋하지 않음**

## 실행 절차

### 1단계: 변경사항 파악

Context의 git status, diff, log를 분석한다. 파일 내용이 필요하면 Read/Grep으로 추가 확인.

### 2단계: 커밋 계획 수립

변경사항을 **논리적 단위**로 나눈다.

- 하나의 커밋은 하나의 관심사만 담는다 (기능/버그/리팩토링/문서를 섞지 않는다)
- 파일 간 의존관계를 고려해 순서를 정한다 (인터페이스 → 구현체 → 테스트)
- pre-commit hook이 "테스트 없는 구현 커밋 금지"를 강제하므로, 구현 + 테스트를 같은 커밋에 포함한다

계획을 아래 형식으로 제시:

```
📋 커밋 계획

커밋 1: <type>: <메시지>
  - <파일1>
  - <파일2>

커밋 2: <type>: <메시지>
  - <파일3>

총 N개 커밋
```

### 3단계: 사용자 승인

계획 제시 후 선택지 제공:

```
1. 계획대로 커밋 실행
2. 커밋 계획 다시 수립
3. 취소
```

**승인 없이 커밋 실행 금지.**

### 4단계: 커밋 실행

승인된 계획대로 순서대로 실행:

```bash
git add <파일1> <파일2>
git commit -m "type: 메시지" git config에 설정된 author
```

모든 커밋 완료 후 `git log --oneline -N`으로 결과 확인.
