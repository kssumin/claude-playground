#!/usr/bin/env node
const { shouldRecommendTmux, isDockerProject, getProjectInfo } = require('../lib/build-manager');
const { log } = require('../lib/utils');

let data = '';
process.stdin.on('data', chunk => { data += chunk; });
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(data);
    const command = input.tool_input?.command || '';
    const projectDir = process.cwd();
    const result = shouldRecommendTmux(command, projectDir);
    if (result.suggestion) log(`[Hook] ${result.suggestion}`);
    if (result.reason === 'docker' && isDockerProject(projectDir)) {
      const info = getProjectInfo(projectDir);
      if (info.isGradle) log('[Hook] 또는 docker-compose logs -f 로 로그를 확인할 수 있습니다.');
    }
    console.log(data);
  } catch (err) { console.log(data); }
});
