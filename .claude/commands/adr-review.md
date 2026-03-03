---
name: adr-review
description: "ADR 문서를 코드베이스와 대조 검증한다. ADR의 모든 주장을 실제 코드, 인프라 설정, 외부 의존성과 비교하여 정합성 리포트를 생성한다. Use when user says /adr-review, ADR 리뷰, ADR 검증."
allowed-tools: ["Read", "Grep", "Glob", "Bash", "Agent", "WebFetch"]
---

# /adr-review - ADR 코드 정합성 검증

ADR 문서의 **모든 주장**을 실제 코드베이스와 대조하여 정합성을 검증한다.

## 입력

사용자가 ADR 파일 경로를 지정하거나, 가장 최근 ADR을 자동 감지한다.
```
/adr-review                          # 최근 ADR 자동 감지
/adr-review docs/adr/ADR-002-*.md   # 특정 ADR 지정
```

## Workflow

```
Phase 1: ADR 파싱 ─────────── 주장 추출 (Silent)
  │
Phase 2: 코드 정합성 검증 ──── 각 주장 vs 실제 코드
  │
Phase 3: 인프라 정합성 검증 ── docker-compose, application.yml, 포트, 네트워크
  │
Phase 4: 수치 검증 ──────────── TPS, 재시도 횟수, 타이밍 계산
  │
Phase 5: 외부 의존성 검증 ──── 외부 서비스/API 소스 코드 직접 확인
  │
Phase 6: 리포트 작성 ────────── docs/adr/{ADR-번호}-review.md
```

---

## Phase 1: ADR 파싱 — 주장 추출

ADR을 읽고 **검증 가능한 주장**을 5개 카테고리로 분류한다.

| 카테고리 | 추출 대상 | 예시 |
|---------|----------|------|
| 코드 구조 | 모듈별 변경사항, 클래스/인터페이스 존재 여부, 의존성 방향 | "domain: 변경 없음", "NotificationSender Port 존재" |
| 데이터 흐름 | 호출 경로, 에러 처리 흐름, 상태 전이 | "SendResult(false) → Kafka DLQ" |
| 인프라 설정 | Docker 서비스, 포트, 환경 변수, 설정 파일 | "sendmock 포트 8081" |
| 수치/성능 | TPS, 재시도 횟수, 타이밍, 용량 | "총 재시도 4회", "Timeout 5초" |
| 외부 의존성 | 외부 API 스펙, 필드 매핑, 응답 형식 | "channelType: SMS/EMAIL/KAKAO/UNKNOWN" |

---

## Phase 2: 코드 정합성 검증

각 코드 구조/데이터 흐름 주장에 대해:

1. **실제 파일 찾기**: Glob/Grep으로 해당 클래스/인터페이스 위치 확인
2. **코드 읽기**: 전체 파일을 읽어 주장과 대조 (diff만으로는 맥락 부족)
3. **호출 경로 추적**: 데이터 흐름 주장은 caller → callee 체인을 실제로 따라감
4. **판정**: OK / 부분 정합(어디가 다른지) / 불일치(실제 코드와 모순)

### 필수 확인 항목

- [ ] ADR이 "변경 없음"이라 한 모듈이 정말 변경 불필요한가
- [ ] Port 인터페이스의 시그니처가 ADR 설계와 맞는가
- [ ] 에러 처리 흐름이 실제 try-catch/throw 체인과 일치하는가
- [ ] 기존 코드의 동작을 ADR이 정확히 이해하고 있는가

---

## Phase 3: 인프라 정합성 검증

**기존 인프라와의 충돌을 반드시 체크한다.**

1. `docker-compose.yml` 읽기: 기존 서비스 목록, 포트 매핑, 네트워크
2. 모든 `application.yml` 읽기: server.port, 외부 서비스 URL, 프로파일
3. 충돌 검사:

| 검사 항목 | 방법 |
|----------|------|
| **포트 충돌** | ADR의 새 서비스 포트 vs 기존 docker-compose ports + application.yml server.port |
| **네트워크 경로** | 호스트에서 구동되는 앱이 Docker 내부 호스트명을 사용하고 있지 않은가 |
| **환경 변수** | 기본값이 실제 환경과 일치하는가 |
| **의존성 순서** | depends_on + healthcheck가 올바른가 |
| **볼륨 충돌** | 기존 named volume과 겹치지 않는가 |

---

## Phase 4: 수치 검증

ADR의 모든 숫자를 **역산 검증**한다.

### 재시도 토폴로지 검증
1. 실제 DefaultErrorHandler 설정 읽기 (FixedBackOff maxAttempts)
2. Kafka DLQ 라우팅 로직 확인 (topic → topic 경로)
3. HTTP Retry 설정 확인 (Resilience4j / Spring Retry)
4. **총 재시도 = Kafka 레벨 × (1 + HTTP 레벨)** 계산 후 ADR과 대조

### 처리량 검증
1. Consumer concurrency 설정 확인
2. 외부 호출 예상 응답 시간 확인
3. **단일 스레드 처리량 = 1 / 평균응답시간** 계산
4. **필요 스레드 = 피크TPS / 단일스레드처리량** 계산
5. `max.poll.records × 최대처리시간 < max.poll.interval.ms` 검증

### 타이밍 검증
- Timeout이 외부 서비스의 최대 지연보다 큰가
- connectTimeout과 readTimeout이 분리되어 있는가
- CB OPEN 대기 시간이 외부 서비스 복구 시간과 맞는가

---

## Phase 5: 외부 의존성 검증

ADR이 참조하는 외부 서비스/API의 **실제 소스 코드를 확인**한다.

1. 외부 레포 clone (또는 WebFetch로 소스 확인)
2. 실제 API 스펙 확인:
   - 엔드포인트, HTTP 메서드
   - 요청/응답 필드 (ADR의 필드 매핑 테이블과 대조)
   - 에러 응답 형식, 상태 코드
   - 설정 가능한 옵션 (실패율, 지연 등)
3. ADR에 없는 필드/기능이 있으면 보고
4. 검증 후 clone한 레포 정리 (`rm -rf`)

---

## Phase 6: 리포트 작성

`docs/adr/{ADR-번호}-review.md` 파일로 작성한다.

### 리포트 구조

```markdown
# {ADR-번호} 리뷰: {제목}

## Review Date / Review Method

## 1. 코드 정합성 검증
### 1.N {카테고리} — {판정}
| ADR 주장 | 실제 코드 | 판정 |

## 2. 발견된 이슈
### CRITICAL → HIGH → MEDIUM → LOW
각 이슈: 현상 + 근거(계산/코드 증거) + 수정 제안

## 3. 내 의견
### 전체 평가 / 잘된 부분 / 보완 필요 부분 / 내가 했을 차이점

## 4. 수정 후 구현 가능 여부
| 조건 | 상태 |

## 5. 이슈 요약 테이블
| 등급 | ID | 항목 | 상태 |

## 부록: 기존 코드베이스에서 발견된 관련 버그 (있으면)
```

### 이슈 등급 기준

| 등급 | 기준 | 예시 |
|------|------|------|
| CRITICAL | 구현 불가능 / 런타임 장애 / 숫자 오류로 아키텍처 전제 붕괴 | 포트 충돌, 처리량 3000배 부족 |
| HIGH | 설계 의도가 코드와 불일치 / 운영 시 문제 발생 | CB 윈도우 과소, timeout 미분리 |
| MEDIUM | 있으면 좋은 개선 / 모니터링 누락 | 메트릭 설계, 프로파일 분리 |
| LOW | 문서 완결성 / 대안 미검토 | metadata 필드, Alternatives 보강 |

---

## 자동 트리거

이 커맨드는 `/design` 완료 후 ADR이 생성되면 자동 제안된다:
```
ADR-{N}이 작성되었습니다. /adr-review로 코드 정합성을 검증할까요?
```
