# Coding Style

## 불변성 (CRITICAL)

- MUST 기존 객체를 수정하지 않고 새 객체 생성 (data class copy())
- NEVER 입력 파라미터를 직접 변경하지 않음
- MUST val 사용 우선, var는 반드시 필요한 경우만
- MUST 불변 컬렉션 사용 (List, Set, Map)

## 파일 구성

- MUST 파일 집중성 유지: 200-400줄 기본, 최대 800줄
- MUST 기능/도메인별 정리, 타입(계층)별 아님
- MUST 높은 응집도, 낮은 결합도
- SHOULD 파일이 커지면 유틸리티 분리

## 에러 처리

- MUST 모든 예외를 의미 있는 컨텍스트와 함께 처리
- MUST 사용자 친화적 에러 메시지 제공
- NEVER 예외를 조용히 삼키지 않음
- MUST 디버깅에 충분한 정보와 함께 로깅

## 입력 유효성 검증

- MUST 시스템 경계에서 모든 외부 입력 검증
- MUST 타입 안전 검증 사용 (Bean Validation, require/check)
- NEVER 유효성 검증 없이 사용자 입력 신뢰하지 않음

## 수술적 변경 (Surgical Changes)

- MUST 작업에 필요한 부분만 수정 -- 무관한 개선 금지
- NEVER 작업과 무관한 인접 코드, 주석, 포맷팅 "개선" 금지
- MUST 기존 스타일 유지, 본인이 다르게 하겠더라도
- 변경으로 인한 고아 코드는 제거하되, 기존 데드 코드는 요청 없이 제거하지 않음

## Kotlin 스타일

- data class로 DTO/Value Object 표현
- sealed class/interface로 상태, 에러, 결과 표현
- 확장 함수로 유틸리티 구현
- scope 함수 적절히 활용 (let, run, apply, also)
- when 표현식으로 분기 처리 (sealed class와 함께)

## 코드 품질 체크리스트

작업 완료 전:
- [ ] 가독성 좋고 이름이 적절한가
- [ ] 함수 크기 적정 (<50줄)
- [ ] 파일 크기 적정 (<800줄)
- [ ] 깊은 중첩 없음 (>4단계)
- [ ] 적절한 에러 처리
- [ ] 디버그 구문 없음 (println)
- [ ] 하드코딩 값 없음 (상수/설정 사용)
- [ ] 불변 패턴 사용
