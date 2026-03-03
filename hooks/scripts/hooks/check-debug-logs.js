#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');

let data = '';
process.stdin.on('data', chunk => { data += chunk; });
process.stdin.on('end', () => {
  try {
    try { execSync('git rev-parse --git-dir', { stdio: 'pipe' }); } catch { console.log(data); process.exit(0); }
    const files = execSync('git diff --name-only HEAD', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] })
      .split('\n').filter(f => f && fs.existsSync(f));
    const warnings = [];
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      const ext = file.split('.').pop();
      if (ext === 'kt') {
        const lines = content.split('\n');
        for (const line of lines) {
          if (/\bprintln\b/.test(line) && !/\/\//.test(line.split('println')[0])) {
            warnings.push({ file, type: 'println' }); break;
          }
        }
      }
      if (ext === 'java') {
        if (/System\.out\.print/.test(content)) warnings.push({ file, type: 'System.out.print' });
      }
    }
    if (warnings.length > 0) {
      console.error('[Hook] 디버그 로그가 발견되었습니다:');
      for (const w of warnings.slice(0, 5)) console.error(`  - ${w.file}: ${w.type}`);
      if (warnings.length > 5) console.error(`  ... 그 외 ${warnings.length - 5}개 파일`);
      console.error('[Hook] 커밋 전 디버그 로그를 제거하세요');
    }
  } catch (_error) {}
  console.log(data);
});
