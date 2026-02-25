# Gradle 멀티모듈

## 핵심 원칙
- MUST: Kotlin DSL (`.gradle.kts`) 사용
- MUST: 의존성 버전은 Version Catalog (`libs.versions.toml`)로 중앙 관리
- MUST: 루트에서 공통 설정, 각 모듈에서 개별 설정
- MUST: 라이브러리 모듈은 `bootJar { enabled = false }` + `jar { enabled = true }`
- MUST: domain/build.gradle.kts에 Spring 관련 의존성 추가 시 코드 리뷰 BLOCK
- SHOULD: `implementation` 우선, `api`는 최소화
- NEVER: `runtimeOnly` 대상을 `implementation`으로 올리지 않음

## 상세 가이드
템플릿(settings.gradle.kts, libs.versions.toml, 모듈별 build.gradle.kts)은 `gradle-reference` 스킬을 참조하라.