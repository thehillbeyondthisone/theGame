import { CanvasTexture, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace } from 'three';
import type { PlayFrame } from '../sim/comfort';

const W = 768;
const H = 256;

/** Rolling one-second frame statistics. */
export class FrameStats {
  fps = 0;
  cpuAvg = 0;
  cpuMax = 0;
  private frames = 0;
  private windowStart = -1;
  private cpuSum = 0;
  private cpuPeak = 0;

  tick(now: number, cpuMs: number): void {
    if (this.windowStart < 0) this.windowStart = now;
    this.frames++;
    this.cpuSum += cpuMs;
    this.cpuPeak = Math.max(this.cpuPeak, cpuMs);
    const span = now - this.windowStart;
    if (span >= 1) {
      this.fps = this.frames / span;
      this.cpuAvg = this.cpuSum / this.frames;
      this.cpuMax = this.cpuPeak;
      this.frames = 0;
      this.cpuSum = 0;
      this.cpuPeak = 0;
      this.windowStart = now;
    }
  }
}

/** In-headset performance display: a small panel low and to the left of play. */
export class Hud {
  readonly mesh: Mesh;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly texture: CanvasTexture;
  private nextDraw = 0;

  constructor() {
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas unavailable');
    this.ctx = ctx;
    this.texture = new CanvasTexture(canvas);
    this.texture.colorSpace = SRGBColorSpace;
    this.mesh = new Mesh(
      new PlaneGeometry(0.36, (0.36 * H) / W),
      new MeshBasicMaterial({ map: this.texture, transparent: true, depthWrite: false }),
    );
    this.mesh.renderOrder = 10;
  }

  /** World-locked, not head-locked: head-locked panels are uncomfortable. */
  place(frame: PlayFrame): void {
    const { anchor: a, forward: f, right: r } = frame;
    this.mesh.position.set(a.x + f.x * 0.95 - r.x * 0.42, a.y - 0.36, a.z + f.z * 0.95 - r.z * 0.42);
    this.mesh.lookAt(a.x, a.y, a.z);
  }

  /** Redraws at most 4 times a second; text rendering isn't free. */
  draw(now: number, lines: readonly string[]): void {
    if (now < this.nextDraw) return;
    this.nextDraw = now + 0.25;
    const g = this.ctx;
    g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(16, 11, 25, 0.78)';
    g.beginPath();
    g.roundRect(4, 4, W - 8, H - 8, 22);
    g.fill();
    g.strokeStyle = 'rgba(185, 156, 246, 0.6)';
    g.lineWidth = 3;
    g.stroke();
    g.font = '600 28px ui-monospace, "Cascadia Mono", Consolas, monospace';
    g.textBaseline = 'top';
    lines.forEach((line, i) => {
      g.fillStyle = i === 0 ? '#b99cf6' : '#eedcff';
      g.fillText(line, 28, 30 + i * 52);
    });
    this.texture.needsUpdate = true;
  }
}
