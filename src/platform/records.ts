import type { ScoreRun } from '../sim/run';

const KEY = 'the-game-sprint-best-v1';

/** Device-local personal best; private browsing/storage failures never block play. */
export function loadBest(): number {
  try {
    const score = Number(localStorage.getItem(KEY));
    return Number.isSafeInteger(score) && score >= 0 ? score : 0;
  } catch { return 0; }
}

export function saveBest(run: ScoreRun, previous: number): number {
  if (run.mode !== 'sprint' || run.phase !== 'finished') return previous;
  const best = Math.max(previous, run.score, loadBest());
  try { localStorage.setItem(KEY, String(best)); } catch { /* Session still works. */ }
  return best;
}
