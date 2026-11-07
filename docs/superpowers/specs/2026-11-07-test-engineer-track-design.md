# Test Engineer Track — Design Spec

- **Date:** 2026-11-07
- **Status:** Approved in-session (brainstorming → this spec)
- **Product:** Self-paced training web platform that turns non-technical test specialists into test engineers
- **Host:** ondana.ai (static app deployment), open-source and hostable anywhere
- **Repo:** `~/projects/test-engineer-track` (GitHub: `test-engineer-track`, MIT license)

---

## 1. Goals & Success Criteria

1. A learner who starts non-technical can work through guided modules and, on completion, **pass the official ISTQB CTFL v4.0 exam** (40 Q / 60 min / 65% pass).
2. A learner progresses **from zero AI knowledge** to being able to explain: how AI works, AI vs ML, model training, and how AI applies to autonomous vehicles — including **one-stage vs two-stage detection models** — and what testing AI systems involves.
3. Training is delivered as **modules, quizzes, exams, and built-in Anki-style flashcards** (spaced repetition) on a website.
4. **Every technical term is linked** to an external learning resource (YouTube etc.).
5. **Every lesson section includes diagrams and curated embedded videos.**
6. Every lesson has a **read-aloud (TTS) button with a natural, human-sounding voice** — not robotic.
7. Cohort **progress is centrally tracked**; an admin (trainer) can see learner progress, scores, and exam readiness.
8. The product is **open source and deployable anywhere** (Ondana static, or Docker server on any VPS/homelab).
9. The platform is **curriculum-agnostic**: new tracks/modules are added via content data files + PR, with zero code changes.

**Non-goals (v1):** official ISTQB proctoring integration, mobile native apps, i18n beyond English, per-question cohort analytics dashboards, SCORM/LMS interoperability, AI-generated tutoring chat.

---

## 2. Decisions (locked during brainstorming)

| Decision | Choice |
|---|---|
| Audience | Cohort with central tracking (plus solo mode via adapter) |
| Hosting | Open-source repo; Ondana = static app deploy; must build/run anywhere |
| Backend | Adapter pattern: LocalAdapter (IndexedDB) + ServerAdapter (Node + SQLite) |
| Auth | Username + password (bcrypt) + admin-managed invite codes; opaque session token in httpOnly cookie |
| Content | Repo data files (markdown lessons + TOML questions/cards/exams) |
| ISTQB bank | Heavy: ~30 Q/chapter (~200) + 5 full blueprint mocks (200) ≈ 400 |
| AI bank | ~15–20 Q/module (~140) + 2 AI mock exams (30 Q, 45 min, 70% pass) |
| Stack | TS monorepo: React 19 + Vite (web), Hono + better-sqlite3 (server) |
| Progression | Guided but unlocked — recommended order + progress markers, nothing locked |
| Authoring | Agent authors all content; user reviews via PRs/previews |
| Name | Test Engineer Track |
| Timeline | No hard deadline |

---

## 3. Official ISTQB CTFL v4.0 Exam Blueprint (verified 2026-11-07)

Source: ISTQB Exam Structures and Rules (CTFL v4.0 tables) + istqb.org.

- 40 multiple-choice questions, 1 point each; **pass = 26/40 (65%)**; 60 minutes (75 min for approved non-native-language candidates).
- **Chapter weights (questions per mock exam):**

| Chapter | Questions | Share |
|---|---|---|
| 1. Fundamentals of Testing | 8 | 20% |
| 2. Testing Throughout the SDLC | 6 | 15% |
| 3. Static Testing | 4 | 10% |
| 4. Test Analysis and Design | 11 | 27.5% |
| 5. Managing the Test Activities | 9 | 22.5% |
| 6. Test Tools | 2 | 5% |

- **K-levels per mock exam:** K1 (recall) = 8, K2 (understand) = 24, K3 (apply) = 8. K3 concentrates in Ch4 (test techniques) and Ch5 (planning/estimation).
- **Multi-select:** 1–2 questions per exam may be "choose 2 of 5" or "choose 3 of 7"; still 1 point, all-or-nothing scoring.
- All mock exams must assemble to exactly this blueprint. The validator enforces the math.

Content must be **original** (no copying ISTQB official sample questions verbatim; syllabus facts and learning objectives are fair training material).

---

## 4. Curriculum

### Track 1: ISTQB Foundation (CTFL v4.0) — 8 modules

| # | Module | Source | Exam weight |
|---|---|---|---|
| 1 | Fundamentals of Testing | Ch1 | 8 Q |
| 2 | Testing Throughout the SDLC | Ch2 | 6 Q |
| 3 | Static Testing | Ch3 | 4 Q |
| 4 | Test Analysis & Design I — black-box techniques (equivalence partitioning, boundary values, decision tables, state transitions) | Ch4 (part) | Ch4 total 11 Q |
| 5 | Test Analysis & Design II — white-box, experience-based, collaboration-based (statement/decision coverage, exploratory, ATDD/BDD) | Ch4 (part) | ″ |
| 6 | Managing the Test Activities | Ch5 | 9 Q |
| 7 | Test Tools | Ch6 | 2 Q |
| 8 | Exam Readiness — mock exams + weak-area review | — | — |

Each module: ~30–60 min of lessons, a module quiz (~10–15 Q drawn from its chapter bank), and a flashcard deck (~15–25 cards). Module 8 has no new lessons; it aggregates mocks and weak-area guidance.

### Track 2: AI for Test Engineers — 8 modules

1. **What is AI?** — AI vs ML vs deep learning; rule-based vs learned behavior; where AI already touches daily software.
2. **How machines learn** — data, features, labels; supervised/unsupervised/reinforcement; train/validation/test splits; overfitting/underfitting; why data quality dominates outcomes.
3. **Neural networks from scratch** — neurons, weights, activations, layers; forward pass; backprop and gradient descent at intuition level; interactive toy demo (trainable in-browser).
4. **Computer vision fundamentals** — images as tensors; convolutions and filters; CNN feature hierarchies; classification vs detection vs segmentation.
5. **Object detection: one-stage vs two-stage** — two-stage (R-CNN family: region proposals → classification), one-stage (YOLO/SSD: single pass); speed-vs-accuracy trade-offs; anchors, NMS, IoU.
6. **Transformers & LLMs** — tokens, embeddings, attention; why testers should care about LLM-based features.
7. **AI in the AV stack** — sensor suite; perception → prediction → planning → control; where detection models sit; sim vs real-world data; one-stage vs two-stage relevance inside perception.
8. **Testing AI systems** — precision/recall/IoU/mAP; non-determinism; data-driven failure modes; scenario coverage; brief SOTIF/ISO 21448 orientation; pointer to ISTQB CT-AI as the next certification step.

**AI exit criteria:** the learner can (a) explain how an AV perceives the world, (b) articulate the one-stage vs two-stage trade-off, (c) describe a concrete plan for testing an AI perception model.

### Media requirements (both tracks)

- Every lesson section: at least one **SVG diagram** (repo: `content/diagrams/`) and at least one **curated embedded video** (YouTube embed with vetted link, verified at authoring time).
- Flow-style diagrams may use Mermaid (rendered inline); conceptual diagrams are authored SVG.
- Every technical term is hyperlinked to an external deep-dive resource inline in lesson text.

---

## 5. Learner Experience

- **Dashboard:** resume-where-you-left-off, per-track progress rings, flashcards due today, recent quiz/exam scores.
- **Track page:** modules in recommended order with progress markers; everything browsable (no locks).
- **Module page:** lessons → module quiz → flashcard deck; progress marker per component.
- **Lesson view:** markdown-rendered reading page; inline diagrams/videos; term hyperlinks; TTS player (play/pause/stop, speed control; reads section by section).
- **Quiz:** instant feedback + plain-English explanation after each answer; retakeable; all attempts recorded.
- **Flashcards:** Anki-style review session — card front/back, grade buttons (again/hard/good/easy), due-today queue across decks, per-deck stats.
- **Mock exam:** exam mode — 60-min countdown (per exam definition), question navigation + flag-for-review, autosave, no instant feedback; on submit: score, pass/fail vs threshold, per-chapter (or per-tag) breakdown, question review with explanations.
- **Readiness indicator (per track):** last 2 mock exam averages ≥ 80% → "ready" (buffer above official 65% line; AI track uses its own 70% threshold + 8 pts = 78%).

---

## 6. Platform Architecture

### Monorepo layout

```
test-engineer-track/
├── apps/
│   ├── web/            React 19 + Vite SPA (learner + admin UI)
│   └── server/         Hono + better-sqlite3 API server
├── packages/
│   ├── content/        Curriculum data: tracks.toml manifest, markdown lessons,
│   │                   TOML questions/flashcards/exams, SVG diagrams, validator
│   ├── core/           Shared domain logic + types: SRS (SM-2), scoring,
│   │                   quiz/exam assembly engines, content schema types
│   └── storage/        StorageAdapter interface + LocalAdapter + ServerAdapter
├── docker/             Dockerfile, docker-compose.yml (server + optional TTS sidecar)
├── docs/               This spec lives here in-repo after scaffold
└── .env.example
```

### Storage adapter contract

```ts
interface StorageAdapter {
  // progress & attempts
  getProgress(userId): Promise<ProgressMap>
  putProgress(userId, patch): Promise<void>
  recordQuizAttempt(userId, attempt): Promise<void>
  recordExamAttempt(userId, attempt): Promise<void>
  recordCardReview(userId, review): Promise<void>
  getReviewState(userId): Promise<CardStateMap>
  // session (solo mode may persist a local "user")
  getSession(): Promise<SessionInfo | null>
  putSession(info: SessionInfo): Promise<void>
}
// LocalAdapter: IndexedDB (localStorage fallback) — zero backend
// ServerAdapter: REST calls to /api — cohort mode
```

App boots in **solo mode** by default; entering a server URL + credentials switches to **cohort mode**. Identical UI either way.

### Data model (server, SQLite)

- `users` (id, username, display_name, password_hash, role: admin|learner, created_at, last_seen_at)
- `sessions` (token, user_id, expires_at)
- `invites` (code, created_by, uses_left, expires_at)
- `progress` (user_id, track, module, item_id, status, updated_at)
- `quiz_attempts` (id, user_id, module, score, max_score, answers_json, created_at)
- `exam_attempts` (id, user_id, exam_id, score, max_score, passed, breakdown_json, answers_json, created_at)
- `card_reviews` (id, user_id, card_id, grade, interval_days, ease, due_at, created_at)

Solo mode stores the same shapes in IndexedDB.

### Auth & security

- bcrypt password hashing; server-generated opaque session token (stored in `sessions`) delivered in an httpOnly, SameSite=Lax cookie — revocable, no JWT machinery.
- Invite codes: admin generates; single-use by default, optional multi-use with expiry.
- Role check middleware on `/api/admin/*`.

### Tech choices

React 19 + Vite + TypeScript; React Router; Hono; better-sqlite3; TOML parsing via `smol-toml`; markdown via `marked` (+ sanitizer); no other heavy dependencies. Tests: vitest; Playwright for smoke.

---

## 7. Assessment Engines (`packages/core`)

- **Question schema (generic):** `{ id, track, module, type: 'single'|'multi', stem, options[], answers[], explanation, tags?: string[], lo?: string, klevel?: 'K1'|'K2'|'K3', points? }` — ISTQB metadata optional so future tracks work unchanged.
- **Quiz engine:** draw from a module's chapter bank (randomized order, shuffled options), instant feedback mode, per-question result capture.
- **Exam engine:** an exam definition declares `{ id, track, pool: track/module filter, rules: { total, perGroup?, kLevels?, timeLimitMin, passPct } }`. Assembly enforces rules exactly (e.g., ISTQB blueprint 8/6/4/11/9/2 and K 8/24/8); multi-select limited to 1–2 per exam; retake re-assembles fresh randomized sets. Autosave answers; timer enforced client-side with server-side duration sanity check in cohort mode.
- **SRS engine:** SM-2 algorithm (Anki-compatible behavior): grade ∈ {again, hard, good, easy} → interval/ease/due computation, unit-tested against known SM-2 vectors.
- **Scoring:** module % = best quiz attempt; track % = completed modules / total; exam readiness per Section 5.

---

## 8. Cohort Mode & Admin

- **Admin dashboard:** roster (last active), per-learner per-track progress, quiz/exam scores, flashcard retention, readiness flags; invite management; account create/reset; **CSV export** of cohort scores.
- **Learner PII is minimal:** username, display name only.
- **API surface:** `POST /api/auth/login|logout`, `POST /api/auth/register` (with invite code), `GET/PUT /api/progress`, `POST /api/attempts/{quiz|exam}`, `POST /api/reviews`, `GET /api/admin/roster|export`, `POST /api/admin/invites|users`.
- Solo → cohort migration: a learner's local progress can be "uploaded" once when first joining a cohort (adapter diff-and-push, one-time).

---

## 9. Content Pipeline & Validation

- **Formats:** lessons = markdown + TOML frontmatter (id, track, module, title, minutes, objectives[], videos[], diagrams[], terms[]); questions/flashcards/exams/tracks = TOML; diagrams = SVG files; manifest = `tracks.toml`.
- **Validator** (`packages/content/validate`, run in CI and at build):
  - schema validity of every file; unique IDs; manifest ↔ file cross-references
  - every question has ≥4 options (single) / ≥5 or ≥7 (multi), exactly the declared correct answers, non-empty explanation
  - every mock exam's blueprint math sums correctly (40 Q; 8/6/4/11/9/2; K 8/24/8)
  - video URLs resolve (HTTP 200 + embeddable) at authoring time; diagram files exist
  - lesson media rule: every section has ≥1 diagram and ≥1 video
- **Content PR review:** agent authors; user reviews diffs module by module.

---

## 10. TTS (Read-Aloud)

- **Provider abstraction** (`packages/core/tts`): `TtsProvider { speak(text, opts), pause, resume, stop, setRate, listVoices }`.
- **Default provider: self-hosted neural TTS sidecar** — Kokoro-82M (preferred; Apache-2.0, natural voice) or Piper fallback; packaged as an optional Docker service; server proxies `/api/tts` so no keys hit the browser.
- **Fallback provider: browser Web Speech API** — zero-config when no sidecar (solo mode).
- **Optional cloud providers** (ElevenLabs/OpenAI/Azure) selected via env config when available.
- UX: per-lesson play/pause/stop + speed control; section-by-section reading; cached audio per section in the browser (Cache API) to avoid refetch. Sentence-level karaoke highlighting = M5 stretch, not v1.

---

## 11. Deployment

- **Ondana:** `pnpm build` → static `dist/` with relative asset paths (coursekit-proven flow). Solo mode works with no server; cohort mode asks for a server URL at login.
- **Anywhere (cohort):** `docker compose up` → server container (+ SQLite volume) + optional TTS sidecar; README documents VPS/homelab/cloud deployment; `.env.example` covers port, JWT secret, TTS provider selection.
- **License:** MIT; README with architecture overview and content-authoring guide.

---

## 12. Testing Strategy

- **Unit (vitest):** SM-2 vectors; exam assembly blueprint enforcement (property tests: every generated exam matches rules); scoring; content validator rules.
- **Adapter parity:** same operation suite against LocalAdapter and ServerAdapter (supertest) must produce identical results.
- **Content gate:** validator in CI — broken content fails the build.
- **Smoke (Playwright):** register via invite → complete a lesson → pass a quiz → review cards → take a mock exam → admin roster shows activity.

---

## 13. Roadmap (walking-skeleton waves)

1. **M1 — Skeleton (thin but complete E2E):** monorepo scaffold; content system + validator; **ISTQB Module 1 complete** (lessons + quiz + deck + diagrams/videos); quiz engine; SRS engine + UI; TTS abstraction with Web Speech + Kokoro sidecar; auth + invite flow; basic admin roster; LocalAdapter + ServerAdapter; dashboard; deployed to Ondana.
2. **M2 — ISTQB content:** Modules 2–7 (lessons, decks, diagrams/videos), chapter banks to ~200 Q.
3. **M3 — Exams:** exam engine + 5 blueprint mocks + score reports + readiness indicator.
4. **M4 — AI track:** Modules 1–8 with media, quizzes, ~140 Q, 2 AI mock exams.
5. **M5 — Polish:** karaoke TTS highlighting, cohort CSV export, retention stats, accessibility pass.

Each milestone is independently shippable.

---

## 14. Future Ideas (explicitly out of v1)

- Locally rendered animated explainer videos (hyprlearn `videos` pattern) for key concepts (backprop, YOLO pipeline).
- Anki `.apkg` export/import.
- Spaced-repetition of quiz mistakes (auto-generated failed-question deck).
- Per-question cohort analytics for trainers.
- More tracks (e.g., Python basics, Git, CI/CD for testers) via the same manifest mechanism.
- Mobile-responsive polish beyond baseline responsive layout.
