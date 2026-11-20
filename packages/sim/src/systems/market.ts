/**
 * OWNER: rules track (PR "sim-rules").
 * Market stock (crates always hold marketExtraStock + the number of board tickets that need
 * that ingredient), crate takes, and dash knocks (pop item knockPopDistance in the dash
 * direction, daze the victim, grant knock immunity).
 */
import type { IngredientItem, MatchState, PlayerId } from '../types';

export function updateMarket(_state: MatchState): void {
  // TODO(sim-rules)
}

/** Take one item from a crate. Returns null when out of stock. */
export function takeFromCrate(_state: MatchState, _tile: number): IngredientItem | null {
  // TODO(sim-rules)
  return null;
}

/**
 * Called by movement.ts when a dashing player touches another player.
 * Knocks only apply to rivals, inside the market zone, when the victim is holding an
 * item and is not knock-immune. The item becomes a FloorItem anyone can pick up.
 * Returns true if a knock happened.
 */
export function tryKnock(_state: MatchState, _by: PlayerId, _victim: PlayerId): boolean {
  // TODO(sim-rules)
  return false;
}
