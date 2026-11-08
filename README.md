# Test Engineer Track

A training platform that turns non-technical test specialists into test engineers:
ISTQB Foundation (CTFL v4.0) prep plus an AI-testing track, with lessons, module
quizzes, mock exams, spaced-repetition flashcards, read-aloud (TTS), and cohort
tracking with an admin roster.

**Status:** the ISTQB Foundation (CTFL v4.0) track is fully authored through
module 7: 26 lessons, 191 questions, 110 flashcards, 26 diagrams, and 83
verified videos. Module 8 — exam readiness — and the mock exams that power it
arrive in M3; the AI track follows in M4. See `docs/` for the spec and plan.

## What it is

Two ways to run, one codebase:

- **Solo** — everything lives in your browser (IndexedDB). No server needed.
- **Cohort** — one SQLite-backed API server; the admin invites learners, and
  progress/quiz/exam/card-review data syncs to the server. The first registered
  user becomes the bootstrap admin.

Feature list: tracks → modules → lessons (markdown + diagrams + verified video
embeds + read-aloud), per-module quizzes with best-attempt tracking, timed mock
exams with blueprint assembly and draft-resume, SM-2 spaced-repetition
flashcards, TTS via built-in browser voices or client-side Kokoro-82M (optional
cloud proxy), admin roster with per-learner stats + CSV export + one-time invite
codes, and a one-time solo→cohort migration that preserves in-browser progress.

## Quickstart (solo)

```bash
pnpm install
pnpm content:build      # validates content and emits content.json
pnpm --filter tet-web dev
```

Open the printed URL (default http://localhost:5173). Solo mode stores all
progress in the browser — nothing leaves your machine.

## Quickstart (cohort)

```bash
cp .env.example .env            # then set SESSION_SECRET (see .env.example)
docker compose -f docker/docker-compose.yml --env-file .env up --build
```

`--env-file .env` is needed because compose resolves `.env` relative to the
compose file's directory, not your shell's.

The API server listens on http://localhost:8787. Then:

1. Open the web app (solo build or dev server), click **Sign in**.
2. Point **Server URL** at `http://localhost:8787` (or wherever the server runs).
3. The **first registered user becomes the admin** — register first yourself,
   then create one-time invite codes from `/admin` and invite learners.

## Deploying the static site to Ondana

The learner UI is a fully static build:

```bash
pnpm build && pnpm content:build
```

Upload `apps/web/dist/` per Ondana's app-deployment flow. All asset references
are relative (`./assets/…`), so the app works from any subpath. Enter the app
via its root URL — routes are client-side, and the static build does not include
server rewrites for deep links (refreshing on a deep route is a known M5 polish
item).

Cohort logins are configured per user at sign-in (the **Server URL** field), so
point them at wherever the API server runs — same origin, another port on the
same host, or a same-domain subdomain (all "same-site": the session cookie is
`SameSite=Lax`; the server sends permissive CORS with credentials). Fully
cross-domain deployments need `SameSite=None; Secure` cookie work (not yet
implemented — future hardening, requires HTTPS).

## Running the API server anywhere

**Docker (recommended):** the `docker compose` section above. State lives in
the `tet-data` volume at `/data/tet.sqlite3`. Back it up with a SQLite online
snapshot — complete even with the server running, and includes writes still
sitting in the `-wal` journal:

```bash
docker compose -f docker/docker-compose.yml --env-file .env exec -T \
  -w /app/apps/server tet-server \
  node -e "require('fs').rmSync('/data/backup.sqlite3',{force:true});const db=require('better-sqlite3')('/data/tet.sqlite3');db.exec(\"VACUUM INTO '/data/backup.sqlite3'\");db.close()"
docker compose -f docker/docker-compose.yml --env-file .env cp tet-server:/data/backup.sqlite3 ./tet.sqlite3.backup
```

The `rmSync` step makes the command safely re-runnable: `VACUUM INTO` fails
when the target file already exists, so a second backup run without removing
the old snapshot errors out.

A raw `docker compose cp` (or bind-mounted `tar`) of `tet.sqlite3` alone is
**not** a safe backup here: the database runs in WAL mode, so recent writes sit
in `tet.sqlite3-wal` and a main-file-only copy silently misses them.

**Bare metal:**

```bash
pnpm install
pnpm --filter tet-server start    # tsx runs src/index.ts directly
```

Environment (see `.env.example`): `PORT` (default 8787), `DB_PATH`
(default `./data/tet.sqlite3`, parent directory created automatically),
`SESSION_SECRET` (reserved for signed sessions; generate with
`openssl rand -hex 32`), `TTS_PROVIDER` + `TTS_API_KEY` (optional cloud TTS
proxy — leave empty to disable; the web app ships with browser voices and
client-side Kokoro).

SQLite keeps recent writes in a `-wal` journal next to the main file, so don't
plain-`cp` the database while it's in use. Back it up with the online backup
API instead: `sqlite3 data/tet.sqlite3 ".backup 'backup.sqlite3'"` — complete,
consistent, and WAL-inclusive even while the server is running.

## Authoring content

All curriculum lives in `packages/content/content/`:

```
content/
├── tracks.toml             # track + module manifest (ids, titles, order,
│                           #   readiness thresholds, lessonIds, exam weights)
├── exams/                  # mock exam blueprints, one [exam] table per file
│                           #   (empty for now — mock exams arrive in M3)
├── istqb/module-1/         # one directory per module
│   ├── lesson-01-….md      # flat lesson files: TOML frontmatter (id, module,
│   │                       #   title, minutes, objectives, videos, diagrams)
│   │                       #   + markdown body
│   ├── questions.toml      # ONE file: one [[question]] table per question
│   └── flashcards.toml     # SM-2 deck: one [[card]] table per card
└── diagrams/               # SVG figures referenced from lessons
```

Lesson frontmatter is TOML between `+++` markers (not YAML):

```toml
+++
id = "istqb-m1-what-is-testing"
module = "istqb-m1-fundamentals"
title = "What Is Testing?"
minutes = 12
objectives = ["FL-1.1.1", "FL-1.1.2"]
videos = [{ title = "…", url = "https://www.youtube.com/watch?v=…" }]
diagrams = [{ title = "Testing vs debugging", file = "diagrams/testing-vs-debugging.svg" }]
+++
```

Questions live in the module's single `questions.toml` (`type` is `single` or
`multi`; `answers` lists option indexes; `lo` is the learning objective):

```toml
[[question]]
id = "istqb-q-0001"
type = "single"
stem = "What is the main purpose of testing?"
options = ["To prove that the software works correctly", "…"]
answers = [1]
explanation = "Testing finds defects and gives stakeholders objective information…"
lo = "FL-1.1.1"
klevel = "K2"
tags = ["ch1"]
```

Flashcards live in the module's `flashcards.toml`:

```toml
[[card]]
id = "istqb-fc-0001"
front = "What is an error?"
back = "A human action or mistake that produces an incorrect result…"
tags = ["ch1"]
```

The build is the validator: `pnpm --filter tet-content build` re-derives
`content.json` and fails on schema violations (bad ids, missing references,
invalid question types, unreachable lessons) and on exam blueprints that
cannot actually be assembled from the question bank (constraint interplay,
e.g. a group whose questions are all multi-select while the exam forbids
multi-selects). Link checking: `pnpm --filter tet-content check-links`
verifies every external link and video embed. Extension story: **add a
module = add a directory + one `[[track.module]]` entry in `tracks.toml`**.

## Architecture

```
apps/web       React 19 + Vite SPA (learner + admin UI)
apps/server    Hono + better-sqlite3 API server (auth, progress, admin, TTS)
packages/core  Domain logic: SM-2 SRS, scoring, quiz/exam assembly, types
packages/content  Curriculum data + build-time validator (TOML/MD → content.json)
packages/storage  StorageAdapter: LocalAdapter (IndexedDB) + ServerAdapter (HTTP)
```

`packages/storage` defines one adapter interface implemented twice: a
`LocalAdapter` persisting to IndexedDB (solo) and a `ServerAdapter` speaking
HTTP to the API server (cohort). The web app is written entirely against the
interface, so both modes — and the one-time solo→cohort migration — are the
same UI code. Adapter parity is enforced by a shared test suite. The server
holds users (bcrypt), sessions, invites, progress, attempts, and card-review
state in SQLite; the static SPA talks to it cross-origin with cookie
credentials.

## Development

```bash
pnpm test     # all unit/component suites (core, content, storage, web, server)
pnpm build    # content validation + web static build + server typecheck
pnpm smoke    # builds content + web, then runs 2 Playwright smoke tests
```

Smoke tests boot the real server (throwaway SQLite DB) and the built web app
(`vite preview`), then drive the solo learner flow and the cohort
register→login→admin-roster flow. First run downloads Chromium:
`pnpm exec playwright install chromium`.

License: MIT — see `LICENSE`.
