import {
  BufferAttribute,
  BufferGeometry,
  CircleGeometry,
  Color,
  DoubleSide,
  DynamicDrawUsage,
  FrontSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshPhongMaterial,
  Vector3,
} from 'three';
import type { Hoop } from '../sim/hoop';
import { tuning } from '../sim/tuning';
import type { Vec3 } from '../sim/vec3';
import { type LightGuard, pulseEnvelope } from './light-guard';
import { PALETTE } from './palette';

const UP = new Vector3(0, 1, 0);
const normal = new Vector3();
const SIDES = 36;
const TAU = Math.PI * 2;
const throatGeometry = new CircleGeometry(0.052, 36);
const throatMaterial = new MeshBasicMaterial({ color: 0x170e39, side: DoubleSide });

function throat(): Mesh {
  const mesh = new Mesh(throatGeometry, throatMaterial);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -0.112;
  return mesh;
}

// One continuous revolved profile: pointed stem, swelling shoulder, rolled lip,
// then an inward funnel wall that recedes to a small dark throat.
const profile: ReadonlyArray<readonly [number, number, number]> = [
  [-0.42, 0.002, 0.18],
  [-0.38, 0.006, 0.29],
  [-0.32, 0.013, 0.37],
  [-0.26, 0.016, 0.49],
  [-0.20, 0.022, 0.57],
  [-0.15, 0.029, 0.65],
  [-0.10, 0.052, 0.73],
  [-0.055, 0.095, 0.84],
  [-0.014, 0.137, 0.96],
  [0.003, 0.148, 1.00],
  [0.000, 0.139, 0.85],
  [-0.025, 0.116, 0.67],
  [-0.065, 0.086, 0.50],
  [-0.107, 0.059, 0.33],
  [-0.142, 0.036, 0.22],
  [-0.17, 0.013, 0.13],
  [-0.174, 0.001, 0.10],
];

function funnelGeometry(): BufferGeometry {
  const vertices = profile.length * (SIDES + 1);
  const positions = new Float32Array(vertices * 3);
  const colors = new Float32Array(vertices * 3);
  const indices: number[] = [];
  const violet = new Color(PALETTE.funnel);
  const highlight = new Color(PALETTE.funnelHighlight);
  const shadow = new Color(PALETTE.funnelShadow);
  const sample = new Color();
  for (let ring = 0; ring < profile.length; ring++) {
    const [, , light] = profile[ring]!;
    for (let side = 0; side <= SIDES; side++) {
      const angular = 0.87 + 0.13 * Math.cos((side / SIDES) * TAU - 0.9);
      if (ring >= 10) sample.copy(shadow).lerp(violet, light * 0.20 * angular);
      else sample.copy(shadow).lerp(violet, Math.min(1, (0.25 + light * 0.85) * angular));
      if (ring >= 7 && ring <= 10) sample.lerp(highlight, (light - 0.7) * 0.4);
      const offset = (ring * (SIDES + 1) + side) * 3;
      colors[offset] = sample.r;
      colors[offset + 1] = sample.g;
      colors[offset + 2] = sample.b;
    }
  }
  for (let ring = 0; ring < profile.length - 1; ring++) {
    for (let side = 0; side < SIDES; side++) {
      const a = ring * (SIDES + 1) + side;
      const b = a + SIDES + 1;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3).setUsage(DynamicDrawUsage));
  geometry.setAttribute('color', new BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  const outside = SIDES * 9 * 6;
  geometry.addGroup(0, outside, 0);
  geometry.addGroup(outside, indices.length - outside, 1);
  return geometry;
}

/** The source's shaded, turning funnel wrapped around the simulation mouth. */
export class HoopView {
  readonly root = new Group();
  readonly captureRoot = new Group();
  private readonly geometry = funnelGeometry();
  private readonly material = new MeshPhongMaterial({
    vertexColors: true,
    side: FrontSide,
    specular: 0x291b4e,
    shininess: 18,
    emissive: 0x28105b,
    emissiveIntensity: 0.16,
  });
  private readonly interiorMaterial = new MeshBasicMaterial({ vertexColors: true, side: FrontSide });
  private popAt = -Infinity;
  private flashAt = -Infinity;
  private captureAt = -Infinity;
  private clipAt = -Infinity;
  private captureScale = 1;
  private lounge = false;

  constructor() {
    const mesh = new Mesh(this.geometry, [this.material, this.interiorMaterial]);
    mesh.frustumCulled = false;
    this.root.add(mesh, throat());
    const previous = new Mesh(this.geometry, [this.material, this.interiorMaterial]);
    previous.frustumCulled = false;
    this.captureRoot.add(previous, throat());
    this.captureRoot.visible = false;
  }

  setLoungeLook(enabled: boolean): void {
    if (this.lounge === enabled) return;
    this.lounge = enabled;
    this.material.specular.set(enabled ? 0x9d8bda : 0x291b4e);
    this.material.shininess = enabled ? 52 : 18;
  }

  onPass(oldCenter: Vec3, oldNormal: Vec3, radius: number, now: number, guard: LightGuard): boolean {
    this.captureRoot.position.set(oldCenter.x, oldCenter.y, oldCenter.z);
    normal.set(oldNormal.x, oldNormal.y, oldNormal.z);
    this.captureRoot.quaternion.setFromUnitVectors(UP, normal);
    this.captureAt = now;
    this.captureScale = radius / tuning.hoop.radius;
    this.popAt = now;
    const pulseAllowed = guard.request(now);
    if (pulseAllowed) this.flashAt = now;
    return pulseAllowed;
  }

  onClip(now: number): void {
    this.clipAt = now;
  }

  clearCapture(): void {
    this.captureAt = this.popAt = this.flashAt = this.clipAt = -Infinity;
    this.captureRoot.visible = false;
  }

  update(hoop: Hoop, now: number): void {
    const capture = (now - this.captureAt) / 0.82;
    this.captureRoot.visible = capture >= 0 && capture < 1;
    if (this.captureRoot.visible) {
      // The episode's capture close-up makes the bowl swell toward the viewer,
      // then contract after the disc vanishes into the dark throat.
      const open = Math.min(1, capture / 0.57);
      const closing = Math.max(0, (capture - 0.64) / 0.36);
      const opened = 1 + 2 * (open * open * (3 - 2 * open));
      const closed = closing * closing * (3 - 2 * closing);
      this.captureRoot.scale.setScalar(this.captureScale * opened * (1 - closed * 0.86));
    }
    this.root.position.set(hoop.center.x, hoop.center.y, hoop.center.z);
    normal.set(hoop.normal.x, hoop.normal.y, hoop.normal.z);
    this.root.quaternion.setFromUnitVectors(UP, normal);
    const pop = Math.min(1, (now - this.popAt) / 0.38);
    const popScale = pop < 1 ? 0.18 + 0.82 * (1 - (1 - pop) ** 3) : 1;
    const clipTime = now - this.clipAt;
    const recoil = clipTime >= 0 && clipTime < 0.25 ? 1 + 0.12 * Math.exp(-clipTime * 13) * Math.sin(clipTime * 34) : 1;
    this.root.scale.setScalar((hoop.radius / tuning.hoop.radius) * popScale * recoil);
    this.material.emissiveIntensity = 0.16 + 0.17 * pulseEnvelope(now - this.flashAt, 0.12, 0.5)
      + (clipTime >= 0 && clipTime < 0.2 ? 0.08 * (1 - clipTime / 0.2) : 0);

    const attribute = this.geometry.getAttribute('position') as BufferAttribute;
    const positions = attribute.array as Float32Array;
    const sway = Math.sin(now * 1.15) * 0.034;
    const twist = Math.sin(now * 0.83 + 1.2) * 0.022;
    for (let ring = 0; ring < profile.length; ring++) {
      const [y, radius] = profile[ring]!;
      const taper = Math.max(0, -y / 0.42);
      const bendX = -0.070 * taper ** 1.4 + sway * taper * taper;
      const bendZ = 0.016 * taper + twist * taper * taper;
      const rimBreath = ring >= 7 && ring <= 11 ? 1 + Math.sin(now * 1.7) * 0.065 : 1;
      for (let side = 0; side <= SIDES; side++) {
        const angle = (side / SIDES) * TAU;
        const offset = (ring * (SIDES + 1) + side) * 3;
        const lip = ring >= 8 && ring <= 11 ? 0.012 * Math.sin(angle + now * 0.75) : 0;
        positions[offset] = bendX + Math.cos(angle) * radius * rimBreath;
        positions[offset + 1] = y + lip;
        positions[offset + 2] = bendZ + Math.sin(angle) * radius * rimBreath;
      }
    }
    attribute.needsUpdate = true;
    this.geometry.computeVertexNormals();
  }
}
