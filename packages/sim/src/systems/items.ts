/**
 * OWNER: kitchen track (PR "sim-kitchen").
 * Thrown / knocked items in flight: landing on the first surface that accepts them, being
 * caught by any empty-handed player in the path (rivals included, in the market), bouncing
 * off a rival kitchen's doorway, or coming to rest on the floor. Also plates going cold
 * (plateColdSeconds after platedAtTick) wherever they are.
 */
import type { MatchState } from '../types';

export function updateFloorItems(_state: MatchState): void {
  // TODO(sim-kitchen)
}
