import { describe, expect, it } from 'vitest';
import { makePlayFrame, MAX_DIST } from './comfort';
import { createIntent, type Intent } from './intent';
import { tuning } from './tuning';
import { addScaled, copy, distance, dot, length, normalize, set, vec3 } from './vec3';
import { createWorld, stepWorld, type World } from './world';

const DT = tuning.sim.step;
const frame = () => makePlayFrame(vec3(0, 1.2, 0), vec3(0, 0, -1));

function run(world: World, intent: Intent, seconds: number): void {
  for (let i = 0; i < Math.round(seconds / DT); i++) stepWorld(world, intent, DT);
}

describe('world', () => {
  it('is deterministic: same seed and inputs give identical results', () => {
    const script = (w: World) => {
      const intent = createIntent();
      for (let i = 0; i < 1200; i++) {
        intent.stiffness = i % 400 < 300 ? 40 : 0;
        set(intent.target, 0.4 * Math.sign(Math.sin(i / 50)), 1.0 + (i % 7) * 0.02, -1.3);
        if (i === 500) intent.throwBoost = 1.6;
        if (i === 900) set(intent.impulse, 0, 0, -2);
        stepWorld(w, intent, DT);
      }
      return w;
    };
    const a = script(createWorld(frame(), 42));
    const b = script(createWorld(frame(), 42));
    expect(a.disc).toEqual(b.disc);
    expect(a.hoop).toEqual(b.hoop);
    expect(a.rng.state).toBe(b.rng.state);
  });

  it('settles the disc on a pulled target', () => {
    const w = createWorld(frame(), 1);
    const intent = createIntent();
    intent.stiffness = 40;
    intent.dampingRatio = 1;
    set(intent.target, 0.3, 1.1, -1.2);
    run(w, intent, 2);
    expect(distance(w.disc.pos, intent.target)).toBeLessThan(0.01);
  });

  it('tracks a moving target without lag when told its velocity', () => {
    const w = createWorld(frame(), 1);
    const intent = createIntent();
    intent.stiffness = 140;
    intent.dampingRatio = 1;
    set(intent.target, -0.3, 1.05, -1);
    copy(w.disc.pos, intent.target);
    set(intent.targetVel, 0.3, 0, 0);
    for (let i = 0; i < 240; i++) {
      addScaled(intent.target, intent.target, intent.targetVel, DT);
      stepWorld(w, intent, DT);
    }
    // Within about one step of travel (2.5 mm); damping against absolute velocity
    // would trail by 2ζ/ω · v ≈ 5 cm here.
    expect(distance(w.disc.pos, intent.target)).toBeLessThan(0.005);
  });

  it('applies a throw exactly once', () => {
    const w = createWorld(frame(), 1);
    const intent = createIntent();
    set(w.disc.vel, 1, 0, 0);
    intent.throwBoost = 1.6;
    stepWorld(w, intent, DT);
    const afterThrow = length(w.disc.vel);
    expect(afterThrow).toBeGreaterThan(1.5);
    expect(intent.throwBoost).toBe(1);
    stepWorld(w, intent, DT);
    expect(length(w.disc.vel)).toBeLessThan(afterThrow);
    expect(w.events.filter((e) => e.type === 'throw')).toHaveLength(1);
  });

  it('never lets a hard throw leave the comfort volume by much', () => {
    const w = createWorld(frame(), 1);
    const intent = createIntent();
    set(w.disc.vel, 0, 0, -6);
    let furthest = 0;
    for (let i = 0; i < 600; i++) {
      stepWorld(w, intent, DT);
      furthest = Math.max(furthest, distance(w.disc.pos, w.frame.anchor));
    }
    expect(furthest).toBeLessThan(MAX_DIST + 0.45);
  });

  it('counts a clean pass through the hoop and moves the hoop', () => {
    const w = createWorld(frame(), 7);
    const { center, normal } = w.hoop;
    const before = copy(vec3(), center);
    addScaled(w.disc.pos, center, normal, 0.05);
    const intent = createIntent();
    set(w.disc.vel, -normal.x * 2, -normal.y * 2, -normal.z * 2);
    run(w, intent, 0.1);
    expect(w.hoopsPassed).toBe(1);
    expect(w.events.some((e) => e.type === 'hoop')).toBe(true);
    expect(distance(w.hoop.center, before)).toBeGreaterThan(0.1);
  });

  it('draws a nearby disc down into the visible funnel mouth', () => {
    const w = createWorld(frame(), 7);
    const { center, normal } = w.hoop;
    addScaled(w.disc.pos, center, normal, 0.13);
    copy(w.disc.prevPos, w.disc.pos);
    set(w.disc.vel, 0, 0, 0);
    run(w, createIntent(), 0.8);
    expect(w.hoopsPassed).toBe(1);
  });

  it('rebounds from the rim instead of counting a near miss as a sink', () => {
    const w = createWorld(frame(), 7);
    const { center, normal, radius } = w.hoop;
    const radial = vec3(1 - normal.x * normal.x, -normal.x * normal.y, -normal.x * normal.z);
    normalize(radial, radial);
    addScaled(w.disc.pos, center, radial, radius + 0.015);
    addScaled(w.disc.pos, w.disc.pos, normal, 0.04);
    copy(w.disc.prevPos, w.disc.pos);
    set(w.disc.vel, -normal.x * 2, -normal.y * 2, -normal.z * 2);
    run(w, createIntent(), 0.1);
    expect(w.hoopsPassed).toBe(0);
    expect(w.events.some((e) => e.type === 'clip')).toBe(true);
    expect(dot(w.disc.vel, normal)).toBeGreaterThan(0);
    expect(distance(w.disc.pos, center)).toBeGreaterThan(radius);
  });

  it('holds the new disc until the capture spiral finishes', () => {
    const w = createWorld(frame(), 7);
    addScaled(w.disc.pos, w.hoop.center, w.hoop.normal, 0.05);
    copy(w.disc.prevPos, w.disc.pos);
    set(w.disc.vel, -w.hoop.normal.x * 2, -w.hoop.normal.y * 2, -w.hoop.normal.z * 2);
    run(w, createIntent(), 0.1);
    expect(w.hoopsPassed).toBe(1);
    expect(w.captureRemaining).toBeGreaterThan(0);
    const captured = copy(vec3(), w.disc.pos);
    run(w, createIntent(), 0.4);
    expect(w.disc.pos).toEqual(captured);
    run(w, createIntent(), 0.5);
    expect(w.captureRemaining).toBe(0);
    expect(distance(w.disc.pos, captured)).toBeGreaterThan(0.1);
  });
});
