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

### 7. 돌아가는 코드 검증 (CRITICAL)

**단위 테스트 통과 ≠ 돌아가는 코드.** 구현 완료 후 반드시 실제 기동 + API 호출로 검증한다.

```
7-1. 환경 충돌 없이 뜨는가?
  - docker-compose up + 애플리케이션 동시 실행 시 포트 충돌 없는가?
  - 실제로 빌드 → 기동 → actuator/health 200 확인

7-2. 검증 스크립트(scripts/verify-api.sh) 작성 + 실행
  - 정상 케이스: 상태 코드 + 응답 바디 확인
  - 에러 케이스: 잘못된 입력 → 400, 없는 리소스 → 404 등
  - 캐시 동작: Redis에 키가 생성/삭제되는지 확인
  - 실패 시 exit 1 → CI에서도 사용 가능
```

이 단계를 건너뛰고 "테스트 통과했으니 완료"라고 선언하지 않는다.

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
