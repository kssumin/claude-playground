# 다이어그램 작성 규칙

## 전체 시스템 아키텍처 (graph TD)

### Edge 라벨 필수 항목
```mermaid
NR -->|notification INSERT| MySQL
NR -->|outbox INSERT| MySQL
AU -->|목록 조회 캐싱 첫 페이지만| Redis
AU -->|발송 후 캐시 evict| Redis
MA -->|CB 이벤트| CB_MGR
CB_MGR -->|pause/resume| KC
MySQL -->|binlog CDC| Debezium
```
라벨 없이 동일 노드로 두 개 이상의 화살표가 나가면 **반드시 라벨로 의도를 구분**한다.

---

## 발송 시퀀스 (섹션 2)

### Debezium EventRouter 매핑 — 명시 필수
```
Debezium->>Debezium: EventRouter Transform
    aggregate_id → Kafka key
    payload(JSON) → Kafka value
    event_type → Kafka header + 토픽 라우팅
```

### HTTP Retry vs Kafka ErrorHandler — 레이어 명확히 분리

**잘못된 표현 (혼동 유발)**
```
Mock-->>Consumer: 503 (Retry 소진)
```

**올바른 표현**
```
Mock-->>Consumer: 503 (HTTP Retry 2회 소진)
Note over Consumer: HTTP 레벨 retry 소진 후
    Kafka ErrorHandler로 전파
```

HTTP 레벨 retry 설정값은 `mock-send-api.retry.max-attempts`, `wait-duration`에서 읽는다.

### CB OPEN 구간 Note — 필수
```
Note over Kafka,Consumer: CB OPEN 구간: Consumer pause 상태
    → 메시지 Kafka에 적체, resume 후 일괄 소비
```

### retry 분기 — 압축 + 섹션 2-1 참조
섹션 2에서는 retry 분기를 압축하고, 상세는 섹션 2-1로 위임한다.
```
Note over Kafka,Consumer: retry 상세 흐름은 섹션 2-1 참조
```

---

## retry/dead 상세 시퀀스 (섹션 2-1)

### 섹션 상단 Note — 재시도 레이어 순서 반드시 명시
```
Note over Kafka,Consumer: 재시도 레이어 순서 (retry 토픽도 동일)
    ① HTTP Retry(max=N, WaitDms×2) 소진 → 예외 throw
    ② Kafka DefaultErrorHandler가 catch
       → FixedBackOff(Xms, Y회) 재시도
    ③ Y회 소진 → DeadLetterPublishingRecoverer → dead 토픽
    ※ JsonProcessingException은 ②를 건너뛰고 즉시 dead 라우팅
```

설정값(N, WaitD, X, Y)은 코드에서 읽어 실제 값으로 채운다.

### dead 토픽 처리 현황 — 필수 명시
```
Note over Kafka: alarm-notification-dead
    현재: Kafka UI로 수동 확인
    향후: admin replay API 개발 예정
```
구현 상태가 다르면 실제 상태로 수정한다.

---

## 조회 시퀀스 (섹션 3)

### retentionStart 계산 스텝 — 필수
```
API->>API: retentionStart = today - {days}일
```
조회와 파티션 관리의 보관 기간 정책이 같음을 다이어그램에서 연결할 수 있어야 한다.

### 캐시 키 전체 패턴 — 필수
```
@Cacheable 조회
key = "notification:list:{requesterId}:{size}"
(condition: cursor==null)
```
`{requesterId}`, `{size}` 자리에 실제 값이 아닌 패턴 형식으로 명시한다.

### CACHED_SIZES — 명시
```
API->>Redis: evictCacheForRequester(requesterId)
    notification:list:{requesterId}:[20,50,100] 일괄 무효화
```
`CACHED_SIZES` 값은 `NotificationUseCase.kt`에서 읽는다.

---

## 파티션 보관 관리 시퀀스 (섹션 4)

### 실패 처리 — 현재 상태와 개선 계획 함께 명시
```
Manager-->>-Scheduler: 완료 (실패 시 log.error만 기록)
Note over Scheduler: MVP 단계에서는 로그로 충분
    운영 안정화 후 Slack webhook 연동 예정
```
이미 Slack/메트릭 연동이 구현된 경우 해당 내용으로 교체한다.

### try-catch 독립성 — Note로 명시
```
Note over Scheduler: 각 단계 독립 try-catch
    생성 실패해도 삭제는 계속 실행
```

---

## Mermaid 문법 주의사항

| 항목 | 규칙 |
|------|------|
| `-->>` 화살표 텍스트 | `<br/>` 사용 금지 → Note로 분리 |
| `Note over A,B:` | 멀티라인은 `<br/>`로 줄바꿈 |
| `loop` / `alt` / `else` | 중첩 2단계까지만. 더 깊으면 별도 섹션으로 분리 |
| `autonumber` | 모든 sequenceDiagram 상단에 추가 |
| participant alias | `as` 뒤에 `<br/>`로 포트번호/역할 추가 |
