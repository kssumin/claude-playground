---
name: analyze-sessions
description: "~/.claude/session-logs/ 데이터를 분석해 반복 실패 패턴을 찾고 하네스 개선을 제언한다. Use when user says '/analyze-sessions', '세션 분석', '하네스 점검', or after 2+ weeks of work."
allowed-tools: ["Bash", "Read", "Glob"]
---

# /analyze-sessions — 세션 로그 분석 → 하네스 개선 제언

> 데이터 없이 하네스를 개선할 수 없다.
> session-end.js가 쌓은 데이터를 읽어 패턴을 찾는다.

## Step 1: 로그 파일 수집

```bash
ls ~/.claude/session-logs/*.jsonl 2>/dev/null | sort
```

없으면: "session-logs 없음 — session-end.js가 아직 데이터를 수집하지 않았습니다" 출력 후 종료.

## Step 2: 데이터 파싱 (Node.js)

```bash
node -e "
const fs = require('fs');
const path = require('path');
const os = require('os');

const logsDir = path.join(os.homedir(), '.claude', 'session-logs');
if (!fs.existsSync(logsDir)) { console.log('{}'); process.exit(0); }

const files = fs.readdirSync(logsDir).filter(f => f.endsWith('.jsonl')).sort().slice(-14); // 최근 14일
const entries = [];

for (const file of files) {
  const lines = fs.readFileSync(path.join(logsDir, file), 'utf8').trim().split('\n').filter(Boolean);
  for (const line of lines) {
    try { entries.push(JSON.parse(line)); } catch {}
  }
}

// 집계
const total = entries.length;
const archFails = entries.filter(e => e.arch?.status === 'error');
const compileFails = entries.filter(e => e.compile?.status === 'error');
const projects = [...new Set(entries.map(e => e.project))];

// 모듈별 실패 집계
const archByModule = {};
archFails.forEach(e => {
  const m = e.arch.module || 'unknown';
  archByModule[m] = (archByModule[m] || 0) + 1;
});

const compileByModule = {};
compileFails.forEach(e => {
  const m = e.compile.module || 'unknown';
  compileByModule[m] = (compileByModule[m] || 0) + 1;
});

console.log(JSON.stringify({
  period: files[0]?.replace('.jsonl','') + ' ~ ' + files[files.length-1]?.replace('.jsonl',''),
  totalSessions: total,
  projects,
  arch: { failCount: archFails.length, byModule: archByModule },
  compile: { failCount: compileFails.length, byModule: compileByModule },
}, null, 2));
"
```

## Step 3: 분석 및 제언

파싱된 JSON을 읽고 다음 기준으로 판단한다.

### 아키텍처 위반 패턴
- **동일 모듈 3회 이상**: 해당 모듈의 arch-domain-check 규칙 강화 필요
- **위반률 > 20%**: rules/ 또는 skills/에 관련 원칙 추가 필요
- **위반 없음**: 하네스가 잘 작동 중

### 컴파일 실패 패턴
- **동일 모듈 반복**: 해당 모듈에 빌드 문제 있음 → /build-fix 권장
- **전체 실패율 > 30%**: kotlin-compile-check 훅이 너무 빨리 실행될 수 있음 → 디바운스 검토

### 세션 수 해석
- 세션이 적으면 (< 5): 분석하기 데이터 부족
- 세션이 많으면: 하네스가 잘 활용되고 있음

## Step 4: 결과 보고

```markdown
## 세션 분석 결과 ({period})

**총 세션:** {totalSessions}개 | **프로젝트:** {projects}

### [A] 아키텍처 위반
- 총 {failCount}회 ({rate}%)
- 모듈별: {byModule 테이블}
- **제언:** {판단 결과}

### [B] 컴파일 실패
- 총 {failCount}회 ({rate}%)
- 모듈별: {byModule 테이블}
- **제언:** {판단 결과}

### 하네스 개선 우선순위
1. {가장 시급한 것}
2. {그 다음}
```

## 데이터가 충분하지 않을 때

2주 미만 데이터: "분석을 위해 최소 2주 사용 데이터가 필요합니다. 현재 {N}일치 데이터."
