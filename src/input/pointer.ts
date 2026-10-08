import { clampToComfort } from '../sim/comfort';
import type { Intent } from '../sim/intent';
import { flickToToss } from '../sim/toss';
import { tuning } from '../sim/tuning';
import { add, addScaled, clamp, clampLength, copy, distance, length, lerp, scale, set, sub, vec3 } from '../sim/vec3';
import type { World } from '../sim/world';
import type { InputFrame } from './types';

const tmp = vec3();

/**
 * Phone/desktop fallback. With a mouse: drag the disc, the wheel (or Push/Pull)
 * moves it nearer or further, and letting go mid-flick throws. On a touch screen:
 * pick the disc up from where it waits and flick it up to throw it in an arc.
 */
export class PointerControl {
  held = false;
  depth = 1;
  readonly target = vec3();
  private readonly targetVel = vec3();
  private readonly prevTarget = vec3();
  private toss = false;
  /** Recent finger positions, newest first, for measuring a flick. */
  private readonly trail = Array.from({ length: 8 }, () => ({ time: 0, x: 0, y: 0 }));
  private trailLength = 0;

  /** Interrupted gestures must release without producing a flick. */
  reset(): void {
    this.held = false;
    this.trailLength = 0;
    set(this.targetVel, 0, 0, 0);
  }

  update(input: InputFrame, world: World, intent: Intent): boolean {
    const p = input.pointer;
    const t = tuning.pointer;
    const dt = input.dt;
    const wasHeld = this.held;
    this.toss = p.toss;
    // A thrown disc is out of reach until the next one appears.
    this.held = p.down && !(p.toss && (world.flying || world.captureRemaining > 0));

    if (this.held && !wasHeld) {
      this.depth = p.toss ? distance(p.rayOrigin, world.rest) : clamp(distance(p.rayOrigin, world.disc.pos), 0.3, 3);
      set(this.targetVel, 0, 0, 0);
      this.trailLength = 0;
    }
    if (this.held) {
      if (p.toss) this.remember(input.time, p.x, p.y);
      else this.depth = clamp(this.depth + p.wheel * t.wheelStep + p.depthRate * dt, 0.3, 3);
      addScaled(this.target, p.rayOrigin, p.rayDir, this.depth);
      // The disc is thrown from the hand, not carried to the funnel.
      if (p.toss) add(this.target, world.rest, clampLength(tmp, sub(tmp, this.target, world.rest), tuning.toss.reach));
      clampToComfort(this.target, this.target, world.frame);
      if (wasHeld && dt > 0) {
        scale(tmp, sub(tmp, this.target, this.prevTarget), 1 / dt);
        lerp(this.targetVel, this.targetVel, tmp, Math.min(1, dt * 15));
      }
      copy(this.prevTarget, this.target);
    } else if (p.toss) {
      if (wasHeld) this.flick(world, intent);
      // Until it's picked up, the disc waits where it appeared.
      copy(this.target, world.rest);
      set(this.targetVel, 0, 0, 0);
      return !world.flying;
    } else if (wasHeld && length(world.disc.vel) >= t.flickMinSpeed) {
      intent.throwBoost = t.throwBoost;
    }
    return this.held;
  }

  drive(intent: Intent): void {
    const t = this.toss ? tuning.toss : tuning.pointer;
    intent.mode = 'pointer';
    copy(intent.target, this.target);
    scale(intent.targetVel, this.targetVel, tuning.pointer.lead);
    intent.stiffness = t.stiffness;
    intent.dampingRatio = t.dampingRatio;
  }

  private remember(time: number, x: number, y: number): void {
    const sample = this.trail.pop()!;
    sample.time = time;
    sample.x = x;
    sample.y = y;
    this.trail.unshift(sample);
    this.trailLength = Math.min(this.trailLength + 1, this.trail.length);
  }

  /** Throws with the finger's speed just before it lifted; a finger that had stopped drops the disc. */
  private flick(world: World, intent: Intent): void {
    const newest = this.trail[0]!;
    let oldest = newest;
    for (let i = 1; i < this.trailLength; i++) {
      if (newest.time - this.trail[i]!.time > tuning.toss.flickWindow) break;
      oldest = this.trail[i]!;
    }
    const span = newest.time - oldest.time;
    if (span <= 0) return;
    flickToToss(intent.toss, (newest.x - oldest.x) / span, (newest.y - oldest.y) / span, world.frame);
  }
}
