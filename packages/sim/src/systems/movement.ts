/**
 * OWNER: kitchen track (PR "sim-kitchen").
 * Movement (playerSpeed, half speed while dazed), wall/station collision, player-player
 * collision, dash (dashDistance over dashSeconds, cooldown; no dash while dazed).
 * Players can never enter tiles of the RIVAL kitchen zone (use tileOwner); the doorway blocks them.
 * When a dashing player touches a rival, call tryKnock() from market.ts.
 */
import type { MatchInputs, MatchState } from '../types';

export function updateMovement(_state: MatchState, _inputs: MatchInputs): void {
  // TODO(sim-kitchen)
}
