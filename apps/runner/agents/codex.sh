#!/bin/bash
# codex: stock setup (gateway provider, full access), run non-interactively via `codex exec`.

# shellcheck source=/dev/null
. /opt/sandboxd/agents/codex.sh

agent_run() {
  agents_begin
  say "starting codex exec${MODEL:+ ($MODEL)}${BASE:+ via $BASE/v1}"
  codex exec --dangerously-bypass-approvals-and-sandbox \
    --output-last-message "$AGENTS_OUT/codex-last-message.txt" "${PROMPT:-}"
  agents_report "$?"
}
