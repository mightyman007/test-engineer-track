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
