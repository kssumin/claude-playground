---
name: tdd
description: "Test-Driven Development workflow"
allowed-tools: ["Read", "Write", "Edit", "Bash", "Grep", "Glob"]
---

# /tdd - TDD 워크플로우

> `test-driven-development` superpowers 스킬을 함께 활용한다.

## Workflow

### 0. 사전 확인
- 구현 계획(plan)이 있는가? 없으면 `/plan` 먼저
- 어떤 모듈의 어떤 기능을 구현하는가?

### 1. 인터페이스 정의
- domain Port 인터페이스 설계
- Command/Query 객체 설계

### 2. 테스트 먼저 작성 (RED)
```bash
./gradlew :xxx-domain:test  # 모듈 단위 실행 (빠른 피드백)
```

### 3. 최소 구현 (GREEN)
```bash
./gradlew :xxx-domain:test  # 통과 확인
```

### 4. 리팩토링 (IMPROVE)
- 중복 제거, 네이밍 개선
- 테스트 재실행으로 검증

### 5. 다음 레이어 반복
모듈별 안에서 밖으로:
```
domain (단위 테스트) → infra (통합 테스트) → app-api (슬라이스 테스트)
```
각 레이어에서 2→3→4 반복

### 6. 커버리지 확인
```bash
./gradlew jacocoTestReport
# 80%+ 필수
```

## 속도 팁
- **모듈 단위 테스트 실행**: `./gradlew :모듈:test`가 전체 빌드보다 훨씬 빠름
- **독립 모듈 병렬**: domain 테스트와 client-external 테스트는 동시 실행 가능
- **실패 테스트만 재실행**: `./gradlew test --tests "*.FailingTest"`

## Test Framework
- JUnit 5 + MockK + AssertJ
- @DataJpaTest + Testcontainers (infra)
- @WebMvcTest + MockMvc (app-api)

## Best Practices
- 테스트명: 백틱으로 행위 설명
- AAA 패턴 (Arrange-Act-Assert)
- 하나의 테스트에 하나의 개념
