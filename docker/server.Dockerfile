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
# Content-validation gate: tet-content's build re-derives content.json and
# fails the image build on schema violations. Nothing in this image consumes
# the output at runtime — content.json is the SPA's input and ships with the
# statically hosted web build, not here. The server runs from TypeScript
# source via tsx; tet-core/tet-content sources below ride along only because
# the server declares them as prod dependencies (nothing imports them at
# runtime — slimming that dep graph is backlog, quantified ≈380MB of
# kokoro/onnxruntime trees).
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
# Runtime sources only: the server plus its declared workspace deps
# tet-core/tet-content (unimported at runtime — they ship because the prod
# install resolves declared deps; slimming stays backlog). apps/web,
# packages/storage (a test-only devDependency), and the built content.json
# (the SPA's artifact) do not ship.
COPY --from=base /app/apps/server/src apps/server/src
COPY --from=base /app/packages/core/src packages/core/src
COPY --from=base /app/packages/content/src packages/content/src
EXPOSE 8787
CMD ["pnpm", "--filter", "tet-server", "start"]
