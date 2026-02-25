---
name: refactor-clean
description: "Safely identify and remove dead code"
allowed-tools: ["Read", "Write", "Edit", "Bash", "Grep", "Glob"]
---

# /refactor-clean - 코드 정리

## Process
1. Dead code 분석 (detekt, grep)
2. 위험도 분류 (SAFE/CAUTION/DANGER)
3. SAFE 항목부터 제거
4. 테스트 실행으로 검증
5. 배치별 커밋
