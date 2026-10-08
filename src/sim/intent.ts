import { type Vec3, set, vec3 } from './vec3';

export type ControlMode = 'mind' | 'hands' | 'controller' | 'pointer' | 'none';

/**
 * The one internal input. Every control mode (head, hands, controllers, mouse/touch)
 * produces this, so the simulation never knows which device is in use. It is plain
 * data, which also makes it the unit we record for replays.
 */
export interface Intent {
  mode: ControlMode;
  /** Where the disc is being pulled, world meters. */
  target: Vec3;
  /** How fast `target` itself is moving; the spring damps relative to it. */
  targetVel: Vec3;
  /** Spring stiffness, 1/s². Zero means no pull: the disc flies free. */
  stiffness: number;
  /** Damping ratio: 1 settles without overshoot, below 1 is floatier. */
  dampingRatio: number;
  /** One-shot velocity change (m/s), e.g. a palm push. Consumed by the next step. */
  impulse: Vec3;
  /** One-shot velocity multiplier on release (a throw). 1 = none. Consumed by the next step. */
  throwBoost: number;
  /** One-shot launch velocity (m/s) of a flick throw; the disc then flies an arc. Zero = none. */
  toss: Vec3;
}

export function createIntent(): Intent {
  return {
    mode: 'none',
    target: vec3(),
    targetVel: vec3(),
    stiffness: 0,
    dampingRatio: 1,
    impulse: vec3(),
    throwBoost: 1,
    toss: vec3(),
  };
}

/** Clears the continuous pull, keeping any one-shots not yet consumed. */
export function releasePull(intent: Intent): void {
  intent.stiffness = 0;
  set(intent.targetVel, 0, 0, 0);
}
