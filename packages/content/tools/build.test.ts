import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildContentJson } from './build.js';

function seedRoot({ readinessExamIds = ['e1'] }: { readinessExamIds?: string[] } = {}): string {
  const root = mkdtempSync(join(tmpdir(), 'tet-content-'));
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
`);
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
});
