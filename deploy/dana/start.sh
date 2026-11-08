#!/bin/sh
# One container, two processes: the API (tsx) + nginx (SPA + /api proxy).
# The Ondana edge injects X-User-Token on browser requests; the API's SSO
# middleware resolves the caller into an app session.
set -eu
cd /app
# The platform injects PORT=8080 for the container's public listener (nginx).
# The API listens on its own internal port; nginx proxies /api to it.
export PORT=3000
export DB_PATH="${DB_PATH:-/tmp/tet.sqlite3}"
./apps/server/node_modules/.bin/tsx apps/server/src/index.ts &
exec nginx -g 'daemon off;'
