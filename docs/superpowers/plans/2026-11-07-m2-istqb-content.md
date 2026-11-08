# Test Engineer Track — M2 ISTQB Content Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the ISTQB CTFL track's teaching content — modules 2–7 (lessons + decks + diagrams + videos), chapter question banks to ~210 total, per-LO K-level alignment for the whole track, admin account create/reset UI, and validator hardening — leaving only mock exams (M3) and the AI track (M4) for later milestones.

**Architecture:** No architectural change — this milestone is content-dominant and rides entirely on the M1 platform (tet-content validator/build → content.json; tet-core engines; tet-web pages). Platform deltas are two small pieces: admin account create/reset UI (server routes already exist and are tested), and a validator-hardening batch that lives in the same files the new content exercises. The content manifest grows module-by-module with each content task (manifest + module dir land together so the build never sees a dangling reference).

**Tech Stack:** unchanged from M1 (pnpm TS monorepo; tet-content authoring = markdown + TOML + SVG; vitest; Playwright smoke untouched).

**Spec:** `docs/superpowers/specs/2026-11-07-test-engineer-track-design.md` (§4 curriculum, §9 content pipeline; this plan argues from it).

## Global Constraints

(copied verbatim from the spec/plan where they bind; new-content rules carry M1's ratified conventions)

- TypeScript `strict: true` everywhere; no `any` in exported signatures; `noUncheckedIndexedAccess: true`.
- Dependency whitelist unchanged — no new runtime or dev dependencies in this milestone.
- All content is **original** — never copy ISTQB official sample questions verbatim; syllabus facts and learning-objective references are fair material.
- Every lesson file: ≥1 diagram (repo `content/diagrams/`, embedded inline via `![Title](diagrams/<file>.svg)`) and ≥1 curated embedded video (frontmatter `videos[]`); every technical term hyperlinked on first use; `##` headings are TTS sections; plain-English for non-technical readers.
- **Learning-objective codes MUST be verified against the official ISTQB CTFL v4.0.1 syllabus before authoring** (fetch the official syllabus page/PDF or glossary; the M1 review caught a baked-in wrong LO map — do not trust prior notes). Record the verified LO→section map in the module's plan-notes comment at the top of `questions.toml`.
- **Per-LO K-levels:** each question's `klevel` must match the official K-classification of its `lo` where the syllabus states one (K1 recall / K2 understand / K3 apply); where ambiguous, the author documents the choice in the notes comment. The M1 ch1 sweep (Task 9) retroactively aligns ch1.
- Chapter bank floors (validator-enforced minimums so M3 mock assembly can't starve): ch2 ≥ 33 Q, ch3 ≥ 33, ch4 ≥ 38 (across modules 4+5), ch5 ≥ 33, ch6 ≥ 18; every chapter: ≥ 25% K1, ≥ 2 multi-select, K3 ≥ 5 for ch4 and ch5 (official K3-heavy chapters), 0 elsewhere unless the syllabus says otherwise.
- Exam-blueprint numbers stay untouched: 40 Q total, groups 8/6/4/11/9/2, K1=8/K2=24/K3=8, pass 65%, 60 min — M3's concern, but the banks above must be able to feed them.
- Admin UI changes stay behind `requireAdmin` (server routes `POST /api/admin/users`, `POST /api/admin/users/:id/password` exist and are tested — no new routes).
- Progression stays guided-but-unlocked; new modules appear in manifest order automatically.
- M1 lessons/questions/flashcards are **not** renumbered; ids continue the existing schemes (`istqb-q-0033`+ for new questions, `istqb-fc-0021`+ for new cards, lesson ids `istqb-m2-*` pattern).
- Tags: chapter tags `ch2`…`ch6` on all new bank questions; `ch1` unchanged.

## Review Focus

(the input classes this milestone implies that no task's tests fully exercise — each line gets its pinning test in the owning task)

1. **Module quiz draw across a 30-question bank** — `QuizRunner` draws 12 of ~30 randomly; a bug would repeat a stale draw between retakes (M1 ledgered "retake reuses the same draw"). Test: `apps/web/src/components/QuizRunner.test.tsx :: retake draws a different question set across pool > size` (mock Date.now twice, assert different id sequences OR assert the pool slice covers all 30 across 30 seeded draws — property-style).
2. **Validator capacity × new chapters** — the bank floors are plan constraints, not yet validator rules; a thin ch6 bank (15) must still assemble the future 2-question draw but MUST fail loudly if it can't. Test: `packages/content/tools/validate.test.ts :: per-chapter bank floors are enforced` (new validator rule: for each chapter tag with a declared floor in `content/bank-floors.toml`, bank count ≥ floor).
3. **Manifest ordering with 7 modules** — TrackPage numbers by array position and the bundle pre-sorts by `order` (M1 ledgered dependency); adding modules 2–7 must keep the sort stable. Test: `packages/content/tools/build.test.ts :: modules are emitted sorted by order across 7 modules`.
4. **check-links over the grown content tree** — the Task 4 checker hardcodes a track/module walk; with 7 modules × ~4 lessons (~28 videos), a walker bug silently skips links. Test: `packages/content/tools/check-links.test.ts :: discovers video URLs from every module` (extract the URL-collection into an exported function; unit-test with a temp tree — the network fetch itself stays manual/CLI-only).
5. **Admin create/reset against live validation rules** — the new UI must surface server validation errors (invalid username, weak password, duplicate) without losing form state. Test: `apps/web/src/pages/AdminPage.test.tsx :: create-user form surfaces server errors and preserves input`.

---

## File Structure (delta from M1)

```
packages/content/content/
├── tracks.toml                    # modules 2-7 appended (order 2..7)
├── bank-floors.toml               # NEW: per-chapter bank floors (validator rule)
├── exams/                         # unchanged (empty until M3)
├── istqb/
│   ├── module-1/                  # +4 top-up questions (Task 9); K-alignment edits
│   ├── module-2/                  # NEW: lesson-01..04-*.md, questions.toml, flashcards.toml
│   ├── module-3/                  # NEW
│   ├── module-4/                  # NEW (Ch4 part A: black-box)
│   ├── module-5/                  # NEW (Ch4 part B: white-box, experience-based, collaboration)
│   ├── module-6/                  # NEW (Ch5)
│   └── module-7/                  # NEW (Ch6)
└── diagrams/                      # +~18 new SVGs (one per lesson, shared pool)
apps/web/src/pages/AdminPage.tsx   # + create-user form, reset-password flow, clipboard polish
packages/content/tools/validate.ts # + bank-floors rule, ENOENT→diagnostic, exams-dir optional, parse context
packages/content/tools/check-links.ts # extract discoverVideoUrls() for unit testing
packages/content/tools/build.test.ts  # + 7-module sort test
```

Each module dir follows the M1 layout exactly: flat `lesson-NN-*.md` files (TOML `+++` frontmatter: id/module/title/minutes/objectives/videos/diagrams), one `questions.toml` (`[[question]]` with id/type/stem/options/answers/explanation/tags/lo/klevel), one `flashcards.toml` (`[[card]]`), diagrams in the shared `content/diagrams/` pool (frontmatter `file` paths are content-root-relative).

---

### Task 1: Web deltas — admin account create/reset UI + quiz retake freshness

**Files:**
- Modify: `apps/web/src/pages/AdminPage.tsx` (create-user form, reset-password flow, invite-code copy polish)
- Modify: `apps/web/src/components/QuizRunner.tsx` (retake redraws from the pool)
- Modify: `apps/server/src/routes/admin.ts` (role validation → 400 instead of 500 — one-line guard the final review ledgered)
- Test: `apps/web/src/pages/AdminPage.test.tsx` (+3 tests), `apps/web/src/components/QuizRunner.test.tsx` (+1 test), `apps/server/src/routes/admin.test.ts` (+1 test)

**Interfaces:**
- Consumes: `POST /api/admin/users { username, displayName, password, role }` → 201 `{ user }` | 400 | 409; `POST /api/admin/users/:id/password { password }` → 204 | 400 | 404 (Task 8 routes, tested).
- Produces: AdminPage sections "People" (roster) + "Accounts" (create-user form: username/displayName/password/role select; reset-password inline per roster row: new password + confirm); QuizRunner retake redraws.

- [ ] **Step 1: Write the failing tests**

AdminPage tests (extend the existing file, reusing its `ctx()`/`roster` fixtures and `jsonFetch` injection pattern — the page takes `userCreator?` and `passwordResetter?` props for tests, defaulting to `jsonFetch` calls against `serverUrl`):

```tsx
it('creates a user via the Accounts form and shows the result', async () => {
  const userCreator = vi.fn(async (payload: unknown) => {
    // mirror the real route: 409 on duplicate
    if ((payload as { username: string }).username === 'admin') {
      throw new Error('409: username already taken');
    }
    return { user: { id: 9, username: (payload as { username: string }).username, role: 'learner' } };
  });
  render(
    <MemoryRouter>
      <AdminPage ctx={ctx()} rosterLoader={async () => roster} inviteCreator={async () => ({ code: 'ABCD2345' })} userCreator={userCreator} />
    </MemoryRouter>,
  );
  await userEvent.click(await screen.findByRole('button', { name: /new account/i }));
  await userEvent.type(screen.getByLabelText(/username/i), 'newbie2');
  await userEvent.type(screen.getByLabelText(/display name/i), 'New Person');
  await userEvent.type(screen.getByLabelText(/^password/i), 'longenough1');
  await userEvent.click(screen.getByRole('button', { name: /create account/i }));
  await waitFor(() => expect(userCreator).toHaveBeenCalledWith(expect.objectContaining({ username: 'newbie2', role: 'learner' })));
  expect(await screen.findByText(/account created: newbie2/i)).toBeTruthy();
});

it('surfaces server validation errors and preserves form state', async () => {
  const userCreator = vi.fn(async () => { throw new Error('400: password must be at least 8 characters'); });
  render(
    <MemoryRouter>
      <AdminPage ctx={ctx()} rosterLoader={async () => roster} inviteCreator={async () => ({ code: 'ABCD2345' })} userCreator={userCreator} />
    </MemoryRouter>,
  );
  await userEvent.click(await screen.findByRole('button', { name: /new account/i }));
  await userEvent.type(screen.getByLabelText(/username/i), 'weakpw');
  await userEvent.type(screen.getByLabelText(/^password/i), 'short');
  await userEvent.click(screen.getByRole('button', { name: /create account/i }));
  expect(await screen.findByText(/password must be at least 8 characters/i)).toBeTruthy();
  // form state preserved
  expect((screen.getByLabelText(/username/i) as HTMLInputElement).value).toBe('weakpw');
});

it('resets a password from the roster row and reports success', async () => {
  const passwordResetter = vi.fn(async () => undefined);
  render(
    <MemoryRouter>
      <AdminPage ctx={ctx()} rosterLoader={async () => roster} inviteCreator={async () => ({ code: 'ABCD2345' })} passwordResetter={passwordResetter} />
    </MemoryRouter>,
  );
  const row = (await screen.findByText('learner1')).closest('tr')!;
  await userEvent.click(within(row).getByRole('button', { name: /reset password/i }));
  await userEvent.type(within(row).getByLabelText(/new password/i), 'anotherlong1');
  await userEvent.click(within(row).getByRole('button', { name: /^save password/i }));
  await waitFor(() => expect(passwordResetter).toHaveBeenCalledWith(2, 'anotherlong1'));
  expect(await screen.findByText(/password updated/i)).toBeTruthy();
});
```

(Add `import { within } from '@testing-library/react';` — already a re-export of @testing-library/dom, no new dep.)

QuizRunner retake test + core extraction (pins Review Focus #1 — the M1 ledgered "retake reuses the same draw"):

1. **Core extraction** — add to `packages/core/src/quiz.ts`:

```ts
/** Deterministic per seed: draws `size` distinct questions from the pool
 *  (Fisher–Yates over a seeded shuffle, then slice). Used by the quiz runner
 *  so retakes can re-seed without DOM access. */
export function drawQuizQuestions(pool: Question[], size: number, seed: number): Question[] {
  const rng = mulberry32(seed >>> 0);
  const arr = [...pool];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr.slice(0, size);
}
```

(re-export from index.ts). Core test `packages/core/src/quiz.test.ts` addition:

```ts
import { drawQuizQuestions } from './quiz.js';

const pool = Array.from({ length: 30 }, (_, i) => ({
  id: `q${String(i).padStart(2, '0')}`, type: 'single' as const, stem: `stem-${i}`,
  options: ['a', 'b', 'c', 'd'], answers: [0], explanation: 'e', tags: ['ch1'],
}));

it('drawQuizQuestions: deterministic per seed, size respected, distinct sets across seeds', () => {
  const a = drawQuizQuestions(pool, 12, 1);
  expect(a).toHaveLength(12);
  expect(a).toEqual(drawQuizQuestions(pool, 12, 1));          // deterministic
  expect(new Set(a.map((q) => q.id)).size).toBe(12);           // no duplicates
  const different = Array.from({ length: 25 }, (_, s) =>
    drawQuizQuestions(pool, 12, s + 2).map((q) => q.id).join(','));
  expect(new Set(different).size).toBeGreaterThan(1);          // seeds yield different sets
});
```

2. **QuizRunner wiring** — replace the inline draw in the memo with `drawQuizQuestions(pool, size, seed)` where seed lives in state (`const [seed, setSeed] = useState(() => Date.now() % 2**31)`); the retake button calls `setSeed(Date.now() % 2**31)`; memo keyed on `[bundle, moduleId, size, seed]`.

3. **Component test** (QuizRunner.test.tsx):

```ts
it('retake re-seeds the draw (Date.now consulted again)', async () => {
  const spy = vi.spyOn(Date, 'now');
  // ... mount with a 30-question bank fixture, answer through 12 questions
  //    (pick 'a', Check answer, Next ×12), results view shows 12/12 ...
  const callsAfterFirstRun = spy.mock.calls.length;
  await userEvent.click(screen.getByRole('button', { name: /retake/i }));
  expect(spy.mock.calls.length).toBeGreaterThan(callsAfterFirstRun); // re-seed consumed Date.now
  spy.mockRestore();
});
```

(The combined pins: core property test proves redraw correctness; component test proves the retake actually re-seeds. First-stem DOM comparisons are deliberately avoided — 1/30 coincidence flakiness.)

Server role-validation test (admin.test.ts):

```ts
it('rejects an invalid role with 400 instead of 500', async () => {
  const res = await app.request('/api/admin/users', { method: 'POST',
    headers: { 'content-type': 'application/json', cookie: adminCookie },
    body: JSON.stringify({ username: 'rolebad', displayName: 'R', password: 'longenough1', role: 'superadmin' }) });
  expect(res.status).toBe(400);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter tet-web test -- AdminPage QuizRunner && pnpm --filter tet-server test -- admin`
Expected: FAIL — no Accounts form, no userCreator/passwordResetter props, retake reuses the draw, role 500 ≠ 400.

- [ ] **Step 3: Implement**

1. `apps/server/src/routes/admin.ts` POST /users: validate `role` ∈ {admin, learner} → else 400 (before the INSERT).
2. AdminPage: add the Accounts section (create form + per-row reset flow) with the two injected props; success/error banners as the tests assert; keep the existing invite + CSV + roster behavior untouched; hoist the invite copy button into the Accounts header if it reads better (optional, no test pins position).
3. QuizRunner: seed-in-state per the test comment; retake button calls `setSeed(Date.now() % 2**31)` and resets idx/selected/answered/responses/result/recorded.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter tet-web test && pnpm --filter tet-server test`
Expected: PASS — web 30+3+1 = 34, server 23+1 = 24 (totals move; all green is the gate).

- [ ] **Step 5: Commit**

```bash
git add apps/web/ apps/server/ && git commit -m "feat(web): admin account create/reset UI; quiz retake redraws; admin role validation"
```

---

### Task 2: Validator hardening + bank floors + check-links extraction

**Files:**
- Modify: `packages/content/tools/validate.ts` (bank-floors rule; ENOENT → diagnostic; optional exams dir)
- Modify: `packages/content/tools/build.ts` (pass floors; tolerate missing exams dir)
- Modify: `packages/content/tools/check-links.ts` (extract `discoverVideoUrls(root)`; guard main on argv)
- Create: `packages/content/content/bank-floors.toml` (ch1: 30 only — later tasks append)
- Test: `packages/content/tools/validate.test.ts` (+4), `packages/content/tools/build.test.ts` (+1), new `packages/content/tools/check-links.test.ts` (+2)

**Interfaces:**
- Produces: `bank-floors.toml` format `[[floor]] tag = "ch1" minimum = 30`; `validateContent` gains optional `bankFloors?: Array<{ tag: string; minimum: number }>` input — missing bank floors yield diagnostics `group <tag> bank floor <minimum> unmet (have <n>)`; `discoverVideoUrls(root: string): string[]` exported from check-links (CLI behavior unchanged; `main()` runs only when argv[1] ends with check-links.ts).

- [ ] **Step 1: Write the failing tests**

validate.test.ts additions (using the existing `input()` helper):

```ts
it('enforces declared bank floors', () => {
  const d = validateContent(input({ bankFloors: [{ tag: 'ch1', minimum: 5 }] }));  // 1 question < 5
  expect(d.some((x) => x.message.includes('bank floor 5 unmet (have 1)'))).toBe(true);
});

it('passes when bank floors are met', () => {
  const qs = Array.from({ length: 5 }, (_, i) => ({ ...baseQuestion(), id: `q${i}` }));
  const d = validateContent(input({ questions: qs, bankFloors: [{ tag: 'ch1', minimum: 5 }] }));
  expect(d).toEqual([]);
});


it('aggregated diagnostics include question capacity violations', () => {
  const e = baseExam(); e.groups = [{ tag: 'ch1', count: 8 }]; // bank has 1
  const d = validateContent(input({ exams: [e] }));
  expect(d.some((x) => x.message.includes('needs 8 questions'))).toBe(true);
});
```

build.test.ts addition:

```ts
it('tolerates a missing exams directory (emits no exams, no crash)', () => {
  const root = seedRoot();
  rmSync(join(root, 'exams'), { recursive: true, force: true });
  const bundle = buildContentJson(root);
  expect(bundle.exams).toEqual([]);
});

it('reports a missing diagram as a validation diagnostic, not an ENOENT crash', () => {
  const root = seedRoot();
  rmSync(join(root, 'diagrams', 'x.svg'));
  expect(() => buildContentJson(root)).toThrow(/missing diagram file/);
});
```

check-links.test.ts (new):

```ts
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { discoverVideoUrls } from './check-links.js';

it('discovers video URLs from every module of every track', () => {
  const root = mkdtempSync(join(tmpdir(), 'tet-links-'));
  for (const mod of ['module-2', 'module-3']) {
    mkdirSync(join(root, 'istqb', mod), { recursive: true });
    writeFileSync(join(root, 'istqb', mod, 'lesson-01.md'), `+++
id = "x-${mod}"
module = "m-${mod}"
title = "T"
minutes = 5
objectives = []
videos = [{ title = "v", url = "https://www.youtube.com/watch?v=${mod === 'module-2' ? 'abc12345678' : 'def12345678'}" }]
diagrams = [{ title = "d", file = "diagrams/d.svg" }]
+++
body
`);
  }
  const urls = discoverVideoUrls(root);
  expect(urls.sort()).toEqual([
    'https://www.youtube.com/watch?v=abc12345678',
    'https://www.youtube.com/watch?v=def12345678',
  ]);
});

it('returns an empty array for a tree with no lessons', () => {
  expect(discoverVideoUrls(mkdtempSync(join(tmpdir(), 'tet-links-empty-')))).toEqual([]);
});
```

(Remove the strict-mode probe if still present; imports for `rmSync` in build.test.ts come from `node:fs`.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter tet-content test`
Expected: FAIL — `bankFloors` unknown input key, `discoverVideoUrls` not exported, missing exams dir throws ENOENT.

- [ ] **Step 3: Implement**

1. `validate.ts`: add `bankFloors?: Array<{ tag: string; minimum: number }>` to `ValidationInput`; after the per-tag capacity loop, emit `group <tag> bank floor <minimum> unmet (have <n>)` diagnostics. (The aggregated branch already exists.)
2. `build.ts`: wrap the exams-dir walk — if `existsSync(examsDir)` is false, skip (exams = []); in the diagram loop, replace the eager `readFileSync` with a try/catch that RECORDS the miss (skip adding to `diagramFiles`) so the validator's missing-diagram diagnostic fires instead of an ENOENT crash; pass `bankFloors` (parsed from `content/bank-floors.toml` via `parseToml` → rows of `floor` → `{tag, minimum}`) into `validateContent` when the file exists.
3. `bank-floors.toml`: `[[floor]]\ntag = "ch1"\nminimum = 30`.
4. `check-links.ts`: extract `export function discoverVideoUrls(root: string): string[]` (same walk, returns deduped URLs); keep `checkUrl`/`main` as-is but guard `main()` behind `if (process.argv[1]?.endsWith('check-links.ts'))`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter tet-content test && pnpm --filter tet-content build`
Expected: PASS — content tests green (M1 content still validates: ch1 bank 32 ≥ floor 30), build emits content.json.

- [ ] **Step 5: Commit**

```bash
git add packages/content/ && git commit -m "feat(content): bank floors, ENOENT-as-diagnostic, optional exams dir, testable link discovery"
```

---

### Authoring playbook (applies to Tasks 3–8; each task still carries its own complete contract)

- **First step of every content task: verify the official LO list.** Fetch the ISTQB CTFL v4.0.1 syllabus LOs for the chapter (istqb.org syllabus page, the official PDF, or glossary.istqb.org). Write the verified LO→section map into a TOML comment header at the top of that module's `questions.toml` (`# Verified against ISTQB CTFL v4.0.1 <date>: FL-x.y.z = <one-line description>` lines). Never trust prior notes or other syllabi versions.
- **Question style anchors:** match `packages/content/content/istqb/module-1/questions.toml` — scenario-based K2s with plausible-but-wrong distractors, 1–3 sentence plain-English explanations, exactly 4 options (single) / 5 with exactly 2 correct (multi), `tags = ["chN"]`, correct `lo` + `klevel` per the official classification.
- **K3 questions are apply-exercises:** a small scenario where the learner computes/picks the correct application (a partition set, a boundary, a decision-table column, a coverage count, a risk level) — not terminology recall.
- **Ids continue the global schemes:** questions `istqb-q-00NN` continuing from 0033; cards `istqb-fc-00NN` continuing from 0021; lesson ids `istqb-mN-<slug>`; question ids are globally unique (validator enforces).
- **Gates per content task (all must pass before commit):** `pnpm --filter tet-content build` (validator clean, content.json emitted), `pnpm --filter tet-content check-links` (all new videos embeddable), `pnpm test` (whole repo green). `bank-floors.toml` gains the module's floor in the same commit.
- **Review bar (task reviewer):** verify every question's keyed answer against ISTQB doctrine (sample ≥10 incl. all multi), LO coverage counts, K mix, media rules, audience fit, and the LO codes against official sources. A wrong keyed answer is Critical.

### Task 3: Module 2 — Testing Throughout the SDLC (Ch2, exam weight 6)

**Files:**
- Modify: `packages/content/content/tracks.toml` (module 2 block below), `packages/content/content/bank-floors.toml` (+ ch2: 30)
- Create: `packages/content/content/istqb/module-2/lesson-01-sdlc-context.md`, `lesson-02-test-levels.md`, `lesson-03-test-types.md`, `lesson-04-maintenance-testing.md`
- Create: `packages/content/content/istqb/module-2/questions.toml` (30 Q), `flashcards.toml` (18 cards)
- Create: `packages/content/content/diagrams/sdlc-models-comparison.svg`, `test-levels-pipeline.svg`, `test-types-matrix.svg`, `maintenance-triggers.svg`

**Interfaces:**
- Manifest block (append after module 1):

```toml
[[track.module]]
id = "istqb-m2-sdlc"
track = "istqb-ctfl"
title = "Testing Throughout the SDLC"
order = 2
source = "istqb/module-2"
quizPool = "istqb/module-2"
deck = "istqb/module-2"
lessonIds = ["istqb-m2-sdlc-context", "istqb-m2-test-levels", "istqb-m2-test-types", "istqb-m2-maintenance"]
examWeight = 6
```

- Ids: questions `istqb-q-0033..0065`, cards `istqb-fc-0021..0038`.
- Question contract: 33 Q, `tags = ["ch2"]`, ≥9 K1, 2 multi-select, every verified LO ≥2 questions, `klevel` per official LO classification.
- Coverage map (sections per official v4.0 TOC — LO codes verified in Step 1):

| Lesson | Syllabus section | Must cover | minutes |
|---|---|---|---|
| lesson-01-sdlc-context.md | 2.1 Testing in the Context of an SDLC | sequential (waterfall) vs iterative vs agile characteristics and how testing differs; shift-left (early testing good practice); testing as part of every activity; good practices per SDLC | 14 |
| lesson-02-test-levels.md | 2.2 Test Levels and Test Types | component, component-integration, system, system-integration, acceptance levels; who performs each and what baselines they need; big-bang vs top-down vs bottom-up integration strategies | 14 |
| lesson-03-test-types.md | 2.2 Test Levels and Test Types | functional vs non-functional vs white-box testing (evaluation to objectives + structure); confirmation testing; regression testing; change-related testing; regression vs re-test distinction | 12 |
| lesson-04-maintenance-testing.md | 2.3 Maintenance Testing | triggers: modification (planned releases, corrective/adaptive/maintainer... perfective/preventive), environment migration, retirement; impact analysis for maintenance; migration/retirement testing specifics | 10 |

- Diagrams: `sdlc-models-comparison.svg` (three model columns + a shift-left arrow along the timeline), `test-levels-pipeline.svg` (level ladder with who/what/when annotations), `test-types-matrix.svg` (levels × types grid showing each cell), `maintenance-triggers.svg` (three trigger groups + impact-analysis arrow into planning).
- Worked example (style anchor; author the other 29 to this bar):

```toml
[[question]]
id = "istqb-q-0033"
type = "single"
stem = "An e-commerce team works in two-week sprints. The tester joins the sprint planning meeting to help write acceptance criteria for the upcoming stories. Which good practice is the tester applying?"
options = [
  "Shift-left testing — moving test activities earlier in the SDLC",
  "Regression avoidance — retesting every previous sprint in parallel",
  "Test-right-ification — testing only after code review passes",
  "Acceptance sign-off replacement — the tester now owns the stories",
]
answers = [0]
explanation = "Participating in planning and shaping acceptance criteria is early, preventive test involvement — the shift-left good practice. The other options invent non-existent practices."
lo = "FL-2.1.2"
klevel = "K2"
```

(LO code above is from the M1-era structure tables — the Step 1 verification may renumber it; the authored file must carry the verified code.)

- [ ] **Step 1: Verify official LOs** (fetch + record the map in questions.toml's header comment)
- [ ] **Step 2: Manifest + floors edit** (blocks above; `examWeight` 6)
- [ ] **Step 3: Author 4 lessons** per the coverage map (media rules, term links, `##` sections)
- [ ] **Step 4: Author 4 SVG diagrams** per specs (≤40 lines, viewBox 0 0 800 450, #1a1a2e on light, system font)
- [ ] **Step 5: Author 33 questions + 18 flashcards** (contract; flashcards cover SDLC models, shift-left, all five levels + who/when, integration strategies, all test types incl. confirmation vs regression, maintenance triggers, impact analysis)
- [ ] **Step 6: Gates** — build ✓, check-links ✓, `pnpm test` ✓
- [ ] **Step 7: Commit** — `git add packages/content/content/ && git commit -m "feat(content): ISTQB Module 2 — SDLC (4 lessons, 33 questions, 18 cards, 4 diagrams)"`

---

### Task 4: Module 3 — Static Testing (Ch3, exam weight 4)

**Files:**
- Modify: `tracks.toml` (module 3 block), `bank-floors.toml` (+ ch3: 30)
- Create: `istqb/module-3/lesson-01-static-basics.md`, `lesson-02-review-value-process.md`, `lesson-03-review-types-factors.md`
- Create: `istqb/module-3/questions.toml` (33 Q), `flashcards.toml` (16 cards)
- Create: `diagrams/static-vs-dynamic.svg`, `review-process-flow.svg`, `review-types-ladder.svg`

**Interfaces:**
- Manifest block:

```toml
[[track.module]]
id = "istqb-m3-static"
track = "istqb-ctfl"
title = "Static Testing"
order = 3
source = "istqb/module-3"
quizPool = "istqb/module-3"
deck = "istqb/module-3"
lessonIds = ["istqb-m3-static-basics", "istqb-m3-review-process", "istqb-m3-review-types"]
examWeight = 4
```

- Ids: questions `istqb-q-0066..0098`, cards `istqb-fc-0039..0054`.
- Question contract: 33 Q, `tags = ["ch3"]`, ≥9 K1, 2 multi-select, LO ≥2 each.
- Coverage map:

| Lesson | Syllabus section | Must cover | minutes |
|---|---|---|---|
| lesson-01-static-basics.md | 3.1 Static Testing Basics | static testing = no code execution; work products examined (specs, code, contracts, tests themselves); static vs dynamic distinction; typical defects static analysis finds (ambiguity, inconsistency, dead code, over-engineering); why even un-executable work products benefit | 12 |
| lesson-02-review-value-process.md | 3.1.2–3.1.3 + 3.2 | value of static testing (early defect cost, direct defect detection vs failure-on-execution, knowledge transfer); the review process activities: planning → kick-off → individual preparation → issue reporting/discussion → rework → follow-up; who participates (manager, author, reviewers, scribe/mediator...) | 14 |
| lesson-03-review-types-factors.md | 3.2 Review Types + success factors | informal review; walkthrough (led by author); technical review (moderated, experts); inspection (most formal, defined roles/entry-exit criteria, metrics); success factors (checklists, defect logging, trained participants, culture/safety) | 12 |

- Diagrams: `static-vs-dynamic.svg` (two parallel pipelines: review/analysis vs execute/find-failures), `review-process-flow.svg` (six activities with exit loops), `review-types-ladder.svg` (formality spectrum: informal → walkthrough → technical review → inspection with role annotations).
- Worked example:

```toml
[[question]]
id = "istqb-q-0066"
type = "single"
stem = "Which defect type is MOST likely to be found by static testing rather than by executing the code?"
options = [
  "A button that renders misaligned at a specific screen width",
  "An ambiguous requirement that two developers would implement differently",
  "A payment service that returns a 500 error under a duplicated request",
  "A memory leak that appears only after 48 hours of sustained load",
]
answers = [1]
explanation = "Ambiguity in a requirement is invisible to execution — no code can 'fail' against a vague specification. Static techniques (reviews) catch it by reading. The other three require running the software."
lo = "FL-3.1.1"
klevel = "K2"
```

- [ ] **Step 1: Verify official LOs** · **Step 2: Manifest + floors (ch3: 30)** · **Step 3: 3 lessons** · **Step 4: 3 diagrams** · **Step 5: 33 Q + 16 cards** (cards cover static-vs-dynamic, work products, defect types by technique, all six review activities, roles per type, the four review types with their differentiators, success factors) · **Step 6: Gates** · **Step 7: Commit** — `git commit -m "feat(content): ISTQB Module 3 — Static Testing (3 lessons, 33 questions, 16 cards, 3 diagrams)"`

---

### Task 5: Module 4 — Test Analysis & Design I: Black-Box Techniques (Ch4 part A)

**Files:**
- Modify: `tracks.toml` (module 4 block), `bank-floors.toml` (no new floor — ch4's floor of 35 lands with Task 6 after module 5 exists; add a temporary floor line `ch4 = 18`? No — floors are per chapter, not per module. Skip the floor edit here; Task 6 adds `ch4: 35`.)
- Create: `istqb/module-4/lesson-01-technique-overview.md`, `lesson-02-equivalence-partitioning.md`, `lesson-03-boundary-value-analysis.md`, `lesson-04-decision-tables-state-transitions.md`
- Create: `istqb/module-4/questions.toml` (20 Q, all `tags = ["ch4"]`), `flashcards.toml` (14 cards)
- Create: `diagrams/technique-categories.svg`, `ep-partitions.svg`, `bva-edges.svg`, `state-transition-example.svg`

**Interfaces:**
- Manifest block:

```toml
[[track.module]]
id = "istqb-m4-blackbox"
track = "istqb-ctfl"
title = "Test Analysis & Design I — Black-Box Techniques"
order = 4
source = "istqb/module-4"
quizPool = "istqb/module-4"
deck = "istqb/module-4"
lessonIds = ["istqb-m4-overview", "istqb-m4-equivalence-partitioning", "istqb-m4-boundary-values", "istqb-m4-decisions-states"]
examWeight = 6   # informational; Ch4's 11 exam questions draw from modules 4+5
```

- Ids: questions `istqb-q-0099..0118`, cards `istqb-fc-0055..0068`.
- Question contract: 20 Q, `tags = ["ch4"]`, ≥5 K1, ≥7 **K3 apply-exercises** (compute partitions/boundaries/decision-table columns/transition coverage from a small scenario), 1 multi-select; LO ≥2 each; K3 stems must include all data needed to compute the answer inside the stem.
- Coverage map:

| Lesson | Syllabus section | Must cover | minutes |
|---|---|---|---|
| lesson-01-technique-overview.md | 4.1 Test Techniques Overview | categories (black-box, white-box, experience-based); what "coverage" means generally; how technique choice depends on risk/basis/time; achieving specified coverage as an exit criterion | 10 |
| lesson-02-equivalence-partitioning.md | 4.2.1 Equivalence Partitioning | partitions for valid/invalid values; coverage = partitions exercised; single vs multiple partitions; worked examples (age ranges, discount tiers, form fields) | 14 |
| lesson-03-boundary-value-analysis.md | 4.2.2 Boundary Value Analysis | why defects cluster at boundaries; 2-value vs 3-value BVA; deriving boundary values from partitions; coverage counting | 14 |
| lesson-04-decisions-states.md | 4.2.3 Decision Tables + 4.2.4 State Transition | decision tables: conditions/actions, completeness (2^n), collapsed tables; state transitions: states/events/transitions, invalid transitions, coverage 0-switch (all states/all transitions) vs N-switch; a login-session worked example | 16 |

- Diagrams: `technique-categories.svg` (three families branching from test basis), `ep-partitions.svg` (number line partitioned into valid/invalid ranges with test-point markers), `bva-edges.svg` (fence-post graphic contrasting 2-value vs 3-value points around a boundary), `state-transition-example.svg` (a 4-state login FSM with valid/invalid transition arrows).
- Worked example (K3 shape):

```toml
[[question]]
id = "istqb-q-0081"
type = "single"
stem = "A discount calculator applies: 0% for purchases under $50; 5% for $50–$99.99; 10% for $100–$199.99; 15% for $200 and above. Using 3-value boundary value analysis on the monetary input ONLY, how many boundary test values cover the boundaries between partitions?"
options = ["4", "6", "8", "12"]
answers = [1]
explanation = "Boundaries sit at $50, $100 and $200. 3-value BVA takes the boundary itself plus one value either side: 49/50/51, 99/100/101, 199/200/201 — six values total. (2-value BVA would take 6 values too here; the K3 skill is enumerating them without double-counting.)"
lo = "FL-4.2.2"
klevel = "K3"
```

- [ ] **Step 1: Verify official LOs** · **Step 2: Manifest edit** · **Step 3: 4 lessons** · **Step 4: 4 diagrams** · **Step 5: 20 Q + 14 cards** (cards: technique categories, coverage, EP rules, BVA 2-vs-3 values, decision-table completeness/collapse, state transition coverage levels) · **Step 6: Gates** · **Step 7: Commit** — `git commit -m "feat(content): ISTQB Module 4 — black-box techniques (4 lessons, 20 questions, 14 cards, 4 diagrams)"`

---

### Task 6: Module 5 — Test Analysis & Design II: White-Box, Experience-Based, Collaboration-Based (Ch4 part B)

**Files:**
- Modify: `tracks.toml` (module 5 block), `bank-floors.toml` (+ ch4: 38 — combined bank 20+18 now meets the floor)
- Create: `istqb/module-5/lesson-01-white-box.md`, `lesson-02-experience-based.md`, `lesson-03-collaboration-based.md`
- Create: `istqb/module-5/questions.toml` (18 Q, `tags = ["ch4"]`), `flashcards.toml` (12 cards)
- Create: `diagrams/coverage-illustration.svg`, `exploratory-charter.svg`, `bdd-gwt-flow.svg`

**Interfaces:**
- Manifest block:

```toml
[[track.module]]
id = "istqb-m5-whitebox"
track = "istqb-ctfl"
title = "Test Analysis & Design II — White-Box, Experience-Based, Collaboration-Based"
order = 5
source = "istqb/module-5"
quizPool = "istqb/module-5"
deck = "istqb/module-5"
lessonIds = ["istqb-m5-white-box", "istqb-m5-experience-based", "istqb-m5-collaboration"]
examWeight = 5   # informational; Ch4 total 11 = modules 4 (6) + 5 (5)
```

- Ids: questions `istqb-q-0119..0136`, cards `istqb-fc-0069..0080`.
- Question contract: 18 Q, `tags = ["ch4"]`, ≥5 K1, ≥7 K3 (statement/decision coverage computations are prime K3 material — every coverage question must embed the code/control-flow in the stem), 1 multi-select; LO ≥2 each.
- Coverage map:

| Lesson | Syllabus section | Must cover | minutes |
|---|---|---|---|
| lesson-01-white-box.md | 4.3 White-Box Test Techniques | statement coverage vs decision coverage (and that decision ≥ statement); deriving test cases from control flow; coverage % as measurable exit criteria; cyclomatic complexity as a decision-count proxy and its limits | 14 |
| lesson-02-experience-based.md | 4.4 Experience-Based Test Techniques | error guessing (defect lists/hypotheses); exploratory testing (session-based, charters, simultaneous learn-design-execute); checklist-based testing (high-level vs detailed checklists); when experience-based fits and its limits | 12 |
| lesson-03-collaboration-based.md | 4.5 Collaboration-Based Test Approaches | ATDD: tests before code as the spec; BDD: Given/When/Then structure, ubiquitous language, living documentation; writing GOOD acceptance criteria (INVEST-ish qualities); collaboration benefits (shared understanding, fewer defects of omission) | 12 |

- Diagrams: `coverage-illustration.svg` (annotated flow with statements S1..S6 and decisions D1..D2, highlighting statement-only vs decision paths), `exploratory-charter.svg` (charter card: target/investigation/timebox), `bdd-gwt-flow.svg` (three-amigos conversation → Given/When/Then scenario → executable test → living doc).
- Worked example (K3 coverage computation):

```toml
[[question]]
id = "istqb-q-0119"
type = "single"
stem = "A function's control flow has 6 statements along two paths: path A runs statements S1, S2, S3; path B runs S1, S2, S4. Decision D1 chooses between A and B; no other decisions exist. What are the statement and decision coverage counts for running path A followed by path B?"
options = [
  "Statement 100% (6/6... 4 distinct statements), Decision 100% (2/2 outcomes)",
  "Statement 100%, Decision 50%",
  "Statement 67%, Decision 100%",
  "Statement 100%, Decision 0% — decisions need a table",
]
answers = [0]
explanation = "The distinct statements are S1, S2, S3, S4 — both paths together touch all 4, so statement coverage is 100%. Decision D1 has two outcomes (A and B) and both were taken, so decision coverage is 100%. This is exactly why decision coverage is always ≥ statement coverage."
lo = "FL-4.3.1"
klevel = "K3"
```

- [ ] **Step 1: Verify official LOs** · **Step 2: Manifest + ch4 floor (35)** · **Step 3: 3 lessons** · **Step 4: 3 diagrams** · **Step 5: 18 Q + 12 cards** · **Step 6: Gates** · **Step 7: Commit** — `git commit -m "feat(content): ISTQB Module 5 — white-box, experience-based, collaboration-based (3 lessons, 18 questions, 12 cards, 3 diagrams)"`

---

### Task 7: Module 6 — Managing the Test Activities (Ch5, exam weight 9)

**Files:**
- Modify: `tracks.toml` (module 6 block), `bank-floors.toml` (+ ch5: 30)
- Create: `istqb/module-6/lesson-01-test-planning.md`, `lesson-02-estimation-prioritization.md`, `lesson-03-risk-management.md`, `lesson-04-monitoring-control-completion.md`, `lesson-05-config-defect-management.md`
- Create: `istqb/module-6/questions.toml` (33 Q), `flashcards.toml` (20 cards)
- Create: `diagrams/test-plan-scope.svg`, `estimation-techniques.svg`, `risk-matrix.svg`, `monitoring-metrics.svg`, `defect-workflow.svg`

**Interfaces:**
- Manifest block:

```toml
[[track.module]]
id = "istqb-m6-managing"
track = "istqb-ctfl"
title = "Managing the Test Activities"
order = 6
source = "istqb/module-6"
quizPool = "istqb/module-6"
deck = "istqb/module-6"
lessonIds = ["istqb-m6-planning", "istqb-m6-estimation", "istqb-m6-risk", "istqb-m6-monitoring", "istqb-m6-config-defects"]
examWeight = 9
```

- Ids: questions `istqb-q-0137..0169`, cards `istqb-fc-0081..0100`.
- Question contract: 33 Q, `tags = ["ch5"]`, ≥9 K1, ≥5 K3 (risk-level computations, estimation arithmetic, defect-report field classification), 2 multi-select; LO ≥2 each.
- Coverage map:

| Lesson | Syllabus section | Must cover | minutes |
|---|---|---|---|
| lesson-01-test-planning.md | 5.1 Test Planning | purpose/content of a test plan (context, scope, objectives, approach, roles, schedule, risks...); tester's role in planning; planning is continuous | 12 |
| lesson-02-estimation-prioritization.md | 5.1.5–5.1.6 | estimation techniques: ratio-based, extrapolation, wideband Delphi, three-point (PERT-style (a+4m+b)/6); prioritization: risk-based, coverage-based, requirements-based; test case selection | 14 |
| lesson-03-risk-management.md | 5.2 Risk Management | risk = likelihood × impact; project vs product risks; risk level drives depth/priority of testing (risk-based testing); risk register; mitigation vs contingency actions | 14 |
| lesson-04-monitoring-control-completion.md | 5.3 Test Monitoring, Control and Completion | metrics (defect density, test pass rate, coverage, residual risk); monitoring vs control; test completion activities (reports, archiving testware); test summary/completion reporting | 12 |
| lesson-05-config-defect-management.md | 5.4 + 5.5 Configuration and Defect Management | configuration management: why config items/versioning/traceability matter for testing; defect management: workflow states (new→triaged→fixed→verified→closed / rejected / deferred), defect report fields (title, steps, severity vs priority, expected/actual), defect classification | 14 |

- Diagrams: `test-plan-scope.svg` (plan sections wheel), `estimation-techniques.svg` (four-technique comparison cards with mini-formulas), `risk-matrix.svg` (5×5 likelihood×impact grid with risk zones), `monitoring-metrics.svg` (dashboard panels with sample metric formulas), `defect-workflow.svg` (state machine: new → triaged → in-progress → fixed → verified → closed, with rejected/deferred branches).
- Worked example (K3 risk):

```toml
[[question]]
id = "istqb-q-0129"
type = "single"
stem = "A payment-module defect is almost certain to recur (likelihood 5/5) and would incorrectly charge customers (impact 5/5). A logging typo in an admin screen is unlikely (2/5) with trivial impact (1/5). Using risk level = likelihood × impact and the project's rule that levels ≥ 12 get exhaustive testing while levels ≤ 4 get a single smoke check, what is the right allocation?"
options = [
  "Exhaustive tests for the payment defect; smoke check for the typo",
  "Smoke checks for both — likelihood × impact totals are 25 and 2, both small",
  "Exhaustive for both — any defect touching money is automatically maximal",
  "Smoke for the payment defect; exhaustive for the typo (impact ratios invert)",
]
answers = [0]
explanation = "Payment: 5 × 5 = 25 ≥ 12 → exhaustive. Typo: 2 × 1 = 2 ≤ 4 → smoke. The rule is mechanical once likelihood and impact are separated — 'touching money' is an impact driver, not a bypass of the computation."
lo = "FL-5.2.2"
klevel = "K3"
```

- [ ] **Step 1: Verify official LOs** · **Step 2: Manifest + ch5 floor** · **Step 3: 5 lessons** · **Step 4: 5 diagrams** · **Step 5: 33 Q + 20 cards** · **Step 6: Gates** · **Step 7: Commit** — `git commit -m "feat(content): ISTQB Module 6 — managing test activities (5 lessons, 33 questions, 20 cards, 5 diagrams)"`

---

### Task 8: Module 7 — Test Tools (Ch6, exam weight 2)

**Files:**
- Modify: `tracks.toml` (module 7 block), `bank-floors.toml` (+ ch6: 15)
- Create: `istqb/module-7/lesson-01-tool-support.md`, `lesson-02-automation-benefits-risks.md`
- Create: `istqb/module-7/questions.toml` (18 Q), `flashcards.toml` (10 cards)
- Create: `diagrams/tool-landscape.svg`, `automation-balance.svg`

**Interfaces:**
- Manifest block:

```toml
[[track.module]]
id = "istqb-m7-tools"
track = "istqb-ctfl"
title = "Test Tools"
order = 7
source = "istqb/module-7"
quizPool = "istqb/module-7"
deck = "istqb/module-7"
lessonIds = ["istqb-m7-tool-support", "istqb-m7-benefits-risks"]
examWeight = 2
```

- Ids: questions `istqb-q-0170..0187`, cards `istqb-fc-0101..0110`.
- Question contract: 18 Q, `tags = ["ch6"]`, ≥5 K1, 1 multi-select, LO ≥2 each (the official draw is only 2 questions — 18 gives ~9× headroom for the smallest chapter).
- Coverage map:

| Lesson | Syllabus section | Must cover | minutes |
|---|---|---|---|
| lesson-01-tool-support.md | 6.1 Tool Support for Testing | what test tools do per activity (modeling, test design/data generation, execution, comparison, logging, CI integration, static analysis, management/tracking); what tools CANNOT do (replace test design thinking, guarantee quality) | 10 |
| lesson-02-automation-benefits-risks.md | 6.2 Benefits and Risks of Test Automation | benefits (speed, repeatability, coverage of regression, faster feedback); risks (expecting the tool to do the testing, over-reliance, maintenance cost, false confidence, in-house vs vendor risk); introducing a tool: pilot → rollout, success criteria | 10 |

- Diagrams: `tool-landscape.svg` (tool categories mapped onto the test process activities from Module 1), `automation-balance.svg` (benefits vs risks scale with pilot/rollout as the resolution path).
- Worked example:

```toml
[[question]]
id = "istqb-q-0159"
type = "single"
stem = "A team buys a test-execution tool and expects it to design thorough test cases for their untested legacy module. Six months later regression coverage is unchanged and the tool's scripts just replay the same few flows. What went wrong?"
options = [
  "They chose an execution tool when a static-analysis tool was needed",
  "They expected the tool to replace test design — tools execute and check, they don't decide WHAT to test",
  "Automation always reduces coverage; manual-only teams do better",
  "The legacy module was too large — no tool can test legacy code",
]
answers = [1]
explanation = "Tools amplify a test approach; they don't create one. Test DESIGN (what to test, with what coverage) stays a human responsibility — a classic automation risk per the syllabus. Static analysis is unrelated to execution tooling here."
lo = "FL-6.2.1"
klevel = "K2"
```

- [ ] **Step 1: Verify official LOs** · **Step 2: Manifest + ch6 floor (15)** · **Step 3: 2 lessons** · **Step 4: 2 diagrams** · **Step 5: 18 Q + 10 cards** · **Step 6: Gates** · **Step 7: Commit** — `git commit -m "feat(content): ISTQB Module 7 — test tools (2 lessons, 18 questions, 10 cards, 2 diagrams)"`

---

### Task 9: Ch1 sweep — LO top-ups + per-LO K-level alignment + terminology residuals

**Files:**
- Modify: `packages/content/content/istqb/module-1/questions.toml` (+4 questions, K-alignment edits, q-0015 wording)
- Modify: `packages/content/content/istqb/module-1/lesson-03-seven-testing-principles.md` (no change expected), `packages/content/content/diagrams/test-process-activities.svg` ("Summary report" → "Completion report")
- Modify: `packages/content/content/diagrams/seven-principles.svg` (cell-5 subtitle reflow/box widen — the ledgered overflow)
- Test: existing suites stay green (content adds no test files); validator + build are the gate

**Interfaces:**
- Consumes: the official-LO ruling from M1 Task 5 (FL-1.2.1, FL-1.4.3, FL-1.4.4, FL-1.4.5 at exactly 1 question each).
- Produces: ch1 = 36 questions (chapter total ≈ 191; "~200" spec headroom is met) with every official LO ≥2 and every `klevel` matching the official per-LO classification.

- [ ] **Step 1: Confirm the official per-LO K-level table for ch1** (same verification step as Tasks 3–8; record in the questions.toml header comment alongside the LO map)
- [ ] **Step 2: Author 4 top-up questions** — one each for FL-1.2.1 (testing vs QA/quality control — ch1-flavored and DISTINCT from q-0032's product/process framing), FL-1.4.3 (testware — what counts as testware), FL-1.4.4 (traceability — why it matters between test basis and work products), FL-1.4.5 (a second roles question with a different scenario than q-0031). Ids: `istqb-q-0188..0191` (modules 2–7 consumed 0033–0187). K mix: keep ch1 ≥25% K1 overall.
- [ ] **Step 3: K-align existing ch1 questions** — for every ch1 question whose `klevel` disagrees with the official per-LO classification found in Step 1, either re-tag (if the question genuinely tests at that level) or adjust the stem (if the question would become wrong). Document each change in the fix report.
- [ ] **Step 4: Fix terminology residuals** — q-0015 explanation "pesticide paradox" → "tests wear out (the pesticide paradox)"; `test-process-activities.svg` "Summary report;" → "Completion report".
- [ ] **Step 5: Gates** — `pnpm --filter tet-content build && pnpm --filter tet-content check-links && pnpm test`
- [ ] **Step 6: Commit** — `git commit -m "feat(content): ch1 top-ups to ≥2 per official LO, per-LO K alignment, terminology residuals"`

---

### Task 10: Full verification + README refresh

**Files:**
- Modify: `README.md` (content section: modules 1–7, ~210 questions, decks/counts)

- [ ] **Step 1: Full gates**

```bash
pnpm test          # all suites green (≈ 105 + Task 1/2 additions)
pnpm build         # content.json with 7 modules
pnpm smoke         # 2/2 (dashboard/track pages now show 7 modules)
pnpm --filter tet-content check-links   # every video across 7 modules embeddable
```

- [ ] **Step 2: Track walk-through** — `pnpm --filter tet-web build && (pnpm --filter tet-web preview &)`; verify the ISTQB track page lists modules 1–7 in order with per-module progress markers; module 4+5 titles render correctly; kill the server.
- [ ] **Step 3: README content-count refresh** — modules 1–7 (module 8 = exam readiness arrives with M3's mocks), question/card/lesson totals updated to actuals (~191 questions).
- [ ] **Step 4: Commit** — `git commit -m "docs: refresh README for ISTQB modules 1-7"`

---

## Execution notes

- **Branch:** `m2-istqb-content` (created off `main` at `46db385`).
- **M3 next:** mock exams (5× official blueprint) + readiness indicator — it depends on this milestone's banks; the validator's new assembly check (M1 fix wave) will gate them at build time.
- **M4 next:** AI track (modules 1–8, quizzes, exams) — untouched by this plan.
- **Carried deferred minors intentionally NOT in M2** (still ledgered): CSV tab-prefix, loadContent deep-link path, MigrationPrompt tests, adapter polish items, runtime image slimming. The final review of M2 may re-triage.
