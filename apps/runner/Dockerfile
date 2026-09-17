# agents-runner: the sandboxd agent image plus the run reporter.
# Build `dist/report.js` first (`bun run build`), then build from this directory.
FROM ghcr.io/developing-software/sandboxd-agent:latest

USER root
COPY agents/ /opt/agents/agents/
COPY dist/report.js /opt/agents/report.js
RUN chmod -R a+rX /opt/agents

USER dev
# Our agent files source the stock ones in /opt/sandboxd/agents and wrap agent_run.
ENV SANDBOXD_AGENTS_DIR=/opt/agents/agents \
    AGENTS_OUT=/tmp/agents-out

LABEL org.opencontainers.image.title="agents-runner" \
      org.opencontainers.image.description="sandboxd-agent that commits, opens a PR and reports the run to dev agents."
