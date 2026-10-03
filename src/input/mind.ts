import { clampToComfort, MAX_DIST, MIN_DIST } from '../sim/comfort';
import type { Intent } from '../sim/intent';
import { tuning } from '../sim/tuning';
import { addScaled, clamp, copy, distance, dot, lerp, mix, normalize, scale, set, sub, vec3 } from '../sim/vec3';
import type { World } from '../sim/world';
import { OneEuroDirection } from './one-euro';
import type { InputFrame } from './types';

const RAD_TO_DEG = 180 / Math.PI;

/**
 * Mind mode: the disc is pulled toward where you look, on a damped spring.
 * Quest 3 has no eye tracking, so "look" is a One Euro–smoothed head direction.
 * Holding your gaze steady builds Focus (a stiffer, steadier pull). A steady
 * look at the funnel advances the pull point through its mouth; leaning in or
 * back still sets depth when looking elsewhere.
 */
export class MindControl {
  /** 0..1 */
  focus = 0;
  /** Distance of the pull point from the head, m. */
  depth = tuning.mind.startDepth;
  private freeDepth = tuning.mind.startDepth;
  readonly target = vec3();
  readonly gaze = vec3(0, 0, -1);

  private readonly filter = new OneEuroDirection(
    tuning.mind.filterMinCutoff,
    tuning.mind.filterBeta,
    tuning.mind.filterDCutoff,
  );
  private readonly prevForward = vec3(0, 0, -1);
  private readonly neutral = vec3();
  private readonly prevTarget = vec3();
  private readonly targetVel = vec3();
  private readonly tmp = vec3();
  private readonly flat = vec3();
  private primed = false;
  private recovering = false;

  /** Runs every XR frame, even while another mode drives, so it's warm when it takes over. */
  update(input: InputFrame, world: World): boolean {
    const head = input.head;
    if (!head) {
      this.primed = false;
      return false;
    }
    const m = tuning.mind;
    const dt = input.dt;
    if (!this.primed) {
      this.filter.reset();
      copy(this.prevForward, head.forward);
      copy(this.neutral, head.pos);
      this.primed = true;
    }

    // Focus: builds while the head turns slowly, drains when it turns fast.
    const turn = Math.acos(clamp(dot(this.prevForward, head.forward), -1, 1)) * RAD_TO_DEG;
    const degPerSec = dt > 0 ? turn / dt : 0;
    copy(this.prevForward, head.forward);
    if (degPerSec < m.focusCalmDegPerSec) this.focus += dt / m.focusFillSec;
    else if (degPerSec > m.focusBusyDegPerSec) this.focus -= (2 * dt) / m.focusFillSec;
    this.focus = clamp(this.focus, 0, 1);

    // Gaze: more smoothing as Focus rises.
    this.filter.minCutoff = mix(m.filterMinCutoff, m.focusedMinCutoff, this.focus);
    copy(this.gaze, this.filter.filter(head.forward, dt));

    // Lean: rate control against a neutral point that slowly follows your posture.
    lerp(this.neutral, this.neutral, head.pos, Math.min(1, dt / m.leanNeutralTau));
    normalize(this.flat, set(this.flat, this.gaze.x, 0, this.gaze.z));
    const lean = dot(sub(this.tmp, head.pos, this.neutral), this.flat);
    const excess = Math.sign(lean) * Math.max(0, Math.abs(lean) - m.leanDeadZone);
    this.freeDepth = clamp(this.freeDepth + excess * m.leanGain * dt, MIN_DIST, MAX_DIST);

    // Gaze supplies the missing depth axis. A narrow cone gives the player a
    // deliberate "hold your look" gesture, while the actual gaze ray still
    // determines lateral accuracy. Push just past the mouth so the disc can
    // cross its plane instead of settling in front of it.
    sub(this.tmp, world.hoop.center, head.pos);
    const mouthDistance = distance(head.pos, world.hoop.center);
    const alignment = mouthDistance > 0
      ? dot(this.gaze, scale(this.tmp, this.tmp, 1 / mouthDistance))
      : 0;
    const aim = clamp((alignment - m.depthAimOuterCos) / (m.depthAimInnerCos - m.depthAimOuterCos), 0, 1);
    const assist = aim * (m.depthAimBase + (1 - m.depthAimBase) * this.focus);
    if (world.captureRemaining > 0) this.recovering = false;
    else if (aim > 0) {
      const behind = dot(sub(this.tmp, world.disc.pos, world.hoop.center), world.hoop.normal);
      if (behind < -m.recoverBehind) this.recovering = true;
      else if (behind > m.recoverAhead) this.recovering = false;
    }
    const mouthDepth = mouthDistance + (this.recovering ? -m.recoverDepth : m.depthThroughMouth);
    const goalDepth = mix(this.freeDepth, clamp(mouthDepth, MIN_DIST, MAX_DIST), assist);
    this.depth += clamp(goalDepth - this.depth, -m.depthSpeed * dt, m.depthSpeed * dt);

    addScaled(this.target, head.pos, this.gaze, this.depth);
    clampToComfort(this.target, this.target, world.frame);

    if (dt > 0) {
      scale(this.tmp, sub(this.tmp, this.target, this.prevTarget), 1 / dt);
      lerp(this.targetVel, this.targetVel, this.tmp, Math.min(1, dt * 10));
    }
    copy(this.prevTarget, this.target);
    return true;
  }

  /** Matches the pull depth to where the disc is now, so taking over never yanks it. */
  syncDepth(world: World, input: InputFrame): void {
    if (!input.head) return;
    this.depth = clamp(distance(input.head.pos, world.disc.pos), MIN_DIST, MAX_DIST);
    this.freeDepth = this.depth;
    this.recovering = false;
    addScaled(this.target, input.head.pos, this.gaze, this.depth);
    clampToComfort(this.target, this.target, world.frame);
    copy(this.prevTarget, this.target);
    set(this.targetVel, 0, 0, 0);
  }

  /** Writes the pull. `ramp` (0..1) fades control back in after a throw or push. */
  drive(intent: Intent, ramp: number): void {
    const m = tuning.mind;
    intent.mode = 'mind';
    copy(intent.target, this.target);
    scale(intent.targetVel, this.targetVel, m.lead * ramp);
    intent.stiffness = mix(m.stiffness[0], m.stiffness[1], this.focus) * ramp;
    intent.dampingRatio = m.dampingRatio;
  }
}
