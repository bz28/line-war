/**
 * OWNER: bots track. Scripted bot players.
 *
 * Contract (used by apps/client and tools/botsim):
 * - Bots read the full MatchState but must only use information a human on their team could see
 *   (e.g. a Critic ticket with visibleTo = other team is invisible to them until revealed).
 * - Bots never mutate MatchState. They are deterministic: same state history + seed => same inputs.
 * - `createBots` builds every bot of a match at once so crewmates can share a plan.
 */
import { NO_INPUT, type MatchState, type PlayerId, type PlayerInput } from '@line-war/sim';

export type BotDifficulty = 'easy' | 'normal' | 'hard';

export interface BotOptions {
  difficulty: BotDifficulty;
  /** 0..1 fine-grained skill override (botsim uses this to model e.g. a 10% faster crew). */
  skill?: number;
  /** Seed for the bot's own RNG (never touches the sim's rng). */
  seed?: number;
}

/** A bot decides one tick of input from the match state. Called once per tick, in tick order. */
export interface BotBrain {
  decide(state: MatchState, self: PlayerId): PlayerInput;
}

export const idleBot: BotBrain = { decide: () => NO_INPUT };

/** One entry per player slot (index = PlayerId); null = not a bot. */
export function createBots(slots: readonly (BotOptions | null)[]): (BotBrain | null)[] {
  return slots.map((s) => (s ? idleBot : null));
}
