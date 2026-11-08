FROM node:22-alpine AS base
RUN corepack enable
# Toolchain for better-sqlite3's native build (used if no musl prebuild matches).
RUN apk add --no-cache python3 make g++
WORKDIR /app

# pnpm workspace: copy manifests first for layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
COPY packages/core/package.json packages/core/
COPY packages/content/package.json packages/content/
COPY packages/storage/package.json packages/storage/
RUN pnpm install --frozen-lockfile

COPY . .
# content.json is the only build output the server consumes at runtime: the
# server runs from TypeScript source via tsx, and the SPA is statically hosted
# elsewhere — tet-web/tet-server build artifacts never reach the image.
RUN pnpm --filter tet-content build

# Production dependencies for exactly the server's runtime graph: the server
# workspace plus its workspace deps (tet-core, tet-content) — the other
# workspaces' manifests stay out, so this install is --prod and
# workspace-scoped at once. The toolchain rides along for better-sqlite3's
# native fallback but never reaches the final image.
FROM node:22-alpine AS prod-deps
RUN corepack enable
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json apps/server/
COPY packages/core/package.json packages/core/
COPY packages/content/package.json packages/content/
RUN pnpm install --frozen-lockfile --prod

FROM node:22-alpine AS runtime
RUN corepack enable
WORKDIR /app
ENV NODE_ENV=production
# node_modules from the pruned install, preserving pnpm's symlink layout:
# workspace links (apps/server/node_modules/tet-core -> ../../packages/core)
# and registry deps (-> ../../node_modules/.pnpm/...) both resolve inside /app.
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/apps/server/node_modules apps/server/node_modules
COPY --from=prod-deps /app/packages/core/node_modules packages/core/node_modules
COPY --from=prod-deps /app/packages/content/node_modules packages/content/node_modules
# Manifests so `pnpm --filter` can resolve the workspace; tsconfigs so tsx
# compiles with the same settings the dev flow uses.
COPY --from=base /app/package.json ./package.json
COPY --from=base /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=base /app/apps/server/package.json apps/server/package.json
COPY --from=base /app/packages/core/package.json packages/core/package.json
COPY --from=base /app/packages/content/package.json packages/content/package.json
COPY --from=base /app/tsconfig.base.json tsconfig.base.json
COPY --from=base /app/apps/server/tsconfig.json apps/server/tsconfig.json
COPY --from=base /app/packages/core/tsconfig.json packages/core/tsconfig.json
COPY --from=base /app/packages/content/tsconfig.json packages/content/tsconfig.json
# Runtime sources only: the server, tet-core, tet-content + built content.json.
# apps/web and packages/storage (a test-only devDependency) do not ship.
COPY --from=base /app/apps/server/src apps/server/src
COPY --from=base /app/packages/core/src packages/core/src
COPY --from=base /app/packages/content/src packages/content/src
COPY --from=base /app/packages/content/content.json packages/content/content.json
EXPOSE 8787
CMD ["pnpm", "--filter", "tet-server", "start"]
