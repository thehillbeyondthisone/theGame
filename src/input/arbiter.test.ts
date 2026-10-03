import { describe, expect, it } from 'vitest';
import { tuning } from '../sim/tuning';
import { Arbiter, type Engagement } from './arbiter';

const idle: Engagement = { xr: true, controller: false, hands: false, mind: true, pointer: false };

describe('arbiter', () => {
  it('prefers controllers, then hands, then mind mode', () => {
    const a = new Arbiter();
    expect(a.decide({ ...idle, controller: true, hands: true }, 0.01).mode).toBe('controller');
    expect(a.decide({ ...idle, hands: true }, 0.01).mode).toBe('hands');
    expect(a.decide(idle, 0.01).mode).toBe('mind');
    expect(a.decide({ ...idle, xr: false, pointer: true }, 0.01).mode).toBe('pointer');
    expect(a.decide({ ...idle, xr: false }, 0.01).mode).toBe('none');
  });

  it('mind mode starts at full strength', () => {
    expect(new Arbiter().decide(idle, 0.01).mindRamp).toBe(1);
  });

  it('after a throw, head steering waits out the grace period, then fades in', () => {
    const a = new Arbiter();
    const { graceSec, rampSec } = tuning.mind;
    let t = 0;
    let ramp = 0;
    const until = (end: number) => {
      for (; t < end; t += 0.01) ramp = a.decide(idle, 0.01).mindRamp;
      return ramp;
    };
    a.decide({ ...idle, hands: true }, 0.01);
    expect(a.decide(idle, 0.01).mindRamp).toBe(0);
    expect(until(graceSec - 0.05)).toBe(0);
    const halfway = until(graceSec + rampSec / 2);
    expect(halfway).toBeGreaterThan(0.3);
    expect(halfway).toBeLessThan(0.7);
    expect(until(graceSec + rampSec + 0.1)).toBe(1);
  });
});
