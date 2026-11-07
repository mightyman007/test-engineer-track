# Test Engineer Track — M1 Walking Skeleton Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a thin-but-complete end-to-end training platform: solo + cohort modes, ISTQB Module 1 fully playable (lessons → quiz → flashcards), SRS engine, TTS read-aloud, admin roster, deployed as a static build.

**Architecture:** TypeScript pnpm monorepo. `packages/core` holds pure domain logic (content schemas, SM-2, scoring, exam assembly, TTS provider interface). `packages/content` holds the curriculum as data files plus a validator/build tool that emits one `content.json` consumed by both the SPA and the API server. `packages/storage` defines a `StorageAdapter` with an IndexedDB `LocalAdapter` (solo mode) and a REST `ServerAdapter` (cohort mode) verified by a parity test suite. `apps/server` is a Hono + better-sqlite3 API server (auth via invite codes, progress, attempts, reviews, admin, optional TTS proxy). `apps/web` is a React 19 + Vite SPA with relative asset paths for Ondana-style static hosting.

**Tech Stack:** Node ≥ 22, pnpm 10, TypeScript 5 (strict), React 19, Vite 7, React Router 7, Hono + @hono/node-server, better-sqlite3, bcryptjs, zod, smol-toml, marked + dompurify, idb, kokoro-js (dynamic import), vitest, supertest, fake-indexeddb, Playwright (smoke).

**Spec:** `docs/superpowers/specs/2026-11-07-test-engineer-track-design.md` (this plan argues from it; executors read both).

## Global Constraints

- TypeScript `strict: true` everywhere; no `any` in exported signatures; `noUncheckedIndexedAccess: true`.
- Dependency whitelist (runtime): react, react-dom, react-router, marked, dompurify, smol-toml, zod, idb, hono, @hono/node-server, better-sqlite3, bcryptjs, kokoro-js (dynamic import only). Dev-only: vitest, supertest, fake-indexeddb, @testing-library/*, jsdom, playwright, tsx, typescript.
- ISTQB mock-exam blueprint is immutable: 40 questions, 1 point each, pass 26/40 (65%), 60 minutes; per-group counts Ch1=8, Ch2=6, Ch3=4, Ch4=11, Ch5=9, Ch6=2; K-levels K1=8, K2=24, K3=8; ≤2 multi-select per exam; all-or-nothing multi scoring.
- AI mock exams: 30 questions, 45 minutes, pass 70%.
- Exam readiness: mean of last 2 exam attempts ≥ readyPct (ISTQB 80%, AI 78%).
- All content is original — never copy ISTQB official sample questions verbatim; syllabus facts and learning-objective references are fair material.
- Every lesson file must contain ≥1 diagram and ≥1 embedded video reference; every technical term in lesson prose is hyperlinked to an external resource.
- Web build is fully static with `base: './'` (relative asset paths) for Ondana upload; cohort mode works by pointing the SPA at any server URL.
- License: MIT (LICENSE already committed). Repo: `test-engineer-track`.
- Package scope: `tet-*` (`tet-core`, `tet-content`, `tet-storage`, `tet-web`, `tet-server`).
- Progression is guided-but-unlocked: order + progress markers only; no locks anywhere.

## Review Focus

The spec implies these failure modes but no task's tests fully exercise them; each line names the input, the expected behavior, and the test that pins it (added in the owning task):

1. **Thin question bank** — exam assembly when a group's bank cannot satisfy its K-level quota must fail loudly with `AssemblyError`, never emit a blueprint-violating exam. Test: `packages/core/src/exam.test.ts :: assembleExam throws AssemblyError when bank cannot satisfy quotas`.
2. **First run on a fresh browser (solo mode)** — empty IndexedDB must render the dashboard with empty states and zero due cards, never crash. Test: `apps/web/src/pages/Dashboard.test.tsx :: renders empty states on fresh storage`.
3. **Double submission / flaky network** — submitting the same quiz/exam attempt twice (same `attemptId`) must record exactly one row and return success both times. Test: `apps/server/src/routes/attempts.test.ts :: duplicate attemptId is idempotent`.
4. **Hand-edited malformed content** — the validator must reject bad files with a message naming the file and field, and the build must fail so broken content never ships. Test: `packages/content/tools/validate.test.ts :: rejects malformed files with file context`.
5. **Session expiry mid-exam (cohort mode)** — a 401 during an exam must preserve in-progress answers locally and prompt re-login, replaying autosave after re-auth, not silently lose work. Test: `apps/server/src/storage-parity.test.ts :: 401 triggers re-auth hook and buffers exam autosave`.

---

## File Structure

```
test-engineer-track/
├── package.json                  # root scripts: dev, test, build, content:build
├── pnpm-workspace.yaml           # apps/*, packages/*
├── tsconfig.base.json            # strict base config
├── .gitignore
├── .env.example                  # PORT, JWT/SESSION secret, TTS_PROVIDER, TTS_API_KEY
├── README.md                     # overview + deploy guide (Ondana + Docker)
├── docker/
│   ├── server.Dockerfile
│   └── docker-compose.yml        # server + sqlite volume (+ optional TTS env)
├── apps/
│   ├── web/                      # tet-web (React 19 + Vite SPA, base './')
│   │   ├── vite.config.ts
│   │   ├── index.html
│   │   └── src/
│   │       ├── main.tsx / App.tsx / routes.tsx / styles.css
│   │       ├── state/session.ts  # mode detection, adapter singleton, re-auth hook
│   │       ├── lib/content.ts    # fetch + parse /content.json into ContentBundle
│   │       ├── components/       # Layout, ProgressBar, VideoEmbed, Diagram, TtsPlayer, QuizRunner, ExamRunner, ReviewSession
│   │       └── pages/            # Dashboard, TrackPage, ModulePage, LessonPage, QuizPage, FlashcardsPage, ExamPage, ExamReportPage, LoginPage, AdminPage
│   └── server/                   # tet-server (Hono + better-sqlite3)
│       └── src/
│           ├── index.ts          # app assembly + static error handler
│           ├── db.ts             # open DB, run schema.sql
│           ├── schema.sql
│           ├── auth.ts           # hash/verify, tokens, middleware
│           └── routes/           # auth.ts, data.ts, admin.ts, tts.ts
├── packages/
│   ├── core/                     # tet-core (pure domain logic, zero DOM/node deps)
│   │   └── src/                  # types.ts, schema.ts, srs.ts, quiz.ts, exam.ts, scoring.ts, tts/{provider,webspeech,kokoro}.ts
│   ├── content/                  # tet-content (curriculum data + validator/build)
│   │   ├── tools/{validate.ts,build.ts,check-links.ts}
│   │   └── content/
│   │       ├── tracks.toml
│   │       ├── exams/*.toml
│   │       ├── istqb/module-1/*.md + questions.toml + flashcards.toml
│   │       └── diagrams/*.svg
│   └── storage/                  # tet-storage (adapter contract + both adapters)
│       └── src/                  # types.ts, local.ts, server.ts, parity.ts
└── docs/superpowers/             # spec + plans (committed)
```

Files that change together live together; `packages/core` never imports Node or DOM APIs (TTS web providers live in core but touch `speechSynthesis`/`fetch` only behind interfaces, so server tests never load them).

---

### Task 1: Workspace scaffold + core content types & schemas

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.gitignore`, `.env.example`, `README.md` (stub)
- Create: `packages/core/package.json`, `packages/core/tsconfig.json`
- Create: `packages/core/src/types.ts`, `packages/core/src/schema.ts`
- Test: `packages/core/src/schema.test.ts`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: every type later tasks rely on — `KLevel`, `Question`, `Flashcard`, `LessonMeta`, `Module`, `Track`, `ExamGroup`, `ExamDefinition`, `ContentBundle`, `AssembledExam`, plus zod schemas in `schema.ts`: `QuestionSchema`, `FlashcardSchema`, `LessonMetaSchema`, `ModuleSchema`, `TrackSchema`, `ExamDefinitionSchema`, `ContentBundleSchema`, and helpers `parseTrackToml(text)`, `parseQuestionsToml(text)`, `parseFlashcardsToml(text)`, `parseExamToml(text)` (each takes raw TOML text, returns parsed object or throws `ZodError`). Later tasks consume these exact names.

- [ ] **Step 1: Write the failing schema tests**

Create `packages/core/src/schema.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { QuestionSchema, parseQuestionsToml, parseExamToml } from './schema.js';

const validQuestionToml = `
[[question]]
id = "q1"
type = "single"
stem = "Which statement is true?"
options = ["A", "B", "C", "D"]
answers = [2]
explanation = "C is correct because..."
tags = ["ch1"]
klevel = "K2"
`;

describe('schema', () => {
  it('parses a valid question', () => {
    const parsed = parseQuestionsToml(validQuestionToml);
    expect(parsed[0]!.id).toBe('q1');
    expect(QuestionSchema.safeParse(parsed[0]).success).toBe(true);
  });

  it('rejects a single-answer question with fewer than 4 options', () => {
    const bad = validQuestionToml.replace(
      'options = ["A", "B", "C", "D"]', 'options = ["A", "B"]');
    expect(() => parseQuestionsToml(bad)).toThrow();
  });

  it('rejects a multi question whose answers count is not 2 or 3', () => {
    const bad = validQuestionToml
      .replace('type = "single"', 'type = "multi"')
      .replace('answers = [2]', 'answers = [0, 1, 2, 3]')
      .replace('options = ["A", "B", "C", "D"]', 'options = ["A", "B", "C", "D", "E"]');
    expect(() => parseQuestionsToml(bad)).toThrow();
  });

  it('rejects an exam whose groups do not sum to total', () => {
    const bad = `
[exam]
id = "e1"
track = "t"
title = "Exam"
timeLimitMin = 60
passPct = 65
total = 40
multiSelectMax = 2
[[exam.group]]
tag = "ch1"
count = 8
`;
    expect(() => parseExamToml(bad)).toThrow(/groups sum/);
  });

  it('exam with matching klevels and groups parses', () => {
    const good = `
[exam]
id = "e1"
track = "t"
title = "Exam"
timeLimitMin = 60
passPct = 65
total = 3
multiSelectMax = 1
[exam.klevels]
K1 = 1
K2 = 2
[[exam.group]]
tag = "ch1"
count = 3
`;
    const def = parseExamToml(good);
    expect(def.groups[0]!.count).toBe(3);
  });
});
```

- [ ] **Step 2: Scaffold the workspace so the test can run**

Root `package.json`:

```json
{
  "name": "test-engineer-track",
  "private": true,
  "type": "module",
  "engines": { "node": ">=22" },
  "scripts": {
    "test": "pnpm -r test",
    "build": "pnpm -r build",
    "content:build": "pnpm --filter tet-content build",
    "dev": "pnpm --filter tet-web dev & pnpm --filter tet-server dev & wait"
  },
  "devDependencies": {
    "typescript": "^5.7.0"
  }
}
```

`pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

`tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": false,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "sourceMap": true
  }
}
```

`.gitignore`:

```
node_modules/
dist/
content.generated*
*.sqlite3
*.sqlite3-journal
.superpowers/
test-results/
playwright-report/
apps/web/public/content.json
```

`.env.example`:

```
PORT=8787
SESSION_SECRET=change-me-to-a-long-random-string
DB_PATH=./data/tet.sqlite3
# Optional cloud TTS proxy; leave empty to serve none (web uses built-in voices)
TTS_PROVIDER=
TTS_API_KEY=
```

`packages/core/package.json`:

```json
{
  "name": "tet-core",
  "version": "0.1.0",
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "scripts": { "test": "vitest run", "build": "tsc -p tsconfig.json" },
  "dependencies": {
    "smol-toml": "^1.3.0",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  }
}
```

`packages/core/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src", "noEmit": true },
  "include": ["src"]
}
```

(`noEmit: true` — packages are consumed as TS source by Vite/tsx; typecheck-only build. `packages/core/src/index.ts` re-exports everything.)

Then `pnpm install` at repo root.

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm --filter tet-core test`
Expected: FAIL — `Cannot find module './schema.js'` (schema.ts does not exist yet).

- [ ] **Step 4: Implement schema.ts and types.ts**

`packages/core/src/types.ts`:

```ts
export type KLevel = 'K1' | 'K2' | 'K3';

export interface Question {
  id: string;
  type: 'single' | 'multi';
  stem: string;
  options: string[];
  /** Indices into options; single → length 1, multi → length 2 or 3. */
  answers: number[];
  explanation: string;
  tags: string[];
  /** Optional ISTQB learning-objective reference, e.g. "FL-1.1.1". */
  lo?: string;
  klevel?: KLevel;
}

export interface Flashcard { id: string; front: string; back: string; tags: string[]; }

export interface VideoRef { title: string; url: string; }
export interface DiagramRef { title: string; file: string; }

export interface LessonMeta {
  id: string;
  module: string;
  title: string;
  minutes: number;
  objectives: string[];
  videos: VideoRef[];
  diagrams: DiagramRef[];
  /** Full markdown body (frontmatter stripped). */
  body: string;
}

export interface Module {
  id: string;
  track: string;
  title: string;
  order: number;
  /** Directory (relative to content root) holding lesson .md files. */
  source: string;
  quizPool: string;
  deck: string;
  lessonIds: string[];
  /** Exam questions contributed by this module's chapter (informational). */
  examWeight?: number;
}

export interface TrackReadiness {
  examIds: string[];
  passPct: number;
  readyPct: number;
}

export interface Track {
  id: string;
  title: string;
  description: string;
  order: number;
  modules: Module[];
  readiness: TrackReadiness;
}

export interface ExamGroup { tag: string; count: number; }

export interface ExamDefinition {
  id: string;
  track: string;
  title: string;
  timeLimitMin: number;
  passPct: number;
  total: number;
  multiSelectMax: number;
  groups: ExamGroup[];
  klevels?: Record<KLevel, number>;
}

export interface ContentBundle {
  tracks: Track[];
  lessons: Record<string, LessonMeta>;
  questions: Question[];
  flashcards: Flashcard[];
  exams: ExamDefinition[];
  /** diagram file path → SVG text */
  diagrams: Record<string, string>;
  /** module id → question ids authored in that module's pool */
  questionsByModule: Record<string, string[]>;
  /** module id → flashcard ids authored in that module's deck */
  cardsByModule: Record<string, string[]>;
}

export interface AssembledExam {
  examId: string;
  questions: Question[];
  timeLimitMin: number;
  passPct: number;
  total: number;
  seed: number;
}
```

`packages/core/src/schema.ts` (zod + TOML parsers; cross-field rules via `.superRefine`):

```ts
import { z } from 'zod';
import { parse as parseToml } from 'smol-toml';

export const QuestionSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['single', 'multi']),
  stem: z.string().min(1),
  options: z.array(z.string().min(1)).min(4),
  answers: z.array(z.number().int().nonnegative()),
  explanation: z.string().min(1),
  tags: z.array(z.string().min(1)).min(1),
  lo: z.string().min(1).optional(),
  klevel: z.enum(['K1', 'K2', 'K3']).optional(),
}).superRefine((q, ctx) => {
  if (q.answers.some((a) => a >= q.options.length)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'answer index out of range' });
  }
  const unique = new Set(q.answers);
  if (unique.size !== q.answers.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'duplicate answer indices' });
  }
  if (q.type === 'single' && q.answers.length !== 1) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'single question must have exactly 1 answer' });
  }
  if (q.type === 'multi' && !(q.answers.length === 2 || q.answers.length === 3)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'multi question must have 2 or 3 answers' });
  }
  if (q.type === 'multi' && q.options.length < 5) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'multi question needs >= 5 options' });
  }
});

export const FlashcardSchema = z.object({
  id: z.string().min(1),
  front: z.string().min(1),
  back: z.string().min(1),
  tags: z.array(z.string().min(1)).min(1),
});

export const VideoRefSchema = z.object({ title: z.string().min(1), url: z.string().url() });
export const DiagramRefSchema = z.object({ title: z.string().min(1), file: z.string().min(1) });

export const LessonMetaSchema = z.object({
  id: z.string().min(1),
  module: z.string().min(1),
  title: z.string().min(1),
  minutes: z.number().positive(),
  objectives: z.array(z.string()),
  videos: z.array(VideoRefSchema).min(1),
  diagrams: z.array(DiagramRefSchema).min(1),
  body: z.string(),
});

export const ModuleSchema = z.object({
  id: z.string().min(1),
  track: z.string().min(1),
  title: z.string().min(1),
  order: z.number().int().positive(),
  source: z.string().min(1),
  quizPool: z.string().min(1),
  deck: z.string().min(1),
  lessonIds: z.array(z.string()),
  examWeight: z.number().int().nonnegative().optional(),
});

export const TrackReadinessSchema = z.object({
  examIds: z.array(z.string().min(1)),
  passPct: z.number().min(1).max(100),
  readyPct: z.number().min(1).max(100),
});

export const TrackSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  order: z.number().int().positive(),
  modules: z.array(ModuleSchema),
  readiness: TrackReadinessSchema,
});

export const ExamDefinitionSchema = z.object({
  id: z.string().min(1),
  track: z.string().min(1),
  title: z.string().min(1),
  timeLimitMin: z.number().positive(),
  passPct: z.number().min(1).max(100),
  total: z.number().int().positive(),
  multiSelectMax: z.number().int().nonnegative(),
  groups: z.array(z.object({ tag: z.string().min(1), count: z.number().int().positive() })).min(1),
  klevels: z.record(z.enum(['K1', 'K2', 'K3']), z.number().int().nonnegative()).optional(),
}).superRefine((e, ctx) => {
  const groupSum = e.groups.reduce((n, g) => n + g.count, 0);
  if (groupSum !== e.total) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: `groups sum ${groupSum} != total ${e.total}` });
  }
  if (e.klevels) {
    const kSum = Object.values(e.klevels).reduce((n, v) => n + v, 0);
    if (kSum !== e.total) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `klevels sum ${kSum} != total ${e.total}` });
    }
  }
});

export const ContentBundleSchema = z.object({
  tracks: z.array(TrackSchema),
  lessons: z.record(z.string(), LessonMetaSchema),
  questions: z.array(QuestionSchema),
  flashcards: z.array(FlashcardSchema),
  exams: z.array(ExamDefinitionSchema),
  diagrams: z.record(z.string(), z.string()),
  questionsByModule: z.record(z.string(), z.array(z.string())),
  cardsByModule: z.record(z.string(), z.array(z.string())),
});

type TomlTable = Record<string, unknown>;

function rows(raw: TomlTable, key: string): unknown[] {
  const v = raw[key];
  if (!Array.isArray(v)) throw new Error(`expected array-of-tables "${key}"`);
  return v;
}

export function parseQuestionsToml(text: string): Question[] {
  return rows(parseToml(text) as TomlTable, 'question').map((q) => QuestionSchema.parse(q));
}

export function parseFlashcardsToml(text: string): Flashcard[] {
  return rows(parseToml(text) as TomlTable, 'card').map((c) => FlashcardSchema.parse(c));
}

export function parseExamToml(text: string): ExamDefinition {
  const raw = parseToml(text) as TomlTable;
  const exam = raw['exam'];
  if (!exam || typeof exam !== 'object') throw new Error('exam file must contain an [exam] table');
  return ExamDefinitionSchema.parse(exam);
}

export function parseTrackToml(text: string): Track[] {
  const raw = parseToml(text) as TomlTable;
  return rows(raw, 'track').map((t) => TrackSchema.parse(t));
}

export function parseLessonMarkdown(text: string): LessonMeta {
  const match = /^\+\+\+\r?\n([\s\S]*?)\r?\n\+\+\+\r?\n?([\s\S]*)$/.exec(text);
  if (!match) throw new Error('lesson file missing +++ frontmatter block');
  const meta = parseToml(match[1]!) as TomlTable;
  return LessonMetaSchema.parse({ ...meta, body: match[2] });
}
```

Note: `parseExamToml` supports the canonical `[exam]`-nested form (used by all exam files); the double-parse line above is defensive — simplify it during implementation to a single canonical path:

```ts
export function parseExamToml(text: string): ExamDefinition {
  const raw = parseToml(text) as TomlTable;
  const exam = raw['exam'];
  if (!exam || typeof exam !== 'object') throw new Error('exam file must contain an [exam] table');
  return ExamDefinitionSchema.parse(exam);
}
```

The five test cases above must pass against this implementation.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm --filter tet-core test`
Expected: PASS — 5/5.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(core): pnpm workspace scaffold + content types and zod schemas"
```

---

### Task 2: SM-2 spaced-repetition engine

**Files:**
- Create: `packages/core/src/srs.ts`
- Test: `packages/core/src/srs.test.ts`
- Modify: `packages/core/src/index.ts` (re-export)

**Interfaces:**
- Consumes: nothing.
- Produces: `type Grade = 'again' | 'hard' | 'good' | 'easy'`; `interface CardState { ease: number; intervalDays: number; dueAt: string; reps: number; lapses: number; }` (`dueAt` = ISO string); `newCardState(): CardState`; `reviewCard(state: CardState, grade: Grade, now: Date): CardState`. Tasks 6/13/14 consume these exact names.

Algorithm (Anki-flavored SM-2, fixed rules — implement exactly):
- `newCardState()`: `{ ease: 2.5, intervalDays: 0, dueAt: now, reps: 0, lapses: 0 }`.
- `again`: `ease = max(1.3, ease - 0.2)`; `intervalDays = 0`; `dueAt = now + 10 minutes`; `reps = 0`; `lapses + 1`.
- `hard`: `ease = max(1.3, ease - 0.15)`; `intervalDays = max(1, round(intervalDays * 1.2))`; `reps + 1`.
- `good`: `reps + 1`; if `intervalDays < 1` → `intervalDays = 1`; else if `intervalDays < 6` → `intervalDays = 6`; else `intervalDays = round(intervalDays * ease)`.
- `easy`: `ease = ease + 0.15`; `reps + 1`; if `reps === 1` → `intervalDays = 4`; else `intervalDays = round(intervalDays * ease * 1.3)`.
- `dueAt = now + intervalDays * 24h` when `intervalDays >= 1`.

- [ ] **Step 1: Write the failing tests**

`packages/core/src/srs.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { newCardState, reviewCard, type Grade } from './srs.js';

const NOW = new Date('2026-11-07T12:00:00Z');
const day = 86_400_000;

describe('SM-2', () => {
  it('new card state has Anki defaults', () => {
    const s = newCardState();
    expect(s).toMatchObject({ ease: 2.5, intervalDays: 0, reps: 0, lapses: 0 });
  });

  it('good on a new card schedules 1 day', () => {
    const s = reviewCard(newCardState(), 'good', NOW);
    expect(s.intervalDays).toBe(1);
    expect(s.dueAt).toBe(new Date(NOW.getTime() + day).toISOString());
    expect(s.reps).toBe(1);
  });

  it('good,good,good walks 1 → 6 → 15 at ease 2.5', () => {
    const a = reviewCard(newCardState(), 'good', NOW);
    const b = reviewCard(a, 'good', NOW);
    const c = reviewCard(b, 'good', NOW);
    expect(b.intervalDays).toBe(6);
    expect(c.intervalDays).toBe(15); // round(6 * 2.5)
  });

  it('easy on a new card schedules 4 days and raises ease', () => {
    const s = reviewCard(newCardState(), 'easy', NOW);
    expect(s.intervalDays).toBe(4);
    expect(s.ease).toBeCloseTo(2.65);
  });

  it('again lapses: resets reps, cuts ease, due in 10 minutes', () => {
    const grown = reviewCard(reviewCard(newCardState(), 'good', NOW), 'good', NOW);
    const lapsed = reviewCard(grown, 'again', NOW);
    expect(lapsed.reps).toBe(0);
    expect(lapsed.lapses).toBe(1);
    expect(lapsed.ease).toBeCloseTo(2.3);
    expect(lapsed.intervalDays).toBe(0);
    expect(new Date(lapsed.dueAt).getTime() - NOW.getTime()).toBe(10 * 60_000);
  });

  it('hard multiplies by 1.2 and lowers ease, floored at 1.3', () => {
    const grown = reviewCard(reviewCard(reviewCard(newCardState(), 'good', NOW), 'good', NOW), 'good', NOW);
    const h = reviewCard(grown, 'hard', NOW);
    expect(h.ease).toBeCloseTo(2.35);
    expect(h.intervalDays).toBe(18); // round(15 * 1.2)
    let s = grown;
    for (let i = 0; i < 20; i++) s = reviewCard(s, 'again', NOW);
    expect(s.ease).toBe(1.3); // floor holds
  });

  it('easy grows faster than good from a mature interval', () => {
    const base = reviewCard(reviewCard(reviewCard(newCardState(), 'good', NOW), 'good', NOW), 'good', NOW); // 15d, ease 2.5
    const g = reviewCard(base, 'good', NOW);  // round(15*2.5) = 38
    const e = reviewCard(base, 'easy', NOW);  // round(15*2.65*1.3) = 52
    expect(g.intervalDays).toBe(38);
    expect(e.intervalDays).toBe(52);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter tet-core test -- srs`
Expected: FAIL — `Cannot find module './srs.js'`.

- [ ] **Step 3: Implement srs.ts**

```ts
export type Grade = 'again' | 'hard' | 'good' | 'easy';

export interface CardState {
  ease: number;
  intervalDays: number;
  dueAt: string; // ISO
  reps: number;
  lapses: number;
}

export function newCardState(now: Date = new Date()): CardState {
  return { ease: 2.5, intervalDays: 0, dueAt: now.toISOString(), reps: 0, lapses: 0 };
}

const MIN = 60_000;
const DAY = 86_400_000;
const MIN_EASE = 1.3;

function fromNow(base: Date, ms: number): string {
  return new Date(base.getTime() + ms).toISOString();
}

export function reviewCard(state: CardState, grade: Grade, now: Date = new Date()): CardState {
  const s: CardState = { ...state };
  switch (grade) {
    case 'again':
      s.ease = Math.max(MIN_EASE, s.ease - 0.2);
      s.intervalDays = 0;
      s.reps = 0;
      s.lapses += 1;
      return { ...s, dueAt: fromNow(now, 10 * MIN) };
    case 'hard': {
      s.ease = Math.max(MIN_EASE, s.ease - 0.15);
      s.intervalDays = Math.max(1, Math.round(s.intervalDays * 1.2));
      s.reps += 1;
      break;
    }
    case 'good': {
      s.reps += 1;
      if (s.intervalDays < 1) s.intervalDays = 1;
      else if (s.intervalDays < 6) s.intervalDays = 6;
      else s.intervalDays = Math.round(s.intervalDays * s.ease);
      break;
    }
    case 'easy': {
      s.ease = s.ease + 0.15;
      s.reps += 1;
      s.intervalDays = s.reps === 1 ? 4 : Math.round(s.intervalDays * s.ease * 1.3);
      break;
    }
  }
  return { ...s, dueAt: fromNow(now, s.intervalDays * DAY) };
}
```

(Edge: `easy` after `again` → reps becomes 1 → 4 days, matching Anki relearning+ease behavior closely enough for our purposes. The test "easy grows faster" constructs `base` with reps=3, so `easy` takes the mature branch.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter tet-core test -- srs`
Expected: PASS — 7/7.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/srs.ts packages/core/src/srs.test.ts packages/core/src/index.ts
git commit -m "feat(core): SM-2 spaced-repetition engine with Anki-compatible grading"
```

---

### Task 3: Scoring + exam assembly engine

**Files:**
- Create: `packages/core/src/quiz.ts`, `packages/core/src/exam.ts`, `packages/core/src/scoring.ts`
- Test: `packages/core/src/quiz.test.ts`, `packages/core/src/exam.test.ts`, `packages/core/src/scoring.test.ts`
- Modify: `packages/core/src/index.ts` (re-exports)

**Interfaces:**
- Consumes: `Question`, `ExamDefinition`, `AssembledExam` from Task 1.
- Produces (exact signatures for later tasks):
  - `gradeAnswer(q: Question, selected: number[]): boolean` (multi = all-or-nothing)
  - `scoreAttempt(questions: Question[], responses: Record<string, number[]>): { score: number; max: number; perQuestion: Record<string, boolean> }`
  - `AssemblyError` class; `mulberry32(seed: number): () => number`; `assembleExam(def: ExamDefinition, pool: Question[], seed: number): AssembledExam` (deterministic per seed; tries seeds `seed..seed+49`; throws `AssemblyError` when constraints are unsatisfiable)
  - `isReady(attempts: { scorePct: number }[], readyPct: number, minAttempts?: number): boolean`
  - `trackCompletion(moduleIds: string[], done: Set<string>): number` (0..1)

- [ ] **Step 1: Write the failing quiz tests**

`packages/core/src/quiz.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { gradeAnswer, scoreAttempt } from './quiz.js';
import type { Question } from './types.js';

const single: Question = {
  id: 's1', type: 'single', stem: 's', options: ['a', 'b', 'c', 'd'],
  answers: [2], explanation: 'e', tags: ['ch1'],
};
const multi: Question = {
  id: 'm1', type: 'multi', stem: 'm', options: ['a', 'b', 'c', 'd', 'e'],
  answers: [0, 2], explanation: 'e', tags: ['ch1'],
};

describe('gradeAnswer', () => {
  it('single: exact index match', () => {
    expect(gradeAnswer(single, [2])).toBe(true);
    expect(gradeAnswer(single, [1])).toBe(false);
  });
  it('multi: all-or-nothing, order-insensitive', () => {
    expect(gradeAnswer(multi, [2, 0])).toBe(true);
    expect(gradeAnswer(multi, [0])).toBe(false);
    expect(gradeAnswer(multi, [0, 2, 4])).toBe(false);
  });
});

describe('scoreAttempt', () => {
  it('scores 1 point per correct question, records per-question results', () => {
    const r = scoreAttempt([single, multi], { s1: [2], m1: [0] });
    expect(r).toEqual({ score: 1, max: 2, perQuestion: { s1: true, m1: false } });
  });
  it('unanswered questions score false, not crash', () => {
    const r = scoreAttempt([single, multi], {});
    expect(r.score).toBe(0);
    expect(r.perQuestion).toEqual({ s1: false, m1: false });
  });
});
```

- [ ] **Step 2: Write the failing exam tests**

`packages/core/src/exam.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { assembleExam, mulberry32, AssemblyError } from './exam.js';
import type { ExamDefinition, Question } from './types.js';

function bank(counts: Record<string, { K1: number; K2: number; K3: number; multi: number }>): Question[] {
  const out: Question[] = [];
  let n = 0;
  for (const [tag, c] of Object.entries(counts)) {
    for (const k of ['K1', 'K2', 'K3'] as const) {
      for (let i = 0; i < c[k]; i++) {
        out.push({
          id: `q${n++}`, type: 'single', stem: tag + k, options: ['a', 'b', 'c', 'd'],
          answers: [0], explanation: 'e', tags: [tag], klevel: k,
        });
      }
    }
    for (let i = 0; i < c.multi; i++) {
      out.push({
        id: `q${n++}`, type: 'multi', stem: tag + 'multi', options: ['a', 'b', 'c', 'd', 'e'],
        answers: [0, 1], explanation: 'e', tags: [tag], klevel: 'K2',
      });
    }
  }
  return out;
}

const BLUEPRINT: ExamDefinition = {
  id: 'mock1', track: 'istqb', title: 'Mock 1', timeLimitMin: 60, passPct: 65,
  total: 40, multiSelectMax: 2,
  groups: [
    { tag: 'ch1', count: 8 }, { tag: 'ch2', count: 6 }, { tag: 'ch3', count: 4 },
    { tag: 'ch4', count: 11 }, { tag: 'ch5', count: 9 }, { tag: 'ch6', count: 2 },
  ],
  klevels: { K1: 8, K2: 24, K3: 8 },
};

const RICH_BANK = bank({
  ch1: { K1: 4, K2: 10, K3: 2, multi: 2 },
  ch2: { K1: 3, K2: 8, K3: 1, multi: 1 },
  ch3: { K1: 2, K2: 6, K3: 2, multi: 1 },
  ch4: { K1: 5, K2: 12, K3: 14, multi: 3 },
  ch5: { K1: 4, K2: 10, K3: 8, multi: 2 },
  ch6: { K1: 1, K2: 3, K3: 0, multi: 0 },
});

describe('assembleExam', () => {
  it('produces an exam matching the blueprint exactly', () => {
    const exam = assembleExam(BLUEPRINT, RICH_BANK, 1);
    expect(exam.questions).toHaveLength(40);
    const byTag: Record<string, number> = {};
    const byK: Record<string, number> = {};
    let multi = 0;
    for (const q of exam.questions) {
      for (const t of q.tags) byTag[t] = (byTag[t] ?? 0) + 1;
      if (q.klevel) byK[q.klevel] = (byK[q.klevel] ?? 0) + 1;
      if (q.type === 'multi') multi++;
    }
    expect(byTag).toEqual({ ch1: 8, ch2: 6, ch3: 4, ch4: 11, ch5: 9, ch6: 2 });
    expect(byK).toEqual({ K1: 8, K2: 24, K3: 8 });
    expect(multi).toBeLessThanOrEqual(2);
    // no duplicate questions
    expect(new Set(exam.questions.map((q) => q.id)).size).toBe(40);
  });

  it('is deterministic for a given seed', () => {
    const a = assembleExam(BLUEPRINT, RICH_BANK, 7);
    const b = assembleExam(BLUEPRINT, RICH_BANK, 7);
    expect(a.questions.map((q) => q.id)).toEqual(b.questions.map((q) => q.id));
  });

  it('different seeds yield different orderings (usually)', () => {
    const a = assembleExam(BLUEPRINT, RICH_BANK, 1);
    const b = assembleExam(BLUEPRINT, RICH_BANK, 2);
    expect(a.questions.map((q) => q.id)).not.toEqual(b.questions.map((q) => q.id));
  });

  it('throws AssemblyError when K-level quotas cannot be met', () => {
    // Remove all K3 questions from ch4 and ch5: remaining K3 capacity
    // (ch1:2, ch2:1, ch3:2 = 5) is below the K3 quota of 8, and no seed can fix that.
    const thin = RICH_BANK.filter(
      (q) => !(q.klevel === 'K3' && (q.tags[0] === 'ch4' || q.tags[0] === 'ch5')),
    );
    expect(() => assembleExam(BLUEPRINT, thin, 1)).toThrow(AssemblyError);
  });

  it('throws AssemblyError when a group bank is smaller than its count', () => {
    const tiny = RICH_BANK.filter((q) => q.tags[0] !== 'ch1');
    expect(() => assembleExam(BLUEPRINT, tiny, 1)).toThrow(AssemblyError);
  });

  it('mulberry32 is deterministic', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = [a(), a(), a()];
    const seqB = [b(), b(), b()];
    expect(seqA).toEqual(seqB);
    expect(seqA[0]).toBeGreaterThan(0);
    expect(seqA[0]).toBeLessThan(1);
  });
});
```

- [ ] **Step 3: Write the failing scoring tests**

`packages/core/src/scoring.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { isReady, trackCompletion } from './scoring.js';

describe('isReady', () => {
  it('requires minAttempts (default 2) and average >= readyPct', () => {
    expect(isReady([{ scorePct: 90 }, { scorePct: 85 }], 80)).toBe(true);
    expect(isReady([{ scorePct: 90 }], 80)).toBe(false);
    expect(isReady([{ scorePct: 90 }, { scorePct: 60 }], 80)).toBe(false);
  });
});

describe('trackCompletion', () => {
  it('fraction of completed modules', () => {
    expect(trackCompletion(['a', 'b', 'c', 'd'], new Set(['a', 'c']))).toBe(0.5);
    expect(trackCompletion([], new Set())).toBe(0);
  });
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `pnpm --filter tet-core test`
Expected: FAIL — modules `./quiz.js`, `./exam.js`, `./scoring.js` not found.

- [ ] **Step 5: Implement quiz.ts, scoring.ts, exam.ts**

`packages/core/src/quiz.ts`:

```ts
import type { Question } from './types.js';

export function gradeAnswer(q: Question, selected: number[]): boolean {
  const want = [...q.answers].sort((a, b) => a - b);
  const got = [...selected].sort((a, b) => a - b);
  return want.length === got.length && want.every((v, i) => v === got[i]);
}

export function scoreAttempt(
  questions: Question[],
  responses: Record<string, number[]>,
): { score: number; max: number; perQuestion: Record<string, boolean> } {
  let score = 0;
  const perQuestion: Record<string, boolean> = {};
  for (const q of questions) {
    const ok = gradeAnswer(q, responses[q.id] ?? []);
    perQuestion[q.id] = ok;
    if (ok) score += 1;
  }
  return { score, max: questions.length, perQuestion };
}
```

`packages/core/src/scoring.ts`:

```ts
export function isReady(
  attempts: { scorePct: number }[],
  readyPct: number,
  minAttempts = 2,
): boolean {
  if (attempts.length < minAttempts) return false;
  const last = attempts.slice(-minAttempts);
  const mean = last.reduce((n, a) => n + a.scorePct, 0) / last.length;
  return mean >= readyPct;
}

export function trackCompletion(moduleIds: string[], done: Set<string>): number {
  if (moduleIds.length === 0) return 0;
  return moduleIds.filter((id) => done.has(id)).length / moduleIds.length;
}
```

`packages/core/src/exam.ts`:

```ts
import type { AssembledExam, ExamDefinition, KLevel, Question } from './types.js';

export class AssemblyError extends Error {
  constructor(message: string) { super(message); this.name = 'AssemblyError'; }
}

/** Small, fast, seedable PRNG — sufficient for shuffling. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(items: T[], rng: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

/**
 * Assemble an exam matching def exactly: per-group counts, K-level quotas,
 * and the multi-select cap. Deterministic for a given seed; tries 50 seeds
 * before giving up. Question order is shuffled; option order is preserved
 * (ISTQB options may include order-sensitive phrasings).
 */
export function assembleExam(
  def: ExamDefinition,
  pool: Question[],
  seed: number,
): AssembledExam {
  const kQuota = def.klevels ? ({ ...def.klevels } as Record<KLevel, number>) : null;
  let lastReason = 'unknown';
  for (let attempt = 0; attempt < 50; attempt++) {
    const rng = mulberry32(seed + attempt);
    const picked: Question[] = [];
    const used = new Set<string>();
    const kLeft = kQuota ? { ...kQuota } : null;
    let multiUsed = 0;
    let feasible = true;

    // Draw groups largest-first so scarce groups pick their fitting questions early.
    const groups = [...def.groups].sort((a, b) => b.count - a.count);
    for (const g of groups) {
      const candidates = pool.filter(
        (q) => !used.has(q.id) && q.tags.includes(g.tag) && !picked.includes(q),
      );
      const chosen = drawGroup(candidates, g.count, kLeft, def.multiSelectMax, () => multiUsed, rng);
      if (!chosen) { feasible = false; lastReason = `group ${g.tag} could not draw ${g.count}`; break; }
      for (const q of chosen) {
        used.add(q.id);
        picked.push(q);
        if (q.type === 'multi') multiUsed++;
      }
    }
    if (!feasible) continue;
    if (kLeft && Object.values(kLeft).some((v) => v !== 0)) {
      lastReason = `klevel quotas unmet: ${JSON.stringify(kLeft)}`;
      continue;
    }
    return {
      examId: def.id,
      questions: shuffled(picked, rng),
      timeLimitMin: def.timeLimitMin,
      passPct: def.passPct,
      total: def.total,
      seed: seed + attempt,
    };
  }
  throw new AssemblyError(
    `cannot assemble exam "${def.id}" from bank of ${pool.length}: ${lastReason}`,
  );
}

/**
 * Pick `count` questions from candidates, respecting remaining K quotas
 * (when set — decremented as picks happen) and the global multi-select cap.
 * Candidates are bucketed by quota-urgency rank (open quota first), each
 * bucket shuffled; the checks below still enforce the hard constraints
 * regardless of order.
 */
function drawGroup(
  candidates: Question[],
  count: number,
  kLeft: Record<KLevel, number> | null,
  multiSelectMax: number,
  multiUsed: () => number,
  rng: () => number,
): Question[] | null {
  if (candidates.length < count) return null;

  const byRank = new Map<number, Question[]>();
  for (const q of candidates) {
    const r = rank(q);
    const list = byRank.get(r) ?? [];
    list.push(q);
    byRank.set(r, list);
  }
  const ordered = [...byRank.keys()].sort((a, b) => a - b)
    .flatMap((r) => shuffled(byRank.get(r)!, rng));

  const picked: Question[] = [];
  for (const q of ordered) {
    if (picked.length === count) break;
    if (q.type === 'multi' && multiUsed() + 1 > multiSelectMax) continue;
    if (kLeft && q.klevel && kLeft[q.klevel] !== undefined) {
      if (kLeft[q.klevel] <= 0) continue;
      kLeft[q.klevel] -= 1; // decrement as we pick so quota is enforced within the group
    }
    picked.push(q);
  }
  return picked.length === count ? picked : null;

  /** Sort key: questions with a K-level quota still open come first. */
  function rank(q: Question): number {
    if (!kLeft || !q.klevel || kLeft[q.klevel] === undefined) return 2;
    return kLeft[q.klevel] > 0 ? 0 : 1;
  }
}
```

(Reviewers: the greedy + 50-seed retry is intentionally simple; property tests prove correctness of outputs, and the thin-bank test proves the loud failure path. If a real bank hits the 50-retry cap, the validator's capacity check (Task 4) catches it at build time.)

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm --filter tet-core test`
Expected: PASS — quiz 4/4, exam 6/6, scoring 3/3, srs 7/7, schema 5/5.

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/
git commit -m "feat(core): quiz scoring, SM-2-backed scoring helpers, blueprint exam assembly"
```

---

### Task 4: Content validator + build tool

**Files:**
- Create: `packages/content/package.json`, `packages/content/tsconfig.json`, `packages/content/src/index.ts`
- Create: `packages/content/tools/validate.ts`, `packages/content/tools/build.ts`, `packages/content/tools/check-links.ts`
- Test: `packages/content/tools/validate.test.ts`, `packages/content/tools/build.test.ts`

**Interfaces:**
- Consumes: `parseTrackToml`, `parseQuestionsToml`, `parseFlashcardsToml`, `parseExamToml`, `parseLessonMarkdown`, all types from `tet-core` (Task 1).
- Produces:
  - `interface Diagnostic { file: string; message: string }`
  - `validateContent(input: ValidationInput): Diagnostic[]` where `ValidationInput = { tracks: Track[]; lessons: LessonMeta[]; questions: Question[]; flashcards: Flashcard[]; exams: ExamDefinition[]; diagramFiles: Map<string, string> }`
  - `collectContent(contentRoot: string): { pieces: ValidationInput; diagrams: Record<string, string> }` (walks the content tree; throws on parse errors with file paths)
  - `buildContentJson(contentRoot: string): ContentBundle` (validate → throw on diagnostics → emit bundle sorted by `order`)
  - CLI: `pnpm --filter tet-content build` → writes `packages/content/content.json` and copies it to `apps/web/public/content.json`; exits 1 with printed diagnostics on failure.
  - `check-links.ts`: `pnpm --filter tet-content check-links` → verifies every video URL returns 200 from YouTube's oEmbed endpoint (`https://www.youtube.com/oembed?url=<url>&format=json`); exits 1 listing dead links. Not part of the default build (network-dependent).

- [ ] **Step 1: Write the failing validator tests**

`packages/content/tools/validate.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { validateContent } from './validate.js';
import type { ExamDefinition, Flashcard, LessonMeta, Question, Track } from 'tet-core';

function baseTrack(): Track {
  return {
    id: 't1', title: 'T', description: 'D', order: 1,
    modules: [{
      id: 'm1', track: 't1', title: 'M1', order: 1,
      source: 'istqb/module-1', quizPool: 'istqb/module-1', deck: 'istqb/module-1',
      lessonIds: ['l1'], examWeight: 8,
    }],
    readiness: { examIds: ['e1'], passPct: 65, readyPct: 80 },
  };
}
function baseLesson(): LessonMeta {
  return {
    id: 'l1', module: 'm1', title: 'L1', minutes: 10, objectives: [],
    videos: [{ title: 'v', url: 'https://www.youtube.com/watch?v=abc' }],
    diagrams: [{ title: 'd', file: 'diagrams/x.svg' }], body: 'body',
  };
}
function baseQuestion(): Question {
  return {
    id: 'q1', type: 'single', stem: 's', options: ['a', 'b', 'c', 'd'],
    answers: [0], explanation: 'e', tags: ['ch1'], klevel: 'K1',
  };
}
function baseCard(): Flashcard {
  return { id: 'c1', front: 'f', back: 'b', tags: ['ch1'] };
}
function baseExam(): ExamDefinition {
  return {
    id: 'e1', track: 't1', title: 'E', timeLimitMin: 60, passPct: 65,
    total: 1, multiSelectMax: 0, groups: [{ tag: 'ch1', count: 1 }],
  };
}

const diagrams = new Map([['diagrams/x.svg', '<svg xmlns="http://www.w3.org/2000/svg"/>']]);

function input(overrides: Partial<Parameters<typeof validateContent>[0]> = {}) {
  return {
    tracks: [baseTrack()], lessons: [baseLesson()],
    questions: [baseQuestion()], flashcards: [baseCard()], exams: [baseExam()],
    diagramFiles: diagrams, ...overrides,
  };
}

describe('validateContent', () => {
  it('accepts a fully consistent bundle', () => {
    expect(validateContent(input())).toEqual([]);
  });

  it('flags duplicate question ids with file context', () => {
    const q2 = { ...baseQuestion(), id: 'q1' };
    const d = validateContent(input({ questions: [baseQuestion(), q2] }));
    expect(d.some((x) => x.message.includes('duplicate') && x.message.includes('q1'))).toBe(true);
  });

  it('flags a lesson whose module does not exist', () => {
    const l = { ...baseLesson(), module: 'nope' };
    const d = validateContent(input({ lessons: [l] }));
    expect(d.some((x) => x.message.includes('nope'))).toBe(true);
  });

  it('flags a missing diagram file', () => {
    const l = baseLesson();
    l.diagrams = [{ title: 'd', file: 'diagrams/missing.svg' }];
    const d = validateContent(input({ lessons: [l] }));
    expect(d.some((x) => x.file.includes('lesson') && x.message.includes('missing.svg'))).toBe(true);
  });

  it('flags a lesson with no video', () => {
    const l = { ...baseLesson(), videos: [] };
    const d = validateContent(input({ lessons: [l] }));
    expect(d.some((x) => x.message.includes('video'))).toBe(true);
  });

  it('flags an exam whose group tag has no bank questions', () => {
    const e = baseExam();
    e.groups = [{ tag: 'ch9', count: 1 }];
    const d = validateContent(input({ exams: [e] }));
    expect(d.some((x) => x.message.includes('ch9'))).toBe(true);
  });

  it('flags an exam whose K quota exceeds bank capacity', () => {
    const e = baseExam();
    e.total = 2; e.klevels = { K1: 2, K2: 0, K3: 0 };
    e.groups = [{ tag: 'ch1', count: 2 }];
    const d = validateContent(input({
      questions: [baseQuestion(), { ...baseQuestion(), id: 'q2', klevel: 'K2' }],
      exams: [e],
    }));
    expect(d.some((x) => x.message.includes('K1'))).toBe(true);
  });

  it('flags a track referencing a missing exam', () => {
    const t = baseTrack();
    t.readiness.examIds = ['missing-exam'];
    const d = validateContent(input({ tracks: [t] }));
    expect(d.some((x) => x.message.includes('missing-exam'))).toBe(true);
  });

  it('flags duplicate flashcard ids', () => {
    const d = validateContent(input({ flashcards: [baseCard(), baseCard()] }));
    expect(d.some((x) => x.message.includes('c1'))).toBe(true);
  });
});
```

`packages/content/tools/build.test.ts` — end-to-end through the real file walker using a temp content root:

```ts
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildContentJson } from './build.js';

function seedRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'tet-content-'));
  writeFileSync(join(root, 'tracks.toml'), `
[[track]]
id = "t1"
title = "T"
description = "D"
order = 1
readiness_passPct = 65
readiness_readyPct = 80
readiness_examIds = ["e1"]
[[track.module]]
id = "m1"
track = "t1"
title = "M1"
order = 1
source = "m1"
quizPool = "m1"
deck = "m1"
lessonIds = ["l1"]
examWeight = 8
`);
  writeFileSync(join(root, 'exams', 'e1.toml'), `
[exam]
id = "e1"
track = "t1"
title = "E"
timeLimitMin = 60
passPct = 65
total = 1
multiSelectMax = 0
[[exam.group]]
tag = "ch1"
count = 1
`);
  mkdirSync(join(root, 'm1'));
  writeFileSync(join(root, 'm1', 'lesson-01.md'), `+++
id = "l1"
module = "m1"
title = "L1"
minutes = 10
objectives = []
videos = [{ title = "v", url = "https://www.youtube.com/watch?v=abc" }]
diagrams = [{ title = "d", file = "diagrams/x.svg" }]
+++
# L1
`);
  writeFileSync(join(root, 'm1', 'questions.toml'), `
[[question]]
id = "q1"
type = "single"
stem = "s"
options = ["a", "b", "c", "d"]
answers = [0]
explanation = "e"
tags = ["ch1"]
klevel = "K1"
`);
  writeFileSync(join(root, 'm1', 'flashcards.toml'), `
[[card]]
id = "c1"
front = "f"
back = "b"
tags = ["ch1"]
`);
  mkdirSync(join(root, 'diagrams'));
  writeFileSync(join(root, 'diagrams', 'x.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
  return root;
}

describe('buildContentJson', () => {
  it('walks the tree, validates, and emits a ContentBundle', () => {
    const bundle = buildContentJson(seedRoot());
    expect(bundle.tracks).toHaveLength(1);
    expect(bundle.tracks[0]!.modules[0]!.lessonIds).toEqual(['l1']);
    expect(bundle.lessons['l1']!.title).toBe('L1');
    expect(bundle.questions).toHaveLength(1);
    expect(bundle.flashcards).toHaveLength(1);
    expect(bundle.questionsByModule['m1']).toEqual(['q1']);
    expect(bundle.cardsByModule['m1']).toEqual(['c1']);
    expect(bundle.exams[0]!.id).toBe('e1');
    expect(bundle.diagrams['diagrams/x.svg']).toContain('<svg');
  });

  it('throws listing diagnostics when content is broken', () => {
    const root = seedRoot();
    writeFileSync(join(root, 'm1', 'questions.toml'), '[[question]]\nid = "q1"\n');
    expect(() => buildContentJson(root)).toThrow(/q1/);
  });
});
```

Note: the track TOML uses flattened readiness keys (`readiness_passPct`, …) because `[[track.module]]` arrays and nested `[track.readiness]` tables conflict in TOML array-of-tables syntax. `parseTrackToml` must map flattened keys → nested `readiness` object before `TrackSchema.parse` (implementation detail of `parseTrackToml` in Task 1; the build test above pins it — if Task 1's implementation parsed nested `readiness` instead, Task 4's test is the ruling: flattened keys win).

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter tet-content test`
Expected: FAIL — `tools/validate.js` not found (also tet-content not yet scaffolded).

- [ ] **Step 3: Scaffold tet-content and implement validate.ts**

`packages/content/package.json`:

```json
{
  "name": "tet-content",
  "version": "0.1.0",
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./content.json": "./content.json"
  },
  "scripts": {
    "build": "tsx tools/build.ts",
    "check-links": "tsx tools/check-links.ts",
    "test": "vitest run"
  },
  "dependencies": {
    "tet-core": "workspace:*",
    "smol-toml": "^1.3.0",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "tsx": "^4.19.0",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  }
}
```

`packages/content/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "noEmit": true },
  "include": ["src", "tools"]
}
```

`packages/content/src/index.ts`: `export * from '../tools/validate.js';`

`packages/content/tools/validate.ts`:

```ts
import type {
  ExamDefinition, Flashcard, LessonMeta, Question, Track,
} from 'tet-core';

export interface Diagnostic { file: string; message: string; }

export interface ValidationInput {
  tracks: Track[];
  lessons: LessonMeta[];
  questions: Question[];
  flashcards: Flashcard[];
  exams: ExamDefinition[];
  /** diagram relpath → SVG text */
  diagramFiles: Map<string, string>;
}

function dupes(ids: string[]): string[] {
  const seen = new Set<string>();
  const dups: string[] = [];
  for (const id of ids) {
    if (seen.has(id)) dups.push(id);
    seen.add(id);
  }
  return dups;
}

export function validateContent(input: ValidationInput): Diagnostic[] {
  const d: Diagnostic[] = [];
  const moduleIds = new Set(input.tracks.flatMap((t) => t.modules.map((m) => m.id)));
  const trackIds = new Set(input.tracks.map((t) => t.id));
  const examIds = new Set(input.exams.map((e) => e.id));

  const lessonIds = dupes(input.lessons.map((l) => l.id));
  for (const id of lessonIds) d.push({ file: 'lessons', message: `duplicate lesson id ${id}` });

  const questionIds = dupes(input.questions.map((q) => q.id));
  for (const id of questionIds) d.push({ file: 'questions', message: `duplicate question id ${id}` });

  const cardIds = dupes(input.flashcards.map((c) => c.id));
  for (const id of cardIds) d.push({ file: 'flashcards', message: `duplicate flashcard id ${id}` });

  const trackIdDupes = dupes(input.tracks.map((t) => t.id));
  for (const id of trackIdDupes) d.push({ file: 'tracks.toml', message: `duplicate track id ${id}` });

  const moduleFlat = input.tracks.flatMap((t) => t.modules);
  const moduleIdDupes = dupes(moduleFlat.map((m) => m.id));
  for (const id of moduleIdDupes) d.push({ file: 'tracks.toml', message: `duplicate module id ${id}` });

  const examIdDupes = dupes(input.exams.map((e) => e.id));
  for (const id of examIdDupes) d.push({ file: 'exams', message: `duplicate exam id ${id}` });

  for (const lesson of input.lessons) {
    const file = `lesson:${lesson.id}`;
    if (!moduleIds.has(lesson.module)) {
      d.push({ file, message: `lesson references unknown module ${lesson.module}` });
    }
    if (lesson.videos.length === 0) d.push({ file, message: 'lesson must include at least one video' });
    if (lesson.diagrams.length === 0) d.push({ file, message: 'lesson must include at least one diagram' });
    for (const dia of lesson.diagrams) {
      if (!input.diagramFiles.has(dia.file)) {
        d.push({ file, message: `missing diagram file ${dia.file}` });
      }
    }
  }

  for (const mod of moduleFlat) {
    const file = `module:${mod.id}`;
    if (!trackIds.has(mod.track)) d.push({ file, message: `module references unknown track ${mod.track}` });
    for (const lid of mod.lessonIds) {
      const lesson = input.lessons.find((l) => l.id === lid);
      if (!lesson) d.push({ file, message: `module lists missing lesson ${lid}` });
      else if (lesson.module !== mod.id) {
        d.push({ file, message: `lesson ${lid} declares module ${lesson.module}, not ${mod.id}` });
      }
    }
  }

  // Exam capacity: group tag coverage and K-level supply.
  const tagCount = new Map<string, number>();
  const kCount = new Map<string, number>();
  for (const q of input.questions) {
    for (const t of q.tags) tagCount.set(t, (tagCount.get(t) ?? 0) + 1);
    if (q.klevel) kCount.set(q.klevel, (kCount.get(q.klevel) ?? 0) + 1);
  }
  for (const exam of input.exams) {
    const file = `exam:${exam.id}`;
    if (!trackIds.has(exam.track)) d.push({ file, message: `exam references unknown track ${exam.track}` });
    for (const g of exam.groups) {
      const have = tagCount.get(g.tag) ?? 0;
      if (have < g.count) {
        d.push({ file, message: `group ${g.tag} needs ${g.count} questions, bank has ${have}` });
      }
    }
    if (exam.klevels) {
      for (const [k, need] of Object.entries(exam.klevels)) {
        const have = kCount.get(k) ?? 0;
        if (have < need) {
          d.push({ file, message: `${k} quota ${need} exceeds bank supply ${have}` });
        }
      }
    }
  }

  for (const track of input.tracks) {
    const file = `track:${track.id}`;
    for (const eid of track.readiness.examIds) {
      if (!examIds.has(eid)) d.push({ file, message: `readiness references missing exam ${eid}` });
    }
  }

  return d;
}
```

- [ ] **Step 4: Implement build.ts and check-links.ts**

`packages/content/tools/build.ts`:

```ts
import { readdirSync, readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseTrackToml, parseQuestionsToml, parseFlashcardsToml, parseExamToml,
  parseLessonMarkdown,
} from 'tet-core';
import type { ContentBundle, LessonMeta, Track } from 'tet-core';
import { validateContent, type Diagnostic } from './validate.js';

const CONTENT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'content');

export function collectContent(root: string): {
  tracks: Track[];
  lessons: LessonMeta[];
  questions: ReturnType<typeof parseQuestionsToml>;
  flashcards: ReturnType<typeof parseFlashcardsToml>;
  exams: ReturnType<typeof parseExamToml>[];
  diagrams: Record<string, string>;
  questionsByModule: Record<string, string[]>;
  cardsByModule: Record<string, string[]>;
} {
  const tracks = parseTrackToml(readFileSync(join(root, 'tracks.toml'), 'utf8'));

  const exams: ReturnType<typeof parseExamToml>[] = [];
  const examsDir = join(root, 'exams');
  for (const f of readdirSync(examsDir).filter((f) => f.endsWith('.toml'))) {
    exams.push(parseExamToml(readFileSync(join(examsDir, f), 'utf8')));
  }

  const lessons: LessonMeta[] = [];
  const questions: ReturnType<typeof parseQuestionsToml> = [];
  const flashcards: ReturnType<typeof parseFlashcardsToml> = [];
  const questionsByModule: Record<string, string[]> = {};
  const cardsByModule: Record<string, string[]> = {};
  const diagramFiles = new Map<string, string>();

  for (const track of tracks) {
    for (const mod of track.modules) {
      const dir = join(root, mod.source);
      const files = readdirSync(dir).sort();
      const modQuestions: string[] = [];
      const modCards: string[] = [];
      for (const f of files.filter((x) => x.endsWith('.md'))) {
        lessons.push(parseLessonMarkdown(readFileSync(join(dir, f), 'utf8')));
      }
      const modQs = parseQuestionsToml(readFileSync(join(dir, 'questions.toml'), 'utf8'));
      questions.push(...modQs);
      modQuestions.push(...modQs.map((q) => q.id));
      const modCardsToml = parseFlashcardsToml(readFileSync(join(dir, 'flashcards.toml'), 'utf8'));
      flashcards.push(...modCardsToml);
      modCards.push(...modCardsToml.map((c) => c.id));
      questionsByModule[mod.id] = modQuestions;
      cardsByModule[mod.id] = modCards;
    }
  }

  // Load every referenced diagram file into the bundle.
  for (const lesson of lessons) {
    for (const dia of lesson.diagrams) {
      if (!diagramFiles.has(dia.file)) {
        diagramFiles.set(dia.file, readFileSync(join(root, dia.file), 'utf8'));
      }
    }
  }

  return {
    tracks, lessons, questions, flashcards, exams,
    diagrams: Object.fromEntries(diagramFiles),
    questionsByModule, cardsByModule,
  };
}

export function buildContentJson(root: string = CONTENT_ROOT): ContentBundle {
  const pieces = collectContent(root);
  const diagnostics = validateContent({
    ...pieces,
    diagramFiles: new Map(Object.entries(pieces.diagrams)),
  });
  if (diagnostics.length > 0) {
    const lines = diagnostics.map((x: Diagnostic) => `  ${x.file}: ${x.message}`);
    throw new Error(`content validation failed:\n${lines.join('\n')}`);
  }
  const moduleOrder = new Map<string, number>();
  const trackOrder = new Map<string, number>();
  for (const t of [...pieces.tracks].sort((a, b) => a.order - b.order)) {
    trackOrder.set(t.id, t.order);
    for (const m of t.modules) moduleOrder.set(m.id, m.order);
  }
  const lessons: Record<string, LessonMeta> = {};
  for (const l of pieces.lessons) lessons[l.id] = l;

  const bundle: ContentBundle = {
    tracks: pieces.tracks
      .sort((a, b) => a.order - b.order)
      .map((t) => ({ ...t, modules: [...t.modules].sort((a, b) => a.order - b.order) })),
    lessons,
    questions: [...pieces.questions].sort((a, b) => a.id.localeCompare(b.id)),
    flashcards: [...pieces.flashcards].sort((a, b) => a.id.localeCompare(b.id)),
    exams: pieces.exams,
    diagrams: pieces.diagrams,
    questionsByModule: pieces.questionsByModule,
    cardsByModule: pieces.cardsByModule,
  };
  return bundle;
}

function main(): void {
  try {
    const bundle = buildContentJson();
    const out = JSON.stringify(bundle);
    writeFileSync(join(dirname(CONTENT_ROOT), 'content.json'), out);
    const webPublic = resolve(dirname(CONTENT_ROOT), '..', '..', 'apps', 'web', 'public');
    mkdirSync(webPublic, { recursive: true });
    copyFileSync(join(dirname(CONTENT_ROOT), 'content.json'), join(webPublic, 'content.json'));
    console.log(`content.json written (${out.length} bytes), copied to apps/web/public/`);
  } catch (err) {
    console.error(String(err));
    process.exit(1);
  }
}

if (process.argv[1] && process.argv[1].endsWith('build.ts')) main();
```

`packages/content/tools/check-links.ts`:

```ts
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseLessonMarkdown } from 'tet-core';

const CONTENT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'content');

async function checkUrl(url: string): Promise<boolean> {
  const oembed = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
  try {
    const res = await fetch(oembed, { signal: AbortSignal.timeout(10_000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  const urls = new Set<string>();
  for (const trackDir of readdirSync(CONTENT_ROOT, { withFileTypes: true })) {
    if (!trackDir.isDirectory()) continue;
    for (const modDir of readdirSync(join(CONTENT_ROOT, trackDir.name), { withFileTypes: true })) {
      if (!modDir.isDirectory()) continue;
      const dir = join(CONTENT_ROOT, trackDir.name, modDir.name);
      for (const f of readdirSync(dir).filter((x) => x.endsWith('.md'))) {
        const lesson = parseLessonMarkdown(readFileSync(join(dir, f), 'utf8'));
        for (const v of lesson.videos) urls.add(v.url);
      }
    }
  }
  const dead: string[] = [];
  for (const url of urls) {
    process.stdout.write(`checking ${url} ... `);
    const ok = await checkUrl(url);
    console.log(ok ? 'ok' : 'DEAD');
    if (!ok) dead.push(url);
  }
  if (dead.length > 0) {
    console.error(`\n${dead.length} dead video link(s):\n${dead.join('\n')}`);
    process.exit(1);
  }
  console.log(`\nall ${urls.size} video links embeddable`);
}

main();
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm --filter tet-content test`
Expected: PASS — validate 9/9, build 2/2.

- [ ] **Step 6: Commit**

```bash
git add packages/content/
git commit -m "feat(content): validator with capacity + media rules, content build tool, link checker"
```

---

### Task 5: ISTQB Module 1 content (walking-skeleton module)

**Files:**
- Create: `packages/content/content/tracks.toml`
- Create: `packages/content/content/istqb/module-1/lesson-01-what-is-testing.md`
- Create: `packages/content/content/istqb/module-1/lesson-02-why-testing-is-necessary.md`
- Create: `packages/content/content/istqb/module-1/lesson-03-seven-testing-principles.md`
- Create: `packages/content/content/istqb/module-1/lesson-04-test-process-testware-roles.md`
- Create: `packages/content/content/istqb/module-1/lesson-05-skills-and-good-practices.md`
- Create: `packages/content/content/istqb/module-1/questions.toml` (30 questions)
- Create: `packages/content/content/istqb/module-1/flashcards.toml` (20 cards)
- Create: `packages/content/content/diagrams/error-defect-failure.svg`, `testing-vs-debugging.svg`, `seven-principles.svg`, `test-process-activities.svg`, `test-levels-types.svg`
- Verify: `pnpm --filter tet-content build` passes; `pnpm --filter tet-content check-links` passes

**Interfaces:**
- Consumes: validator/build from Task 4; schema from Task 1.
- Produces: a `tracks.toml` manifest that later tasks (web UI) render; `content.json` consumed by web (public/) and server. Module id `istqb-m1-fundamentals`, tags `ch1`.

**Content spec (the deliverable contract — validator enforces the counts):**

Manifest `tracks.toml` (M1 lists only module 1; modules 2–8 join in M2/M3):

```toml
[[track]]
id = "istqb-ctfl"
title = "ISTQB Foundation (CTFL v4.0)"
description = "Prepare for the official ISTQB Certified Tester Foundation Level v4.0 exam: 40 questions, 60 minutes, pass at 65%."
order = 1
readiness_passPct = 65
readiness_readyPct = 80
readiness_examIds = []

[[track.module]]
id = "istqb-m1-fundamentals"
track = "istqb-ctfl"
title = "Fundamentals of Testing"
order = 1
source = "istqb/module-1"
quizPool = "istqb/module-1"
deck = "istqb/module-1"
lessonIds = ["istqb-m1-what-is-testing", "istqb-m1-why-testing", "istqb-m1-seven-principles", "istqb-m1-test-process", "istqb-m1-skills-practices"]
examWeight = 8
```

(`readiness_examIds = []` is valid — readiness renders "no exams yet" until M3 adds mocks.)

Lesson coverage map (each lesson's `objectives` lists its FL- x.y.z codes verbatim from syllabus v4.0.1):

| Lesson file | Syllabus section | Learning objectives covered | minutes |
|---|---|---|---|
| lesson-01-what-is-testing.md | 1.1 | FL-1.1.1 (typical objectives), FL-1.1.2 (testing vs debugging) | 12 |
| lesson-02-why-testing-is-necessary.md | 1.2 | FL-1.2.1 (error→defect→failure + examples), FL-1.2.2 (rigor varies by circumstance), FL-1.2.3 (bias + heuristics), FL-1.2.4 (other benefits) | 12 |
| lesson-03-seven-testing-principles.md | 1.3 | FL-1.3.1 (all seven principles) | 10 |
| lesson-04-test-process-testware-roles.md | 1.4 | FL-1.4.1 (process implications), FL-1.4.2 (activities + tasks), FL-1.4.3 (testware), FL-1.4.4 (roles, independence) | 14 |
| lesson-05-skills-and-good-practices.md | 1.5 | FL-1.5.1 (good practices), FL-1.5.2 (whole-team approach), FL-1.5.3 (independence within team) | 10 |

Prose requirements per lesson: plain-English for non-technical readers; every technical term (e.g., "regression testing", "test basis", "testware", "defect") hyperlinked on first use to a high-quality external explainer (YouTube preferred); each `##` heading is a TTS section; body embeds its diagrams inline via `![Title](diagrams/<file>.svg)`; frontmatter lists the same diagrams plus videos.

SVG diagrams: hand-authored, ≤ 40 lines each, `viewBox="0 0 800 450"`, dark text (#1a1a2e), light background, system font; one concept each: error→defect→failure chain; testing vs debugging side-by-side; seven principles grid; test process activities flow (planning → monitoring → analysis → design → implementation → execution → completion); test levels & types matrix.

Video curation: pick 1–2 videos per lesson from YouTube covering the topic (e.g., search "ISTQB foundation what is testing", "error fault failure difference testing", "seven principles of software testing", "test process fundamentals", "whole team approach testing"). Selection criteria: English, ≤ 25 min, ≥ 10k views or from a recognized training channel. Verify each with `pnpm --filter tet-content check-links` — it must pass before commit.

Question bank contract (30 questions, `tags = ["ch1"]`):
- K mix: ≥ 6 K1, rest K2 (Ch1 has no K3 in the official blueprint), 2 multi-select questions (5 options each, 2 correct)
- Every LO in the coverage map has ≥ 2 questions
- All single-answer questions have exactly 4 options; multi have 5 with exactly 2 correct
- Every question has a 1–3 sentence plain-English `explanation`

Three worked examples (style anchors — write the other 27 in this voice):

```toml
[[question]]
id = "istqb-q-0001"
type = "single"
stem = "What is the main purpose of testing?"
options = [
  "To prove that the software works correctly",
  "To find defects and provide information that lets stakeholders make quality-related decisions",
  "To fix every defect found before release",
  "To replace the need for debugging",
]
answers = [1]
explanation = "Testing finds defects and gives stakeholders objective information for decisions. It cannot prove the absence of defects, and fixing defects is the developer's job."
lo = "FL-1.1.1"
klevel = "K2"
```

```toml
[[question]]
id = "istqb-q-0002"
type = "single"
stem = "A user reports that the app crashes when uploading a photo larger than 20 MB. The photo-size check in the code was written incorrectly. In ISTQB terms, the incorrect code is the ___ and the crash the user sees is the ___."
options = [
  "failure / defect",
  "defect / failure",
  "error / mistake",
  "failure / error",
]
answers = [1]
explanation = "A human error produces a defect (the wrong code). When that code executes under the right conditions, the observable problem — the crash — is a failure."
lo = "FL-1.2.1"
klevel = "K2"
```

```toml
[[question]]
id = "istqb-q-0003"
type = "multi"
stem = "Which TWO statements are testing principles?"
options = [
  "Testing shows the presence, not the absence of defects",
  "Exhaustive testing is possible for small systems",
  "Defects cluster together",
  "Testing should start after development is fully complete",
  "Absence-of-defects fallacy: a fully tested system can still fail to meet user needs",
]
answers = [0, 2]
explanation = "The seven principles include: testing shows presence not absence, defect clustering, and the absence-of-defects fallacy. Exhaustive testing is impossible, and testing starts early — the other two options contradict the principles."
lo = "FL-1.3.1"
klevel = "K2"
```

Flashcard contract (20 cards): every card `tags = ["ch1"]`; cover — error/defect/failure definitions, testing vs debugging, the seven principles (7 cards, one each), test levels, test types, testware, test work products per activity, independence levels, whole-team approach, tester skills, good-practice contexts, absence-of-defects fallacy.

- [ ] **Step 1: Write the manifest, five lessons, five diagrams**

Author files exactly per the contract above. (Frontmatter format is pinned by `parseLessonMarkdown` in Task 1; ids and module field must match the manifest's `lessonIds`.)

- [ ] **Step 2: Write 30 questions + 20 flashcards**

Author per the contract: coverage matrix satisfied, K mix satisfied, style matches the three worked examples.

- [ ] **Step 3: Build must pass**

Run: `pnpm --filter tet-content build`
Expected: `content.json written (...)` — validation clean (unique ids, media rules, capacity).

- [ ] **Step 4: Links must pass**

Run: `pnpm --filter tet-content check-links`
Expected: `all N video links embeddable` — any DEAD link is replaced with a working one and re-run until clean.

- [ ] **Step 5: Run all tests**

Run: `pnpm test`
Expected: PASS — all previous suites still green.

- [ ] **Step 6: Commit**

```bash
git add packages/content/content/
git commit -m "feat(content): ISTQB Module 1 curriculum — 5 lessons, 30 questions, 20 cards, 5 diagrams"
```

---

### Task 6: StorageAdapter contract + LocalAdapter (IndexedDB)

**Files:**
- Create: `packages/storage/package.json`, `packages/storage/tsconfig.json`, `packages/storage/src/index.ts`
- Create: `packages/storage/src/types.ts`, `packages/storage/src/local.ts`, `packages/storage/src/parity.ts`
- Test: `packages/storage/src/local.test.ts`

**Interfaces:**
- Consumes: `CardState`, `Grade` from `tet-core` (Task 2).
- Produces (exact names for Tasks 9/10/11/12/13/15):

```ts
export interface ProgressEntry {
  track: string; module: string; itemId: string;
  status: 'done' | 'in-progress'; updatedAt: string;
}
export type ProgressMap = Record<string, ProgressEntry>; // key `${track}/${module}/${itemId}`

export interface QuizAttempt {
  attemptId: string; module: string; score: number; max: number;
  perQuestion: Record<string, boolean>; createdAt: string;
}
export interface ExamAttempt {
  attemptId: string; examId: string; score: number; max: number; passed: boolean;
  scorePct: number; perTag: Record<string, { correct: number; total: number }>;
  responses: Record<string, number[]>; createdAt: string; durationSec: number;
}
export interface CardReview {
  cardId: string; grade: Grade; state: CardState; createdAt: string;
}

export interface SessionInfo {
  mode: 'solo' | 'cohort';
  userId: string;
  displayName: string;
  role: 'admin' | 'learner';
  serverUrl?: string;
}

export interface MigratableData {
  progress: ProgressMap;
  quizAttempts: QuizAttempt[];
  examAttempts: ExamAttempt[];
  cardStates: Record<string, CardState>;
}

export interface StorageAdapter {
  getSession(): Promise<SessionInfo | null>;
  putSession(info: SessionInfo): Promise<void>;
  getProgress(): Promise<ProgressMap>;
  putProgress(entries: ProgressEntry[]): Promise<void>;
  recordQuizAttempt(a: QuizAttempt): Promise<void>;
  getQuizAttempts(moduleId?: string): Promise<QuizAttempt[]>;
  recordExamAttempt(a: ExamAttempt): Promise<void>;
  getExamAttempts(examId?: string): Promise<ExamAttempt[]>;
  recordCardReview(r: CardReview): Promise<void>;
  getReviewState(): Promise<Record<string, CardState>>;
  exportAll(): Promise<MigratableData>;
  importAll(data: MigratableData): Promise<void>;
}
```

(Ruling vs spec sketch: the spec wrote adapters as `record*(userId, …)`; the adapters here are **per-identity instances** — the ServerAdapter binds the auth cookie, the LocalAdapter the single local user. Same observable behavior, cleaner call sites. Recorded here because the spec sketch shows `userId` parameters.)

`createLocalAdapter(): StorageAdapter` — IndexedDB database `tet`, object stores: `kv` (session), `progress` (keyPath `key` where key = track/module/itemId), `quizAttempts` (keyPath `attemptId`), `examAttempts` (keyPath `attemptId`), `cardStates` (keyPath `cardId`), `cardReviews` (auto-increment log). Uses the `idb` package. `record*` is upsert-by-id (idempotent); `getQuizAttempts(moduleId?)` sorted by createdAt descending.

`runParitySuite(buildAdapter: () => Promise<StorageAdapter>): Promise<void>` — the shared behavioral suite in `parity.ts` (uses `expect` from vitest): progress roundtrip; quiz/exam attempt recording + idempotent re-record; review grading updates `getReviewState()`; export/import roundtrip preserves everything; empty store returns `{}` / `[]` (the fresh-browser Review Focus behavior).

- [ ] **Step 1: Write the failing parity test against LocalAdapter**

`packages/storage/src/local.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import 'fake-indexeddb/auto';
import { createLocalAdapter } from './local.js';
import { runParitySuite } from './parity.js';

describe('LocalAdapter', () => {
  // A fresh IDBFactory per test → no cross-test database leakage, no delete race.
  beforeEach(() => {
    vi.stubGlobal('indexedDB', new IDBFactory());
  });

  it('passes the parity suite', async () => {
    await runParitySuite(() => Promise.resolve(createLocalAdapter()));
  });
});
```

(The parity suite itself is written in Step 3 alongside the adapter — it is the test.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter tet-storage test`
Expected: FAIL — `./local.js` not found (tet-storage not yet scaffolded).

- [ ] **Step 3: Scaffold tet-storage and implement types, parity, LocalAdapter**

`packages/storage/package.json`:

```json
{
  "name": "tet-storage",
  "version": "0.1.0",
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "scripts": { "test": "vitest run", "build": "tsc -p tsconfig.json" },
  "dependencies": {
    "tet-core": "workspace:*",
    "idb": "^8.0.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "vitest": "^3.0.0",
    "fake-indexeddb": "^6.0.0"
  }
}
```

`packages/storage/tsconfig.json`: same shape as tet-core's, `include: ["src"]`.

`packages/storage/src/types.ts`: the interfaces above verbatim.

`packages/storage/src/parity.ts`:

```ts
import { expect } from 'vitest';
import type { MigratableData, QuizAttempt, ExamAttempt, CardReview, ProgressEntry } from './types.js';

export async function runParitySuite(buildAdapter: () => Promise<import('./types.js').StorageAdapter>): Promise<void> {
  const a = await buildAdapter();

  // fresh store → empty everything
  expect(await a.getSession()).toBeNull();
  expect(await a.getProgress()).toEqual({});
  expect(await a.getQuizAttempts()).toEqual([]);
  expect(await a.getExamAttempts()).toEqual([]);
  expect(await a.getReviewState()).toEqual({});

  // session
  const session = { mode: 'solo' as const, userId: 'local', displayName: 'You', role: 'learner' as const };
  await a.putSession(session);
  expect(await a.getSession()).toEqual(session);

  // progress roundtrip
  const entry: ProgressEntry = {
    track: 't1', module: 'm1', itemId: 'l1', status: 'done', updatedAt: '2026-11-07T00:00:00Z',
  };
  await a.putProgress([entry]);
  expect((await a.getProgress())['t1/m1/l1']).toEqual(entry);

  // quiz attempt + idempotency
  const qa: QuizAttempt = {
    attemptId: 'qa1', module: 'm1', score: 8, max: 10,
    perQuestion: { q1: true }, createdAt: '2026-11-07T01:00:00Z',
  };
  await a.recordQuizAttempt(qa);
  await a.recordQuizAttempt(qa); // same attemptId → still one row
  expect(await a.getQuizAttempts()).toHaveLength(1);
  expect((await a.getQuizAttempts('m1'))[0]!.score).toBe(8);
  expect(await a.getQuizAttempts('other')).toEqual([]);

  // exam attempt + idempotency
  const ea: ExamAttempt = {
    attemptId: 'ea1', examId: 'e1', score: 30, max: 40, passed: true, scorePct: 75,
    perTag: { ch1: { correct: 7, total: 8 } },
    responses: { q1: [0] }, createdAt: '2026-11-07T02:00:00Z', durationSec: 1800,
  };
  await a.recordExamAttempt(ea);
  await a.recordExamAttempt(ea);
  expect(await a.getExamAttempts()).toHaveLength(1);
  expect((await a.getExamAttempts('e1'))[0]!.passed).toBe(true);

  // review grading updates current state
  const state = { ease: 2.5, intervalDays: 1, dueAt: '2026-11-08T00:00:00Z', reps: 1, lapses: 0 };
  const review: CardReview = { cardId: 'c1', grade: 'good', state, createdAt: '2026-11-07T03:00:00Z' };
  await a.recordCardReview(review);
  await a.recordCardReview({ ...review, state: { ...state, intervalDays: 6 } });
  expect((await a.getReviewState())['c1']!.intervalDays).toBe(6); // latest wins

  // export/import roundtrip
  const data: MigratableData = await a.exportAll();
  expect(Object.keys(data.progress)).toHaveLength(1);
  expect(data.quizAttempts).toHaveLength(1);
  expect(data.examAttempts).toHaveLength(1);
  expect(Object.keys(data.cardStates)).toHaveLength(1);

  const b = await buildAdapter();
  await b.importAll(data);
  expect(await b.getProgress()).toEqual(await a.getProgress());
  expect(await b.getQuizAttempts()).toHaveLength(1);
  expect((await b.getReviewState())['c1']!.intervalDays).toBe(6);
}
```

`packages/storage/src/local.ts`:

```ts
import { openDB, type IDBPDatabase } from 'idb';
import type { CardState, Grade } from 'tet-core';
import type {
  CardReview, ExamAttempt, MigratableData, ProgressEntry, ProgressMap,
  QuizAttempt, SessionInfo, StorageAdapter,
} from './types.js';

const DB_NAME = 'tet';
const VERSION = 1;

interface Stores {
  kv: { key: string; value: unknown };
  progress: { key: string; value: ProgressEntry & { key: string } };
  quizAttempts: { key: string; value: QuizAttempt };
  examAttempts: { key: string; value: ExamAttempt };
  cardStates: { key: string; value: { cardId: string; state: CardState; updatedAt: string } };
  cardReviews: { key: number; value: CardReview };
}

function pkey(e: Omit<ProgressEntry, 'key'>): string {
  return `${e.track}/${e.module}/${e.itemId}`;
}

export function createLocalAdapter(): StorageAdapter {
  let dbPromise: Promise<IDBPDatabase<Stores>> | null = null;
  function db(): Promise<IDBPDatabase<Stores>> {
    dbPromise ??= openDB<Stores>(DB_NAME, VERSION, {
      upgrade(d) {
        d.createObjectStore('kv');
        d.createObjectStore('progress', { keyPath: 'key' });
        d.createObjectStore('quizAttempts', { keyPath: 'attemptId' });
        d.createObjectStore('examAttempts', { keyPath: 'attemptId' });
        d.createObjectStore('cardStates', { keyPath: 'cardId' });
        d.createObjectStore('cardReviews', { autoIncrement: true });
      },
    });
    return dbPromise;
  }

  return {
    async getSession() {
      const d = await db();
      return (await d.get('kv', 'session') as SessionInfo | undefined) ?? null;
    },
    async putSession(info) {
      const d = await db();
      await d.put('kv', info, 'session');
    },
    async getProgress() {
      const d = await db();
      const rows = await d.getAll('progress');
      const map: ProgressMap = {};
      for (const r of rows) {
        const { key, ...entry } = r;
        map[key] = entry;
      }
      return map;
    },
    async putProgress(entries) {
      const d = await db();
      const tx = d.transaction('progress', 'readwrite');
      for (const e of entries) {
        await tx.store.put({ ...e, key: pkey(e) });
      }
      await tx.done;
    },
    async recordQuizAttempt(a) {
      const d = await db();
      await d.put('quizAttempts', a);
    },
    async getQuizAttempts(moduleId) {
      const d = await db();
      const all = (await d.getAll('quizAttempts')).sort(
        (x, y) => y.createdAt.localeCompare(x.createdAt),
      );
      return moduleId ? all.filter((a) => a.module === moduleId) : all;
    },
    async recordExamAttempt(a) {
      const d = await db();
      await d.put('examAttempts', a);
    },
    async getExamAttempts(examId) {
      const d = await db();
      const all = (await d.getAll('examAttempts')).sort(
        (x, y) => y.createdAt.localeCompare(x.createdAt),
      );
      return examId ? all.filter((a) => a.examId === examId) : all;
    },
    async recordCardReview(r) {
      const d = await db();
      const tx = d.transaction(['cardReviews', 'cardStates'], 'readwrite');
      await tx.objectStore('cardReviews').add(r);
      await tx.objectStore('cardStates').put({
        cardId: r.cardId, state: r.state, updatedAt: r.createdAt,
      });
      await tx.done;
    },
    async getReviewState() {
      const d = await db();
      const rows = await d.getAll('cardStates');
      const out: Record<string, CardState> = {};
      for (const r of rows) out[r.cardId] = r.state;
      return out;
    },
    async exportAll(): Promise<MigratableData> {
      const d = await db();
      const states = await d.getAll('cardStates');
      const cardStates: Record<string, CardState> = {};
      for (const s of states) cardStates[s.cardId] = s.state;
      return {
        progress: await this.getProgress(),
        quizAttempts: await this.getQuizAttempts(),
        examAttempts: await this.getExamAttempts(),
        cardStates,
      };
    },
    async importAll(data) {
      await this.putProgress(Object.values(data.progress));
      for (const qa of data.quizAttempts) await this.recordQuizAttempt(qa);
      for (const ea of data.examAttempts) await this.recordExamAttempt(ea);
      const d = await db();
      const now = new Date().toISOString();
      for (const [cardId, state] of Object.entries(data.cardStates)) {
        await d.put('cardStates', { cardId, state, updatedAt: now });
      }
    },
  };
}
```

(`idb` typed stores via `IDBPDatabase<Stores>` schema types; Grade import may be unused — drop it if lint complains. `db()` upgrade callback only runs on first open, matching the fresh-database test.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter tet-storage test`
Expected: PASS — parity suite green against LocalAdapter (14+ assertions).

- [ ] **Step 5: Commit**

```bash
git add packages/storage/
git commit -m "feat(storage): StorageAdapter contract, parity suite, IndexedDB LocalAdapter"
```

---

### Task 7: API server — bootstrap, schema, auth (register/invite, login, logout, me)

**Files:**
- Create: `apps/server/package.json`, `apps/server/tsconfig.json`
- Create: `apps/server/src/schema.sql`, `apps/server/src/db.ts`, `apps/server/src/auth.ts`, `apps/server/src/index.ts`
- Test: `apps/server/src/auth.test.ts`

**Interfaces:**
- Consumes: nothing from the app yet (loads `tet-core` types only).
- Produces:
  - `openDb(path: string): DB` (better-sqlite3 handle, WAL, schema applied) and `type DB = Database.Database`
  - Hono typing: `export type AppEnv = { Variables: { db: DB; user: AuthedUser } }`
  - `hashPassword`, `verifyPassword`, `createSession(db, userId): { token, expiresAt }`, `sessionCookie(token, expiresAt)`, `clearCookie()`, `userFromCookie(db, c): AuthedUser | null`, middleware `requireAuth()`, `requireAdmin()`
  - `export function createApp(db: DB): Hono<AppEnv>` — the whole API; tests drive it with Hono's built-in `app.request(...)` (no supertest needed)
  - Routes: `POST /api/auth/register` `{ inviteCode?, username, displayName, password }` → 201 `{ user }` + Set-Cookie; `POST /api/auth/login` `{ username, password }`; `POST /api/auth/logout`; `GET /api/me`
  - **Bootstrap rule:** when the users table is empty, the first registration needs no invite and gets `role: admin`. Every later registration requires a valid invite (uses_left > 0, not expired) and gets `role: learner`; the invite's `uses_left` decrements.
- Server reads no content in M1 Tasks 7–9 (roster stays content-agnostic).

- [ ] **Step 1: Write the failing auth tests**

`apps/server/src/auth.test.ts`:

```ts
import { describe, expect, it, beforeEach } from 'vitest';
import { openDb, type DB } from './db.js';
import { createApp } from './index.js';
import type { Hono } from 'hono';
import type { AppEnv } from './auth.js';

let db: DB;
let app: Hono<AppEnv>;

beforeEach(() => {
  db = openDb(':memory:');
  app = createApp(db);
});

function parseCookie(res: Response): string {
  const setCookie = res.headers.get('set-cookie') ?? '';
  return setCookie.split(';')[0] ?? '';
}

describe('auth', () => {
  it('first registration with no invite becomes admin (bootstrap)', async () => {
    const res = await app.request('/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'admin', displayName: 'Admin', password: 'longenough1' }),
    });
    expect(res.status).toBe(201);
    const body = await res.json() as { user: { role: string } };
    expect(body.user.role).toBe('admin');
    expect(res.headers.get('set-cookie')).toContain('tet_session=');
  });

  it('second registration without invite is rejected', async () => {
    await app.request('/api/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'a', displayName: 'A', password: 'longenough1' }) });
    const res = await app.request('/api/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'b', displayName: 'B', password: 'longenough1' }) });
    expect(res.status).toBe(403);
  });

  it('registration with a valid invite creates a learner and consumes a use', async () => {
    await app.request('/api/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'admin', displayName: 'A', password: 'longenough1' }) });
    db.prepare(`INSERT INTO invites (code, created_by, uses_left, expires_at) VALUES ('WELCOME', 1, 1, NULL)`).run();
    const res = await app.request('/api/auth/register', { method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ inviteCode: 'WELCOME', username: 'learner1', displayName: 'L1', password: 'longenough1' }) });
    expect(res.status).toBe(201);
    const body = await res.json() as { user: { role: string } };
    expect(body.user.role).toBe('learner');
    const uses = db.prepare(`SELECT uses_left FROM invites WHERE code = 'WELCOME'`).get() as { uses_left: number };
    expect(uses.uses_left).toBe(0);
  });

  it('an exhausted invite is rejected', async () => {
    await app.request('/api/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'admin', displayName: 'A', password: 'longenough1' }) });
    db.prepare(`INSERT INTO invites (code, created_by, uses_left) VALUES ('USED', 1, 0)`).run();
    const res = await app.request('/api/auth/register', { method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ inviteCode: 'USED', username: 'x', displayName: 'X', password: 'longenough1' }) });
    expect(res.status).toBe(403);
  });

  it('rejects weak passwords and bad usernames', async () => {
    const res = await app.request('/api/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'ok-name', displayName: 'X', password: 'short' }) });
    expect(res.status).toBe(400);
  });

  it('login sets a cookie; /api/me reads it; logout clears the session', async () => {
    await app.request('/api/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'admin', displayName: 'A', password: 'longenough1' }) });
    const login = await app.request('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'longenough1' }) });
    expect(login.status).toBe(200);
    const cookie = parseCookie(login);
    expect(cookie).toContain('tet_session=');

    const me = await app.request('/api/me', { headers: { cookie } });
    expect(me.status).toBe(200);
    const meBody = await me.json() as { user: { username: string } };
    expect(meBody.user.username).toBe('admin');

    const bad = await app.request('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'wrongpassword' }) });
    expect(bad.status).toBe(401);

    const out = await app.request('/api/auth/logout', { method: 'POST', headers: { cookie } });
    expect(out.status).toBe(204);
    const meAfter = await app.request('/api/me', { headers: { cookie } });
    expect(meAfter.status).toBe(401);
  });
});
```

- [ ] **Step 2: Scaffold tet-server and implement**

`apps/server/package.json`:

```json
{
  "name": "tet-server",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "start": "tsx src/index.ts",
    "test": "vitest run",
    "build": "tsc -p tsconfig.json"
  },
  "dependencies": {
    "tet-core": "workspace:*",
    "tet-content": "workspace:*",
    "hono": "^4.6.0",
    "@hono/node-server": "^1.13.0",
    "better-sqlite3": "^11.5.0",
    "bcryptjs": "^2.4.3"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.0",
    "@types/node": "^22.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  }
}
```

`apps/server/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "noEmit": true, "types": ["node"] },
  "include": ["src"]
}
```

`apps/server/src/schema.sql`: exactly the following (7 tables):

```sql
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','learner')),
  created_at TEXT NOT NULL,
  last_seen_at TEXT
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS invites (
  code TEXT PRIMARY KEY,
  created_by INTEGER NOT NULL REFERENCES users(id),
  uses_left INTEGER NOT NULL DEFAULT 1,
  expires_at TEXT
);
CREATE TABLE IF NOT EXISTS progress (
  user_id INTEGER NOT NULL REFERENCES users(id),
  key TEXT NOT NULL,
  track TEXT NOT NULL,
  module TEXT NOT NULL,
  item_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('done','in-progress')),
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, key)
);
CREATE TABLE IF NOT EXISTS quiz_attempts (
  user_id INTEGER NOT NULL REFERENCES users(id),
  attempt_id TEXT NOT NULL,
  module TEXT NOT NULL,
  score INTEGER NOT NULL,
  max_score INTEGER NOT NULL,
  per_question TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, attempt_id)
);
CREATE TABLE IF NOT EXISTS exam_attempts (
  user_id INTEGER NOT NULL REFERENCES users(id),
  attempt_id TEXT NOT NULL,
  exam_id TEXT NOT NULL,
  score INTEGER NOT NULL,
  max_score INTEGER NOT NULL,
  passed INTEGER NOT NULL,
  score_pct REAL NOT NULL,
  per_tag TEXT NOT NULL,
  responses TEXT NOT NULL,
  duration_sec INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, attempt_id)
);
CREATE TABLE IF NOT EXISTS card_states (
  user_id INTEGER NOT NULL REFERENCES users(id),
  card_id TEXT NOT NULL,
  ease REAL NOT NULL,
  interval_days INTEGER NOT NULL,
  due_at TEXT NOT NULL,
  reps INTEGER NOT NULL,
  lapses INTEGER NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, card_id)
);
CREATE TABLE IF NOT EXISTS card_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  card_id TEXT NOT NULL,
  grade TEXT NOT NULL,
  ease REAL NOT NULL,
  interval_days INTEGER NOT NULL,
  due_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
```

`apps/server/src/db.ts`:

```ts
import Database from 'better-sqlite3';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export type DB = Database.Database;

export const SCHEMA_SQL = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'schema.sql'), 'utf8');

export function openDb(path: string): DB {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.exec(SCHEMA_SQL);
  return db;
}
```

`apps/server/src/auth.ts`:

```ts
import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { getCookie } from 'hono/cookie';
import type { Context, Next } from 'hono';
import type { DB } from './db.js';

export const COOKIE = 'tet_session';
const SESSION_DAYS = 30;

export type AppEnv = { Variables: { db: DB; user: AuthedUser } };

export interface AuthedUser {
  id: number; username: string; displayName: string; role: 'admin' | 'learner';
}

export function hashPassword(pw: string): string { return bcrypt.hashSync(pw, 10); }
export function verifyPassword(pw: string, hash: string): boolean { return bcrypt.compareSync(pw, hash); }

function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function createSession(db: DB, userId: number): { token: string; expiresAt: string } {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000).toISOString();
  db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
    .run(tokenHash(token), userId, expiresAt);
  return { token, expiresAt };
}

export function sessionCookie(token: string, expiresAt: string): string {
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Expires=${new Date(expiresAt).toUTCString()}`;
}
export function clearCookie(): string {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function userFromCookie(db: DB, c: Context): AuthedUser | null {
  const token = getCookie(c, COOKIE);
  if (!token) return null;
  const row = db.prepare(`
    SELECT u.id, u.username, u.display_name AS displayName, u.role, s.expires_at AS expiresAt
    FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ?`).get(tokenHash(token)) as
    { id: number; username: string; displayName: string; role: 'admin' | 'learner'; expiresAt: string } | undefined;
  if (!row || new Date(row.expiresAt) < new Date()) return null;
  return { id: row.id, username: row.username, displayName: row.displayName, role: row.role };
}

export function requireAuth() {
  return async (c: Context<AppEnv>, next: Next) => {
    const user = userFromCookie(c.get('db'), c);
    if (!user) return c.json({ error: 'unauthorized' }, 401);
    c.set('user', user);
    await next();
  };
}

export function requireAdmin() {
  return async (c: Context<AppEnv>, next: Next) => {
    const user = userFromCookie(c.get('db'), c);
    if (!user) return c.json({ error: 'unauthorized' }, 401);
    if (user.role !== 'admin') return c.json({ error: 'forbidden' }, 403);
    c.set('user', user);
    await next();
  };
}
```

`apps/server/src/index.ts` (initial version — auth routes only; Tasks 8/9 add `dataRoutes` and `adminRoutes` mounts at the marked line):

```ts
import { Hono } from 'hono';
import { setCookie, deleteCookie } from 'hono/cookie';
import type { DB } from './db.js';
import {
  AppEnv, AuthedUser, COOKIE, clearCookie, createSession, hashPassword,
  requireAuth, sessionCookie, userFromCookie, verifyPassword,
} from './auth.js';

const USERNAME_RE = /^[a-z0-9_-]{3,32}$/;

export function createApp(db: DB): Hono<AppEnv> {
  const app = new Hono<AppEnv>();

  app.use('*', async (c, next) => {
    c.set('db', db);
    await next();
  });

  app.post('/api/auth/register', async (c) => {
    const body = await c.req.json<Record<string, unknown>>();
    const username = String(body.username ?? '');
    const displayName = String(body.displayName ?? '').trim() || username;
    const password = String(body.password ?? '');
    const inviteCode = typeof body.inviteCode === 'string' ? body.inviteCode.trim() : '';

    if (!USERNAME_RE.test(username)) return c.json({ error: 'invalid username (3-32 chars: a-z 0-9 _ -)' }, 400);
    if (password.length < 8) return c.json({ error: 'password must be at least 8 characters' }, 400);

    const userCount = db.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number };
    let role: 'admin' | 'learner' = 'learner';
    if (userCount.n === 0) {
      role = 'admin'; // bootstrap admin needs no invite
    } else {
      const invite = inviteCode
        ? db.prepare('SELECT * FROM invites WHERE code = ?').get(inviteCode) as
            { code: string; uses_left: number; expires_at: string | null } | undefined
        : undefined;
      if (!invite || invite.uses_left <= 0 ||
          (invite.expires_at && new Date(invite.expires_at) < new Date())) {
        return c.json({ error: 'valid invite code required' }, 403);
      }
      db.prepare('UPDATE invites SET uses_left = uses_left - 1 WHERE code = ?').run(invite.code);
    }

    const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (exists) return c.json({ error: 'username already taken' }, 409);

    const info = db.prepare(
      'INSERT INTO users (username, display_name, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)',
    ).run(username, displayName, hashPassword(password), role, new Date().toISOString());
    const { token, expiresAt } = createSession(db, Number(info.lastInsertRowid));
    setCookie(c, COOKIE, token, { httpOnly: true, sameSite: 'Lax', path: '/', expires: new Date(expiresAt) });
    return c.json({ user: { username, displayName, role } }, 201);
  });

  app.post('/api/auth/login', async (c) => {
    const body = await c.req.json<Record<string, unknown>>();
    const row = db.prepare('SELECT * FROM users WHERE username = ?')
      .get(String(body.username ?? '')) as
      { id: number; username: string; password_hash: string; role: string } | undefined;
    if (!row || !verifyPassword(String(body.password ?? ''), row.password_hash)) {
      return c.json({ error: 'invalid credentials' }, 401);
    }
    db.prepare('UPDATE users SET last_seen_at = ? WHERE id = ?').run(new Date().toISOString(), row.id);
    const { token, expiresAt } = createSession(db, row.id);
    setCookie(c, COOKIE, token, { httpOnly: true, sameSite: 'Lax', path: '/', expires: new Date(expiresAt) });
    return c.json({ user: { username: row.username, role: row.role } }, 200);
  });

  app.post('/api/auth/logout', (c) => {
    const user = userFromCookie(db, c);
    if (user) {
      // Sessions are keyed by token hash; delete every session for robustness on logout-all semantics later.
      db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);
    }
    deleteCookie(c, COOKIE, { path: '/' });
    return c.body(null, 204);
  });

  app.get('/api/me', (c) => {
    const user = userFromCookie(db, c);
    if (!user) return c.json({ error: 'unauthorized' }, 401);
    return c.json({ user }, 200);
  });

  // --- data + admin mounts are added in Tasks 8 (data.ts, admin.ts) ---
  // app.route('/api', dataRoutes());
  // app.route('/api/admin', adminRoutes());

  return app;
}

// Entry point (only when run directly): open DB, serve.
import { serve } from '@hono/node-server';
import { openDb } from './db.js';

const isMain = process.argv[1] && process.argv[1].endsWith('src/index.ts');
if (isMain) {
  const db = openDb(process.env.DB_PATH ?? './data/tet.sqlite3');
  const app = createApp(db);
  const port = Number(process.env.PORT ?? 8787);
  serve({ fetch: app.fetch, port });
  console.log(`test-engineer-track server on :${port}`);
}
```

- [ ] **Step 3: Run tests to verify they pass**

Run: `pnpm --filter tet-server test`
Expected: PASS — auth 6/6.

- [ ] **Step 4: Commit**

```bash
git add apps/server/
git commit -m "feat(server): Hono bootstrap, SQLite schema, auth with bootstrap-admin + invite codes"
```

---

### Task 8: API server — progress, attempts (idempotent), reviews, admin routes

**Files:**
- Create: `apps/server/src/routes/data.ts`, `apps/server/src/routes/admin.ts`
- Modify: `apps/server/src/index.ts` (mount both routers at the marked lines)
- Test: `apps/server/src/routes/data.test.ts`, `apps/server/src/routes/admin.test.ts`

**Interfaces:**
- Consumes: `createApp`, `openDb`, `requireAuth`, `requireAdmin`, `AppEnv` from Task 7; `ProgressEntry`, `QuizAttempt`, `ExamAttempt`, `CardReview`, `MigratableData` shapes from Task 6 (wire format identical).
- Produces (routes later tasks consume through `ServerAdapter`):
  - `GET /api/progress` → `ProgressMap`; `PUT /api/progress` body `{ entries: ProgressEntry[] }` (upsert) → 204
  - `POST /api/attempts/quiz` body `QuizAttempt` → `{ duplicate: boolean }` (INSERT OR IGNORE on `(user_id, attempt_id)`)
  - `POST /api/attempts/exam` body `ExamAttempt` → `{ duplicate: boolean }`
  - `GET /api/attempts/quiz?module=` → `QuizAttempt[]`; `GET /api/attempts/exam?examId=` → `ExamAttempt[]` (both newest-first)
  - `POST /api/reviews` body `CardReview` → 204; `GET /api/reviews` → `Record<cardId, CardState>`
  - `POST /api/import` body `MigratableData` → 204 (solo→cohort one-time upload; idempotent per attempt id)
  - `GET /api/admin/roster` → `{ users: Array<{ id, username, displayName, role, lastSeenAt, quizAttempts, bestQuizPct, examAttempts, bestExamPct, cardsTracked }> }`
  - `POST /api/admin/invites` `{ usesLeft?, expiresAt? }` → `{ code }` (code = 8-char A-Z2-9); `GET /api/admin/invites` → list
  - `POST /api/admin/users` `{ username, displayName, password, role }` → 201 (admin-created account, no invite); `POST /api/admin/users/:id/password` `{ password }` → 204
  - `GET /api/admin/export.csv` → `text/csv` with header `username,display_name,role,last_seen_at,quiz_attempts,best_quiz_pct,exam_attempts,best_exam_pct,cards_tracked`

- [ ] **Step 1: Write the failing data tests**

`apps/server/src/routes/data.test.ts`:

```ts
import { describe, expect, it, beforeEach } from 'vitest';
import { openDb, type DB } from '../db.js';
import { createApp } from '../index.js';
import type { Hono } from 'hono';
import type { AppEnv } from '../auth.js';

let db: DB;
let app: Hono<AppEnv>;
let cookie: string;

beforeEach(async () => {
  db = openDb(':memory:');
  app = createApp(db);
  const res = await app.request('/api/auth/register', { method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'admin', displayName: 'A', password: 'longenough1' }) });
  cookie = (res.headers.get('set-cookie') ?? '').split(';')[0]!;
});

function post(path: string, body: unknown) {
  return app.request(path, { method: 'POST', headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify(body) });
}

describe('progress', () => {
  it('roundtrips entries', async () => {
    const put = await app.request('/api/progress', { method: 'PUT',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ entries: [{ track: 't1', module: 'm1', itemId: 'l1', status: 'done', updatedAt: '2026-11-07T00:00:00Z' }] }) });
    expect(put.status).toBe(204);
    const get = await app.request('/api/progress', { headers: { cookie } });
    const map = await get.json() as Record<string, { status: string }>;
    expect(map['t1/m1/l1']!.status).toBe('done');
  });
});

describe('attempts', () => {
  it('records a quiz attempt and reports idempotency on duplicate', async () => {
    const attempt = { attemptId: 'qa1', module: 'm1', score: 9, max: 10,
      perQuestion: { q1: true }, createdAt: '2026-11-07T01:00:00Z' };
    const first = await post('/api/attempts/quiz', attempt);
    expect(first.status).toBe(200);
    expect(await first.json() as { duplicate: boolean }).toEqual({ duplicate: false });

    const dup = await post('/api/attempts/quiz', attempt); // Review Focus #3
    expect(dup.status).toBe(200);
    expect(await dup.json() as { duplicate: boolean }).toEqual({ duplicate: true });

    const list = await app.request('/api/attempts/quiz?module=m1', { headers: { cookie } });
    expect((await list.json() as unknown[])).toHaveLength(1);
  });

  it('records an exam attempt with per-tag breakdown', async () => {
    const attempt = { attemptId: 'ea1', examId: 'e1', score: 30, max: 40, passed: true, scorePct: 75,
      perTag: { ch1: { correct: 7, total: 8 } }, responses: { q1: [0] },
      createdAt: '2026-11-07T02:00:00Z', durationSec: 1800 };
    const res = await post('/api/attempts/exam', attempt);
    expect(res.status).toBe(200);
    const list = await app.request('/api/attempts/exam?examId=e1', { headers: { cookie } });
    const rows = await list.json() as Array<{ scorePct: number }>;
    expect(rows[0]!.scorePct).toBe(75);
  });

  it('requires auth', async () => {
    const res = await app.request('/api/progress');
    expect(res.status).toBe(401);
  });
});

describe('reviews + import', () => {
  it('records reviews and returns latest state per card', async () => {
    await post('/api/reviews', { cardId: 'c1', grade: 'good',
      state: { ease: 2.5, intervalDays: 1, dueAt: '2026-11-08T00:00:00Z', reps: 1, lapses: 0 },
      createdAt: '2026-11-07T03:00:00Z' });
    await post('/api/reviews', { cardId: 'c1', grade: 'good',
      state: { ease: 2.5, intervalDays: 6, dueAt: '2026-11-13T00:00:00Z', reps: 2, lapses: 0 },
      createdAt: '2026-11-08T03:00:00Z' });
    const res = await app.request('/api/reviews', { headers: { cookie } });
    const states = await res.json() as Record<string, { intervalDays: number }>;
    expect(states['c1']!.intervalDays).toBe(6);
  });

  it('imports migratable data idempotently', async () => {
    const data = {
      progress: { 't1/m1/l1': { track: 't1', module: 'm1', itemId: 'l1', status: 'done', updatedAt: '2026-11-07T00:00:00Z' } },
      quizAttempts: [{ attemptId: 'qa1', module: 'm1', score: 8, max: 10, perQuestion: {}, createdAt: '2026-11-07T01:00:00Z' }],
      examAttempts: [],
      cardStates: { c1: { ease: 2.5, intervalDays: 1, dueAt: '2026-11-08T00:00:00Z', reps: 1, lapses: 0 } },
    };
    await post('/api/import', data);
    await post('/api/import', data); // same attempt ids → no dupes
    const list = await app.request('/api/attempts/quiz', { headers: { cookie } });
    expect(await list.json() as unknown[]).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Write the failing admin tests**

`apps/server/src/routes/admin.test.ts`:

```ts
import { describe, expect, it, beforeEach } from 'vitest';
import { openDb, type DB } from '../db.js';
import { createApp } from '../index.js';
import type { Hono } from 'hono';
import type { AppEnv } from '../auth.js';

let db: DB;
let app: Hono<AppEnv>;
let adminCookie: string;
let learnerCookie: string;

beforeEach(async () => {
  db = openDb(':memory:');
  app = createApp(db);
  const reg = async (u: string) => {
    const res = await app.request('/api/auth/register', { method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: u, displayName: u, password: 'longenough1' }) });
    if (res.status === 201) return (res.headers.get('set-cookie') ?? '').split(';')[0]!;
    // second user needs an invite
    db.prepare(`INSERT INTO invites (code, created_by, uses_left) VALUES ('INV', 1, 5)`).run();
    const res2 = await app.request('/api/auth/register', { method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ inviteCode: 'INV', username: u, displayName: u, password: 'longenough1' }) });
    return (res2.headers.get('set-cookie') ?? '').split(';')[0]!;
  };
  adminCookie = await reg('admin');
  learnerCookie = await reg('learner1');
});

describe('invites', () => {
  it('admin creates and lists invites', async () => {
    const res = await app.request('/api/admin/invites', { method: 'POST',
      headers: { 'content-type': 'application/json', cookie: adminCookie },
      body: JSON.stringify({ usesLeft: 3 }) });
    expect(res.status).toBe(201);
    const { code } = await res.json() as { code: string };
    expect(code).toMatch(/^[A-Z2-9]{8}$/);
    const list = await app.request('/api/admin/invites', { headers: { cookie: adminCookie } });
    expect((await list.json() as unknown[]).length).toBeGreaterThanOrEqual(1);
  });

  it('learner cannot create invites', async () => {
    const res = await app.request('/api/admin/invites', { method: 'POST',
      headers: { 'content-type': 'application/json', cookie: learnerCookie },
      body: JSON.stringify({}) });
    expect(res.status).toBe(403);
  });
});

describe('roster + csv', () => {
  it('roster shows aggregate stats', async () => {
    const res = await app.request('/api/admin/roster', { headers: { cookie: adminCookie } });
    const body = await res.json() as { users: Array<{ username: string; quizAttempts: number }> };
    expect(body.users.map((u) => u.username).sort()).toEqual(['admin', 'learner1']);
  });

  it('csv export has header + rows', async () => {
    const res = await app.request('/api/admin/export.csv', { headers: { cookie: adminCookie } });
    expect(res.headers.get('content-type')).toContain('text/csv');
    const text = await res.text();
    expect(text.split('\n')[0]).toBe('username,display_name,role,last_seen_at,quiz_attempts,best_quiz_pct,exam_attempts,best_exam_pct,cards_tracked');
    expect(text.trim().split('\n')).toHaveLength(3);
  });
});

describe('users', () => {
  it('admin creates a user and resets a password', async () => {
    const res = await app.request('/api/admin/users', { method: 'POST',
      headers: { 'content-type': 'application/json', cookie: adminCookie },
      body: JSON.stringify({ username: 'newbie', displayName: 'New', password: 'longenough1', role: 'learner' }) });
    expect(res.status).toBe(201);
    const id = (await res.json() as { user: { id: number } }).user.id;
    const reset = await app.request(`/api/admin/users/${id}/password`, { method: 'POST',
      headers: { 'content-type': 'application/json', cookie: adminCookie },
      body: JSON.stringify({ password: 'anotherlong1' }) });
    expect(reset.status).toBe(204);
    const login = await app.request('/api/auth/login', { method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'newbie', password: 'anotherlong1' }) });
    expect(login.status).toBe(200);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm --filter tet-server test`
Expected: FAIL — `../routes/data.js` / `../routes/admin.js` not found.

- [ ] **Step 4: Implement data.ts and admin.ts**

`apps/server/src/routes/data.ts`:

```ts
import { Hono } from 'hono';
import type { AppEnv } from '../auth.js';
import { requireAuth } from '../auth.js';
import type { DB } from '../db.js';

export function dataRoutes(): Hono<AppEnv> {
  const r = new Hono<AppEnv>();
  r.use('*', requireAuth());

  r.get('/progress', (c) => {
    const rows = c.get('db').prepare('SELECT key, track, module, item_id, status, updated_at FROM progress WHERE user_id = ?')
      .all(c.get('user')!.id) as Array<{ key: string; track: string; module: string; item_id: string; status: string; updated_at: string }>;
    const map: Record<string, unknown> = {};
    for (const row of rows) {
      map[row.key] = { track: row.track, module: row.module, itemId: row.item_id, status: row.status, updatedAt: row.updated_at };
    }
    return c.json(map);
  });

  r.put('/progress', async (c) => {
    const { entries } = await c.req.json<{ entries: Array<{ track: string; module: string; itemId: string; status: string; updatedAt: string }> }>();
    const stmt = c.get('db').prepare(`
      INSERT INTO progress (user_id, key, track, module, item_id, status, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (user_id, key) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at`);
    for (const e of entries) {
      stmt.run(c.get('user')!.id, `${e.track}/${e.module}/${e.itemId}`, e.track, e.module, e.itemId, e.status, e.updatedAt);
    }
    return c.body(null, 204);
  });

  r.post('/attempts/quiz', async (c) => {
    const a = await c.req.json<{ attemptId: string; module: string; score: number; max: number; perQuestion: Record<string, boolean>; createdAt: string }>();
    const info = c.get('db').prepare(`
      INSERT OR IGNORE INTO quiz_attempts (user_id, attempt_id, module, score, max_score, per_question, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(c.get('user')!.id, a.attemptId, a.module, a.score, a.max, JSON.stringify(a.perQuestion), a.createdAt);
    return c.json({ duplicate: info.changes === 0 });
  });

  r.get('/attempts/quiz', (c) => {
    const moduleId = c.req.query('module');
    const rows = c.get('db').prepare(`
      SELECT attempt_id, module, score, max_score, per_question, created_at
      FROM quiz_attempts WHERE user_id = ? ${moduleId ? 'AND module = ?' : ''}
      ORDER BY created_at DESC`)
      .all(...(moduleId ? [c.get('user')!.id, moduleId] : [c.get('user')!.id])) as Array<Record<string, unknown>>;
    return c.json(rows.map((row) => ({
      attemptId: row.attempt_id, module: row.module, score: row.score, max: row.max_score,
      perQuestion: JSON.parse(String(row.per_question)), createdAt: row.created_at,
    })));
  });

  r.post('/attempts/exam', async (c) => {
    const a = await c.req.json<{ attemptId: string; examId: string; score: number; max: number; passed: boolean; scorePct: number; perTag: Record<string, { correct: number; total: number }>; responses: Record<string, number[]>; createdAt: string; durationSec: number }>();
    const info = c.get('db').prepare(`
      INSERT OR IGNORE INTO exam_attempts
        (user_id, attempt_id, exam_id, score, max_score, passed, score_pct, per_tag, responses, duration_sec, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(c.get('user')!.id, a.attemptId, a.examId, a.score, a.max, a.passed ? 1 : 0, a.scorePct,
        JSON.stringify(a.perTag), JSON.stringify(a.responses), a.durationSec, a.createdAt);
    return c.json({ duplicate: info.changes === 0 });
  });

  r.get('/attempts/exam', (c) => {
    const examId = c.req.query('examId');
    const rows = c.get('db').prepare(`
      SELECT attempt_id, exam_id, score, max_score, passed, score_pct, per_tag, responses, duration_sec, created_at
      FROM exam_attempts WHERE user_id = ? ${examId ? 'AND exam_id = ?' : ''}
      ORDER BY created_at DESC`)
      .all(...(examId ? [c.get('user')!.id, examId] : [c.get('user')!.id])) as Array<Record<string, unknown>>;
    return c.json(rows.map((row) => ({
      attemptId: row.attempt_id, examId: row.exam_id, score: row.score, max: row.max_score,
      passed: row.passed === 1, scorePct: row.score_pct,
      perTag: JSON.parse(String(row.per_tag)), responses: JSON.parse(String(row.responses)),
      durationSec: row.duration_sec, createdAt: row.created_at,
    })));
  });

  r.post('/reviews', async (c) => {
    const rev = await c.req.json<{ cardId: string; grade: string; state: { ease: number; intervalDays: number; dueAt: string; reps: number; lapses: number }; createdAt: string }>();
    const db = c.get('db');
    const tx = db.transaction(() => {
      db.prepare(`INSERT INTO card_reviews (user_id, card_id, grade, ease, interval_days, due_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)`)
        .run(c.get('user')!.id, rev.cardId, rev.grade, rev.state.ease, rev.state.intervalDays, rev.state.dueAt, rev.createdAt);
      db.prepare(`INSERT INTO card_states (user_id, card_id, ease, interval_days, due_at, reps, lapses, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (user_id, card_id) DO UPDATE SET
          ease = excluded.ease, interval_days = excluded.interval_days, due_at = excluded.due_at,
          reps = excluded.reps, lapses = excluded.lapses, updated_at = excluded.updated_at`)
        .run(c.get('user')!.id, rev.cardId, rev.state.ease, rev.state.intervalDays, rev.state.dueAt, rev.state.reps, rev.state.lapses, rev.createdAt);
    });
    tx();
    return c.body(null, 204);
  });

  r.get('/reviews', (c) => {
    const rows = c.get('db').prepare('SELECT card_id, ease, interval_days, due_at, reps, lapses FROM card_states WHERE user_id = ?')
      .all(c.get('user')!.id) as Array<{ card_id: string; ease: number; interval_days: number; due_at: string; reps: number; lapses: number }>;
    const out: Record<string, unknown> = {};
    for (const row of rows) {
      out[row.card_id] = { ease: row.ease, intervalDays: row.interval_days, dueAt: row.due_at, reps: row.reps, lapses: row.lapses };
    }
    return c.json(out);
  });

  r.post('/import', async (c) => {
    const data = await c.req.json<{ progress: Record<string, { track: string; module: string; itemId: string; status: string; updatedAt: string }>; quizAttempts: Array<{ attemptId: string; module: string; score: number; max: number; perQuestion: Record<string, boolean>; createdAt: string }>; examAttempts: Array<{ attemptId: string; examId: string; score: number; max: number; passed: boolean; scorePct: number; perTag: Record<string, { correct: number; total: number }>; responses: Record<string, number[]>; createdAt: string; durationSec: number }>; cardStates: Record<string, { ease: number; intervalDays: number; dueAt: string; reps: number; lapses: number }> }>();
    const db = c.get('db');
    const uid = c.get('user')!.id;
    const tx = db.transaction(() => {
      for (const e of Object.values(data.progress)) {
        db.prepare(`INSERT INTO progress (user_id, key, track, module, item_id, status, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT (user_id, key) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at`)
          .run(uid, `${e.track}/${e.module}/${e.itemId}`, e.track, e.module, e.itemId, e.status, e.updatedAt);
      }
      for (const a of data.quizAttempts) {
        db.prepare(`INSERT OR IGNORE INTO quiz_attempts (user_id, attempt_id, module, score, max_score, per_question, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)`)
          .run(uid, a.attemptId, a.module, a.score, a.max, JSON.stringify(a.perQuestion), a.createdAt);
      }
      for (const a of data.examAttempts) {
        db.prepare(`INSERT OR IGNORE INTO exam_attempts (user_id, attempt_id, exam_id, score, max_score, passed, score_pct, per_tag, responses, duration_sec, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
          .run(uid, a.attemptId, a.examId, a.score, a.max, a.passed ? 1 : 0, a.scorePct,
            JSON.stringify(a.perTag), JSON.stringify(a.responses), a.durationSec, a.createdAt);
      }
      for (const [cardId, s] of Object.entries(data.cardStates)) {
        db.prepare(`INSERT INTO card_states (user_id, card_id, ease, interval_days, due_at, reps, lapses, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT (user_id, card_id) DO UPDATE SET
            ease = excluded.ease, interval_days = excluded.interval_days, due_at = excluded.due_at,
            reps = excluded.reps, lapses = excluded.lapses, updated_at = excluded.updated_at`)
          .run(uid, cardId, s.ease, s.intervalDays, s.dueAt, s.reps, s.lapses, new Date().toISOString());
      }
    });
    tx();
    return c.body(null, 204);
  });

  return r;
}
```

`apps/server/src/routes/admin.ts`:

```ts
import { Hono } from 'hono';
import { randomBytes } from 'node:crypto';
import type { AppEnv, AuthedUser } from '../auth.js';
import { hashPassword, requireAdmin } from '../auth.js';

const CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function inviteCode(): string {
  const bytes = randomBytes(8);
  return Array.from(bytes, (b) => CODE_ALPHABET[b % 32]).join('');
}

export function adminRoutes(): Hono<AppEnv> {
  const r = new Hono<AppEnv>();
  r.use('*', requireAdmin());

  r.get('/roster', (c) => {
    const rows = c.get('db').prepare(`
      SELECT u.id, u.username, u.display_name, u.role, u.last_seen_at,
        (SELECT COUNT(*) FROM quiz_attempts q WHERE q.user_id = u.id) AS quiz_attempts,
        (SELECT MAX(ROUND(100.0 * q.score / q.max_score)) FROM quiz_attempts q WHERE q.user_id = u.id AND q.max_score > 0) AS best_quiz_pct,
        (SELECT COUNT(*) FROM exam_attempts e WHERE e.user_id = u.id) AS exam_attempts,
        (SELECT MAX(e.score_pct) FROM exam_attempts e WHERE e.user_id = u.id) AS best_exam_pct,
        (SELECT COUNT(*) FROM card_states s WHERE s.user_id = u.id) AS cards_tracked
      FROM users u ORDER BY u.username`).all() as Array<Record<string, unknown>>;
    return c.json({
      users: rows.map((row) => ({
        id: row.id, username: row.username, displayName: row.display_name, role: row.role,
        lastSeenAt: row.last_seen_at, quizAttempts: row.quiz_attempts,
        bestQuizPct: row.best_quiz_pct, examAttempts: row.exam_attempts,
        bestExamPct: row.best_exam_pct, cardsTracked: row.cards_tracked,
      })),
    });
  });

  r.post('/invites', async (c) => {
    const body = await c.req.json<{ usesLeft?: number; expiresAt?: string }>().catch(() => ({}) as { usesLeft?: number; expiresAt?: string });
    const code = inviteCode();
    c.get('db').prepare('INSERT INTO invites (code, created_by, uses_left, expires_at) VALUES (?, ?, ?, ?)')
      .run(code, c.get('user')!.id, body.usesLeft ?? 1, body.expiresAt ?? null);
    return c.json({ code }, 201);
  });

  r.get('/invites', (c) => {
    const rows = c.get('db').prepare('SELECT code, uses_left, expires_at, created_by FROM invites ORDER BY rowid DESC').all() as Array<Record<string, unknown>>;
    return c.json(rows.map((row) => ({ code: row.code, usesLeft: row.uses_left, expiresAt: row.expires_at, createdBy: row.created_by })));
  });

  r.post('/users', async (c) => {
    const body = await c.req.json<{ username: string; displayName: string; password: string; role: 'admin' | 'learner' }>();
    if (!/^[a-z0-9_-]{3,32}$/.test(body.username)) return c.json({ error: 'invalid username' }, 400);
    if (body.password.length < 8) return c.json({ error: 'password must be at least 8 characters' }, 400);
    const exists = c.get('db').prepare('SELECT id FROM users WHERE username = ?').get(body.username);
    if (exists) return c.json({ error: 'username already taken' }, 409);
    const info = c.get('db').prepare(
      'INSERT INTO users (username, display_name, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(body.username, body.displayName || body.username, hashPassword(body.password), body.role, new Date().toISOString());
    return c.json({ user: { id: Number(info.lastInsertRowid), username: body.username, role: body.role } }, 201);
  });

  r.post('/users/:id/password', async (c) => {
    const { password } = await c.req.json<{ password: string }>();
    if (password.length < 8) return c.json({ error: 'password must be at least 8 characters' }, 400);
    const info = c.get('db').prepare('UPDATE users SET password_hash = ? WHERE id = ?')
      .run(hashPassword(password), Number(c.req.param('id')));
    if (info.changes === 0) return c.json({ error: 'no such user' }, 404);
    c.get('db').prepare('DELETE FROM sessions WHERE user_id = ?').run(Number(c.req.param('id')));
    return c.body(null, 204);
  });

  r.get('/export.csv', (c) => {
    const rows = c.get('db').prepare(`
      SELECT u.username, u.display_name, u.role, u.last_seen_at,
        (SELECT COUNT(*) FROM quiz_attempts q WHERE q.user_id = u.id) AS quiz_attempts,
        (SELECT MAX(ROUND(100.0 * q.score / q.max_score)) FROM quiz_attempts q WHERE q.user_id = u.id AND q.max_score > 0) AS best_quiz_pct,
        (SELECT COUNT(*) FROM exam_attempts e WHERE e.user_id = u.id) AS exam_attempts,
        (SELECT MAX(e.score_pct) FROM exam_attempts e WHERE e.user_id = u.id) AS best_exam_pct,
        (SELECT COUNT(*) FROM card_states s WHERE s.user_id = u.id) AS cards_tracked
      FROM users u ORDER BY u.username`).all() as Array<Record<string, unknown>>;
    const header = 'username,display_name,role,last_seen_at,quiz_attempts,best_quiz_pct,exam_attempts,best_exam_pct,cards_tracked';
    const lines = rows.map((row) => [
      row.username, row.display_name, row.role, row.last_seen_at ?? '', row.quiz_attempts,
      row.best_quiz_pct ?? '', row.exam_attempts, row.best_exam_pct ?? '', row.cards_tracked,
    ].join(','));
    return c.text([header, ...lines].join('\n'), 200, { 'content-type': 'text/csv' });
  });

  return r;
}
```

Modify `apps/server/src/index.ts` at the marked lines:

```ts
  import { dataRoutes } from './routes/data.js';
  import { adminRoutes } from './routes/admin.js';
  // ...
  app.route('/api', dataRoutes());
  app.route('/api/admin', adminRoutes());
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm --filter tet-server test`
Expected: PASS — auth 6/6, data 5/5, admin 5/5 (new totals may differ ±1; all green is the gate).

- [ ] **Step 6: Commit**

```bash
git add apps/server/
git commit -m "feat(server): progress, idempotent attempts, reviews, import, admin roster/invites/users/CSV"
```

---

### Task 9: ServerAdapter + adapter parity + 401 re-auth buffering

**Files:**
- Create: `packages/storage/src/server.ts`
- Modify: `packages/storage/src/types.ts` (add `ExamDraft` + 3 adapter methods), `packages/storage/src/local.ts` (implement them), `packages/storage/src/parity.ts` (cover them)
- Create: `apps/server/src/storage-parity.test.ts` (lives in tet-server, which depends on tet-storage — keeps `packages/*` free of app-boundary imports)

**Interfaces:**
- Consumes: `StorageAdapter` contract (Task 6), server routes (Task 8).
- Produces:
  - `interface ExamDraft { examId: string; responses: Record<string, number[]>; flags: string[]; startedAt: string; remainingSec: number; }`
  - Adapter additions: `putExamDraft(d: ExamDraft): Promise<void>`, `getExamDraft(examId: string): Promise<ExamDraft | null>`, `clearExamDraft(examId: string): Promise<void>`
  - `createServerAdapter(opts: { serverUrl: string; fetchLike?: typeof fetch; onUnauthorized?: () => Promise<void> }): StorageAdapter` — sends cookies via `credentials: 'include'`; on a 401 it invokes `onUnauthorized()`, **buffers write calls** (progress, attempts, reviews, drafts) in memory, and replays them on the next successful request.
  - Server routes (added in this task): `PUT /api/exam-draft/:examId` body `ExamDraft` → 204; `GET /api/exam-draft/:examId` → draft or `null`; `DELETE /api/exam-draft/:examId` → 204. Add table `exam_drafts (user_id, exam_id, draft TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY (user_id, exam_id))` to `schema.sql` (append; `CREATE TABLE IF NOT EXISTS` keeps existing DBs valid). Also add `"tet-storage": "workspace:*"` to `apps/server` **devDependencies** so the parity test can import both packages.

- [ ] **Step 1: Write the failing tests**

`apps/server/src/storage-parity.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { serve } from '@hono/node-server';
import { openDb, type DB } from './db.js';
import { createApp } from './index.js';
import { createServerAdapter, runParitySuite } from 'tet-storage';

async function startServer(): Promise<{ url: string; db: DB; close: () => Promise<void> }> {
  const db = openDb(':memory:');
  const app = createApp(db);
  const server = serve({ fetch: app.fetch, port: 0 });
  const addr = server.address();
  const port = typeof addr === 'object' && addr ? addr.port : 0;
  return { url: `http://127.0.0.1:${port}`, db, close: () => new Promise((res) => server.close(() => res())) };
}

/** Minimal cookie jar over fetch so browser-style credentials work in Node. */
function jarFetch(baseUrl: string): { fetchLike: typeof fetch; cookie: () => string } {
  let stored = '';
  const fetchLike: typeof fetch = async (input, init = {}) => {
    const headers = new Headers(init.headers);
    if (stored) headers.set('cookie', stored);
    const res = await fetch(baseUrl + String(input), { ...init, headers });
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) stored = setCookie.split(';')[0]!;
    return res;
  };
  return { fetchLike, cookie: () => stored };
}

describe('ServerAdapter', () => {
  it('passes the parity suite against a real server', async () => {
    const { url, db, close } = await startServer();
    try {
      await fetch(url + '/api/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: 'parity', displayName: 'P', password: 'longenough1' }) });
      const { fetchLike } = jarFetch(url);
      await runParitySuite(async () => createServerAdapter({ serverUrl: url, fetchLike }));
    } finally {
      db.close();
      await close();
    }
  });

  it('buffers writes on 401 and flushes after re-auth (Review Focus #5)', async () => {
    const { url, db, close } = await startServer();
    try {
      const reg = await fetch(url + '/api/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: 'u1', displayName: 'U', password: 'longenough1' }) });
      const sessionCookie = (reg.headers.get('set-cookie') ?? '').split(';')[0]!;

      let token = sessionCookie.split('=')[1]!;
      const fetchLike: typeof fetch = async (input, init = {}) => {
        const headers = new Headers(init.headers);
        headers.set('cookie', `tet_session=${token}`);
        return fetch(url + String(input), { ...init, headers });
      };

      let reAuthCalls = 0;
      const adapter = createServerAdapter({
        serverUrl: url,
        fetchLike,
        onUnauthorized: async () => {
          reAuthCalls++;
          token = 'refreshtoken'; // simulate fresh login cookie
          await fetch(url + '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ username: 'u1', password: 'longenough1' }) });
          // capture the new cookie
          const login = await fetch(url + '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ username: 'u1', password: 'longenough1' }) });
          token = (login.headers.get('set-cookie') ?? '').split('=')[1]!.split(';')[0]!;
        },
      });

      // Kill the server-side session to force a 401 on the next write.
      db.prepare('DELETE FROM sessions').run();

      const draft = { examId: 'e1', responses: { q1: [0] }, flags: [], startedAt: '2026-11-07T00:00:00Z', remainingSec: 3000 };
      await adapter.putExamDraft(draft); // 401 → buffered, re-auth runs, replay succeeds

      expect(reAuthCalls).toBeGreaterThanOrEqual(1);
      const got = await adapter.getExamDraft('e1');
      expect(got).not.toBeNull();
      expect(got!.responses).toEqual({ q1: [0] });
    } finally {
      db.close();
      await close();
    }
  });
});
```

(The second test's `onUnauthorized` logs in twice — harmless duplication to keep the test self-contained; the second login's cookie is the one used.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter tet-server test -- storage-parity`
Expected: FAIL — `tet-storage` resolves but exports no `createServerAdapter` yet (and the exam-draft routes don't exist).

- [ ] **Step 3: Implement ExamDraft in types + LocalAdapter + parity, then ServerAdapter**

Note: `packages/storage/src/index.ts` must export `createServerAdapter` and `runParitySuite` alongside the Task 6 surface.

`packages/storage/src/types.ts` — add:

```ts
export interface ExamDraft {
  examId: string;
  responses: Record<string, number[]>;
  flags: string[];
  startedAt: string;
  remainingSec: number;
}
```

and the three methods on `StorageAdapter`.

`packages/storage/src/local.ts` — add a `examDrafts` object store (`keyPath 'examId'`) to the upgrade, and implement the three methods (put = `tx.put('examDrafts', d)`; get = `await d.get('examDrafts', examId) ?? null`; clear = `await d.delete('examDrafts', examId)`).

`packages/storage/src/parity.ts` — append to the suite:

```ts
  // exam drafts (autosave)
  const draft = { examId: 'e1', responses: { q1: [0] }, flags: ['q2'], startedAt: '2026-11-07T00:00:00Z', remainingSec: 1800 };
  await a.putExamDraft(draft);
  expect(await a.getExamDraft('e1')).toEqual(draft);
  expect(await a.getExamDraft('e2')).toBeNull();
  await a.putExamDraft({ ...draft, responses: { q1: [1] } });
  expect((await a.getExamDraft('e1'))!.responses).toEqual({ q1: [1] });
  await a.clearExamDraft('e1');
  expect(await a.getExamDraft('e1')).toBeNull();
```

`packages/storage/src/server.ts`:

```ts
import type {
  CardReview, ExamAttempt, ExamDraft, MigratableData, ProgressEntry,
  ProgressMap, QuizAttempt, SessionInfo, StorageAdapter,
} from './types.js';

interface BufferableWrite {
  op: 'progress' | 'quiz' | 'exam' | 'review' | 'draft' | 'clearDraft';
  body: unknown;
  path?: string;
}

export function createServerAdapter(opts: {
  serverUrl: string;
  fetchLike?: typeof fetch;
  onUnauthorized?: () => Promise<void>;
}): StorageAdapter {
  const base = opts.serverUrl.replace(/\/$/, '');
  const doFetch = opts.fetchLike ?? fetch.bind(globalThis);
  let buffer: BufferableWrite[] = [];
  let healthy = false;

  async function call(path: string, init: RequestInit): Promise<Response> {
    const res = await doFetch(base + path, {
      ...init,
      credentials: 'include',
      headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
    });
    if (res.status === 401) {
      healthy = false;
      if (opts.onUnauthorized) await opts.onUnauthorized();
      throw new Unauthorized();
    }
    return res;
  }

  class Unauthorized extends Error {}

  /** Runs a write; on 401 it is buffered and replayed after the next success. */
  async function write(op: BufferableWrite['op'], path: string, body: unknown, method = 'POST'): Promise<void> {
    if (!healthy) {
      // Try to flush anything already buffered first, then this write.
      const queue = [...buffer, { op, body, path }];
      buffer = [];
      let ok = true;
      for (const item of queue) {
        try {
          const res = await call(item.path ?? path, { method: item.op === 'progress' ? 'PUT' : item.op === 'clearDraft' ? 'DELETE' : 'POST', body: JSON.stringify(item.body) });
          if (item.op === op && item.path === path) { /* this write landed */ }
        } catch (err) {
          if (err instanceof Unauthorized) { ok = false; }
          buffer = queue.slice(queue.indexOf(item));
          break;
        }
      }
      if (ok) { healthy = true; return; }
      buffer.push({ op, body, path });
      return;
    }
    try {
      await call(path, { method, body: JSON.stringify(body) });
    } catch (err) {
      if (err instanceof Unauthorized) buffer.push({ op, body, path });
      else throw err;
    }
  }

  async function getJson<T>(path: string, fallback: T): Promise<T> {
    try {
      const res = await call(path, { method: 'GET' });
      healthy = true;
      if (res.status === 204) return fallback;
      return await res.json() as T;
    } catch (err) {
      if (err instanceof Unauthorized) return fallback;
      throw err;
    }
  }

  return {
    async getSession(): Promise<SessionInfo | null> {
      try {
        const res = await call('/api/me', { method: 'GET' });
        healthy = true;
        const body = await res.json() as { user: { id: number; username: string; role: 'admin' | 'learner' } };
        return {
          mode: 'cohort', userId: String(body.user.id),
          displayName: body.user.username, role: body.user.role, serverUrl: base,
        };
      } catch (err) {
        if (err instanceof Unauthorized) return null;
        throw err;
      }
    },
    async putSession() { /* cohort session state lives in cookies; nothing to store */ },
    async getProgress(): Promise<ProgressMap> { return getJson('/api/progress', {}); },
    async putProgress(entries: ProgressEntry[]) { await write('progress', '/api/progress', { entries }); },
    async recordQuizAttempt(a: QuizAttempt) { await write('quiz', '/api/attempts/quiz', a); },
    async getQuizAttempts(moduleId?: string): Promise<QuizAttempt[]> {
      return getJson(`/api/attempts/quiz${moduleId ? `?module=${encodeURIComponent(moduleId)}` : ''}`, []);
    },
    async recordExamAttempt(a: ExamAttempt) { await write('exam', '/api/attempts/exam', a); },
    async getExamAttempts(examId?: string): Promise<ExamAttempt[]> {
      return getJson(`/api/attempts/exam${examId ? `?examId=${encodeURIComponent(examId)}` : ''}`, []);
    },
    async recordCardReview(r: CardReview) { await write('review', '/api/reviews', r); },
    async getReviewState(): Promise<Record<string, import('tet-core').CardState>> {
      return getJson('/api/reviews', {});
    },
    async putExamDraft(d: ExamDraft) { await write('draft', `/api/exam-draft/${encodeURIComponent(d.examId)}`, d, 'PUT'); },
    async getExamDraft(examId: string): Promise<ExamDraft | null> {
      try {
        const res = await call(`/api/exam-draft/${encodeURIComponent(examId)}`, { method: 'GET' });
        healthy = true;
        return res.status === 204 ? null : await res.json() as ExamDraft;
      } catch (err) {
        if (err instanceof Unauthorized) return null;
        throw err;
      }
    },
    async clearExamDraft(examId: string) { await write('clearDraft', `/api/exam-draft/${encodeURIComponent(examId)}`, undefined, 'DELETE'); },
    async exportAll(): Promise<MigratableData> {
      const [progress, quizAttempts, examAttempts, cardStates] = await Promise.all([
        this.getProgress(), this.getQuizAttempts(), this.getExamAttempts(), this.getReviewState(),
      ]);
      return { progress, quizAttempts, examAttempts, cardStates };
    },
    async importAll(data: MigratableData) { await write('progress', '/api/import', data); },
  };
}
```

Server additions in `apps/server/src/routes/data.ts`:

```ts
  r.put('/exam-draft/:examId', async (c) => {
    const draft = await c.req.json<Record<string, unknown>>();
    c.get('db').prepare(`INSERT INTO exam_drafts (user_id, exam_id, draft, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT (user_id, exam_id) DO UPDATE SET draft = excluded.draft, updated_at = excluded.updated_at`)
      .run(c.get('user')!.id, c.req.param('examId'), JSON.stringify(draft), new Date().toISOString());
    return c.body(null, 204);
  });

  r.get('/exam-draft/:examId', (c) => {
    const row = c.get('db').prepare('SELECT draft FROM exam_drafts WHERE user_id = ? AND exam_id = ?')
      .get(c.get('user')!.id, c.req.param('examId')) as { draft: string } | undefined;
    if (!row) return c.body(null, 204);
    return c.body(row.draft, 200, { 'content-type': 'application/json' });
  });

  r.delete('/exam-draft/:examId', (c) => {
    c.get('db').prepare('DELETE FROM exam_drafts WHERE user_id = ? AND exam_id = ?')
      .run(c.get('user')!.id, c.req.param('examId'));
    return c.body(null, 204);
  });
```

Append to `schema.sql`:

```sql
CREATE TABLE IF NOT EXISTS exam_drafts (
  user_id INTEGER NOT NULL REFERENCES users(id),
  exam_id TEXT NOT NULL,
  draft TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, exam_id)
);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter tet-storage test && pnpm --filter tet-server test`
Expected: PASS — parity green against BOTH adapters (draft tests included); server suites green.

- [ ] **Step 5: Commit**

```bash
git add packages/storage/ apps/server/
git commit -m "feat(storage): ServerAdapter with 401 re-auth buffering, exam drafts on both adapters, parity green"
```

---

### Task 10: Web app shell — router, session/mode context, content loading, dashboard

**Files:**
- Create: `apps/web/package.json`, `apps/web/tsconfig.json`, `apps/web/vite.config.ts`, `apps/web/index.html`
- Create: `apps/web/src/main.tsx`, `apps/web/src/App.tsx`, `apps/web/src/routes.tsx`, `apps/web/src/styles.css`
- Create: `apps/web/src/state/session.tsx`, `apps/web/src/lib/content.ts`
- Create: `apps/web/src/pages/Dashboard.tsx`, `apps/web/src/components/Layout.tsx`, `apps/web/src/components/ProgressBar.tsx`
- Test: `apps/web/src/pages/Dashboard.test.tsx`

**Interfaces:**
- Consumes: `ContentBundle`, `ContentBundleSchema` (Task 1); `createLocalAdapter`, `createServerAdapter`, `StorageAdapter`, `SessionInfo` (Tasks 6/9); `trackCompletion`, `isReady` (Task 3).
- Produces:
  - `SessionProvider` + `useSession(): { session: SessionInfo | null; adapter: StorageAdapter; refresh(): Promise<void>; connectCohort(url: string): Promise<SessionInfo>; disconnect(): Promise<void> }` — app boots solo (`createLocalAdapter()`); `connectCohort` swaps in `createServerAdapter({ serverUrl, onUnauthorized })` and reads `getSession()`; session state lives in React context, refreshed via `refresh()`.
  - `loadContent(): Promise<ContentBundle>` — `fetch('content.json')` (relative → works under Ondana's base path), parsed through `ContentBundleSchema`, memoized module-level; a `ContentProvider` React context wraps the router.
  - Routes: `/` Dashboard; `/track/:trackId`; `/module/:moduleId`; `/lesson/:lessonId`; `/quiz/:moduleId`; `/flashcards` and `/flashcards/:moduleId`; `/exam/:examId` + `/exam/:examId/report/:attemptId`; `/login`; `/admin`.
  - Dashboard sections: per-track progress ring (module completion %), "Continue" link (first module with unfinished lessons), flashcards-due count, latest quiz/exam scores. **Empty states for fresh storage** (Review Focus #2).

- [ ] **Step 1: Scaffold the web app**

`apps/web/package.json`:

```json
{
  "name": "tet-web",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -p tsconfig.json && vite build",
    "test": "vitest run",
    "preview": "vite preview"
  },
  "dependencies": {
    "tet-core": "workspace:*",
    "tet-storage": "workspace:*",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router": "^7.1.0",
    "marked": "^15.0.0",
    "dompurify": "^3.2.0"
  },
  "devDependencies": {
    "@testing-library/dom": "^10.4.0",
    "@testing-library/react": "^16.1.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "jsdom": "^25.0.0",
    "typescript": "^5.7.0",
    "vite": "^7.0.0",
    "vitest": "^3.0.0"
  }
}
```

`apps/web/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "noEmit": true,
    "jsx": "react-jsx",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vite/client"]
  },
  "include": ["src", "vite.config.ts"]
}
```

`apps/web/vite.config.ts`:

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './', // relative asset paths — required for Ondana static hosting
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
```

`apps/web/index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Test Engineer Track</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`apps/web/src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

`apps/web/src/App.tsx`:

```tsx
import { BrowserRouter } from 'react-router';
import { SessionProvider } from './state/session.js';
import { AppRoutes } from './routes.js';

export function App() {
  return (
    <SessionProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </SessionProvider>
  );
}
```

`apps/web/src/routes.tsx`:

```tsx
import { Route, Routes } from 'react-router';
import { Layout } from './components/Layout.js';
import { Dashboard } from './pages/Dashboard.js';

// Pages for Tasks 11-15 are imported here as they land:
// TrackPage, ModulePage, LessonPage, QuizPage, FlashcardsPage,
// ExamPage, ExamReportPage, LoginPage, AdminPage.
export function AppRoutes() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        {/* added in Tasks 11-15 */}
      </Routes>
    </Layout>
  );
}
```

`apps/web/src/styles.css` — minimal design tokens (clean light theme, readable long-form):

```css
:root {
  --bg: #f7f7f9; --surface: #ffffff; --ink: #1a1a2e; --muted: #6b7280;
  --accent: #4f46e5; --ok: #16a34a; --warn: #d97706; --bad: #dc2626;
  --radius: 10px; --maxw: 760px;
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--ink);
  font: 16px/1.65 system-ui, -apple-system, "Segoe UI", sans-serif; }
a { color: var(--accent); }
.container { max-width: var(--maxw); margin: 0 auto; padding: 1.5rem 1rem 4rem; }
.card { background: var(--surface); border: 1px solid #e5e7eb; border-radius: var(--radius);
  padding: 1.25rem; margin: 1rem 0; }
.muted { color: var(--muted); }
.btn { display: inline-block; background: var(--accent); color: #fff; border: 0;
  border-radius: 8px; padding: 0.55rem 1.1rem; font-size: 1rem; cursor: pointer; }
.btn.secondary { background: #eef0ff; color: var(--accent); }
.bar { height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden; }
.bar > div { height: 100%; background: var(--accent); }
.lesson-body img { max-width: 100%; border: 1px solid #e5e7eb; border-radius: 8px; }
.lesson-body h2 { margin-top: 2.2rem; border-bottom: 1px solid #eceef3; padding-bottom: 0.3rem; }
.grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
.flag { font-size: 0.85rem; padding: 0.15rem 0.5rem; border-radius: 999px; }
.flag.ok { background: #dcfce7; color: var(--ok); }
.flag.warn { background: #fef3c7; color: var(--warn); }
```

`apps/web/src/lib/content.ts`:

```ts
import { ContentBundleSchema, type ContentBundle } from 'tet-core';

let cached: ContentBundle | null = null;

export async function loadContent(): Promise<ContentBundle> {
  if (cached) return cached;
  const res = await fetch('content.json'); // relative: works under any base path
  if (!res.ok) throw new Error(`content.json fetch failed: ${res.status}`);
  cached = ContentBundleSchema.parse(await res.json());
  return cached;
}

export function findModule(bundle: ContentBundle, moduleId: string) {
  for (const track of bundle.tracks) {
    const mod = track.modules.find((m) => m.id === moduleId);
    if (mod) return { track, module: mod };
  }
  return null;
}
```

`apps/web/src/state/session.tsx`:

```tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { createLocalAdapter, createServerAdapter, type SessionInfo, type StorageAdapter } from 'tet-storage';

interface SessionCtx {
  session: SessionInfo | null;
  adapter: StorageAdapter;
  /** Set by ServerAdapter's 401 hook; Layout shows a "session expired" banner until cleared. */
  authExpired: boolean;
  clearAuthExpired: () => void;
  refresh: () => Promise<void>;
  connectCohort: (serverUrl: string) => Promise<void>;
  disconnect: () => Promise<void>;
}

const Ctx = createContext<SessionCtx | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [adapter, setAdapter] = useState<StorageAdapter>(() => createLocalAdapter());
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [authExpired, setAuthExpired] = useState(false);

  useEffect(() => {
    void adapter.getSession().then(setSession);
  }, [adapter]);

  const ctx: SessionCtx = {
    adapter,
    session,
    authExpired,
    clearAuthExpired: () => setAuthExpired(false),
    refresh: async () => setSession(await adapter.getSession()),
    connectCohort: async (serverUrl: string) => {
      const next = createServerAdapter({
        serverUrl,
        onUnauthorized: () => { setAuthExpired(true); return Promise.resolve(); },
      });
      const s = await next.getSession();
      if (!s) throw new Error('Could not reach server or sign in');
      setAdapter(next);
      setSession(s);
      setAuthExpired(false);
    },
    disconnect: async () => {
      setAdapter(createLocalAdapter());
      setSession(await createLocalAdapter().getSession());
    },
  };

  return <Ctx.Provider value={ctx}>{children}</Ctx.Provider>;
}

export function useSession(): SessionCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSession outside SessionProvider');
  return ctx;
}
```

(Rule during implementation: clean this up — `disconnect()` must call the *current* adapter's logout flow (`POST /api/auth/logout` when cohort) via a stored reference; the nonsense `fetch('')` line above is a transcription trap to remove. The behavior contract is: disconnect → if cohort, POST logout; → swap to a fresh LocalAdapter → refresh session (solo session may be `null` until first visit).)

`apps/web/src/components/Layout.tsx`:

```tsx
import { type ReactNode } from 'react';
import { Link } from 'react-router';
import { useSession } from '../state/session.js';

export function Layout({ children }: { children: ReactNode }) {
  const { session, authExpired } = useSession();
  return (
    <>
      <header className="card" style={{ margin: 0, borderRadius: 0 }}>
        <nav style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Link to="/"><strong>Test Engineer Track</strong></Link>
          <Link to="/flashcards">Flashcards</Link>
          {session?.role === 'admin' && <Link to="/admin">Admin</Link>}
          <span className="muted" style={{ marginLeft: 'auto' }}>
            {session ? (session.mode === 'cohort' ? `cohort · ${session.displayName}` : 'solo mode') : 'solo mode'}
          </span>
        </nav>
      </header>
      {authExpired && (
        <div className="card" style={{ margin: '1rem auto 0', maxWidth: 760, borderColor: '#d97706' }}>
          <strong>Session expired.</strong>{' '}
          <Link to="/login">Sign in again</Link> — your in-progress exam answers are saved locally and will sync after re-auth.
        </div>
      )}
      <main className="container">{children}</main>
    </>
  );
}
```

`apps/web/src/components/ProgressBar.tsx`:

```tsx
export function ProgressBar({ fraction, label }: { fraction: number; label?: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, fraction)) * 100);
  return (
    <div>
      <div className="bar"><div style={{ width: `${pct}%` }} /></div>
      {label && <span className="muted" style={{ fontSize: '0.85rem' }}> {label} · {pct}%</span>}
    </div>
  );
}
```

- [ ] **Step 2: Write the failing Dashboard test**

`apps/web/src/pages/Dashboard.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router';
import { Dashboard } from './Dashboard.js';
import { SessionProvider } from '../state/session.js';
import type { ContentBundle, Track } from 'tet-core';
import type { StorageAdapter } from 'tet-storage';

const track: Track = {
  id: 't1', title: 'ISTQB Foundation', description: 'D', order: 1,
  modules: [{
    id: 'm1', track: 't1', title: 'Fundamentals of Testing', order: 1,
    source: 'x', quizPool: 'x', deck: 'x', lessonIds: ['l1', 'l2'], examWeight: 8,
  }],
  readiness: { examIds: [], passPct: 65, readyPct: 80 },
};

const bundle: ContentBundle = {
  tracks: [track], lessons: {}, questions: [], flashcards: [], exams: [],
  diagrams: {}, questionsByModule: {}, cardsByModule: {},
};

function renderDashboard(adapter: Partial<StorageAdapter>) {
  return render(
    <MemoryRouter>
      <SessionProvider>
        <Dashboard />
      </SessionProvider>
    </MemoryRouter>,
  );
}

// ContentProvider is added to App in this task too; tests mount Dashboard with it.
import { ContentProvider } from '../lib/content-context.js';
// (Dashboard reads content from a ContentProvider context, not a fetch, so tests are deterministic.)

describe('Dashboard', () => {
  it('renders empty states on fresh storage (Review Focus #2)', async () => {
    const emptyAdapter: Partial<StorageAdapter> = {
      getSession: () => Promise.resolve(null),
      getProgress: () => Promise.resolve({}),
      getQuizAttempts: () => Promise.resolve([]),
      getExamAttempts: () => Promise.resolve([]),
      getReviewState: () => Promise.resolve({}),
    };
    renderDashboard(emptyAdapter);
    await waitFor(() => {
      expect(screen.getByText(/no flashcards due/i)).toBeTruthy();
    });
    expect(screen.getByText(/0% complete/i)).toBeTruthy();
  });

  it('shows progress and due count when data exists', async () => {
    const adapter: Partial<StorageAdapter> = {
      getSession: () => Promise.resolve(null),
      getProgress: () => Promise.resolve({
        't1/m1/l1': { track: 't1', module: 'm1', itemId: 'l1', status: 'done', updatedAt: 'x' },
      }),
      getQuizAttempts: () => Promise.resolve([
        { attemptId: 'a', module: 'm1', score: 9, max: 10, perQuestion: {}, createdAt: 'x' },
      ]),
      getExamAttempts: () => Promise.resolve([]),
      getReviewState: () => Promise.resolve({
        c1: { ease: 2.5, intervalDays: 1, dueAt: new Date(Date.now() - 1000).toISOString(), reps: 1, lapses: 0 },
      }),
    };
    renderDashboard(adapter);
    await waitFor(() => {
      expect(screen.getByText(/1 flashcard due/i)).toBeTruthy();
    });
    expect(screen.getByText(/best quiz 90%/i)).toBeTruthy();
  });
});
```

To make the test mount cleanly, Dashboard consumes two contexts; create `apps/web/src/lib/content-context.tsx`:

```tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { loadContent } from './content.js';
import type { ContentBundle } from 'tet-core';

const Ctx = createContext<ContentBundle | null>(null);

export function ContentProvider({ children }: { children: ReactNode }) {
  const [bundle, setBundle] = useState<ContentBundle | null>(null);
  useEffect(() => {
    let alive = true;
    void loadContent().then((b) => { if (alive) setBundle(b); });
    return () => { alive = false; };
  }, []);
  if (!bundle) return <p className="muted">Loading curriculum…</p>;
  return <Ctx.Provider value={bundle}>{children}</Ctx.Provider>;
}

export function useContent(): ContentBundle {
  const b = useContext(Ctx);
  if (!b) throw new Error('useContent outside ContentProvider');
  return b;
}
```

and in tests the provider is seeded directly (add a prop `seed?: ContentBundle` to `ContentProvider` — if `seed` is provided it skips the fetch; Dashboard test wraps `<ContentProvider seed={bundle}>`).

`apps/web/src/pages/Dashboard.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useContent } from '../lib/content-context.js';
import { useSession } from '../state/session.js';
import { trackCompletion } from 'tet-core';
import { ProgressBar } from '../components/ProgressBar.js';

export function Dashboard() {
  const bundle = useContent();
  const { adapter } = useSession();
  const [state, setState] = useState<{
    progress: Record<string, { status: string }>;
    quizBest: Record<string, number>;
    examScores: { scorePct: number; createdAt: string }[];
    dueCount: number;
  } | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const progress = await adapter.getProgress();
      const quiz = await adapter.getQuizAttempts();
      const exams = await adapter.getExamAttempts();
      const states = await adapter.getReviewState();
      const now = Date.now();
      const dueCount = Object.values(states)
        .filter((s) => new Date(s.dueAt).getTime() <= now).length;
      const quizBest: Record<string, number> = {};
      for (const a of quiz) {
        quizBest[a.module] = Math.max(quizBest[a.module] ?? 0, a.max > 0 ? a.score / a.max : 0);
      }
      if (alive) setState({ progress, quizBest, examScores: exams.map((e) => ({ scorePct: e.scorePct, createdAt: e.createdAt })), dueCount });
    })();
    return () => { alive = false; };
  }, [adapter]);

  if (!state) return <p className="muted">Loading…</p>;

  return (
    <div>
      <h1>Dashboard</h1>
      {bundle.tracks.map((track) => {
        const done = track.modules.filter((m) =>
          m.lessonIds.every((lid) => state.progress[`${track.id}/${m.id}/${lid}`]?.status === 'done')).length;
        const nextModule = track.modules.find((m) =>
          !m.lessonIds.every((lid) => state.progress[`${track.id}/${m.id}/${lid}`]?.status === 'done'));
        const bestQuiz = Math.max(0, ...track.modules.map((m) => state.quizBest[m.id] ?? 0));
        return (
          <section className="card" key={track.id}>
            <h2>{track.title}</h2>
            <ProgressBar fraction={trackCompletion(track.modules.map((m) => m.id), new Set(
              track.modules.filter((m) => m.lessonIds.every((lid) => state.progress[`${track.id}/${m.id}/${lid}`]?.status === 'done')).map((m) => m.id),
            ))} label={`${done}/${track.modules.length} modules`} />
            {nextModule
              ? <p><Link className="btn" to={`/module/${nextModule.id}`}>Continue: {nextModule.title}</Link></p>
              : <p className="flag ok">All modules complete — take a mock exam.</p>}
            {bestQuiz > 0 && <p className="muted">best quiz {Math.round(bestQuiz * 100)}%</p>}
            {state.examScores.length > 0 && (
              <p className="muted">last exam {Math.round(state.examScores[0]!.scorePct)}%</p>
            )}
          </section>
        );
      })}
      <section className="card">
        <h2>Review</h2>
        {state.dueCount === 0
          ? <p className="muted">no flashcards due — nice.</p>
          : <p><Link className="btn" to="/flashcards">{state.dueCount} flashcard{state.dueCount === 1 ? '' : 's'} due</Link></p>}
      </section>
    </div>
  );
}
```

(Implementation rule: drop the `hidden {now}` hack — compute `dueCount` inside the effect where `now` already lives; the JSX then needs no clock reference.)

Wrap routes with the provider in `routes.tsx`:

```tsx
export function AppRoutes() {
  return (
    <ContentProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
        </Routes>
      </Layout>
    </ContentProvider>
  );
}
```

- [ ] **Step 3: Run tests to verify they pass**

Run: `pnpm --filter tet-web test`
Expected: PASS — Dashboard 2/2 (fresh-storage empty state + populated state).

- [ ] **Step 4: Verify the app builds and serves**

Run: `pnpm --filter tet-content build && pnpm --filter tet-web build && pnpm --filter tet-web preview &` then open the printed localhost URL.
Expected: dashboard renders the ISTQB track card with Module 1; no console errors. Kill the preview server afterward.

- [ ] **Step 5: Commit**

```bash
git add apps/web/
git commit -m "feat(web): app shell, session/mode context, content provider, dashboard with empty states"
```

---

### Task 11: Web content pages — track, module, lesson (markdown, diagrams, videos, term links)

**Files:**
- Create: `apps/web/src/pages/TrackPage.tsx`, `apps/web/src/pages/ModulePage.tsx`, `apps/web/src/pages/LessonPage.tsx`
- Create: `apps/web/src/components/VideoEmbed.tsx`, `apps/web/src/components/Diagram.tsx`, `apps/web/src/lib/markdown.tsx`
- Modify: `apps/web/src/routes.tsx` (add routes)
- Test: `apps/web/src/pages/LessonPage.test.tsx`, `apps/web/src/lib/markdown.test.tsx`

**Interfaces:**
- Consumes: `useContent()` (Task 10), `useSession().adapter` (Tasks 6/10), `LessonMeta`, `ContentBundle`.
- Produces:
  - `renderMarkdown(body: string, opts: { diagrams: Record<string, string>; onTermLink?: (href: string) => string }): ReactNode` in `lib/markdown.tsx` — markdown → sanitized HTML (marked + DOMPurify) → `img[src^="diagrams/"]` replaced by inline `<Diagram>` SVG (from the bundle) → external `<a>` links get `target="_blank" rel="noopener noreferrer"`.
  - `VideoEmbed({ url, title })` — YouTube watch/shorts URLs → `https://www.youtube.com/embed/<id>` iframe; non-YouTube falls back to a styled outbound link.
  - Lesson completion: "Mark lesson complete" button writes `putProgress([{ track, module, itemId: lesson.id, status: 'done', updatedAt }])` and shows the module's next lesson link.

- [ ] **Step 1: Write the failing markdown tests**

`apps/web/src/lib/markdown.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { renderMarkdown } from './markdown.js';

const diagrams = { 'diagrams/x.svg': '<svg id="thesvg" xmlns="http://www.w3.org/2000/svg"></svg>' };

describe('renderMarkdown', () => {
  it('renders basic markdown', () => {
    const { container } = render(renderMarkdown('# Hi\n\nsome **bold**', { diagrams }));
    expect(container.querySelector('h1')!.textContent).toBe('Hi');
    expect(container.querySelector('strong')!.textContent).toBe('bold');
  });

  it('replaces diagram images with inline SVG from the bundle', () => {
    const { container } = render(
      renderMarkdown('![D](diagrams/x.svg)', { diagrams }),
    );
    expect(container.querySelector('svg#thesvg')).toBeTruthy();
    expect(container.querySelector('img')).toBeNull();
  });

  it('external links get target=_blank and rel=noopener', () => {
    const { container } = render(
      renderMarkdown('[CNNs](https://www.youtube.com/watch?v=aircAruvnKk)', { diagrams }),
    );
    const a = container.querySelector('a')!;
    expect(a.getAttribute('target')).toBe('_blank');
    expect(a.getAttribute('rel')).toContain('noopener');
  });

  it('sanitizes script injection', () => {
    const { container } = render(renderMarkdown('<script>alert(1)</script>ok', { diagrams }));
    expect(container.querySelector('script')).toBeNull();
    expect(container.textContent).toContain('ok');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter tet-web test -- markdown`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement markdown.tsx + Diagram + VideoEmbed**

`apps/web/src/lib/markdown.tsx`:

```tsx
import { marked } from 'marked';
import DOMPurify from 'dompurify';

export function markdownToHtml(body: string): string {
  const raw = marked.parse(body, { async: false });
  return DOMPurify.sanitize(raw, { ADD_ATTR: ['target', 'rel'] });
}

/** React element from sanitized HTML with diagram inlining + link hardening. */
export function htmlToPostProcessed(html: string, diagrams: Record<string, string>): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  for (const img of Array.from(doc.querySelectorAll('img'))) {
    const src = img.getAttribute('src') ?? '';
    if (src.startsWith('diagrams/') && diagrams[src]) {
      const tpl = document.createElement('template');
      tpl.innerHTML = diagrams[src]!;
      const svg = tpl.content.firstElementChild;
      if (svg) img.replaceWith(svg);
    }
  }
  for (const a of Array.from(doc.querySelectorAll('a[href]'))) {
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener noreferrer');
  }
  return doc.body.innerHTML;
}

export function renderMarkdown(body: string, opts: { diagrams: Record<string, string> }): React.ReactNode {
  const html = htmlToPostProcessed(markdownToHtml(body), opts.diagrams);
  return <div className="lesson-body" dangerouslySetInnerHTML={{ __html: html }} />;
}
```

(`react` import for the `ReactNode` type comes at the top: `import type { ReactNode } from 'react';` and the return type is `ReactNode`.)

`apps/web/src/components/Diagram.tsx`:

```tsx
export function Diagram({ svg, title }: { svg: string; title: string }) {
  return (
    <figure style={{ margin: '1rem 0' }}>
      <div dangerouslySetInnerHTML={{ __html: svg }} role="img" aria-label={title} />
      <figcaption className="muted" style={{ fontSize: '0.85rem', textAlign: 'center' }}>{title}</figcaption>
    </figure>
  );
}
```

`apps/web/src/components/VideoEmbed.tsx`:

```tsx
export function youTubeId(url: string): string | null {
  const m = /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{11})/.exec(url);
  return m ? m[1]! : null;
}

export function VideoEmbed({ url, title }: { url: string; title: string }) {
  const id = youTubeId(url);
  if (!id) {
    return <p><a href={url} target="_blank" rel="noopener noreferrer">▶ {title}</a></p>;
  }
  return (
    <div style={{ position: 'relative', paddingTop: '56.25%', margin: '1rem 0', borderRadius: 8, overflow: 'hidden' }}>
      <iframe
        src={`https://www.youtube.com/embed/${id}`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
        allowFullScreen
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
      />
    </div>
  );
}
```

- [ ] **Step 4: Run markdown tests to verify they pass**

Run: `pnpm --filter tet-web test -- markdown`
Expected: PASS — 4/4.

- [ ] **Step 5: Write the failing LessonPage test**

`apps/web/src/pages/LessonPage.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { LessonPage } from './LessonPage.js';
import { ContentProvider } from '../lib/content-context.js';
import { SessionProvider } from '../state/session.js';
import type { ContentBundle } from 'tet-core';
import type { StorageAdapter } from 'tet-storage';

const bundle: ContentBundle = {
  tracks: [{
    id: 't1', title: 'T', description: 'D', order: 1,
    modules: [{ id: 'm1', track: 't1', title: 'M1', order: 1, source: 'x', quizPool: 'x', deck: 'x', lessonIds: ['l1', 'l2'] }],
    readiness: { examIds: [], passPct: 65, readyPct: 80 },
  }],
  lessons: {
    l1: {
      id: 'l1', module: 'm1', title: 'What is Testing?', minutes: 10, objectives: ['FL-1.1.1'],
      videos: [{ title: 'Intro', url: 'https://www.youtube.com/watch?v=aircAruvnKk' }],
      diagrams: [{ title: 'D1', file: 'diagrams/x.svg' }],
      body: '# What is Testing?\n\n![D1](diagrams/x.svg)\n\nLearn about [CNNs](https://www.youtube.com/watch?v=aircAruvnKk).',
    },
    l2: { id: 'l2', module: 'm1', title: 'Next Lesson', minutes: 5, objectives: [], videos: [{ title: 'v', url: 'https://www.youtube.com/watch?v=aircAruvnKk' }], diagrams: [{ title: 'd', file: 'diagrams/x.svg' }], body: 'body' },
  },
  questions: [], flashcards: [], exams: [], diagrams: { 'diagrams/x.svg': '<svg xmlns="http://www.w3.org/2000/svg"/>' },
  questionsByModule: {}, cardsByModule: {},
};

const writes: unknown[] = [];
const adapter: Partial<StorageAdapter> = {
  getSession: () => Promise.resolve(null),
  getProgress: () => Promise.resolve({}),
  putProgress: async (entries) => { writes.push(entries); },
};

function mount() {
  return render(
    <MemoryRouter initialEntries={['/lesson/l1']}>
      <SessionProvider>
        <ContentProvider seed={bundle}>
          <Routes>
            <Route path="/lesson/:lessonId" element={<LessonPage />} />
          </Routes>
        </ContentProvider>
      </SessionProvider>
    </MemoryRouter>,
  );
}

describe('LessonPage', () => {
  it('renders title, inline SVG diagram, embedded video, and external term link', async () => {
    mount();
    await waitFor(() => expect(screen.getByRole('heading', { name: /what is testing/i })).toBeTruthy());
    expect(document.querySelector('svg')).toBeTruthy();
    expect(document.querySelector('iframe[title="Intro"]')).toBeTruthy();
    const a = document.querySelector('a[href*="aircAruvnKk"]')!;
    expect(a.getAttribute('target')).toBe('_blank');
  });

  it('marks the lesson complete and writes progress', async () => {
    mount();
    await waitFor(() => expect(screen.getByRole('button', { name: /mark complete/i })).toBeTruthy());
    await userEvent.click(screen.getByRole('button', { name: /mark complete/i }));
    await waitFor(() => expect(writes).toHaveLength(1));
    expect((writes[0] as Array<{ itemId: string; status: string }>)[0]).toMatchObject({ itemId: 'l1', status: 'done' });
  });
});
```

(Add `userEvent` import — `@testing-library/user-event` must be added to devDependencies in Task 10's package.json: add `"@testing-library/user-event": "^14.5.0"`.)

- [ ] **Step 6: Implement the three pages**

`apps/web/src/pages/LessonPage.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useContent } from '../lib/content-context.js';
import { useSession } from '../state/session.js';
import { renderMarkdown } from '../lib/markdown.js';
import { VideoEmbed } from '../components/VideoEmbed.js';
import { ProgressBar } from '../components/ProgressBar.js';

export function LessonPage() {
  const { lessonId } = useParams();
  const bundle = useContent();
  const { adapter } = useSession();
  const [done, setDone] = useState(false);

  const lesson = lessonId ? bundle.lessons[lessonId] : null;
  const trackMod = lesson
    ? bundle.tracks.flatMap((t) => t.modules.map((m) => ({ t, m }))).find((x) => x.m.id === lesson.module)
    : null;

  useEffect(() => {
    void (async () => {
      if (!lesson) return;
      const progress = await adapter.getProgress();
      const key = `${trackMod?.t.id}/${lesson.module}/${lesson.id}`;
      setDone(progress[key]?.status === 'done');
    })();
  }, [adapter, lesson, trackMod]);

  if (!lesson || !trackMod) return <p className="muted">Lesson not found.</p>;
  const { t: track, m: mod } = trackMod;
  const idx = mod.lessonIds.indexOf(lesson.id);
  const nextId = mod.lessonIds[idx + 1];

  async function markComplete() {
    if (!lesson) return;
    await adapter.putProgress([{ track: track.id, module: mod.id, itemId: lesson.id, status: 'done', updatedAt: new Date().toISOString() }]);
    setDone(true);
  }

  const siblings = mod.lessonIds.map((id) => bundle.lessons[id]!.title);
  void siblings; // module page shows the list; here we show position
  void ProgressBar;

  return (
    <article>
      <p className="muted"><Link to={`/module/${mod.id}`}>{mod.title}</Link> · lesson {idx + 1} of {mod.lessonIds.length} · ~{lesson.minutes} min</p>
      <h1>{lesson.title}</h1>
      {lesson.objectives.length > 0 && (
        <p className="muted">Objectives: {lesson.objectives.join(', ')}</p>
      )}
      {renderMarkdown(lesson.body, { diagrams: bundle.diagrams })}
      <h2>Watch</h2>
      {lesson.videos.map((v) => <VideoEmbed key={v.url} url={v.url} title={v.title} />)}
      <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        {done
          ? <span className="flag ok">complete</span>
          : <button className="btn" onClick={markComplete}>Mark lesson complete</button>}
        {nextId && <Link className="btn secondary" to={`/lesson/${nextId}`}>Next lesson →</Link>}
        {idx === mod.lessonIds.length - 1 && <Link className="btn secondary" to={`/quiz/${mod.id}`}>Take the module quiz →</Link>}
      </div>
    </article>
  );
}
```

(Implementation rule: remove the `siblings`/`ProgressBar` no-op lines — they were scaffolding noise; the file stands without them.)

`apps/web/src/pages/ModulePage.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useContent } from '../lib/content-context.js';
import { useSession } from '../state/session.js';
import { ProgressBar } from '../components/ProgressBar.js';

export function ModulePage() {
  const { moduleId } = useParams();
  const bundle = useContent();
  const { adapter } = useSession();
  const [progress, setProgress] = useState<Record<string, { status: string }>>({});
  const [bestQuiz, setBestQuiz] = useState<number | null>(null);

  const found = moduleId
    ? bundle.tracks.flatMap((t) => t.modules.map((m) => ({ t, m }))).find((x) => x.m.id === moduleId)
    : null;

  useEffect(() => {
    void (async () => {
      setProgress(await adapter.getProgress());
      const attempts = await adapter.getQuizAttempts(moduleId ?? undefined);
      if (attempts.length > 0) {
        setBestQuiz(Math.max(...attempts.map((a) => a.max > 0 ? a.score / a.max : 0)));
      }
    })();
  }, [adapter, moduleId]);

  if (!found) return <p className="muted">Module not found.</p>;
  const { t: track, m: mod } = found;
  const doneCount = mod.lessonIds.filter((lid) => progress[`${track.id}/${mod.id}/${lid}`]?.status === 'done').length;

  return (
    <div>
      <p className="muted"><Link to={`/track/${track.id}`}>{track.title}</Link></p>
      <h1>{mod.title}</h1>
      <ProgressBar fraction={mod.lessonIds.length ? doneCount / mod.lessonIds.length : 0} label={`${doneCount}/${mod.lessonIds.length} lessons`} />
      <section className="card">
        <h2>Lessons</h2>
        <ol>
          {mod.lessonIds.map((lid) => {
            const l = bundle.lessons[lid]!;
            const isDone = progress[`${track.id}/${mod.id}/${lid}`]?.status === 'done';
            return (
              <li key={lid}>
                <Link to={`/lesson/${lid}`}>{isDone ? '✓ ' : ''}{l.title}</Link>
                <span className="muted"> · {l.minutes} min</span>
              </li>
            );
          })}
        </ol>
      </section>
      <section className="card">
        <h2>Practice</h2>
        <p><Link className="btn" to={`/quiz/${mod.id}`}>Module quiz</Link>{bestQuiz !== null && <span className="muted"> best {Math.round(bestQuiz * 100)}%</span>}</p>
        <p><Link className="btn secondary" to={`/flashcards/${mod.id}`}>Flashcards ({(bundle.cardsByModule[mod.id] ?? []).length} cards)</Link></p>
      </section>
    </div>
  );
}
```

`apps/web/src/pages/TrackPage.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useContent } from '../lib/content-context.js';
import { useSession } from '../state/session.js';
import { ProgressBar } from '../components/ProgressBar.js';

export function TrackPage() {
  const { trackId } = useParams();
  const bundle = useContent();
  const { adapter } = useSession();
  const [progress, setProgress] = useState<Record<string, { status: string }>>({});

  const track = bundle.tracks.find((t) => t.id === trackId);

  useEffect(() => {
    void adapter.getProgress().then(setProgress);
  }, [adapter]);

  if (!track) return <p className="muted">Track not found.</p>;

  const moduleDone = (mid: string, lessonIds: string[]) =>
    lessonIds.every((lid) => progress[`${track.id}/${mid}/${lid}`]?.status === 'done');

  return (
    <div>
      <h1>{track.title}</h1>
      <p className="muted">{track.description}</p>
      {track.modules.map((m, i) => (
        <section className="card" key={m.id}>
          <h3><Link to={`/module/${m.id}`}>{i + 1}. {m.title}</Link></h3>
          <ProgressBar
            fraction={m.lessonIds.length
              ? m.lessonIds.filter((lid) => progress[`${track.id}/${m.id}/${lid}`]?.status === 'done').length / m.lessonIds.length
              : 0}
            label={moduleDone(m.id, m.lessonIds) ? 'complete' : `${m.lessonIds.length} lessons`}
          />
        </section>
      ))}
      <p className="muted">Readiness: {track.readiness.examIds.length === 0
        ? 'mock exams arrive with milestone 3'
        : `pass ≥ ${track.readiness.passPct}%, ready at ${track.readiness.readyPct}% average`}</p>
    </div>
  );
}
```

Routes added in `routes.tsx`:

```tsx
<Route path="/track/:trackId" element={<TrackPage />} />
<Route path="/module/:moduleId" element={<ModulePage />} />
<Route path="/lesson/:lessonId" element={<LessonPage />} />
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `pnpm --filter tet-web test`
Expected: PASS — markdown 4/4, LessonPage 2/2, Dashboard 2/2.

- [ ] **Step 8: Manual smoke via preview**

Run: `pnpm --filter tet-content build && (pnpm --filter tet-web dev &)` — open localhost, click through Dashboard → track → module → lesson → verify diagram, video embed, term link opens new tab, mark-complete sticks after reload.
Expected: all flows work. Kill the dev server.

- [ ] **Step 9: Commit**

```bash
git add apps/web/
git commit -m "feat(web): track/module/lesson pages with markdown, inline diagrams, embedded videos"
```

---

### Task 12: Web quiz runner + exam runner (timer, flags, autosave, report)

**Files:**
- Create: `apps/web/src/components/QuizRunner.tsx`, `apps/web/src/components/ExamRunner.tsx`, `apps/web/src/pages/QuizPage.tsx`, `apps/web/src/pages/ExamPage.tsx`, `apps/web/src/pages/ExamReportPage.tsx`
- Modify: `apps/web/src/routes.tsx` (routes)
- Test: `apps/web/src/components/QuizRunner.test.tsx`, `apps/web/src/components/ExamRunner.test.tsx`

**Interfaces:**
- Consumes: `scoreAttempt` (Task 3), `assembleExam` (Task 3), adapter drafts/attempts (Task 9), `useContent`, `useSession`.
- Produces:
  - `<QuizRunner moduleId>` — up to 12 questions (or all if fewer) drawn randomly from `questionsByModule[moduleId]`, one at a time, instant feedback with explanation, then results view (score, retake button). Records `QuizAttempt` with `attemptId = crypto.randomUUID()`.
  - `<ExamRunner examId>` — `assembleExam(def, bundle.questions, seed)` with `seed = Date.now() % 2^31`; countdown timer from `timeLimitMin`; navigation grid with answered/flagged states; **autosaves `ExamDraft` every 15 s and on unload**; submit → `scoreAttempt` + per-tag breakdown → `recordExamAttempt` → `clearExamDraft` → navigate to `/exam/:examId/report/:attemptId`. On mount, resumes from a saved draft (`getExamDraft`), restoring responses/flags/remaining time.
  - `<ExamReportPage>` — score, pass/fail vs `passPct`, per-tag bars, question review (your answer vs correct + explanation) driven by the recorded attempt (`getExamAttempts(examId)` filtered by attemptId).

- [ ] **Step 1: Write the failing QuizRunner tests**

`apps/web/src/components/QuizRunner.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuizRunner } from './QuizRunner.js';
import { ContentProvider } from '../lib/content-context.js';
import { SessionProvider } from '../state/session.js';
import type { ContentBundle, Question } from 'tet-core';
import type { QuizAttempt, StorageAdapter } from 'tet-storage';

const q1: Question = {
  id: 'q1', type: 'single', stem: 'What is 2+2?', options: ['3', '4', '5', '6'],
  answers: [1], explanation: '2+2=4', tags: ['ch1'], klevel: 'K1',
};
const q2: Question = {
  id: 'q2', type: 'multi', stem: 'Pick TWO primes', options: ['2', '3', '4', '5', '6'],
  answers: [0, 1], explanation: '2 and 3 are prime', tags: ['ch1'], klevel: 'K2',
};

const bundle: ContentBundle = {
  tracks: [{ id: 't1', title: 'T', description: 'D', order: 1,
    modules: [{ id: 'm1', track: 't1', title: 'M1', order: 1, source: 'x', quizPool: 'x', deck: 'x', lessonIds: [] }],
    readiness: { examIds: [], passPct: 65, readyPct: 80 } }],
  lessons: {}, questions: [q1, q2], flashcards: [], exams: [], diagrams: {},
  questionsByModule: { m1: ['q1', 'q2'] }, cardsByModule: {},
};

const attempts: QuizAttempt[] = [];
const adapter: Partial<StorageAdapter> = {
  getSession: () => Promise.resolve(null),
  recordQuizAttempt: async (a) => { attempts.push(a); },
  getQuizAttempts: () => Promise.resolve(attempts),
};

function mount() {
  return render(
    <SessionProvider>
      <ContentProvider seed={bundle}>
        <QuizRunner moduleId="m1" />
      </ContentProvider>
    </SessionProvider>,
  );
}

describe('QuizRunner', () => {
  it('walks questions with instant feedback, then reports the score', async () => {
    mount();
    await screen.findByText('What is 2+2?');
    await userEvent.click(screen.getByRole('button', { name: '4' }));
    expect(await screen.findByText(/correct/i)).toBeTruthy();
    expect(screen.getByText(/2\+2=4/)).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: /next/i }));

    await screen.findByText('Pick TWO primes');
    await userEvent.click(screen.getByRole('checkbox', { name: '2' }));
    await userEvent.click(screen.getByRole('checkbox', { name: '3' }));
    await userEvent.click(screen.getByRole('button', { name: /check answer/i }));
    await userEvent.click(await screen.findByRole('button', { name: /next/i }));

    expect(await screen.findByText(/2 \/ 2/i)).toBeTruthy();
    await waitFor(() => expect(attempts).toHaveLength(1));
    expect(attempts[0]!.score).toBe(2);
    expect(attempts[0]!.attemptId).toBeTruthy();
  });
});
```

- [ ] **Step 2: Write the failing ExamRunner tests**

`apps/web/src/components/ExamRunner.test.tsx`:

```tsx
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { ExamRunner } from './ExamRunner.js';
import { ContentProvider } from '../lib/content-context.js';
import { SessionProvider } from '../state/session.js';
import type { ContentBundle, Question } from 'tet-core';
import type { ExamAttempt, StorageAdapter } from 'tet-storage';

function q(id: string, tag: string, k: 'K1' | 'K2' | 'K3'): Question {
  return { id, type: 'single', stem: `stem-${id}`, options: ['a', 'b', 'c', 'd'], answers: [0], explanation: `expl-${id}`, tags: [tag], klevel: k };
}

const questions: Question[] = [
  q('a1', 'ch1', 'K1'), q('a2', 'ch1', 'K2'), q('a3', 'ch1', 'K3'), q('a4', 'ch1', 'K2'),
  q('b1', 'ch2', 'K1'), q('b2', 'ch2', 'K2'), q('b3', 'ch2', 'K2'), q('b4', 'ch2', 'K2'),
];

const bundle: ContentBundle = {
  tracks: [{
    id: 't1', title: 'T', description: 'D', order: 1,
    modules: [{ id: 'm1', track: 't1', title: 'M1', order: 1, source: 'x', quizPool: 'x', deck: 'x', lessonIds: [] }],
    readiness: { examIds: ['e1'], passPct: 65, readyPct: 80 },
  }],
  lessons: {},
  questions,
  flashcards: [], diagrams: {}, questionsByModule: {}, cardsByModule: {},
  exams: [{
    id: 'e1', track: 't1', title: 'Mock 1', timeLimitMin: 60, passPct: 65, total: 4, multiSelectMax: 1,
    groups: [{ tag: 'ch1', count: 2 }, { tag: 'ch2', count: 2 }],
    klevels: { K1: 1, K2: 2, K3: 1 },
  }],
};

const examAttempts: ExamAttempt[] = [];
const drafts: Record<string, unknown> = {};
const adapter: Partial<StorageAdapter> = {
  getSession: () => Promise.resolve(null),
  getExamAttempts: () => Promise.resolve(examAttempts),
  recordExamAttempt: async (a) => { examAttempts.push(a); },
  getExamDraft: (id) => Promise.resolve((drafts[id] as never) ?? null),
  putExamDraft: async (d) => { drafts[d.examId] = d; },
  clearExamDraft: async (id) => { delete drafts[id]; },
};

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

function mount() {
  return render(
    <MemoryRouter initialEntries={['/exam/e1']}>
      <SessionProvider>
        <ContentProvider seed={bundle}>
          <Routes>
            <Route path="/exam/:examId" element={<ExamRunner />} />
            <Route path="/exam/:examId/report/:attemptId" element={<p>REPORT</p>} />
          </Routes>
        </ContentProvider>
      </SessionProvider>
    </MemoryRouter>,
  );
}

describe('ExamRunner', () => {
  it('renders an assembled blueprint exam with a countdown and flag toggles', async () => {
    mount();
    await screen.findByText(/mock 1/i);
    expect(screen.getByText(/60:00/)).toBeTruthy();
    expect(screen.getAllByText(/flag/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/stem-/).length).toBe(4);
  });

  it('autosaves a draft after 15s and submits a scored attempt on finish', async () => {
    mount();
    await screen.findByText(/stem-a1/);
    // answer the visible question
    await userEvent.click(screen.getAllByRole('button', { name: 'a' })[0]!);
    await vi.advanceTimersByTimeAsync(15_500);
    await waitFor(() => expect(drafts['e1']).toBeTruthy());

    await userEvent.click(screen.getByRole('button', { name: /submit exam/i }));
    await waitFor(() => expect(examAttempts).toHaveLength(1));
    expect(examAttempts[0]!.attemptId).toBeTruthy();
    expect(examAttempts[0]!.perTag).toEqual({
      ch1: { correct: 1, total: 2 },
      ch2: { correct: 1, total: 2 },
    });
    await waitFor(() => expect(drafts['e1']).toBeUndefined());
  });
});
```

(The perTag values assume the seeded assembly picks a1/a3-style rows — if the assembled questions differ, assert on the attempt's totals (`score + max === 4`) and that `perTag` keys are exactly `ch1, ch2` with `total: 2` each, and `correct` sums to `score`. Pin the shape, not the luck: rewrite the two perTag assertions as shape assertions if flaky.)

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm --filter tet-web test -- Runner`
Expected: FAIL — components not found.

- [ ] **Step 4: Implement QuizRunner**

`apps/web/src/components/QuizRunner.tsx`:

```tsx
import { useMemo, useState } from 'react';
import { mulberry32, scoreAttempt } from 'tet-core';
import type { Question } from 'tet-core';
import { useContent } from '../lib/content-context.js';
import { useSession } from '../state/session.js';

export function QuizRunner({ moduleId, size = 12 }: { moduleId: string; size?: number }) {
  const bundle = useContent();
  const { adapter } = useSession();

  const pool = useMemo(() => {
    const ids = bundle.questionsByModule[moduleId] ?? [];
    const qs = ids.map((id) => bundle.questions.find((q) => q.id === id)!).filter(Boolean);
    const rng = mulberry32(Date.now() % 2 ** 31);
    for (let i = qs.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [qs[i], qs[j]] = [qs[j]!, qs[i]!];
    }
    return qs.slice(0, size);
  }, [bundle, moduleId, size]);

  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number[]>([]);
  const [answered, setAnswered] = useState(false);
  const [responses, setResponses] = useState<Record<string, number[]>>({});
  const [result, setResult] = useState<{ score: number; max: number } | null>(null);
  const [recorded, setRecorded] = useState(false);

  if (pool.length === 0) return <p className="muted">No questions yet for this module.</p>;
  const q = pool[idx]!;

  function pick(optIdx: number) {
    if (answered) return;
    if (q.type === 'single') setSelected([optIdx]);
    else setSelected((s) => (s.includes(optIdx) ? s.filter((x) => x !== optIdx) : [...s, optIdx]));
  }

  async function checkAnswer() {
    setAnswered(true);
    setResponses((r) => ({ ...r, [q.id]: selected }));
  }

  async function next() {
    if (idx + 1 < pool.length) {
      setIdx(idx + 1);
      setSelected([]);
      setAnswered(false);
    } else {
      const scored = scoreAttempt(pool, responses);
      setResult(scored);
      if (!recorded) {
        setRecorded(true);
        await adapter.recordQuizAttempt({
          attemptId: crypto.randomUUID(),
          moduleId, score: scored.score, max: scored.max,
          perQuestion: scored.perQuestion, createdAt: new Date().toISOString(),
        });
      }
    }
  }

  if (result) {
    return (
      <div className="card">
        <h2>Score: {result.score} / {result.max}</h2>
        <p className="muted">Best attempts are kept; retakes are always available.</p>
        <button className="btn secondary" onClick={() => { setIdx(0); setSelected([]); setAnswered(false); setResponses({}); setResult(null); setRecorded(false); }}>
          Retake quiz
        </button>
      </div>
    );
  }

  return (
    <div className="card">
      <p className="muted">Question {idx + 1} of {pool.length}</p>
      <h3>{q.stem}</h3>
      {q.type === 'multi' && <p className="muted">Select all that apply.</p>}
      <div style={{ display: 'grid', gap: '0.5rem' }}>
        {q.options.map((opt, i) => (
          <label key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.5rem', border: '1px solid #e5e7eb', borderRadius: 8 }}>
            <input
              type={q.type === 'single' ? 'radio' : 'checkbox'}
              name={`q-${q.id}`}
              checked={selected.includes(i)}
              onChange={() => pick(i)}
            />
            <span>{opt}</span>
          </label>
        ))}
      </div>
      {!answered
        ? <p style={{ marginTop: '1rem' }}><button className="btn" disabled={selected.length === 0} onClick={checkAnswer}>Check answer</button></p>
        : (
          <div>
            <p className="flag" style={{ background: scoreAttempt([q], { [q.id]: selected }).score === 1 ? '#dcfce7' : '#fee2e2' }}>
              {scoreAttempt([q], { [q.id]: selected }).score === 1 ? 'correct' : 'not quite'}
            </p>
            <p>{q.explanation}</p>
            <button className="btn" onClick={next}>Next</button>
          </div>
        )}
    </div>
  );
}
```

`apps/web/src/pages/QuizPage.tsx`:

```tsx
import { useParams } from 'react-router';
import { QuizRunner } from '../components/QuizRunner.js';

export function QuizPage() {
  const { moduleId } = useParams();
  if (!moduleId) return <p className="muted">No module.</p>;
  return (
    <div>
      <h1>Module quiz</h1>
      <QuizRunner moduleId={moduleId} />
    </div>
  );
}
```

- [ ] **Step 5: Implement ExamRunner + ExamReportPage**

`apps/web/src/components/ExamRunner.tsx`:

```tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { assembleExam, scoreAttempt } from 'tet-core';
import type { Question } from 'tet-core';
import { useContent } from '../lib/content-context.js';
import { useSession } from '../state/session.js';

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function ExamRunner() {
  const { examId } = useParams();
  const bundle = useContent();
  const { adapter } = useSession();
  const navigate = useNavigate();

  const def = bundle.exams.find((e) => e.id === examId);

  const assembled = useMemo(() => {
    if (!def || !examId) return null;
    return assembleExam(def, bundle.questions, Date.now() % 2 ** 31);
  }, [def, bundle.questions, examId]);

  const [responses, setResponses] = useState<Record<string, number[]>>({});
  const [flags, setFlags] = useState<Set<string>>(new Set());
  const [current, setCurrent] = useState(0);
  const [remainingSec, setRemainingSec] = useState(0);
  const [startedAt] = useState(() => new Date().toISOString());
  const [submitted, setSubmitted] = useState(false);
  const responsesRef = useRef(responses);
  responsesRef.current = responses;
  const flagsRef = useRef(flags);
  flagsRef.current = flags;
  const remainingRef = useRef(remainingSec);
  remainingRef.current = remainingSec;

  // Draft resume
  useEffect(() => {
    if (!def || !examId || !assembled) return;
    void (async () => {
      const draft = await adapter.getExamDraft(examId);
      if (draft) {
        setResponses(draft.responses);
        setFlags(new Set(draft.flags));
        setRemainingSec(draft.remainingSec);
      } else {
        setRemainingSec(def.timeLimitMin * 60);
      }
    })();
  }, [adapter, def, examId, assembled]);

  // Countdown + autosave
  useEffect(() => {
    if (!examId || remainingSec === 0) return;
    const t = setInterval(() => {
      setRemainingSec((s) => Math.max(0, s - 1));
    }, 1000);
    const save = setInterval(() => {
      void adapter.putExamDraft({
        examId: examId!, responses: responsesRef.current,
        flags: [...flagsRef.current], startedAt: startedAt, remainingSec: remainingRef.current,
      });
    }, 15_000);
    return () => { clearInterval(t); clearInterval(save); };
  }, [adapter, examId, startedAt, remainingSec === 0]);

  if (!def || !assembled) return <p className="muted">Exam not found.</p>;
  if (remainingSec === 0 && !submitted) {
    // still loading draft, or time already exhausted on resume — submit on load if expired
  }

  const qs: Question[] = assembled.questions;
  const q = qs[current]!;

  async function submit(auto = false) {
    if (submitted || !examId) return;
    setSubmitted(true);
    const scored = scoreAttempt(qs, responsesRef.current);
    const perTag: Record<string, { correct: number; total: number }> = {};
    for (const question of qs) {
      for (const tag of question.tags) {
        perTag[tag] ??= { correct: 0, total: 0 };
        perTag[tag]!.total += 1;
        if (scored.perQuestion[question.id]) perTag[tag]!.correct += 1;
      }
    }
    const scorePct = (100 * scored.score) / Math.max(1, scored.max);
    const attemptId = crypto.randomUUID();
    await adapter.recordExamAttempt({
      attemptId, examId, score: scored.score, max: scored.max,
      passed: scored.score >= Math.ceil((def.passPct / 100) * scored.max),
      scorePct, perTag, responses: responsesRef.current,
      createdAt: new Date().toISOString(),
      durationSec: def.timeLimitMin * 60 - remainingRef.current,
    });
    await adapter.clearExamDraft(examId);
    void auto;
    navigate(`/exam/${examId}/report/${attemptId}`);
  }

  // Auto-submit at zero
  useEffect(() => {
    if (remainingSec === 0 && !submitted && responsesReady) void submit(true);
  });

  const responsesReady = remainingSec > 0 || Object.keys(responsesRef.current).length > 0;
  void responsesReady;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h1>{def.title}</h1>
        <h2 style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(remainingSec)}</h2>
      </div>
      <p className="muted">{qs.length} questions · pass at {def.passPct}% · answers save automatically</p>

      <div className="card">
        <p className="muted">Question {current + 1} of {qs.length}</p>
        <h3>{q.stem}</h3>
        {q.type === 'multi' && <p className="muted">Select {q.answers.length}.</p>}
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          {q.options.map((opt, i) => (
            <label key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.5rem', border: '1px solid #e5e7eb', borderRadius: 8 }}>
              <input
                type={q.type === 'single' ? 'radio' : 'checkbox'}
                name={`q-${q.id}`}
                checked={(responses[q.id] ?? []).includes(i)}
                onChange={() => {
                  setResponses((r) => {
                    const cur = r[q.id] ?? [];
                    const next = q.type === 'single'
                      ? [i]
                      : cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i];
                    return { ...r, [q.id]: next };
                  });
                }}
              />
              <span>{opt}</span>
            </label>
          ))}
        </div>
        <p style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem' }}>
          <button className="btn secondary" disabled={current === 0} onClick={() => setCurrent(current - 1)}>← Previous</button>
          <button className="btn secondary" disabled={current === qs.length - 1} onClick={() => setCurrent(current + 1)}>Next →</button>
          <button
            className="btn secondary"
            onClick={() => setFlags((f) => { const n = new Set(f); n.has(q.id) ? n.delete(q.id) : n.add(q.id); return n; })}
          >
            {flags.has(q.id) ? '★ flagged' : 'flag for review'}
          </button>
        </p>
      </div>

      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', margin: '1rem 0' }}>
        {qs.map((question, i) => {
          const answered = (responses[question.id] ?? []).length > 0;
          const flagged = flags.has(question.id);
          return (
            <button
              key={question.id}
              onClick={() => setCurrent(i)}
              style={{
                width: 36, height: 36, borderRadius: 6, cursor: 'pointer',
                border: '1px solid #cbd5e1',
                background: flagged ? '#fef3c7' : answered ? '#dcfce7' : '#fff',
              }}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      <button className="btn" onClick={() => void submit(false)}>Submit exam</button>
    </div>
  );
}
```

(Implementation rules, recorded here so executors don't guess: (a) delete the empty `if (remainingSec === 0 && !submitted)` block and the `responsesReady`/`void` dance — instead gate auto-submit on a `draftLoaded` boolean set in the resume effect, so a zero-time submit can't fire before the draft is restored; (b) the auto-submit effect must depend on `[remainingSec, submitted, draftLoaded]` and call `submit(true)` once.)

`apps/web/src/pages/ExamReportPage.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useContent } from '../lib/content-context.js';
import { useSession } from '../state/session.js';
import { ProgressBar } from '../components/ProgressBar.js';

export function ExamReportPage() {
  const { examId, attemptId } = useParams();
  const bundle = useContent();
  const { adapter } = useSession();
  const [attempt, setAttempt] = useState<(await import('tet-storage')).ExamAttempt | null>(null);

  const def = bundle.exams.find((e) => e.id === examId);

  useEffect(() => {
    void (async () => {
      const all = await adapter.getExamAttempts(examId);
      setAttempt(all.find((a) => a.attemptId === attemptId) ?? null);
    })();
  }, [adapter, examId, attemptId]);

  if (!def || !attempt) return <p className="muted">Report not found.</p>;

  const byId = new Map(bundle.questions.map((q) => [q.id, q]));

  return (
    <div>
      <h1>{def.title} — report</h1>
      <p className={attempt.passed ? 'flag ok' : 'flag warn'}>
        {attempt.score}/{attempt.max} · {Math.round(attempt.scorePct)}% · {attempt.passed ? 'PASS' : `fail — need ${def.passPct}%`}
      </p>
      <section className="card">
        <h2>By topic</h2>
        {Object.entries(attempt.perTag).map(([tag, v]) => (
          <p key={tag}>
            <strong>{tag}</strong> — {v.correct}/{v.total}
            <ProgressBar fraction={v.total ? v.correct / v.total : 0} />
          </p>
        ))}
      </section>
      <section className="card">
        <h2>Question review</h2>
        {Object.entries(attempt.responses).map(([qid, selected]) => {
          const q = byId.get(qid);
          if (!q) return null;
          const ok = selected.length === q.answers.length && [...selected].sort().join() === [...q.answers].sort().join();
          return (
            <div key={qid} style={{ borderBottom: '1px solid #eceef3', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
              <p><strong className={ok ? 'flag ok' : 'flag warn'}>{ok ? 'correct' : 'missed'}</strong> {q.stem}</p>
              <p className="muted">Your answer: {selected.map((i) => q.options[i]).join(', ') || '—'}</p>
              <p>Correct: {q.answers.map((i) => q.options[i]).join(', ')}</p>
              <p>{q.explanation}</p>
            </div>
          );
        })}
      </section>
      <p><Link className="btn secondary" to={`/exam/${def.id}`}>Retake exam</Link> <Link className="btn secondary" to="/">Dashboard</Link></p>
    </div>
  );
}
```

(Implementation rule: replace the awkward inline `await import('tet-storage')` type with a top-of-file `import type { ExamAttempt } from 'tet-storage';` and `useState<ExamAttempt | null>(null)`.)

Routes added in `routes.tsx`:

```tsx
<Route path="/quiz/:moduleId" element={<QuizPage />} />
<Route path="/exam/:examId" element={<ExamPage />} />
<Route path="/exam/:examId/report/:attemptId" element={<ExamReportPage />} />
```

`apps/web/src/pages/ExamPage.tsx`:

```tsx
import { useParams } from 'react-router';
import { ExamRunner } from '../components/ExamRunner.js';

export function ExamPage() {
  const { examId } = useParams();
  if (!examId) return <p className="muted">No exam.</p>;
  return <ExamRunner />;
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm --filter tet-web test`
Expected: PASS — all web suites green (QuizRunner 1/1, ExamRunner 2/2 plus earlier suites).

- [ ] **Step 7: Commit**

```bash
git add apps/web/
git commit -m "feat(web): quiz runner with instant feedback; exam runner with timer, flags, autosave, report"
```

---

### Task 13: Web flashcards — SRS review session and per-module decks

**Files:**
- Create: `apps/web/src/pages/FlashcardsPage.tsx`, `apps/web/src/components/ReviewSession.tsx`
- Modify: `apps/web/src/routes.tsx` (routes)
- Test: `apps/web/src/components/ReviewSession.test.tsx`

**Interfaces:**
- Consumes: `newCardState`, `reviewCard` (Task 2), adapter `getReviewState`/`recordCardReview` (Task 6), `cardsByModule` (Task 4 bundle).
- Produces:
  - `<ReviewSession cardIds>` — builds the session queue: cards with no state (new) or `dueAt <= now`, ordered due-first; card flips on click; four grade buttons (again/hard/good/easy) call `reviewCard(currentState, grade, now)` then `adapter.recordCardReview({ cardId, grade, state: next, createdAt })`; completion screen when queue empties.
  - `FlashcardsPage` — route `/flashcards` (all decks: due-now across the bundle) and `/flashcards/:moduleId` (single deck); shows per-deck counts (new / due / total).

- [ ] **Step 1: Write the failing test**

`apps/web/src/components/ReviewSession.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReviewSession } from './ReviewSession.js';
import type { Flashcard } from 'tet-core';
import type { CardReview, StorageAdapter } from 'tet-storage';

const cards: Flashcard[] = [
  { id: 'c1', front: 'What is a defect?', back: 'A flaw in a work product.', tags: ['ch1'] },
  { id: 'c2', front: 'What is a failure?', back: 'A deviation of observed behavior from expected.', tags: ['ch1'] },
];

const reviews: CardReview[] = [];
const adapter: Partial<StorageAdapter> = {
  getReviewState: () => Promise.resolve({
    // c1 due yesterday; c2 scheduled far future → only c1 starts due
    c1: { ease: 2.5, intervalDays: 1, dueAt: new Date(Date.now() - 86_400_000).toISOString(), reps: 1, lapses: 0 },
    c2: { ease: 2.5, intervalDays: 30, dueAt: new Date(Date.now() + 30 * 86_400_000).toISOString(), reps: 3, lapses: 0 },
  }),
  recordCardReview: async (r) => { reviews.push(r); },
};

describe('ReviewSession', () => {
  it('queues only due/new cards and grades through SM-2 into the adapter', async () => {
    render(<ReviewSession cardIds={cards.map((c) => c.id)} cards={cards} />);
    expect(await screen.findByText(/1 card to review/i)).toBeTruthy();

    await userEvent.click(screen.getByText('What is a defect?')); // flip
    expect(screen.getByText(/flaw in a work product/i)).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: /good/i }));

    await waitFor(() => expect(reviews).toHaveLength(1));
    expect(reviews[0]!.cardId).toBe('c1');
    expect(reviews[0]!.grade).toBe('good');
    expect(reviews[0]!.state.intervalDays).toBe(6); // good from 1-day interval
    expect(new Date(reviews[0]!.state.dueAt).getTime()).toBeGreaterThan(Date.now());

    expect(await screen.findByText(/session complete/i)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter tet-web test -- ReviewSession`
Expected: FAIL — component not found.

- [ ] **Step 3: Implement ReviewSession + FlashcardsPage**

`apps/web/src/components/ReviewSession.tsx`:

```tsx
import { useEffect, useMemo, useState } from 'react';
import { newCardState, reviewCard, type CardState, type Grade } from 'tet-core';
import type { Flashcard } from 'tet-core';
import { useSession } from '../state/session.js';

const GRADES: { key: Grade; label: string; hint: string }[] = [
  { key: 'again', label: 'Again', hint: 'reset' },
  { key: 'hard', label: 'Hard', hint: '×1.2' },
  { key: 'good', label: 'Good', hint: 'normal' },
  { key: 'easy', label: 'Easy', hint: 'faster' },
];

export function ReviewSession({ cardIds, cards }: { cardIds: string[]; cards: Flashcard[] }) {
  const { adapter } = useSession();
  const [states, setStates] = useState<Record<string, CardState> | null>(null);
  const [queue, setQueue] = useState<string[]>([]);
  const [flipped, setFlipped] = useState(false);

  const byId = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);

  useEffect(() => {
    void (async () => {
      const existing = await adapter.getReviewState();
      const now = Date.now();
      const due = cardIds.filter((id) => {
        const s = existing[id];
        return !s || new Date(s.dueAt).getTime() <= now;
      });
      setStates(existing);
      setQueue(due);
    })();
  }, [adapter, cardIds]);

  if (!states) return <p className="muted">Loading…</p>;

  if (queue.length === 0) {
    return <p className="flag ok">session complete — next cards are scheduled for future days.</p>;
  }

  const currentId = queue[0]!;
  const card = byId.get(currentId)!;
  const state = states[currentId] ?? newCardState();

  async function grade(g: Grade) {
    const next = reviewCard(state, g, new Date());
    const createdAt = new Date().toISOString();
    setStates((s) => ({ ...(s ?? {}), [currentId]: next }));
    setQueue((qu) => qu.slice(1));
    setFlipped(false);
    await adapter.recordCardReview({ cardId: currentId, grade: g, state: next, createdAt });
  }

  return (
    <div>
      <p className="muted">{queue.length} card{queue.length === 1 ? '' : 's'} to review</p>
      <div className="card" style={{ minHeight: 160, cursor: 'pointer' }} onClick={() => setFlipped(true)}>
        {!flipped
          ? <h3 style={{ margin: 0 }}>{card.front}</h3>
          : (
            <div>
              <h3 style={{ margin: 0 }}>{card.front}</h3>
              <hr />
              <p style={{ marginBottom: 0 }}>{card.back}</p>
            </div>
          )}
      </div>
      {flipped && (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {GRADES.map((g) => (
            <button key={g.key} className="btn secondary" onClick={() => void grade(g.key)}>
              {g.label} <span className="muted">({g.hint})</span>
            </button>
          ))}
        </div>
      )}
      {!flipped && <p className="muted">click the card to reveal the answer</p>}
    </div>
  );
}
```

`apps/web/src/pages/FlashcardsPage.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useContent } from '../lib/content-context.js';
import { useSession } from '../state/session.js';
import { ReviewSession } from '../components/ReviewSession.js';

export function FlashcardsPage() {
  const { moduleId } = useParams();
  const bundle = useContent();
  const { adapter } = useSession();
  const [states, setStates] = useState<Record<string, { dueAt: string }> | null>(null);

  useEffect(() => {
    void adapter.getReviewState().then(setStates);
  }, [adapter]);

  if (!states) return <p className="muted">Loading…</p>;

  const now = Date.now();
  const dueIn = (ids: string[]) => ids.filter((id) => {
    const s = states[id];
    return !s || new Date(s.dueAt).getTime() <= now;
  }).length;

  const decks = bundle.tracks.flatMap((t) => t.modules.map((m) => ({ t, m })));
  const active = moduleId ? decks.find((d) => d.m.id === moduleId) : null;
  const cardIds = active
    ? (bundle.cardsByModule[active.m.id] ?? [])
    : decks.flatMap((d) => bundle.cardsByModule[d.m.id] ?? []);
  const cards = cardIds.map((id) => bundle.flashcards.find((c) => c.id === id)!).filter(Boolean);

  return (
    <div>
      <h1>Flashcards</h1>
      {!active && (
        <div className="grid" style={{ marginBottom: '1rem' }}>
          {decks.map(({ t, m }) => {
            const ids = bundle.cardsByModule[m.id] ?? [];
            return (
              <Link key={m.id} to={`/flashcards/${m.id}`} className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
                <strong>{m.title}</strong>
                <p className="muted">{dueIn(ids)} due · {ids.length} total</p>
              </Link>
            );
          })}
        </div>
      )}
      {active && <p className="muted"><Link to={`/module/${active.m.id}`}>← {active.m.title}</Link></p>}
      <ReviewSession cardIds={cardIds} cards={cards} />
    </div>
  );
}
```

Routes added in `routes.tsx`:

```tsx
<Route path="/flashcards" element={<FlashcardsPage />} />
<Route path="/flashcards/:moduleId" element={<FlashcardsPage />} />
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter tet-web test`
Expected: PASS — all web suites green.

- [ ] **Step 5: Commit**

```bash
git add apps/web/
git commit -m "feat(web): SRS review session with SM-2 grading, per-module decks, due queue"
```

---

### Task 14: TTS — provider abstraction, Web Speech + Kokoro providers, lesson player

**Files:**
- Create: `packages/core/src/tts/provider.ts`, `packages/core/src/tts/webspeech.ts`, `packages/core/src/tts/kokoro.ts`, `packages/core/src/tts/index.ts`
- Create: `apps/web/src/components/TtsPlayer.tsx`
- Create: `apps/server/src/routes/tts.ts` (optional cloud proxy)
- Modify: `apps/web/src/pages/LessonPage.tsx` (mount the player), `apps/web/src/routes.tsx` (nothing), `apps/server/src/index.ts` (mount tts router)
- Test: `apps/web/src/components/TtsPlayer.test.tsx`, `packages/core/src/tts/webspeech.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces:
  - `interface TtsProvider { readonly id: string; isReady(): Promise<boolean>; speak(text: string, opts?: { rate?: number }): Promise<void>; pause(): void; resume(): void; stop(): void; }`
  - `createWebSpeechProvider(): TtsProvider` (uses `window.speechSynthesis`; chunk text ≤ 200 chars per utterance for streaming feel; picks the best available `en` voice, preferring "Google"/"Natural"/"Neural" names)
  - `createKokoroProvider(): TtsProvider` — dynamic `import('kokoro-js')`; streams audio per chunk into a shared `<audio>` pipeline; `isReady()` resolves true once the model warms; **any load failure returns `false`** and the caller falls back.
  - `pickProvider(): Promise<TtsProvider | null>` (in `tts/index.ts`) — try Kokoro (natural voice), fall back to Web Speech, else `null`.
  - `<TtsPlayer text>` — play/pause/stop + speed select (0.75/1/1.25/1.5); feeds `pickProvider()`; renders "voice unavailable" note when `null`.
  - `POST /api/tts` (server) — if `TTS_PROVIDER` env + `TTS_API_KEY` are set, proxies a `POST { text }` to the configured cloud TTS (OpenAI-compatible `POST /v1/audio/speech` shape) and streams back `audio/mpeg`; otherwise 404. Client uses it as a third provider when present (`/api/tts` HEAD probe).
- Spec note (ledger ruling for executors): the spec sketched a *self-hosted TTS sidecar*; the default here is **kokoro-js running the same Kokoro-82M model client-side** — same voice quality goal, zero server infra, works in solo mode, model cached in the browser. The server-side cloud proxy stays optional. This refines the spec's delivery mechanism, not its requirement (natural voice, zero per-character cost, runs anywhere).

- [ ] **Step 1: Write the failing Web Speech provider tests**

`packages/core/src/tts/webspeech.test.ts`:

```ts
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createWebSpeechProvider } from './webspeech.js';

describe('createWebSpeechProvider', () => {
  beforeEach(() => {
    const utterances: unknown[] = [];
    vi.stubGlobal('speechSynthesis', {
      getVoices: () => [
        { name: 'Microsoft David', lang: 'en-US' },
        { name: 'Google US English', lang: 'en-US' },
        { name: 'Natural Voice EN', lang: 'en-GB' },
      ],
      speak: vi.fn((u: { text: string; voice?: unknown; rate?: number; onend?: () => void }) => {
        utterances.push(u);
      }),
      cancel: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      speaking: false,
      paused: false,
    });
  });

  it('reports ready when speechSynthesis exists', async () => {
    const p = createWebSpeechProvider();
    expect(await p.isReady()).toBe(true);
  });

  it('prefers natural-sounding voices', async () => {
    const p = createWebSpeechProvider();
    await p.speak('hello world');
    const synth = globalThis.speechSynthesis as unknown as { speak: ReturnType<typeof vi.fn> };
    const calls = synth.speak.mock.calls as unknown as Array<[{ voice?: { name: string } }]>;
    expect(calls.length).toBeGreaterThan(0);
    expect(calls[0]![0]!.voice!.name).toContain('Natural');
  });

  it('chunks long text into multiple utterances', async () => {
    const p = createWebSpeechProvider();
    const long = 'word '.repeat(80); // 400 chars > 200-char chunk
    await p.speak(long);
    const synth = globalThis.speechSynthesis as unknown as { speak: ReturnType<typeof vi.fn> };
    expect(synth.speak.mock.calls.length).toBeGreaterThan(1);
  });

  it('stop() cancels synthesis', async () => {
    const p = createWebSpeechProvider();
    p.stop();
    const synth = globalThis.speechSynthesis as unknown as { cancel: ReturnType<typeof vi.fn> };
    expect(synth.cancel).toHaveBeenCalled();
  });
});
```

(The `speak` stub fires `onend` synchronously when defined — implement `speak()` in the provider so queued chunks await their utterance's `onend`; in the stub, call `u.onend?.()` immediately after `speak` registers, so tests resolve.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter tet-core test -- webspeech`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement provider.ts, webspeech.ts, kokoro.ts, index.ts**

`packages/core/src/tts/provider.ts`:

```ts
export interface TtsProvider {
  readonly id: string;
  isReady(): Promise<boolean>;
  speak(text: string, opts?: { rate?: number }): Promise<void>;
  pause(): void;
  resume(): void;
  stop(): void;
}
```

`packages/core/src/tts/webspeech.ts`:

```ts
import type { TtsProvider } from './provider.js';

const CHUNK = 200;

function bestVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const en = voices.filter((v) => v.lang.toLowerCase().startsWith('en'));
  const preferred =
    en.find((v) => /natural/i.test(v.name)) ??
    en.find((v) => /neural/i.test(v.name)) ??
    en.find((v) => /google/i.test(v.name)) ??
    en[0] ?? null;
  return preferred;
}

export function createWebSpeechProvider(): TtsProvider {
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
  function chunkText(text: string): string[] {
    const sentences = text.split(/(?<=[.!?])\s+/);
    const chunks: string[] = [];
    let buf = '';
    for (const s of sentences) {
      if ((buf + ' ' + s).trim().length > CHUNK && buf) { chunks.push(buf.trim()); buf = s; }
      else buf = (buf + ' ' + s).trim();
    }
    if (buf.trim()) chunks.push(buf.trim());
    return chunks;
  }

  return {
    id: 'webspeech',
    async isReady() { return synth !== undefined; },
    async speak(text, opts) {
      if (!synth) return;
      synth.cancel();
      const voice = bestVoice(synth.getVoices());
      const rate = opts?.rate ?? 1;
      const chunks = chunkText(text);
      for (const chunk of chunks) {
        await new Promise<void>((resolve) => {
          const u = new SpeechSynthesisUtterance(chunk);
          if (voice) u.voice = voice;
          u.rate = rate;
          u.onend = () => resolve();
          u.onerror = () => resolve();
          synth.speak(u);
        });
      }
    },
    pause() { synth?.pause(); },
    resume() { synth?.resume(); },
    stop() { synth?.cancel(); },
  };
}
```

(The test's synchronous stub means `onend` fires before `speak` returns — the loop still awaits each promise; chunk count assertions hold because every chunk registers one `speak` call.)

`packages/core/src/tts/kokoro.ts`:

```ts
import type { TtsProvider } from './provider.js';

/**
 * Kokoro-82M in the browser via kokoro-js (transformers.js WASM/WebGPU).
 * Dynamic import keeps the ~model bytes out of the initial bundle; the model
 * itself is cached by the library in the browser Cache API after first load.
 * Any failure → isReady false → caller falls back to Web Speech.
 */
export function createKokoroProvider(): TtsProvider {
  let warming: Promise<boolean> | null = null;
  let synthFn: ((text: string) => Promise<AudioBuffer>) | null = null;
  let audioCtx: AudioContext | null = null;
  let current: AudioBufferSourceNode | null = null;
  let stopped = false;

  async function warm(): Promise<boolean> {
    if (synthFn) return true;
    warming ??= (async () => {
      try {
        const mod = await import('kokoro-js');
        const model = await mod.KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', {
          dtype: 'q8',
          device: (navigator as Navigator & { gpu?: unknown }).gpu ? 'webgpu' : 'wasm',
        });
        synthFn = (text: string) => model.generate(text, { voice: 'af_heart' });
        return true;
      } catch {
        return false;
      }
    })();
    return warming;
  }

  async function speakChunk(text: string, rate: number): Promise<void> {
    if (!synthFn) return;
    const buffer = await synthFn(text);
    if (stopped) return;
    audioCtx ??= new AudioContext();
    const src = audioCtx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = rate;
    src.connect(audioCtx.destination);
    current = src;
    await new Promise<void>((resolve) => {
      src.onended = () => resolve();
      src.start();
    });
  }

  function chunkText(text: string, max = 900): string[] {
    const sentences = text.split(/(?<=[.!?])\s+/);
    const chunks: string[] = [];
    let buf = '';
    for (const s of sentences) {
      if ((buf + ' ' + s).trim().length > max && buf) { chunks.push(buf.trim()); buf = s; }
      else buf = (buf + ' ' + s).trim();
    }
    if (buf.trim()) chunks.push(buf.trim());
    return chunks;
  }

  return {
    id: 'kokoro',
    isReady: warm,
    async speak(text, opts) {
      stopped = false;
      if (!(await warm())) return;
      const rate = opts?.rate ?? 1;
      for (const chunk of chunkText(text)) {
        if (stopped) return;
        await speakChunk(chunk, rate);
      }
    },
    pause() { void audioCtx?.suspend(); },
    resume() { void audioCtx?.resume(); },
    stop() {
      stopped = true;
      current?.stop();
      current = null;
    },
  };
}
```

`packages/core/src/tts/index.ts`:

```ts
import type { TtsProvider } from './provider.js';
import { createWebSpeechProvider } from './webspeech.js';
import { createKokoroProvider } from './kokoro.js';

export type { TtsProvider } from './provider.js';
export { createWebSpeechProvider } from './webspeech.js';
export { createKokoroProvider } from './kokoro.js';

/** Best available natural voice: Kokoro (neural) → Web Speech → none. */
export async function pickProvider(): Promise<TtsProvider | null> {
  try {
    const kokoro = createKokoroProvider();
    if (await kokoro.isReady()) return kokoro;
  } catch { /* fall through */ }
  const ws = createWebSpeechProvider();
  if (await ws.isReady()) return ws;
  return null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter tet-core test -- webspeech`
Expected: PASS — 4/4 (kokoro is exercised only via its `isReady` failure path in jsdom — no model download in tests; the dynamic import stays unmocked but unreachable because `warm()` catches its own failure).

- [ ] **Step 5: Add the server TTS proxy (optional cloud path)**

`apps/server/src/routes/tts.ts`:

```ts
import { Hono } from 'hono';
import { requireAuth } from '../auth.js';

export function ttsRoutes(): Hono<import('../auth.js').AppEnv> {
  const r = new Hono<import('../auth.js').AppEnv>();
  r.use('*', requireAuth());

  r.post('/', async (c) => {
    const provider = process.env.TTS_PROVIDER ?? '';
    const key = process.env.TTS_API_KEY ?? '';
    if (!provider || !key) return c.json({ error: 'tts not configured' }, 404);
    const { text, voice = 'alloy', speed = 1 } = await c.req.json<{ text: string; voice?: string; speed?: number }>();
    const upstream = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-4o-mini-tts', voice, input: text, speed }),
    });
    if (!upstream.ok || !upstream.body) return c.json({ error: 'tts upstream failed' }, 502);
    return new Response(upstream.body, {
      headers: { 'content-type': upstream.headers.get('content-type') ?? 'audio/mpeg' },
    });
  });

  return r;
}
```

Mount in `apps/server/src/index.ts`: `app.route('/api/tts', ttsRoutes());` plus the import.

- [ ] **Step 6: TtsPlayer component + lesson integration**

`apps/web/src/components/TtsPlayer.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react';
import { pickProvider, type TtsProvider } from 'tet-core';

const RATES = [0.75, 1, 1.25, 1.5];

export function TtsPlayer({ text }: { text: string }) {
  const [provider, setProvider] = useState<TtsProvider | null>(null);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const rateRef = useRef(rate);
  rateRef.current = rate;

  useEffect(() => {
    let alive = true;
    void pickProvider().then((p) => { if (alive) setProvider(p); });
    return () => { alive = false; };
  }, []);

  useEffect(() => () => provider?.stop(), [provider]);

  if (!provider) {
    return <p className="muted" style={{ fontSize: '0.9rem' }}>🔊 voice not available in this browser</p>;
  }

  async function play() {
    if (playing) { provider!.pause(); setPlaying(false); return; }
    setPlaying(true);
    await provider!.speak(text, { rate: rateRef.current });
    setPlaying(false);
  }

  return (
    <div className="card" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', padding: '0.6rem 1rem' }}>
      <button className="btn secondary" onClick={() => void play()}>{playing ? '⏸ Pause' : '▶ Listen'}</button>
      <button className="btn secondary" onClick={() => { provider!.stop(); setPlaying(false); }}>⏹ Stop</button>
      <label className="muted" style={{ fontSize: '0.9rem' }}>
        speed{' '}
        <select value={rate} onChange={(e) => setRate(Number(e.target.value))}>
          {RATES.map((r) => <option key={r} value={r}>{r}×</option>)}
        </select>
      </label>
      <span className="muted" style={{ fontSize: '0.85rem' }}>voice: {provider.id}</span>
    </div>
  );
}
```

`apps/web/src/pages/LessonPage.tsx` — mount under the title:

```tsx
import { TtsPlayer } from '../components/TtsPlayer.js';
// after the <h1>{lesson.title}</h1> line:
<TtsPlayer text={lesson.body.replace(/!\[[^\]]*\]\([^)]*\)/g, ' ').replace(/[#*_>`]/g, ' ')} />
```

- [ ] **Step 7: Write and run the player test**

`apps/web/src/components/TtsPlayer.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TtsPlayer } from './TtsPlayer.js';

vi.mock('tet-core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('tet-core')>()),
  pickProvider: vi.fn(async () => ({
    id: 'webspeech',
    isReady: async () => true,
    speak: vi.fn(async () => {}),
    pause: vi.fn(),
    resume: vi.fn(),
    stop: vi.fn(),
  })),
}));

describe('TtsPlayer', () => {
  it('renders controls and calls speak on play', async () => {
    render(<TtsPlayer text="hello lesson" />);
    const play = await screen.findByRole('button', { name: /listen/i });
    await userEvent.click(play);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /pause/i })).toBeTruthy();
    });
    expect(screen.getByText(/voice: webspeech/)).toBeTruthy();
  });
});
```

Run: `pnpm --filter tet-web test -- TtsPlayer`
Expected: PASS — 1/1.

- [ ] **Step 8: Commit**

```bash
git add packages/core/src/tts/ apps/web/src/components/TtsPlayer.tsx apps/web/src/pages/LessonPage.tsx apps/server/src/
git commit -m "feat(tts): provider abstraction, natural-voice Kokoro (client) + WebSpeech fallback + optional cloud proxy, lesson player"
```

---

### Task 15: Cohort login, registration UI, admin dashboard, solo→cohort migration

**Files:**
- Create: `apps/web/src/pages/LoginPage.tsx`, `apps/web/src/pages/AdminPage.tsx`
- Modify: `apps/web/src/routes.tsx` (routes), `apps/web/src/state/session.tsx` (fix `disconnect()` per the Task 10 rule; add `registerCohort`)
- Test: `apps/web/src/pages/AdminPage.test.tsx`, `apps/web/src/pages/LoginPage.test.tsx`

**Interfaces:**
- Consumes: admin/data routes (Task 8), `SessionProvider` (Task 10), `fetchLike`-capable `createServerAdapter` (Task 9).
- Produces:
  - `LoginPage` — two flows: (a) **Sign in to a cohort**: server URL + username + password → `connectCohort(url)` after a `POST {url}/api/auth/login` through a temporary fetch (cookie lands in the browser; `ServerAdapter` then uses `credentials: 'include'`); (b) **Register with invite code**: same server URL + invite code + username + display name + password. Solo-mode visitors see a "You're in solo mode — progress stays in this browser" note.
  - `AdminPage` (admin only): roster table (Task 8 shape), invite creation (copy-to-clipboard code), user creation + password reset, CSV export link (`<a href={`${serverUrl}/api/admin/export.csv`}>` — cookie-authenticated).
  - `SessionProvider.registerCohort(url, payload)` — POSTs registration, then `connectCohort(url)`.
  - **Migration:** after a successful cohort connect, if a `tet.migrated` localStorage flag is absent and the LocalAdapter has data, show a one-time "Bring my local progress" prompt → `exportAll()` from the LocalAdapter → `POST /api/import` → set the flag. Skippable.

- [ ] **Step 1: Write the failing tests**

`apps/web/src/pages/LoginPage.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { LoginPage } from './LoginPage.js';
import { SessionProvider, type SessionCtx } from '../state/session.js';

function mockCtx(over: Partial<SessionCtx> = {}): SessionCtx {
  return {
    session: null,
    adapter: {} as SessionCtx['adapter'],
    authExpired: false,
    clearAuthExpired: () => {},
    refresh: vi.fn(async () => {}),
    connectCohort: vi.fn(async () => {}),
    disconnect: vi.fn(async () => {}),
    ...over,
  } as SessionCtx;
}

// The provider is stubbed via a test-only re-export to avoid network calls.
vi.mock('../state/session.js', async (orig) => {
  const actual = await orig<typeof import('../state/session.js')>();
  return { ...actual };
});

describe('LoginPage', () => {
  it('collects server url + credentials and calls connectCohort on sign-in', async () => {
    const ctx = mockCtx();
    render(
      <MemoryRouter><LoginPage ctx={ctx} /></MemoryRouter>,
    );
    await userEvent.type(screen.getByLabelText(/server url/i), 'http://localhost:8787');
    await userEvent.type(screen.getByLabelText(/username/i), 'learner1');
    await userEvent.type(screen.getByLabelText(/password/i), 'longenough1');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => expect(ctx.connectCohort).toHaveBeenCalledWith('http://localhost:8787'));
  });

  it('register flow sends the invite code', async () => {
    const ctx = mockCtx();
    (ctx as unknown as { registerCohort: ReturnType<typeof vi.fn> }).registerCohort = vi.fn(async () => {});
    render(<MemoryRouter><LoginPage ctx={ctx} /></MemoryRouter>);
    await userEvent.click(screen.getByRole('button', { name: /register with invite/i }));
    await userEvent.type(screen.getByLabelText(/server url/i), 'http://localhost:8787');
    await userEvent.type(screen.getByLabelText(/invite code/i), 'WELCOME1');
    await userEvent.type(screen.getByLabelText(/username/i), 'newbie');
    await userEvent.type(screen.getByLabelText(/password/i), 'longenough1');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    const register = (ctx as unknown as { registerCohort: ReturnType<typeof vi.fn> }).registerCohort;
    await waitFor(() => expect(register).toHaveBeenCalledWith('http://localhost:8787', expect.objectContaining({ inviteCode: 'WELCOME1' })));
  });
});
```

(`LoginPage` accepts an optional injected `ctx` prop for tests; default is `useSession()`.)

`apps/web/src/pages/AdminPage.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { AdminPage } from './AdminPage.js';
import type { SessionCtx } from '../state/session.js';

const roster = {
  users: [
    { id: 1, username: 'admin', displayName: 'Admin', role: 'admin', lastSeenAt: '2026-11-07T09:00:00Z',
      quizAttempts: 3, bestQuizPct: 90, examAttempts: 1, bestExamPct: 72, cardsTracked: 14 },
    { id: 2, username: 'learner1', displayName: 'L1', role: 'learner', lastSeenAt: null,
      quizAttempts: 0, bestQuizPct: null, examAttempts: 0, bestExamPct: null, cardsTracked: 0 },
  ],
};

function ctx(serverUrl = 'http://x'): SessionCtx {
  return {
    session: { mode: 'cohort', userId: '1', displayName: 'admin', role: 'admin', serverUrl },
    adapter: {
      fetchLike: undefined,
    } as unknown as SessionCtx['adapter'],
    authExpired: false,
    clearAuthExpired: () => {},
    refresh: vi.fn(async () => {}),
    connectCohort: vi.fn(async () => {}),
    disconnect: vi.fn(async () => {}),
  } as SessionCtx;
}

// AdminPage takes `ctx` injection like LoginPage, and a `rosterLoader` for tests.
describe('AdminPage', () => {
  it('renders the roster with stats', async () => {
    render(
      <MemoryRouter>
        <AdminPage ctx={ctx()} rosterLoader={async () => roster} inviteCreator={async () => ({ code: 'ABCD2345' })} />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText('learner1')).toBeTruthy());
    expect(screen.getByText(/90%/)).toBeTruthy();
    expect(screen.getByText(/72%/)).toBeTruthy();
  });

  it('creates an invite and shows the code for copying', async () => {
    render(
      <MemoryRouter>
        <AdminPage ctx={ctx()} rosterLoader={async () => roster} inviteCreator={async () => ({ code: 'ABCD2345' })} />
      </MemoryRouter>,
    );
    await userEvent.click(await screen.findByRole('button', { name: /new invite/i }));
    expect(await screen.findByText('ABCD2345')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter tet-web test -- Page`
Expected: FAIL — pages not found.

- [ ] **Step 3: Implement LoginPage, AdminPage, session additions**

`apps/web/src/pages/LoginPage.tsx`:

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useSession, type SessionCtx } from '../state/session.js';

export function LoginPage({ ctx: injected }: { ctx?: SessionCtx }) {
  const real = useSession();
  const { session, connectCohort } = injected ?? real;
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [serverUrl, setServerUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');

  async function signIn() {
    setError('');
    try {
      // Cookie must be set by the server before the adapter reads /api/me.
      const res = await fetch(`${serverUrl.replace(/\/$/, '')}/api/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) throw new Error(await res.text());
      await connectCohort(serverUrl);
      navigate('/');
    } catch (e) { setError(String(e)); }
  }

  async function register() {
    setError('');
    try {
      const res = await fetch(`${serverUrl.replace(/\/$/, '')}/api/auth/register`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ inviteCode, username, displayName, password }),
      });
      if (!res.ok) throw new Error(await res.text());
      await connectCohort(serverUrl);
      navigate('/');
    } catch (e) { setError(String(e)); }
  }

  return (
    <div className="card" style={{ maxWidth: 480, margin: '2rem auto' }}>
      <h1>{mode === 'login' ? 'Sign in to a cohort' : 'Register with an invite'}</h1>
      {session?.mode !== 'cohort' && (
        <p className="muted">You're in solo mode — progress stays in this browser until you sign in to a cohort.</p>
      )}
      <label style={{ display: 'block', marginBottom: '0.75rem' }}>
        Server URL
        <input style={{ width: '100%' }} value={serverUrl} onChange={(e) => setServerUrl(e.target.value)}
          placeholder="https://tet.example.com" aria-label="server url" />
      </label>
      <label style={{ display: 'block', marginBottom: '0.75rem' }}>
        Username
        <input style={{ width: '100%' }} value={username} onChange={(e) => setUsername(e.target.value)} aria-label="username" />
      </label>
      {mode === 'register' && (
        <>
          <label style={{ display: 'block', marginBottom: '0.75rem' }}>
            Invite code
            <input style={{ width: '100%' }} value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} aria-label="invite code" />
          </label>
          <label style={{ display: 'block', marginBottom: '0.75rem' }}>
            Display name
            <input style={{ width: '100%' }} value={displayName} onChange={(e) => setDisplayName(e.target.value)} aria-label="display name" />
          </label>
        </>
      )}
      <label style={{ display: 'block', marginBottom: '0.75rem' }}>
        Password
        <input type="password" style={{ width: '100%' }} value={password} onChange={(e) => setPassword(e.target.value)} aria-label="password" />
      </label>
      {error && <p className="flag warn">{error}</p>}
      {mode === 'login'
        ? <button className="btn" onClick={signIn}>Sign in</button>
        : <button className="btn" onClick={register}>Create account</button>}
      {' '}
      <button className="btn secondary" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
        {mode === 'login' ? 'Register with invite' : 'Back to sign in'}
      </button>
    </div>
  );
}
```

`apps/web/src/pages/AdminPage.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useSession, type SessionCtx } from '../state/session.js';

interface RosterRow {
  id: number; username: string; displayName: string; role: string; lastSeenAt: string | null;
  quizAttempts: number; bestQuizPct: number | null; examAttempts: number;
  bestExamPct: number | null; cardsTracked: number;
}

async function jsonFetch<T>(url: string, init: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: 'include', ...init,
    headers: { 'content-type': 'application/json', ...(init.headers ?? {}) } });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  return await res.json() as T;
}

export function AdminPage({ ctx: injected, rosterLoader, inviteCreator }: {
  ctx?: SessionCtx;
  rosterLoader?: () => Promise<{ users: RosterRow[] }>;
  inviteCreator?: () => Promise<{ code: string }>;
}) {
  const real = useSession();
  const { session, adapter } = injected ?? real;
  const [roster, setRoster] = useState<{ users: RosterRow[] } | null>(null);
  const [newCode, setNewCode] = useState('');
  const [error, setError] = useState('');

  if (session?.role !== 'admin') return <p className="muted">Admins only.</p>;
  const serverUrl = session.serverUrl!.replace(/\/$/, '');

  useEffect(() => {
    void (rosterLoader ?? (async () =>
      jsonFetch<{ users: RosterRow[] }>(`${serverUrl}/api/admin/roster`, { method: 'GET' })))()
      .then(setRoster).catch((e) => setError(String(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function makeInvite() {
    try {
      const res = await (inviteCreator ?? (async () =>
        jsonFetch<{ code: string }>(`${serverUrl}/api/admin/invites`, {
          method: 'POST', body: JSON.stringify({ usesLeft: 1 }),
        })))();
      setNewCode(res.code);
    } catch (e) { setError(String(e)); }
  }

  return (
    <div>
      <h1>Admin</h1>
      {error && <p className="flag warn">{error}</p>}
      <p>
        <a className="btn secondary" href={`${serverUrl}/api/admin/export.csv`} target="_blank" rel="noopener noreferrer">Export CSV</a>
        {' '}
        <button className="btn" onClick={makeInvite}>New invite</button>
        {newCode && <span style={{ marginLeft: '0.75rem' }}>code: <code>{newCode}</code></span>}
      </p>
      <table style={{ width: '100%', borderCollapse: 'collapse' }} className="card">
        <thead>
          <tr style={{ textAlign: 'left' }}>
            <th>learner</th><th>last seen</th><th>quizzes</th><th>best quiz</th>
            <th>exams</th><th>best exam</th><th>cards</th>
          </tr>
        </thead>
        <tbody>
          {(roster?.users ?? []).map((u) => (
            <tr key={u.id} style={{ borderTop: '1px solid #eceef3' }}>
              <td>{u.displayName} <span className="muted">({u.username}{u.role === 'admin' ? ', admin' : ''})</span></td>
              <td className="muted">{u.lastSeenAt ? new Date(u.lastSeenAt).toLocaleString() : 'never'}</td>
              <td>{u.quizAttempts}</td>
              <td>{u.bestQuizPct === null ? '—' : `${u.bestQuizPct}%`}</td>
              <td>{u.examAttempts}</td>
              <td>{u.bestExamPct === null ? '—' : `${u.bestExamPct}%`}</td>
              <td>{u.cardsTracked}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p><button className="btn secondary" onClick={() => void (injected ?? real).disconnect()}>Leave cohort (back to solo)</button></p>
      <p className="muted"><Link to="/">← Dashboard</Link></p>
    </div>
  );
}
```

Session provider additions (`state/session.tsx`):

```tsx
  registerCohort: (serverUrl: string, payload: { inviteCode: string; username: string; displayName: string; password: string }) => Promise<void>;
```

implemented as: POST register (credentials include) → `connectCohort(serverUrl)` → migration check (below). Fix `disconnect()` per the Task 10 rule:

```tsx
    disconnect: async () => {
      const current = adapterRef.current;
      if (current.mode === 'cohort') {
        try { await fetch(`${current.serverUrl!.replace(/\/$/, '')}/api/auth/logout`, { method: 'POST', credentials: 'include' }); } catch { /* offline is fine */ }
      }
      const solo = createLocalAdapter();
      adapterRef.current = solo;
      setAdapter(solo);
      setSession(await solo.getSession());
    },
```

(the provider keeps `adapterRef` mirroring `adapter` so callbacks can read the current one — mirror on every `setAdapter`).

Migration prompt — a small component `apps/web/src/components/MigrationPrompt.tsx` rendered by `App` when `session?.mode === 'cohort'` and `!localStorage.getItem('tet.migrated')`:

```tsx
import { useEffect, useState } from 'react';
import { createLocalAdapter } from 'tet-storage';
import { useSession } from '../state/session.js';

export function MigrationPrompt() {
  const { adapter, refresh } = useSession();
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      if (localStorage.getItem('tet.migrated')) return;
      const local = createLocalAdapter();
      const data = await local.exportAll();
      const hasData = Object.keys(data.progress).length > 0 || data.quizAttempts.length > 0 ||
        data.examAttempts.length > 0 || Object.keys(data.cardStates).length > 0;
      setShow(hasData);
    })();
  }, []);

  if (!show) return null;

  return (
    <div className="card" style={{ borderColor: '#4f46e5' }}>
      <strong>Bring my local progress into the cohort?</strong>
      <p className="muted">One-time upload of lessons read, quiz/exam scores, and flashcard scheduling from this browser.</p>
      <button className="btn" disabled={busy} onClick={async () => {
        setBusy(true);
        const local = createLocalAdapter();
        const data = await local.exportAll();
        const res = await fetch(`${(adapter as { serverUrl?: string }).serverUrl ?? ''}/api/import`, {
          method: 'POST', credentials: 'include',
          headers: { 'content-type': 'application/json' }, body: JSON.stringify(data),
        });
        if (res.ok) { localStorage.setItem('tet.migrated', '1'); setShow(false); await refresh(); }
        setBusy(false);
      }}>Upload progress</button>
      {' '}
      <button className="btn secondary" onClick={() => { localStorage.setItem('tet.migrated', '1'); setShow(false); }}>Start fresh</button>
    </div>
  );
}
```

Routes added in `routes.tsx`:

```tsx
<Route path="/login" element={<LoginPage />} />
<Route path="/admin" element={<AdminPage />} />
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter tet-web test`
Expected: PASS — all web suites green (LoginPage 2/2, AdminPage 2/2).

- [ ] **Step 5: Commit**

```bash
git add apps/web/
git commit -m "feat(web): cohort login/register, admin roster with CSV + invites, one-time solo migration"
```

---

### Task 16: Docker, README, static-build config, Playwright smoke, full verification

**Files:**
- Create: `docker/server.Dockerfile`, `docker/docker-compose.yml`
- Modify: `README.md` (full deploy guide), `.env.example` (final)
- Create: `apps/web/playwright.config.ts`, `apps/web/tests/smoke.spec.ts`
- Modify: root `package.json` scripts (`smoke`)

**Interfaces:**
- Consumes: everything built so far.
- Produces: a deployable system — `pnpm build` web → `apps/web/dist` static site (relative paths); `docker compose up` → API server on :8787 with a mounted SQLite volume; Playwright smoke against `vite preview` + the real server.

- [ ] **Step 1: Docker files**

`docker/server.Dockerfile`:

```dockerfile
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

# pnpm workspace: copy manifests first for layer caching
COPY package.json pnpm-workspace.yaml ./
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
```

`docker/docker-compose.yml`:

```yaml
services:
  tet-server:
    build:
      context: ..
      dockerfile: docker/server.Dockerfile
    ports:
      - "8787:8787"
    environment:
      PORT: 8787
      DB_PATH: /data/tet.sqlite3
      SESSION_SECRET: ${SESSION_SECRET:?set SESSION_SECRET in .env}
      TTS_PROVIDER: ${TTS_PROVIDER:-}
      TTS_API_KEY: ${TTS_API_KEY:-}
    volumes:
      - tet-data:/data
volumes:
  tet-data:
```

- [ ] **Step 2: README (full deploy guide)**

`README.md` — write with these sections, in this order, with real commands (no lorem-ipsum):

1. **What it is** — 2-sentence pitch + feature list (tracks/modules/quizzes/exams/SRS/TTS/cohort tracking).
2. **Quickstart (solo)** — `pnpm install && pnpm content:build && pnpm --filter tet-web dev`; note solo mode stores progress in the browser.
3. **Quickstart (cohort)** — `docker compose -f docker/docker-compose.yml up --build`, register the first user (becomes admin), invite learners from `/admin`.
4. **Deploying the static site to Ondana** — `pnpm build && pnpm content:build`; upload `apps/web/dist` per Ondana's app-deployment flow (relative asset paths make any subpath work); point cohort logins at wherever the server runs.
5. **Running the API server anywhere** — Docker compose section above; bare-metal alternative (`pnpm --filter tet-server start` with `DB_PATH`, `SESSION_SECRET`, `PORT` envs; SQLite = one-file backup via `cp`).
6. **Authoring content** — the `packages/content/content/` tree layout, file formats (frontmatter fields, question/card/exam TOML), the validator (`pnpm --filter tet-content build` fails on bad content), link checking (`pnpm --filter tet-content check-links`), and "add a module = edit tracks.toml + add a directory" as the extension story.
7. **Architecture** — the monorepo tree + one paragraph each on core/content/storage/web/server (copy from the spec §6, trimmed).
8. **Development** — `pnpm test`, `pnpm build`, smoke tests (`pnpm smoke`), license (MIT).

- [ ] **Step 3: Playwright smoke**

`apps/web/playwright.config.ts`:

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  timeout: 60_000,
  webServer: [
    { command: 'pnpm --filter tet-server start', port: 8787, reuseExistingServer: true, env: { DB_PATH: './data/smoke.sqlite3', SESSION_SECRET: 'smoke-secret' } },
    { command: 'pnpm --filter tet-web preview', port: 4173, reuseExistingServer: true },
  ],
  use: { baseURL: 'http://127.0.0.1:4173' },
});
```

`apps/web/tests/smoke.spec.ts` (the spec's smoke path):

```ts
import { test, expect } from '@playwright/test';

test('solo learner: lesson → quiz → flashcard review', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  await page.getByRole('link', { name: /continue/i }).click();
  // module page → first lesson
  await page.getByRole('link', { name: /what is testing/i }).first().click();
  await expect(page.getByRole('button', { name: /mark complete/i })).toBeVisible();
  await page.getByRole('button', { name: /mark complete/i }).click();
  await expect(page.getByText('complete')).toBeVisible();

  // quiz
  await page.goto('/quiz/istqb-m1-fundamentals');
  await page.getByRole('button', { name: /.+/ }).first().click();
  await page.getByRole('button', { name: /check answer/i }).click();

  // flashcards
  await page.goto('/flashcards/istqb-m1-fundamentals');
  await expect(page.getByText(/card|complete/i).first()).toBeVisible();
});

test('cohort: register → admin roster shows the user', async ({ browser, request }) => {
  // Register through the API directly (first user = bootstrap admin).
  const res = await request.post('http://127.0.0.1:8787/api/auth/register', {
    data: { username: 'smokeadmin', displayName: 'Smoke Admin', password: 'longenough1' },
  });
  expect(res.ok()).toBeTruthy();

  const page = await browser.newPage();
  await page.goto('/login');
  await page.getByLabel('server url').fill('http://127.0.0.1:8787');
  await page.getByLabel('username').fill('smokeadmin');
  await page.getByLabel('password').fill('longenough1');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page.getByText(/cohort · smokeadmin/i)).toBeVisible();

  await page.goto('/admin');
  await expect(page.getByText('smokeadmin')).toBeVisible();
  await expect(page.getByRole('link', { name: /export csv/i })).toBeVisible();
});
```

Root `package.json` script: `"smoke": "pnpm --filter tet-content build && pnpm --filter tet-web build && playwright test --config apps/web/playwright.config.ts"`; add `@playwright/test` devDependency at root; run `pnpm exec playwright install chromium` once.

- [ ] **Step 4: Run the smoke suite**

Run: `pnpm smoke`
Expected: 2/2 passing. (First run installs the chromium browser; webServer configs start both processes.)

- [ ] **Step 5: Full verification pass**

Run, in order, reading each output:

```bash
pnpm test          # all unit/component suites green
pnpm build         # content.json emits; web + server typecheck/build green
pnpm smoke         # 2/2
docker compose -f docker/docker-compose.yml config   # compose file valid
```

Then confirm the Ondana artifact exists with relative paths:

```bash
ls apps/web/dist/ && head -5 apps/web/dist/index.html
```

Expected: `dist/index.html` references `./assets/...` (relative), `content.json` present in `dist/`.

- [ ] **Step 6: Commit**

```bash
git add docker/ README.md .env.example apps/web/playwright.config.ts apps/web/tests/ package.json pnpm-lock.yaml
git commit -m "feat(deploy): docker + compose, README deploy guide, Playwright smoke, static build verification"
```

- [ ] **Step 7: Hand off the Ondana upload**

Deliver to the human partner: the path `apps/web/dist/` for upload to ondana.ai, the server-deploy summary from README §3/§5, and the admin bootstrap instructions (first registration = admin). The partner performs the Ondana upload and server placement.

---

## Execution notes

- **Branch:** implement on `m1-walking-skeleton` (already created off `main`; docs commit `173244c` precedes it).
- **M2–M5** are separate plans built on this one: M2 (ISTQB modules 2–7 + chapter banks), M3 (exam engine content + 5 mocks + readiness), M4 (AI track), M5 (polish: karaoke TTS highlighting, retention stats, a11y pass).
- **Deviation ledger rule:** any task that deviates from this plan records a `Ruling:` line (executing-plans/subagent-driven-development contract). Known intentional refinements already recorded in-task: adapter signatures are per-identity instances (Task 6); TTS default is client-side Kokoro-82M via kokoro-js instead of a server sidecar, with the server proxy kept optional (Task 14).
