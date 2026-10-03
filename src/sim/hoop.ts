import { type PlayFrame, clampToComfort, toWorld } from './comfort';
import { type Rng, range } from './rng';
import { tuning } from './tuning';
import { type Vec3, addScaled, distance, dot, normalize, set, sub, vec3 } from './vec3';

/**
 * The funnel's mouth uses this plane for its capture opening. The simulation
 * still models a clean plane crossing while the view gives that opening depth.
 */
export interface Hoop {
  center: Vec3;
  home: Vec3;
  /** Unit normal of the ring's plane. */
  normal: Vec3;
  radius: number;
  sway: number;
  swayPeriod: number;
}

export type HoopCrossing = 'pass' | 'clip' | null;

export function createHoop(): Hoop {
  return { center: vec3(), home: vec3(), normal: vec3(0, 1, 0), radius: tuning.hoop.radius, sway: 0, swayPeriod: 1 };
}

const seg = vec3();
const hit = vec3();
const off = vec3();

/**
 * Checks whether a disc moving from `a` to `b` this step crossed the hoop's plane.
 * 'pass' means it went cleanly through; 'clip' means it crossed the plane touching the ring.
 */
export function crossHoop(hoop: Hoop, a: Vec3, b: Vec3, discRadius: number): HoopCrossing {
  const sa = dot(sub(off, a, hoop.center), hoop.normal);
  const sb = dot(sub(off, b, hoop.center), hoop.normal);
  // Funnel mouths accept a disc from their open, visible side only.
  if (sa <= 0 || sb >= 0) return null;
  const t = sa / (sa - sb);
  addScaled(hit, a, sub(seg, b, a), t);
  const r = distance(hit, hoop.center);
  if (r <= hoop.radius - discRadius * 0.5) return 'pass';
  if (r <= hoop.radius + discRadius) return 'clip';
  return null;
}

const local = vec3();
const toAnchor = vec3();

interface LevelShape {
  radius: number;
  side: number;
  near: number;
  far: number;
  sway: number;
  swayPeriod: number;
}

/** Ten quick spatial variations, repeated as runs until fuller level mechanics arrive. */
export const LEVEL_SHAPES: readonly LevelShape[] = [
  { radius: 0.15, side: 0.27, near: 1.38, far: 1.55, sway: 0, swayPeriod: 1 },
  { radius: 0.15, side: 0.34, near: 1.22, far: 1.52, sway: 0, swayPeriod: 1 },
  { radius: 0.145, side: 0.42, near: 1.35, far: 1.70, sway: 0, swayPeriod: 1 },
  { radius: 0.145, side: 0.38, near: 1.25, far: 1.62, sway: 0.05, swayPeriod: 480 },
  { radius: 0.14, side: 0.42, near: 1.30, far: 1.72, sway: 0.07, swayPeriod: 420 },
  { radius: 0.14, side: 0.40, near: 1.25, far: 1.75, sway: 0.08, swayPeriod: 390 },
  { radius: 0.135, side: 0.38, near: 1.38, far: 1.78, sway: 0.09, swayPeriod: 360 },
  { radius: 0.13, side: 0.38, near: 1.40, far: 1.80, sway: 0.10, swayPeriod: 330 },
  { radius: 0.125, side: 0.36, near: 1.42, far: 1.82, sway: 0.11, swayPeriod: 310 },
  { radius: 0.12, side: 0.34, near: 1.45, far: 1.85, sway: 0.12, swayPeriod: 300 },
];

/** Moves the funnel mouth to a new comfortable spot, at least `minGap` from `avoid`. */
export function placeHoop(hoop: Hoop, frame: PlayFrame, rng: Rng, avoid: Vec3, level = 1, minGap = 0.5): void {
  const shape = LEVEL_SHAPES[(level - 1) % LEVEL_SHAPES.length]!;
  hoop.radius = shape.radius;
  hoop.sway = shape.sway;
  hoop.swayPeriod = shape.swayPeriod;
  for (let attempt = 0; attempt < 8; attempt++) {
    set(local, range(rng, -shape.side, shape.side), range(rng, -0.20, 0.06), range(rng, shape.near, shape.far));
    toWorld(hoop.center, local, frame);
    clampToComfort(hoop.center, hoop.center, frame, 0.8, 1.9);
    if (distance(hoop.center, avoid) >= minGap) break;
  }
  set(hoop.home, hoop.center.x, hoop.center.y, hoop.center.z);
  // The episode's funnels stand on tapered tails; tilt the mouth slightly
  // toward the player so its dark interior stays legible from a seated view.
  sub(toAnchor, frame.anchor, hoop.center);
  toAnchor.y = 0;
  normalize(toAnchor, toAnchor);
  addScaled(hoop.normal, vec3(0, 1, 0), toAnchor, range(rng, 0.54, 0.74));
  addScaled(hoop.normal, hoop.normal, frame.right, range(rng, -0.16, 0.16));
  normalize(hoop.normal, hoop.normal);
}

/** Triangle-wave movement keeps levels deterministic and easy to lead by eye. */
export function stepHoop(hoop: Hoop, frame: PlayFrame, step: number): void {
  if (hoop.sway === 0) return;
  const phase = (step % hoop.swayPeriod) / hoop.swayPeriod;
  const triangle = phase < 0.5 ? -1 + 4 * phase : 3 - 4 * phase;
  addScaled(hoop.center, hoop.home, frame.right, hoop.sway * triangle);
}
