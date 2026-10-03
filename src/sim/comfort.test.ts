import { describe, expect, it } from 'vitest';
import { clampToComfort, isComfortable, makePlayFrame, MAX_DIST, MIN_DIST, toLocal } from './comfort';
import { distance, vec3 } from './vec3';

const frame = makePlayFrame(vec3(0, 1.2, 0), vec3(0, 0, -1));
const DEG = Math.PI / 180;

function angles(p: ReturnType<typeof vec3>) {
  const l = toLocal(vec3(), p, frame);
  const d = Math.hypot(l.x, l.y, l.z);
  return { d, yaw: Math.atan2(l.x, l.z) / DEG, pitch: Math.asin(l.y / d) / DEG };
}

describe('comfort volume', () => {
  it('leaves comfortable points alone', () => {
    const p = vec3(0.3, 1.1, -1.2);
    expect(isComfortable(p, frame)).toBe(true);
    expect(clampToComfort(vec3(), p, frame)).toEqual(p);
  });

  it('pulls far and near points to 0.6–2.2 m', () => {
    expect(distance(clampToComfort(vec3(), vec3(0, 1.2, -5), frame), frame.anchor)).toBeCloseTo(MAX_DIST, 9);
    expect(distance(clampToComfort(vec3(), vec3(0, 1.2, -0.1), frame), frame.anchor)).toBeCloseTo(MIN_DIST, 9);
  });

  it('keeps yaw within ±55°, even for points behind the player', () => {
    for (const p of [vec3(3, 1.2, -0.5), vec3(-2, 1.2, 0.5), vec3(0.01, 1.2, 1.5)]) {
      const a = angles(clampToComfort(vec3(), p, frame));
      expect(Math.abs(a.yaw)).toBeLessThanOrEqual(55 + 1e-9);
    }
  });

  it('keeps pitch within −35° to +25°', () => {
    expect(angles(clampToComfort(vec3(), vec3(0, 4, -0.5), frame)).pitch).toBeCloseTo(25, 6);
    expect(angles(clampToComfort(vec3(), vec3(0, -3, -0.5), frame)).pitch).toBeCloseTo(-35, 6);
  });

  it('works for any play-forward direction', () => {
    const turned = makePlayFrame(vec3(1, 1.5, 2), vec3(1, 0.3, 0));
    const p = clampToComfort(vec3(), vec3(1, 1.5, 9), turned); // straight "left" of forward
    const l = toLocal(vec3(), p, turned);
    expect(Math.abs(Math.atan2(l.x, l.z) / DEG)).toBeCloseTo(55, 6);
  });
});
