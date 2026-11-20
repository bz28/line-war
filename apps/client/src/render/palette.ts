import type { TeamId } from '@line-war/sim';
import { TEAMS } from '../art/tokens';

/** Colour helpers and team lookups for the world renderer. Every colour comes from art/tokens.ts. */

export const TEAM_COLORS: Record<TeamId, string> = { 0: TEAMS[0].main, 1: TEAMS[1].main };
export const TEAM_NAMES: Record<TeamId, string> = { 0: TEAMS[0].name, 1: TEAMS[1].name };

const parse = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1, 7), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const toHex = (r: number, g: number, b: number): string =>
  `#${((1 << 24) | (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b)).toString(16).slice(1)}`;
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** Linear blend of two #rrggbb colours (t = 0 -> a, 1 -> b). */
export function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = parse(a);
  const [r2, g2, b2] = parse(b);
  const k = clamp01(t);
  return toHex(r1 + (r2 - r1) * k, g1 + (g2 - g1) * k, b1 + (b2 - b1) * k);
}

/** Darken a #rrggbb colour by `amount` (0..1). */
export function darken(hex: string, amount: number): string {
  const [r, g, b] = parse(hex);
  const f = clamp01(1 - amount);
  return toHex(r * f, g * f, b * f);
}

/** #rrggbb + alpha (0..1) -> rgba() string. */
export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = parse(hex);
  return `rgba(${r},${g},${b},${clamp01(alpha)})`;
}
