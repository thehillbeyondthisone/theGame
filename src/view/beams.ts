import {
  AdditiveBlending,
  BufferAttribute,
  DoubleSide,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Mesh,
  ShaderMaterial,
} from 'three';
import type { Vec3 } from '../sim/vec3';

const MAX_BEAMS = 16;
const SEGMENTS = 24;

const vertexShader = /* glsl */ `
attribute float t;
attribute float side;
attribute vec3 aStart;
attribute vec3 aCtrl;
attribute vec3 aEnd;
attribute vec4 aColor;
attribute float aWidth;
attribute float aSeed;
uniform float uTime;
varying vec4 vColor;
varying float vEdge;
varying float vT;

void main() {
  float u = 1.0 - t;
  vec3 p = u * u * aStart + 2.0 * u * t * aCtrl + t * t * aEnd;
  vec3 tangent = normalize(u * (aCtrl - aStart) + t * (aEnd - aCtrl) + vec3(1e-5, 0.0, 0.0));
  vec3 across = normalize(cross(tangent, normalize(cameraPosition - p)) + vec3(0.0, 1e-5, 0.0));
  vec3 bend = normalize(cross(tangent, across));
  // A slow living wobble, pinned at both ends.
  p += bend * sin(t * 9.0 - uTime * 5.0 + aSeed * 6.2831) * 0.05 * t * u;
  p += across * side * aWidth * mix(1.0, 0.4, t);
  vColor = aColor;
  vEdge = side;
  vT = t;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}
`;

const fragmentShader = /* glsl */ `
varying vec4 vColor;
varying float vEdge;
varying float vT;

void main() {
  float core = 1.0 - abs(vEdge);
  // Fade in from the source; only half-fade into the disc so the beam meets its glow.
  float a = core * core * vColor.a * smoothstep(0.0, 0.06, vT) * (1.0 - 0.5 * smoothstep(0.85, 1.0, vT));
  gl_FragColor = vec4(vColor.rgb, a);
}
`;

/**
 * Curved ribbons of light: hand tendrils and tractor beams. Each is a quadratic
 * Bézier strip bent and faced toward the viewer on the GPU, and all of them share
 * one instanced draw call.
 */
export class Beams {
  readonly mesh: Mesh;
  private readonly geometry = new InstancedBufferGeometry();
  private readonly material: ShaderMaterial;
  private readonly start: InstancedBufferAttribute;
  private readonly ctrl: InstancedBufferAttribute;
  private readonly end: InstancedBufferAttribute;
  private readonly color: InstancedBufferAttribute;
  private readonly width: InstancedBufferAttribute;
  private readonly seed: InstancedBufferAttribute;
  private readonly attributes: InstancedBufferAttribute[];
  private count = 0;

  constructor() {
    const verts = (SEGMENTS + 1) * 2;
    const t = new Float32Array(verts);
    const side = new Float32Array(verts);
    for (let i = 0; i <= SEGMENTS; i++) {
      t[i * 2] = t[i * 2 + 1] = i / SEGMENTS;
      side[i * 2] = -1;
      side[i * 2 + 1] = 1;
    }
    const index: number[] = [];
    for (let i = 0; i < SEGMENTS; i++) {
      const a = i * 2;
      index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    const g = this.geometry;
    g.setIndex(index);
    g.setAttribute('position', new BufferAttribute(new Float32Array(verts * 3), 3));
    g.setAttribute('t', new BufferAttribute(t, 1));
    g.setAttribute('side', new BufferAttribute(side, 1));
    const inst = (size: number) => new InstancedBufferAttribute(new Float32Array(MAX_BEAMS * size), size);
    g.setAttribute('aStart', (this.start = inst(3)));
    g.setAttribute('aCtrl', (this.ctrl = inst(3)));
    g.setAttribute('aEnd', (this.end = inst(3)));
    g.setAttribute('aColor', (this.color = inst(4)));
    g.setAttribute('aWidth', (this.width = inst(1)));
    g.setAttribute('aSeed', (this.seed = inst(1)));
    g.instanceCount = 0;
    this.attributes = [this.start, this.ctrl, this.end, this.color, this.width, this.seed];

    this.material = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: { uTime: { value: 0 } },
      blending: AdditiveBlending,
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
    });
    this.mesh = new Mesh(g, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
  }

  begin(): void {
    this.count = 0;
  }

  add(start: Vec3, ctrl: Vec3, end: Vec3, rgb: readonly number[], alpha: number, width: number, seed: number): void {
    if (this.count >= MAX_BEAMS) return;
    const i = this.count++;
    this.start.setXYZ(i, start.x, start.y, start.z);
    this.ctrl.setXYZ(i, ctrl.x, ctrl.y, ctrl.z);
    this.end.setXYZ(i, end.x, end.y, end.z);
    this.color.setXYZW(i, rgb[0]!, rgb[1]!, rgb[2]!, alpha);
    this.width.setX(i, width);
    this.seed.setX(i, seed);
  }

  finish(time: number): void {
    this.geometry.instanceCount = this.count;
    this.mesh.visible = this.count > 0;
    if (this.count === 0) return;
    for (const attr of this.attributes) {
      attr.clearUpdateRanges();
      attr.addUpdateRange(0, this.count * attr.itemSize);
      attr.needsUpdate = true;
    }
    this.material.uniforms.uTime!.value = time;
  }
}
