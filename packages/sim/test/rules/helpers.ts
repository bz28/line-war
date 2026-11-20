/** Helpers for the rules-track tests (rounds, tickets, scoring, market). */
import { createMatch, makeConfig, step, type Food, type MatchState, type PlateItem, type PlayerId, type RecipeDef, type SimEvent, type Ticket } from '../../src';
import { IDLE, TEST_ARENA, TEST_INGREDIENTS } from '../fixtures';

export const SALAD: RecipeDef = {
  id: 'salad',
  name: 'Salad',
  ingredients: [
    { kind: 'lettuce', state: 'chopped' },
    { kind: 'tomato', state: 'chopped' },
  ],
  premium: false,
  baseValue: 40,
  weight: 3,
};
export const STEAK: RecipeDef = {
  id: 'steak',
  name: 'Steak',
  ingredients: [
    { kind: 'steak', state: 'cooked' },
    { kind: 'lettuce', state: 'chopped' },
  ],
  premium: true,
  baseValue: 100,
  weight: 1,
};
export const DOUBLE_STEAK: RecipeDef = {
  id: 'doubleSteak',
  name: 'Double steak',
  ingredients: [
    { kind: 'steak', state: 'cooked' },
    { kind: 'steak', state: 'cooked' },
  ],
  premium: true,
  baseValue: 150,
  weight: 1,
};
export const RULE_RECIPES: RecipeDef[] = [SALAD, STEAK];

export type ConfigOverrides = Parameters<typeof makeConfig>[0];

export function newRulesMatch(overrides: ConfigOverrides = {}, recipes: RecipeDef[] = RULE_RECIPES): MatchState {
  return createMatch({ arena: TEST_ARENA, recipes, ingredients: TEST_INGREDIENTS, config: makeConfig(overrides) });
}

/** Step n ticks with idle inputs; returns every event emitted. */
export function stepN(state: MatchState, n: number): SimEvent[] {
  const out: SimEvent[] = [];
  for (let i = 0; i < n; i++) {
    step(state, IDLE);
    out.push(...state.events);
  }
  return out;
}

/** Step until pred holds (checked after each step). Throws after max steps. Returns events. */
export function stepUntil(state: MatchState, pred: (s: MatchState) => boolean, max = 100_000): SimEvent[] {
  const out: SimEvent[] = [];
  for (let i = 0; i < max; i++) {
    step(state, IDLE);
    out.push(...state.events);
    if (pred(state)) return out;
  }
  throw new Error(`stepUntil: condition not met in ${max} steps`);
}

/** Step until round.tick === roundTick (in the current round). */
export const stepToRoundTick = (state: MatchState, roundTick: number): SimEvent[] =>
  stepUntil(state, (s) => s.round.tick === roundTick);

export const ofType = <T extends SimEvent['type']>(events: SimEvent[], type: T): Extract<SimEvent, { type: T }>[] =>
  events.filter((e): e is Extract<SimEvent, { type: T }> => e.type === type);

export const SALAD_FOOD: Food[] = SALAD.ingredients.map((f) => ({ ...f }));
export const STEAK_FOOD: Food[] = STEAK.ingredients.map((f) => ({ ...f }));

export function plate(state: MatchState, contents: Food[], extra: Partial<PlateItem> = {}): PlateItem {
  return { id: state.nextId++, type: 'plate', dirty: false, contents: contents.map((f) => ({ ...f })), platedAtTick: state.tick, cold: false, ...extra };
}

/** Put a ticket on the board directly (bypasses spawning). */
export function addTicket(state: MatchState, recipe: RecipeDef, extra: Partial<Ticket> = {}): Ticket {
  const life = state.config.tuning.ticketLifetimeSeconds * state.config.tuning.tickRate;
  const t: Ticket = {
    id: state.nextId++,
    recipe: recipe.id,
    spawnTick: state.tick,
    expireTick: state.tick + life,
    baseValue: recipe.baseValue,
    isCritic: false,
    visibleTo: null,
    revealAllAtTick: null,
    ...extra,
  };
  state.tickets.push(t);
  return t;
}

/**
 * Stand a player in front of their team's pass in TEST_ARENA, facing it.
 * Player 0 -> pass (1,3); player 2 -> pass (7,3).
 */
export function facePass(state: MatchState, player: PlayerId): void {
  const p = state.players[player];
  p.pos = player < 2 ? { x: 1.5, y: 2.5 } : { x: 7.5, y: 2.5 };
  p.facing = { x: 0, y: 1 };
}

export const ticks = (state: MatchState, seconds: number): number => Math.round(seconds * state.config.tuning.tickRate);
