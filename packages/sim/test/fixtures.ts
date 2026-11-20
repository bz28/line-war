/**
 * Shared test fixtures. Import these in sim tests instead of the content package
 * (content depends on sim, not the other way round).
 */
import { createMatch, makeConfig, NO_INPUT, type ArenaDef, type IngredientDef, type IngredientKind, type MatchInputs, type RecipeDef, type MatchConfig } from '../src';

/** Tiny 2-kitchen test arena so sim tests don't depend on the content package. */
export const TEST_ARENA: ArenaDef = {
  id: 'test',
  name: 'Test',
  rows: ['#########', '#lK#.#Kl#', '#.......#', '#XP#S#PX#', '#########'],
  legend: {
    '#': { kind: 'wall' },
    '.': { kind: 'floor' },
    K: { kind: 'board' },
    P: { kind: 'stove', vessel: 'pan' },
    X: { kind: 'pass' },
    l: { kind: 'pantry', ingredient: 'lettuce' },
    S: { kind: 'crate', ingredient: 'steak' },
  },
  zones: { kitchen0: [0, 2], market: [4, 4], kitchen1: [6, 8] },
  spawns: [
    { x: 1.5, y: 2.5 },
    { x: 2.5, y: 2.5 },
    { x: 7.5, y: 2.5 },
    { x: 6.5, y: 2.5 },
  ],
};

const def = (kind: IngredientKind, extra: Partial<IngredientDef> = {}): IngredientDef => ({ kind, name: kind, premium: false, choppable: false, cook: null, ...extra });
export const TEST_INGREDIENTS = {
  lettuce: def('lettuce', { choppable: true }),
  tomato: def('tomato', { choppable: true, cook: { vessel: 'pot', from: 'chopped' } }),
  bun: def('bun'),
  meat: def('meat', { cook: { vessel: 'pan', from: 'raw' } }),
  steak: def('steak', { premium: true, cook: { vessel: 'pan', from: 'raw' } }),
  fish: def('fish', { premium: true, cook: { vessel: 'pan', from: 'raw' } }),
} satisfies Record<IngredientKind, IngredientDef>;

export const TEST_RECIPES: RecipeDef[] = [
  { id: 'salad', name: 'Salad', ingredients: [{ kind: 'lettuce', state: 'chopped' }, { kind: 'tomato', state: 'chopped' }], premium: false, baseValue: 40, weight: 1 },
];

export const IDLE: MatchInputs = [NO_INPUT, NO_INPUT, NO_INPUT, NO_INPUT];

export function newTestMatch(overrides: Parameters<typeof makeConfig>[0] = {}) {
  return createMatch({ arena: TEST_ARENA, recipes: TEST_RECIPES, ingredients: TEST_INGREDIENTS, config: makeConfig(overrides) });
}

export type { MatchConfig };
