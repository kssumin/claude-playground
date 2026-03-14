#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
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

  // project-context.md 존재 여부 확인
  const contextFile = path.join(projectRoot, '.claude', 'project-context.md');
  if (!fs.existsSync(contextFile)) {
    console.error('[SessionStart] ⚠️  .claude/project-context.md 없음');
    console.error('[SessionStart] → /project-init 을 실행해 프로젝트 컨텍스트를 생성하세요');
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

  process.exit(0);
}
main().catch(err => { console.error('[SessionStart] Error:', err.message); process.exit(0); });
