# Agent 오케스트레이션

## 핵심 원칙
- MUST: 독립 작업은 항상 병렬로 실행
- MUST: refactor-cleaner는 `/code-review` 완료 후 **사용자 승인 필수** — 자동 실행 금지
- MUST: code-reviewer + security-reviewer는 `/code-review` Phase 3에서 병렬 실행
- SHOULD: 새 기능/버그 수정 시 tdd-guide, 복잡한 기능 시 planner, 아키텍처 결정 시 architect 자동 트리거

## 상세 가이드
에이전트 테이블(사용 가능/자동 트리거/code-review 연동), refactor-cleaner 실행 규칙, 병렬 실행 예제는 `agents-reference` 스킬을 참조하라.
