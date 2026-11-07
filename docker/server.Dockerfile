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
RUN pnpm --filter tet-content build && pnpm --filter tet-web build && pnpm --filter tet-server build

FROM node:22-alpine AS runtime
RUN corepack enable
WORKDIR /app
ENV NODE_ENV=production
COPY --from=base /app ./
EXPOSE 8787
CMD ["pnpm", "--filter", "tet-server", "start"]
