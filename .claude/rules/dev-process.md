# 개발 프로세스

## 흐름
```
설계 ─→ 설계 리뷰(독립) ─→ 구현 계획 ─→ 구현 ─→ 코드 리뷰(독립) ─→ 수정 ─→ 완료
```

## 게이트 규칙
- MUST: **설계 리뷰** 통과 전 구현 계획 작성 금지
- MUST: **코드 리뷰** 통과 전 finishing-branch 금지
- MUST: **API 엔드포인트·Controller·UseCase 변경 시** — finishing-branch 전 smoke-test.sh 실행 필수
- MUST: 자기 검증은 독립 리뷰를 대체하지 못한다
- MUST: 리뷰는 code-reviewer 서브에이전트로 수행한다
- MUST: 변경 순서 — **설계 문서 → 테스트 코드 → 구현** (항상 이 순서)

## API 변경 후 검증 (smoke-test)
- 대상: Controller·UseCase·Request/Response DTO·라우팅·의존성 변경 시 모두 해당
- 경량 검증: `./scripts/verify-api.sh` — API 기동 중이면 즉시 실행 가능 (infra 불필요)
- 전체 검증: `./smoke-test.sh` — Docker infra + Consumer 포함 E2E (Kafka·DB·Redis 포함)
- MUST: smoke-test FAILED 상태로 finishing-branch 금지

## 단계별 명령어

| 단계 | 명령어 | 설명 |
|------|--------|------|
| 0 | (자동) | brainstorming 스킬 → 요구사항 합의 |
| 1 | `/design` | 아키텍처 설계 (failure-design 포함) |
| 2 | (자동) | **설계 리뷰** — design-reviewer 서브에이전트 (독립) |
| 3 | `/plan` | 구현 계획 (writing-plans) |
| 4 | `/tdd` | 구현 (executing-plans) |
| 5 | (자동) | **코드 리뷰** — code-reviewer 서브에이전트 (독립) |
| 5.5 | (자동) | **smoke-test** — API 변경 시 `verify-api.sh` 또는 `smoke-test.sh` |
| 6 | (자동) | 수정 반영 → finishing-a-development-branch |
