---
name: build-fix
description: "Incrementally fix build and compile errors"
allowed-tools: ["Read", "Write", "Edit", "Bash", "Grep", "Glob"]
---

# /build-fix - 빌드 오류 수정

> 복잡한 에러는 `systematic-debugging` superpowers 스킬을 활용한다.

## Workflow
1. `./gradlew build` 실행
2. 에러 파싱 (모듈별 분류)
3. 의존성 순서대로 수정: common → domain → infra → app-*
4. 최소 변경으로 수정
5. 재빌드 검증

## Build Commands
```bash
./gradlew build                    # 전체 빌드
./gradlew compileKotlin            # 컴파일만
./gradlew :xxx-domain:build        # 특정 모듈
./gradlew clean build              # 클린 빌드
```

## Principles
- 에러 수정만, 리팩토링 금지
- 최소 diff
- 아키텍처 변경 금지
