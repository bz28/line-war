/**
 * Kitchen-track test helpers: a purpose-built arena with every station kind, plus small
 * builders for players, items and inputs.
 */
import {
  createMatch,
  makeConfig,
  NO_INPUT,
  step,
  type ArenaDef,
  type Food,
  type IngredientItem,
  type IngredientKind,
  type MatchInputs,
  type MatchState,
  type PlateItem,
  type PlayerId,
  type PlayerInput,
  type PlayerState,
  type RecipeDef,
  type StationState,
  type Vec2,
} from '../../src';
import { TEST_INGREDIENTS } from '../fixtures';

/**
 * 21×7. Kitchen0 = columns 0-7, door column 8 (rows 2-3), market 9-11 (steak crate at 10,1),
 * door column 12 (rows 2-3), kitchen1 = columns 13-20.
 *
 * Row 1, kitchen0: pantries l t b m (x1-4), counter (5,1), board (6,1), pan (7,1).
 * Row 5, kitchen0: pot (1,5), sink (2,5), plate rack (3,5), pass (4,5), trash (5,5), counters (6,5) (7,5).
 * Kitchen1 has a counter (13,1) and board (14,1).
 */
export const KITCHEN_ARENA: ArenaDef = {
  id: 'kitchen-test',
  name: 'Kitchen test',
  rows: [
    '#####################',
    '#ltbmCKP#.S.#CK.....#',
    '#...................#',
    '#...................#',
    '#.......#...#.......#',
    '#UWDXRCC#...#.......#',
    '#####################',
  ],
  legend: {
    '#': { kind: 'wall' },
    '.': { kind: 'floor' },
    C: { kind: 'counter' },
    K: { kind: 'board' },
    P: { kind: 'stove', vessel: 'pan' },
    U: { kind: 'stove', vessel: 'pot' },
    W: { kind: 'sink' },
    D: { kind: 'plates' },
    X: { kind: 'pass' },
    R: { kind: 'trash' },
    l: { kind: 'pantry', ingredient: 'lettuce' },
    t: { kind: 'pantry', ingredient: 'tomato' },
    b: { kind: 'pantry', ingredient: 'bun' },
    m: { kind: 'pantry', ingredient: 'meat' },
    S: { kind: 'crate', ingredient: 'steak' },
  },
  zones: { kitchen0: [0, 7], market: [9, 11], kitchen1: [13, 20] },
  spawns: [
    { x: 2.5, y: 3.5 },
    { x: 4.5, y: 3.5 },
    { x: 17.5, y: 3.5 },
    { x: 15.5, y: 3.5 },
  ],
};

const f = (kind: IngredientKind, state: Food['state']): Food => ({ kind, state });

/** Same menu as the Night Market content. */
export const KITCHEN_RECIPES: RecipeDef[] = [
  { id: 'salad', name: 'Salad', ingredients: [f('lettuce', 'chopped'), f('tomato', 'chopped')], premium: false, baseValue: 40, weight: 3 },
  { id: 'burger', name: 'Burger', ingredients: [f('bun', 'raw'), f('meat', 'cooked')], premium: false, baseValue: 60, weight: 3 },
  { id: 'soup', name: 'Soup', ingredients: [f('tomato', 'cooked'), f('tomato', 'cooked'), f('tomato', 'cooked')], premium: false, baseValue: 80, weight: 2 },
  { id: 'steak', name: 'Steak', ingredients: [f('steak', 'cooked'), f('lettuce', 'chopped')], premium: true, baseValue: 100, weight: 1.5 },
];

export const UP: Vec2 = { x: 0, y: -1 };
export const DOWN: Vec2 = { x: 0, y: 1 };
export const LEFT: Vec2 = { x: -1, y: 0 };
export const RIGHT: Vec2 = { x: 1, y: 0 };

/** Fresh match on the kitchen arena. Players 1-3 are parked (market bottom, kitchen1) unless `keepSpawns`. */
export function kitchenMatch(overrides: Parameters<typeof makeConfig>[0] = {}, keepSpawns = false): MatchState {
  const s = createMatch({ arena: KITCHEN_ARENA, recipes: KITCHEN_RECIPES, ingredients: TEST_INGREDIENTS, config: makeConfig(overrides) });
  if (!keepSpawns) {
    put(s, 1, 9.5, 5.5);
    put(s, 2, 19.5, 4.5);
    put(s, 3, 19.5, 2.5);
  }
  return s;
}

export const tileAtXY = (s: MatchState, x: number, y: number): number => y * s.arena.width + x;

export function stationXY(s: MatchState, x: number, y: number): StationState {
  const st = s.stations[String(tileAtXY(s, x, y))];
  if (!st) throw new Error(`no station at ${x},${y}`);
  return st;
}

export function put(s: MatchState, id: PlayerId, x: number, y: number, facing: Vec2 = UP): PlayerState {
  const p = s.players[id];
  p.pos = { x, y };
  p.facing = { ...facing };
  return p;
}

export function ingredient(s: MatchState, kind: IngredientKind, state: Food['state'] = 'raw'): IngredientItem {
  return { id: s.nextId++, type: 'ingredient', kind, state };
}

export function plate(s: MatchState, contents: Food[] = [], extra: Partial<PlateItem> = {}): PlateItem {
  return {
    id: s.nextId++,
    type: 'plate',
    dirty: false,
    contents,
    platedAtTick: contents.length > 0 ? s.tick : null,
    cold: false,
    ...extra,
  };
}

export const input = (partial: Partial<PlayerInput> = {}): PlayerInput => ({ ...NO_INPUT, move: { ...NO_INPUT.move }, ...partial });

/** Inputs where only `id` does something. */
export function only(id: PlayerId, partial: Partial<PlayerInput>): MatchInputs {
  const ins: MatchInputs = [NO_INPUT, NO_INPUT, NO_INPUT, NO_INPUT];
  ins[id] = input(partial);
  return ins;
}

export const IDLE: MatchInputs = [NO_INPUT, NO_INPUT, NO_INPUT, NO_INPUT];

/** Run n full sim steps with the same inputs; returns all events emitted. */
export function run(s: MatchState, n: number, inputs: MatchInputs = IDLE): MatchState['events'] {
  const events: MatchState['events'] = [];
  for (let i = 0; i < n; i++) {
    step(s, inputs);
    events.push(...s.events);
  }
  return events;
}

export { f as food };
