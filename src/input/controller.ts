import { clampToComfort } from '../sim/comfort';
import type { Intent } from '../sim/intent';
import { tuning } from '../sim/tuning';
import { type Vec3, addScaled, clamp, copy, distance, length, lerp, remap, scale, set, sub, vec3 } from '../sim/vec3';
import type { World } from '../sim/world';
import type { ControllerFrame, Handedness, InputFrame } from './types';

export interface HapticRequest {
  side: Handedness;
  intensity: number;
  ms: number;
}

export interface BeamState {
  handedness: Handedness;
  tracked: boolean;
  held: boolean;
  /** 0..1 trigger pressure past the dead zone. */
  pressure: number;
  /** Distance along the ray to the pull point. */
  depth: number;
  origin: Vec3;
  dir: Vec3;
  target: Vec3;
  targetVel: Vec3;
  prevTarget: Vec3;
  pressedAt: number;
  nextStrainAt: number;
}

function beamState(handedness: Handedness): BeamState {
  return {
    handedness,
    tracked: false,
    held: false,
    pressure: 0,
    depth: 1,
    origin: vec3(),
    dir: vec3(0, 0, -1),
    target: vec3(),
    targetVel: vec3(),
    prevTarget: vec3(),
    pressedAt: 0,
    nextStrainAt: 0,
  };
}

const tmp = vec3();

/**
 * Controllers: the trigger is a tractor beam, the thumbstick pushes the pull point
 * further or closer, and releasing mid-flick throws. Haptics let you feel the strain.
 */
export class Tractor {
  readonly left = beamState('left');
  readonly right = beamState('right');
  active: BeamState | null = null;
  /** Haptic pulses to play; the app drains this every frame. */
  readonly haptics: HapticRequest[] = [];

  update(input: InputFrame, world: World, intent: Intent): boolean {
    this.updateBeam(this.left, input.left.controller, input, world, intent);
    this.updateBeam(this.right, input.right.controller, input, world, intent);
    if (!this.active?.held) {
      // The most recently pressed beam wins.
      const { left: l, right: r } = this;
      this.active = l.held && (!r.held || l.pressedAt > r.pressedAt) ? l : r.held ? r : null;
    }
    return this.active !== null;
  }

  drive(intent: Intent): void {
    const b = this.active;
    if (!b) return;
    const c = tuning.controller;
    intent.mode = 'controller';
    copy(intent.target, b.target);
    scale(intent.targetVel, b.targetVel, c.lead);
    intent.stiffness = c.stiffness[0] + (c.stiffness[1] - c.stiffness[0]) * b.pressure;
    intent.dampingRatio = c.dampingRatio;
  }

  private updateBeam(b: BeamState, frame: ControllerFrame, input: InputFrame, world: World, intent: Intent): void {
    const c = tuning.controller;
    const dt = input.dt;
    const wasHeld = b.held;
    b.tracked = frame.tracked;
    b.held = frame.tracked && frame.trigger > c.triggerDeadZone;
    if (!frame.tracked) return;
    copy(b.origin, frame.rayOrigin);
    copy(b.dir, frame.rayDir);
    b.pressure = remap(frame.trigger, c.triggerDeadZone, 1, 0, 1);

    if (b.held && !wasHeld) {
      b.depth = clamp(distance(b.origin, world.disc.pos), c.minDepth, c.maxDepth);
      b.pressedAt = input.time;
      set(b.targetVel, 0, 0, 0);
    }

    if (b.held) {
      const stick = Math.abs(frame.stickY) > c.stickDeadZone ? frame.stickY : 0;
      b.depth = clamp(b.depth - stick * c.stickDepthSpeed * dt, c.minDepth, c.maxDepth);
      addScaled(b.target, b.origin, b.dir, b.depth);
      clampToComfort(b.target, b.target, world.frame);
      if (wasHeld && dt > 0) {
        scale(tmp, sub(tmp, b.target, b.prevTarget), 1 / dt);
        lerp(b.targetVel, b.targetVel, tmp, Math.min(1, dt * 15));
      }
      copy(b.prevTarget, b.target);

      // Strain: the further the disc lags the beam, the harder the buzz.
      if (this.active === b && input.time >= b.nextStrainAt) {
        const h = c.haptics;
        const strain = remap(distance(b.target, world.disc.pos), 0, 0.3, h.strainMin, h.strainMax);
        this.haptics.push({ side: b.handedness, intensity: strain, ms: h.strainPulseMs });
        b.nextStrainAt = input.time + h.strainIntervalMs / 1000;
      }
    } else if (wasHeld && this.active === b) {
      // Release: a flick throws; a gentle release just lets go.
      if (length(world.disc.vel) >= c.flickMinSpeed) {
        intent.throwBoost = c.throwBoost;
        const [intensity, ms] = c.haptics.throw;
        this.haptics.push({ side: b.handedness, intensity, ms });
      }
      this.active = null;
    }
  }
}
