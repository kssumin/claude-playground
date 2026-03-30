#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
const os = require('os');
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

  // 세션 관찰가능성 로그 — 하네스 개선 데이터 수집
  try {
    const projectRoot = process.env.CLAUDE_PROJECT_ROOT || process.cwd();
    const projectName = path.basename(projectRoot);
    const logsDir = path.join(os.homedir(), '.claude', 'session-logs');
    ensureDir(logsDir);
    const logFile = path.join(logsDir, `${today}.jsonl`);

    // ArchUnit 결과 수집
    const archLogFile = path.join(os.tmpdir(), 'claude-arch-unit.log');
    let archResult = null;
    if (fs.existsSync(archLogFile)) {
      try { archResult = JSON.parse(fs.readFileSync(archLogFile, 'utf8')); } catch (_) {}
    }

    // 컴파일 결과 수집
    const compileLogFile = path.join(os.tmpdir(), 'claude-kotlin-compile.log');
    let compileResult = null;
    if (fs.existsSync(compileLogFile)) {
      try { compileResult = JSON.parse(fs.readFileSync(compileLogFile, 'utf8')); } catch (_) {}
    }

    const entry = {
      ts: new Date().toISOString(),
      project: projectName,
      sessionId: shortId,
      arch: archResult ? { status: archResult.status, module: archResult.module } : null,
      compile: compileResult ? { status: compileResult.status, module: compileResult.module } : null,
    };

    fs.appendFileSync(logFile, JSON.stringify(entry) + '\n');
  } catch (_) {
    // 관찰가능성 로그 실패는 세션 종료를 막지 않음
  }

  process.exit(0);
}
main().catch(err => { console.error('[SessionEnd] Error:', err.message); process.exit(0); });
