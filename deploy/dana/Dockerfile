# One container, two processes: nginx serves the SPA and proxies /api to the
# Hono API. The Ondana edge injects X-User-Token (the signed-in platform
# identity — Applied or okta-ext) into every browser request; the API's SSO
# middleware resolves it into the app's own session.
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
RUN apk add --no-cache nginx
WORKDIR /app
ENV NODE_ENV=production
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/apps/server/node_modules apps/server/node_modules
COPY --from=prod-deps /app/packages/core/node_modules packages/core/node_modules
COPY --from=prod-deps /app/packages/content/node_modules packages/content/node_modules
COPY --from=prod-deps /app/package.json ./package.json
COPY --from=prod-deps /app/apps/server/package.json apps/server/package.json
COPY --from=prod-deps /app/packages/core/package.json packages/core/package.json
COPY --from=prod-deps /app/packages/content/package.json packages/content/package.json
COPY tsconfig.base.json tsconfig.base.json
COPY apps/server/tsconfig.json apps/server/tsconfig.json
COPY packages/core/tsconfig.json packages/core/tsconfig.json
COPY packages/content/tsconfig.json packages/content/tsconfig.json
COPY apps/server/src apps/server/src
COPY packages/core/src packages/core/src
COPY packages/content/src packages/content/src
# The built SPA (staged by scripts/dana-deploy.sh before the image build).
COPY deploy/dana/dist/ /app/apps/web/dist/
COPY deploy/dana/nginx.conf /etc/nginx/http.d/default.conf
COPY deploy/dana/start.sh /app/start.sh
# The platform's Postgres (AlloyDB) requires TLS even on its private host
# (pg_hba rejects plaintext) — opt the pool in via the PGSSLMODE knob. The
# code default stays node-pg's for self-hosters pointing at local instances.
ENV PGSSLMODE=require
ENV PORT=8787
ENV DB_PATH=/tmp/tet.sqlite3
EXPOSE 8080
CMD ["/bin/sh", "/app/start.sh"]
