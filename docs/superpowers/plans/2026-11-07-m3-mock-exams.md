# Test Engineer Track — M3 Mock Exams Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the five official-blueprint ISTQB mock exams with per-(chapter × K-level)-exact assembly, the exam-readiness indicator, and the M3-flagged platform fixes — completing the ISTQB track's exam-prep promise.

**Architecture:** One engine change carries the milestone: exam definitions gain **per-group K-level quotas** (today the engine enforces global K only), and `assembleExam` samples per (chapter × K) cell against the per-chapter draws pinned in M2's content headers. The five mocks are five exam-definition TOMLs assembled from the 191-question bank at runtime (retakes re-roll within the blueprint). Readiness = mean of the learner's last 2 attempts per track ≥ readyPct, surfaced on the dashboard + a new Exam Readiness module page. No new dependencies.

**Tech Stack:** unchanged (TS monorepo; vitest; Playwright smoke extended with one exam flow).

**Spec:** `docs/superpowers/specs/2026-11-07-test-engineer-track-design.md` (§3 blueprint, §5 exam mode + readiness, §7 engines) — M2 ledger requirement: per-(chapter×K) assembly is an engine+schema+validator change, not config.

## Global Constraints

- TypeScript `strict: true`; no `any` in exported signatures; `noUncheckedIndexedAccess: true`; no new dependencies.
- **Blueprint immutability (per mock):** 40 Q, 1 pt each, pass 26/40 (65%), 60 min; chapter counts Ch1=8, Ch2=6, Ch3=4, Ch4=11, Ch5=9, Ch6=2; **per-chapter K draws (M2 pins RECONCILED in Task 3):** Ch1 K1=2/K2=6, Ch2 K1=2/K2=4, Ch3 K1=2/K2=2 (CORRECTED from the M2-pinned 1/3 — the official ESR Tables v1.20 Chapter 3 block reads "K1 = 2, K2 = 2, K3 = 0", confirmed by the v1.16 mirror and Sample Exam Set A's ch3 draw; sources documented in each mock's header), Ch4 K1=0/K2=6/K3=5, Ch5 K1=1/K2=5/K3=3, Ch6 K1=1/K2=1/K3=0 — each mock's per-(chapter×K) cells must sum to exactly these and to the global 8/24/8; ≤2 multi-select per exam.
- **Ch2/Ch3 K-split pinning:** M2 pinned ch2 (2/4) and ch3 (1/3) draws in their content headers during M3 Task 1's verification step (M2 flagged these as unpinned); if official sources disagree, the discrepancy is documented in the exam definitions' header comments. RESOLVED in Task 3: ch2 = 2/4 confirmed; ch3 corrected to 2/2 (see Global Constraints above).
- Readiness (spec §5): mean of last 2 exam attempts per track ≥ readyPct (ISTQB 80%) → "ready"; shown on dashboard + track + module-8 page. Unchanged thresholds.
- Assembly failures are loud: any definition that cannot assemble from the bank fails the build (validator) — never a runtime white-screen (ExamRunner already renders AssemblyError cards).
- All existing behavior preserved: quiz/exam/flashcard/SRS/TTS/admin surfaces untouched except where this plan names them.
- Ids: exam definitions `istqb-mock-1..5`; no question/card changes in this milestone except the optional 3-of-7 multi (Task 3, optional).

## Review Focus

1. **Per-(chapter×K) exactness under adversarial banks** — assembly must satisfy per-group counts AND per-group K cells simultaneously or fail loudly; a bank that satisfies global K but not per-cell K must throw. Test: `packages/core/src/exam.test.ts :: per-group K cells enforced exactly` (thin-cell bank → AssemblyError) + property test across 50 seeds on the real bank.
2. **Readiness math edge cases** — fewer than 2 attempts → not ready; attempts in other tracks don't leak in; ties at exactly readyPct count as ready. Test: `packages/core/src/scoring.test.ts` extensions (already partially pinned in M1).
3. **Module-8 page with zero attempts** — fresh learner sees "no attempts yet" + exam list, never a crash. Test: `apps/web/src/pages/ExamReadinessPage.test.tsx :: renders empty state on fresh storage`.
4. **Smoke exam flow end-to-end** — the new smoke spec must pass on a fresh throwaway DB: register → open readiness page → take mock 1 (answer 40) → report renders with per-chapter bars. Flaky-timer discipline: the existing ExamRunner fake-timer flake (1-in-10) and the smoke transient (M2) get fixed in Task 1 FIRST so this spec runs on stable ground.
5. **Validator runs per-exam assembly with the new schema** — every mock definition assembles at build time (M1 fix-wave behavior, extended to per-group K). Test: `packages/content/tools/validate.test.ts :: assembles every exam under the new schema`.

---

## File Structure (delta)

```
packages/core/src/exam.ts          # per-group K quotas in assembly (schema v2 aware)
packages/core/src/types.ts         # ExamGroup gains klevels?: Record<KLevel, number>; ExamDefinition.groups sum rules
packages/core/src/scoring.ts       # trackReadiness(attempts, readyPct, minAttempts) — generalize isReady (keep isReady name/behavior)
packages/core/src/schema.ts        # ExamGroupSchema klevels; per-group sum cross-check (global klevels removed OR kept as derived summary — see Task 1 ruling)
packages/content/content/exams/    # istqb-mock-1..5.toml (five definitions, per-group K cells)
packages/content/content/istqb/module-8/  # OPTIONAL lesson-less module for navigation (see Task 3 ruling)
apps/web/src/pages/ExamReadinessPage.tsx  # NEW module-8 page: exam list + readiness indicator
apps/web/src/pages/Dashboard.tsx   # readiness chip per track (replaces the M3-promised placeholder line)
apps/web/src/pages/TrackPage.tsx   # readiness line becomes data-driven
apps/web/tests/smoke.spec.ts       # + exam flow spec
packages/content/content/tracks.toml      # readiness.examIds = mock-1..5; header comment refresh
packages/content/content/bank-floors.toml # header comment refresh
```

---

### Task 1: Platform stabilization (M3-flagged fixes FIRST — everything below builds on stable ground)

**Files:**
- Modify: `apps/web/src/components/ExamRunner.test.tsx` (fix the 1-in-10 fake-timer flake)
- Modify: `apps/web/playwright.config.ts` (retries + failure artifacts)
- Modify: `apps/web/tests/smoke.spec.ts` (no content change — only if the retry config requires a fixture tweak)
- Create: `apps/web/src/pages/TrackPage.test.tsx` (the M2-flagged DOM-level test)
- Modify: `packages/content/content/tracks.toml` + `bank-floors.toml` (header comment refresh — the two stale comments ruled on in M2)

**Interfaces:**
- Consumes: M2 ledger notes (ExamRunner flake: fake-timer + waitFor interplay; smoke transient: uncaptured exit-1).
- Produces: a suite where `pnpm test` and `pnpm smoke` pass 3 consecutive clean runs (the acceptance bar for this task — flaky ground invalidates M3's per-cell property tests).

- [ ] **Step 1: Reproduce and fix the ExamRunner flake.** Diagnose the 1-in-10 failure (run the suite 10× capturing failures: `for i in $(seq 1 10); do pnpm --filter tet-web test 2>&1 | grep -E "failed|passed" | tail -1; done`). Expected root cause class: the autosave `vi.advanceTimersByTimeAsync` interplay with `findBy*` default timeouts, or the auto-submit effect racing `draftLoaded`. Fix the TEST or the timing seam (systematic-debugging: find the root cause; do not add sleeps). Evidence: 10 consecutive green full-web runs.
- [ ] **Step 2: Smoke hardening.** `playwright.config.ts`: `retries: process.env.CI ? 2 : 1`, `reporter: [['list'], ['html', { open: 'never' }]]` (failure output preserved), and `workers: 1` kept. Evidence: 5 consecutive `pnpm smoke` greens (the M2 transient may have been the reuseExistingServer hazard — also set `reuseExistingServer: false` for both servers per the M2 review's Minor #3).
- [ ] **Step 3: TrackPage DOM test** (`TrackPage.test.tsx`): mock bundle with 7 modules (order 1-7, one lessonless), assert — numbered list renders 1..7 in order; compound titles render (modules 4/5); progress markers per module; readiness line shows the M3-placeholder text until Task 4 replaces it (update in Task 4).
- [ ] **Step 4: Header comment refresh** — tracks.toml: "modules 1-7 shipped; module 8 + exams arrive in M3"; bank-floors.toml: drop the stale "stays green until Task 3" sentence.
- [ ] **Step 5: Gates** — `pnpm test` (121 + TrackPage tests), `pnpm smoke` ×3 consecutive greens. Commit: `git commit -m "fix(web): stabilize exam-runner timers and smoke; TrackPage DOM test; header refresh"`.

---

### Task 2: Per-group K assembly — schema v2 + engine + validator

**Files:**
- Modify: `packages/core/src/types.ts` (ExamGroup gains `klevels?: Record<KLevel, number>`)
- Modify: `packages/core/src/schema.ts` (ExamGroupSchema klevels; ExamDefinition cross-checks: per-group K sums == group count; groups' K cells sum == global K total when global klevels present; **ruling below**)
- Modify: `packages/core/src/exam.ts` (per-(group × K) assembly)
- Modify: `packages/core/src/quiz.ts` — no change
- Modify: `packages/content/tools/validate.ts` (per-exam assembly already runs — extend to schema v2 definitions)
- Test: `packages/core/src/exam.test.ts` (+per-cell tests), `packages/core/src/schema.test.ts` (+v2 fixtures), `packages/content/tools/validate.test.ts` (+1 v2 assembly test)

**Schema ruling (binding):** the global `klevels` field on ExamDefinition becomes **optional and derived-if-absent**: definitions MAY declare global klevels (legacy M1 fixtures keep passing) OR per-group klevels; the validator requires, for every definition: Σ(group.count) = total; if global klevels present, Σ cells = total AND Σ per-group K = global K per level (consistency); if absent, per-group K cells must sum to the global 8/24/8 shape only when the definition declares `blueprintExact: true` (new optional flag on ExamDefinition — mock exams set it; future casual exams may omit). The engine treats per-group klevels as authoritative when present, falling back to global-K behavior for groups without cells (legacy definitions assemble exactly as before — M1's exam tests must stay green unmodified).

**Assembly semantics (per-cell, binding):** `drawGroup` receives the group's own K cell as its quota set (instead of sharing the global `kLeft`); a group WITHOUT per-group cells participates in the global remainder pool exactly as today (legacy path). Multi-select cap stays global. AssemblyError message names the failing CELL (`group ch4 could not draw 5 K3`).

- [ ] **Step 1: Failing tests** — schema v2 parse (valid per-group cells; group K sum ≠ count rejects; blueprintExact consistency rejects); exam per-cell assembly (per-cell exactness on the M2 pinned draws — build a 191-shaped synthetic bank and assert every cell fills exactly across 50 seeds; thin-cell bank → AssemblyError naming the cell; legacy definition (no per-group cells) assembles identically to M1 — run M1's existing exam tests UNMODIFIED as the regression proof).
- [ ] **Step 2: RED run.** — [ ] **Step 3: Implement** types → schema → exam → validator passthrough. — [ ] **Step 4: GREEN** (all suites; M1 exam tests untouched-green). — [ ] **Step 5: Commit** `feat(core): per-(chapter×K) exam assembly with schema v2 groups`.

---

### Task 3: Five mock exam definitions + readiness math wiring

**Files:**
- Create: `packages/content/content/exams/istqb-mock-1.toml` … `istqb-mock-5.toml` (five definitions; identical blueprint cells, distinct titles + descriptions; `blueprintExact = true`)
- Modify: `packages/content/content/tracks.toml` (readiness.examIds = the five mocks)
- Modify: `packages/content/content/bank-floors.toml` (no change — floors already met)
- Optional: `packages/content/content/istqb/module-7/questions.toml` (+ `istqb-q-0192`: the ledgered 3-of-7 multi for ch6 — 7 options, 3 correct; validator already accepts; only if the author can make it genuinely unambiguous)
- Test: `packages/content/tools/validate.test.ts` (+ mocks assemble ×5), `packages/content/tools/build.test.ts` (+ tracks readiness refs resolve)

**Interfaces:**
- Exam definition shape (schema v2, per-group cells):

```toml
[exam]
id = "istqb-mock-1"
track = "istqb-ctfl"
title = "ISTQB CTFL Mock Exam 1"
timeLimitMin = 60
passPct = 65
total = 40
multiSelectMax = 2
blueprintExact = true

[[exam.group]]
tag = "ch1"
count = 8
[exam.group.klevels]
K1 = 2
K2 = 6

# ... ch2 (6: K1 2/K2 4), ch3 (4: K1 2/K2 2 — corrected in Task 3, see Global Constraints), ch4 (11: K2 6/K3 5), ch5 (9: K1 1/K2 5/K3 3), ch6 (2: K1 1/K2 1)
```

- Readiness: `isReady(attempts, readyPct, minAttempts)` already implements the spec (mean of last 2 ≥ pct); wire per-track filtering at the UI call site in Task 4 (filter attempts by the track's examIds). No core change unless tests expose a gap (then extend scoring tests first).

- [ ] **Step 1: Ch2/Ch3 K-split verification** (the M2-flagged pinning): verify ch2 = 2/4 and ch3 = 1/3 from the official ESR tables (the M2 Task 3/4 headers recorded chapter totals but not K splits); if the official source is ambiguous, document the chosen split + source in each mock's header comment. Record the five mocks' full cell table in each file's header.
- [ ] **Step 2: Author the five definitions** (TOML above; titles Mock Exam 1–5; descriptions vary slightly).
- [ ] **Step 3: Optional 3-of-7 multi** (`istqb-q-0192`, ch6, K2 — only if unambiguous; skip cleanly if forced).
- [ ] **Step 4: Gates** — build (validator assembles ALL five from the real bank ✓), check-links (unchanged), `pnpm test` (+2-3 tests). **Step 5: Commit** `feat(content): five blueprint-exact ISTQB mock exams (per-chapter×K cells)`.

---

### Task 4: Module 8 (Exam Readiness) — page, module entry, readiness UI

**Files:**
- Create: `packages/content/content/istqb/module-8/lesson-01-how-mocks-work.md` (ONE lesson: how mock exams work, the readiness rule, what "80% average" means, weak-area workflow — ~8 min; ≥1 diagram `exam-readiness-flow.svg` + ≥1 video; media rules apply)
- Create: `packages/content/content/istqb/module-8/questions.toml` + `flashcards.toml` — **comment-only files** (empty pools; see ruling)
- Modify: `packages/content/tools/build.ts` (tolerate comment-only/empty quiz+deck files → empty pools; ModuleSchema unchanged)
- Modify: `tracks.toml` (module 8 block: id `istqb-m8-readiness`, examWeight 0, lessonIds [the one lesson], quizPool/deck → module-8)
- Create: `diagrams/exam-readiness-flow.svg` (take mock → score ≥65% pass / readiness = last-2 avg ≥80% → weak-chapter loop)
- Create: `apps/web/src/pages/ExamReadinessPage.tsx` + routes (`/readiness/:trackId` — or `/module/istqb-m8-readiness` renders it; see ruling)
- Modify: `apps/web/src/pages/Dashboard.tsx` (readiness chip per track: "Ready" / "N% avg (last 2)"), `TrackPage.tsx` (readiness line data-driven), `routes.tsx`
- Test: `ExamReadinessPage.test.tsx` (+3: empty state, ready state, not-ready state with avg display), build.test (+1: comment-only pools parse empty)

**Rulings (binding):**
1. **Module 8 entry:** a real manifest module with ONE lesson ("How mock exams work" — genuinely useful, satisfies all media rules) and EMPTY pools via comment-only TOMLs; `build.ts` treats unparseable-as-empty (no `[[question]]`/`[[card]]` tables) quiz/deck files as empty pools. Quiz page already renders "No questions yet"; deck page renders 0.
2. **Readiness page placement:** module 8's page renders the ExamReadiness content inline (module page pattern: lessons + a "Take a mock exam" section listing the track's exams with readiness indicator). Route: the existing `/module/:moduleId` gains a readiness section when the module id is the track's readiness module — simpler: a dedicated section component rendered on ModulePage when `track.readiness.examIds.length > 0` AND the module has no questions. Keep it component-level (`ExamReadinessSection`) so it's testable without route gymnastics.
3. **Readiness indicator:** "Ready" flag (green) when `isReady(attemptsForTrack, readyPct)`; otherwise "Not yet — last 2 average N%" (or "Take 2 mock exams to get a readiness reading"). Attempts filtered by `track.readiness.examIds`.
4. Diagram/video rules for the one lesson; positions/links per house style.

- [ ] **Step 1: Failing tests** (page empty/ready/not-ready; build comment-only pools). — [ ] **Step 2: RED.** — [ ] **Step 3: Implement** (build tolerance → lesson + SVG + manifest → ExamReadinessSection + dashboard chip + TrackPage line). — [ ] **Step 4: GREEN + gates** — [ ] **Step 5: Commit** `feat(web,content): exam readiness — module 8, indicator, five-mock entry points`.

---

### Task 5: Smoke exam flow + full verification + README

**Files:**
- Modify: `apps/web/tests/smoke.spec.ts` (+1 spec: cohort learner takes mock 1 end-to-end)
- Modify: `README.md` (mock exams + readiness shipped; counts unchanged except exam list)

- [ ] **Step 1: New smoke spec** — cohort flow continues: after admin roster check, navigate → readiness module → start mock 1 → answer all 40 (click first option + Next; handle the ≤2 multi by selecting 2 when the multi marker shows) → submit → assert report renders (score + per-chapter bars present). Deterministic: no timing assertions; the timer must not expire mid-flow (mock 1 is 60 min; the flow takes seconds — safe).
- [ ] **Step 2: Full gates** — `pnpm test` (all suites), `pnpm build`, `pnpm smoke` (3/3 now), `check-links` (83/83 + any new lesson's videos).
- [ ] **Step 3: README** — add mock-exams + readiness to the feature list; note the five entry points; ISTQB track section updated (module 8 = readiness hub).
- [ ] **Step 4: Commit** `feat(web): mock-exam smoke flow; README mock-exam readiness`.

---

## Execution notes

- **Branch:** `m3-mock-exams` (created off `main` at `f3de580`).
- **M4 next:** the AI track (modules 1–8 content + quizzes + 2 AI exams) — the schema-v2 exam definitions make AI exams trivial (per-group cells optional).
- **Ledgered M3 items honored here:** ExamRunner flake + smoke hardening (Task 1), TrackPage DOM test (Task 1), header refreshes (Task 1), per-(chapter×K) assembly (Task 2), ch2/ch3 K-split pinning (Task 3 Step 1). Still deferred beyond M3: content consistency pass (q-0012 re-stem, near-duplicates, position balances), q-0153/q-0170 re-home decision, adapter/M5 polish.
