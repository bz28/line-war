/**
 * Round clock helpers shared by the rules systems (RULES §9).
 *
 * Time bases: `round.tick` is the tick within the current round (phases, critic timing).
 * Every absolute tick stored in state (ticket spawn/expire/reveal, nextTicketTick,
 * dirty plate returns, platedAtTick) is the global `state.tick`. In round 0 both coincide.
 */
import { secondsToTicks } from '../../tuning';
import type { MatchConfig, MatchState, Phase } from '../../types';

export interface RoundTimes {
  /** First round tick of service. */
  prepEnd: number;
  /** First round tick of Dinner Rush, or null when rush is disabled. */
  rushStart: number | null;
  /** First round tick of Last Call. */
  lastCallStart: number;
  /** Round tick at which the round is over. */
  roundEnd: number;
  /** Round tick at which the critic ticket is due. */
  criticAt: number;
}

export function roundTimes(config: MatchConfig): RoundTimes {
  const t = config.tuning;
  return {
    prepEnd: secondsToTicks(config, config.prepSeconds),
    rushStart: config.rushEnabled ? secondsToTicks(config, config.roundSeconds - t.rushSeconds) : null,
    lastCallStart: secondsToTicks(config, config.roundSeconds - t.lastCallSeconds),
    roundEnd: secondsToTicks(config, config.roundSeconds),
    criticAt: secondsToTicks(config, t.criticAtFraction * config.roundSeconds),
  };
}

/** Phase for a round tick. Returns 'roundOver' once the round clock has run out. */
export function phaseAt(config: MatchConfig, roundTick: number): Exclude<Phase, 'matchOver'> {
  const t = roundTimes(config);
  if (roundTick < t.prepEnd) return 'prep';
  if (roundTick >= t.roundEnd) return 'roundOver';
  if (roundTick >= t.lastCallStart) return 'lastCall';
  if (t.rushStart !== null && roundTick >= t.rushStart) return 'rush';
  return 'service';
}

/** Global tick at which the current round's tick was 0. */
export const roundStartTick = (state: MatchState): number => state.tick - state.round.tick;

/**
 * True while the Dinner Rush multiplier applies. Rush covers the final rushSeconds of the
 * round, which includes Last Call (see Tuning.rushSeconds); never when rush is disabled.
 */
export function isRushActive(state: MatchState): boolean {
  if (!state.config.rushEnabled) return false;
  return state.round.phase === 'rush' || state.round.phase === 'lastCall';
}
