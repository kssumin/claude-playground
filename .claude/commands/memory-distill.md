---
name: memory-distill
description: "memory/failures.jsonl, memory/decisions.jsonl를 읽고 아직 스킬/룰에 반영되지 않은 교훈을 찾아 해당 스킬에 직접 반영한다. 에피소드 기억을 영구 지식으로 승격한다. Use when user says '교훈 반영', 'distill', '/memory-distill', or when session-start warns about unpromoted failures."
allowed-tools: ["Read", "Write", "Edit", "Bash", "Glob"]
---

# /memory-distill — 에피소드 기억 → 영구 지식 승격

> session-start가 "failures.jsonl 미반영 N건" 경고를 냈을 때 실행하라.

`memory-distill` 스킬을 로드해서 실행한다.
