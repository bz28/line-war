/** Headless runner: one full match with the real sim and bots, observed by the Collector. */
import { createBots as defaultCreateBots, type BotBrain, type BotOptions } from '@line-war/bots';
import { LEVELS, levelById, type LevelDef } from '@line-war/content';
import { createMatch, makeConfig, NO_INPUT, step, type MatchConfig, type MatchInputs, type MatchState } from '@line-war/sim';
import { Collector } from './collector';
import { deriveSeed } from './seeds';
import type { ConfigOverrides, MatchRecord, TuningOverrides } from './types';

export type CreateBots = (slots: readonly (BotOptions | null)[]) => (BotBrain | null)[];

/** Level ids botsim can run (the `--arena` flag takes one of these). */
export const ARENAS: readonly string[] = LEVELS.map((l) => l.id);

/** The level (map + menu + ingredient rules) for an id. */
export const arenaById = (id: string): LevelDef => levelById(id);

export interface RunMatchOptions {
  /** Level to play (map, menu, ingredients). Default: Night Market. */
  arena?: LevelDef;
  seed: number;
  /** Index = PlayerId. null = no controller (the player stands still, like an empty or AFK slot). */
  slots: readonly (BotOptions | null)[];
  config?: ConfigOverrides;
  tuning?: TuningOverrides;
  /** Hard stop; the record is flagged `runaway` if the match has not ended. Default: 1.5 × the longest possible match. */
  maxTicks?: number;
  /** Seconds without movement or grab/work/throw (while tickets exist) before a bot is flagged stuck. Default 10. */
  stuckSeconds?: number;
  /** Bot factory (default: @line-war/bots createBots). */
  createBots?: CreateBots;
}

export function buildConfig(seed: number, config: ConfigOverrides = {}, tuning: TuningOverrides = {}): MatchConfig {
  return makeConfig({ ...config, seed, tuning });
}

/** Longest a match can last: bestOf rounds of play + intermission, plus the final tick. */
export function longestMatchTicks(config: MatchConfig): number {
  const t = config.tuning;
  return Math.ceil(config.bestOf * (config.roundSeconds + t.intermissionSeconds) * t.tickRate) + 2;
}

/** Bots get their own seed derived from the match seed and slot, unless the slot sets one. */
const seededSlots = (seed: number, slots: readonly (BotOptions | null)[]): (BotOptions | null)[] =>
  slots.map((s, i) => (s ? { ...s, seed: s.seed ?? deriveSeed(seed, 'bot', i) } : null));

export function runMatch(opts: RunMatchOptions): MatchRecord {
  const config = buildConfig(opts.seed, opts.config, opts.tuning);
  const level = opts.arena ?? LEVELS[0]!;
  const state: MatchState = createMatch({ arena: level.arena, recipes: level.recipes, ingredients: level.ingredients, charms: level.charms, charmsPerRound: opts.tuning?.charmsPerRound ?? level.charmsPerRound, tuning: { ...level.tuning, ...opts.tuning }, config });
  const slots = [0, 1, 2, 3].map((i) => opts.slots[i] ?? null);
  const brains = (opts.createBots ?? defaultCreateBots)(seededSlots(opts.seed, slots));
  const collector = new Collector(state, {
    seed: opts.seed,
    botSlots: slots.map((s) => s !== null),
    stuckSeconds: opts.stuckSeconds ?? 10,
  });
  const maxTicks = opts.maxTicks ?? Math.ceil(longestMatchTicks(config) * 1.5);

  while (state.round.phase !== 'matchOver' && state.tick < maxTicks) {
    const inputs = [0, 1, 2, 3].map((i) => brains[i]?.decide(state, i as 0 | 1 | 2 | 3) ?? NO_INPUT) as MatchInputs;
    step(state, inputs);
    collector.observe(state, inputs);
  }

  return {
    seed: opts.seed,
    ticks: state.tick,
    runaway: state.round.phase !== 'matchOver',
    winner: state.winner,
    roundsWon: [state.teams[0].roundsWon, state.teams[1].roundsWon],
    totalScores: [state.totalScores[0], state.totalScores[1]],
    rounds: collector.rounds,
    stuck: collector.stuck,
  };
}
