/**
 * OWNER: rules track (PR "sim-rules").
 * Round clock and phases: prep -> service -> rush -> lastCall -> roundOver -> next round / matchOver.
 * Handles critic timing hand-off to tickets, kitchen swap and full reset between rounds.
 */
import type { MatchState } from '../types';

export function updateRound(state: MatchState): void {
  // TODO(sim-rules): real phase logic. Minimal clock so the foundation runs.
  state.round.tick++;
}
