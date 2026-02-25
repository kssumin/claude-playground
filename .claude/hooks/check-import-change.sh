#!/bin/bash
# PostToolUse hook: .kt 파일의 import 변경 감지 → ArchUnit 확인 알림
INPUT=$(cat)

RESULT=$(echo "$INPUT" | python3 -c "
import sys, json
data = json.load(sys.stdin)
tool = data.get('tool_name', '')
inp = data.get('tool_input', {})
fp = inp.get('file_path', '')

if not fp.endswith('.kt'):
    sys.exit(0)

modules = {
    'alarm-api': 'alarm-api',
    'alarm-consumer': 'alarm-consumer',
    'alarm-domain': 'alarm-domain',
    'alarm-infra': 'alarm-infra',
    'alarm-client-external': 'alarm-client-external',
}
module = None
for key, name in modules.items():
    if key in fp:
        module = name
        break
if not module:
    sys.exit(0)

has_import_change = False
if tool == 'Edit':
    old = inp.get('old_string', '')
    new = inp.get('new_string', '')
    has_import_change = any(
        line.strip().startswith('import ')
        for line in (old + '\n' + new).split('\n')
    )
elif tool == 'Write':
    content = inp.get('content', '')
    has_import_change = any(
        line.strip().startswith('import ')
        for line in content.split('\n')
    )

if has_import_change:
    action = 'import 변경 감지' if tool == 'Edit' else '새 파일 작성됨'
    print(f'[ArchUnit] {module} 모듈에서 {action}. ArchUnit 테스트로 의존성 규칙 위반 여부를 확인하세요.')
" 2>/dev/null)

if [[ -n "$RESULT" ]]; then
  echo "$RESULT"
fi

exit 0
