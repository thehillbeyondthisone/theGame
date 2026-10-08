import { type PlayFrame, clampToComfort, MAX_DIST, pointAhead } from './comfort';
import { LEVEL_SHAPES, type Hoop, createHoop, crossHoop, placeHoop, stepHoop } from './hoop';
import type { Intent } from './intent';
import { type Rng, createRng } from './rng';
import { type PlayMode, type ScoreRun, createScoreRun, scoreClip, scoreMiss, scoreSink, tickScoreRun } from './run';
import { assistToss } from './toss';
import { tuning } from './tuning';
import {
  type Vec3,
  add,
  addScaled,
  clampLength,
  copy,
  distance,
  dot,
  length,
  scale,
  set,
  sub,
  vec3,
} from './vec3';

export interface Disc {
  pos: Vec3;
  vel: Vec3;
  /** Position before the latest step, for render interpolation and sweep tests. */
  prevPos: Vec3;
  /** Spin angle about the disc's axis (radians) and its rate (rad/s). */
  spin: number;
  spinRate: number;
}

export type SimEvent =
  | { type: 'hoop'; streak: number; points: number; perfect: boolean; at: Vec3; normal: Vec3; radius: number }
  | { type: 'clip'; at: Vec3; speed: number }
  | { type: 'throw'; speed: number }
  | { type: 'miss'; clipped: boolean }
  | { type: 'push'; speed: number };

export interface World {
  step: number;
  time: number;
  frame: PlayFrame;
  disc: Disc;
  /** Where a fresh disc waits. */
  rest: Vec3;
  /** True from a flick throw until the disc is captured or missed. */
  flying: boolean;
  flightTime: number;
  hoop: Hoop;
  rng: Rng;
  hoopsPassed: number;
  streak: number;
  level: number;
  run: number;
  captureRemaining: number;
  rimFreeUntil: number;
  scoreRun: ScoreRun;
  /** Filled by stepWorld; the caller drains it every frame. */
  events: SimEvent[];
}

const TAU = 6.283185307179586;

export function createWorld(frame: PlayFrame, seed: number, mode: PlayMode = 'free', rest?: Vec3): World {
  const start = rest ?? pointAhead(vec3(), frame, 1.0, 0.15);
  const world: World = {
    step: 0,
    time: 0,
    frame,
    disc: { pos: copy(vec3(), start), vel: vec3(), prevPos: copy(vec3(), start), spin: 0, spinRate: 0 },
    rest: copy(vec3(), start),
    flying: false,
    flightTime: 0,
    hoop: createHoop(),
    rng: createRng(seed),
    hoopsPassed: 0,
    streak: 0,
    level: 1,
    run: 1,
    captureRemaining: 0,
    rimFreeUntil: -Infinity,
    scoreRun: createScoreRun(mode),
    events: [],
  };
  placeHoop(world.hoop, frame, world.rng, start);
  return world;
}

const acc = vec3();
const tmp = vec3();
const comfy = vec3();
const mouthOffset = vec3();
const mouthRadial = vec3();

/**
 * Advances the world by one fixed step. Deterministic: the same world, intents and dt
 * always give the same result. Consumes the intent's one-shot fields.
 */
export function stepWorld(world: World, intent: Intent, dt: number): void {
  tickScoreRun(world.scoreRun, dt);
  if (world.scoreRun.phase !== 'playing') return;
  const { disc } = world;
  const t = tuning.disc;
  copy(disc.prevPos, disc.pos);
  stepHoop(world.hoop, world.frame, world.step);

  // Let the spiral play to completion before the next disc reappears.
  if (world.captureRemaining > 0) {
    world.captureRemaining = Math.max(0, world.captureRemaining - dt);
    if (world.captureRemaining === 0) resetDisc(world);
    world.step++;
    world.time = world.step * dt;
    return;
  }

  // One-shots: a throw scales the current velocity, a push adds to it.
  if (intent.throwBoost !== 1) {
    scale(disc.vel, disc.vel, intent.throwBoost);
    clampLength(disc.vel, disc.vel, t.maxThrowSpeed);
    world.events.push({ type: 'throw', speed: length(disc.vel) });
    intent.throwBoost = 1;
  }
  if (intent.toss.x !== 0 || intent.toss.y !== 0 || intent.toss.z !== 0) {
    if (!world.flying) {
      // Wherever the disc was let go, its arc soon rejoins the one from its resting place,
      // so a throw depends on the flick and not on how far the finger carried it.
      addScaled(disc.vel, intent.toss, sub(tmp, disc.pos, world.rest), -1 / tuning.toss.rejoin);
      assistToss(disc.vel, disc.vel, world, dt);
      world.flying = true;
      world.flightTime = 0;
      // Every throw is a fresh attempt.
      world.scoreRun.shotClipped = false;
      world.events.push({ type: 'throw', speed: length(disc.vel) });
    }
    set(intent.toss, 0, 0, 0);
  }
  if (intent.impulse.x !== 0 || intent.impulse.y !== 0 || intent.impulse.z !== 0) {
    add(disc.vel, disc.vel, intent.impulse);
    world.events.push({ type: 'push', speed: length(intent.impulse) });
    set(intent.impulse, 0, 0, 0);
  }

  // A thrown disc flies an arc and can't be steered. Otherwise,
  // pull: a damped spring toward the target, damping relative to the target's motion.
  if (world.flying) {
    set(acc, 0, -tuning.toss.gravity, 0);
  } else if (intent.stiffness > 0) {
    const k = intent.stiffness * (world.time < world.rimFreeUntil ? 0.25 : 1);
    const c = 2 * intent.dampingRatio * Math.sqrt(k);
    scale(acc, sub(tmp, intent.target, disc.pos), k);
    addScaled(acc, acc, sub(tmp, intent.targetVel, disc.vel), c);
  } else {
    scale(acc, disc.vel, -t.drag);
  }

  // A disc just above the flared mouth is drawn inward and down. This makes
  // approaching the visible bowl lead to the same crossing as its collision plane.
  sub(mouthOffset, disc.pos, world.hoop.center);
  const above = dot(mouthOffset, world.hoop.normal);
  if (above > 0 && above < 0.24) {
    addScaled(mouthRadial, mouthOffset, world.hoop.normal, -above);
    const radial = length(mouthRadial);
    if (radial < world.hoop.radius + 0.08) {
      const strength = 1 - radial / (world.hoop.radius + 0.08);
      addScaled(acc, acc, mouthRadial, -90 * strength);
      addScaled(acc, acc, world.hoop.normal, -9 * strength);
    }
  }

  // Comfort volume: a soft spring back inside, with extra damping while outside.
  clampToComfort(comfy, disc.pos, world.frame);
  const outside = world.flying ? 0 : distance(comfy, disc.pos);
  if (outside > 1e-6) {
    const kb = t.boundaryStiffness;
    addScaled(acc, acc, sub(tmp, comfy, disc.pos), kb);
    addScaled(acc, acc, disc.vel, -Math.sqrt(kb));
  }

  // Semi-implicit Euler.
  addScaled(disc.vel, disc.vel, acc, dt);
  clampLength(disc.vel, disc.vel, t.maxSpeed);
  addScaled(disc.pos, disc.pos, disc.vel, dt);

  // Hard failsafe: nothing ever ends up far outside the comfort volume.
  // A thrown disc may leave it; that throw ends as a miss below.
  if (!world.flying && (outside > 0.4 || distance(disc.pos, world.frame.anchor) > MAX_DIST + 0.4)) {
    clampToComfort(disc.pos, disc.pos, world.frame);
    scale(disc.vel, disc.vel, 0.3);
  }

  // Visual spin eases toward idle spin plus a little per unit of speed.
  const targetSpin = TAU * (t.idleSpin + length(disc.vel) * 0.8);
  disc.spinRate += (targetSpin - disc.spinRate) * Math.min(1, dt * 3);
  disc.spin = (disc.spin + disc.spinRate * dt) % TAU;

  // Crossing the funnel's mouth plane.
  const crossing = crossHoop(world.hoop, disc.prevPos, disc.pos, t.radius);
  if (crossing === 'pass') {
    world.hoopsPassed++;
    world.streak++;
    // Grade the swept plane intersection, rather than a frame-dependent endpoint.
    const sa = dot(sub(tmp, disc.prevPos, world.hoop.center), world.hoop.normal);
    const sb = dot(sub(tmp, disc.pos, world.hoop.center), world.hoop.normal);
    addScaled(tmp, disc.prevPos, sub(mouthOffset, disc.pos, disc.prevPos), sa / (sa - sb));
    const reward = scoreSink(world.scoreRun, world.streak, distance(tmp, world.hoop.center) <= world.hoop.radius * 0.35);
    world.events.push({ type: 'hoop', streak: world.streak, ...reward, at: copy(vec3(), world.hoop.center), normal: copy(vec3(), world.hoop.normal), radius: world.hoop.radius });
    world.captureRemaining = 0.82;
    world.level = (world.hoopsPassed % LEVEL_SHAPES.length) + 1;
    world.run = Math.floor(world.hoopsPassed / LEVEL_SHAPES.length) + 1;
    placeHoop(world.hoop, world.frame, world.rng, disc.pos, world.level);
  } else if (crossing === 'clip') {
    const impact = Math.max(0, -dot(disc.vel, world.hoop.normal));
    const contact = copy(vec3(), disc.pos);
    copy(disc.pos, disc.prevPos);
    const aboveRim = dot(sub(mouthOffset, disc.pos, world.hoop.center), world.hoop.normal);
    addScaled(disc.pos, disc.pos, world.hoop.normal, Math.max(0, t.radius * 0.75 - aboveRim));
    const vn = dot(disc.vel, world.hoop.normal);
    if (vn < 0) addScaled(disc.vel, disc.vel, world.hoop.normal, -(1 + 0.55) * vn);
    sub(mouthOffset, disc.pos, world.hoop.center);
    addScaled(mouthRadial, mouthOffset, world.hoop.normal, -dot(mouthOffset, world.hoop.normal));
    const radial = length(mouthRadial);
    if (radial > 1e-6) addScaled(disc.vel, disc.vel, mouthRadial, Math.max(0.15, impact * 0.3) / radial);
    world.rimFreeUntil = world.time + 0.2;
    world.streak = 0;
    scoreClip(world.scoreRun);
    world.events.push({ type: 'clip', at: contact, speed: impact });
  }

  if (world.flying && world.captureRemaining === 0) {
    const tt = tuning.toss;
    world.flightTime += dt;
    const anchor = world.frame.anchor;
    if (disc.pos.y < anchor.y - tt.floor || distance(disc.pos, anchor) > tt.range || world.flightTime > tt.maxFlight) {
      world.events.push({ type: 'miss', clipped: world.scoreRun.shotClipped });
      world.streak = 0;
      scoreMiss(world.scoreRun);
      resetDisc(world);
    }
  }

  world.step++;
  world.time = world.step * dt;
}

/** Puts the disc back in front of the player, at rest. */
export function resetDisc(world: World): void {
  const { disc } = world;
  world.captureRemaining = 0;
  world.flying = false;
  world.flightTime = 0;
  copy(disc.pos, world.rest);
  copy(disc.prevPos, disc.pos);
  set(disc.vel, 0, 0, 0);
}
