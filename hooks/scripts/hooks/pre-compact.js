#!/usr/bin/env node
const path = require('path');
const { getSessionsDir, getDateTimeString, getTimeString, findFiles, ensureDir, appendFile, log } = require('../lib/utils');

async function main() {
  const sessionsDir = getSessionsDir();
  const compactionLog = path.join(sessionsDir, 'compaction-log.txt');
  ensureDir(sessionsDir);
  const timestamp = getDateTimeString();
  appendFile(compactionLog, `[${timestamp}] Context compaction triggered\n`);
  const sessions = findFiles(sessionsDir, '*.tmp');
  if (sessions.length > 0) {
    const timeStr = getTimeString();
    appendFile(sessions[0].path, `\n---\n**[Compaction: ${timeStr}]** - 컨텍스트가 요약되었습니다\n`);
  }
  log('[PreCompact] 압축 전 상태 저장 완료');
  process.exit(0);
}
main().catch(err => { console.error('[PreCompact] Error:', err.message); process.exit(0); });
