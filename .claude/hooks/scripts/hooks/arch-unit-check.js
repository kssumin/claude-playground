#!/usr/bin/env node
/**
 * ArchUnit Background Check Hook (PostToolUse)
 *
 * project-context.md의 "## Modules" 섹션에서 모듈 목록을 읽어
 * 해당 모듈의 .kt 파일 편집 시 *ArchitectureTest를 백그라운드로 실행.
 * 결과는 /tmp/claude-arch-unit.log에 기록되고,
 * arch-unit-result-check.js가 다음 도구 호출 시 피드백.
 *
 * 범용 동작: project-context.md가 없으면 ArchUnit 실행을 건너뜀.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const LOG_FILE = path.join(os.tmpdir(), 'claude-arch-unit.log');

/**
 * project-context.md의 "## Modules" 섹션에서 모듈 디렉터리명 목록을 읽는다.
 * 형식: "key: module-name" 또는 "key: module-name (port: N)"
 */
function getModules(projectRoot) {
  const contextPath = path.join(projectRoot, '.claude', 'project-context.md');
  if (!fs.existsSync(contextPath)) return [];
  const content = fs.readFileSync(contextPath, 'utf8');
  const modulesMatch = content.match(/## Modules\s*\n([\s\S]*?)(?=\n##|\n---|\z)/);
  if (!modulesMatch) return [];
  const modules = [];
  for (const line of modulesMatch[1].split('\n')) {
    const match = line.match(/^\w[\w-]*:\s*([^\s(#\n]+)/);
    if (match) modules.push(match[1].trim());
  }
  return modules;
}

function detectModule(filePath, modules) {
  for (const mod of modules) {
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

    const projectRoot = process.env.CLAUDE_PROJECT_ROOT || process.cwd();
    const gradlew = path.join(projectRoot, 'gradlew');
    const modules = getModules(projectRoot);
    if (modules.length === 0) {
      process.stdout.write(input);
      return;
    }
    const mod = detectModule(filePath, modules);
    if (!mod) {
      process.stdout.write(input);
      return;
    }

    if (!fs.existsSync(gradlew)) {
      process.stdout.write(input);
      return;
    }

    // ArchitectureTest가 존재하는 모듈인지 확인
    const testDir = path.join(projectRoot, mod, 'src', 'test');
    if (!fs.existsSync(testDir)) {
      process.stdout.write(input);
      return;
    }

    // 이미 실행 중이면 중복 실행 방지 (30초 이내)
    if (fs.existsSync(LOG_FILE)) {
      try {
        const existing = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
        if (existing.status === 'running' && (Date.now() - existing.startedAt) < 30_000) {
          process.stdout.write(input);
          return;
        }
      } catch (_) {}
    }

    fs.writeFileSync(LOG_FILE, JSON.stringify({
      status: 'running',
      module: mod,
      file: filePath,
      startedAt: Date.now(),
    }));

    const child = spawn(gradlew, [
      `:${mod}:test`, '--tests', '*ArchitectureTest*',
      '--quiet', '--daemon', '--reuse-configuration-cache',
    ], {
      cwd: projectRoot,
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let output = '';
    child.stdout.on('data', d => output += d.toString());
    child.stderr.on('data', d => output += d.toString());

    child.on('close', (code) => {
      try {
        fs.writeFileSync(LOG_FILE, JSON.stringify({
          status: code === 0 ? 'success' : 'error',
          module: mod,
          file: path.basename(filePath),
          code,
          output: output.trim().slice(0, 2000),
          finishedAt: Date.now(),
        }));
      } catch (_) {}
    });

    child.unref();
    process.stdout.write(input);
  } catch (e) {
    process.stdout.write(input);
  }
});
