#!/usr/bin/env node
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
  process.exit(0);
}
main().catch(err => { console.error('[SessionStart] Error:', err.message); process.exit(0); });
