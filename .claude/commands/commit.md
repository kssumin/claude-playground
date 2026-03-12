---
allowed-tools: Bash(git add:*), Bash(git status:*), Bash(git commit:*), Bash(git diff:*), Bash(git log:*)
description: Git commit with project conventions (type: 한국어, no body, no co-author)
---

## Context

- Current git status: !`git status`
- Current git diff (staged and unstaged): !`git diff HEAD`
- Recent commits: !`git log --oneline -5`

## Rules

1. **Author**: `--author="kssumin <ksoomin25@gmail.com>"` 필수
2. **형식**: `type: 한국어 간결한 설명` (제목만, body 없음)
3. **Co-Authored-By 금지**: 절대 추가하지 않음
4. **제목**: 50자 이내 (한글 25자), 마침표 없음
5. **Types**: feat, fix, refactor, docs, test, chore, perf, ci, infra
6. **staging**: 관련 파일만 선택적으로 add (git add -A 금지)
7. **.env, credentials 등 민감 파일은 절대 커밋하지 않음**

## Commit message format

```
git commit -m "type: 한국어 설명" --author="kssumin <ksoomin25@gmail.com>"
```

## Your task

1. diff를 분석하여 변경 성격 파악 (feat/fix/refactor/docs/test/perf/infra/chore)
2. 관련 파일만 선택적으로 staging
3. 커밋 메시지 작성 후 커밋 실행
4. 텍스트 출력 없이 tool call만 실행
