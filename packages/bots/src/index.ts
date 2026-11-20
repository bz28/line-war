/**
 * OWNER: bots track. Scripted bot players.
 *
 * Contract (used by apps/client and tools/botsim):
 * - Bots read the full MatchState but must only use information a human on their team could see
 *   (e.g. a Critic ticket with visibleTo = other team is invisible to them until revealed).
 * - Bots never mutate MatchState. They are deterministic: same state history + seed => same inputs.
 * - `createBots` builds every bot of a match at once so crewmates can share a plan.
 */
import { NO_INPUT, teamOf, type MatchState, type PlayerId, type PlayerInput } from '@line-war/sim';
import { Bot } from './bot';
import { Crew } from './crew';
import { BotRng, mixSeed } from './rng';
import { resolveSkill, skillParams } from './skill';

export { DIFFICULTY_SKILL, resolveSkill, skillParams, type SkillParams } from './skill';
export { navFor, Nav, type Access } from './nav';

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
  const seedOf = (i: number): number => slots[i]?.seed ?? 0x5eed + i * 7919;
  const crews = [0, 1].map((team) => {
    const mates = slots.map((_, i) => i).filter((i) => slots[i] && teamOf(i as PlayerId) === team);
    return new Crew(team as 0 | 1, mixSeed(mates.reduce((a, i) => a ^ seedOf(i), 0x1234 + team), 99));
  });
  const bots = slots.map((s, i) => {
    if (!s) return null;
    const id = i as PlayerId;
    const skill = resolveSkill(s.difficulty, s.skill);
    const crew = crews[teamOf(id)]!;
    crew.addMember(id, skill);
    return new Bot(id, crew, skillParams(skill), new BotRng(mixSeed(seedOf(i), i)));
  });
  return bots.map((b): BotBrain | null => {
    if (!b) return null;
    const brain: BotBrain = { decide: (state: MatchState, self: PlayerId): PlayerInput => (self === b.id ? b.decide(state) : NO_INPUT) };
    botOf.set(brain, b);
    return brain;
  });
}

const botOf = new WeakMap<BotBrain, Bot>();

/** Internal handle for tests and tools: the Bot objects behind createBots (same order). */
export function createBotsDebug(slots: readonly (BotOptions | null)[]): { brains: (BotBrain | null)[]; bots: (Bot | null)[] } {
  const brains = createBots(slots);
  return { brains, bots: brains.map((b) => (b ? botOf.get(b) ?? null : null)) };
}
