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
