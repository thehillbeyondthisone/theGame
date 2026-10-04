import { PerspectiveCamera, Raycaster, Vector2, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { makePlayFrame, screenLimits } from '../sim/comfort';
import { createIntent, releasePull } from '../sim/intent';
import { tuning } from '../sim/tuning';
import { copy, vec3 } from '../sim/vec3';
import { createWorld, stepWorld } from '../sim/world';
import { PointerControl } from './pointer';
import { touchAim } from './touch-aim';
import { createInputFrame } from './types';

describe('mobile aiming through the screen projection', () => {
  it('sinks the first cone when a finger is on its mouth or aiming with the marker, including thumb drift', () => {
    for (const [width, height] of [[360, 640], [390, 844], [844, 390]]) {
      const camera = new PerspectiveCamera(width >= height ? 60 : Math.min(100, 2 * Math.atan(Math.tan(25 * Math.PI / 180) / (width / height)) * 180 / Math.PI), width / height);
      camera.position.set(0, 1.2, 0);
      camera.lookAt(0, 1.2 - Math.tan(10 * Math.PI / 180), -1);
      camera.updateMatrixWorld();
      const halfH = Math.atan(Math.tan(camera.fov * Math.PI / 360) * camera.aspect) * 180 / Math.PI;
      const frame = makePlayFrame(vec3(0, 1.2, 0), vec3(0, 0, -1), screenLimits(halfH - 6, camera.fov / 2 - 16, camera.fov / 2 + 4));
      for (const seed of [1, 7, 42]) for (const marker of [false, true]) for (const fps of [30, 60]) {
        const world = createWorld(frame, seed);
        const control = new PointerControl();
        const input = createInputFrame();
        const intent = createIntent();
        const projected = new Vector3(world.hoop.center.x, world.hoop.center.y, world.hoop.center.z).project(camera);
        const mouthX = (projected.x + 1) * width / 2;
        const mouthY = (1 - projected.y) * height / 2;
        const raycaster = new Raycaster();
        input.pointer.down = true;
        input.pointer.touchAim = true;
        input.dt = 1 / fps;
        let accumulator = 0;
        for (let i = 0; i < fps * 4 && world.hoopsPassed === 0; i++) {
          const aim = touchAim(mouthX + Math.sin(i * 0.15) * 14, mouthY + (marker ? Math.min(52, height * 0.09) : 0) + Math.cos(i * 0.11) * 10, mouthX, mouthY, width, height);
          raycaster.setFromCamera(new Vector2(aim.x / width * 2 - 1, 1 - aim.y / height * 2), camera);
          copy(input.pointer.rayOrigin, raycaster.ray.origin);
          copy(input.pointer.rayDir, raycaster.ray.direction);
          releasePull(intent);
          control.update(input, world, intent);
          control.drive(intent);
          accumulator += input.dt;
          while (accumulator >= tuning.sim.step) {
            stepWorld(world, intent, tuning.sim.step);
            accumulator -= tuning.sim.step;
          }
        }
        expect(world.hoopsPassed, `${width}x${height}, seed ${seed}, ${marker ? 'marker' : 'finger'}, ${fps}fps`).toBe(1);
        expect(world.scoreRun.clips).toBe(0);
      }
    }
  });

  it('keeps an off-target finger free to steer', () => {
    expect(touchAim(40, 500, 200, 300, 390, 844)).toEqual({ x: 40, y: 448, aligned: false });
  });
});
