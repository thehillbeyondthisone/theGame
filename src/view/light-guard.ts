/**
 * Photosensitivity guard (non-negotiable, see PLAN.md). Every brightness pulse in
 * the game asks this one shared limiter first, so no combination of effects can
 * exceed the limit: at most `maxPerSecond` pulses in any rolling second.
 */
export class LightGuard {
  private readonly starts: number[] = [];

  constructor(public maxPerSecond = 2) {}

  /** Asks to start a pulse at `now` (seconds). Returns false if it must be skipped. */
  request(now: number): boolean {
    while (this.starts.length > 0 && now - this.starts[0]! >= 1) this.starts.shift();
    if (this.starts.length >= this.maxPerSecond) return false;
    this.starts.push(now);
    return true;
  }
}

/** Minimum ease-in for any brightness increase, seconds. */
export const MIN_RISE = 0.1;

/**
 * Brightness envelope for a pulse `t` seconds after it started: eases in over
 * `rise` (never faster than MIN_RISE), then decays smoothly to 0 over `decay`.
 */
export function pulseEnvelope(t: number, rise = 0.12, decay = 0.6): number {
  const r = Math.max(rise, MIN_RISE);
  if (t <= 0 || t >= r + decay) return 0;
  if (t < r) {
    const x = t / r;
    return x * x * (3 - 2 * x);
  }
  const x = 1 - (t - r) / decay;
  return x * x * (3 - 2 * x);
}
