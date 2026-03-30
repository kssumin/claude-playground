#!/bin/bash
# Hook: Outbox Entity 필수 필드 검증
# Trigger: *Outbox*.kt or *OutboxEvent*.kt 파일 편집/생성
FILE="$CLAUDE_TOOL_INPUT_FILE_PATH"
[ -f "$FILE" ] || exit 0

HAS_AGGREGATE_ID=$(grep -c 'aggregateId\|aggregate_id' "$FILE" 2>/dev/null || echo 0)
HAS_PROCESSED=$(grep -c 'processed\|status\|dispatched' "$FILE" 2>/dev/null || echo 0)
HAS_ID=$(grep -c '@Id\|val id' "$FILE" 2>/dev/null || echo 0)

if [ "$HAS_ID" -eq 0 ]; then
  echo "[HOOK] CRITICAL: Outbox Entity에 @Id 누락 → Debezium CDC 동작 불가"
fi
if [ "$HAS_AGGREGATE_ID" -eq 0 ]; then
  echo "[HOOK] WARNING: aggregateId 필드 누락 → Consumer 멱등성 보장 불가"
fi
if [ "$HAS_PROCESSED" -eq 0 ]; then
  echo "[HOOK] WARNING: processed/status 필드 누락 → 발행 완료 추적 불가"
fi
