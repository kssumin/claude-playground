const fs = require('fs');
const path = require('path');
const { getClaudeDir, readFile, commandExists } = require('./utils');

const PROJECT_TYPES = {
  docker: {
    name: 'docker', description: 'Docker Compose 프로젝트',
    devCommand: 'docker-compose up -d', requiresTmux: false,
    detectFiles: ['docker-compose.yml', 'docker-compose.yaml', 'compose.yml', 'compose.yaml']
  },
  gradle: {
    name: 'gradle', description: 'Gradle 프로젝트 (Spring Boot)',
    devCommand: './gradlew bootRun', requiresTmux: true,
    detectFiles: ['build.gradle.kts', 'build.gradle', 'settings.gradle.kts', 'settings.gradle']
  },
  maven: {
    name: 'maven', description: 'Maven 프로젝트',
    devCommand: './mvnw spring-boot:run', requiresTmux: true,
    detectFiles: ['pom.xml']
  }
};

const DETECTION_PRIORITY = ['docker', 'gradle', 'maven'];

function loadProjectConfig(projectDir = process.cwd()) {
  const content = readFile(path.join(projectDir, '.claude', 'config.json'));
  if (content) { try { return JSON.parse(content); } catch { return null; } }
  return null;
}

function loadGlobalConfig() {
  const content = readFile(path.join(getClaudeDir(), 'xed-config.json'));
  if (content) { try { return JSON.parse(content); } catch { return null; } }
  return null;
}

function detectProjectType(projectDir = process.cwd()) {
  for (const typeName of DETECTION_PRIORITY) {
    const type = PROJECT_TYPES[typeName];
    for (const file of type.detectFiles) {
      if (fs.existsSync(path.join(projectDir, file))) return typeName;
    }
  }
  return null;
}

function isDockerProject(projectDir = process.cwd()) {
  return PROJECT_TYPES.docker.detectFiles.some(f => fs.existsSync(path.join(projectDir, f)));
}

function isGradleProject(projectDir = process.cwd()) {
  return PROJECT_TYPES.gradle.detectFiles.some(f => fs.existsSync(path.join(projectDir, f)));
}

function getProjectInfo(projectDir = process.cwd()) {
  const projectConfig = loadProjectConfig(projectDir);
  const globalConfig = loadGlobalConfig();
  const detectedType = detectProjectType(projectDir);
  return {
    type: detectedType,
    typeInfo: detectedType ? PROJECT_TYPES[detectedType] : null,
    isDocker: isDockerProject(projectDir),
    isGradle: isGradleProject(projectDir),
    config: { ...globalConfig, ...projectConfig }
  };
}

function shouldRecommendTmux(command, projectDir = process.cwd()) {
  const info = getProjectInfo(projectDir);
  if (info.config && info.config.requireTmux === false) return { recommend: false, reason: 'config' };
  if (process.env.TMUX) return { recommend: false, reason: 'already-in-tmux' };
  if (info.isDocker) return { recommend: false, reason: 'docker', suggestion: 'Docker 프로젝트입니다. docker-compose up -d 사용을 권장합니다.' };
  if (/docker|docker-compose|podman/.test(command)) return { recommend: false, reason: 'docker-command' };
  if (/gradlew bootRun|mvnw spring-boot:run/.test(command)) {
    return { recommend: true, reason: 'dev-server', suggestion: `장시간 실행 명령입니다. tmux 사용을 권장합니다.\ntmux new-session -d -s dev "${command}"` };
  }
  return { recommend: false, reason: 'not-long-running' };
}

function getRecommendedDevCommand(projectDir = process.cwd()) {
  const info = getProjectInfo(projectDir);
  if (info.isDocker) return 'docker-compose up -d';
  if (info.isGradle) return './gradlew bootRun';
  return null;
}

module.exports = {
  PROJECT_TYPES, detectProjectType, isDockerProject, isGradleProject,
  getProjectInfo, shouldRecommendTmux, getRecommendedDevCommand,
  loadProjectConfig, loadGlobalConfig
};
