#!/bin/bash
# Hook: Kafka Consumer 멱등성 체크 검증
# Trigger: *Consumer*.kt 파일 편집/생성
FILE="$CLAUDE_TOOL_INPUT_FILE_PATH"
[ -f "$FILE" ] || exit 0

HAS_IDEMPOTENCY=$(grep -c 'duplicateChecker\|DuplicateChecker\|idempotent\|setNx\|SET_NX\|isAlreadyProcessed' "$FILE" 2>/dev/null || echo 0)
HAS_KAFKA_LISTENER=$(grep -c '@KafkaListener\|KafkaListener' "$FILE" 2>/dev/null || echo 0)

if [ "$HAS_KAFKA_LISTENER" -ge 1 ] && [ "$HAS_IDEMPOTENCY" -eq 0 ]; then
  echo "[HOOK] CRITICAL: @KafkaListener 존재하지만 중복 체크 로직 없음 → 메시지 재처리 시 중복 발송 위험"
  echo "[HOOK] 참조: alarm-domain의 DuplicateChecker Port 또는 Redis SET NX 패턴 사용 필요"
fi
