import { describe, expect, it } from 'vitest';
import { makePlayFrame, screenLimits } from '../sim/comfort';
import { createIntent, releasePull } from '../sim/intent';
import { tuning } from '../sim/tuning';
import { copy, distance, normalize, sub, vec3 } from '../sim/vec3';
import { createWorld, stepWorld } from '../sim/world';
import { createInputFrame } from './types';
import { PointerControl } from './pointer';

const frame = makePlayFrame(vec3(0, 1.2, 0), vec3(0, 0, -1), screenLimits(19, 25, 35));

function setup(seed = 7) {
  const world = createWorld(frame, seed);
  const input = createInputFrame();
  const control = new PointerControl();
  const intent = createIntent();
  input.dt = tuning.sim.step;
  input.pointer.down = true;
  copy(input.pointer.rayOrigin, frame.anchor);
  normalize(input.pointer.rayDir, sub(vec3(), world.hoop.center, frame.anchor));
  return { world, input, control, intent };
}

describe('screen pointer fallback', () => {
  it('makes accurate touch entries clean and perfect at 30, 60, and 90 fps', () => {
    for (const fps of [30, 60, 90]) {
      for (const seed of [1, 7, 42]) {
        const { world, input, control, intent } = setup(seed);
        input.dt = 1 / fps;
        input.pointer.touchAim = true;
        let accumulator = 0;
        for (let i = 0; i < fps * 20 && world.hoopsPassed < 3; i++) {
          normalize(input.pointer.rayDir, sub(input.pointer.rayDir, world.hoop.center, frame.anchor));
          releasePull(intent);
          control.update(input, world, intent);
          control.drive(intent);
          accumulator += input.dt;
          while (accumulator >= tuning.sim.step) {
            stepWorld(world, intent, tuning.sim.step);
            accumulator -= tuning.sim.step;
          }
        }
        expect(world.scoreRun, `seed ${seed} at ${fps}fps`).toMatchObject({ sinks: 3, perfects: 3, clips: 0, score: 800, multiplier: 2 });
      }
    }
  });

  it('captures and advances through ten levels using one-finger aim in a portrait play volume', () => {
    for (const seed of [1, 7, 42]) {
      const { world, input, control, intent } = setup(seed);
      input.pointer.touchAim = true;
      for (let i = 0; i < 12000 && world.hoopsPassed < 10; i++) {
        normalize(input.pointer.rayDir, sub(input.pointer.rayDir, world.hoop.center, frame.anchor));
        releasePull(intent);
        control.update(input, world, intent);
        control.drive(intent);
        stepWorld(world, intent, input.dt);
      }
      expect(world.hoopsPassed, `seed ${seed}`).toBe(10);
      expect(world.run).toBe(2);
    }
  });

  it('keeps mouse depth manual even when aimed at the funnel', () => {
    const { world, input, control, intent } = setup();
    for (let i = 0; i < 120; i++) control.update(input, world, intent);
    expect(control.depth).toBeCloseTo(distance(frame.anchor, world.disc.pos), 6);
    input.pointer.wheel = 2;
    control.update(input, world, intent);
    expect(control.depth).toBeCloseTo(distance(frame.anchor, world.disc.pos) + 2 * tuning.pointer.wheelStep, 6);
  });

  it('does not advance touch depth away from the funnel', () => {
    const { world, input, control, intent } = setup();
    input.pointer.touchAim = true;
    normalize(input.pointer.rayDir, vec3(-1, 0, -1));
    for (let i = 0; i < 120; i++) control.update(input, world, intent);
    expect(control.depth).toBeCloseTo(distance(frame.anchor, world.disc.pos), 6);
  });

  it('lets manual Pull and pinch override touch depth assistance', () => {
    const { world, input, control, intent } = setup();
    input.pointer.touchAim = true;
    control.update(input, world, intent);
    const start = control.depth;
    input.pointer.depthRate = -tuning.pointer.depthSpeed;
    for (let i = 0; i < 30; i++) control.update(input, world, intent);
    expect(control.depth).toBeCloseTo(start - 0.25, 6);
    input.pointer.depthRate = 0;
    input.pointer.wheel = -1;
    const beforePinch = control.depth;
    control.update(input, world, intent);
    expect(control.depth).toBeCloseTo(beforePinch - tuning.pointer.wheelStep, 6);
  });

  it('recovers a missed disc behind the mouth for another touch attempt', () => {
    const { world, input, control, intent } = setup();
    input.pointer.touchAim = true;
    copy(world.disc.pos, world.hoop.center);
    world.disc.pos.z -= 0.4;
    const start = distance(frame.anchor, world.disc.pos);
    for (let i = 0; i < 120; i++) control.update(input, world, intent);
    expect(control.depth).toBeLessThan(start - 0.3);
    expect(control.depth).toBeCloseTo(distance(frame.anchor, world.hoop.center) - tuning.mind.recoverDepth, 5);
  });

  it('releases cancelled input without turning it into a throw', () => {
    const { world, input, control, intent } = setup();
    control.update(input, world, intent);
    world.disc.vel.x = 2;
    control.reset();
    input.pointer.down = false;
    control.update(input, world, intent);
    expect(control.held).toBe(false);
    expect(intent.throwBoost).toBe(1);
    input.pointer.down = true;
    control.update(input, world, intent);
    control.drive(intent);
    expect(intent.targetVel).toEqual(vec3());
  });
});
