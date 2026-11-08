import { assembleExam, AssemblyError } from 'tet-core';
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
  /** Per-tag minimum question counts (from bank-floors.toml); optional. */
  bankFloors?: Array<{ tag: string; minimum: number }>;
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
    // Supply checks cannot see constraint INTERPLAY (e.g. a group whose bank
    // is all multi-select while multiSelectMax is 0 passes both checks above
    // but throws at runtime). Actually assembling the exam here turns any
    // AssemblyError into a build-time diagnostic.
    try {
      assembleExam(exam, input.questions, 1);
    } catch (err) {
      const reason = err instanceof AssemblyError ? err.message : String(err);
      d.push({ file, message: `cannot assemble: ${reason}` });
    }
  }

  // Declared bank floors: per-tag minimum question counts, independent of any
  // exam. Floors are the authoring commitment that keeps banks ahead of the
  // exam blueprints arriving in M3.
  for (const floor of input.bankFloors ?? []) {
    const have = tagCount.get(floor.tag) ?? 0;
    if (have < floor.minimum) {
      d.push({
        file: 'bank-floors.toml',
        message: `group ${floor.tag} bank floor ${floor.minimum} unmet (have ${have})`,
      });
    }
  }

  for (const track of input.tracks) {
    const file = `track:${track.id}`;
    for (const eid of track.readiness.examIds) {
      if (!examIds.has(eid)) d.push({ file, message: `readiness references missing exam ${eid}` });
    }
    // Module order values within a track must be unique: the bundle sorts
    // modules by `order`, and a tie would fall back to declaration (file)
    // order — deterministic, but not the authored order.
    const seenOrders = new Set<number>();
    for (const mod of track.modules) {
      if (seenOrders.has(mod.order)) {
        d.push({ file, message: `duplicate module order ${mod.order} in track ${track.id}` });
      }
      seenOrders.add(mod.order);
    }
  }

  return d;
}
