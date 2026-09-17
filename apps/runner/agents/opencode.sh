#!/bin/bash
# opencode: stock setup (gateway provider + model), run non-interactively via `opencode run`.

# shellcheck source=/dev/null
. /opt/sandboxd/agents/opencode.sh

agent_run() {
  agents_begin
  say "starting opencode run${MODEL:+ ($MODEL)}${BASE:+ via $BASE/v1}"
  opencode run "${PROMPT:-}"
  agents_report "$?"
}
