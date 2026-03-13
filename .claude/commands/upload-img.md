---
name: upload-img
description: "이미지를 GitHub 저장소에 업로드하고 raw URL을 반환한다. Use when user says /upload-img, 이미지 올려줘, PNG 업로드."
allowed-tools: ["Bash"]
---

# /upload-img - 이미지 GitHub 업로드

`upload-img` 스킬을 실행한다.

## Usage
```
/upload-img <이미지파일>
/upload-img <이미지파일> <저장경로>
```

`upload-img` 스킬의 워크플로우를 따라 `scripts/upload-img.sh`를 실행하고 마크다운 URL을 반환한다.
