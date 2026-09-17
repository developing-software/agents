#!/bin/bash
# Sourced by sandboxd-entry before any agent file. Reuses the stock gateway mapping
# (LLM_BASE_URL/LLM_API_KEY -> each harness) and adds the run bookkeeping every agent
# file here shares: where output goes, when the run started, and the report step.

# shellcheck source=/dev/null
. /opt/sandboxd/agents/_common.sh

export AGENTS_OUT="${AGENTS_OUT:-/tmp/agents-out}"
mkdir -p "$AGENTS_OUT"

# Call at the top of agent_run.
agents_begin() {
  AGENT_STARTED_MS=$(date +%s%3N)
  AGENT_INITIAL_SHA=$(git rev-parse HEAD 2>/dev/null || true)
  export AGENT_STARTED_MS AGENT_INITIAL_SHA
}

# Call with the agent's exit code: commits, pushes, and reports the run. Returns that code.
agents_report() {
  local code="$1"
  say "agent exited with $code; reporting run"
  AGENT_EXIT="$code" bun /opt/agents/report.js || warn "reporter exited with $?"
  return "$code"
}
