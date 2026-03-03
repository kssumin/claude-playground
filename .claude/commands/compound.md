---
name: compound
description: "작업 완료 후 복리화 문서 생성. 해결한 문제/패턴을 docs/solutions/에 기록하여 다음 작업 시 자동 참조. Use when user says /compound, 복리화, compound, or after /code-review completion."
allowed-tools: ["Read", "Write", "Edit", "Grep", "Glob", "Bash", "AskUserQuestion"]
---

# /compound - 복리화 문서 생성

> 매 작업이 이후 작업을 더 쉽게 만드는 복리형 개발의 핵심 단계.
> 해결한 문제/패턴을 Git에 커밋되는 구조화된 문서로 남긴다.

## Usage
```
/compound                    # 현재 브랜치 변경사항 기반 복리화
/compound "kafka 멱등성 처리"  # 특정 주제 지정
```

---

## Phase 1: 컨텍스트 수집

사용자에게 출력하지 않고 조용히 수집한다.

1. `git log --oneline -10` — 최근 커밋 히스토리
2. `git diff main...HEAD --name-only` — 브랜치에서 변경된 파일 목록
3. `git diff main...HEAD` — 전체 변경 내용
4. 변경된 주요 파일 읽기 (핵심 로직 파악)
5. 관련 ADR 확인 (`docs/adr/`)
6. 기존 solutions 확인 (`docs/solutions/`) — 중복 방지

---

## Phase 2: 복리화 가치 판단

수집된 컨텍스트를 바탕으로 복리화 가치를 판단한다.

### 판단 기준

| 가치 있음 (문서화) | 가치 없음 (스킵) |
|-------------------|-----------------|
| 새로운 패턴 도입 | 단순 오타 수정 |
| 반복될 수 있는 버그 수정 | 설정값 변경 |
| 아키텍처 결정의 이유 | 이미 문서화된 패턴 |
| 트레이드오프가 있는 선택 | 보일러플레이트 추가 |
| 외부 API/라이브러리 사용 노하우 | 단순 CRUD 추가 |

### 카테고리 분류

- **pattern**: 재사용 가능한 설계/구현 패턴
- **bugfix**: 재발 방지가 필요한 버그 수정
- **decision**: 트레이드오프가 있었던 기술 결정
- **workaround**: 제약/한계에 대한 우회 방법

### 결과 보고

사용자에게 간결하게 보고:
```
📋 복리화 가치 분석:
- 카테고리: pattern
- 주제: Kafka Consumer 멱등성 처리
- 핵심: Redis SET NX + TTL로 메시지 중복 방지
- 관련 태그: kafka, idempotency, redis

문서를 생성할까요?
```

가치가 없다고 판단되면 솔직하게 보고하고 종료:
```
이번 변경사항에서 별도 복리화 문서가 필요한 패턴/솔루션은 발견되지 않았습니다.
(단순 설정 변경 / 이미 문서화된 패턴)
```

---

## Phase 3: 문서 생성

사용자 승인 후 문서를 생성한다.

### 문서 포맷

```markdown
---
title: {한글 제목}
date: {YYYY-MM-DD}
tags: [{관련 기술 태그들}]
category: {pattern | bugfix | decision | workaround}
trigger: "{AI가 검색할 때 매칭할 한글 키워드}"
confidence: {high | medium | low}
---

## 문제
{무엇이 문제였는지 — 1~3문장}

## 해결
{어떻게 해결했는지 — 핵심 접근법}

## 핵심 코드/패턴
{재사용 가능한 코드 조각이나 패턴 — 간결하게}

## 교훈
{다음에 알아야 할 것 — 2~5개 bullet point}

## 관련 파일
{변경된 주요 파일 경로}
```

### 파일명 규칙

`docs/solutions/YYYY-MM-DD-{kebab-case-topic}.md`

### 초안 → 확인

1. 초안을 사용자에게 제시
2. 수정 요청이 있으면 반영
3. 최종 승인 후 파일 저장

---

## Phase 4: 즉시 반영 또는 승격 체크

문서 저장 후, 기존 skill/rule과의 관계를 확인한다.

### 4-1. bugfix → 관련 skill/rule 즉시 업데이트

카테고리가 **bugfix**이고, 관련 skill/rule이 이미 존재하면:
- 해당 skill/rule의 "주의사항" 또는 "안티패턴"에 즉시 반영
- solution 문서는 그대로 유지 (상세 기록용)

```
⚡ 즉시 반영:
카테고리: bugfix
관련 스킬: kafka-patterns
→ kafka-patterns 스킬에 "Consumer 멱등성 마킹 순서 주의" 항목을 추가할까요?
```

승인 시 → 해당 skill 파일을 직접 수정하고 커밋.

### 4-2. pattern/decision/workaround → 3회 누적 후 승격

카테고리가 **bugfix가 아닌 경우**, 기존 solutions에서 같은 tags를 가진 문서를 검색한다.

동일 태그가 **3개 이상의 solution 문서**에 등장하면:

```
🔄 반복 패턴 감지:
"kafka" 태그가 3개 이상의 솔루션에서 등장합니다:
  - 2026-03-03-kafka-consumer-idempotency.md
  - 2026-03-10-kafka-retry-strategy.md
  - 2026-03-15-kafka-dead-letter-handling.md

이 패턴을 rule 또는 skill로 승격할까요?
  1) rule로 승격 (원칙만, 30줄 이내)
  2) skill로 승격 (상세 레퍼런스 포함)
  3) 아직 아님 (solutions에서 계속 관리)
```

승인 시:
- `.claude/rules/`에 새 rule 생성, 또는
- `.claude/skills/`에 새 skill 생성
- context-engineering 헬스체크 자동 실행 (룰 총량 500줄 초과 여부 확인)

---

## Phase 5: 커밋

`/commit` 스킬을 사용하여 커밋한다.

커밋 메시지 형식:
```
docs: {주제} 복리화 문서 추가
```

---

## 문서 품질 원칙

1. **간결함**: 문서 전체가 화면 1~2개 분량. 장황한 설명 금지
2. **재현 가능**: 다음에 같은 상황을 만나면 이 문서만으로 해결 가능
3. **검색 가능**: tags와 trigger가 정확해야 /design에서 자동으로 찾을 수 있음
4. **중복 금지**: 기존 solution과 80% 이상 겹치면 기존 문서 업데이트로 대체
5. **실용적**: 이론이 아닌 실제 코드/설정/명령어 중심
