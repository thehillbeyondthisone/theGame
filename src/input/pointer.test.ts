import { PerspectiveCamera, Raycaster, Vector2, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { makePlayFrame, pointAhead, screenLimits } from '../sim/comfort';
import { createIntent, releasePull } from '../sim/intent';
import { tuning } from '../sim/tuning';
import { copy, distance, normalize, sub, vec3 } from '../sim/vec3';
import { type SimEvent, createWorld, stepWorld } from '../sim/world';
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
  it('keeps mouse depth manual even when aimed at the funnel', () => {
    const { world, input, control, intent } = setup();
    for (let i = 0; i < 120; i++) control.update(input, world, intent);
    expect(control.depth).toBeCloseTo(distance(frame.anchor, world.disc.pos), 6);
    input.pointer.wheel = 2;
    control.update(input, world, intent);
    expect(control.depth).toBeCloseTo(distance(frame.anchor, world.disc.pos) + 2 * tuning.pointer.wheelStep, 6);
  });

  it('moves depth with Pull and the wheel', () => {
    const { world, input, control, intent } = setup();
    control.update(input, world, intent);
    const start = control.depth;
    input.pointer.depthRate = -tuning.pointer.depthSpeed;
    for (let i = 0; i < 30; i++) control.update(input, world, intent);
    expect(control.depth).toBeCloseTo(start - 0.25, 6);
    input.pointer.depthRate = 0;
    input.pointer.wheel = -1;
    const beforeWheel = control.depth;
    control.update(input, world, intent);
    expect(control.depth).toBeCloseTo(beforeWheel - tuning.pointer.wheelStep, 6);
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

/** A phone screen, the camera the app uses for it, and a finger to flick with. */
function phone(width: number, height: number, seed: number, fps: number) {
  const camera = new PerspectiveCamera(width >= height ? 60 : Math.min(100, 2 * Math.atan(Math.tan(25 * Math.PI / 180) / (width / height)) * 180 / Math.PI), width / height);
  camera.position.set(0, 1.2, 0);
  camera.lookAt(0, 1.2 - Math.tan(10 * Math.PI / 180), -1);
  camera.updateMatrixWorld();
  const halfH = Math.atan(Math.tan(camera.fov * Math.PI / 360) * camera.aspect) * 180 / Math.PI;
  const view = makePlayFrame(vec3(0, 1.2, 0), vec3(0, 0, -1), screenLimits(halfH - 6, camera.fov / 2 - 16, camera.fov / 2 + 4));
  const world = createWorld(view, seed, 'free', pointAhead(vec3(), view, tuning.toss.restAhead, tuning.toss.restDrop));
  const control = new PointerControl();
  const input = createInputFrame();
  const intent = createIntent();
  const raycaster = new Raycaster();
  const events: SimEvent[] = [];
  input.dt = 1 / fps;
  input.pointer.toss = true;
  let accumulator = 0;

  /** Screen position in heights from the center, as the app reports it. */
  const onScreen = (p: { x: number; y: number; z: number }) => {
    const ndc = new Vector3(p.x, p.y, p.z).project(camera);
    return { x: ndc.x * camera.aspect / 2, y: ndc.y / 2 };
  };
  const frameStep = (finger: { x: number; y: number } | null) => {
    input.time += input.dt;
    input.pointer.down = finger !== null;
    if (finger) {
      input.pointer.x = finger.x;
      input.pointer.y = finger.y;
      raycaster.setFromCamera(new Vector2(finger.x * 2 / camera.aspect, finger.y * 2), camera);
      copy(input.pointer.rayOrigin, raycaster.ray.origin);
      copy(input.pointer.rayDir, raycaster.ray.direction);
    }
    releasePull(intent);
    if (control.update(input, world, intent)) control.drive(intent);
    accumulator += input.dt;
    while (accumulator >= tuning.sim.step) {
      stepWorld(world, intent, tuning.sim.step);
      accumulator -= tuning.sim.step;
    }
    events.push(...world.events);
    world.events.length = 0;
  };
  /** Rest a finger on the disc, sweep it at a steady speed (screen heights/s), then lift. */
  const flick = (vx: number, vy: number, seconds = 0.12) => {
    const start = onScreen(world.disc.pos);
    for (let i = 0; i < fps * 0.2; i++) frameStep(start);
    for (let t = input.dt; t <= seconds + 1e-9; t += input.dt) frameStep({ x: start.x + vx * t, y: start.y + vy * t });
    frameStep(null);
  };
  const wait = (seconds: number) => {
    for (let i = 0; i < fps * seconds; i++) frameStep(null);
  };
  return { world, control, intent, events, onScreen, frameStep, flick, wait };
}

describe('flick throws on a touch screen', () => {
  it('sinks a flick aimed at the cone, in portrait and landscape at 30 and 60 fps', () => {
    for (const [width, height] of [[360, 640], [390, 844], [844, 390]] as const) {
      for (const seed of [1, 7, 42]) for (const fps of [30, 60]) {
        const { world, events, onScreen, flick, wait } = phone(width, height, seed, fps);
        const disc = onScreen(world.disc.pos);
        const mouth = onScreen(world.hoop.center);
        const lean = (mouth.x - disc.x) / (mouth.y - disc.y);
        flick(2.2 * lean / Math.hypot(1, lean), 2.2 / Math.hypot(1, lean));
        expect(world.flying, 'the disc leaves the finger').toBe(true);
        wait(1.2);
        expect(world.hoopsPassed, `${width}x${height}, seed ${seed}, ${fps}fps`).toBe(1);
        expect(events.filter((e) => e.type === 'miss')).toHaveLength(0);
      }
    }
  });

  it('flies an arc: up and away first, then down', () => {
    const { world, flick, frameStep } = phone(390, 844, 7, 60);
    const start = copy(vec3(), world.disc.pos);
    flick(0, 2.2);
    let top = start.y;
    for (let i = 0; i < 20 && world.flying; i++) {
      frameStep(null);
      top = Math.max(top, world.disc.pos.y);
    }
    expect(top).toBeGreaterThan(start.y + 0.25);
    expect(world.disc.pos.z).toBeLessThan(start.z - 0.3);
    expect(world.disc.vel.y).toBeLessThan(0.8 * tuning.toss.loft);
  });

  it('breaks the streak on a miss and brings a fresh disc back to the same spot', () => {
    const { world, events, flick, wait } = phone(390, 844, 7, 60);
    world.streak = 4;
    world.scoreRun.multiplier = 2;
    flick(-3.2, 3.2);
    wait(2);
    expect(events.filter((e) => e.type === 'miss')).toHaveLength(1);
    expect(world).toMatchObject({ hoopsPassed: 0, streak: 0, flying: false });
    expect(world.scoreRun.multiplier).toBe(1);
    expect(distance(world.disc.pos, world.rest)).toBeLessThan(1e-3);
  });

  it('follows the finger while held, and settles back when let go without a flick', () => {
    const { world, onScreen, frameStep, wait } = phone(390, 844, 7, 60);
    const start = onScreen(world.disc.pos);
    for (let i = 0; i < 30; i++) frameStep({ x: start.x + 0.05, y: start.y + 0.05 });
    const held = onScreen(world.disc.pos);
    expect(Math.hypot(held.x - start.x - 0.05, held.y - start.y - 0.05)).toBeLessThan(0.01);
    wait(1);
    expect(world.flying).toBe(false);
    expect(distance(world.disc.pos, world.rest)).toBeLessThan(0.01);
  });

  it('ignores a downward flick, a cancelled one, and touches while the disc is in the air', () => {
    const down = phone(390, 844, 7, 60);
    down.flick(0, -2.5);
    expect(down.world.flying).toBe(false);

    const cancelled = phone(390, 844, 7, 60);
    const start = cancelled.onScreen(cancelled.world.disc.pos);
    for (let i = 1; i <= 8; i++) cancelled.frameStep({ x: start.x, y: start.y + i * 0.04 });
    cancelled.control.reset();
    cancelled.frameStep(null);
    expect(cancelled.world.flying).toBe(false);

    const air = phone(390, 844, 7, 60);
    air.flick(0, 2.2);
    const velocity = copy(vec3(), air.world.disc.vel);
    air.frameStep({ x: 0, y: 0 });
    expect(air.control.held).toBe(false);
    expect(air.world.disc.vel.x).toBe(velocity.x);
    expect(air.world.disc.vel.z).toBe(velocity.z);
  });
});
