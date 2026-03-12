#!/usr/bin/env node
/**
 * Loop Detection Hook (PostToolUse)
 * 동일 파일이 세션 내 5회 이상 편집되면 경고를 출력한다.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const THRESHOLD = 5;
const TRACK_FILE = path.join(os.tmpdir(), `claude-loop-detect-${getTodayKey()}.json`);

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
}

function loadCounts() {
  try {
    return JSON.parse(fs.readFileSync(TRACK_FILE, 'utf8'));
  } catch (e) {
    return {};
  }
}

function saveCounts(counts) {
  try {
    fs.writeFileSync(TRACK_FILE, JSON.stringify(counts));
  } catch (e) {}
}

let input = '';
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const filePath = data.tool_input?.file_path || '';

    if (!filePath) {
      process.stdout.write(input);
      return;
    }

    const normalPath = path.resolve(filePath);
    const counts = loadCounts();
    counts[normalPath] = (counts[normalPath] || 0) + 1;
    saveCounts(counts);

    const count = counts[normalPath];
    if (count >= THRESHOLD) {
      const name = path.basename(filePath);
      console.error(`[Loop Detect] ⚠️ ${name} — 오늘 ${count}번째 편집`);
      console.error('[Loop Detect] 동일 파일 반복 수정 패턴 감지. 다른 접근 방법을 시도하거나 사용자에게 확인하세요.');
    }

    process.stdout.write(input);
  } catch (e) {
    process.stdout.write(input);
  }
});
