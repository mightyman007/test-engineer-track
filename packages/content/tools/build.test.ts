import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { assembleExam } from 'tet-core';
import { buildContentJson, CONTENT_ROOT } from './build.js';

function seedRoot({
  readinessExamIds = ['e1'],
  modules = 1,
  declaration,
}: {
  readinessExamIds?: string[];
  /** Total module count (m1..mN); extras get a minimal lesson/question/card set. */
  modules?: number;
  /** Module numbers in the order their blocks appear in tracks.toml (m1 stays first). */
  declaration?: number[];
} = {}): string {
  const root = mkdtempSync(join(tmpdir(), 'tet-content-'));
  const declared = declaration ?? Array.from({ length: modules }, (_, i) => i + 1);
  const extraBlocks = declared
    .slice(1)
    .map((k) => `[[track.module]]
id = "m${k}"
track = "t1"
title = "M${k}"
order = ${k}
source = "m${k}"
quizPool = "m${k}"
deck = "m${k}"
lessonIds = ["l${k}"]
examWeight = 1
`)
    .join('');
  writeFileSync(join(root, 'tracks.toml'), `
[[track]]
id = "t1"
title = "T"
description = "D"
order = 1
readiness_passPct = 65
readiness_readyPct = 80
readiness_examIds = [${readinessExamIds.map((id) => `"${id}"`).join(', ')}]
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
${extraBlocks}`);
  mkdirSync(join(root, 'exams'));
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
  for (const k of declared.slice(1)) {
    mkdirSync(join(root, `m${k}`));
    writeFileSync(join(root, `m${k}`, 'lesson-01.md'), `+++
id = "l${k}"
module = "m${k}"
title = "L${k}"
minutes = 10
objectives = []
videos = [{ title = "v", url = "https://www.youtube.com/watch?v=abc" }]
diagrams = [{ title = "d", file = "diagrams/x.svg" }]
+++
# L${k}
`);
    writeFileSync(join(root, `m${k}`, 'questions.toml'), `
[[question]]
id = "q${k}"
type = "single"
stem = "s"
options = ["a", "b", "c", "d"]
answers = [0]
explanation = "e"
tags = ["ch${k}"]
klevel = "K1"
`);
    writeFileSync(join(root, `m${k}`, 'flashcards.toml'), `
[[card]]
id = "c${k}"
front = "f"
back = "b"
tags = ["ch${k}"]
`);
  }
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

  it('tolerates a missing exams directory (emits no exams, no crash)', () => {
    // Realistic no-exams state: M1 manifests ship readiness_examIds = []
    // until M3's mock exams arrive, so the exam-less tree stays consistent.
    const root = seedRoot({ readinessExamIds: [] });
    rmSync(join(root, 'exams'), { recursive: true, force: true });
    const bundle = buildContentJson(root);
    expect(bundle.exams).toEqual([]);
  });

  it('fails the build when the manifest references an exam that does not exist', () => {
    const root = seedRoot(); // readiness_examIds = ["e1"], no exam defined on disk
    rmSync(join(root, 'exams'), { recursive: true, force: true });
    expect(() => buildContentJson(root)).toThrow(/readiness references missing exam e1/);
  });

  it('reports a missing diagram as a validation diagnostic, not an ENOENT crash', () => {
    const root = seedRoot();
    rmSync(join(root, 'diagrams', 'x.svg'));
    expect(() => buildContentJson(root)).toThrow(/missing diagram file/);
  });

  it('enforces a bank floor declared in bank-floors.toml end-to-end', () => {
    const root = seedRoot();
    writeFileSync(join(root, 'bank-floors.toml'), '[[floor]]\ntag = "ch99"\nminimum = 5\n');
    expect(() => buildContentJson(root)).toThrow(/bank floor 5 unmet \(have 0\)/);
  });

  it('rejects a bank-floors.toml that defines no floors', () => {
    const root = seedRoot();
    writeFileSync(join(root, 'bank-floors.toml'), '# floors pending\n');
    expect(() => buildContentJson(root)).toThrow(/present but defines no floors/);
  });

  it('modules are emitted sorted by order across 7 modules', () => {
    // Manifest blocks are declared scrambled relative to their order values
    // (3 before 2, 7 before 5, 5 before 4): TrackPage numbers modules by array
    // position, so any refactor that drops the bundle's `order` sort must fail
    // here instead of silently renumbering the track page.
    const root = seedRoot({ modules: 7, declaration: [1, 3, 2, 7, 5, 4, 6] });
    const bundle = buildContentJson(root);
    expect(bundle.tracks[0]!.modules.map((m) => m.order)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(bundle.tracks[0]!.modules.map((m) => m.id)).toEqual(
      ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7'],
    );
    // The scrambled declaration must not disturb per-module wiring either.
    expect(bundle.questionsByModule['m7']).toEqual(['q7']);
    expect(bundle.cardsByModule['m4']).toEqual(['c4']);
  });

  it('rejects two modules sharing the same order value', () => {
    const root = seedRoot({ modules: 5 });
    // m5 ties with m4: the bundle sort would fall back to declaration (file)
    // order — deterministic, but not the authored order.
    const manifest = readFileSync(join(root, 'tracks.toml'), 'utf8').replace('order = 5', 'order = 4');
    writeFileSync(join(root, 'tracks.toml'), manifest);
    expect(() => buildContentJson(root)).toThrow(/duplicate module order 4 in track t1/);
  });

  it('wires the real track readiness to the five shipped mock exams', () => {
    // M3 Task 3 wiring: readiness.examIds lists istqb-mock-1..5, and every
    // referenced exam exists in the built bundle (the validator also guards
    // this; this test pins the authored wiring itself so a typo in tracks.toml
    // or a dropped mock file fails the suite, not just the build).
    const bundle = buildContentJson(CONTENT_ROOT);
    const track = bundle.tracks.find((t) => t.id === 'istqb-ctfl')!;
    expect(track.readiness.examIds).toEqual([
      'istqb-mock-1', 'istqb-mock-2', 'istqb-mock-3', 'istqb-mock-4', 'istqb-mock-5',
    ]);
    const examIds = new Set(bundle.exams.map((e) => e.id));
    for (const id of track.readiness.examIds) expect(examIds.has(id)).toBe(true);
    // Scoped to the istqb track: the bundle also carries the M4 AI mocks
    // (ai-mock-1..2, pinned by the AI readiness test below).
    expect(bundle.exams.filter((e) => e.track === 'istqb-ctfl')).toHaveLength(5);
  });

  it('wires the AI track readiness to the two shipped AI mock exams', () => {
    // M4 Task 7 wiring: the Task 2 empty-readiness placeholder on the AI track
    // now lists ai-mock-1..2, and every referenced exam exists in the built
    // bundle (the validator guards the reference; this pins the authored
    // wiring itself so a typo in tracks.toml or a dropped mock file fails the
    // suite, not just the build).
    const bundle = buildContentJson(CONTENT_ROOT);
    const track = bundle.tracks.find((t) => t.id === 'ai-fundamentals')!;
    expect(track.readiness.examIds).toEqual(['ai-mock-1', 'ai-mock-2']);
    const examIds = new Set(bundle.exams.map((e) => e.id));
    for (const id of track.readiness.examIds) expect(examIds.has(id)).toBe(true);
    expect(bundle.exams.filter((e) => e.track === 'ai-fundamentals')).toHaveLength(2);
  });

  it('assembles both AI mocks from the real bank on the count-only path', () => {
    // M4 Task 7: the AI mocks are the first legacy-path exams since M1 — no
    // definition klevels, no per-group cells, no blueprintExact — because the
    // AI bank ships klevel-free (no official LO taxonomy to map to). The
    // authored allocation is 4x6 + 3x2 = 30 across ai1..ai8. validate.ts
    // already runs seed 1 at build; this re-runs it against the REAL built
    // bank and asserts the drawn shape: 30 questions, per-tag counts matching
    // the authored groups, multi-select cap respected.
    const bundle = buildContentJson(CONTENT_ROOT);
    const aiExams = bundle.exams.filter((e) => e.track === 'ai-fundamentals');
    expect(aiExams.map((e) => e.id)).toEqual(['ai-mock-1', 'ai-mock-2']);
    for (const def of aiExams) {
      // The count-only shape itself: the schema treats a definition with no
      // klevels anywhere as legacy, and the engine then runs with a null
      // K quota — pin that no future edit re-introduces K constraints the
      // klevel-free AI bank cannot satisfy.
      expect(def.klevels).toBeUndefined();
      expect(def.blueprintExact).toBeUndefined();
      expect(def.groups.map((g) => [g.tag, g.count])).toEqual([
        ['ai1', 4], ['ai2', 4], ['ai3', 4], ['ai4', 4],
        ['ai5', 4], ['ai6', 4], ['ai7', 3], ['ai8', 3],
      ]);
      expect(def.groups.every((g) => g.klevels === undefined)).toBe(true);

      const drawn = assembleExam(def, bundle.questions, 1);
      expect(drawn.questions).toHaveLength(30);
      const byTag = new Map<string, number>();
      let multi = 0;
      for (const q of drawn.questions) {
        for (const t of q.tags) byTag.set(t, (byTag.get(t) ?? 0) + 1);
        if (q.type === 'multi') multi++;
      }
      for (const g of def.groups) expect(byTag.get(g.tag)).toBe(g.count);
      expect(multi).toBeLessThanOrEqual(def.multiSelectMax);
    }
  });

  it('parses comment-only quiz and deck files as empty pools (module 8 pattern)', () => {
    // M3 Task 4: module 8 (exam readiness) ships INTENTIONALLY EMPTY pools as
    // comment-only TOML — its page renders the track's mock-exam list instead
    // of a practice quiz. The build must read those as empty pools, keep the
    // module's lessons, and record [] in the per-module pool maps.
    const root = seedRoot({ modules: 2 });
    writeFileSync(join(root, 'm2', 'questions.toml'), [
      '# Module 8 (exam readiness) — INTENTIONALLY EMPTY question pool.',
      '#',
      '# This module is the readiness hub: its page lists the track\'s mock exams',
      '# and the readiness indicator instead of a module quiz. The exam questions',
      '# live in the per-chapter banks (modules 1-7) that the mocks draw from.',
      '# build.ts parses a file with no [[question]] tables as an empty pool, so',
      '# this comment-only file is valid authoring, not a broken module.',
      '',
    ].join('\n'));
    writeFileSync(join(root, 'm2', 'flashcards.toml'), [
      '# Module 8 (exam readiness) — INTENTIONALLY EMPTY deck (comment-only TOML).',
      '',
    ].join('\n'));
    const bundle = buildContentJson(root);
    expect(bundle.lessons['l2']).toBeTruthy();
    expect(bundle.questions).toHaveLength(1); // only m1's q1
    expect(bundle.flashcards).toHaveLength(1); // only m1's c1
    expect(bundle.questionsByModule['m2']).toEqual([]);
    expect(bundle.cardsByModule['m2']).toEqual([]);
  });

  it('keeps pool-file failures loud when the file is not comment-only', () => {
    // The tolerance is for "genuinely nothing here" — a file with real (or
    // garbage) content must still fail the build, never silently go empty.
    const root = seedRoot();
    writeFileSync(join(root, 'm1', 'questions.toml'), 'this file is not valid toml at all\n');
    expect(() => buildContentJson(root)).toThrow();
  });
});
