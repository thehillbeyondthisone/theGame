import { describe, expect, it } from 'vitest';
import { makePlayFrame } from '../sim/comfort';
import { createIntent } from '../sim/intent';
import { tuning } from '../sim/tuning';
import { vec3 } from '../sim/vec3';
import { createWorld } from '../sim/world';
import { makeHand, makeInput, setHand } from '../test/fixtures';
import { Telekinesis } from './telekinesis';

function setup() {
  const world = createWorld(makePlayFrame(vec3(0, 1.2, 0), vec3(0, 0, -1)), 1);
  return { world, intent: createIntent(), tk: new Telekinesis(), input: makeInput() };
}

// Right hand raised in front, palm facing forward: the "stop" pose.
const wrist = vec3(0.2, 1.05, -0.45);

describe('telekinesis', () => {
  it('open palm pulls, pinch holds, letting go throws, and it re-arms after the hand closes', () => {
    const { world, intent, tk, input } = setup();
    const frameWith = (opts: { curl?: number; pinch?: boolean }) => {
      setHand(input, makeHand({ side: 'right', wrist, ...opts }));
      return tk.update(input, world, intent);
    };

    expect(frameWith({})).toBe(true);
    expect(tk.active?.grip).toBe('open');
    tk.drive(intent);
    expect(intent.stiffness).toBe(tuning.hands.openStiffness);

    expect(frameWith({ pinch: true })).toBe(true);
    expect(tk.active?.grip).toBe('pinch');
    tk.drive(intent);
    expect(intent.stiffness).toBe(tuning.hands.pinchStiffness);

    // Release the pinch with the hand still open: a throw, then no pull.
    expect(frameWith({})).toBe(false);
    expect(intent.throwBoost).toBe(tuning.hands.throwBoost);
    expect(frameWith({})).toBe(false);

    // Closing the hand re-arms it; opening again pulls.
    expect(frameWith({ curl: 1 })).toBe(false);
    expect(frameWith({})).toBe(true);
    expect(tk.active?.grip).toBe('open');
  });

  it('ignores hands resting low or palm-down', () => {
    const { world, intent, tk, input } = setup();
    setHand(input, makeHand({ side: 'right', wrist: vec3(0.2, 0.5, -0.3) }));
    expect(tk.update(input, world, intent)).toBe(false);
    setHand(input, makeHand({ side: 'right', wrist, fingers: vec3(0, 0, -1), facing: vec3(0, -1, 0) }));
    expect(tk.update(input, world, intent)).toBe(false);
  });

  it('a quick shove toward the disc pushes it', () => {
    const { world, intent, tk, input } = setup();
    const w = vec3(wrist.x, wrist.y, wrist.z);
    for (let i = 0; i < 20; i++) {
      w.z -= 2 * input.dt; // palm moving forward at 2 m/s
      setHand(input, makeHand({ side: 'right', wrist: w }));
      tk.update(input, world, intent);
      if (intent.impulse.z !== 0) break;
    }
    expect(intent.impulse.z).toBeLessThan(-1);
  });

  it('reaching further sends the pull point further away', () => {
    const near = setup();
    setHand(near.input, makeHand({ side: 'right', wrist: vec3(0.2, 1.05, -0.2) }));
    near.tk.update(near.input, near.world, near.intent);
    const far = setup();
    setHand(far.input, makeHand({ side: 'right', wrist: vec3(0.2, 1.05, -0.5) }));
    far.tk.update(far.input, far.world, far.intent);
    expect(far.tk.right.target.z).toBeLessThan(near.tk.right.target.z - 0.5);
  });
});
