import { type Vec3, normalize, set, vec3 } from '../sim/vec3';

/**
 * One Euro filter (Casiez, Roussel & Vogel, CHI 2012): heavy smoothing when the
 * signal moves slowly, little lag when it moves fast. Ideal for a head "cursor".
 */
export class OneEuro {
  private x = 0;
  private dx = 0;
  private primed = false;

  constructor(
    public minCutoff: number,
    public beta: number,
    public dCutoff: number,
  ) {}

  filter(value: number, dt: number): number {
    if (!this.primed || dt <= 0) {
      this.x = value;
      this.dx = 0;
      this.primed = true;
      return value;
    }
    const d = (value - this.x) / dt;
    this.dx += smoothing(dt, this.dCutoff) * (d - this.dx);
    const cutoff = this.minCutoff + this.beta * Math.abs(this.dx);
    this.x += smoothing(dt, cutoff) * (value - this.x);
    return this.x;
  }

  reset(): void {
    this.primed = false;
  }
}

function smoothing(dt: number, cutoff: number): number {
  const tau = 1 / (2 * Math.PI * cutoff);
  return 1 / (1 + tau / dt);
}

/** Filters a unit direction component-wise and renormalizes it. */
export class OneEuroDirection {
  private readonly fx: OneEuro;
  private readonly fy: OneEuro;
  private readonly fz: OneEuro;
  readonly value: Vec3 = vec3(0, 0, -1);

  constructor(minCutoff: number, beta: number, dCutoff: number) {
    this.fx = new OneEuro(minCutoff, beta, dCutoff);
    this.fy = new OneEuro(minCutoff, beta, dCutoff);
    this.fz = new OneEuro(minCutoff, beta, dCutoff);
  }

  set minCutoff(v: number) {
    this.fx.minCutoff = this.fy.minCutoff = this.fz.minCutoff = v;
  }

  filter(dir: Vec3, dt: number): Vec3 {
    set(this.value, this.fx.filter(dir.x, dt), this.fy.filter(dir.y, dt), this.fz.filter(dir.z, dt));
    return normalize(this.value, this.value);
  }

  reset(): void {
    this.fx.reset();
    this.fy.reset();
    this.fz.reset();
  }
}
