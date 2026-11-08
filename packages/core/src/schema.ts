import { z } from 'zod';
import { parse as parseToml } from 'smol-toml';
import type { ExamDefinition, Flashcard, KLevel, LessonMeta, Question, Track } from './types.js';

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
  // Optional interactive demo key; the web app's demos registry resolves it to
  // a component (content validation cannot see that registry, so only the
  // presence/shape is checked here).
  demo: z.string().min(1).optional(),
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

export const ExamGroupSchema = z.object({
  tag: z.string().min(1),
  count: z.number().int().positive(),
  /**
   * Schema v2: per-group K-level cells. All-or-nothing across a definition's
   * groups (see the ExamDefinitionSchema cross-check below) — per-cell
   * assembly when every group declares cells, legacy global-quota assembly
   * when none do.
   */
  klevels: z.record(z.enum(['K1', 'K2', 'K3']), z.number().int().nonnegative()).optional(),
});

export const ExamDefinitionSchema = z.object({
  id: z.string().min(1),
  track: z.string().min(1),
  title: z.string().min(1),
  timeLimitMin: z.number().positive(),
  passPct: z.number().min(1).max(100),
  total: z.number().int().positive(),
  multiSelectMax: z.number().int().nonnegative(),
  groups: z.array(ExamGroupSchema).min(1),
  klevels: z.record(z.enum(['K1', 'K2', 'K3']), z.number().int().nonnegative()).optional(),
  /**
   * Schema v2: strict blueprint accounting. When true, every group's cells
   * must sum exactly to that group's count; without it, cells may cover
   * fewer slots and klevel-less questions fill the rest.
   */
  blueprintExact: z.boolean().optional(),
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
  // Schema v2 cross-checks. A definition either declares klevels cells on
  // EVERY group (per-cell assembly) or on NONE (legacy global-quota
  // assembly). Mixing the two is rejected: per-group cells are
  // authoritative, so a cell-less group would draw from an incoherent
  // "global remainder" — all-or-nothing keeps the semantics unambiguous.
  const withCells = e.groups.filter((g) => g.klevels !== undefined);
  if (withCells.length === 0) return; // legacy definition — M1 checks only
  if (withCells.length !== e.groups.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'per-group klevels must be declared on all groups or none (found mix)',
    });
    return;
  }
  const cellSums: Record<KLevel, number> = { K1: 0, K2: 0, K3: 0 };
  for (const g of withCells) {
    const cells = g.klevels!;
    const sum = (cells.K1 ?? 0) + (cells.K2 ?? 0) + (cells.K3 ?? 0);
    if (sum > g.count) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `group ${g.tag} klevels sum ${sum} exceeds count ${g.count}`,
      });
    } else if (e.blueprintExact && sum !== g.count) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `group ${g.tag} klevels sum ${sum} != count ${g.count} (blueprintExact)`,
      });
    }
    cellSums.K1 += cells.K1 ?? 0;
    cellSums.K2 += cells.K2 ?? 0;
    cellSums.K3 += cells.K3 ?? 0;
  }
  if (e.klevels) {
    // Declared global klevels must agree with the per-group cells per level
    // (the cells are authoritative; the global field is a derived summary).
    for (const k of ['K1', 'K2', 'K3'] as const) {
      const global = e.klevels[k] ?? 0;
      if (cellSums[k] !== global) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `per-group ${k} cells sum ${cellSums[k]} != global klevels ${global}`,
        });
      }
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
  return rows(parseToml(text) as TomlTable, 'question').map((q, i) => {
    try {
      return QuestionSchema.parse(q);
    } catch (err) {
      // Surface the failing row's author-facing id (e.g. "question q1: …");
      // a bare ZodError does not echo the id, which makes a broken bank hard
      // to locate from the build log alone.
      const id = (q as TomlTable)['id'];
      const label = typeof id === 'string' && id.length > 0 ? `question ${id}` : `question #${i}`;
      throw new Error(`${label}: ${err instanceof Error ? err.message : String(err)}`, { cause: err });
    }
  });
}

export function parseFlashcardsToml(text: string): Flashcard[] {
  return rows(parseToml(text) as TomlTable, 'card').map((c) => FlashcardSchema.parse(c));
}

export function parseExamToml(text: string): ExamDefinition {
  const raw = parseToml(text) as TomlTable;
  const exam = raw['exam'];
  if (!exam || typeof exam !== 'object') throw new Error('exam file must contain an [exam] table');
  // Exam files author groups as `[[exam.group]]` (TOML key `group`); the
  // schema field is `groups`. Normalize before validation.
  const e = exam as TomlTable;
  if (e.groups === undefined && e.group !== undefined) e.groups = e.group;
  // zod v3 infers enum-keyed records as Partial<Record<...>>; the ExamDefinition
  // interface declares full Record<KLevel, number>, so cast at this boundary.
  return ExamDefinitionSchema.parse(e) as ExamDefinition;
}

export function parseTrackToml(text: string): Track[] {
  const raw = parseToml(text) as TomlTable;
  return rows(raw, 'track').map((t) => {
    // Exam-style bridge: the authoring key is `[[track.module]]` (TOML key
    // `module`); the schema field is `modules`. Normalize before validation.
    const tr = t as TomlTable;
    if (tr.modules === undefined && tr.module !== undefined) tr.modules = tr.module;
    // Track files author readiness as flattened keys (`readiness_passPct`, …)
    // because `[[track.module]]` arrays and nested `[track.readiness]` tables
    // conflict in TOML array-of-tables syntax. Fold flattened keys into the
    // nested `readiness` object before validation (flattened wins).
    const readiness: Record<string, unknown> = {};
    for (const key of Object.keys(tr)) {
      if (key.startsWith('readiness_')) {
        readiness[key.slice('readiness_'.length)] = tr[key];
        delete tr[key];
      }
    }
    if (Object.keys(readiness).length > 0) tr.readiness = readiness;
    return TrackSchema.parse(tr);
  });
}

export function parseLessonMarkdown(text: string): LessonMeta {
  const match = /^\+\+\+\r?\n([\s\S]*?)\r?\n\+\+\+\r?\n?([\s\S]*)$/.exec(text);
  if (!match) throw new Error('lesson file missing +++ frontmatter block');
  const meta = parseToml(match[1]!) as TomlTable;
  return LessonMetaSchema.parse({ ...meta, body: match[2] });
}
