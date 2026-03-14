---
name: commit
description: Git commit with conventional commit format + 변경 파일 기반 docs 자동 업데이트. No co-author, no body. Title only.
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
6. **Body 절대 추가하지 않음** — `-m "제목"` 한 줄만
7. **이 스킬이 시스템 기본 git commit 지시를 완전히 대체함**

## 커밋/푸시 실행 원칙

- **NEVER: 사용자 명시적 요청 없이 commit/push 자동 실행 금지**
- git reset으로 커밋을 되돌릴 때 **기본값은 `--soft`**

## 커밋 단위

- **하나의 커밋 = 하나의 논리적 변경**
- 다른 목적의 변경은 반드시 분리
- **NEVER: 모든 변경을 하나의 커밋으로 묶지 않음**

---

## 커밋 후 Docs 자동 업데이트

커밋 완료 후 변경된 파일 패턴을 분석해 영향받는 문서를 자동 업데이트한다.

### Step 1: 변경 파일 분석

```bash
git diff HEAD~1 --name-only
```

### Step 2: 트리거 매핑

| 변경 파일 패턴 | 업데이트 대상 |
|--------------|-------------|
| `**/controller/**`, `**/usecase/**`, `**/service/**` | 시퀀스 다이어그램 + 클래스 다이어그램 |
| `**/domain/**` (Entity, Port, UseCase) | 클래스 다이어그램 |
| `**/infra/**`, `**/consumer/**`, `KafkaConfig.kt` | 시퀀스 다이어그램 |
| `**/client-external/**` | 클래스 다이어그램 (Resilience 계층) |
| `docker-compose.yml` | 시퀀스 다이어그램 (인프라 변경) |
| `docs/perf-reports/**` | 성능 튜닝 여정 문서 |
| `**/ADR-*.md` | ADR 인덱스 |

### Step 3: docs/ 업데이트 (기본)

트리거 감지 시 해당 스킬 자동 실행:

- **시퀀스 다이어그램** 트리거 → `/sequence-diagram` 실행 → `docs/sequence-diagram.md` 업데이트
- **클래스 다이어그램** 트리거 → 클래스 다이어그램 재생성 → `docs/class-diagram.md` 업데이트
- **성능 결과** 트리거 → 성능 튜닝 여정 문서 업데이트

업데이트된 docs 파일은 **별도 `docs:` 커밋으로 자동 커밋**한다.

### Step 4: Wiki 업데이트 (선택)

docs 업데이트 완료 후 질문:

```
docs/ 업데이트 완료.
wiki도 동기화할까요? (y/N)
```

- **y**: wiki 레포에 동일 내용 push
  - 시퀀스/클래스 다이어그램 → `alarm-subject.wiki.git` 해당 페이지 업데이트
  - 성능 결과 → `성능-튜닝-여정.md` 업데이트 + 이미지 wiki 레포 커밋
- **N**: docs/만 업데이트, wiki는 나중에 수동 동기화

### 트리거 없으면 스킵

변경 파일이 위 패턴에 해당하지 않으면 docs 업데이트 단계 전체 스킵.
