import { CanvasTexture, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace } from 'three';
import type { PlayFrame } from '../sim/comfort';

const W = 768;
const H = 256;
const MATTE = 'rgba(8, 6, 22, 0.84)';
/** Floor circles showing frame headroom. */
const PIPS = 5;

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
    // The face is loaded by the page's CSS; ask again here in case the panel draws first.
    void document.fonts?.load('italic 600 32px Kanit');
    void document.fonts?.load('italic 500 26px Kanit');
  }

  /** World-locked, not head-locked: head-locked panels are uncomfortable. */
  place(frame: PlayFrame): void {
    const { anchor: a, forward: f, right: r } = frame;
    this.mesh.position.set(a.x + f.x * 0.95 - r.x * 0.42, a.y - 0.36, a.z + f.z * 0.95 - r.z * 0.42);
    this.mesh.lookAt(a.x, a.y, a.z);
  }

  /**
   * Redraws at most 4 times a second; text rendering isn't free.
   * `headroom` is measured over target frame rate (0–1) where the target is known.
   */
  draw(now: number, lines: readonly string[], headroom: number | null = null): void {
    if (now < this.nextDraw) return;
    this.nextDraw = now + 0.25;
    const g = this.ctx;
    g.clearRect(0, 0, W, H);
    // A feathered matte, like the screen UI: no outline, no corners.
    g.shadowColor = MATTE;
    g.shadowBlur = 26;
    g.fillStyle = MATTE;
    g.fillRect(30, 30, W - 60, H - 60);
    g.shadowBlur = 0;
    g.textBaseline = 'top';
    const pipsWidth = headroom === null ? 0 : PIPS * 46;
    lines.forEach((line, i) => {
      g.font = `italic ${i === 0 ? 600 : 500} ${i === 0 ? 32 : 26}px Kanit, "Trebuchet MS", sans-serif`;
      const y = 24 + i * 52;
      const width = W - 56 - (i === 0 ? pipsWidth : 0);
      // Character-generator type: a hard offset shadow under credit blue.
      g.fillStyle = 'rgba(3, 5, 28, 0.9)';
      g.fillText(line, 30, y + 3, width);
      g.fillStyle = i === 0 ? '#e6eeff' : i === lines.length - 1 ? '#8298cf' : '#b4ccff';
      g.fillText(line, 28, y, width);
    });
    if (headroom !== null) {
      const lit = Math.round(Math.min(1, Math.max(0, headroom)) * PIPS);
      for (let i = 0; i < PIPS; i++) {
        g.fillStyle = i < lit ? '#e25a2c' : '#4a1c12';
        g.beginPath();
        g.ellipse(W - 46 - (PIPS - 1 - i) * 46, 42, 18, 8, 0, 0, Math.PI * 2);
        g.fill();
      }
    }
    this.texture.needsUpdate = true;
  }
}
