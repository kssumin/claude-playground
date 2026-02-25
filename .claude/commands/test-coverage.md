---
name: test-coverage
description: "Analyze test coverage and generate missing tests"
allowed-tools: ["Read", "Write", "Edit", "Bash", "Grep", "Glob"]
---

# /test-coverage - 테스트 커버리지

## Workflow
1. 커버리지 측정
```bash
./gradlew jacocoTestReport
```
2. 80% 미달 영역 식별
3. 누락 테스트 생성
4. 재측정으로 확인

## Coverage Requirements
- 전체: 80%+
- 금융/보안 코드: 100%
- domain 모듈: 90%+ 목표
