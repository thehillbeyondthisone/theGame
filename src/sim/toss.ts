import type { PlayFrame } from './comfort';
import { hoopCenterAt } from './hoop';
import { tuning } from './tuning';
import { type Vec3, clamp, copy, distance, dot, length, lerp, normalize, scale, set, sub, vec3 } from './vec3';
import type { World } from './world';

/**
 * Turns a finger flick (screen heights per second, +x right, +y up) into a launch
 * velocity: a harder flick flies farther, and a flick that leans sideways throws
 * that way. Returns false for a let-go that isn't an upward flick.
 */
export function flickToToss(out: Vec3, flickX: number, flickY: number, frame: PlayFrame): boolean {
  const t = tuning.toss;
  const flick = Math.sqrt(flickX * flickX + flickY * flickY);
  if (flickY < t.minRise || flick < t.minFlick) return false;
  const side = clamp(flickX / flickY, -t.maxSide, t.maxSide) * t.sideGain;
  const { forward, right } = frame;
  normalize(out, set(out, forward.x + right.x * side, 0, forward.z + right.z * side));
  out.y = t.loft;
  scale(out, normalize(out, out), Math.min(t.speedBase + t.speedGain * flick, t.maxSpeed));
  return true;
}

const center = vec3();
const ideal = vec3();
const nearest = vec3();
const arrival = vec3();

/**
 * Writes the launch velocity for a flick of `vel`: near-misses are drawn part of
 * the way toward the closest arc that drops into the mouth, wild throws are left
 * alone. Leads a swaying mouth, since the arc is solved for where it will be.
 */
export function assistToss(out: Vec3, vel: Vec3, world: World, dt: number): Vec3 {
  const t = tuning.toss;
  const g = t.gravity;
  const from = world.disc.pos;
  let error = Infinity;
  for (let n = 36; n <= 144; n += 3) {
    hoopCenterAt(center, world.hoop, world.frame, world.step + n - 1);
    // The velocity that lands on the center after exactly n simulation steps.
    scale(ideal, sub(ideal, center, from), 1 / (n * dt));
    ideal.y += (g * dt * (n + 1)) / 2;
    // It must arrive through the mouth's open side.
    copy(arrival, ideal).y -= g * dt * n;
    if (dot(arrival, world.hoop.normal) >= 0) continue;
    const e = distance(ideal, vel);
    if (e < error) {
      error = e;
      copy(nearest, ideal);
    }
  }
  if (error === Infinity) return copy(out, vel);
  const help = t.assist * clamp((t.assistFade - error / length(nearest)) / (t.assistFade - t.assistFull), 0, 1);
  return lerp(out, vel, nearest, help);
}
