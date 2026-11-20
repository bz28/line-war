/** Plate rules (RULES §2 "Fits"). */
import type { Food, MatchState, PlateItem, RecipeDef } from '../../types';

const key = (f: Food): string => `${f.kind}:${f.state}`;

/** True if every food in `part` appears in `whole` at least as many times. */
export function isSubMultiset(part: readonly Food[], whole: readonly Food[]): boolean {
  const counts = new Map<string, number>();
  for (const f of whole) counts.set(key(f), (counts.get(key(f)) ?? 0) + 1);
  for (const f of part) {
    const n = counts.get(key(f)) ?? 0;
    if (n === 0) return false;
    counts.set(key(f), n - 1);
  }
  return true;
}

/** The plate is clean, not cold, and contents + `add` is a sub-multiset of at least one recipe. */
export function plateFits(plate: PlateItem, add: readonly Food[], recipes: readonly RecipeDef[]): boolean {
  if (plate.dirty || plate.cold) return false;
  const combined = [...plate.contents, ...add];
  return recipes.some((r) => isSubMultiset(combined, r.ingredients));
}

/** Put food on a plate (caller has checked plateFits). Restarts the cold clock. */
export function addToPlate(state: MatchState, plate: PlateItem, add: readonly Food[]): void {
  for (const f of add) plate.contents.push({ kind: f.kind, state: f.state });
  plate.platedAtTick = state.tick;
}

/** Trash: empty a plate and reset its cold state. */
export function emptyPlate(plate: PlateItem): void {
  plate.contents = [];
  plate.platedAtTick = null;
  plate.cold = false;
}
