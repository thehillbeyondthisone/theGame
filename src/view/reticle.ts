import { AdditiveBlending, Mesh, MeshBasicMaterial, RingGeometry } from 'three';
import type { Vec3 } from '../sim/vec3';
import { PALETTE } from './palette';

/** Mind mode's pull point: a faint ring that tightens and brightens as Focus builds. */
export class Reticle {
  readonly mesh: Mesh;
  private readonly material: MeshBasicMaterial;

  constructor() {
    this.material = new MeshBasicMaterial({
      color: PALETTE.discEdge,
      blending: AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });
    this.mesh = new Mesh(new RingGeometry(0.016, 0.02, 40), this.material);
    this.mesh.visible = false;
  }

  update(visible: boolean, target: Vec3, head: Vec3 | null, focus: number, strength: number): void {
    this.mesh.visible = visible && head !== null && strength > 0;
    if (!this.mesh.visible || !head) return;
    this.mesh.position.set(target.x, target.y, target.z);
    this.mesh.lookAt(head.x, head.y, head.z);
    this.mesh.scale.setScalar(1.5 - 0.5 * focus);
    this.material.opacity = (0.15 + 0.35 * focus) * strength;
  }
}
