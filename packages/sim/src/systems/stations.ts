/**
 * OWNER: kitchen track (PR "sim-kitchen").
 * Per-tick station updates: cooking, burning, fire start/spread, dirty plate returns.
 * When food burns, call registerMistake() from scoring.ts for the owning team.
 */
import type { MatchState } from '../types';

export function updateStations(_state: MatchState): void {
  // TODO(sim-kitchen)
}
