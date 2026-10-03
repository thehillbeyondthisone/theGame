/** The episode baseline: red-orange discs and field, violet funnels. */
export const PALETTE = {
  amber: 0xff542c,
  gold: 0xff7740,
  ember: 0xc33324,
  cream: 0xffbd94,
  disc: 0xe83c28,
  discEdge: 0xff613a,
  funnel: 0x765ced,
  funnelHighlight: 0xb99cf6,
  funnelShadow: 0x21135e,
  field: 0xd3482e,
  cyan: 0x5ee7ff,
  night: 0x100b14,
  grid: 0x34151a,
} as const;

/** 0xRRGGBB → [r, g, b] in 0..1, for shader attributes. */
export function rgb(hex: number): [number, number, number] {
  return [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255];
}
