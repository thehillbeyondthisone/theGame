import {
  CircleGeometry,
  Color,
  DoubleSide,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  Quaternion,
  Vector3,
} from 'three';
import type { PlayFrame } from '../sim/comfort';
import { PALETTE } from './palette';

const COLS = 21;
const ROWS = 22;
const UP_FACE = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI / 2);
const position = new Vector3();
const size = new Vector3();
const matrix = new Matrix4();
const color = new Color();

/** The source's perspective field of separate filled orange circles. */
export class CircleField {
  readonly mesh = new InstancedMesh(
    new CircleGeometry(1, 24),
    new MeshBasicMaterial({
      color: 0xffffff,
      side: DoubleSide,
      transparent: true,
      opacity: 0.79,
      depthWrite: false,
    }),
    COLS * ROWS,
  );

  constructor() {
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -1;
    this.mesh.visible = false;
  }

  place(frame: PlayFrame): void {
    let index = 0;
    for (let row = 0; row < ROWS; row++) {
      const forward = 0.52 + row * 0.195;
      for (let col = 0; col < COLS; col++) {
        const across = (col - (COLS - 1) / 2 + (row % 2) * 0.08) * 0.194;
        position.set(
          frame.anchor.x + frame.right.x * across + frame.forward.x * forward,
          frame.anchor.y - 0.63,
          frame.anchor.z + frame.right.z * across + frame.forward.z * forward,
        );
        const radius = 0.082 + 0.003 * Math.sin(col * 2.4 + row * 0.7);
        size.set(radius, radius * 0.96, 1);
        matrix.compose(position, UP_FACE, size);
        this.mesh.setMatrixAt(index, matrix);
        const highlight = Math.exp(-((col - 5) ** 2 / 13 + (row - 5) ** 2 / 18));
        const variation = 0.47 + 0.09 * Math.sin(col * 1.9 + row * 3.7) + 0.65 * highlight;
        color.set(PALETTE.field).multiplyScalar(variation);
        this.mesh.setColorAt(index, color);
        index++;
      }
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}
