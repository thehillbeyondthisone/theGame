export interface ScreenAim {
  x: number;
  y: number;
  aligned: boolean;
}

/** Support both touching the mouth and steering with the marker above a thumb. */
export function touchAim(x: number, y: number, mouthX: number, mouthY: number, width: number, height: number): ScreenAim {
  const fingerGap = Math.hypot(x - mouthX, y - mouthY);
  y -= Math.min(52, height * 0.09);
  const gap = Math.hypot(x - mouthX, y - mouthY);
  const innerRadius = Math.min(28, width * 0.065);
  const outerRadius = innerRadius * 2;
  // A stable center aim lets the approach finish despite small thumb movements.
  // Merely passing nearby still steers freely; the player must hold to sink.
  if (fingerGap <= innerRadius || gap <= innerRadius) {
    return { x: mouthX, y: mouthY, aligned: true };
  }
  if (gap < outerRadius) {
    const assist = (outerRadius - gap) / (outerRadius - innerRadius);
    x += (mouthX - x) * assist;
    y += (mouthY - y) * assist;
  }
  return { x, y, aligned: false };
}
