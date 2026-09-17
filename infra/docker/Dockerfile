# syntax=docker/dockerfile:1
# Build context is the repo root (see compose.yml). This is a Bun workspace
# monorepo with a catalog, so install/build must happen from the root — the
# `@agents/*` deps are `workspace:*` and won't resolve in isolation.

FROM oven/bun:1 AS base
WORKDIR /app
COPY . .
RUN bun install --frozen-lockfile

# Migration image. drizzle-kit needs `node:sqlite`, which Bun doesn't provide,
# so this stage borrows the Node binary purely to run `drizzle-kit migrate`.
# Kept out of the app runtime below so those images stay Node-free.
FROM base AS migrate
COPY --from=node:24-trixie-slim /usr/local/bin/node /usr/local/bin/node
WORKDIR /app/packages/core
ENTRYPOINT ["node", "node_modules/.bin/drizzle-kit", "migrate"]

# Pre-build the SvelteKit console with adapter-node → apps/console/build.
FROM base AS build
ENV SVELTE_ADAPTER=node
RUN bun run --filter console build

# Single runtime image for every app service. The CLI is the entrypoint; each
# compose service supplies a `serve <api|auth|console>` verb as its command.
FROM build AS runtime
ENV NODE_ENV=production
WORKDIR /app
# HEALTHCHECK and `docker exec` both bypass ENTRYPOINT, so the CLI needs a name on PATH
# for `dev-agents health <target>` to be the probe.
RUN printf '#!/bin/sh\nexec bun run /app/apps/cli/src/index.ts "$@"\n' > /usr/local/bin/dev-agents \
  && chmod +x /usr/local/bin/dev-agents
ENTRYPOINT ["bun", "run", "apps/cli/src/index.ts"]
CMD ["serve", "console"]
