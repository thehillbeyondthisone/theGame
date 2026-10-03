import { clampToComfort } from '../sim/comfort';
import type { Intent } from '../sim/intent';
import { tuning } from '../sim/tuning';
import {
  type Vec3,
  addScaled,
  clampLength,
  copy,
  dot,
  length,
  lerp,
  normalize,
  remap,
  scale,
  set,
  sub,
  vec3,
} from '../sim/vec3';
import type { World } from '../sim/world';
import { TIPS, joint, openness, palmCenter, palmNormal, pinchDistance } from './hand-pose';
import type { HandFrame, Handedness, InputFrame } from './types';

export type HandGrip = 'none' | 'open' | 'pinch';

export interface HandState {
  handedness: Handedness;
  tracked: boolean;
  grip: HandGrip;
  pinching: boolean;
  open: boolean;
  /** False after a throw or push until the hand closes, drops or turns away. */
  armed: boolean;
  palm: Vec3;
  normal: Vec3;
  /** Shoulder-through-palm direction. */
  aim: Vec3;
  shoulder: Vec3;
  palmVel: Vec3;
  target: Vec3;
  targetVel: Vec3;
  /** Fingertip positions (thumb first), for the light tendrils. */
  tips: Vec3[];
  pushCooldown: number;
  hasPrev: boolean;
  prevPalm: Vec3;
  prevTarget: Vec3;
}

function handState(handedness: Handedness): HandState {
  return {
    handedness,
    tracked: false,
    grip: 'none',
    pinching: false,
    open: false,
    armed: true,
    palm: vec3(),
    normal: vec3(),
    aim: vec3(0, 0, -1),
    shoulder: vec3(),
    palmVel: vec3(),
    target: vec3(),
    targetVel: vec3(),
    tips: TIPS.map(() => vec3()),
    pushCooldown: 0,
    hasPrev: false,
    prevPalm: vec3(),
    prevTarget: vec3(),
  };
}

const tmp = vec3();
const toDisc = vec3();
const side = vec3();

/**
 * Telekinesis (hand tracking): an open palm pulls the disc toward where the hand
 * aims, a pinch holds it tight and letting go throws, and a quick palm push shoves.
 * Reach sets depth: extend your arm to send the disc further.
 */
export class Telekinesis {
  readonly left = handState('left');
  readonly right = handState('right');
  /** The hand currently driving, if any. */
  active: HandState | null = null;

  /** Reads both hands; writes throw/push one-shots into `intent`. Returns true if a hand wants control. */
  update(input: InputFrame, world: World, intent: Intent): boolean {
    this.updateHand(this.left, input.left.hand, input, world, intent);
    this.updateHand(this.right, input.right.hand, input, world, intent);

    // Keep the driving hand while it's engaged; a pinch beats an open palm; otherwise
    // the open palm facing forward most squarely wins.
    const { left: l, right: r } = this;
    const current = this.active && this.active.grip !== 'none' ? this.active : null;
    const pinching = r.grip === 'pinch' ? r : l.grip === 'pinch' ? l : null;
    const rOpen = r.grip === 'open';
    const lOpen = l.grip === 'open';
    const open = rOpen && (!lOpen || dot(r.normal, r.aim) >= dot(l.normal, l.aim)) ? r : lOpen ? l : null;
    this.active = current?.grip === 'pinch' ? current : (pinching ?? current ?? open);
    return this.active !== null;
  }

  drive(intent: Intent): void {
    const h = this.active;
    if (!h) return;
    const t = tuning.hands;
    intent.mode = 'hands';
    copy(intent.target, h.target);
    scale(intent.targetVel, h.targetVel, t.lead);
    const pinch = h.grip === 'pinch';
    intent.stiffness = pinch ? t.pinchStiffness : t.openStiffness;
    intent.dampingRatio = pinch ? t.pinchDampingRatio : t.openDampingRatio;
  }

  private updateHand(h: HandState, frame: HandFrame, input: InputFrame, world: World, intent: Intent): void {
    const head = input.head;
    const dt = input.dt;
    const t = tuning.hands;
    const wasPinch = h.grip === 'pinch';
    h.tracked = frame.tracked && head !== null;
    if (!h.tracked || !head) {
      h.grip = 'none';
      h.pinching = false;
      h.hasPrev = false;
      return;
    }

    const j = frame.joints;
    palmCenter(h.palm, j);
    palmNormal(h.normal, j, h.handedness);
    for (let i = 0; i < TIPS.length; i++) joint(h.tips[i]!, j, TIPS[i]!);

    // Palm velocity, lightly smoothed.
    if (h.hasPrev && dt > 0) {
      scale(tmp, sub(tmp, h.palm, h.prevPalm), 1 / dt);
      lerp(h.palmVel, h.palmVel, tmp, Math.min(1, dt * 15));
    } else {
      set(h.palmVel, 0, 0, 0);
    }
    copy(h.prevPalm, h.palm);

    // Gestures, with hysteresis.
    const pinch = pinchDistance(j);
    h.pinching = h.pinching ? pinch < t.pinchOff : pinch < t.pinchOn;
    const open = openness(j);
    h.open = h.open ? open >= t.openOff : open >= t.openOn;

    // Aim from an estimated shoulder through the palm.
    normalize(side, set(side, -head.forward.z, 0, head.forward.x)); // head's right, level
    copy(h.shoulder, head.pos);
    h.shoulder.y -= t.shoulderDown;
    addScaled(h.shoulder, h.shoulder, side, h.handedness === 'right' ? t.shoulderSide : -t.shoulderSide);
    sub(h.aim, h.palm, h.shoulder);
    const reach = length(h.aim);
    normalize(h.aim, h.aim);

    const raised = h.palm.y > head.pos.y - t.raisedBelowHead;
    const forward = dot(h.aim, world.frame.forward) > 0.3;
    const facing = dot(h.normal, h.aim) >= t.facing;
    const presenting = h.open && facing && raised && forward;
    if (!presenting) h.armed = true;

    if (h.pinching && raised && forward) h.grip = 'pinch';
    else if (presenting && h.armed) h.grip = 'open';
    else h.grip = 'none';

    // Where this hand pulls: along the aim ray, further the more you reach.
    const depth = remap(reach, t.reach[0], t.reach[1], t.depth[0], t.depth[1]);
    addScaled(h.target, h.shoulder, h.aim, depth);
    clampToComfort(h.target, h.target, world.frame);
    if (h.hasPrev && dt > 0) {
      scale(tmp, sub(tmp, h.target, h.prevTarget), 1 / dt);
      lerp(h.targetVel, h.targetVel, tmp, Math.min(1, dt * 15));
    } else {
      set(h.targetVel, 0, 0, 0);
    }
    copy(h.prevTarget, h.target);
    h.hasPrev = true;

    // Letting go of a pinch throws.
    if (wasPinch && h.grip !== 'pinch' && this.active === h) {
      intent.throwBoost = t.throwBoost;
      h.armed = false;
      if (h.grip === 'open') h.grip = 'none';
    }

    // A quick shove with an open palm facing the disc pushes it away.
    h.pushCooldown = Math.max(0, h.pushCooldown - dt);
    if (h.grip === 'open' && h.pushCooldown === 0) {
      const speed = dot(h.palmVel, h.normal);
      normalize(toDisc, sub(toDisc, world.disc.pos, h.palm));
      if (speed >= t.pushMinSpeed && dot(h.normal, toDisc) >= t.pushFacing) {
        scale(tmp, toDisc, t.pushGain * speed);
        clampLength(intent.impulse, tmp, tuning.disc.maxThrowSpeed);
        h.pushCooldown = t.pushCooldown;
        h.armed = false;
        h.grip = 'none';
      }
    }
  }
}
