import { NO_INPUT, type MatchState, type PlayerId, type PlayerInput } from '@line-war/sim';

/** A bot decides one tick of input from the full (public) match state. */
export interface BotBrain {
  decide(state: MatchState, self: PlayerId): PlayerInput;
}

/** Placeholder until the bots track lands. */
export const idleBot: BotBrain = { decide: () => NO_INPUT };
