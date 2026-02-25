# 보안 가이드라인

## 필수 보안 체크 (커밋 전)

- [ ] 하드코딩 비밀 없음 (API 키, 비밀번호, 토큰)
- [ ] 모든 사용자 입력 검증됨
- [ ] SQL Injection 방지 (파라미터화 쿼리)
- [ ] CSRF 보호 활성화
- [ ] 인증/인가 검증됨
- [ ] Rate Limiting 적용
- [ ] 에러 메시지에 민감 데이터 노출 없음

## 비밀 관리

```kotlin
// NEVER: 하드코딩
val apiKey = "sk-proj-xxxxx"

// ALWAYS: 환경 변수 / Spring 설정
@Value("\${external.api.key}")
private lateinit var apiKey: String
```

## 보안 이슈 대응

1. 즉시 중단
2. **security-reviewer** agent 사용
3. CRITICAL 이슈 즉시 수정
4. 노출된 비밀 교체
5. 유사 이슈 전체 코드베이스 검토
