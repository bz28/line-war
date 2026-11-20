/** Small statistics helpers. */

export interface Interval {
  lo: number;
  hi: number;
}

/**
 * Wilson score interval for a binomial proportion (successes out of n), default 95% (z = 1.96).
 * Returns [0, 1] for n = 0 (no information).
 */
export function wilson(successes: number, n: number, z = 1.96): Interval {
  if (n <= 0) return { lo: 0, hi: 1 };
  const p = successes / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const centre = (p + z2 / (2 * n)) / denom;
  const half = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denom;
  return { lo: Math.max(0, centre - half), hi: Math.min(1, centre + half) };
}

export const mean = (xs: readonly number[]): number => (xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length);

export const sum = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0);

/** Ratio with a fallback for an empty denominator. */
export const ratio = (num: number, den: number, empty = 0): number => (den === 0 ? empty : num / den);
