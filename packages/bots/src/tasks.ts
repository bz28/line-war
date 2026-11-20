/**
 * Tasks: short, reactive jobs a bot commits to (prepare one ingredient of a dish, run the plate,
 * wash, put out a fire...). Each tick a task looks at the world and returns the next primitive
 * Act, or DONE / FAIL. Being reactive (not a fixed script) is what keeps bots unstuck when a
 * teammate, a rival or a human changes the world under them.
 */
import { isPlateCold, plateFits, vesselTimeline, type IngredientKind, type Item, type MatchState, type PlateItem, type PlayerState } from '@line-war/sim';
import type { Crew, Order, Slot } from './crew';
import { BOT_TUNING } from './tuning';
import type { Kitchen, Loc } from './world';
import { canBecome, pipeline, sameBag, subBag } from './world';

export type Act =
  /** Walk to the station, face it, press Grab once. */
  | { kind: 'use'; tile: number }
  /** Walk to the station, face it, hold Work. */
  | { kind: 'work'; tile: number }
  /** Walk to the station and face it, without pressing anything (waiting for food). */
  | { kind: 'face'; tile: number }
  /** Walk to a resting floor item and pick it up. */
  | { kind: 'pick'; item: number }
  /** Walk to a floor tile and stand there. */
  | { kind: 'goto'; tile: number }
  /** Put what I'm holding down on the floor of my own kitchen. */
  | { kind: 'drop' }
  | { kind: 'wait' };

export const DONE = 'done' as const;
export const FAIL = 'fail' as const;
export type StepResult = Act | typeof DONE | typeof FAIL;

export interface Ctx {
  state: MatchState;
  me: PlayerState;
  crew: Crew;
  k: Kitchen;
  items: Map<number, Loc>;
  /** My current (open) tile. */
  tile: number;
  /** Ticks to arrive early at a stove before food is done. */
  stoveLeadTicks: number;
}

export abstract class Task {
  abstract readonly key: string;
  /** Crew claims held while this task runs (released when it ends). */
  claims: string[] = [];
  /** Score the crew planner gave this task when it was chosen (for pre-emption). */
  priority = 0;
  abstract step(ctx: Ctx): StepResult;
}

// ---------- shared helpers ----------

export const stationOf = (state: MatchState, tile: number) => state.stations[String(tile)];
export const onFire = (state: MatchState, tile: number): boolean => state.fires.some((f) => f.tile === tile);

/** Empty, not burning, not claimed by a crewmate's task. */
export function surfaceFree(ctx: Ctx, tile: number): boolean {
  const st = stationOf(ctx.state, tile);
  return !!st && st.item === null && !onFire(ctx.state, tile) && !ctx.crew.claimedByOther(`tile:${tile}`, ctx.me.id);
}

/** Cheapest station of `tiles` by path from me (+ optional bias per tile). */
export function nearest(ctx: Ctx, tiles: readonly number[], ok: (t: number) => boolean, bias?: (t: number) => number): number | null {
  let best: number | null = null;
  let bestC = Infinity;
  for (const t of tiles) {
    if (!ok(t)) continue;
    const c = ctx.k.nav.toStation(ctx.tile, t) + (bias ? bias(t) : 0);
    if (c < bestC) {
      bestC = c;
      best = t;
    }
  }
  return best;
}

export function freeCounter(ctx: Ctx, assemblyBias = false): number | null {
  const rank = new Map(ctx.k.assembly.map((t, i) => [t, i]));
  return nearest(ctx, ctx.k.counters, (t) => surfaceFree(ctx, t), assemblyBias ? (t) => (rank.get(t) ?? 0) * 1.5 : undefined);
}

export function countFreeCounters(ctx: Ctx): number {
  let n = 0;
  for (const t of ctx.k.counters) if (surfaceFree(ctx, t)) n++;
  return n;
}

/** A stove whose vessel is empty, not used by any dish and not claimed. */
export function freeVessel(ctx: Ctx, tiles: readonly number[]): number | null {
  return nearest(ctx, tiles, (t) => {
    const v = stationOf(ctx.state, t)?.vessel;
    return !!v && v.status === 'empty' && v.contents.length === 0 && !onFire(ctx.state, t) && !ctx.crew.vesselInUse(t) && !ctx.crew.claimedByOther(`tile:${t}`, ctx.me.id);
  });
}

/** Item location is somewhere this team can reach. */
export function reachable(ctx: Pick<Ctx, 'state' | 'k'>, loc: Loc): boolean {
  if (loc.at === 'held') return ctx.state.players[loc.player].team === ctx.k.team;
  if (loc.at === 'station') return ctx.k.nav.access.has(loc.tile) && ctx.state.arena.tiles[loc.tile]?.kind !== 'crate';
  const t = ctx.k.nav.tileAt(loc.pos);
  return t >= 0 && ctx.k.nav.open[t] === 1;
}

/** Where to get a fresh raw ingredient: a useful resting floor item nearby, or the pantry / crate. */
function sourceFor(ctx: Ctx, kind: IngredientKind): Act | null {
  const src = ctx.k.pantry.get(kind) ?? ctx.k.crate.get(kind);
  const srcCost = src === undefined ? Infinity : ctx.k.nav.toStation(ctx.tile, src);
  let bestItem: number | null = null;
  let bestC = srcCost;
  for (const [id, loc] of ctx.items) {
    if (loc.at !== 'floor' || !loc.resting || loc.item.type !== 'ingredient' || loc.item.kind !== kind || loc.item.state !== 'raw') continue;
    if (ctx.crew.assigned.has(id)) continue;
    const t = ctx.k.nav.tileAt(loc.pos);
    if (t < 0 || !ctx.k.nav.open[t]) continue;
    const c = ctx.k.nav.tiles(ctx.tile, t) - 1;
    if (c < bestC) {
      bestC = c;
      bestItem = id;
    }
  }
  if (bestItem !== null) return { kind: 'pick', item: bestItem };
  return src === undefined ? null : { kind: 'use', tile: src };
}

/** Best unassigned loose item that can become `food` (most progressed, then nearest). */
export function findAdoptable(ctx: Ctx, food: Slot['food']): number | null {
  let best: number | null = null;
  let bestC = Infinity;
  for (const [id, loc] of ctx.items) {
    const it = loc.item;
    if (loc.at === 'held' || it.type !== 'ingredient' || ctx.crew.assigned.has(id)) continue;
    if (!canBecome(ctx.state, it.kind, it.state, food)) continue;
    if (!reachable(ctx, loc)) continue;
    let t: number;
    if (loc.at === 'station') {
      if (ctx.crew.claimedByOther(`tile:${loc.tile}`, ctx.me.id) || onFire(ctx.state, loc.tile)) continue;
      t = loc.tile;
    } else {
      if (!loc.resting) continue;
      t = ctx.k.nav.tileAt(loc.pos);
    }
    const dist = loc.at === 'station' ? ctx.k.nav.toStation(ctx.tile, t) : ctx.k.nav.tiles(ctx.tile, t);
    const c = dist - (it.state === food.state ? 8 : it.state === 'chopped' ? 4 : 0);
    if (c < bestC) {
      bestC = c;
      best = id;
    }
  }
  return best;
}

function heldIngredient(me: PlayerState): Extract<Item, { type: 'ingredient' }> | null {
  return me.holding && me.holding.type === 'ingredient' ? me.holding : null;
}

const pickUp = (loc: Loc, id: number): Act | null =>
  loc.at === 'station' ? { kind: 'use', tile: loc.tile } : loc.at === 'floor' ? { kind: 'pick', item: id } : null;

/** Order's plate, if it rests on a surface (so ingredients can be dropped onto it). */
function plateOnSurface(ctx: Ctx, o: Order): { tile: number; plate: PlateItem } | null {
  if (o.plate === null) return null;
  const loc = ctx.items.get(o.plate);
  if (!loc || loc.at !== 'station' || loc.item.type !== 'plate') return null;
  return { tile: loc.tile, plate: loc.item };
}


/**
 * Holding something with no free counter: wait a little (a crewmate may clear one), then trash an
 * ingredient (cheap to replace) or set a plate down on our kitchen floor. Never waits forever.
 */
export function noSurface(ctx: Ctx, wait: { stalled: number }): StepResult {
  if (++wait.stalled < BOT_TUNING.noSurfaceWaitTicks) return { kind: 'wait' };
  if (ctx.me.holding?.type === 'ingredient') {
    const tr = nearest(ctx, ctx.k.trash, () => true);
    if (tr !== null) return { kind: 'use', tile: tr };
  }
  return { kind: 'drop' };
}

// ---------- prepare one ingredient of a dish ----------

/**
 * Get one recipe component to where it belongs: fetch → (chop) → vessel or plate.
 * Ends when the food is in a vessel, on the plate, or ready and waiting for the plate.
 */
export class PrepSlotTask extends Task {
  readonly key: string;
  private board: number | null = null;
  private vessel: number | null = null;
  private counter: number | null = null;
  private waited = 0;
  readonly wait = { stalled: 0 };

  constructor(
    readonly order: Order,
    readonly slotIndex: number,
  ) {
    super();
    this.key = `slot:${order.id}:${slotIndex}`;
    this.claims = [this.key];
  }

  private claimTile(ctx: Ctx, t: number): void {
    const k = `tile:${t}`;
    if (!this.claims.includes(k)) this.claims.push(k);
    ctx.crew.claim(k, ctx.me.id);
  }

  step(ctx: Ctx): StepResult {
    const o = this.order;
    const slot = o.slots[this.slotIndex]!;
    const { state, me } = ctx;
    if (o.done || o.cancelled) return FAIL;
    if (slot.onPlate || slot.vessel !== null) return DONE;
    const p = pipeline(state, slot.food);
    let loc = slot.item !== null ? ctx.items.get(slot.item) : undefined;
    if (slot.item === null || !loc) {
      slot.item = null;
      const held = heldIngredient(me);
      if (held && !ctx.crew.assigned.has(held.id) && canBecome(state, held.kind, held.state, slot.food)) {
        ctx.crew.assign(slot, held.id);
        loc = ctx.items.get(held.id);
      } else if (me.holding) {
        return FAIL;
      } else {
        if (!o.backed) return FAIL;
        const adopt = findAdoptable(ctx, slot.food);
        if (adopt !== null) {
          ctx.crew.assign(slot, adopt);
          loc = ctx.items.get(adopt);
        } else {
          return sourceFor(ctx, slot.food.kind) ?? FAIL;
        }
      }
      if (!loc) return FAIL;
    }
    const item = loc.item;
    if (item.type !== 'ingredient') return FAIL;
    const id = item.id;

    if (loc.at === 'held') {
      if (loc.player !== me.id) return DONE; // a crewmate carries it
      if (item.state === 'raw' && p.chop) {
        if (this.board === null || !surfaceFree(ctx, this.board)) {
          this.board = nearest(ctx, ctx.k.boards, (t) => surfaceFree(ctx, t));
          if (this.board === null) return this.waitOrPark(ctx);
          this.claimTile(ctx, this.board);
        }
        return { kind: 'use', tile: this.board };
      }
      const needsVessel = p.vessel !== null && item.state === (p.chop ? 'chopped' : 'raw');
      if (needsVessel) {
        const v = this.pickVessel(ctx, p.vessel!);
        if (v === null) return this.waitOrPark(ctx);
        slot.pendingVessel = v;
        return { kind: 'use', tile: v };
      }
      if (item.state === slot.food.state) {
        const ps = plateOnSurface(ctx, o);
        if (ps && plateFits(state, ps.plate, [item])) return { kind: 'use', tile: ps.tile };
        return this.park(ctx);
      }
      return FAIL;
    }

    if (loc.at === 'station') {
      const kind = state.arena.tiles[loc.tile]?.kind;
      if (item.state === 'raw' && p.chop) {
        if (kind === 'board') return onFire(state, loc.tile) ? FAIL : { kind: 'work', tile: loc.tile };
        return me.holding ? FAIL : { kind: 'use', tile: loc.tile };
      }
      if (this.counter === loc.tile && item.state === slot.food.state) return DONE; // parked by me
      if (me.holding) return FAIL;
      const needsVessel = p.vessel !== null && item.state === (p.chop ? 'chopped' : 'raw');
      if (needsVessel) return this.peekVessel(ctx, p.vessel!) !== null ? { kind: 'use', tile: loc.tile } : DONE;
      if (item.state === slot.food.state) {
        const ps = plateOnSurface(ctx, o);
        return ps && plateFits(state, ps.plate, [item]) ? { kind: 'use', tile: loc.tile } : DONE;
      }
      return FAIL;
    }
    if (me.holding) return FAIL;
    return loc.resting ? { kind: 'pick', item: id } : { kind: 'wait' };
  }

  /** Vessel for this slot: the dish's pot (shared by all its pot slots), or a free pan. */
  private pickVessel(ctx: Ctx, kind: 'pan' | 'pot'): number | null {
    const o = this.order;
    if (kind === 'pot') {
      if (o.pot !== null) {
        const v = stationOf(ctx.state, o.pot)?.vessel;
        if (v && v.status === 'empty' && !onFire(ctx.state, o.pot)) return o.pot;
        o.pot = null;
      }
      const t = freeVessel(ctx, ctx.k.pots);
      if (t !== null) o.pot = t;
      return t;
    }
    if (this.vessel !== null) {
      const v = stationOf(ctx.state, this.vessel)?.vessel;
      if (v && v.status === 'empty' && v.contents.length === 0 && !onFire(ctx.state, this.vessel)) return this.vessel;
    }
    this.vessel = freeVessel(ctx, ctx.k.pans);
    if (this.vessel !== null) this.claimTile(ctx, this.vessel);
    return this.vessel;
  }

  private peekVessel(ctx: Ctx, kind: 'pan' | 'pot'): number | null {
    if (kind === 'pot' && this.order.pot !== null) return this.order.pot;
    return freeVessel(ctx, kind === 'pot' ? ctx.k.pots : ctx.k.pans);
  }

  /** Nowhere to put it right now: wait a moment, then park it on a counter. */
  private waitOrPark(ctx: Ctx): StepResult {
    if (++this.waited < BOT_TUNING.prepWaitTicks) return { kind: 'wait' };
    return this.park(ctx);
  }

  private park(ctx: Ctx): StepResult {
    if (this.counter === null || !surfaceFree(ctx, this.counter)) {
      this.counter = freeCounter(ctx, true);
      if (this.counter === null) return noSurface(ctx, this.wait);
      this.claimTile(ctx, this.counter);
    }
    return { kind: 'use', tile: this.counter };
  }
}

// ---------- plate runs: fetch plate, scoop vessels, collect, deliver ----------

export class PlateRunTask extends Task {
  readonly key: string;
  private putDown = false;
  private counter: number | null = null;
  readonly wait = { stalled: 0 };

  constructor(readonly order: Order) {
    super();
    this.key = `plate:${order.id}`;
    this.claims = [this.key];
  }

  step(ctx: Ctx): StepResult {
    const o = this.order;
    const { state, me, k } = ctx;
    const held = me.holding;
    if (o.done || o.cancelled) return held && held.type === 'plate' ? FAIL : DONE;

    if (o.plate === null) {
      if (held && held.type === 'plate' && !held.dirty && !ctx.crew.assigned.has(held.id) && plateUsableFor(state, held, o)) {
        ctx.crew.assignPlate(o, held.id);
      } else if (held) {
        return FAIL;
      } else {
        const spare = findSparePlate(ctx, o);
        if (spare !== null) ctx.crew.assignPlate(o, spare);
        else {
          const rack = nearest(ctx, k.racks, (t) => (stationOf(state, t)?.stock ?? 0) > 0);
          return rack === null ? FAIL : { kind: 'use', tile: rack };
        }
      }
    }
    const loc = ctx.items.get(o.plate!);
    if (!loc) return FAIL;
    if (loc.at !== 'held' || loc.player !== me.id) {
      if (this.putDown) return DONE;
      if (held || loc.at === 'held') return FAIL;
      if (loc.at === 'floor' && !loc.resting) return { kind: 'wait' };
      return pickUp(loc, o.plate!) ?? FAIL;
    }
    const plate = loc.item as PlateItem;
    const recipe = o.recipe.ingredients;
    if (plate.dirty) return FAIL;
    if (plate.contents.length > 0 && (isPlateCold(state, plate) || !subBag(plate.contents, recipe))) {
      const tr = nearest(ctx, k.trash, () => true);
      return tr === null ? FAIL : { kind: 'use', tile: tr };
    }
    if (sameBag(plate.contents, recipe)) {
      if (ctx.crew.ticketFor(state, o.recipe.id) && state.round.phase !== 'prep') {
        const pass = nearest(ctx, k.passes, () => true);
        if (pass !== null) return { kind: 'use', tile: pass };
      }
      return this.putDownPlate(ctx);
    }
    // Scoop finished vessels.
    for (const slot of o.slots) {
      if (slot.onPlate || slot.vessel === null) continue;
      const v = stationOf(state, slot.vessel)?.vessel;
      if (v && v.status === 'done' && plateFits(state, plate, v.contents)) return { kind: 'use', tile: slot.vessel };
    }
    // Collect loose ready components onto the plate in hand.
    for (const slot of o.slots) {
      if (slot.onPlate || slot.item === null) continue;
      const l = ctx.items.get(slot.item);
      if (!l || l.at !== 'station' || l.item.type !== 'ingredient' || l.item.state !== slot.food.state) continue;
      if (plateFits(state, plate, [l.item])) return { kind: 'use', tile: l.tile };
    }
    // Wait at a stove that is about to finish.
    let waitAt: number | null = null;
    let soonest = Infinity;
    for (const slot of o.slots) {
      if (slot.onPlate || slot.vessel === null) continue;
      const v = stationOf(state, slot.vessel)?.vessel;
      if (!v || v.status !== 'cooking') continue;
      const left = vesselTimeline(state, v.kind).done - v.cookTicks;
      if (left < soonest) {
        soonest = left;
        waitAt = slot.vessel;
      }
    }
    if (waitAt !== null) {
      const travel = (k.nav.toStation(ctx.tile, waitAt) / state.config.tuning.playerSpeed) * state.config.tuning.tickRate;
      if (soonest <= ctx.stoveLeadTicks + travel + BOT_TUNING.stoveWaitMarginTicks) return { kind: 'face', tile: waitAt };
    }
    return this.putDownPlate(ctx);
  }

  private putDownPlate(ctx: Ctx): StepResult {
    this.putDown = true;
    if (this.counter === null || !surfaceFree(ctx, this.counter)) {
      this.counter = freeCounter(ctx, true);
      if (this.counter === null) return noSurface(ctx, this.wait);
      const key = `tile:${this.counter}`;
      if (!this.claims.includes(key)) this.claims.push(key);
      ctx.crew.claim(key, ctx.me.id);
    }
    return { kind: 'use', tile: this.counter };
  }
}

/** A clean, non-cold plate whose contents could still become this dish. */
export function plateUsableFor(state: MatchState, plate: PlateItem, o: Order): boolean {
  if (plate.dirty || isPlateCold(state, plate)) return false;
  return subBag(plate.contents, o.recipe.ingredients);
}

/** An unassigned clean plate on our counters / floor that fits the dish. */
export function findSparePlate(ctx: Ctx, o: Order): number | null {
  let best: number | null = null;
  let bestC = Infinity;
  for (const [id, loc] of ctx.items) {
    if (loc.at === 'held' || loc.item.type !== 'plate' || ctx.crew.assigned.has(id)) continue;
    if (!plateUsableFor(ctx.state, loc.item, o) || !reachable(ctx, loc)) continue;
    if (loc.at === 'floor' && !loc.resting) continue;
    if (loc.at === 'station' && ctx.crew.claimedByOther(`tile:${loc.tile}`, ctx.me.id)) continue;
    const c = (loc.at === 'station' ? ctx.k.nav.toStation(ctx.tile, loc.tile) : ctx.k.nav.tiles(ctx.tile, ctx.k.nav.tileAt(loc.pos))) - loc.item.contents.length * 10;
    if (c < bestC) {
      bestC = c;
      best = id;
    }
  }
  return best;
}

// ---------- kitchen chores ----------

export class ExtinguishTask extends Task {
  readonly key: string;
  constructor(readonly tile: number) {
    super();
    this.key = `fire:${tile}`;
    this.claims = [this.key];
  }
  step(ctx: Ctx): StepResult {
    return onFire(ctx.state, this.tile) ? { kind: 'work', tile: this.tile } : DONE;
  }
}

/** Take burnt food out of a stove and trash it (before it catches fire). */
export class ClearBurntTask extends Task {
  readonly key: string;
  private got = false;
  constructor(readonly tile: number) {
    super();
    this.key = `burnt:${tile}`;
    this.claims = [this.key, `tile:${tile}`];
  }
  step(ctx: Ctx): StepResult {
    const held = ctx.me.holding;
    if (held) {
      if (held.type === 'ingredient' && held.state === 'burnt') {
        this.got = true;
        const tr = nearest(ctx, ctx.k.trash, () => true);
        return tr === null ? FAIL : { kind: 'use', tile: tr };
      }
      return FAIL;
    }
    if (this.got) return DONE;
    const v = stationOf(ctx.state, this.tile)?.vessel;
    if (!v || v.status !== 'burnt' || onFire(ctx.state, this.tile)) return DONE;
    return { kind: 'use', tile: this.tile };
  }
}

export class WashTask extends Task {
  readonly key: string;
  constructor(
    readonly sink: number,
    readonly wantStock: number,
  ) {
    super();
    this.key = `wash:${sink}`;
    this.claims = [this.key];
  }
  step(ctx: Ctx): StepResult {
    const st = stationOf(ctx.state, this.sink);
    if (!st || st.dirtyPlates <= 0 || onFire(ctx.state, this.sink)) return DONE;
    const stock = ctx.k.racks.reduce((n, t) => n + (stationOf(ctx.state, t)?.stock ?? 0), 0);
    if (stock >= this.wantStock) return DONE;
    return { kind: 'work', tile: this.sink };
  }
}

/** Get rid of an item: ingredients and plate contents go in the trash; an emptied plate is put down. */
export class TrashTask extends Task {
  readonly key: string;
  private trashed = false;
  private counter: number | null = null;
  readonly wait = { stalled: 0 };
  constructor(readonly itemId: number) {
    super();
    this.key = `item:${itemId}`;
    this.claims = [this.key];
  }
  step(ctx: Ctx): StepResult {
    const loc = ctx.items.get(this.itemId);
    const { me } = ctx;
    if (!loc) return this.trashed ? DONE : FAIL;
    if (loc.at !== 'held' || loc.player !== me.id) {
      if (this.trashed || me.holding || loc.at === 'held') return this.trashed ? DONE : FAIL;
      if (loc.at === 'floor' && !loc.resting) return { kind: 'wait' };
      return pickUp(loc, this.itemId) ?? FAIL;
    }
    const it = loc.item;
    if (it.type === 'plate' && it.contents.length === 0) {
      this.trashed = true;
      if (this.counter === null || !surfaceFree(ctx, this.counter)) {
        this.counter = freeCounter(ctx);
        if (this.counter === null) return noSurface(ctx, this.wait);
        this.claims.push(`tile:${this.counter}`);
        ctx.crew.claim(`tile:${this.counter}`, me.id);
      }
      return { kind: 'use', tile: this.counter };
    }
    const tr = nearest(ctx, ctx.k.trash, () => true);
    return tr === null ? FAIL : { kind: 'use', tile: tr };
  }
}

/**
 * Stock up: chop a basic ingredient and leave it on a counter for a later dish (prep phase and
 * idle time). Also used to tidy an unassigned item off a board.
 */
export class StockTask extends Task {
  readonly key: string;
  private itemId: number | null;
  private board: number | null = null;
  private counter: number | null = null;

  constructor(
    readonly kind: IngredientKind,
    itemId: number | null = null,
  ) {
    super();
    this.itemId = itemId;
    this.key = itemId === null ? `stock:${kind}` : `item:${itemId}`;
    this.claims = [this.key];
  }

  private claimTile(ctx: Ctx, t: number): void {
    const key = `tile:${t}`;
    if (!this.claims.includes(key)) this.claims.push(key);
    ctx.crew.claim(key, ctx.me.id);
  }

  step(ctx: Ctx): StepResult {
    const { me, state } = ctx;
    if (this.itemId === null) {
      if (me.holding) return FAIL;
      const src = ctx.k.pantry.get(this.kind);
      if (src === undefined) return FAIL;
      this.itemId = -1;
      return { kind: 'use', tile: src };
    }
    if (this.itemId === -1) {
      const h = heldIngredient(me);
      if (h && h.kind === this.kind && h.state === 'raw' && !ctx.crew.assigned.has(h.id)) this.itemId = h.id;
      else if (me.holding) return FAIL;
      else {
        const src = ctx.k.pantry.get(this.kind);
        return src === undefined ? FAIL : { kind: 'use', tile: src };
      }
    }
    if (ctx.crew.assigned.has(this.itemId)) return DONE; // a dish adopted it
    const loc = ctx.items.get(this.itemId);
    if (!loc || loc.item.type !== 'ingredient') return DONE;
    const it = loc.item;
    const choppable = !!state.ingredients[it.kind]?.choppable;
    if (loc.at === 'held') {
      if (loc.player !== me.id) return DONE;
      if (it.state === 'raw' && choppable) {
        if (this.board === null || !surfaceFree(ctx, this.board)) {
          this.board = nearest(ctx, ctx.k.boards, (t) => surfaceFree(ctx, t));
          if (this.board === null) return this.park(ctx);
          this.claimTile(ctx, this.board);
        }
        return { kind: 'use', tile: this.board };
      }
      return this.park(ctx);
    }
    if (loc.at === 'station') {
      if (state.arena.tiles[loc.tile]?.kind === 'board') {
        if (it.state === 'raw' && choppable) return { kind: 'work', tile: loc.tile };
        if (me.holding) return FAIL;
        if (countFreeCounters(ctx) < BOT_TUNING.tidyMinFreeCounters) return DONE;
        this.board = null;
        return { kind: 'use', tile: loc.tile };
      }
      return DONE; // on a counter: stocked
    }
    return me.holding ? FAIL : loc.resting ? { kind: 'pick', item: this.itemId } : { kind: 'wait' };
  }

  private park(ctx: Ctx): StepResult {
    if (this.counter === null || !surfaceFree(ctx, this.counter)) {
      this.counter = freeCounter(ctx);
      if (this.counter === null) {
        const tr = nearest(ctx, ctx.k.trash, () => true);
        return tr === null ? FAIL : { kind: 'use', tile: tr };
      }
      this.claimTile(ctx, this.counter);
    }
    return { kind: 'use', tile: this.counter };
  }
}

/** Put whatever I'm holding somewhere sensible (counter, or trash if junk / no room). */
export class DisposeTask extends Task {
  readonly key = 'dispose';
  private counter: number | null = null;
  readonly wait = { stalled: 0 };
  step(ctx: Ctx): StepResult {
    const h = ctx.me.holding;
    if (!h) return DONE;
    const junk =
      (h.type === 'ingredient' && h.state === 'burnt') ||
      (h.type === 'plate' && h.contents.length > 0 && (isPlateCold(ctx.state, h) || !ctx.state.recipes.some((r) => subBag(h.contents, r.ingredients))));
    if (!junk) {
      if (this.counter === null || !surfaceFree(ctx, this.counter)) {
        this.counter = countFreeCounters(ctx) >= (h.type === 'plate' ? 1 : 2) ? freeCounter(ctx) : null;
        if (this.counter !== null) {
          this.claims.push(`tile:${this.counter}`);
          ctx.crew.claim(`tile:${this.counter}`, ctx.me.id);
        }
      }
      if (this.counter !== null) return { kind: 'use', tile: this.counter };
      if (h.type === 'plate') return noSurface(ctx, this.wait);
    }
    const tr = nearest(ctx, ctx.k.trash, () => true);
    return tr === null ? FAIL : { kind: 'use', tile: tr };
  }
}

/** Save food nobody is cooking for (cancelled dish, a human's pan): scoop it onto a plate and set it down. */
export class RescueTask extends Task {
  readonly key: string;
  private counter: number | null = null;
  private putDown = false;
  readonly wait = { stalled: 0 };
  constructor(readonly tile: number) {
    super();
    this.key = `rescue:${tile}`;
    this.claims = [this.key, `tile:${tile}`];
  }
  step(ctx: Ctx): StepResult {
    const { state, me, k } = ctx;
    const h = me.holding;
    const v = stationOf(state, this.tile)?.vessel;
    if (!h) {
      if (this.putDown) return DONE;
      if (!v || (v.status !== 'cooking' && v.status !== 'done')) return DONE;
      let spare: number | null = null;
      for (const [id, loc] of ctx.items) {
        if (loc.at !== 'station' || loc.item.type !== 'plate' || loc.item.dirty || loc.item.contents.length || ctx.crew.assigned.has(id)) continue;
        if (!k.counters.includes(loc.tile) || ctx.crew.claimedByOther(`tile:${loc.tile}`, me.id)) continue;
        spare = loc.tile;
        break;
      }
      if (spare !== null) return { kind: 'use', tile: spare };
      const rack = nearest(ctx, k.racks, (t) => (stationOf(state, t)?.stock ?? 0) > 0);
      return rack === null ? FAIL : { kind: 'use', tile: rack };
    }
    if (h.type !== 'plate' || h.dirty) return FAIL;
    if (h.contents.length === 0 && v && (v.status === 'cooking' || v.status === 'done')) {
      if (v.status === 'done' && plateFits(state, h, v.contents)) return { kind: 'use', tile: this.tile };
      if (v.status === 'cooking') return { kind: 'face', tile: this.tile };
    }
    this.putDown = true;
    if (this.counter === null || !surfaceFree(ctx, this.counter)) {
      this.counter = freeCounter(ctx, true);
      if (this.counter === null) return noSurface(ctx, this.wait);
      this.claims.push(`tile:${this.counter}`);
      ctx.crew.claim(`tile:${this.counter}`, me.id);
    }
    return { kind: 'use', tile: this.counter };
  }
}

/** Set what I'm carrying down on a counter (keeping its job) to free my hands for an emergency. */
export class ParkTask extends Task {
  readonly key = 'park';
  private counter: number | null = null;
  step(ctx: Ctx): StepResult {
    if (!ctx.me.holding) return DONE;
    if (this.counter === null || !surfaceFree(ctx, this.counter)) {
      this.counter = nearest(ctx, ctx.k.counters, (t) => surfaceFree(ctx, t));
      if (this.counter === null) return FAIL;
      this.claims.push(`tile:${this.counter}`);
      ctx.crew.claim(`tile:${this.counter}`, ctx.me.id);
    }
    return { kind: 'use', tile: this.counter };
  }
}

/** Nothing to cook: stand in the market where rival carriers pass (the bot's hunt logic does the rest). */
export class WatchTask extends Task {
  readonly key = 'watch';
  private ticks = 0;
  constructor(readonly tile: number) {
    super();
    this.claims = [this.key];
  }
  step(ctx: Ctx): StepResult {
    if (++this.ticks > BOT_TUNING.watchTicks) return DONE;
    return ctx.tile === this.tile ? { kind: 'wait' } : { kind: 'goto', tile: this.tile };
  }
}

export class IdleTask extends Task {
  readonly key = 'idle';
  private ticks = 0;
  constructor(readonly tile: number) {
    super();
  }
  step(ctx: Ctx): StepResult {
    if (++this.ticks > BOT_TUNING.idleTicks) return DONE;
    return ctx.tile === this.tile ? { kind: 'wait' } : { kind: 'goto', tile: this.tile };
  }
}

// ---------- charms (RULES §10) ----------

/** Walk the charm I'm carrying into our kitchen (the nearest bank tile): stepping in banks it. */
function bankAct(ctx: Ctx): Act | null {
  let best: number | null = null;
  let bestC = Infinity;
  for (const t of ctx.k.bankTiles) {
    const c = ctx.k.nav.tiles(ctx.tile, t);
    if (c < bestC) {
      bestC = c;
      best = t;
    }
  }
  return best === null ? null : { kind: 'goto', tile: best };
}

/** Fetch a resting charm and carry it home. One crewmate at a time (claim 'charm'). */
export class CharmTask extends Task {
  readonly key = 'charm';
  constructor(readonly itemId: number) {
    super();
    this.claims = [this.key];
  }
  step(ctx: Ctx): StepResult {
    const loc = ctx.items.get(this.itemId);
    if (!loc || loc.item.type !== 'charm') return DONE; // banked, faded, or round over
    if (loc.at === 'held') {
      if (loc.player !== ctx.me.id) return DONE; // someone else has it (a rival: the market play hunts them)
      return bankAct(ctx) ?? FAIL;
    }
    if (loc.at !== 'floor' || ctx.me.holding) return FAIL;
    return loc.resting ? { kind: 'pick', item: this.itemId } : { kind: 'wait' };
  }
}

/** Holding a charm some other way (caught, knocked into my path): take it home. */
export class BankCharmTask extends Task {
  readonly key = 'bankCharm';
  step(ctx: Ctx): StepResult {
    if (ctx.me.holding?.type !== 'charm') return DONE;
    return bankAct(ctx) ?? FAIL;
  }
}
