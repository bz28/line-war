/**
 * OWNER: rules track (PR "sim-rules").
 * Market stock (crates always hold marketExtraStock + the number of board tickets that need
 * that ingredient), crate takes, and dash knocks (pop item knockPopDistance in the dash
 * direction, daze the victim, grant knock immunity).
 * Spec: docs/RULES.md §6. Player timers (daze, immunity) are counted down by movement.ts.
 */
import { dist, isWalkable, tileIndexAtPos, tileXY, zoneAt } from '../grid';
import { newId } from '../match';
import { secondsToTicks } from '../tuning';
import type { IngredientItem, IngredientKind, MatchState, PlayerId, Vec2 } from '../types';

/** Keeps a clamped pop position strictly inside its tile so floor(pos) lands on that tile. */
const TILE_EDGE_INSET = 1e-3;

/** Board tickets needing this ingredient, counting duplicates within a recipe. */
export function ticketDemand(state: MatchState, kind: IngredientKind): number {
  let n = 0;
  for (const ticket of state.tickets) {
    const recipe = state.recipes.find((r) => r.id === ticket.recipe);
    if (recipe) n += recipe.ingredients.filter((f) => f.kind === kind).length;
  }
  return n;
}

export function updateMarket(state: MatchState): void {
  const extra = state.config.tuning.marketExtraStock;
  for (const st of Object.values(state.stations)) {
    const def = state.arena.tiles[st.tile];
    if (def?.kind !== 'crate' || !def.ingredient) continue;
    st.stock = Math.max(st.stock, extra + ticketDemand(state, def.ingredient));
  }
}

/** Take one item from a crate. Returns null when out of stock. */
export function takeFromCrate(state: MatchState, tile: number): IngredientItem | null {
  const def = state.arena.tiles[tile];
  const st = state.stations[String(tile)];
  if (def?.kind !== 'crate' || !def.ingredient || !st || st.stock <= 0) return null;
  st.stock--;
  return { id: newId(state), type: 'ingredient', kind: def.ingredient, state: 'raw' };
}

const isOpenMarketTile = (state: MatchState, index: number): boolean =>
  zoneAt(state.arena, index) === 'market' && isWalkable(state.arena.tiles[index] ?? null);

/**
 * The target itself if it lies on a walkable market tile, otherwise the nearest point to it
 * on any walkable market tile (ties: lowest tile index). Falls back to `fallback`.
 */
export function clampToMarket(state: MatchState, target: Vec2, fallback: Vec2): Vec2 {
  const here = tileIndexAtPos(state.arena, target);
  if (here !== null && isOpenMarketTile(state, here)) return { x: target.x, y: target.y };
  let best: Vec2 | null = null;
  let bestD = Infinity;
  for (let i = 0; i < state.arena.tiles.length; i++) {
    if (!isOpenMarketTile(state, i)) continue;
    const { x, y } = tileXY(state.arena, i);
    const p = {
      x: Math.min(x + 1 - TILE_EDGE_INSET, Math.max(x + TILE_EDGE_INSET, target.x)),
      y: Math.min(y + 1 - TILE_EDGE_INSET, Math.max(y + TILE_EDGE_INSET, target.y)),
    };
    const d = dist(p, target);
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best ?? { x: fallback.x, y: fallback.y };
}

/**
 * Called by movement.ts when a dashing player touches another player.
 * Knocks only apply to rivals, inside the market zone, when the victim is holding an
 * item and is not knock-immune. The item becomes a FloorItem anyone can pick up.
 * Returns true if a knock happened.
 */
export function tryKnock(state: MatchState, by: PlayerId, victim: PlayerId): boolean {
  const attacker = state.players[by];
  const v = state.players[victim];
  if (attacker.team === v.team) return false;
  const at = tileIndexAtPos(state.arena, v.pos);
  if (at === null || zoneAt(state.arena, at) !== 'market') return false;
  if (v.holding === null || v.knockImmuneTicks > 0) return false;

  const t = state.config.tuning;
  const item = v.holding;
  v.holding = null;
  const target = { x: v.pos.x + attacker.dashDir.x * t.knockPopDistance, y: v.pos.y + attacker.dashDir.y * t.knockPopDistance };
  state.floorItems.push({
    item,
    pos: clampToMarket(state, target, v.pos),
    vel: { x: 0, y: 0 },
    thrownBy: by,
    thrownAtTick: null,
    travelled: 0,
  });
  v.dazedTicks = secondsToTicks(state.config, t.dazeSeconds);
  v.knockImmuneTicks = secondsToTicks(state.config, t.knockImmuneSeconds);
  state.events.push({ type: 'knock', by, victim, itemId: item.id });
  return true;
}
