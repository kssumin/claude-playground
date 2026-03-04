---
name: design-why
description: "설계 고민 포인트(Design Considerations) 관리. 설계 결정의 근거를 docs/design-considerations/에 기록하고 참조한다. Use when user says /design-why, 고민 포인트, 왜 이렇게, design consideration, or when a design question arises during discussion."
allowed-tools: ["Read", "Write", "Edit", "Grep", "Glob", "Bash", "AskUserQuestion"]
---

# /design-why - 설계 고민 포인트 관리

> 의문이 생길 수 있는 설계 결정과 그 근거를 기록한다.
> `/design` 시 자동 참조되어 이미 고려된 사항은 재논의하지 않는다.

## Usage
```
/design-why                        # 기존 고민 포인트 목록 조회
/design-why "AckMode.BATCH 근거"    # 특정 주제로 새 고민 포인트 추가
```

---

## Phase 1: 기존 고민 포인트 조회

1. `docs/design-considerations/README.md`의 인덱스 테이블 읽기
2. 인자가 없으면 인덱스를 사용자에게 표시하고 종료:

```
📋 설계 고민 포인트 (6건):
| ID   | 주제      | 파일                  | 요약 |
| D-1  | 중복 방지 | deduplication.md      | at-least-once 수용 |
| D-2  | 아키텍처  | architecture.md       | DB-first 유지 |
| ...
```

---

## Phase 2: 새 고민 포인트 추가

인자가 있거나 대화 중 설계 의문이 발생하면:

### 2-1. 중복 확인
기존 파일들을 검색하여 이미 다뤄진 주제인지 확인:
- `Grep`으로 키워드 매칭
- 80% 이상 겹치면 기존 항목 업데이트 제안

### 2-2. 파일 결정
- 기존 주제 파일에 해당하면 → 해당 파일에 추가
- 새 주제면 → 새 파일 생성

### 2-3. 작성 형식

```markdown
## D-{N}. {질문형 제목}

{답변 — 명확한 근거와 함께}

{필요 시 코드/설정/다이어그램}

{대안이 있었다면 왜 기각했는지}
```

### 2-4. README 인덱스 업데이트
새 항목을 인덱스 테이블에 추가한다.

---

## Phase 3: /design 연동

`/design` 실행 시 Step 0(컨텍스트 수집)에서 자동으로:

1. `docs/design-considerations/` 전체 파일 스캔
2. 설계 주제와 관련된 기존 고민 포인트 매칭
3. 관련 항목이 있으면 Step 1에서 함께 공유:

```
📋 관련 설계 고민 포인트:
- D-3: AckMode.BATCH 근거 (kafka-consumer.md)
- D-5: 429 CB 제외 근거 (resilience.md)
→ 이미 결정된 사항이므로 재논의하지 않습니다.
```

4. 설계 과정에서 새로운 의문이 발생하면:
   - 즉시 새 고민 포인트로 기록 (Phase 2 수행)
   - 설계 문서(ADR)에는 고민 포인트 링크만 추가

---

## 디렉토리 구조

```
docs/design-considerations/
├── README.md           # 인덱스 (전체 목록 + 추가 규칙)
├── architecture.md     # 아키텍처 관련
├── kafka-consumer.md   # Kafka & Consumer 관련
├── deduplication.md    # 중복 방지 & 멱등성
├── resilience.md       # Resilience & 외부 연동
└── {new-topic}.md      # 새 주제 발생 시 추가
```

## 작성 원칙

1. **질문형 제목**: "왜 X인가?" 또는 "X하면 Y 아닌가?" 형태
2. **근거 필수**: 숫자, 코드, 비교표 등 객관적 근거 포함
3. **대안 기각 사유**: 선택하지 않은 대안이 있으면 왜 기각했는지 명시
4. **간결함**: 항목당 화면 1개 이내
5. **링크**: 관련 ADR, solutions, 코드 경로 연결
