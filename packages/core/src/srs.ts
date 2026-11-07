export type Grade = 'again' | 'hard' | 'good' | 'easy';

export interface CardState {
  ease: number;
  intervalDays: number;
  dueAt: string; // ISO
  reps: number;
  lapses: number;
}

export function newCardState(now: Date = new Date()): CardState {
  return { ease: 2.5, intervalDays: 0, dueAt: now.toISOString(), reps: 0, lapses: 0 };
}

const MIN = 60_000;
const DAY = 86_400_000;
const MIN_EASE = 1.3;

function fromNow(base: Date, ms: number): string {
  return new Date(base.getTime() + ms).toISOString();
}

export function reviewCard(state: CardState, grade: Grade, now: Date = new Date()): CardState {
  const s: CardState = { ...state };
  switch (grade) {
    case 'again':
      s.ease = Math.max(MIN_EASE, s.ease - 0.2);
      s.intervalDays = 0;
      s.reps = 0;
      s.lapses += 1;
      return { ...s, dueAt: fromNow(now, 10 * MIN) };
    case 'hard': {
      s.ease = Math.max(MIN_EASE, s.ease - 0.15);
      s.intervalDays = Math.max(1, Math.round(s.intervalDays * 1.2));
      s.reps += 1;
      break;
    }
    case 'good': {
      s.reps += 1;
      if (s.intervalDays < 1) s.intervalDays = 1;
      else if (s.intervalDays < 6) s.intervalDays = 6;
      else s.intervalDays = Math.round(s.intervalDays * s.ease);
      break;
    }
    case 'easy': {
      s.ease = s.ease + 0.15;
      s.reps += 1;
      s.intervalDays = s.reps === 1 ? 4 : Math.round(s.intervalDays * s.ease * 1.3);
      break;
    }
  }
  return { ...s, dueAt: fromNow(now, s.intervalDays * DAY) };
}
