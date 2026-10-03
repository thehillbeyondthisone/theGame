import { describe, expect, it } from 'vitest';
import { vec3 } from '../sim/vec3';
import { makeHand } from '../test/fixtures';
import { openness, palmNormal, pinchDistance } from './hand-pose';

describe('hand pose', () => {
  it('finds the palm facing direction for both hands', () => {
    for (const side of ['left', 'right'] as const) {
      for (const facing of [vec3(0, 0, -1), vec3(0, -1, 0), vec3(1, 0, 0)]) {
        const fingers = facing.y === 0 ? vec3(0, 1, 0) : vec3(0, 0, -1);
        const j = makeHand({ side, wrist: vec3(0.2, 1.1, -0.4), fingers, facing });
        const n = palmNormal(vec3(), j, side);
        expect(n.x * facing.x + n.y * facing.y + n.z * facing.z).toBeGreaterThan(0.9);
      }
    }
  });

  it('tells an open hand from a fist', () => {
    const open = makeHand({ side: 'right', wrist: vec3(), curl: 0 });
    const fist = makeHand({ side: 'right', wrist: vec3(), curl: 1 });
    expect(openness(open)).toBeGreaterThan(0.95);
    expect(openness(fist)).toBeLessThan(0.6);
  });

  it('measures pinch distance', () => {
    expect(pinchDistance(makeHand({ side: 'left', wrist: vec3(), pinch: true }))).toBeLessThan(0.018);
    expect(pinchDistance(makeHand({ side: 'left', wrist: vec3() }))).toBeGreaterThan(0.035);
  });
});
