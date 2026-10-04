import { clampToComfort, MAX_DIST, MIN_DIST } from '../sim/comfort';
import type { Intent } from '../sim/intent';
import { tuning } from '../sim/tuning';
import { addScaled, clamp, copy, distance, dot, length, lerp, scale, set, sub, vec3 } from '../sim/vec3';
import type { World } from '../sim/world';
import type { InputFrame } from './types';

const tmp = vec3();

/**
 * Phone/desktop fallback: drag the disc with mouse or touch. The wheel (or a
 * two-finger pinch) moves it nearer or further; letting go mid-flick throws.
 * One-finger touch supplies depth near the mouth, with Push/Pull as an override.
 */
export class PointerControl {
  held = false;
  depth = 1;
  readonly target = vec3();
  private readonly targetVel = vec3();
  private readonly prevTarget = vec3();
  private recovering = false;
  private sinking = false;

  /** Interrupted gestures must release without producing a flick. */
  reset(): void {
    this.held = false;
    this.recovering = false;
    this.sinking = false;
    set(this.targetVel, 0, 0, 0);
  }

  update(input: InputFrame, world: World, intent: Intent): boolean {
    const p = input.pointer;
    const t = tuning.pointer;
    const dt = input.dt;
    const wasHeld = this.held;
    this.held = p.down;

    if (this.held && !wasHeld) {
      this.depth = clamp(distance(p.rayOrigin, world.disc.pos), 0.3, 3);
      set(this.targetVel, 0, 0, 0);
      this.recovering = false;
      this.sinking = false;
    }
    if (this.held) {
      let mouthApproach = false;
      this.depth = clamp(this.depth + p.wheel * t.wheelStep + p.depthRate * dt, 0.3, 3);
      if (p.touchAim && p.wheel === 0 && p.depthRate === 0 && world.captureRemaining === 0) {
        const m = tuning.mind;
        const mouthDistance = distance(p.rayOrigin, world.hoop.center);
        sub(tmp, world.hoop.center, p.rayOrigin);
        const alignment = mouthDistance > 0 ? dot(p.rayDir, scale(tmp, tmp, 1 / mouthDistance)) : 0;
        const aim = clamp((alignment - m.depthAimOuterCos) / (m.depthAimInnerCos - m.depthAimOuterCos), 0, 1);
        if (aim > 0) {
          const behind = dot(sub(tmp, world.disc.pos, world.hoop.center), world.hoop.normal);
          if (behind < -m.recoverBehind) this.recovering = true;
          else if (behind > m.recoverAhead) this.recovering = false;
          const goal = clamp(mouthDistance + (this.recovering ? -m.recoverDepth : m.depthThroughMouth), MIN_DIST, MAX_DIST);
          this.depth += clamp(goal - this.depth, -m.depthSpeed * dt * aim, m.depthSpeed * dt * aim);
          if (aim > 0.5 && !this.recovering) {
            // A straight ray toward the mouth can cross its tilted rim before
            // lateral steering catches up. Approach above the opening, then sink.
            // Keep the player's radial aim error so accurate entries earn Perfect.
            addScaled(this.target, p.rayOrigin, p.rayDir, mouthDistance);
            const above = dot(sub(tmp, this.target, world.hoop.center), world.hoop.normal);
            addScaled(this.target, this.target, world.hoop.normal, -above + (this.sinking ? -0.12 : 0.18));
            if (!this.sinking && distance(world.disc.pos, this.target) < 0.065) this.sinking = true;
            this.depth = distance(p.rayOrigin, this.target);
            mouthApproach = true;
          } else this.sinking = false;
        } else this.sinking = false;
      } else this.sinking = false;
      if (world.captureRemaining > 0) this.recovering = false;
      if (!mouthApproach) addScaled(this.target, p.rayOrigin, p.rayDir, this.depth);
      clampToComfort(this.target, this.target, world.frame);
      if (wasHeld && dt > 0) {
        scale(tmp, sub(tmp, this.target, this.prevTarget), 1 / dt);
        lerp(this.targetVel, this.targetVel, tmp, Math.min(1, dt * 15));
      }
      copy(this.prevTarget, this.target);
    } else if (wasHeld && length(world.disc.vel) >= t.flickMinSpeed) {
      intent.throwBoost = t.throwBoost;
    }
    return this.held;
  }

  drive(intent: Intent): void {
    const t = tuning.pointer;
    intent.mode = 'pointer';
    copy(intent.target, this.target);
    scale(intent.targetVel, this.targetVel, t.lead);
    intent.stiffness = t.stiffness;
    intent.dampingRatio = t.dampingRatio;
  }
}
