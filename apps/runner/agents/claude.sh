#!/bin/bash
# claude: stock setup (onboarding, bypass permissions, gateway model), run headless so the
# run ends on its own. The stream is kept for metrics and rendered as text for watchers.

# shellcheck source=/dev/null
. /opt/sandboxd/agents/claude.sh

agent_run() {
  agents_begin
  say "starting claude${MODEL:+ ($MODEL)}${BASE:+ via $BASE}"
  claude -p --dangerously-skip-permissions --output-format stream-json --verbose "${PROMPT:-}" \
    | tee "$AGENTS_OUT/claude.jsonl" \
    | jq -r --unbuffered 'select(.type == "assistant") | .message.content[]? | select(.type == "text") | .text'
  agents_report "${PIPESTATUS[0]}"
}
