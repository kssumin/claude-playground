# 설계 원칙

`/design` 수행 시 이 원칙들을 기준으로 설계를 평가한다.

## 도메인 모델링
- MUST: Rich Domain Model — Entity가 상태 변경 규칙 직접 관리, Service는 조율만
- MUST: Aggregate 설계 — 1트랜잭션=1Aggregate, Root만 노출, ID 참조, 작게 유지
- MUST: Value Object 적극 활용 — 원시값 대신 의미 있는 타입 (Money, Email)

## Port 설계
- MUST: 도메인 관점으로 정의 (OrderRepository, NOT OrderJpaRepository)
- MUST: 인터페이스 분리 (ISP) — 역할별 Port 분리

## API 설계
- MUST: 자원 중심 (`POST /api/v1/orders`, NOT `POST /api/v1/createOrder`)
- MUST: 상태 코드 일관성 (201 생성, 200 조회/수정, 400/401/403/404/409 에러)

## 데이터 모델
- MUST: 인덱스는 쿼리 패턴에서 역산
- MUST: 기본은 정규화, 성능 병목 증명 후 비정규화
- SHOULD: Soft Delete 사용 전 3가지 질문 (쿼리 누락, UNIQUE 충돌, 개인정보 규정)

## 설계 제안 근거
- MUST: 설계/패턴 제안 시 **공식 문서 링크** 함께 제시. 근거 없는 "권장" 제안 금지
- MUST: 라이브러리 사용 패턴(순서, 조합, 설정)은 공식 docs 기준으로 검증 후 제안

## 설계 결정 사고 순서
1. 가장 단순한 해법은? (YAGNI) → 2. 한계는? (규모 추정) → 3. 트레이드오프? → 4. 가역성?

## 상세 가이드
안티패턴 테이블, BAD/GOOD 코드 예시, 상태 코드 테이블, ISP 예시는 `design-principles-reference` 스킬을 참조하라.
