/**
 * OWNER: kitchen track (PR "sim-kitchen").
 * Grab / drop / place / throw / work (chop, wash, extinguish) against the faced tile.
 * - Grabbing from a market crate goes through takeFromCrate() in market.ts.
 * - Placing a plate on your team's pass goes through deliverPlate() in tickets.ts.
 * Players may only use stations their team owns (tileOwner) or market tiles.
 */
import type { MatchInputs, MatchState } from '../types';

export function handleInteractions(_state: MatchState, _inputs: MatchInputs): void {
  // TODO(sim-kitchen)
}
