---
name: upload-img
description: "이미지를 GitHub 저장소에 업로드하고 raw URL을 반환한다. Use when user says '/upload-img', '이미지 올려줘', 'PNG 업로드', or wants to upload performance test result images to GitHub."
---

# upload-img

이미지를 GitHub 저장소에 업로드하고 `raw.githubusercontent.com` URL을 반환한다.

## 사전 조건

`.env` 파일에 `GITHUB_TOKEN` 설정 필요:
```bash
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
```

토큰 권한: **Contents → Read and Write** (Fine-grained PAT 기준)

## 사용법

```
/upload-img <이미지파일> [저장경로]
```

## 실행 단계

1. 인자 파싱
   - `<이미지파일>`: 필수. 로컬 파일 경로
   - `[저장경로]`: 선택. 생략 시 `perf-results/YYYY-MM-DD/<파일명>` 자동 생성

2. 스크립트 실행
```bash
./scripts/upload-img.sh <이미지파일> [저장경로]
```

3. 출력에서 마크다운 URL 추출 후 사용자에게 전달

## 예시

```bash
# 자동 경로
./scripts/upload-img.sh docs/perf-reports/2026-03-12-action-E2-2b/api-response-time.png

# 경로 직접 지정
./scripts/upload-img.sh grafana.png perf-results/E2-2b/grafana.png
```

**출력:**
```
완료
  URL: https://raw.githubusercontent.com/kssumin/alarm/main/perf-results/...

  마크다운:
  ![api-response-time](https://raw.githubusercontent.com/kssumin/alarm/main/...)
```

## 오류 대응

| 오류 | 원인 | 해결 |
|------|------|------|
| `GITHUB_TOKEN이 설정되지 않았습니다` | .env 누락 | `.env`에 토큰 추가 |
| `파일을 찾을 수 없습니다` | 경로 오류 | 파일 경로 확인 |
| `업로드 실패` | 권한/네트워크 | 토큰 권한(Contents R/W) 확인 |
| `jq: command not found` | jq 미설치 | `brew install jq` |
