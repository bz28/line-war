import { isPlaying } from './match';
import { updateCharms } from './systems/charms';
import { handleInteractions } from './systems/interact';
import { updateFloorItems } from './systems/items';
import { updateMarket } from './systems/market';
import { updateMovement } from './systems/movement';
import { updateRound } from './systems/round';
import { updateStations } from './systems/stations';
import { updateTickets } from './systems/tickets';
import type { MatchInputs, MatchState } from './types';

/**
 * Advance the match by exactly one tick. Mutates `state` in place and returns it.
 * Deterministic: same state + same inputs => same result. No Date, no Math.random.
 *
 * The system order is part of the contract. Change it only in a dedicated PR.
 */
export function step(state: MatchState, inputs: MatchInputs): MatchState {
  state.events = [];
  state.tick++;
  updateRound(state);
  if (isPlaying(state)) {
    updateMovement(state, inputs);
    handleInteractions(state, inputs);
    updateStations(state);
    updateFloorItems(state);
    updateMarket(state);
    updateTickets(state);
    updateCharms(state);
  }
  return state;
}
