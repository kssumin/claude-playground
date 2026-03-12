# Git Workflow

## 핵심 원칙

- NEVER: 사용자 명시적 요청 없이 commit/push 자동 실행 금지
- MUST: `git reset`으로 커밋 되돌릴 때 기본값은 `--soft`. `--hard`는 명시적 요청 시에만

## 커밋 메시지 형식

**MUST: 커밋은 반드시 `/commit` 스킬로 실행. 직접 `git commit` 금지.**

```
<type>: <한국어 간결한 설명>
```

- 제목 50자 이내 (한글 25자)
- 마침표 없음, 명령형
- Types: feat, fix, refactor, docs, test, chore, perf, ci

## Pull Request 워크플로우

1. 전체 커밋 히스토리 분석 (최신 커밋만이 아닌)
2. `git diff [base-branch]...HEAD`로 모든 변경사항 확인
3. 포괄적 PR 요약 작성
4. 테스트 계획 TODO 포함
5. 새 브랜치인 경우 `-u` 플래그로 push

## 기능 구현 워크플로우

1. **계획 먼저** - planner agent 사용
2. **TDD 접근** - tdd-guide agent (RED/GREEN/IMPROVE)
3. **코드 리뷰** - code-reviewer agent
4. **커밋 & Push** - conventional commits 형식
