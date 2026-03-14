---
name: ce-check
description: Context Engineering 헬스체크. Rules/Skills/Memory 상태를 자동 검사하고 테이블로 보고한다.
---

# Context Engineering 헬스체크

아래 9개 항목을 순서대로 검사하고 결과를 테이블로 보고하라.

## 검사 항목

### 1. Rules 총 줄수
- `wc -l .claude/rules/*.md | tail -1` 실행
- 기준: **500줄 미만** → PASS, 이상 → FAIL

### 2. 30줄 초과 Rule 탐지
- 각 Rule 파일의 줄수 확인 (`wc -l .claude/rules/*.md`)
- 기준: **모든 Rule이 30줄 이하** → PASS, 초과 Rule 있으면 → WARN (파일명 + 줄수 표시)

### 3. Rule 내 코드 블록 검사
- 각 Rule 파일에서 ` ``` `으로 시작하는 코드 블록이 있는지 확인
- 기준: **코드 블록 없음** → PASS, 있으면 → WARN (파일명 표시, 상세 내용은 Skill로 분리 필요)

### 4. CLAUDE.md 라우팅 테이블 등록 여부
- `.claude/rules/*.md` 파일명(확장자 제외)이 CLAUDE.md Rules 테이블에 모두 등록되어 있는지 확인
- `.claude/skills/*/SKILL.md`의 skill명이 CLAUDE.md Skills 테이블에 모두 등록되어 있는지 확인
- 기준: **모두 등록** → PASS, 누락 있으면 → FAIL (누락 항목 표시)

### 5. Skill YAML frontmatter 검사
- 모든 `.claude/skills/*/SKILL.md` 파일에 `name`과 `description` frontmatter가 있는지 확인
- 기준: **모두 존재** → PASS, 누락 있으면 → FAIL (파일명 표시)

### 6. MEMORY.md 줄수
- `wc -l` 으로 memory/MEMORY.md (프로젝트별) 줄수 확인
- 기준: **200줄 미만** → PASS, 이상 → WARN

### 7. Memory 파일 존재 여부
- `memory/decisions.jsonl`과 `memory/failures.jsonl` 존재 여부 확인
- 기준: **모두 존재** → PASS, 누락 → WARN (생성 권장)

### 8. failures.jsonl 미반영 항목 확인
- `memory/failures.jsonl`에서 `"promoted":true` 없는 항목 수 확인
- 기준: **미반영 0건** → PASS, 1–2건 → WARN ("/memory-distill 실행 권장"), 3건 이상 → FAIL

### 9. project-context.md 존재 여부
- `.claude/project-context.md` 존재 여부 확인
- 기준: **존재** → PASS, 없으면 → FAIL ("/project-init 실행 필요")
- 존재하면 필수 섹션(`## Project`, `## Modules`, `## Performance Targets`) 포함 여부 확인

### 10. decisions.jsonl 기록 여부
- `memory/decisions.jsonl` 줄수 확인
- 기준: **1건 이상** → PASS, 0건 → WARN ("중요 설계 결정 미기록. /memory-distill 또는 직접 작성 권장")

### 11. 결과 요약

검사 결과를 아래 형식으로 테이블 출력:

```
| # | 검사 항목 | 결과 | 상세 |
|---|----------|------|------|
| 1 | Rules 총 줄수 | PASS/FAIL | {N}줄 / 500줄 |
| 2 | 30줄 초과 Rule | PASS/WARN | {초과 파일 목록} |
| 3 | Rule 내 코드 블록 | PASS/WARN | {코드 블록 포함 파일} |
| 4 | 라우팅 테이블 등록 | PASS/FAIL | {누락 항목} |
| 5 | Skill frontmatter | PASS/FAIL | {누락 파일} |
| 6 | MEMORY.md 줄수 | PASS/WARN | {N}줄 / 200줄 |
| 7 | Memory 파일 존재 | PASS/WARN | {누락 파일} |
| 8 | failures.jsonl 미반영 | PASS/WARN/FAIL | {N}건 미반영 |
| 9 | project-context.md | PASS/FAIL | 존재/없음 |
| 10 | decisions.jsonl | PASS/WARN | {N}건 |
```

- 모든 항목 PASS → "ALL PASS" 표시
- FAIL 있으면 → 수정 방법 안내
- WARN 있으면 → 개선 권장 사항 안내
