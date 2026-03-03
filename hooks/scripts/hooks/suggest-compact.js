#!/usr/bin/env node
const path = require('path');
const { getTempDir, readFile, writeFile, log } = require('../lib/utils');

async function main() {
  const sessionId = process.env.CLAUDE_SESSION_ID || process.ppid || 'default';
  const counterFile = path.join(getTempDir(), `claude-tool-count-${sessionId}`);
  const threshold = parseInt(process.env.COMPACT_THRESHOLD || '50', 10);
  let count = 1;
  const existing = readFile(counterFile);
  if (existing) count = parseInt(existing.trim(), 10) + 1;
  writeFile(counterFile, String(count));
  if (count === threshold) log(`[StrategicCompact] ${threshold}회 도구 호출 - /compact를 고려하세요`);
  if (count > threshold && count % 25 === 0) log(`[StrategicCompact] ${count}회 도구 호출 - /compact를 권장합니다`);
  process.exit(0);
}
main().catch(err => { console.error('[StrategicCompact] Error:', err.message); process.exit(0); });
