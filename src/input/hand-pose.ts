import { type Vec3, cross, lerp, normalize, set, sub, vec3 } from '../sim/vec3';
import type { Handedness } from './types';

/** Joint indices (see JOINT_NAMES). */
export const J = {
  wrist: 0,
  thumbTip: 4,
  indexMeta: 5,
  indexProx: 6,
  indexTip: 9,
  middleMeta: 10,
  middleProx: 11,
  middleTip: 14,
  ringTip: 19,
  pinkyMeta: 20,
  pinkyTip: 24,
} as const;

/** Fingertip joints, thumb first. */
export const TIPS = [4, 9, 14, 19, 24] as const;

export function joint(out: Vec3, joints: Float32Array, i: number): Vec3 {
  return set(out, joints[i * 3]!, joints[i * 3 + 1]!, joints[i * 3 + 2]!);
}

function jointDistance(joints: Float32Array, a: number, b: number): number {
  const dx = joints[a * 3]! - joints[b * 3]!;
  const dy = joints[a * 3 + 1]! - joints[b * 3 + 1]!;
  const dz = joints[a * 3 + 2]! - joints[b * 3 + 2]!;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

const a = vec3();
const b = vec3();
const w = vec3();

/** Roughly the middle of the palm: halfway from the wrist to the middle knuckle. */
export function palmCenter(out: Vec3, joints: Float32Array): Vec3 {
  joint(a, joints, J.wrist);
  joint(b, joints, J.middleProx);
  return lerp(out, a, b, 0.5);
}

/**
 * Unit vector pointing out of the palm (the way the palm faces), from joint
 * positions only, so it doesn't depend on each runtime's joint orientations.
 */
export function palmNormal(out: Vec3, joints: Float32Array, handedness: Handedness): Vec3 {
  joint(w, joints, J.wrist);
  sub(a, joint(a, joints, J.indexMeta), w);
  sub(b, joint(b, joints, J.pinkyMeta), w);
  // For a right hand, index × pinky points out of the palm; mirrored for the left.
  return normalize(out, handedness === 'right' ? cross(out, a, b) : cross(out, b, a));
}

/**
 * How straight one finger is: base-to-tip distance divided by total bone length.
 * 1 = fully straight, ~0.4 = curled into a fist. `finger` is 1 (index) to 4 (pinky).
 */
export function fingerStraightness(joints: Float32Array, finger: number): number {
  const base = 5 * finger; // metacarpal joint
  let bones = 0;
  for (let i = base; i < base + 4; i++) bones += jointDistance(joints, i, i + 1);
  return bones > 1e-6 ? jointDistance(joints, base, base + 4) / bones : 0;
}

/** Mean straightness of the four fingers. */
export function openness(joints: Float32Array): number {
  let sum = 0;
  for (let f = 1; f <= 4; f++) sum += fingerStraightness(joints, f);
  return sum / 4;
}

export function pinchDistance(joints: Float32Array): number {
  return jointDistance(joints, J.thumbTip, J.indexTip);
}
