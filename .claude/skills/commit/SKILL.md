---
name: commit
description: Git commit with conventional commit format. No co-author, no body. Title only.
---

# Git Commit 규칙

## 커밋 메시지 형식

**제목 한 줄만. Body 없음. Co-Authored-By 없음.**

```
{type}: {간결한 설명}
```

## Type

| type | 설명 |
|------|------|
| `feat` | 새로운 기능 추가 |
| `fix` | 버그 수정 |
| `refactor` | 리팩토링 (기능 변경 없음) |
| `test` | 테스트 추가/수정 |
| `docs` | 문서 변경 |
| `chore` | 빌드, 설정, 의존성 변경 |
| `style` | 코드 포맷팅 (기능 변경 없음) |
| `perf` | 성능 개선 |

## 규칙

1. **제목은 50자 이내** (한글 기준 25자 이내)
2. **한국어로 작성**
3. **마침표 없음**
4. **명령형** (추가, 수정, 변경 등)
5. **Co-Authored-By 절대 추가하지 않음**
6. **Body 절대 추가하지 않음**

## 예시

```bash
# GOOD
git commit -m "feat: 주문 생성 API 추가"
git commit -m "fix: 주문 상태 변경 시 동시성 이슈 수정"
git commit -m "refactor: OrderService UseCase 분리"
git commit -m "test: 주문 취소 도메인 테스트 추가"
git commit -m "chore: Redis 의존성 추가"
git commit -m "docs: ADR-003 캐시 전략 작성"

# BAD - body 있음
git commit -m "feat: 주문 생성 API 추가

상세 설명..."

# BAD - Co-Authored-By 있음
git commit -m "feat: 주문 생성 API 추가

Co-Authored-By: ..."

# BAD - 영어
git commit -m "feat: add order creation API"

# BAD - 너무 김
git commit -m "feat: 주문 생성 API를 추가하고 관련 테스트 및 문서를 작성하고 리팩토링도 함"
```

## 커밋 단위

- **하나의 커밋 = 하나의 논리적 변경**
- 여러 파일이라도 같은 변경 목적이면 하나의 커밋
- 다른 목적의 변경은 분리 (feat + test를 같이 하지 않음)
