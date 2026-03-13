# 시퀀스 다이어그램 품질 체크리스트

작성 완료 후 이 목록을 순서대로 확인한다.

## 전체 아키텍처 (섹션 1)

- [ ] `NR -->|notification INSERT| MySQL` — 라벨 있음
- [ ] `NR -->|outbox INSERT| MySQL` — 라벨 있음 (라벨 없이 동일 노드로 2개 이상 화살표 금지)
- [ ] Redis에 두 방향 화살표 모두 라벨 있음 (조회 캐싱 / 캐시 evict)
- [ ] alarm-batch 모듈 포함 여부 확인 (feature3 이상)

## 발송 시퀀스 (섹션 2)

- [ ] Debezium EventRouter: `aggregate_id → Kafka key`, `payload(JSON) → Kafka value`, `event_type → Kafka header` 명시
- [ ] 일시 실패 분기: `503 (HTTP Retry N회 소진)` — "Retry 소진" 단독 표현 금지
- [ ] HTTP Retry 소진 후 Kafka ErrorHandler 전파 Note 있음
- [ ] CB OPEN 구간 Note: "Consumer pause 상태 → Kafka 적체 → resume 후 일괄 소비"
- [ ] retry 분기 끝에 "섹션 2-1 참조" Note 있음
- [ ] Redis evict 키 패턴: `notification:list:{requesterId}:[20,50,100]` 형식으로 명시

## retry/dead 상세 시퀀스 (섹션 2-1)

- [ ] 섹션 상단 Note에 레이어 순서 ①②③ 명시
  - ① HTTP Retry (max=N, WaitDms) → 예외 throw
  - ② Kafka DefaultErrorHandler → FixedBackOff(Xms, Y회)
  - ③ DeadLetterPublishingRecoverer → dead 토픽
- [ ] `JsonProcessingException` notRetryable 명시
- [ ] dead 토픽 Note에 현재 처리 방식 명시 (예: Kafka UI 수동 확인 / admin API 예정)
- [ ] retry 토픽에서도 Redis 중복 체크 스텝 포함

## 조회 시퀀스 (섹션 3)

- [ ] `retentionStart = today - N일` 계산 스텝 있음 (cursor null / cursor 있음 양쪽)
- [ ] @Cacheable key 전체 패턴: `notification:list:{requesterId}:{size}` 형식
- [ ] condition 명시: `cursor==null`
- [ ] CACHED_SIZES 목록 명시 (예: [20, 50, 100]) — 코드에서 읽은 실제 값

## 파티션 보관 관리 시퀀스 (섹션 4)

- [ ] `createUpcomingPartitions` 실패 시 처리 명시 (log.error / 향후 계획)
- [ ] `purgeExpiredPartitions` 실패 시 처리 명시 (log.error / 향후 계획)
- [ ] try-catch 독립성 Note: "생성 실패해도 삭제는 계속 실행"
- [ ] DROP PARTITION Note: "DELETE보다 빠름, redo log 없음"

## Mermaid 문법

- [ ] 모든 sequenceDiagram에 `autonumber` 있음
- [ ] `-->>` 화살표에 `<br/>` 없음 → 멀티라인은 Note로 분리
- [ ] 설정값이 실제 코드 값과 일치 (retry backoff-ms, max-attempts, CB threshold 등)
