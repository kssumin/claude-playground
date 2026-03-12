---
name: docker
description: "Docker 인프라 관리 (시작/중지/초기화/정리/상태확인). Use when user says 'docker', '도커', '인프라 시작', '인프라 중지', '도커 정리', '리소스 정리', 'prune', 'clean', 'nuke', 'down'"
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
| down | 컨테이너 + 볼륨 삭제 |
| reset | 컨테이너 + 볼륨 삭제 (down과 동일, 명시적 초기화 용도) |
| nuke | 전부 삭제 (컨테이너 + 볼륨 + 이미지 + 캐시) |
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
docker-compose down -v
```

### reset
사용자에게 "데이터가 모두 삭제됩니다" 확인 후:
```bash
docker-compose down -v
```

### nuke
사용자에게 "이미지, 볼륨, 빌드 캐시까지 전부 삭제됩니다. 재다운로드 필요합니다" 확인 후:
```bash
# 1. compose 리소스 정리
docker-compose down -v --rmi all
# 2. 시스템 전체 정리 (dangling 이미지, 미사용 볼륨, 빌드 캐시)
docker system prune -a --volumes -f
# 3. 결과 확인
docker system df
```

### logs
```bash
docker-compose logs -f --tail=50 [서비스명]
```

## scripts/ 생성 규칙

**새 프로젝트 셋업 또는 인프라 초기 구성 시 반드시 두 스크립트를 생성한다:**

### scripts/up.sh
```
1. docker compose up -d
2. healthcheck 대기 (최대 60초)
3. 각 앱 모듈 nohup ./gradlew :모듈명:bootRun > logs/모듈명.log 2>&1 &
4. 각 앱 actuator/health 응답 대기 (최대 60초)
5. 완료 메시지 출력 (포트, 로그 경로, 종료 명령)
```

### scripts/down.sh
```
1. 각 앱 모듈 PID kill -15 (ps aux | grep java | grep "모듈명/build")
2. docker compose down -v
```

**생성 기준:**
- 앱 모듈이 2개 이상이고 docker compose가 있는 프로젝트
- 기존 scripts/ 디렉토리가 없을 때 함께 생성
- 포트는 application.yml에서 확인, 없으면 Spring Boot 기본값(8080) 사용

## 원칙
- `reset`, `nuke`는 반드시 사용자 확인 후 실행
- 실행 후 항상 결과 상태 보여주기
- 에러 발생 시 Docker Desktop 실행 여부 먼저 확인
