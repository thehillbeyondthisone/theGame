import { CanvasTexture, SRGBColorSpace } from 'three';

// Everything is drawn in code: no image downloads, per the size budget.

function canvas2d(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  if (!g) throw new Error('2D canvas unavailable');
  return [c, g];
}

function texture(c: HTMLCanvasElement): CanvasTexture {
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

/** A soft white glow; tint it with the material color. */
export function glowTexture(size = 128): CanvasTexture {
  const [c, g] = canvas2d(size);
  const r = size / 2;
  const grad = g.createRadialGradient(r, r, 0, r, r, r);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.18, 'rgba(255,255,255,0.6)');
  grad.addColorStop(0.45, 'rgba(255,255,255,0.14)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return texture(c);
}

/** Red-orange face with tight offset rings, matching the episode's visible disc. */
export function discFaceTexture(size = 256): CanvasTexture {
  const [c, g] = canvas2d(size);
  const r = size / 2;
  g.translate(r, r);

  const base = g.createRadialGradient(0, 0, 0, 0, 0, r);
  base.addColorStop(0, '#bd3927');
  base.addColorStop(0.22, '#a92c21');
  base.addColorStop(0.76, '#93221d');
  base.addColorStop(1, '#c43b28');
  g.fillStyle = base;
  g.beginPath();
  g.arc(0, 0, r, 0, Math.PI * 2);
  g.fill();

  g.strokeStyle = 'rgba(90, 15, 20, 0.78)';
  g.lineWidth = size * 0.017;
  for (const f of [0.20, 0.33, 0.46, 0.59, 0.72, 0.85]) {
    g.beginPath();
    // The small eccentricity makes the rings read as the source's spiral in motion.
    g.ellipse(r * 0.03 * f, -r * 0.04 * f, r * f, r * f * 0.92, 0, 0, Math.PI * 2);
    g.stroke();
  }

  g.strokeStyle = 'rgba(229, 87, 49, 0.40)';
  g.lineWidth = size * 0.010;
  for (const f of [0.27, 0.53, 0.79]) {
    g.beginPath();
    g.arc(0, 0, r * f, 0, Math.PI * 2);
    g.stroke();
  }
  return texture(c);
}
