import {
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshPhongMaterial,
  Quaternion,
  Vector3,
} from 'three';
import { tuning } from '../sim/tuning';
import type { Disc } from '../sim/world';
import { PALETTE } from './palette';
import { discFaceTexture } from './textures';

const UP = new Vector3(0, 1, 0);
const axis = new Vector3(1, 0, 0);
const tilt = new Quaternion();
const spin = new Quaternion();

/** A solid, thin red-orange disc, with the source's circular face markings. */
export class DiscView {
  readonly group = new Group();
  readonly captureRoot = new Group();
  private readonly spinner = new Group();
  private readonly captured: Mesh;
  private readonly side: MeshPhongMaterial;
  private readonly face: MeshBasicMaterial;
  private lounge = false;
  private captureAt = -Infinity;

  constructor() {
    const r = tuning.disc.radius;
    const side = new MeshPhongMaterial({
      color: PALETTE.discEdge,
      emissive: 0xa91d16,
      emissiveIntensity: 0.34,
      shininess: 42,
    });
    const face = new MeshBasicMaterial({ map: discFaceTexture(), side: DoubleSide });
    this.side = side;
    this.face = face;
    const body = new Mesh(new CylinderGeometry(r, r, r * 0.105, 64), [side, face, face]);
    this.spinner.add(body);
    this.group.add(this.spinner);
    this.captured = new Mesh(body.geometry, body.material);
    this.captureRoot.add(this.captured);
    this.captureRoot.visible = false;
  }

  setLoungeLook(enabled: boolean): void {
    if (this.lounge === enabled) return;
    this.lounge = enabled;
    this.side.emissiveIntensity = enabled ? 0.48 : 0.34;
    this.side.shininess = enabled ? 76 : 42;
    this.side.specular.set(enabled ? 0xffc7a0 : 0x111111);
    this.face.color.set(enabled ? 0xffe6d8 : 0xffffff);
  }

  onCapture(center: { x: number; y: number; z: number },
            mouthNormal: { x: number; y: number; z: number }, now: number): void {
    this.captureAt = now;
    this.captureRoot.position.set(center.x, center.y, center.z);
    this.captureRoot.quaternion.setFromUnitVectors(UP, new Vector3(mouthNormal.x, mouthNormal.y, mouthNormal.z));
  }

  clearCapture(): void {
    this.captureAt = -Infinity;
    this.captureRoot.visible = false;
  }

  /** Interpolate movement, then show the shallow tilt and turning face. */
  update(disc: Disc, alpha: number): void {
    const p = this.group.position;
    p.set(
      disc.prevPos.x + (disc.pos.x - disc.prevPos.x) * alpha,
      disc.prevPos.y + (disc.pos.y - disc.prevPos.y) * alpha,
      disc.prevPos.z + (disc.pos.z - disc.prevPos.z) * alpha,
    );
    const speed = Math.hypot(disc.vel.x, disc.vel.z);
    axis.set(1, 0, -disc.vel.x * 0.12).normalize();
    tilt.setFromAxisAngle(axis, 0.12 + Math.min(speed * 0.16, 0.55));
    spin.setFromAxisAngle(UP, disc.spin);
    this.spinner.quaternion.multiplyQuaternions(tilt, spin);
  }

  updateCapture(now: number): void {
    const progress = (now - this.captureAt) / 0.74;
    this.captureRoot.visible = progress >= 0 && progress < 1;
    this.spinner.visible = !this.captureRoot.visible;
    if (!this.captureRoot.visible) return;
    const angle = progress * Math.PI * 5.5;
    this.captured.position.set(
      -0.14 + 0.16 * progress + Math.cos(angle) * 0.028 * (1 - progress),
      0.045 - 0.19 * progress,
      Math.sin(angle) * 0.04 * (1 - progress),
    );
    const swell = Math.min(1, progress / 0.58);
    const vanish = Math.max(0, (progress - 0.66) / 0.34);
    this.captured.scale.setScalar((1 + 2 * swell) * (1 - 0.94 * vanish * vanish));
    this.captured.rotation.set(0.18 + progress * 0.4, angle * 0.18, 0.08);
  }
}
