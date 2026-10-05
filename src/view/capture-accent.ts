import { AdditiveBlending, Group, Mesh, MeshBasicMaterial, SphereGeometry, TorusGeometry, Vector3 } from 'three';
import type { Vec3 } from '../sim/vec3';
import { pulseEnvelope } from './light-guard';

const UP = new Vector3(0, 1, 0);

/** A small local ripple and spiral motes; never a full-screen brightness effect. */
export class CaptureAccent {
  readonly root = new Group();
  private readonly ringMaterial = new MeshBasicMaterial({
    color: 0xd8c3ff, transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending,
  });
  private readonly moteMaterial = new MeshBasicMaterial({
    color: 0xffc58d, transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending,
  });
  private readonly ring = new Mesh(new TorusGeometry(1, 0.013, 6, 64), this.ringMaterial);
  private readonly motes: Mesh[] = [];
  private started = -Infinity;
  private radius = 0.15;

  constructor() {
    this.ring.rotation.x = -Math.PI / 2;
    this.root.add(this.ring);
    const geometry = new SphereGeometry(0.004, 6, 4);
    for (let i = 0; i < 16; i++) {
      const mote = new Mesh(geometry, this.moteMaterial);
      this.motes.push(mote);
      this.root.add(mote);
    }
    this.root.visible = false;
  }

  capture(center: Vec3, normal: Vec3, radius: number, now: number): void {
    this.started = now;
    this.radius = radius;
    this.root.position.set(center.x, center.y, center.z);
    this.root.quaternion.setFromUnitVectors(UP, new Vector3(normal.x, normal.y, normal.z));
  }

  clear(): void {
    this.started = -Infinity;
    this.root.visible = false;
  }

  update(now: number, enabled: boolean): void {
    const t = now - this.started;
    this.root.visible = enabled && t >= 0 && t < 0.95;
    if (!this.root.visible) return;
    const envelope = pulseEnvelope(t, 0.18, 0.77);
    this.ringMaterial.opacity = envelope * 0.26;
    this.moteMaterial.opacity = envelope * 0.72;
    this.ring.scale.setScalar(this.radius * (1.15 + t * 1.6));
    this.ring.position.y = 0.008 - t * 0.035;
    this.motes.forEach((mote, i) => {
      const phase = (i / this.motes.length + t * 1.2) * Math.PI * 2;
      const r = this.radius * (0.75 - t * 0.55) * (0.75 + (i % 3) * 0.12);
      mote.position.set(Math.cos(phase) * r, -t * 0.14 + (i % 4) * 0.007, Math.sin(phase) * r);
      mote.scale.setScalar(0.7 + Math.sin(phase) * 0.25);
    });
  }
}
