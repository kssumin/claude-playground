#!/usr/bin/env node
/**
 * Domain Purity Check Hook (PostToolUse)
 *
 * project-context.md의 "domain:" 항목에서 도메인 모듈명을 읽어,
 * 해당 모듈의 .kt 파일 편집 시 Spring infra 임포트를 즉시 감지한다.
 * 위반 시 에이전트 컨텍스트에 교정 메시지를 즉시 주입.
 *
 * 범용 동작: project-context.md가 없거나 domain 항목이 없으면 조용히 통과.
 *
 * 금지 임포트 기준:
 *   - org.springframework.data.jpa / jakarta.persistence  → JPA는 infra 모듈에
 *   - org.springframework.kafka                           → Kafka는 infra/consumer에
 *   - org.springframework.boot                            → Boot 자동설정은 app 모듈에
 *   - org.springframework.web                             → Web은 app 모듈에
 *   - org.springframework.data.redis                      → Redis는 infra 모듈에
 */
const fs = require('fs');
const path = require('path');

const FORBIDDEN_IMPORTS = [
  { pattern: /^import\s+org\.springframework\.data\.jpa/m,    hint: 'JPA → infra 모듈 (Repository 구현체)' },
  { pattern: /^import\s+jakarta\.persistence\./m,              hint: 'JPA Entity 어노테이션 → infra 모듈' },
  { pattern: /^import\s+org\.springframework\.kafka/m,         hint: 'Kafka → infra 또는 consumer 모듈' },
  { pattern: /^import\s+org\.springframework\.boot/m,          hint: 'Spring Boot 설정 → app 또는 infra 모듈' },
  { pattern: /^import\s+org\.springframework\.web/m,           hint: 'Spring Web → app 모듈' },
  { pattern: /^import\s+org\.springframework\.data\.redis/m,   hint: 'Redis → infra 모듈' },
  { pattern: /^import\s+org\.springframework\.data\.mongodb/m, hint: 'MongoDB → infra 모듈' },
];

/**
 * project-context.md에서 domain 모듈 디렉터리명을 읽는다.
 * 예: "domain: alarm-domain"        → "alarm-domain"
 * 예: "domain: my-domain (port: N/A)" → "my-domain"
 */
function getDomainModule(projectRoot) {
  const contextPath = path.join(projectRoot, '.claude', 'project-context.md');
  if (!fs.existsSync(contextPath)) return null;
  const content = fs.readFileSync(contextPath, 'utf8');
  const match = content.match(/^domain:\s*([^\s(#\n]+)/m);
  return match ? match[1].trim() : null;
}

let input = '';
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const filePath = data.tool_input?.file_path || '';

    if (!filePath.endsWith('.kt')) {
      process.stdout.write(input);
      return;
    }

    const projectRoot = process.env.CLAUDE_PROJECT_ROOT || process.cwd();
    const domainModule = getDomainModule(projectRoot);

    // project-context.md에 domain 항목이 없으면 조용히 통과
    if (!domainModule) {
      process.stdout.write(input);
      return;
    }

    // domain 모듈 경로가 아니면 통과
    if (!filePath.includes(`/${domainModule}/`)) {
      process.stdout.write(input);
      return;
    }

    if (!fs.existsSync(filePath)) {
      process.stdout.write(input);
      return;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const violations = [];

    for (const { pattern, hint } of FORBIDDEN_IMPORTS) {
      const match = content.match(pattern);
      if (match) {
        violations.push({ line: match[0].trim(), hint });
      }
    }

    if (violations.length > 0) {
      const relativePath = filePath.split(`/${domainModule}/`).pop();
      console.error(`[ArchDomain] ⛔ domain 순수성 위반 — ${domainModule}/${relativePath}`);
      console.error(`[ArchDomain] ${domainModule}은 순수 Kotlin + Spring stereotype(@Service, @Transactional)만 허용`);
      console.error('[ArchDomain] 위반 임포트:');
      violations.forEach(v => {
        console.error(`  ✗ ${v.line}`);
        console.error(`    → ${v.hint}`);
      });
      console.error('[ArchDomain] 위반 임포트를 제거하고 해당 로직을 올바른 모듈로 이동하세요.');
    }

    process.stdout.write(input);
  } catch (e) {
    process.stdout.write(input);
  }
});
