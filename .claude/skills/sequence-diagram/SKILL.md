---
name: sequence-diagram
description: >
  알림 시스템의 Mermaid 시퀀스 다이어그램을 생성한다.
  발송 흐름(Outbox→CDC→Kafka→Consumer→외부API), 조회 흐름(Cursor 페이징+Redis 캐시),
  파티션 보관 관리(RetentionScheduler), 전체 아키텍처를 포함한다.
  Use when user says "시퀀스 다이어그램", "sequence diagram", "다이어그램 그려줘",
  "다이어그램 작성", "/sequence-diagram", "docs/sequence-diagram.md 업데이트",
  or after major feature branch merges that change data flow.
---

# 시퀀스 다이어그램 생성 스킬

## Step 1: 대상 브랜치 확인

작업할 브랜치를 확인한다.

```bash
git branch --show-current
git log main..HEAD --oneline          # main 대비 추가된 커밋
git diff main...HEAD --name-only      # 변경된 파일 목록
```

변경 파일을 보고 **어떤 다이어그램이 영향받는지** 판단한다.

| 변경 위치 | 영향받는 다이어그램 |
|---------|----------------|
| Controller / UseCase / Service | 발송 시퀀스, 조회 시퀀스 |
| KafkaConfig / Consumer | 발송 시퀀스, retry/dead 시퀀스 |
| infra/cache | 조회 시퀀스 |
| batch / RetentionManager | 파티션 보관 관리 시퀀스 |
| docker-compose / init.sql | 전체 아키텍처 |

## Step 2: 코드 탐색

영향받는 다이어그램에 필요한 파일을 읽는다.

**항상 확인할 파일**
- `alarm-consumer/src/main/resources/application.yml` — retry-backoff-ms, max-retry-attempts, CB 설정값
- `alarm-infra/src/main/kotlin/.../kafka/KafkaConfig.kt` — ErrorHandler, FixedBackOff, notRetryableExceptions
- `alarm-client-external/.../ResilienceConfig.kt` — CB threshold, sliding-window, Retry max-attempts

**조회 시퀀스 관련**
- `alarm-api/.../usecase/NotificationUseCase.kt` — @Cacheable condition, cache key, evict 전략, CACHED_SIZES

**파티션 관련**
- `alarm-infra/.../NotificationRetentionManagerImpl.kt` — REORGANIZE / DROP 로직
- `alarm-batch/.../RetentionScheduler.kt` — cron, try-catch 분리 여부
- `alarm-infra/.../RetentionProperties.kt` — days 설정

## Step 3: 다이어그램 작성

`docs/sequence-diagram.md`에 작성한다. 섹션 구성:

```
## 1. 전체 시스템 아키텍처        (graph TD)
## 2. 알림 발송 시퀀스            (sequenceDiagram, retry 압축)
## 2-1. retry / dead 상세 시퀀스  (retry 레이어 순서 명시)
## 3. 알림 조회 시퀀스            (cursor + 캐시)
## 4. 파티션 보관 관리 시퀀스     (RetentionScheduler)
```

작성 규칙은 `references/diagram-rules.md` 참조.

## Step 4: 자가 검증

작성 후 `references/quality-checklist.md`의 체크리스트를 순서대로 확인한다.
모든 항목 통과 후 완료 선언한다.

## 관련 스킬

| 스킬 | 용도 |
|------|------|
| `write-strategy-doc` | 설계 결정 문서화 |
| `adr-review` | 다이어그램과 실제 코드 정합성 검증 |
| `kafka-patterns` | Kafka 설정값 판단 기준 |
| `spring-cache` | Redis 캐시 패턴 참조 |
