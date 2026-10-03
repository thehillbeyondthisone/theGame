import { clampToComfort } from '../sim/comfort';
import type { Intent } from '../sim/intent';
import { tuning } from '../sim/tuning';
import { addScaled, clamp, copy, distance, length, lerp, scale, set, sub, vec3 } from '../sim/vec3';
import type { World } from '../sim/world';
import type { InputFrame } from './types';

const tmp = vec3();

/**
 * Phone/desktop fallback: drag the disc with mouse or touch. The wheel (or a
 * two-finger pinch) moves it nearer or further; letting go mid-flick throws.
 */
export class PointerControl {
  held = false;
  depth = 1;
  readonly target = vec3();
  private readonly targetVel = vec3();
  private readonly prevTarget = vec3();

  update(input: InputFrame, world: World, intent: Intent): boolean {
    const p = input.pointer;
    const t = tuning.pointer;
    const dt = input.dt;
    const wasHeld = this.held;
    this.held = p.down;

    if (this.held && !wasHeld) {
      this.depth = clamp(distance(p.rayOrigin, world.disc.pos), 0.3, 3);
      set(this.targetVel, 0, 0, 0);
    }
    if (this.held) {
      this.depth = clamp(this.depth + p.wheel * t.wheelStep, 0.3, 3);
      addScaled(this.target, p.rayOrigin, p.rayDir, this.depth);
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
