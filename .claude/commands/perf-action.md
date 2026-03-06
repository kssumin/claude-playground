---
name: perf-action
description: "성능 Action Items 순차 검증. TODO 항목을 하나씩 적용하고 성능 테스트로 검증한다. Use when user says /perf-action, Action Items 진행, 성능 개선 하나씩."
allowed-tools: ["Read", "Write", "Edit", "Bash", "Grep", "Glob", "Agent", "AskUserQuestion"]
---

# /perf-action - Action Items 순차 검증

`perf-action-items` 스킬을 실행한다. Step 0 → 1 → 2 → 3 → 4 → 5 → 6 반복.

## Usage
```
/perf-action                  # TODO 항목 수집 → 우선순위 순 진행
/perf-action A3               # 특정 Item만 진행
/perf-action --status         # 현재 진행 현황 테이블 출력
```

`perf-action-items` 스킬의 워크플로우를 따르되, 각 Item의 성능 테스트는 `perf-tuning-cycle` 스킬로 실행한다.
