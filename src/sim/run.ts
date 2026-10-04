export type PlayMode = 'sprint' | 'free';
export const RUN_SECONDS = 60;

/** Session-only scoring. Persistence and presentation stay outside the simulation. */
export interface ScoreRun {
  mode: PlayMode;
  phase: 'ready' | 'playing' | 'finished';
  remaining: number;
  score: number;
  sinks: number;
  perfects: number;
  bestStreak: number;
  multiplier: number;
  clips: number;
  shotClipped: boolean;
}

export function createScoreRun(mode: PlayMode = 'free'): ScoreRun {
  return { mode, phase: mode === 'sprint' ? 'ready' : 'playing', remaining: RUN_SECONDS,
    score: 0, sinks: 0, perfects: 0, bestStreak: 0, multiplier: 1, clips: 0, shotClipped: false };
}

export function startScoreRun(run: ScoreRun): void {
  if (run.phase === 'ready') run.phase = 'playing';
}

/** Called only for active simulation steps; paused/hidden time never counts. */
export function tickScoreRun(run: ScoreRun, dt: number): void {
  if (run.mode !== 'sprint' || run.phase !== 'playing') return;
  run.remaining = Math.max(0, run.remaining - dt);
  if (run.remaining < 1e-7) {
    run.remaining = 0;
    run.phase = 'finished';
  }
}

export function scoreSink(run: ScoreRun, streak: number, centered: boolean): { points: number; perfect: boolean } {
  if (run.phase !== 'playing') return { points: 0, perfect: false };
  const perfect = centered && !run.shotClipped;
  run.multiplier = Math.min(4, 1 + Math.floor(streak / 3));
  const points = (perfect ? 200 : 100) * run.multiplier;
  run.score += points;
  run.sinks++;
  run.perfects += Number(perfect);
  run.bestStreak = Math.max(run.bestStreak, streak);
  run.shotClipped = false;
  return { points, perfect };
}

export function scoreClip(run: ScoreRun): void {
  run.clips++;
  run.shotClipped = true;
  run.multiplier = 1;
}
