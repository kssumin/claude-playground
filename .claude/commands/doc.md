---
name: doc
description: "중요한 결정·설계 고민·지식을 .md 파일로 강제 기록한다. 대화에서 소멸되는 지식을 방지. Use when user says /doc, 문서화, 기록해줘, 정리해줘, wiki에 적을건데, 문서로 남겨줘."
allowed-tools: ["Read", "Write", "Edit", "Grep", "Glob", "AskUserQuestion"]
---

# /doc — 지식 소멸 방지, 강제 문서화

> 대화에서 논의된 중요한 내용을 .md 파일로 즉시 기록한다.

## Usage

```
/doc                              # 현재 대화에서 기록할 내용 자동 감지
/doc "CB threshold 45% 결정 근거"  # 특정 주제 명시
/doc decisions                    # 기록된 결정 목록 조회
/doc considerations               # 설계 고민 포인트 목록 조회
```

---

`doc-enforce` 스킬을 실행한다.
