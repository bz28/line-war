/**
 * Perception: what a crew can see and use. Static kitchen layout per team, plus a per-tick index
 * of where every item is. Only information visible to a human on the team is used for decisions
 * (the hidden-Critic rule lives in visibleTickets).
 */
import {
  isVisibleTo,
  tileOwner,
  type Food,
  type IngredientKind,
  type Item,
  type MatchState,
  type PlayerId,
  type RecipeDef,
  type TeamId,
  type Ticket,
  type Vec2,
} from '@line-war/sim';
import { navFor, type Nav } from './nav';

export interface Kitchen {
  team: TeamId;
  nav: Nav;
  boards: number[];
  counters: number[];
  pans: number[];
  pots: number[];
  pantry: Map<IngredientKind, number>;
  crate: Map<IngredientKind, number>;
  racks: number[];
  sinks: number[];
  passes: number[];
  trash: number[];
  /** Counters ranked best-first as a place to assemble a plate (close to pass and boards). */
  assembly: number[];
  /** A floor tile to loiter on when there is nothing to do. */
  idleTile: number;
  /** Every station this team owns (kitchen), for fires. */
  owned: number[];
  /** Market tiles right in front of the rival kitchen's doorways (where carriers can be cut off). */
  rivalDoorFront: number[];
  /**
   * Market tiles between the crates and the rival doorway where an idle bot watches for carriers
   * (it paces between them, like a person would, rather than standing frozen).
   */
  watchTiles: number[];
}

const kitchenCache = new WeakMap<object, Map<string, Kitchen>>();

export function kitchenFor(state: MatchState, team: TeamId): Kitchen {
  let m = kitchenCache.get(state.arena);
  if (!m) {
    m = new Map();
    kitchenCache.set(state.arena, m);
  }
  const key = `${team}:${state.round.swapped ? 1 : 0}`;
  let k = m.get(key);
  if (!k) {
    k = buildKitchen(state, team);
    m.set(key, k);
  }
  return k;
}

function buildKitchen(state: MatchState, team: TeamId): Kitchen {
  const nav = navFor(state, team);
  nav.warm();
  const k: Kitchen = {
    team,
    nav,
    boards: [],
    counters: [],
    pans: [],
    pots: [],
    pantry: new Map(),
    crate: new Map(),
    racks: [],
    sinks: [],
    passes: [],
    trash: [],
    assembly: [],
    idleTile: -1,
    owned: [],
    rivalDoorFront: [],
    watchTiles: [],
  };
  for (let i = 0; i < state.arena.tiles.length; i++) {
    const def = state.arena.tiles[i]!;
    const owner = tileOwner(state, i);
    if (def.kind === 'floor' || def.kind === 'wall') continue;
    if (!(nav.access.get(i)?.length ?? 0)) continue;
    if (def.kind === 'crate' && owner === null && def.ingredient && !k.crate.has(def.ingredient)) k.crate.set(def.ingredient, i);
    if (owner !== team) continue;
    k.owned.push(i);
    switch (def.kind) {
      case 'board':
        k.boards.push(i);
        break;
      case 'counter':
        k.counters.push(i);
        break;
      case 'stove':
        (def.vessel === 'pot' ? k.pots : k.pans).push(i);
        break;
      case 'pantry':
        if (def.ingredient && !k.pantry.has(def.ingredient)) k.pantry.set(def.ingredient, i);
        break;
      case 'plates':
        k.racks.push(i);
        break;
      case 'sink':
        k.sinks.push(i);
        break;
      case 'pass':
        k.passes.push(i);
        break;
      case 'trash':
        k.trash.push(i);
        break;
      default:
        break;
    }
  }
  const rival = (1 - team) as TeamId;
  for (let i = 0; i < nav.n; i++) {
    if (state.arena.zones[i] !== 'none' || !nav.open[i]) continue;
    const [x, y] = nav.xy(i);
    const nb: number[] = [];
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < nav.w && ny < nav.h) nb.push(ny * nav.w + nx);
    }
    // A doorway tile that opens onto the rival kitchen: the market tiles beside it are where carriers pass.
    if (!nb.some((j) => tileOwner(state, j) === rival && state.arena.tiles[j]?.kind === 'floor')) continue;
    for (const j of nb) if (nav.market[j] && nav.open[j] && !k.rivalDoorFront.includes(j)) k.rivalDoorFront.push(j);
  }
  const mid = (tiles: number[]): Vec2 | null => {
    if (!tiles.length) return null;
    let x = 0;
    let y = 0;
    for (const t of tiles) {
      const c = nav.center(t);
      x += c.x;
      y += c.y;
    }
    return { x: x / tiles.length, y: y / tiles.length };
  };
  const crates = mid([...k.crate.values()]);
  const door = mid(k.rivalDoorFront);
  if (crates && door) {
    const w = nav.openTileNear({ x: (crates.x + door.x) / 2, y: (crates.y + door.y) / 2 });
    if (w >= 0 && nav.market[w]) {
      // Mostly the best spot; every third stint one step closer to their doorway.
      const [x, y] = nav.xy(w);
      let alt = -1;
      let altD = Infinity;
      for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]] as const) {
        const nx = x + dx;
        const ny = y + dy;
        const j = ny * nav.w + nx;
        if (nx < 0 || ny < 0 || nx >= nav.w || ny >= nav.h || !nav.open[j] || !nav.market[j]) continue;
        const c = nav.center(j);
        const d = Math.hypot(c.x - door.x, c.y - door.y);
        if (d < altD) {
          altD = d;
          alt = j;
        }
      }
      k.watchTiles.push(w, w);
      if (alt >= 0) k.watchTiles.push(alt);
    }
  }
  const accessTile = (t: number): number => nav.access.get(t)?.[0]?.tile ?? -1;
  const near = (from: number, targets: number[]): number => {
    let best = Infinity;
    for (const t of targets) best = Math.min(best, nav.toStation(accessTile(from), t));
    return best;
  };
  const score = (c: number): number => near(c, k.passes) + 0.6 * near(c, k.boards) + 0.4 * near(c, k.pans);
  k.assembly = [...k.counters].sort((a, b) => score(a) - score(b) || a - b);
  // Idle spot: the open kitchen tile closest to the middle of the team's stations.
  let sx = 0;
  let sy = 0;
  for (const t of k.owned) {
    const [x, y] = nav.xy(t);
    sx += x;
    sy += y;
  }
  const c = { x: sx / Math.max(1, k.owned.length) + 0.5, y: sy / Math.max(1, k.owned.length) + 0.5 };
  k.idleTile = nav.openTileNear(c);
  if (k.idleTile < 0) k.idleTile = nav.tileAt(state.arena.spawns[team * 2]!);
  return k;
}

// ---------- items ----------

export type Loc =
  | { at: 'held'; player: PlayerId; item: Item }
  | { at: 'station'; tile: number; item: Item }
  | { at: 'floor'; pos: Vec2; item: Item; resting: boolean };

const itemCache = new WeakMap<MatchState, { tick: number; map: Map<number, Loc> }>();

/** Where every item is this tick (cached per state and tick). */
export function itemIndex(state: MatchState): Map<number, Loc> {
  const c = itemCache.get(state);
  if (c && c.tick === state.tick) return c.map;
  const map = new Map<number, Loc>();
  for (const p of state.players) if (p.holding) map.set(p.holding.id, { at: 'held', player: p.id, item: p.holding });
  for (const key in state.stations) {
    const st = state.stations[key]!;
    if (st.item) map.set(st.item.id, { at: 'station', tile: st.tile, item: st.item });
  }
  for (const fi of state.floorItems) {
    map.set(fi.item.id, { at: 'floor', pos: fi.pos, item: fi.item, resting: fi.vel.x === 0 && fi.vel.y === 0 });
  }
  itemCache.set(state, { tick: state.tick, map });
  return map;
}

// ---------- tickets ----------

/** Tickets a human on `team` can see right now. */
export function visibleTickets(state: MatchState, team: TeamId): Ticket[] {
  return state.tickets.filter((t) => isVisibleTo(t, team) && t.expireTick > state.tick);
}

export function recipeById(state: MatchState, id: string): RecipeDef | undefined {
  return state.recipes.find((r) => r.id === id);
}

// ---------- food helpers ----------

export const sameFood = (a: Food, b: Food): boolean => a.kind === b.kind && a.state === b.state;

/** Remove one food equal to `f` from `bag`; true if found. */
export function takeFood(bag: Food[], f: Food): boolean {
  const i = bag.findIndex((x) => sameFood(x, f));
  if (i < 0) return false;
  bag.splice(i, 1);
  return true;
}

/** `part` is a sub-multiset of `whole`. */
export function subBag(part: readonly Food[], whole: readonly Food[]): boolean {
  const rest = whole.slice();
  for (const f of part) if (!takeFood(rest, f)) return false;
  return true;
}

export function sameBag(a: readonly Food[], b: readonly Food[]): boolean {
  return a.length === b.length && subBag(a, b);
}

/** How an ingredient becomes `target`: chop first? which vessel? */
export function pipeline(state: MatchState, target: Food): { chop: boolean; vessel: 'pan' | 'pot' | null } {
  const def = state.ingredients[target.kind];
  if (target.state === 'chopped') return { chop: true, vessel: null };
  if (target.state === 'cooked' && def?.cook) return { chop: def.cook.from === 'chopped', vessel: def.cook.vessel };
  return { chop: false, vessel: null };
}

/** An ingredient in state `s` can still become `target` (on its pipeline, not past it). */
export function canBecome(state: MatchState, kind: IngredientKind, s: Food['state'], target: Food): boolean {
  if (kind !== target.kind || s === 'burnt') return false;
  if (s === target.state) return true;
  const p = pipeline(state, target);
  if (s === 'raw') return p.chop || p.vessel !== null;
  if (s === 'chopped') return target.state === 'cooked' && p.chop;
  return false;
}
