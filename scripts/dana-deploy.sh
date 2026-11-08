#!/usr/bin/env bash
# Build the web app and deploy it to Ondana via the Dana CLI.
# Prereqs: dana CLI installed + `dana auth login` completed; docker available.
set -euo pipefail
cd "$(dirname "$0")/.."
pnpm build                                    # content build + web build (dependency-ordered)
rm -rf deploy/dana/dist
cp -r apps/web/dist deploy/dana/dist
docker build -t test-engineer-track:latest deploy/dana/
cd deploy/dana
dana app deploy --image test-engineer-track:latest
