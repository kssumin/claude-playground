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
2. ADR이 있으면 읽고 결정 사항 파악 — ADR의 결정을 구현 계획에서 뒤집지 않는다
3. 사용자 의도 파악 (질문 1개씩, 객관식 선호)
4. 2-3가지 접근법 제안 + 트레이드오프

### Phase 2: Detailed Planning
1. 아키텍처 리뷰 (멀티모듈 구조 준수)
2. Step 분리 + 의존관계 그래프
3. 각 Step별 변경 파일 목록 (정확한 경로)
4. 테스트 매트릭스

### Phase 3: Confirmation
- 완성된 계획 제시
- **CONFIRM** 대기 (명시적 승인 필요)
- CONFIRM 후 `docs/exec-plans/active/{작업명}-plan.md`로 저장 (아래 형식 준수)

### 실행 계획 파일 형식

```markdown
# {작업명} 실행 계획

**시작일:** YYYY-MM-DD
**상태:** IN_PROGRESS
**마지막 세션:** YYYY-MM-DD

## 목표
...

## 단계별 진행

- [ ] Step 1: ...
- [ ] Step 2: ...

## 현재 세션 메모
마지막으로 한 것:
다음 세션에서 할 것:
블로커:

## 결정 기록
...
```

**완료 시**: `docs/exec-plans/active/` → `docs/exec-plans/completed/`로 이동

## 구현 계획서 작성 원칙

### ADR과의 경계
- ADR은 "무엇을 왜 결정했는가", 구현 계획서는 "어떻게 만드는가"
- ADR의 Implementation 섹션은 한 줄 링크: `→ [implementation-plan-{번호}.md](...) 참조`
- 구현 계획서에 ADR의 결정 근거를 반복하지 않는다

### Step 분리 기준
- 각 Step은 독립 커밋 가능한 단위
- infra 변경(Entity)과 domain 변경(Port)은 같은 Step에서 — 컴파일 깨짐 방지
- 검증 게이트(EXPLAIN ANALYZE 등)는 의존하는 코드 직후에 배치 — 후속 Step에서 되돌리기 비용 최소화

### 의존관계 그래프 필수
```
Step 1 → Step 2 → Step 3 (검증 게이트)
                       ↓
              Step 4 + Step 5 병렬
```
- 병렬 가능한 Step은 명시
- 게이트 Step은 "분기 시 변경 대상 파일" 명시

### domain 순수성
- domain은 비즈니스 관점의 타입만 정의 (예: `SlicedResult<T>`, `NotificationCursor`)
- 인프라 관심사(커서 인코딩, 캐시, 페이지 응답 구조)는 app 레이어에서
- 캐시 어노테이션(`@Cacheable`/`@CacheEvict`)은 app-api의 UseCase(Application Service)에서

### 테스트 매트릭스
모듈 × 테스트 유형 × 대상을 테이블로 명시:
```
| 모듈 | 유형 | 대상 |
|------|------|------|
```
- 기존 테스트가 있는지 여부 명시 (신규 작성 vs 기존 수정)
- 파티션 경계, 날짜 전환 같은 엣지 케이스 강조 (**볼드**)

### 변경 설명 수준
- "무엇을 바꾸는지"에 집중, 메서드 호출 체인은 구현 시점에 확인
- BAD: "consumeWork → processor.process(msg.toDomain()) 에서 createdAt이 자연스럽게 전달됨"
- GOOD: "Consumer에서 updateStatus 호출 시 createdAt을 Kafka 메시지에서 추출하여 전달"

## 대규모 기능 — features.json 병행 사용

단일 작업이 아닌 여러 기능을 순서대로 구현해야 할 때는 `docs/exec-plans/features.json`을 함께 생성한다.

형식:
```json
[
  {"id": 1, "name": "기능 이름", "status": "pending", "priority": "high", "note": ""},
  {"id": 2, "name": "기능 이름", "status": "in_progress", "priority": "medium", "note": "현재 작업 중"},
  {"id": 3, "name": "기능 이름", "status": "completed", "priority": "low", "note": ""}
]
```

status 값: `pending` | `in_progress` | `completed` | `blocked`
- 세션 시작 시 session-start.js가 자동으로 읽어 진행 상황을 보여줌
- 기능 완료 시 status를 `completed`로 업데이트
- 신규 기능 추가 시 배열에 append

**언제 사용하나**: 3개 이상의 독립 기능을 순서대로 구현할 때. 단일 기능은 exec-plans 파일만으로 충분.

## Integration
- → `/tdd` (TDD로 구현)
- → `/code-review` (리뷰)
