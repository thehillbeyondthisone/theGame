import { type Vec3, addScaled, clamp, copy, cross, normalize, set, sub, vec3 } from './vec3';

/**
 * The comfort volume from the plan: everything stays 0.6–2.2 m away and within
 * ±55° of straight ahead (pitch −35° to +25°). These are safety limits, not tuning,
 * so they are constants. Trig values are precomputed so the simulation never calls
 * Math.sin/cos, whose last-bit rounding may differ between JavaScript engines.
 */
export const MIN_DIST = 0.6;
export const MAX_DIST = 2.2;

/** Angular limits of the play volume, as sines and cosines. */
export interface ComfortLimits {
  sinYaw: number;
  cosYaw: number;
  sinUp: number;
  sinDown: number;
}

/** The headset limits: ±55° yaw, +25° / −35° pitch. */
export const HEADSET_LIMITS: Readonly<ComfortLimits> = {
  sinYaw: 0.8191520442889918,
  cosYaw: 0.5735764363510462,
  sinUp: 0.42261826174069944,
  sinDown: 0.573576436351046,
};

/**
 * Tighter limits for flat screens, where the view is narrower than the headset
 * comfort cone. Never wider than HEADSET_LIMITS. Uses trig, so screen play isn't
 * bit-identical across engines; headset play (and anything scored) is.
 */
export function screenLimits(yawDeg: number, upDeg: number, downDeg: number): ComfortLimits {
  const r = Math.PI / 180;
  const yaw = Math.min(yawDeg, 55) * r;
  return {
    sinYaw: Math.sin(yaw),
    cosYaw: Math.cos(yaw),
    sinUp: Math.sin(Math.min(upDeg, 25) * r),
    sinDown: Math.sin(Math.min(downDeg, 35) * r),
  };
}

/** Where play happens: the head position at the start and the horizontal forward direction. */
export interface PlayFrame {
  anchor: Vec3;
  forward: Vec3;
  right: Vec3;
  limits: ComfortLimits;
}

const UP: Readonly<Vec3> = { x: 0, y: 1, z: 0 };

export function makePlayFrame(anchor: Vec3, forwardHint: Vec3, limits: ComfortLimits = HEADSET_LIMITS): PlayFrame {
  const forward = normalize(vec3(), set(vec3(), forwardHint.x, 0, forwardHint.z));
  if (forward.x === 0 && forward.z === 0) set(forward, 0, 0, -1);
  const right = cross(vec3(), forward, UP);
  return { anchor: copy(vec3(), anchor), forward, right, limits: { ...limits } };
}

const rel = vec3();

/** Converts a world point to play-frame coordinates: x = right, y = up, z = forward. */
export function toLocal(out: Vec3, p: Vec3, frame: PlayFrame): Vec3 {
  sub(rel, p, frame.anchor);
  return set(
    out,
    rel.x * frame.right.x + rel.z * frame.right.z,
    rel.y,
    rel.x * frame.forward.x + rel.z * frame.forward.z,
  );
}

/** Converts play-frame coordinates back to a world point. */
export function toWorld(out: Vec3, local: Vec3, frame: PlayFrame): Vec3 {
  const { anchor, right, forward } = frame;
  return set(
    out,
    anchor.x + right.x * local.x + forward.x * local.z,
    anchor.y + local.y,
    anchor.z + right.z * local.x + forward.z * local.z,
  );
}

const loc = vec3();

/**
 * Writes the closest comfortable point to `p` (approximately: it clamps distance,
 * pitch and yaw in turn). Points already inside come back unchanged.
 */
export function clampToComfort(out: Vec3, p: Vec3, frame: PlayFrame, minDist = MIN_DIST, maxDist = MAX_DIST): Vec3 {
  toLocal(loc, p, frame);
  const d = Math.sqrt(loc.x * loc.x + loc.y * loc.y + loc.z * loc.z);
  if (d < 1e-9) return toWorld(out, set(loc, 0, 0, minDist), frame);
  // Unit direction in play space.
  const dy = loc.y / d;
  let h = Math.sqrt(loc.x * loc.x + loc.z * loc.z);
  let hx = h < 1e-9 ? 0 : loc.x / h;
  let hz = h < 1e-9 ? 1 : loc.z / h;

  const lim = frame.limits;
  const cd = clamp(d, minDist, maxDist);
  const cy = clamp(dy, -lim.sinDown, lim.sinUp);
  // Yaw: the horizontal direction must be within the yaw limit of forward.
  const yawOk = hz >= lim.cosYaw;
  if (cd === d && cy === dy && yawOk) return copy(out, p);
  if (!yawOk) {
    hx = hx >= 0 ? lim.sinYaw : -lim.sinYaw;
    hz = lim.cosYaw;
  }
  h = Math.sqrt(1 - cy * cy);
  return toWorld(out, set(loc, hx * h * cd, cy * cd, hz * h * cd), frame);
}

const probe = vec3();

export function isComfortable(p: Vec3, frame: PlayFrame, tolerance = 1e-6): boolean {
  clampToComfort(probe, p, frame);
  const dx = probe.x - p.x;
  const dy = probe.y - p.y;
  const dz = probe.z - p.z;
  return dx * dx + dy * dy + dz * dz <= tolerance * tolerance;
}

/** A point `dist` meters ahead of the anchor, `drop` meters below it. */
export function pointAhead(out: Vec3, frame: PlayFrame, dist: number, drop = 0): Vec3 {
  addScaled(out, frame.anchor, frame.forward, dist);
  out.y -= drop;
  return out;
}
