#!/usr/bin/env node
/**
 * ArchUnit Result Check Hook (PostToolUse - 모든 도구)
 *
 * 백그라운드 ArchUnit 결과가 완료되었으면 즉시 에이전트에 피드백.
 * compile-result-check.js와 동일한 패턴.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const LOG_FILE = path.join(os.tmpdir(), 'claude-arch-unit.log');
const REPORTED_FILE = path.join(os.tmpdir(), 'claude-arch-unit-reported');
const STALE_MS = 10 * 60 * 1000; // 10분

let input = '';
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    if (!fs.existsSync(LOG_FILE)) {
      process.stdout.write(input);
      return;
    }

    const log = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));

    if (log.status === 'running') {
      process.stdout.write(input);
      return;
    }

    // 이미 보고한 결과면 통과
    if (fs.existsSync(REPORTED_FILE)) {
      const reportedId = fs.readFileSync(REPORTED_FILE, 'utf8').trim();
      if (reportedId === String(log.finishedAt)) {
        process.stdout.write(input);
        return;
      }
    }

    const age = Date.now() - (log.finishedAt || 0);
    if (age > STALE_MS) {
      process.stdout.write(input);
      return;
    }

    fs.writeFileSync(REPORTED_FILE, String(log.finishedAt));

    if (log.status === 'error') {
      console.error(`[ArchUnit] ❌ :${log.module} 아키텍처 규칙 위반 (${log.file})`);
      if (log.output) {
        // ArchUnit 위반 메시지만 추출
        const lines = log.output.split('\n')
          .filter(l => l.includes('was') || l.includes('should') || l.includes('ArchCondition') || l.includes('Architecture'))
          .slice(0, 15);
        if (lines.length > 0) {
          lines.forEach(l => console.error(`  ${l.trim()}`));
        } else {
          log.output.split('\n').slice(0, 10).forEach(l => console.error(`  ${l}`));
        }
      }
      console.error('[ArchUnit] 아키텍처 규칙을 확인하고 위반을 수정하세요.');
    } else if (log.status === 'success') {
      console.error(`[ArchUnit] ✅ :${log.module} 아키텍처 규칙 통과 (${log.file})`);
    }

    process.stdout.write(input);
  } catch (e) {
    process.stdout.write(input);
  }
});
