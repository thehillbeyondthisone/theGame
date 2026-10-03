import { describe, expect, it } from 'vitest';
import { makePlayFrame } from '../sim/comfort';
import { addScaled, distance, normalize, sub, vec3 } from '../sim/vec3';
import { createIntent } from '../sim/intent';
import { tuning } from '../sim/tuning';
import { createWorld, stepWorld } from '../sim/world';
import { makeInput } from '../test/fixtures';
import { MindControl } from './mind';

const frame = makePlayFrame(vec3(0, 1.2, 0), vec3(0, 0, -1));
const world = () => createWorld(frame, 7);

describe('mind mode', () => {
  it('builds Focus while the head holds steady and loses it on a fast turn', () => {
    const mind = new MindControl();
    const input = makeInput();
    const w = world();
    for (let i = 0; i < 135; i++) mind.update(input, w);
    expect(mind.focus).toBe(1);

    // Turn at ~180°/s for half a second.
    for (let i = 0; i < 45; i++) {
      const a = (i + 1) * (Math.PI / 180) * 2;
      input.head!.forward.x = Math.sin(a);
      input.head!.forward.z = -Math.cos(a);
      mind.update(input, w);
    }
    expect(mind.focus).toBeLessThan(0.4);
  });

  it('pulls toward where you look', () => {
    const mind = new MindControl();
    const input = makeInput(vec3(0, 1.2, 0), vec3(0.5, 0, -1));
    const w = world();
    for (let i = 0; i < 90; i++) mind.update(input, w);
    expect(mind.target.x).toBeGreaterThan(0.3);
    expect(mind.target.z).toBeLessThan(-0.6);
  });

  it('leaning in pushes the pull point further; leaning back brings it closer', () => {
    const mind = new MindControl();
    const input = makeInput();
    const w = world();
    for (let i = 0; i < 30; i++) mind.update(input, w);
    const start = mind.depth;
    input.head!.pos.z = -0.1; // lean 10 cm toward the play area
    for (let i = 0; i < 30; i++) mind.update(input, w);
    const leaned = mind.depth;
    expect(leaned).toBeGreaterThan(start + 0.2);
    input.head!.pos.z = 0.15; // sit back
    for (let i = 0; i < 20; i++) mind.update(input, w);
    expect(mind.depth).toBeLessThan(leaned - 0.2);
  });

  it('moves through a looked-at funnel and captures without leaning or a controller', () => {
    const w = world();
    const mind = new MindControl();
    const input = makeInput();
    input.dt = tuning.sim.step;
    const intent = createIntent();
    // About 2.3° off-center, to reflect a plausible sustained head aim.
    addScaled(input.head!.forward, sub(vec3(), w.hoop.center, input.head!.pos), w.frame.right,
      distance(w.hoop.center, input.head!.pos) * 0.04);
    normalize(input.head!.forward, input.head!.forward);
    for (let i = 0; i < 480 && w.hoopsPassed === 0; i++) {
      mind.update(input, w);
      mind.drive(intent, 1);
      stepWorld(w, intent, tuning.sim.step);
    }
    expect(mind.depth).toBeGreaterThan(1.2);
    expect(w.hoopsPassed).toBe(1);
  });

  it('does not advance depth when gaze is away from the funnel', () => {
    const mind = new MindControl();
    const input = makeInput(vec3(0, 1.2, 0), vec3(0, 1, 0));
    const w = world();
    for (let i = 0; i < 120; i++) mind.update(input, w);
    expect(mind.depth).toBeCloseTo(tuning.mind.startDepth, 3);
  });

  it('can progress through the ten rough levels with gaze alone', () => {
    for (const seed of [1, 7, 42]) {
      const w = createWorld(frame, seed);
      const mind = new MindControl();
      const input = makeInput();
      input.dt = tuning.sim.step;
      const intent = createIntent();
      for (let i = 0; i < 12000 && w.hoopsPassed < 10; i++) {
        normalize(input.head!.forward, sub(input.head!.forward, w.hoop.center, input.head!.pos));
        mind.update(input, w);
        mind.drive(intent, 1);
        stepWorld(w, intent, tuning.sim.step);
      }
      expect(w.hoopsPassed, `seed ${seed}`).toBe(10);
      expect(w.run).toBe(2);
      expect(w.level).toBe(1);
    }
  });
});
