import type { ControlMode } from '../sim/intent';
import { tuning } from '../sim/tuning';

export interface Engagement {
  xr: boolean;
  controller: boolean;
  hands: boolean;
  mind: boolean;
  pointer: boolean;
}

export interface Decision {
  mode: ControlMode;
  /** 0..1: how much of mind mode's pull to apply (fades back in after a hand-off). */
  mindRamp: number;
}

function isDirect(mode: ControlMode): boolean {
  return mode === 'controller' || mode === 'hands' || mode === 'pointer';
}

/**
 * Chooses who drives the disc each frame. In the headset: controllers beat hands,
 * hands beat mind mode, and mind mode is the default whenever your hands are idle.
 * After a direct mode lets go, head steering waits, then fades in, so throws fly.
 */
export class Arbiter {
  mode: ControlMode = 'none';
  private sinceRelease = Number.POSITIVE_INFINITY;

  decide(e: Engagement, dt: number): Decision {
    let next: ControlMode;
    if (e.xr) next = e.controller ? 'controller' : e.hands ? 'hands' : e.mind ? 'mind' : 'none';
    else next = e.pointer ? 'pointer' : 'none';

    if (isDirect(this.mode) && !isDirect(next)) this.sinceRelease = 0;
    else if (!isDirect(next)) this.sinceRelease += dt;
    this.mode = next;

    const { graceSec, rampSec } = tuning.mind;
    const mindRamp = Math.min(1, Math.max(0, (this.sinceRelease - graceSec) / rampSec));
    return { mode: next, mindRamp };
  }
}
