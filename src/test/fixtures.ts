import { type Handedness, type InputFrame, createInputFrame } from '../input/types';
import { type Vec3, addScaled, copy, cross, normalize, scale, vec3 } from '../sim/vec3';

export interface HandOptions {
  side: Handedness;
  /** Wrist position. */
  wrist: Vec3;
  /** Direction the fingers point when straight. */
  fingers?: Vec3;
  /** Direction the palm faces. */
  facing?: Vec3;
  /** 0 = straight fingers, 1 = fist. */
  curl?: number;
  pinch?: boolean;
}

const SEGMENTS = [0.04, 0.025, 0.02, 0.018];
const SPREAD = [0.02, 0.005, -0.01, -0.025]; // index → pinky, toward the thumb side

/** Builds 25 joint positions (packed xyz) for a plausible synthetic hand. */
export function makeHand(o: HandOptions): Float32Array {
  const f = normalize(vec3(), o.fingers ?? vec3(0, 1, 0));
  const n = normalize(vec3(), o.facing ?? vec3(0, 0, -1));
  const thumbward = scale(vec3(), cross(vec3(), f, n), o.side === 'right' ? 1 : -1);
  const curl = o.curl ?? 0;
  const j = new Float32Array(75);
  const put = (i: number, p: Vec3) => j.set([p.x, p.y, p.z], i * 3);
  const p = vec3();
  const w = o.wrist;
  put(0, w);

  for (let k = 0; k < 4; k++) {
    const base = 5 + k * 5;
    put(base, addScaled(p, addScaled(p, w, f, 0.01), thumbward, SPREAD[k]! * 0.6));
    addScaled(p, addScaled(p, w, f, 0.07), thumbward, SPREAD[k]!);
    put(base + 1, p);
    for (let s = 0; s < 3; s++) {
      const angle = curl * (s + 1) * (Math.PI / 3);
      const d = addScaled(vec3(), scale(vec3(), f, Math.cos(angle)), n, Math.sin(angle));
      addScaled(p, p, d, SEGMENTS[s + 1]!);
      put(base + 2 + s, p);
    }
  }

  // Thumb: out to the side and up; the tip meets the index tip when pinching.
  put(1, addScaled(p, addScaled(p, w, thumbward, 0.02), f, 0.02));
  put(2, addScaled(p, addScaled(p, w, thumbward, 0.035), f, 0.04));
  put(3, addScaled(p, addScaled(p, w, thumbward, 0.05), f, 0.06));
  if (o.pinch) {
    const indexTip = vec3(j[27]!, j[28]!, j[29]!);
    put(4, addScaled(p, indexTip, n, 0.005));
  } else {
    put(4, addScaled(p, addScaled(p, w, thumbward, 0.06), f, 0.08));
  }
  return j;
}

/** An input frame with a tracked head at `pos`, looking along `forward`. */
export function makeInput(pos: Vec3 = vec3(0, 1.2, 0), forward: Vec3 = vec3(0, 0, -1), dt = 1 / 90): InputFrame {
  const input = createInputFrame();
  input.dt = dt;
  input.head = { pos: copy(vec3(), pos), quat: { x: 0, y: 0, z: 0, w: 1 }, forward: normalize(vec3(), forward) };
  return input;
}

export function setHand(input: InputFrame, joints: Float32Array, side: Handedness = 'right'): void {
  const hand = input[side].hand;
  hand.joints.set(joints);
  hand.tracked = true;
}

