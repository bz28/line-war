/**
 * OWNER: rules track (PR "sim-rules").
 * Ticket spawning (weighted recipes, max on board, rush rate, critic), expiry, and delivery.
 */
import type { MatchState, PlateItem, PlayerId } from '../types';

export function updateTickets(_state: MatchState): void {
  // TODO(sim-rules)
}

export type DeliveryResult =
  | { ok: true; ticketId: number; points: number }
  | { ok: false; reason: 'notPlaying' | 'notOwnPass' | 'noMatchingTicket' | 'dirtyOrEmpty' | 'cold' };

/**
 * Called by interact.ts when a player places a plate on their own pass.
 * On success the caller removes the plate from the player's hands; this function
 * scores it, removes the ticket, queues the dirty plate return and emits events.
 * On failure the plate stays in the player's hands and a 'serveRefused' event is emitted.
 * There is no penalty for a refused serve. A matching plate wins the OLDEST matching ticket.
 */
export function deliverPlate(_state: MatchState, _player: PlayerId, _plate: PlateItem): DeliveryResult {
  // TODO(sim-rules)
  return { ok: false, reason: 'noMatchingTicket' };
}
