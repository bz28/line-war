/** Headless match runner for bot tests (and quick stats while tuning bots). */
import { INGREDIENTS, NIGHT_MARKET, RECIPES } from '@line-war/content';
import {
  createMatch,
  makeConfig,
  NO_INPUT,
  step,
  type MatchConfig,
  type MatchInputs,
  type MatchState,
  type PlayerId,
  type PlayerInput,
  type TeamId,
  type Tuning,
} from '@line-war/sim';
import { createBotsDebug, type BotOptions } from '../src';
import type { Bot } from '../src/bot';

export type Slots = readonly (BotOptions | null)[];

export interface RunOptions {
  seed: number;
  slots: Slots;
  config?: Partial<Omit<MatchConfig, 'tuning'>> & { tuning?: Partial<Tuning> };
  /** Safety cap on ticks (default: enough for the configured match). */
  maxTicks?: number;
  /** Seed passed to each bot (default: derived from the match seed). */
  botSeed?: number;
  onTick?: (state: MatchState, inputs: MatchInputs, bots: (Bot | null)[]) => void;
  /** Reuse brains from an earlier match instead of creating new ones from `slots`. */
  brains?: ReturnType<typeof createBotsDebug>;
}

export interface RoundStats {
  scores: [number, number];
  delivered: [number, number];
  byRecipe: [Record<string, number>, Record<string, number>];
  knocks: [number, number];
  burnt: [number, number];
  fires: [number, number];
  expired: number;
}

export interface MatchStats {
  rounds: RoundStats[];
  winner: TeamId | null;
  matchOver: boolean;
  ticks: number;
  /** Longest stretch (seconds) each player stood still with no useful input while tickets were up. */
  maxIdleSeconds: number[];
  /** Wall-clock µs spent in bot decide() per bot per tick. */
  usPerBotTick: number;
  final: MatchState;
}

const emptyRound = (): RoundStats => ({
  scores: [0, 0],
  delivered: [0, 0],
  byRecipe: [{}, {}],
  knocks: [0, 0],
  burnt: [0, 0],
  fires: [0, 0],
  expired: 0,
});

export function newMatch(seed: number, config: RunOptions['config'] = {}): MatchState {
  return createMatch({ arena: NIGHT_MARKET, recipes: RECIPES, ingredients: INGREDIENTS, config: makeConfig({ ...config, seed }) });
}

export function runMatch(opts: RunOptions): MatchStats {
  const state = newMatch(opts.seed, opts.config);
  const slots = opts.slots.map((s, i) => (s ? { ...s, seed: s.seed ?? (opts.botSeed ?? opts.seed) * 31 + i } : null));
  const { brains: bots, bots: handles } = opts.brains ?? createBotsDebug(slots);
  const cfg = state.config;
  const roundTicks = cfg.roundSeconds * cfg.tuning.tickRate + cfg.tuning.intermissionSeconds * cfg.tuning.tickRate + 10;
  const maxTicks = opts.maxTicks ?? roundTicks * cfg.bestOf + 100;
  const rounds: RoundStats[] = [emptyRound()];
  const idle = [0, 0, 0, 0];
  const maxIdle = [0, 0, 0, 0];
  const last = state.players.map((p) => ({ x: p.pos.x, y: p.pos.y }));
  let botTime = 0;
  let botCalls = 0;
  const now = (): number => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const teamOfPid = (p: number): TeamId => (p < 2 ? 0 : 1);

  while (state.round.phase !== 'matchOver' && state.tick < maxTicks) {
    const t0 = now();
    const inputs = [0, 1, 2, 3].map((i): PlayerInput => bots[i]?.decide(state, i as PlayerId) ?? NO_INPUT) as MatchInputs;
    botTime += now() - t0;
    botCalls += bots.filter(Boolean).length;
    opts.onTick?.(state, inputs, handles);
    const playing = ['service', 'rush', 'lastCall'].includes(state.round.phase);
    const ticketsUp = state.tickets.length > 0;
    for (const p of state.players) {
      const moved = Math.abs(p.pos.x - last[p.id]!.x) + Math.abs(p.pos.y - last[p.id]!.y) > 1e-4;
      const inp = inputs[p.id];
      const useful = inp.grab || inp.dash || inp.throw || p.working;
      if (playing && ticketsUp && !moved && !useful) {
        idle[p.id]!++;
        maxIdle[p.id] = Math.max(maxIdle[p.id]!, idle[p.id]!);
      } else idle[p.id] = 0;
      last[p.id] = { x: p.pos.x, y: p.pos.y };
    }
    const rIdx = state.round.index;
    stepAndRecord(state, inputs, rounds, teamOfPid);
    if (state.round.index !== rIdx) rounds.push(emptyRound());
  }
  return {
    rounds: rounds.filter((r, i) => i < state.round.index + 1),
    winner: state.winner,
    matchOver: state.round.phase === 'matchOver',
    ticks: state.tick,
    maxIdleSeconds: maxIdle.map((t) => t / cfg.tuning.tickRate),
    usPerBotTick: botCalls ? (botTime * 1000) / botCalls : 0,
    final: state,
  };
}


function stepAndRecord(state: MatchState, inputs: MatchInputs, rounds: RoundStats[], teamOfPid: (p: number) => TeamId): void {
  step(state, inputs);
  const r = rounds[rounds.length - 1]!;
  for (const ev of state.events) {
    switch (ev.type) {
      case 'delivered':
        r.delivered[ev.team]++;
        r.byRecipe[ev.team][ev.recipe] = (r.byRecipe[ev.team][ev.recipe] ?? 0) + 1;
        break;
      case 'knock':
        r.knocks[teamOfPid(ev.by)]++;
        break;
      case 'burnt':
      case 'fireStart': {
        const owner = state.arena.owners[ev.tile];
        if (owner === null || owner === undefined) break;
        const team = (state.round.swapped ? 1 - owner : owner) as TeamId;
        if (ev.type === 'burnt') r.burnt[team]++;
        else r.fires[team]++;
        break;
      }
      case 'ticketExpired':
        r.expired++;
        break;
      case 'roundEnd':
        r.scores = [ev.scores[0], ev.scores[1]];
        break;
      default:
        break;
    }
  }
}

export const bot = (difficulty: BotOptions['difficulty'], skill?: number): BotOptions => (skill === undefined ? { difficulty } : { difficulty, skill });

export function summarize(s: MatchStats): string {
  return s.rounds
    .map(
      (r, i) =>
        `r${i}: score ${r.scores[0]}-${r.scores[1]} served ${r.delivered[0]}-${r.delivered[1]} knocks ${r.knocks[0]}-${r.knocks[1]} burnt ${r.burnt[0]}-${r.burnt[1]} fires ${r.fires[0]}-${r.fires[1]} expired ${r.expired} ` +
        `A${JSON.stringify(r.byRecipe[0])} B${JSON.stringify(r.byRecipe[1])}`,
    )
    .join('\n') + `\nidle max ${s.maxIdleSeconds.map((x) => x.toFixed(1)).join(',')}  ${s.usPerBotTick.toFixed(1)}us/bot-tick winner ${s.winner}`;
}
