import { describe, expect, it } from 'vitest';
import { LightGuard, MIN_RISE, pulseEnvelope } from './light-guard';

describe('photosensitivity guard', () => {
  it('allows at most 2 pulses in any rolling second', () => {
    const g = new LightGuard(2);
    expect(g.request(0)).toBe(true);
    expect(g.request(0.3)).toBe(true);
    expect(g.request(0.6)).toBe(false);
    expect(g.request(0.99)).toBe(false);
    expect(g.request(1.0)).toBe(true);
    expect(g.request(1.2)).toBe(false);
    expect(g.request(1.3)).toBe(true);
  });

  it('never brightens faster than the minimum rise, even if asked to', () => {
    // Sample in 1 ms steps; the envelope can't reach full brightness before MIN_RISE.
    for (const rise of [0, 0.05, 0.1, 0.2]) {
      expect(pulseEnvelope(MIN_RISE * 0.5, rise)).toBeLessThanOrEqual(0.5 + 1e-9);
      let prev = 0;
      for (let t = 0; t < MIN_RISE; t += 0.001) {
        const v = pulseEnvelope(t, rise);
        expect(v - prev).toBeLessThan(0.02);
        prev = v;
      }
    }
  });

  it('returns to zero and stays there', () => {
    expect(pulseEnvelope(-1)).toBe(0);
    expect(pulseEnvelope(0.12 + 0.6)).toBe(0);
    expect(pulseEnvelope(5)).toBe(0);
  });
});
