import type { ArenaDef, CharmVariantDef, IngredientDef, IngredientKind, RecipeDef, Tuning } from '@line-war/sim';
import { LEVEL_CHARMS } from './charms';
import { HARBOR_PIER } from './arenas/harborPier';
import { NIGHT_MARKET } from './arenas/nightMarket';
import { ROOFTOP_GARDEN } from './arenas/rooftopGarden';
import { INGREDIENTS } from './ingredients';
import { RECIPES } from './recipes';

/** A playable level: a map plus the menu and ingredient rules that go with it. */
export interface LevelDef {
  id: string;
  name: string;
  /** One sentence shown on the level picker: what makes this level play differently. */
  blurb: string;
  arena: ArenaDef;
  recipes: RecipeDef[];
  ingredients: Record<IngredientKind, IngredientDef>;
  /** Charm variants that spawn on this level (RULES §10); pass to createMatch({ charms }). */
  charms: CharmVariantDef[];
  /** Charms per round on this level (RULES §10); pass to createMatch({ charmsPerRound }). */
  charmsPerRound: number;
  /** This level's overrides of tuning values (e.g. panBurnSeconds); pass to createMatch({ tuning }). */
  tuning?: Partial<Tuning>;
}

type Ingredients = Record<IngredientKind, IngredientDef>;

/** Premium = only sold from the shared market. Derived from which ingredients the arena puts in crates. */
function marketIngredients(arena: ArenaDef): Ingredients {
  const used = new Set(arena.rows.join(''));
  const inMarket = new Set(
    Object.entries(arena.legend).flatMap(([ch, t]) => (used.has(ch) && t.kind === 'crate' && t.ingredient ? [t.ingredient] : [])),
  );
  const out = {} as Ingredients;
  for (const def of Object.values(INGREDIENTS)) out[def.kind] = { ...def, premium: inMarket.has(def.kind) };
  return out;
}

/** Recipes with level-specific weights; premium flags follow the level's ingredients. */
function menu(ingredients: Ingredients, weights: Partial<Record<string, number>> = {}): RecipeDef[] {
  // A weight of 0 takes the recipe off this level's menu.
  return RECIPES.filter((r) => weights[r.id] !== 0).map((r) => ({
    ...r,
    weight: weights[r.id] ?? r.weight,
    premium: r.ingredients.some((f) => ingredients[f.kind].premium),
  }));
}

const nightIngredients = marketIngredients(NIGHT_MARKET);
const harborIngredients = marketIngredients(HARBOR_PIER);
const roofIngredients = marketIngredients(ROOFTOP_GARDEN);

export const LEVELS: LevelDef[] = [
  {
    id: NIGHT_MARKET.id,
    name: NIGHT_MARKET.name,
    blurb: 'Steak and fish sit in the open market between the two stalls. Grab them, guard them, knock them loose.',
    arena: NIGHT_MARKET,
    recipes: menu(nightIngredients),
    ingredients: nightIngredients,
    charms: LEVEL_CHARMS[NIGHT_MARKET.id]!,
    charmsPerRound: 3,
  },
  {
    id: HARBOR_PIER.id,
    name: HARBOR_PIER.name,
    blurb: 'Fish night. One narrow door per stall, steak waiting between the doors, and fish across the pond.',
    arena: HARBOR_PIER,
    recipes: menu(harborIngredients, { fish: 3, steak: 1.5, salad: 2, burger: 2.5, soup: 1.5 }),
    ingredients: harborIngredients,
    charms: LEVEL_CHARMS[HARBOR_PIER.id]!,
    charmsPerRound: 3,
  },
  {
    id: ROOFTOP_GARDEN.id,
    name: ROOFTOP_GARDEN.name,
    blurb: 'The produce war. Lettuce and tomatoes only grow in the shared garden, and every stall has two doors to defend.',
    arena: ROOFTOP_GARDEN,
    recipes: menu(roofIngredients, { salad: 3, steak: 2, soup: 0, burger: 3, fish: 2 }),
    ingredients: roofIngredients,
    charms: LEVEL_CHARMS[ROOFTOP_GARDEN.id]!,
    // Its market is the busiest of the three levels: one charm per round.
    charmsPerRound: 1,
    // Rooftop's menu is all pans bar the salad, so burns ran ~3/round. A longer pan
    // burn window lifts the calibrated 10%-faster crew from ~63% to ~67% (botsim, tools/botsim/reports/balance-rooftop).
    tuning: { panBurnSeconds: 6 },
  },
];

export function levelById(id: string): LevelDef {
  const level = LEVELS.find((l) => l.id === id);
  if (!level) throw new Error(`unknown level '${id}' (known: ${LEVELS.map((l) => l.id).join(', ')})`);
  return level;
}
