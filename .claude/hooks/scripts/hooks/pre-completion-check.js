#!/usr/bin/env node
/**
 * Pre-Completion Check Hook (Stop)
 *
 * 에이전트가 응답을 마치기 전에 실행된다.
 * .kt 파일 편집이 있었던 세션에서 두 가지를 체크한다.
 *
 * [A] 자기 검증 체크리스트
 *   - 백그라운드 arch 또는 compile 검사가 실패 상태로 남아 있으면 경고
 *   - "검증 안 하고 완료 선언" 패턴 차단
 *
 * [B] exec-plans 업데이트 리마인더
 *   - docs/exec-plans/active/에 진행 중인 계획이 있으면
 *   - "현재 세션 메모와 체크박스를 업데이트했나요?" 리마인더
 *
 * 범용 동작: .kt 편집이 없거나 git repo가 아니면 조용히 통과.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const ARCH_LOG    = path.join(os.tmpdir(), 'claude-arch-unit.log');
const COMPILE_LOG = path.join(os.tmpdir(), 'claude-kotlin-compile.log');

function isGitRepo() {
  try { execSync('git rev-parse --git-dir', { stdio: 'pipe' }); return true; }
  catch { return false; }
}

/** git에서 편집된 .kt 파일 목록 */
function getEditedKtFiles() {
  try {
    const staged   = execSync('git diff --name-only HEAD', { encoding: 'utf8', stdio: 'pipe' });
    const unstaged = execSync('git diff --name-only',      { encoding: 'utf8', stdio: 'pipe' });
    const all = [...new Set([...staged.split('\n'), ...unstaged.split('\n')])]
      .filter(f => f.endsWith('.kt') && fs.existsSync(f));
    return all;
  } catch { return []; }
}

/** 로그 파일에서 결과 읽기. stale(10분 초과)이면 null 반환 */
function readLog(logFile) {
  if (!fs.existsSync(logFile)) return null;
  try {
    const log = JSON.parse(fs.readFileSync(logFile, 'utf8'));
    if (log.status === 'running') return null; // 아직 실행 중
    const age = Date.now() - (log.finishedAt || 0);
    if (age > 10 * 60 * 1000) return null; // 10분 지난 결과는 무시
    return log;
  } catch { return null; }
}

/** exec-plans/active/ 에서 진행 중인 계획 목록 */
function getActivePlans(projectRoot) {
  const dir = path.join(projectRoot, 'docs', 'exec-plans', 'active');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => f.endsWith('.md'));
}

let data = '';
process.stdin.on('data', chunk => { data += chunk; });
process.stdin.on('end', () => {
  try {
    if (!isGitRepo()) { console.log(data); return; }

    const ktFiles = getEditedKtFiles();
    if (ktFiles.length === 0) { console.log(data); return; }

    const projectRoot = process.env.CLAUDE_PROJECT_ROOT || process.cwd();
    const warnings = [];

    // ── [A] 자기 검증: arch / compile 결과 확인 ────────────────────────────
    const archLog    = readLog(ARCH_LOG);
    const compileLog = readLog(COMPILE_LOG);

    if (archLog && archLog.status === 'error') {
      warnings.push(
        `[PreCompletion] ⛔ [A] ArchUnit 실패 상태 — :${archLog.module} (${archLog.file})`,
        `[PreCompletion]     아키텍처 위반을 수정하지 않으면 완료로 간주하지 마세요.`
      );
    }

    if (compileLog && compileLog.status === 'error') {
      warnings.push(
        `[PreCompletion] ⛔ [A] 컴파일 실패 상태 — :${compileLog.module} (${compileLog.file})`,
        `[PreCompletion]     컴파일 오류를 수정하지 않으면 완료로 간주하지 마세요.`
      );
    }

    // arch 또는 compile 결과가 아직 없으면 (백그라운드 실행 전) — 체크 권장
    if (!archLog && !compileLog && ktFiles.length > 0) {
      warnings.push(
        `[PreCompletion] ℹ️  [A] 편집된 .kt 파일이 있으나 arch/compile 결과 없음`,
        `[PreCompletion]     /arch-test 또는 ./gradlew test 로 검증 후 완료 선언을 권장합니다.`
      );
    }

    // ── [B] exec-plans 업데이트 리마인더 ────────────────────────────────────
    const activePlans = getActivePlans(projectRoot);
    if (activePlans.length > 0) {
      warnings.push(
        `[PreCompletion] 📋 [B] 진행 중인 계획 ${activePlans.length}개가 있습니다:`
      );
      activePlans.forEach(plan => {
        warnings.push(`[PreCompletion]     → ${plan}`);
      });
      warnings.push(
        `[PreCompletion]     현재 세션 작업 내용을 exec-plans 파일에 업데이트했나요?`,
        `[PreCompletion]     ( **상태**, 체크박스, 현재 세션 메모, 다음 세션에서 할 것 )`
      );
    }

    // 경고 출력
    warnings.forEach(w => console.error(w));

  } catch (_) {}

  console.log(data);
});
