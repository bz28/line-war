import type { Food, RecipeDef } from './types';

const key = (f: Food) => `${f.kind}:${f.state}`;

/** True if `contents` is exactly the recipe's multiset of food (order-independent). */
export function matchesRecipe(contents: readonly Food[], recipe: RecipeDef): boolean {
  if (contents.length !== recipe.ingredients.length) return false;
  const counts = new Map<string, number>();
  for (const f of recipe.ingredients) counts.set(key(f), (counts.get(key(f)) ?? 0) + 1);
  for (const f of contents) {
    const k = key(f);
    const n = counts.get(k) ?? 0;
    if (n === 0) return false;
    counts.set(k, n - 1);
  }
  return true;
}

/** First recipe the plate satisfies, or null. */
export function findRecipe(contents: readonly Food[], recipes: readonly RecipeDef[]): RecipeDef | null {
  return recipes.find((r) => matchesRecipe(contents, r)) ?? null;
}
