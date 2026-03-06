---
name: perf-cycle
description: "성능 튜닝 전체 사이클 실행. 테스트 → 캡처 → 분석(Hidden Behavior + Bottleneck) → 제안. Use when user says /perf-cycle, 성능 사이클, 지표 캡처."
allowed-tools: ["Read", "Write", "Edit", "Bash", "Grep", "Glob", "Agent", "AskUserQuestion"]
---

# /perf-cycle - 성능 튜닝 사이클

`perf-tuning-cycle` 스킬을 실행한다. Step 0 → 1 → 2 → 3 → 4 순서대로.

## Usage
```
/perf-cycle                     # 전체 사이클 (smoke → load → 캡처 → 분석)
/perf-cycle --stress            # stress 테스트 포함
/perf-cycle --analyze-only      # 이미 돌린 결과만 분석 (캡처 + 분석만)
```

`perf-tuning-cycle` 스킬의 워크플로우를 따르되, Step 3 분석 시 `references/analysis-guide.md`의 Hidden Behavior + Bottleneck 체크리스트를 반드시 참조한다.
