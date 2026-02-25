# 모니터링 & 관측성

## 핵심 원칙
- MUST: 3 Pillars — Metrics(Micrometer+Prometheus), Logging(SLF4J+Logback), Tracing(Zipkin)
- MUST: 구조화 로깅 (JSON), MDC에 requestId/userId 설정
- MUST: 로그 레벨 — ERROR(즉시대응), WARN(모니터링), INFO(비즈니스이벤트), DEBUG(개발)
- MUST: 모든 비즈니스 이벤트는 INFO, 에러는 stack trace 포함
- MUST: 민감 정보(비밀번호, 토큰, 카드번호) 마스킹 필수
- NEVER: println 사용 금지 (logger 사용)
- NEVER: 프로덕션에서 DEBUG 레벨 활성화 금지
- NEVER: 개인정보(이메일, 전화번호) 평문 로깅 금지

## 상세 가이드
Actuator 설정, Logback XML, MDC Filter, 커스텀 Metrics, Health Check 코드는 `observability-reference` 스킬을 참조하라.
