# 하네스 엔지니어링 관점 정밀 점검 보고서

**작성일:** 2026-03-29
**분석 대상:** `/Users/mando/study/alarm`, `/Users/mando/study/ai-playground`, `/Users/mando/.claude` 전체 활동
**참조 문헌:** OpenAI / LangChain(×2) / Anthropic / Phil Schmid / Martin Fowler·Böckeler

---

## 1. 하네스 엔지니어링의 정의

> **"A harness is every piece of code, configuration, and execution logic that isn't the model itself."**
> — LangChain, *The Anatomy of an Agent Harness*

> **"An agent harness is infrastructure wrapping AI models to manage long-running tasks — providing prompt presets, opinionated handling for tool calls, lifecycle hooks or ready-to-use capabilities."**
> — Phil Schmid, *Agent Harness 2026*

> **"A harness is the tooling and practices we can use to keep AI agents in check."**
> — Birgitta Böckeler / Martin Fowler, *Harness Engineering*

**컴퓨터 비유 (Phil Schmid):**

| 구성 요소 | 비유 |
|----------|------|
| 모델 | CPU (원시 처리 능력) |
| 컨텍스트 윈도우 | RAM (제한된 작업 메모리) |
| **에이전트 하네스** | **운영체제** (컨텍스트 관리, 부팅 시퀀스, 표준 드라이버) |
| 에이전트 | 애플리케이션 (사용자 로직) |

**핵심 구성 요소:**

| 구성 요소 | 설명 | 출처 |
|----------|------|------|
| 컨텍스트 엔지니어링 | 맵/TOC 방식, 프로그레시브 디스클로저, 신선도 관리 | OpenAI, LangChain |
| 자기 검증 루프 | 완료 선언 전 기계적 검증 강제 | LangChain, Anthropic |
| 아키텍처 제약 | 커스텀 린터 + 구조 테스트 (문서가 아닌 코드로 강제) | OpenAI, Fowler |
| 엔트로피 관리 | 주기적 GC 에이전트, 품질 점수 자동 갱신 | OpenAI |
| 라이프사이클 관리 | 이니셜라이저 + 코딩 에이전트 분리, 세션 시작 루틴 | Anthropic |
| 피드백 루프 | 실행 트레이스 → 자동 분석 → 하네스 개선 | LangChain |
| 미들웨어 훅 | PreToolUse/PostToolUse 결정론적 실행 | LangChain |
| 메모리/상태 관리 | 세션 간 영속 상태, append-only 기록 | Anthropic, LangChain |

---

## 2. 정확히 매핑되는 활동

### ✅ 컨텍스트 엔지니어링 (프로그레시브 디스클로저) — 강하게 매핑

**한 일:** CLAUDE.md를 라우팅 테이블로 설계. Rules(30줄 원칙만) → Skills(온디맨드 레퍼런스)로 분리.
결과: 2,388줄 → ~375줄 (84% 감소). project-context.md에 343줄 밀도 있는 프로젝트 맵.

> *"Give Codex a map, not 1,000 pages of documentation."*
> — OpenAI, *Harness Engineering*

failures.jsonl 첫 번째 기록 — "Rules 2,388줄 → 컨텍스트 소진 → 30줄 이내 재설계" — 이 자체가 하네스 엔지니어링의 교과서적 실천. 실패 신호를 포착해 하네스를 개선한 것.

**한계:** CLAUDE.md 224줄. OpenAI 권장 ~100줄 초과.

---

### ✅ 메모리/상태 관리 — 강하게 매핑

**한 일:**
- decisions.jsonl: 12개 기록 (alternatives + reasoning + outcome 필드)
- failures.jsonl: 5개 기록 (root_cause + prevention 필드)
- feedback_*.md: 사용자 교정 → 영속 규칙 변환
- MEMORY.md: 가변 프로젝트 상태 (200줄 제한)
- 7개 이상 프로젝트 독립 메모리 디렉터리

decisions.jsonl이 "왜 그 대안을 기각했는지"까지 기록하는 구조는 OpenAI Execution Plans의 decision history와 정확히 대응.

---

### ✅ 에이전트 오케스트레이션과 역할 분리 — 강하게 매핑

**한 일:** 11개 특화 에이전트. 병렬 실행 명시. design-reviewer는 독립 에이전트만 (자기 검증 금지). dev-process 게이트: 설계 리뷰 통과 전 구현 금지, 코드 리뷰 통과 전 finishing 금지.

> *"Orchestration logic for agent spawning and handoffs."*
> — LangChain, *The Anatomy of an Agent Harness*

---

### ✅ 훅을 통한 결정론적 미들웨어 — 강하게 매핑

| 훅 | 동작 | 하네스 역할 |
|---|------|-----------|
| PostToolUse/Edit (5회 반복) | 경고 출력 | 루프 탐지 미들웨어 |
| PostToolUse/Edit (.kt 파일) | Kotlin 컴파일 검사 | 빌드 검증 |
| PostToolUse/Edit (println 감지) | 코드 품질 경고 | 아키텍처 제약 |
| PostToolUse/Edit (import 변경) | 의존성 드리프트 감지 | 아키텍처 제약 |
| PreToolUse (git push) | 리뷰 리마인더 | 프로세스 게이트 |
| notify.sh | macOS 알림 | 세션 완료 신호 |

---

### ⚠️ ArchUnit을 통한 부분 기계적 강제 — 부분 매핑

**된 것:** /arch-test 명령어, ArchitectureTest 클래스, Controller → service 직접 의존 차단.

**안 된 것:** ArchUnit은 테스트 실행 시 발견. OpenAI의 커스텀 린터는 에이전트가 위반 코드를 쓰는 즉시 교정 메시지를 컨텍스트에 주입. 사후 vs 실시간의 차이.

---

## 3. 매핑되지 않거나 어긋나는 활동

### ❌ 엔트로피 관리 — 부재

/refactor-clean이 있지만 수동 트리거 + 사용자 승인 필수. 자동 GC 에이전트 없음. 드리프트 감지 없음. 문서 신선도 점검 없음.

> *"Background Codex garbage-collection process. Technical debt is managed like compound interest — pay it continuously rather than catastrophically."*
> — OpenAI, *Harness Engineering*

/compound 명령어는 지식 관리이지 엔트로피 관리가 아니다.

---

### ⚠️ 자기 검증 루프 — 개념은 있으나 인간 의존적

게이트(/code-review)는 인간이 호출해야 작동. 에이전트가 스스로 완료 선언 전에 검증하도록 강제하는 훅 없음.

> *"Without specific instruction, Claude marked features complete without proper end-to-end verification."*
> — Anthropic, *Effective Harnesses for Long-Running Agents*

---

### ❌ 에이전트 실행 관찰가능성 — 부재

Grafana/Prometheus는 애플리케이션 모니터링. failures.jsonl은 수동 기록. 에이전트 실행 트레이스 없음. 반복 실패 패턴 자동 분석 없음.

---

### ⚠️ 라이프사이클 관리 — 부분적

MEMORY.md로 세션 간 연속성은 있음. 그러나 구조화된 세션 시작 루틴 없음. Initializer + Coding Agent 분리 없음. 태스크 단위 진행 파일 없음.

> *"Each coding session: (1) pwd 확인, (2) git log + progress 파일 리뷰, (3) 최우선 미완료 기능 선택, (4) 기본 테스트 실행 후 개발 시작."*
> — Anthropic, *Effective Harnesses for Long-Running Agents*

---

### ❌ 실행 계획의 1등 아티팩트 — 부재

/plan 결과는 세션 내 ephemeral. 다음 세션에서 에이전트가 접근 불가.

> *"From the agent's perspective, anything that cannot be accessed in context during execution effectively does not exist."*
> — OpenAI, *Harness Engineering*

---

### ❌ 커스텀 린터 (에이전트 읽기 가능한 오류 메시지) — 부재

에이전트가 domain 모듈에 `@Autowired`를 쓰면, 나중에 ArchUnit 실행 시 발견. OpenAI 방식이라면 편집 즉시 "domain 모듈은 Spring infra 의존 금지" 오류가 에이전트 컨텍스트에 들어온다.

---

### 개념적 방향 문제: "하네스" vs "워크플로우 템플릿"

| 차원 | 현재 구조 | 하네스 엔지니어링 |
|------|----------|----------------|
| 주 실행자 | 인간이 명령 → 에이전트 실행 | 에이전트가 자율 실행, 인간은 오케스트레이션 |
| 검증 주체 | 인간이 /code-review 호출 | 에이전트가 완료 전 자동 검증 |
| 엔트로피 관리 | 없음 (수동) | 백그라운드 GC 에이전트 자동 실행 |
| 실패 감지 | 인간이 수동 기록 | 실행 트레이스 자동 분석 |
| 계획 관리 | 세션 내 ephemeral | 리포지터리 커밋 + 진행 로그 |

현재 구조는 정밀하게 설계된 **워크플로우 템플릿 + 컨텍스트 관리 시스템**. 하네스 엔지니어링의 상위 절반(컨텍스트 관리)만 구현. 하위 절반(자율 에이전트 지원 인프라)은 미완.

---

## 4. 종합 평가표

| 영역 | 현재 | 하네스 기준 |
|------|------|-----------|
| 컨텍스트 엔지니어링 | ✅ 강함 | 매핑됨 |
| 메모리/상태 관리 | ✅ 강함 | 매핑됨 |
| 에이전트 역할 분리 | ✅ 강함 | 매핑됨 |
| 훅 미들웨어 | ✅ 강함 | 매핑됨 |
| 아키텍처 제약 (기계적) | ⚠️ 부분 | ArchUnit 있으나 실시간 아님 |
| 자기 검증 루프 | ⚠️ 부분 | 게이트 있으나 인간 의존 |
| 라이프사이클 관리 | ⚠️ 부분 | 메모리 있으나 실행 프로토콜 없음 |
| 실행 계획 영속화 | ❌ 없음 | 핵심 갭 |
| 엔트로피 자동 관리 | ❌ 없음 | 핵심 갭 |
| 에이전트 실행 관찰가능성 | ❌ 없음 | 핵심 갭 |

**한 줄 평가:** 컨텍스트 엔지니어링과 에이전트 오케스트레이션은 문헌 기준에 부합. 그러나 엔트로피 자동 관리, 실행 계획 영속화, 자기 검증 강제, 에이전트 관찰가능성 — 이 네 영역이 없는 현재 구조는 하네스 엔지니어링의 상위 절반만 구현한 상태.

---

*참조: [harness-engineering-roadmap.md](./harness-engineering-roadmap.md)*
