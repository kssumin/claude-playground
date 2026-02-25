# Context Engineering

## Rules 작성 원칙
- **max 30줄**: 원칙(MUST/NEVER/SHOULD)만 포함, 코드 템플릿/예시 금지
- **레퍼런스는 Skill로**: 코드 예시, 템플릿, 상세 가이드는 skill로 분리
- **globs 활용**: 특정 파일 타입에만 관련된 rule은 frontmatter에 `globs` 명시

## Skill 작성 원칙
- **자기 완결적**: skill 하나로 작업 완료 가능하도록 충분한 컨텍스트 포함
- **on-demand**: 호출될 때만 로드됨 — 코드 템플릿, 예시, 상세 가이드 여기에
- **YAML frontmatter**: name + description 필수 (검색/라우팅에 사용)

## Memory 원칙
- **decisions.jsonl**: 결정 기록 (대안, 선택 이유, 기각 사유) — append-only
- **failures.jsonl**: 실패 기록 (근본 원인, 예방책) — append-only
- **MEMORY.md**: 프로젝트 상태, 사용자 선호 — 편집 가능 (200줄 이내)
- **판단 기록**: "무엇을"뿐 아니라 "왜, 어떤 대안을 기각했는지" 반드시 포함

## Progressive Disclosure
- **1홉**: CLAUDE.md → rule/skill 이름 + 한줄 설명 (라우팅 테이블)
- **2홉**: rule → 원칙 / skill → 상세 레퍼런스
- **Rules 총량 목표**: 전체 rules 합산 500줄 이내
- **새 rule 추가 전**: 기존 rule에 통합 가능한지 먼저 검토

## 자동 헬스체크 트리거
.claude/rules/ 또는 .claude/skills/ 파일을 **생성·수정·삭제**한 뒤 반드시:
1. `wc -l .claude/rules/*.md | tail -1` → 500줄 초과 시 BLOCK
2. 30줄 초과 rule이 있으면 → skill 분리 필요 경고
3. CLAUDE.md 라우팅 테이블에 등록 누락이면 → 경고
상세 체크리스트와 스크립트는 `context-engineering` 스킬을 참조하라.