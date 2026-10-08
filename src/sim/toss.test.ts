import { describe, expect, it } from 'vitest';
import { makePlayFrame, pointAhead } from './comfort';
import { placeHoop } from './hoop';
import { createIntent } from './intent';
import { assistToss, flickToToss } from './toss';
import { tuning } from './tuning';
import { copy, distance, length, vec3 } from './vec3';
import { type SimEvent, createWorld, stepWorld } from './world';

const DT = tuning.sim.step;
const frame = makePlayFrame(vec3(0, 1.2, 0), vec3(0, 0, -1));
const rest = () => pointAhead(vec3(), frame, tuning.toss.restAhead, tuning.toss.restDrop);

describe('flick throws', () => {
  it('throws harder flicks faster, and leans the way the flick leans', () => {
    const soft = vec3();
    const hard = vec3();
    const leaning = vec3();
    expect(flickToToss(soft, 0, 1.5, frame)).toBe(true);
    expect(flickToToss(hard, 0, 3, frame)).toBe(true);
    expect(flickToToss(leaning, 1, 2, frame)).toBe(true);
    expect(length(hard)).toBeGreaterThan(length(soft));
    expect(soft.x).toBeCloseTo(0, 9);
    expect(soft.y / -soft.z).toBeCloseTo(tuning.toss.loft, 9);
    expect(leaning.x).toBeGreaterThan(0);
    expect(length(vec3(0, 0, 0))).toBe(0);
  });

  it('does not throw for a slow, sideways or downward let-go', () => {
    const out = vec3();
    expect(flickToToss(out, 0, 0.4, frame)).toBe(false);
    expect(flickToToss(out, 3, 0.1, frame)).toBe(false);
    expect(flickToToss(out, 0, -3, frame)).toBe(false);
    expect(out).toEqual(vec3());
  });

  it('helps a near-miss in, leads a swaying mouth, and leaves a wild throw alone', () => {
    for (const level of [1, 6, 10]) {
      const world = createWorld(frame, 7, 'free', rest());
      placeHoop(world.hoop, frame, world.rng, world.rest, level);
      // The exact arc for a 0.7 s flight, found by aiming with full assistance.
      const { assist } = tuning.toss;
      tuning.toss.assist = 1;
      const exact = assistToss(vec3(), vec3(0, 2.2, -1.5), world, DT);
      tuning.toss.assist = assist;

      const intent = createIntent();
      copy(intent.toss, exact);
      intent.toss.x += 0.12;
      intent.toss.y += 0.12;
      const events: SimEvent[] = [];
      for (let i = 0; i < 300 && world.hoopsPassed === 0; i++) {
        stepWorld(world, intent, DT);
        events.push(...world.events);
        world.events.length = 0;
      }
      expect(world.hoopsPassed, `level ${level}`).toBe(1);
      expect(events.some((e) => e.type === 'clip')).toBe(false);
    }

    const world = createWorld(frame, 7, 'free', rest());
    const wild = vec3(2.5, 2, 0.5);
    expect(distance(assistToss(vec3(), wild, world, DT), wild)).toBe(0);
  });

  it('is deterministic', () => {
    const play = () => {
      const world = createWorld(frame, 42, 'free', rest());
      const intent = createIntent();
      for (let i = 0; i < 1200; i++) {
        if (i % 300 === 10) flickToToss(intent.toss, ((i / 300) % 3) * 0.3 - 0.3, 1.6 + (i / 300) * 0.3, frame);
        stepWorld(world, intent, DT);
      }
      return world;
    };
    const a = play();
    const b = play();
    expect(a.disc).toEqual(b.disc);
    expect(a.hoopsPassed).toBe(b.hoopsPassed);
  });
});
