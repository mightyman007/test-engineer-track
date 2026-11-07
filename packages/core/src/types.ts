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
