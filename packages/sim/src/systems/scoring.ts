/**
 * OWNER: rules track (PR "sim-rules").
 * Points for a delivery (base x freshness x heat x phase multiplier + tip) and Heat tiers.
 */
import type { MatchState, PlateItem, TeamId, Ticket } from '../types';

export function scoreDelivery(_state: MatchState, _team: TeamId, _ticket: Ticket, _plate: PlateItem): number {
  // TODO(sim-rules)
  return 0;
}

/** A mistake (only burning food, for now) drops the team one Heat tier: the clean streak is set to that tier's threshold. */
export function registerMistake(_state: MatchState, _team: TeamId): void {
  // TODO(sim-rules)
}
