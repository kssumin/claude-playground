#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const os = require('os');
const { getSessionsDir, findFiles, ensureDir, log } = require('../lib/utils');
const { getProjectInfo, getRecommendedDevCommand } = require('../lib/build-manager');

async function main() {
  const sessionsDir = getSessionsDir();
  ensureDir(sessionsDir);
  const info = getProjectInfo();
  log('[SessionStart] Backend AI Toolkit 세션 시작');
  if (info.type) log(`[SessionStart] 프로젝트 타입: ${info.typeInfo?.description || info.type}`);
  if (info.isDocker) log('[SessionStart] Docker Compose 감지됨 - docker-compose up -d 권장');
  const devCommand = getRecommendedDevCommand();
  if (devCommand) log(`[SessionStart] 개발 서버: ${devCommand}`);
  const recentSessions = findFiles(sessionsDir, '*-session.tmp', { maxAge: 7 });
  if (recentSessions.length > 0) log(`[SessionStart] 최근 세션 ${recentSessions.length}개 발견`);

  const projectRoot = process.env.CLAUDE_PROJECT_ROOT || process.cwd();

  // project-context.md 존재 여부 + 형식 검증
  const contextFile = path.join(projectRoot, '.claude', 'project-context.md');
  if (!fs.existsSync(contextFile)) {
    console.error('[SessionStart] ⛔ .claude/project-context.md 없음');
    console.error('[SessionStart] → /project-init 을 실행해 프로젝트 컨텍스트를 생성하세요');
    console.error('[SessionStart]   arch-domain-check, arch-unit-check 훅이 비활성 상태입니다');
  } else {
    const contextContent = fs.readFileSync(contextFile, 'utf8');
    const hasModules = /## Modules/i.test(contextContent);
    const hasDomain = /^domain:\s*\S+/m.test(contextContent);

    if (!hasModules) {
      console.error('[SessionStart] ⚠️  project-context.md에 ## Modules 섹션 없음');
      console.error('[SessionStart] → arch-unit-check 훅 비활성. /project-init 으로 재생성 권장');
    } else if (!hasDomain) {
      console.error('[SessionStart] ⚠️  project-context.md Modules에 domain: 항목 없음');
      console.error('[SessionStart] → arch-domain-check 훅 비활성. 예: "domain: my-project-domain"');
    }
  }

  // docs/exec-plans/ 디렉터리 존재 여부 (첫 세션 온보딩 가이드)
  const execPlansRoot = path.join(projectRoot, 'docs', 'exec-plans');
  if (!fs.existsSync(execPlansRoot)) {
    console.error('[SessionStart] ℹ️  docs/exec-plans/ 없음 — 실행 계획 추적이 비활성 상태');
    console.error('[SessionStart] → mkdir -p docs/exec-plans/active docs/exec-plans/completed');
  }

  // failures.jsonl 미반영(unpromoted) 항목 경고
  const failuresFile = path.join(projectRoot, '.claude', 'memory', 'failures.jsonl');
  if (fs.existsSync(failuresFile)) {
    const lines = fs.readFileSync(failuresFile, 'utf8').trim().split('\n').filter(Boolean);
    const unpromoted = lines.filter(line => {
      try { return !JSON.parse(line).promoted; } catch { return false; }
    });
    if (unpromoted.length >= 3) {
      console.error(`[SessionStart] ⛔ failures.jsonl 미반영 ${unpromoted.length}건 — /memory-distill 실행 필요`);
    } else if (unpromoted.length > 0) {
      console.error(`[SessionStart] ⚠️  failures.jsonl 미반영 ${unpromoted.length}건 — /memory-distill 권장`);
    }
  }

  // decisions.jsonl 비어있으면 경고
  const decisionsFile = path.join(projectRoot, '.claude', 'memory', 'decisions.jsonl');
  if (!fs.existsSync(decisionsFile) || fs.readFileSync(decisionsFile, 'utf8').trim() === '') {
    console.error('[SessionStart] ⚠️  decisions.jsonl 비어있음 — 중요 설계 결정을 기록하세요');
  }

  // exec-plans/active/ 확인 — 진행 중인 계획 컨텍스트 주입
  const execPlansDir = path.join(projectRoot, 'docs', 'exec-plans', 'active');
  if (fs.existsSync(execPlansDir)) {
    const activePlans = fs.readdirSync(execPlansDir).filter(f => f.endsWith('.md'));
    if (activePlans.length > 0) {
      console.error(`[SessionStart] 📋 진행 중인 계획 ${activePlans.length}개 발견:`);
      activePlans.forEach(planFile => {
        const planPath = path.join(execPlansDir, planFile);
        const content = fs.readFileSync(planPath, 'utf8');
        const statusMatch = content.match(/\*\*상태:\*\*\s*(.+)/);
        const nextMatch = content.match(/다음 세션에서 할 것:\s*(.+)/);
        const status = statusMatch ? statusMatch[1].trim() : 'UNKNOWN';
        const next = nextMatch ? nextMatch[1].trim() : '';
        console.error(`[SessionStart]   📄 ${planFile} [${status}]`);
        if (next && next !== '') console.error(`[SessionStart]      → 다음: ${next}`);
      });
      console.error('[SessionStart] docs/exec-plans/active/ 를 읽고 현재 진행 상황을 파악하세요');
    }
  }

  // features.json 확인 — 기능 단위 진행 추적
  const featuresFile = path.join(projectRoot, 'docs', 'exec-plans', 'features.json');
  if (fs.existsSync(featuresFile)) {
    try {
      const features = JSON.parse(fs.readFileSync(featuresFile, 'utf8'));
      const pending = features.filter(f => f.status === 'pending');
      const inProgress = features.filter(f => f.status === 'in_progress');

      if (inProgress.length > 0) {
        console.error(`[SessionStart] 🔧 진행 중인 기능 ${inProgress.length}개:`);
        inProgress.forEach(f => console.error(`[SessionStart]   [IN_PROGRESS] #${f.id} ${f.name}`));
      }
      if (pending.length > 0) {
        console.error(`[SessionStart] 📌 대기 중인 기능 ${pending.length}개 — 다음 작업 후보:`);
        pending.slice(0, 3).forEach(f => console.error(`[SessionStart]   [PENDING] #${f.id} ${f.name}`));
        if (pending.length > 3) console.error(`[SessionStart]   ... 외 ${pending.length - 3}개`);
      }
      if (inProgress.length === 0 && pending.length === 0) {
        const completed = features.filter(f => f.status === 'completed');
        console.error(`[SessionStart] ✅ features.json — 전체 ${features.length}개 중 ${completed.length}개 완료`);
      }
    } catch (e) {
      console.error('[SessionStart] ⚠️  features.json 파싱 실패 — JSON 형식을 확인하세요');
    }
  }

  // 엔트로피 체크 주기 경고 — 7일 이상 미실행 시 알림
  const entropyCheckFile = path.join(os.homedir(), '.claude', 'last-entropy-check.json');
  if (!fs.existsSync(entropyCheckFile)) {
    console.error('[SessionStart] ⚠️  엔트로피 체크 기록 없음 — /arch-test + /ce-check 실행을 권장합니다');
  } else {
    try {
      const record = JSON.parse(fs.readFileSync(entropyCheckFile, 'utf8'));
      const daysSince = Math.floor((Date.now() - record.ts) / (1000 * 60 * 60 * 24));
      if (daysSince >= 7) {
        console.error(`[SessionStart] ⚠️  마지막 엔트로피 체크로부터 ${daysSince}일 경과 — /arch-test + /ce-check 실행 권장`);
      }
    } catch (_) {
      console.error('[SessionStart] ⚠️  last-entropy-check.json 파싱 실패 — /arch-test 로 재기록 가능');
    }
  }

  process.exit(0);
}
main().catch(err => { console.error('[SessionStart] Error:', err.message); process.exit(0); });
