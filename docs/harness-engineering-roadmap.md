# 하네스 엔지니어링 실행 로드맵

**작성일:** 2026-03-29
**기반 문서:** [harness-engineering-audit.md](./harness-engineering-audit.md)

---

## 자율 에이전트 지원 인프라란?

### 핵심 질문: 지금 어떻게 일하고 있나?

현재 방식:
```
나 → "이 기능 만들어줘" → Claude 실행 → 나 → 결과 검토
  → "이제 리뷰해줘" → Claude 리뷰 → 나 → 다음 세션 시작
  → "지난번에 어디까지 했더라..." → MEMORY.md 읽기 → 재개
```

**매 단계마다 내가 개입해야 한다.** Claude가 멈추면 작업도 멈춘다.

### 자율 에이전트 지원 인프라가 있으면?

```
나 → "이 기능 만들어줘" → Claude 실행
  → (스스로) "내가 만든 코드 테스트해볼게"
  → (스스로) "테스트 통과. 아키텍처 규칙 위반 없음 확인됨"
  → (스스로) "다음 세션에서 이어받을 수 있도록 진행 파일 기록"
  → (다음 날 새 세션) 진행 파일 읽기 → 어디까지 했는지 파악
  → (스스로) 다음 우선순위 작업 선택 → 실행 → 검증 → 기록
  → 이상 감지 → 나에게 알림
```

**에이전트가 중간에 내가 없어도 자기 흐름을 유지한다.**

### 비유로 이해하기

| 현재 | 자율 에이전트 지원 인프라 있으면 |
|------|-------------------------------|
| 뛰어난 직원인데 다음에 뭘 해야 할지 매번 물어봐야 함 | 알아서 우선순위 파악하고, 끝나면 보고하고, 문제 생기면 에스컬레이션 |
| 퇴근하면 작업 중단 | 퇴근해도 백그라운드로 계속 진행 |
| 실수해도 내가 발견해야 함 | 스스로 실수 감지, 자동 교정 시도, 안 되면 보고 |
| 이전 작업 맥락을 내가 설명해줘야 함 | 파일 읽어서 스스로 맥락 파악 |

이것이 하네스가 제공해야 하는 **"에이전트가 혼자 일할 수 있는 환경"** 이다.

---

## 실행 로드맵

갭 분석 결과를 바탕으로, 구현 난이도와 효과를 고려한 순서.

---

### Step 1: 실행 계획을 리포지터리 아티팩트로 (난이도: 낮음 / 효과: 높음)

**지금의 문제:**
/plan으로 만든 계획이 세션이 끝나면 사라진다. 다음 세션에서 에이전트는 "뭘 하려고 했었지?"를 알 수 없다. MEMORY.md에 요약은 있지만, 단계별 진행 상태가 없다.

**만들어야 할 것:**

```
alarm/
└── docs/
    └── exec-plans/
        ├── active/
        │   └── [작업명]-plan.md   ← 진행 중인 계획
        └── completed/
            └── [작업명]-plan.md   ← 완료된 계획
```

**계획 파일 형식:**
```markdown
# [작업명] 실행 계획

**시작일:** 2026-03-29
**상태:** IN_PROGRESS | COMPLETED | BLOCKED
**마지막 세션:** 2026-03-29

## 목표
...

## 단계별 진행

- [x] Step 1: 설계 완료
- [x] Step 2: 도메인 모델 작성
- [ ] Step 3: Repository 구현  ← 현재 여기
- [ ] Step 4: UseCase 구현
- [ ] Step 5: 통합 테스트

## 현재 세션 메모
마지막으로 한 것: AlarmRepository 인터페이스 작성 완료
다음 세션에서 할 것: InfraAlarmRepository 구현 시작
블로커: 없음

## 결정 기록
...
```

**어떻게 작동하나:**
- /plan 실행 시 → `docs/exec-plans/active/[작업명]-plan.md` 자동 생성
- 세션 시작 시 → active/ 폴더 확인 → 진행 중인 계획 있으면 읽고 시작
- 완료 시 → completed/ 로 이동

**지금 당장 할 수 있는 최소 구현:**
/plan 명령어에 "계획을 docs/exec-plans/active/ 에 파일로 저장하라"는 지시 추가.

---

### Step 2: 세션 시작 루틴 프로토콜 (난이도: 낮음 / 효과: 높음)

**지금의 문제:**
각 세션이 MEMORY.md를 읽는 것으로 시작하지만, 이건 에이전트가 "알아서" 하는 게 아니라 내가 새 대화를 시작할 때마다 컨텍스트가 로드되는 것이다. 구조화된 시작 체크리스트가 없다.

**Anthropic이 권장하는 세션 시작 루틴:**
```
1. pwd 확인 (작업 디렉터리)
2. git log 최근 5개 확인 (지난 세션에서 뭘 커밋했나)
3. docs/exec-plans/active/ 확인 (진행 중인 계획 있나)
4. 기본 테스트 실행 (현재 코드베이스 상태 확인)
5. 우선순위 작업 선택
```

**어떻게 구현하나:**
project-context.md 또는 CLAUDE.md에 "새 세션 시작 시 반드시 다음 순서로 실행하라" 섹션 추가.

또는 SessionStart 훅으로:
```json
"SessionStart": [{
  "matcher": "",
  "hooks": [{
    "type": "command",
    "command": "cat docs/exec-plans/active/*.md 2>/dev/null | head -50 || echo '진행 중인 계획 없음'"
  }]
}]
```

---

### Step 3: 자기 검증 훅 (난이도: 중간 / 효과: 높음)

**지금의 문제:**
에이전트가 코드를 작성하고 "구현 완료"라고 말한다. 실제로 테스트가 통과하는지, 아키텍처 규칙을 위반하지 않는지 확인하는 강제 장치가 없다.

**만들어야 할 것 (settings.json 훅):**

```json
"PostToolUse": [
  {
    "matcher": "Write|Edit",
    "hooks": [{
      "type": "command",
      "command": ".claude/hooks/post-edit-verify.sh"
    }]
  }
]
```

```bash
#!/bin/bash
# .claude/hooks/post-edit-verify.sh
EDITED_FILE="${CLAUDE_TOOL_INPUT_FILE_PATH}"

# .kt 파일이면
if [[ "$EDITED_FILE" == *.kt ]]; then
  # 1. ArchUnit 검사
  MODULE=$(echo "$EDITED_FILE" | grep -oP 'alarm-\w+' | head -1)
  if [[ -n "$MODULE" ]]; then
    RESULT=$(./gradlew :${MODULE}:test --tests "*ArchitectureTest" -q 2>&1 | tail -3)
    if echo "$RESULT" | grep -q "FAILED"; then
      echo "⚠️ 아키텍처 규칙 위반 감지:"
      echo "$RESULT"
      echo "위반을 수정하지 않으면 진행하지 마세요."
    fi
  fi
fi
```

**더 나아가면:**
TDD 사이클에서 "구현 완료"를 선언하기 전, 체크리스트를 강제하는 pre-completion 훅:
```bash
# 다음 질문에 답하기 전까지 완료 선언 금지:
# 1. 관련 테스트가 GREEN인가?
# 2. ArchUnit이 통과하는가?
# 3. E2E 시나리오를 수동으로 확인했는가?
```

---

### Step 4: ArchUnit을 PostToolUse에 연결 (난이도: 낮음 / 효과: 중간)

**지금의 문제:**
ArchUnit은 존재하지만 개발자(또는 에이전트)가 명시적으로 실행해야만 결과를 알 수 있다.

**해결:** Step 3의 post-edit-verify.sh에 ArchUnit 검사를 포함. .kt 파일 편집 시 자동 실행.

주의: 느릴 수 있다. `--rerun-tasks` 없이 캐시 활용하면 빠름.

```bash
./gradlew :alarm-domain:test --tests "*ArchitectureTest" --reuse-configuration-cache -q
```

---

### Step 5: failures.jsonl → rules/ 자동 반영 루프 (난이도: 중간 / 효과: 중간)

**지금의 문제:**
failures.jsonl에 실패가 기록되지만, 그 내용이 rules/에 반영되는 루프가 수동이다. /memory-distill 명령어가 있지만 내가 기억해서 실행해야 한다.

**개선:**
- 5번째 failure 기록 시 자동으로 "/memory-distill 실행을 고려하세요" 알림
- 또는 /memory-distill 명령어에 "마지막 실행 이후 새로운 failures 있으면 자동 반영" 로직 추가

**실질적 목표:**
실패 → 기록 → 룰 반영의 루프가 명시적으로 보여야 한다.
현재: failures.jsonl에 기록 (끝)
목표: failures.jsonl에 기록 → prevention 항목이 해당 rule 파일에 추가됨

---

### Step 6: 세션 로그 최소 수집 (난이도: 낮음 / 효과: 중간)

**지금의 문제:**
어떤 명령어에서 에이전트가 자주 막히는지, 어떤 규칙이 실제로 지켜지는지 데이터가 없다. 하네스를 개선하려면 증거가 필요하다.

**만들어야 할 것:**

```json
"Stop": [{
  "matcher": "",
  "hooks": [{
    "type": "command",
    "command": ".claude/hooks/session-log.sh"
  }]
}]
```

```bash
#!/bin/bash
# .claude/hooks/session-log.sh
DATE=$(date +%Y-%m-%d)
PROJECT=$(basename "$PWD")
LOG_FILE="$HOME/.claude/session-logs/${DATE}.jsonl"

echo "{\"date\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"project\":\"${PROJECT}\"}" >> "$LOG_FILE"
```

2주치 로그가 쌓이면 패턴을 볼 수 있다.

---

### Step 7: 엔트로피 관리 에이전트 (난이도: 높음 / 효과: 높음)

**지금의 문제:**
코드와 문서가 시간이 지남에 따라 어긋난다. 지금은 이걸 발견하는 자동 메커니즘이 없다.

**OpenAI가 한 것:**
> *"Background Codex garbage-collection process. Most are reviewable in under 1 minute and auto-merge."*

**우리가 할 수 있는 것 (Claude Code Cron 기반):**

주간 엔트로피 체크 크론 태스크:
```
매주 월요일: /arch-test 실행 → 위반 있으면 이슈 생성
매주 월요일: rules/ 파일 30줄 초과 여부 체크
매주 월요일: decisions.jsonl vs 현재 코드 정합성 샘플 체크
```

구체적 구현은 Claude Code의 CronCreate 기능 또는 별도 스크립트로.

**최소 구현 (지금 당장):**
월간 /ce-check 실행 리마인더를 캘린더에 등록.
완전 자동화는 아니지만, 엔트로피가 쌓이지 않도록 주기를 만드는 것.

---

## 실행 우선순위 요약

| 순위 | 작업 | 소요 시간 | 효과 |
|------|------|----------|------|
| 1 | exec-plans/ 디렉터리 + /plan 연동 | 1시간 | 세션 간 연속성 즉시 개선 |
| 2 | 세션 시작 루틴 (SessionStart 훅 또는 문서화) | 30분 | 컨텍스트 자동 로드 |
| 3 | ArchUnit → PostToolUse 연결 | 1시간 | 실시간 아키텍처 피드백 |
| 4 | post-edit-verify.sh 자기 검증 훅 | 2시간 | 완료 선언 전 검증 강제 |
| 5 | session-log.sh 최소 수집 | 30분 | 하네스 개선 데이터 확보 |
| 6 | failures → rules 반영 루프 명시화 | 1시간 | 피드백 루프 완성 |
| 7 | 엔트로피 관리 자동화 | 4시간+ | 장기 코드 품질 유지 |

---

## 핵심 원칙: 왜 이 순서인가?

1-2번이 먼저인 이유: **에이전트가 다음 세션에서 어디서부터 시작할지 알아야 한다.** 이게 없으면 나머지는 의미 없다.

3-4번이 그 다음인 이유: **검증이 없으면 자율성은 위험이다.** 에이전트가 혼자 일하게 하려면, 스스로 틀렸는지 알아야 한다.

5-6번이 그 다음인 이유: **데이터 없이 개선할 수 없다.** 어디서 막히는지 알아야 하네스를 고칠 수 있다.

7번이 마지막인 이유: **1-6이 없으면 엔트로피 관리 에이전트 자체가 엔트로피를 만든다.**

---

*참조: [harness-engineering-audit.md](./harness-engineering-audit.md)*
