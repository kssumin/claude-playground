---
name: coding-style-reference
description: Kotlin 코딩 스타일 상세 레퍼런스. Kotlin 스타일 가이드(data class, sealed class, 확장 함수, scope 함수, when 표현식), 코드 품질 체크리스트 포함. 코드 작성/리뷰 시 참조.
---

# Coding Style 레퍼런스

## Kotlin 스타일 가이드

### DTO/Value Object
- data class로 표현
- copy()로 불변 변경

### 상태/에러/결과 표현
- sealed class/interface 활용
- when 표현식으로 분기 처리 (sealed class와 함께)

### 유틸리티
- 확장 함수로 구현
- scope 함수 적절히 활용:
  - `let`: null 체크 후 변환
  - `run`: 객체 설정 후 결과 반환
  - `apply`: 객체 초기화 (Builder 패턴 대체)
  - `also`: 부수 효과 (로깅 등)

## 코드 품질 체크리스트

작업 완료 전 반드시 확인:
- [ ] 가독성 좋고 이름이 적절한가
- [ ] 함수 크기 적정 (<50줄)
- [ ] 파일 크기 적정 (<800줄)
- [ ] 깊은 중첩 없음 (>4단계)
- [ ] 적절한 에러 처리
- [ ] 디버그 구문 없음 (println)
- [ ] 하드코딩 값 없음 (상수/설정 사용)
- [ ] 불변 패턴 사용