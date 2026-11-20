import type { MatchState } from './types';

/** mulberry32 step. Deterministic: same seed => same sequence on every machine. */
export function nextRandom(state: MatchState): number {
  let t = (state.rngState = (state.rngState + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function randomInt(state: MatchState, maxExclusive: number): number {
  return Math.floor(nextRandom(state) * maxExclusive);
}

/** Pick an index by weight. Returns -1 for an empty or all-zero list. */
export function weightedIndex(state: MatchState, weights: number[]): number {
  const total = weights.reduce((a, b) => a + Math.max(0, b), 0);
  if (total <= 0) return -1;
  let r = nextRandom(state) * total;
  for (let i = 0; i < weights.length; i++) {
    r -= Math.max(0, weights[i] ?? 0);
    if (r < 0) return i;
  }
  return weights.length - 1;
}
