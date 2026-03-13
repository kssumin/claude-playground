#!/usr/bin/env node
/**
 * Compile Result Check Hook (PostToolUse - 모든 도구)
 * 백그라운드 컴파일 결과가 완료되었으면 즉시 모델에 피드백한다.
 * 성공이면 조용히 통과, 실패면 stderr로 에러 출력.
 * 한 번 보고한 결과는 재보고하지 않는다.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const LOG_FILE = path.join(os.tmpdir(), 'claude-kotlin-compile.log');
const REPORTED_FILE = path.join(os.tmpdir(), 'claude-kotlin-compile-reported');
const STALE_MS = 5 * 60 * 1000; // 5분 이상 지난 결과는 무시

let input = '';
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    if (!fs.existsSync(LOG_FILE)) {
      process.stdout.write(input);
      return;
    }

    const log = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));

    // 아직 실행 중이면 통과
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

    // 5분 이상 지난 결과는 무시
    if (age > STALE_MS) {
      process.stdout.write(input);
      return;
    }

    // 보고 완료 표시
    fs.writeFileSync(REPORTED_FILE, String(log.finishedAt));

    if (log.status === 'error') {
      console.error(`[Auto-Compile] ❌ :${log.module}:compileKotlin 실패 (${log.file})`);
      if (log.output) {
        const lines = log.output.split('\n').filter(l => l.trim()).slice(0, 10);
        lines.forEach(l => console.error(`  ${l}`));
      }
      console.error('[Auto-Compile] 컴파일 오류를 수정하세요.');
    } else if (log.status === 'success') {
      console.error(`[Auto-Compile] ✅ :${log.module}:compileKotlin 성공 (${log.file})`);
    }

    process.stdout.write(input);
  } catch (e) {
    process.stdout.write(input);
  }
});
