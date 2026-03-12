#!/usr/bin/env node
/**
 * Kotlin Compile Check Hook (PostToolUse)
 * .kt 파일 편집 후 백그라운드로 해당 모듈 compileKotlin을 실행한다.
 * 결과는 /tmp/claude-compile.log에 기록되고, 다음 편집 전(PreToolUse)에 확인된다.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const LOG_FILE = path.join(os.tmpdir(), 'claude-kotlin-compile.log');

const MODULES = [
  'alarm-api',
  'alarm-consumer',
  'alarm-domain',
  'alarm-infra',
  'alarm-client-external',
  'alarm-common',
];

function detectModule(filePath) {
  for (const mod of MODULES) {
    if (filePath.includes(`/${mod}/`)) return mod;
  }
  return null;
}

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

    const mod = detectModule(filePath);
    if (!mod) {
      process.stdout.write(input);
      return;
    }

    const projectRoot = process.env.CLAUDE_PROJECT_ROOT || process.cwd();
    const gradlew = path.join(projectRoot, 'gradlew');

    if (!fs.existsSync(gradlew)) {
      process.stdout.write(input);
      return;
    }

    // 이전 컴파일 결과 초기화 후 백그라운드 실행
    fs.writeFileSync(LOG_FILE, JSON.stringify({ status: 'running', module: mod, file: filePath, startedAt: Date.now() }));

    const child = spawn(gradlew, [`:${mod}:compileKotlin`, '--quiet', '--daemon'], {
      cwd: projectRoot,
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let output = '';
    child.stdout.on('data', d => output += d.toString());
    child.stderr.on('data', d => output += d.toString());

    child.on('close', (code) => {
      const result = {
        status: code === 0 ? 'success' : 'error',
        module: mod,
        file: path.basename(filePath),
        code,
        output: output.trim().slice(0, 1000), // 최대 1000자
        finishedAt: Date.now(),
      };
      try {
        fs.writeFileSync(LOG_FILE, JSON.stringify(result));
      } catch (e) {}
    });

    child.unref();

    process.stdout.write(input);
  } catch (e) {
    process.stdout.write(input);
  }
});
