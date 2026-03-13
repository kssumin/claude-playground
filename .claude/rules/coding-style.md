# Coding Style

## 불변성 (CRITICAL)
- MUST: 새 객체 생성 (data class copy()), 입력 파라미터 직접 변경 금지
- MUST: val 우선, var는 반드시 필요한 경우만. 불변 컬렉션 사용

## 파일 구성
- MUST: 200-400줄 기본, 최대 800줄. 높은 응집도, 낮은 결합도

## 에러 처리
- MUST: 의미 있는 컨텍스트와 사용자 친화적 메시지. 외부 입력 파싱(Base64, JSON, 날짜)은 try-catch 필수 → 400
- MUST: 독립 작업이 순차 실행되면 각각 try-catch. 한 작업 실패가 다른 작업을 막지 않음
- NEVER: 예외를 조용히 삼키지 않음

## 설정값 단일 출처
- MUST: 동일 의미의 값이 두 곳 이상에 하드코딩되지 않음. @ConfigurationProperties 한 곳에서 관리
- MUST: 인프라 설정은 기본값이라도 명시적 선언 (코드 = 문서)

## 캐시
- MUST: @Cacheable 키에 조회 결과를 바꾸는 모든 파라미터 포함 (size, filter 등)
- MUST: GenericJackson2JsonRedisSerializer 금지. 타입 지정 직렬화기 사용

## 입력 유효성 검증
- MUST: 시스템 경계에서 모든 외부 입력 검증 (Bean Validation, require/check)

## 수술적 변경
- MUST: 작업에 필요한 부분만 수정. 기존 스타일 유지, 고아 코드만 제거

## 상세 가이드
Kotlin 스타일, 코드 품질 체크리스트는 `coding-style-reference` 스킬을 참조하라.
