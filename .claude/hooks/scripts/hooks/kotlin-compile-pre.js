#!/usr/bin/env node
/**
 * Kotlin Compile Pre-Check Hook (PreToolUse)
 * .kt 파일 편집 전, 이전 백그라운드 컴파일 결과를 확인한다.
 * 5분 이내에 실패한 컴파일이 있으면 경고를 출력한다.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const LOG_FILE = path.join(os.tmpdir(), 'claude-kotlin-compile.log');
const STALE_MS = 5 * 60 * 1000; // 5분

let input = '';
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const filePath = data.tool_input?.file_path || '';

    if (!filePath || !filePath.endsWith('.kt')) {
      process.stdout.write(input);
      return;
    }

    if (!fs.existsSync(LOG_FILE)) {
      process.stdout.write(input);
      return;
    }

    const log = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
    const age = Date.now() - (log.finishedAt || 0);

    if (log.status === 'error' && age < STALE_MS) {
      console.error(`[Compile Check] ❌ :${log.module}:compileKotlin 실패 (${Math.round(age / 1000)}초 전)`);
      if (log.output) {
        const lines = log.output.split('\n').filter(l => l.trim()).slice(0, 5);
        lines.forEach(l => console.error(`  ${l}`));
      }
      console.error('[Compile Check] 컴파일 오류를 먼저 수정하는 것을 권장합니다.');
    } else if (log.status === 'running') {
      // 컴파일 진행 중이면 조용히 통과
    }

    process.stdout.write(input);
  } catch (e) {
    process.stdout.write(input);
  }
});
