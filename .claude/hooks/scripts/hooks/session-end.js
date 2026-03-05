#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
const { getSessionsDir, getDateString, getTimeString, getSessionIdShort, ensureDir, writeFile, replaceInFile, log } = require('../lib/utils');

async function main() {
  const sessionsDir = getSessionsDir();
  const today = getDateString();
  const shortId = getSessionIdShort();
  const sessionFile = path.join(sessionsDir, `${today}-${shortId}-session.tmp`);
  ensureDir(sessionsDir);
  const currentTime = getTimeString();
  if (fs.existsSync(sessionFile)) {
    replaceInFile(sessionFile, /\*\*Last Updated:\*\*.*/, `**Last Updated:** ${currentTime}`);
    log(`[SessionEnd] 세션 파일 업데이트: ${sessionFile}`);
  } else {
    const template = `# Session: ${today}\n**Date:** ${today}\n**Started:** ${currentTime}\n**Last Updated:** ${currentTime}\n\n---\n\n## Current State\n\n### Completed\n- [ ]\n\n### In Progress\n- [ ]\n\n### Notes for Next Session\n-\n`;
    writeFile(sessionFile, template);
    log(`[SessionEnd] 세션 파일 생성: ${sessionFile}`);
  }
  process.exit(0);
}
main().catch(err => { console.error('[SessionEnd] Error:', err.message); process.exit(0); });
