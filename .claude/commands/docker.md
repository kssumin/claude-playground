---
name: docker
description: "Docker 인프라 관리 (시작/중지/초기화/상태확인)"
allowed-tools: ["Bash", "Read"]
---

# /docker - Docker 인프라 관리

## 사용법
`/docker [명령]` 형태로 실행. 명령이 없으면 상태 확인.

## 명령어

| 명령 | 설명 |
|------|------|
| (없음), status | 컨테이너/볼륨 상태 확인 |
| up | 인프라 시작 (`docker-compose up -d`) |
| down | 컨테이너 중지 |
| reset | 컨테이너 중지 + 볼륨 삭제 (데이터 초기화) |
| nuke | 전부 삭제 (컨테이너 + 볼륨 + 이미지) |
| logs [서비스] | 로그 확인 (예: `logs kafka`) |

## Workflow

### status (기본)
```bash
docker-compose ps
docker volume ls --filter "name=alarm"
```

### up
```bash
docker-compose up -d
# 기동 후 healthcheck 상태 확인
docker-compose ps
```

### down
```bash
docker-compose down
```

### reset
사용자에게 "데이터가 모두 삭제됩니다" 확인 후:
```bash
docker-compose down -v
```

### nuke
사용자에게 "이미지까지 삭제되어 재다운로드 필요합니다" 확인 후:
```bash
docker-compose down -v --rmi all
```

### logs
```bash
docker-compose logs -f --tail=50 [서비스명]
```

## 원칙
- `reset`, `nuke`는 반드시 사용자 확인 후 실행
- 실행 후 항상 결과 상태 보여주기
- 에러 발생 시 Docker Desktop 실행 여부 먼저 확인
