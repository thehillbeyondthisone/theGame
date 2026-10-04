import { describe, expect, it } from 'vitest';
import { makePlayFrame } from './comfort';
import { createIntent } from './intent';
import { createScoreRun, scoreClip, scoreSink, startScoreRun, tickScoreRun } from './run';
import { tuning } from './tuning';
import { addScaled, copy, set, vec3 } from './vec3';
import { createWorld, stepWorld } from './world';
import { loadBest, saveBest } from '../platform/records';

const frame = () => makePlayFrame(vec3(0, 1.2, 0), vec3(0, 0, -1));
const dt = tuning.sim.step;

describe('score run', () => {
  it('waits for a gesture, lasts 60 active seconds, and stops scoring at the deadline', () => {
    const world = createWorld(frame(), 7, 'sprint');
    const intent = createIntent();
    for (let i = 0; i < 120; i++) stepWorld(world, intent, dt);
    expect(world.scoreRun.remaining).toBe(60);
    expect(world.step).toBe(0);
    startScoreRun(world.scoreRun);
    for (let i = 0; i < 7200; i++) stepWorld(world, intent, dt);
    expect(world.scoreRun.phase).toBe('finished');
    expect(world.scoreRun.remaining).toBe(0);
    const position = copy(vec3(), world.disc.pos);
    addScaled(intent.target, world.disc.pos, world.hoop.normal, 1);
    intent.stiffness = 60;
    stepWorld(world, intent, dt);
    expect(world.disc.pos).toEqual(position);
    expect(scoreSink(world.scoreRun, 12, true).points).toBe(0);
  });

  it('awards precision and capped multipliers, and preserves points after a rim hit', () => {
    const run = createScoreRun();
    expect(scoreSink(run, 1, true)).toEqual({ points: 200, perfect: true });
    expect(scoreSink(run, 2, false).points).toBe(100);
    expect(scoreSink(run, 3, true).points).toBe(400);
    expect(scoreSink(run, 6, true).points).toBe(600);
    expect(scoreSink(run, 9, true).points).toBe(800);
    expect(scoreSink(run, 99, true).points).toBe(800);
    const score = run.score;
    scoreClip(run);
    expect(run.score).toBe(score);
    expect(run.multiplier).toBe(1);
    expect(scoreSink(run, 1, true)).toEqual({ points: 100, perfect: false });
    expect(scoreSink(run, 2, true).perfect).toBe(true);
    expect(run.bestStreak).toBe(99);
  });

  it('grades real swept captures and does not score the capture animation twice', () => {
    const world = createWorld(frame(), 7, 'sprint');
    startScoreRun(world.scoreRun);
    const { center, normal } = world.hoop;
    addScaled(world.disc.pos, center, normal, 0.05);
    copy(world.disc.prevPos, world.disc.pos);
    set(world.disc.vel, -normal.x * 2, -normal.y * 2, -normal.z * 2);
    for (let i = 0; i < 60; i++) stepWorld(world, createIntent(), dt);
    expect(world.scoreRun.score).toBe(200);
    expect(world.scoreRun.sinks).toBe(1);
    expect(world.scoreRun.perfects).toBe(1);
    expect(world.captureRemaining).toBeGreaterThan(0);
    expect(world.scoreRun.remaining).toBeCloseTo(59.5, 6);
  });

  it('keeps free play untimed and a new run starts with clean session state', () => {
    const world = createWorld(frame(), 1);
    tickScoreRun(world.scoreRun, 1000);
    expect(world.scoreRun.phase).toBe('playing');
    expect(world.scoreRun.remaining).toBe(60);
    scoreSink(world.scoreRun, 9, true);
    const fresh = createWorld(frame(), 1, 'sprint');
    expect(fresh.scoreRun).toMatchObject({ phase: 'ready', score: 0, sinks: 0, perfects: 0, multiplier: 1 });
    expect(fresh.hoop).toEqual(createWorld(frame(), 1, 'sprint').hoop);
  });

  it('allows play when browser storage is unavailable, and only records completed sprints', () => {
    const run = createScoreRun('sprint');
    run.score = 500;
    expect(loadBest()).toBe(0); // Node has no localStorage, like blocked browser storage.
    expect(saveBest(run, 200)).toBe(200);
    run.phase = 'finished';
    expect(saveBest(run, 200)).toBe(500);
    expect(saveBest(run, 700)).toBe(700);
    run.mode = 'free';
    expect(saveBest(run, 200)).toBe(200);
  });
});
