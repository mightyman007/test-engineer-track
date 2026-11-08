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

describe('schema v2: per-group klevels', () => {
  const v2ExamToml = `
[exam]
id = "mock-v2"
track = "t"
title = "Exam"
timeLimitMin = 60
passPct = 65
total = 11
multiSelectMax = 2
blueprintExact = true

[[exam.group]]
tag = "ch4"
count = 11
[exam.group.klevels]
K1 = 0
K2 = 6
K3 = 5
`;

  it('parses a schema-v2 exam with per-group klevels and blueprintExact', () => {
    const def = parseExamToml(v2ExamToml);
    expect(def.groups[0]!.klevels).toEqual({ K1: 0, K2: 6, K3: 5 });
    expect(def.blueprintExact).toBe(true);
  });

  it('parses a partial per-group cells record (absent levels allowed in TOML)', () => {
    const partial = `
[exam]
id = "mock-v2-partial"
track = "t"
title = "Exam"
timeLimitMin = 60
passPct = 65
total = 8
multiSelectMax = 2
blueprintExact = true

[[exam.group]]
tag = "ch1"
count = 8
[exam.group.klevels]
K1 = 2
K2 = 6
`;
    const def = parseExamToml(partial);
    expect(def.groups[0]!.klevels).toEqual({ K1: 2, K2: 6 });
  });

  it('rejects a v2 group whose klevels sum differs from its count under blueprintExact', () => {
    const bad = v2ExamToml.replace('K3 = 5', 'K3 = 4');
    expect(() => parseExamToml(bad)).toThrow(/group ch4 klevels sum 10 != count 11/);
  });

  it('rejects a group whose klevels sum exceeds its count even without blueprintExact', () => {
    const bad = `
[exam]
id = "overfull"
track = "t"
title = "Exam"
timeLimitMin = 60
passPct = 65
total = 3
multiSelectMax = 1

[[exam.group]]
tag = "ch1"
count = 3
[exam.group.klevels]
K1 = 4
`;
    expect(() => parseExamToml(bad)).toThrow(/group ch1 klevels sum 4 exceeds count 3/);
  });

  it('accepts a non-blueprintExact group whose cells cover fewer slots than its count', () => {
    const casual = `
[exam]
id = "casual"
track = "t"
title = "Exam"
timeLimitMin = 60
passPct = 65
total = 3
multiSelectMax = 1

[[exam.group]]
tag = "ch1"
count = 3
[exam.group.klevels]
K1 = 1
`;
    const def = parseExamToml(casual);
    expect(def.blueprintExact).toBeUndefined();
    expect(def.groups[0]!.klevels).toEqual({ K1: 1 });
  });

  it('rejects a mixed definition (some groups with klevels, some without)', () => {
    const mixed = `
[exam]
id = "mixed"
track = "t"
title = "Exam"
timeLimitMin = 60
passPct = 65
total = 12
multiSelectMax = 2

[[exam.group]]
tag = "ch4"
count = 11
[exam.group.klevels]
K1 = 0
K2 = 6
K3 = 5

[[exam.group]]
tag = "ch6"
count = 1
`;
    expect(() => parseExamToml(mixed)).toThrow(/all groups or none/);
  });

  it('rejects per-group cells inconsistent with declared global klevels', () => {
    const inconsistent = v2ExamToml
      .replace('blueprintExact = true', 'blueprintExact = true\n[exam.klevels]\nK1 = 1\nK2 = 5\nK3 = 5');
    expect(() => parseExamToml(inconsistent))
      .toThrow(/per-group K1 cells sum 0 != global klevels 1/);
  });

  it('accepts per-group cells consistent with declared global klevels', () => {
    const consistent = v2ExamToml
      .replace('blueprintExact = true', 'blueprintExact = true\n[exam.klevels]\nK1 = 0\nK2 = 6\nK3 = 5');
    const def = parseExamToml(consistent);
    expect(def.klevels).toEqual({ K1: 0, K2: 6, K3: 5 });
    expect(def.groups[0]!.klevels).toEqual({ K1: 0, K2: 6, K3: 5 });
  });
});
