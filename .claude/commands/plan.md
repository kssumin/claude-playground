---
name: plan
description: "Collaborative brainstorming and implementation planning"
allowed-tools: ["Read", "Grep", "Glob", "AskUserQuestion", "Task"]
---

# /plan - 브레인스토밍 + 구현 계획

## Usage
```
/plan "기능 설명"
```

## Workflow

### Phase 1: Intent Discovery
1. 프로젝트 상태 확인 (구조, 패턴, 최근 변경)
2. 사용자 의도 파악 (질문 1개씩, 객관식 선호)
3. 2-3가지 접근법 제안 + 트레이드오프

### Phase 2: Detailed Planning
1. 아키텍처 리뷰 (멀티모듈 구조 준수)
2. 단계별 구현 계획 (정확한 파일 경로)
3. 구현 순서 결정

### Phase 3: Confirmation
- 완성된 계획 제시
- **CONFIRM** 대기 (명시적 승인 필요)

## Integration
- → `/tdd` (TDD로 구현)
- → `/code-review` (리뷰)
