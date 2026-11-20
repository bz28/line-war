/**
 * Crew blackboard: the dishes a crew is cooking (orders), which bot is on which job (claims), and
 * task selection. Lives in the closure of createBots, never in MatchState. Each tick it is
 * reconciled against the world, so it survives knocks, a human teammate moving things, fires,
 * and bots being re-created mid-match (they adopt whatever is already in the kitchen).
 */
import {
  isPlateCold,
  timerTicks,
  vesselTimeline,
  type Food,
  type Item,
  type MatchState,
  type PlateItem,
  type PlayerId,
  type RecipeDef,
  type TeamId,
  type Ticket,
} from '@line-war/sim';
import { BotRng } from './rng';
import { BOT_TUNING } from './tuning';
import { skillParams, type SkillParams } from './skill';
import {
  ClearBurntTask,
  DisposeTask,
  ExtinguishTask,
  IdleTask,
  ParkTask,
  PlateRunTask,
  RescueTask,
  PrepSlotTask,
  StockTask,
  TrashTask,
  WashTask,
  WatchTask,
  countFreeCounters,
  findAdoptable,
  findSparePlate,
  freeVessel,
  onFire,
  plateUsableFor,
  reachable,
  stationOf,
  type Ctx,
  type Task,
} from './tasks';
import { canBecome, itemIndex, kitchenFor, pipeline, sameBag, subBag, takeFood, visibleTickets, type Kitchen } from './world';

export interface Slot {
  food: Food;
  /** Item id carrying this component (raw / chopped / ready), if any. */
  item: number | null;
  /** Stove tile cooking this component, if any. */
  vessel: number | null;
  /** Stove the item is being put into (so the hand-off survives the item id disappearing). */
  pendingVessel: number | null;
  onPlate: boolean;
}

export interface Order {
  id: number;
  recipe: RecipeDef;
  slots: Slot[];
  plate: number | null;
  /** Pot shared by the dish's pot components. */
  pot: number | null;
  created: number;
  done: boolean;
  cancelled: boolean;
  /** A visible ticket is left for this dish after older orders of the same recipe. */
  backed: boolean;
  plateComplete: boolean;
  /** Tick the dish lost its ticket (null while backed). */
  unbackedSince: number | null;
}

const T = BOT_TUNING;
const S = BOT_TUNING.score;

interface Estimate {
  /** Seconds of a bot's hands-on work. */
  busy: number;
  /** Seconds from start to serve (busy + waiting on cooking). */
  latency: number;
}

export class Crew {
  readonly members: PlayerId[] = [];
  readonly memberSkill: number[] = [];
  params!: SkillParams;
  orders: Order[] = [];
  private nextOrderId = 1;
  private claims = new Map<string, PlayerId>();
  /** Items and vessels owned by some order (rebuilt every reconcile). */
  assigned = new Set<number>();
  private vessels = new Set<number>();
  private syncedTick = -1;
  private roundIndex = -1;
  private extraOrders = 0;
  /** Bots that spend idle time watching the market this round (rolled per round, bolder with skill). */
  private watchers = new Set<PlayerId>();
  private estimates = new Map<string, Estimate>();
  private failed = new Map<string, number>();
  readonly rng: BotRng;

  constructor(
    readonly team: TeamId,
    seed: number,
  ) {
    this.rng = new BotRng(seed);
  }

  addMember(id: PlayerId, skill: number): void {
    this.members.push(id);
    this.memberSkill.push(skill);
    this.params = skillParams(this.memberSkill.reduce((a, b) => a + b, 0) / this.memberSkill.length);
  }

  /** How many dishes beyond one per bot the crew juggles (dithered so the mean is smooth in skill). */
  private rollExtraOrders(): number {
    // A lone bot has one pair of hands: juggling more than two dishes just burns food.
    const x = this.members.length > 1 ? this.params.extraOrders : 0;
    const base = Math.floor(x);
    return base + (this.rng.chance(x - base) ? 1 : 0);
  }

  // ---------- claims ----------

  claim(key: string, who: PlayerId): void {
    this.claims.set(key, who);
  }
  claimedByOther(key: string, me: PlayerId): boolean {
    const c = this.claims.get(key);
    return c !== undefined && c !== me;
  }
  /** Would some dish use this item as it is (so picking it up is progress, not clutter)? */
  wantsItem(state: MatchState, item: Item): boolean {
    if (this.assigned.has(item.id)) return true;
    if (item.type === 'plate') return !item.dirty && this.orders.some((o) => o.plate === null && !o.cancelled && plateUsableFor(state, item, o));
    return this.orders.some((o) => !o.cancelled && o.slots.some((s) => !s.onPlate && s.item === null && s.vessel === null && canBecome(state, item.kind, item.state, s.food)));
  }

  /** Claims held by `who` (for tests). */
  claimsOf(who: PlayerId): string[] {
    return [...this.claims].filter(([, v]) => v === who).map(([k]) => k);
  }
  releaseAll(who: PlayerId): void {
    for (const [k, v] of this.claims) if (v === who) this.claims.delete(k);
  }
  /** Remember a failed task so it isn't picked again straight away. */
  noteFailed(key: string, tick: number): void {
    this.failed.set(key, tick + T.failBlacklistTicks);
  }
  private recentlyFailed(key: string, tick: number): boolean {
    const t = this.failed.get(key);
    return t !== undefined && t > tick;
  }

  assign(slot: Slot, item: number): void {
    slot.item = item;
    this.assigned.add(item);
  }
  assignPlate(o: Order, item: number): void {
    o.plate = item;
    this.assigned.add(item);
  }
  vesselInUse(tile: number): boolean {
    return this.vessels.has(tile);
  }

  /** Oldest visible, live ticket for a recipe. */
  ticketFor(state: MatchState, recipe: string): Ticket | null {
    let best: Ticket | null = null;
    for (const t of visibleTickets(state, this.team)) if (t.recipe === recipe && (!best || t.spawnTick < best.spawnTick)) best = t;
    return best;
  }

  // ---------- per-tick sync ----------

  sync(state: MatchState): void {
    if (this.syncedTick === state.tick) return;
    // Time went backwards: reused for a new match, so nothing on the board is real any more.
    if (state.tick < this.syncedTick) this.roundIndex = -1;
    this.syncedTick = state.tick;
    if (this.roundIndex !== state.round.index) {
      this.roundIndex = state.round.index;
      this.orders = [];
      this.claims.clear();
      this.failed.clear();
      this.estimates.clear();
      this.extraOrders = this.rollExtraOrders();
      this.watchers.clear();
      this.members.forEach((id, i) => {
        if (this.rng.chance(skillParams(this.memberSkill[i]!).huntChance * T.watchShare)) this.watchers.add(id);
      });
    }
    const k = kitchenFor(state, this.team);
    this.reconcile(state, k);
    this.planOrders(state, k);
  }

  private reconcile(state: MatchState, k: Kitchen): void {
    const items = itemIndex(state);
    const fakeCtx = { state, k };
    const finished: Order[] = [];
    for (const o of this.orders) {
      // Plate.
      let plate: PlateItem | null = null;
      if (o.plate !== null) {
        const loc = items.get(o.plate);
        if (!loc || !reachable(fakeCtx, loc) || loc.item.type !== 'plate' || loc.item.dirty) {
          if (!loc && o.plateComplete) o.done = true; // served
          o.plate = null;
        } else plate = loc.item;
      }
      if (o.done) {
        finished.push(o);
        continue;
      }
      const bag = plate ? plate.contents.slice() : [];
      const bad = !!plate && plate.contents.length > 0 && (isPlateCold(state, plate) || !subBag(plate.contents, o.recipe.ingredients));
      o.plateComplete = !!plate && !bad && sameBag(plate.contents, o.recipe.ingredients);
      for (const s of o.slots) s.onPlate = !bad && takeFood(bag, s.food);
      // Components.
      for (const s of o.slots) {
        if (s.onPlate) {
          s.item = null;
          s.vessel = null;
          s.pendingVessel = null;
          continue;
        }
        if (s.item !== null) {
          const loc = items.get(s.item);
          const ok = !!loc && reachable(fakeCtx, loc) && loc.item.type === 'ingredient' && canBecome(state, loc.item.kind, loc.item.state, s.food);
          if (!ok) {
            if (!loc && s.pendingVessel !== null && this.vesselHolds(state, s.pendingVessel, s.food, o)) s.vessel = s.pendingVessel;
            s.item = null;
            s.pendingVessel = null;
          }
        }
        if (s.vessel !== null && !this.vesselHolds(state, s.vessel, s.food, o)) s.vessel = null;
      }
      // Pot: no more slots may claim it than it holds.
      if (o.pot !== null) {
        const v = stationOf(state, o.pot)?.vessel;
        const ok = !!v && v.status !== 'burnt' && v.status !== 'fire' && v.contents.every((f) => canPot(state, f, o));
        if (!ok) o.pot = null;
        let n = v ? v.contents.length : 0;
        for (const s of o.slots) {
          if (s.vessel !== o.pot || s.vessel === null) continue;
          if (n > 0) n--;
          else s.vessel = null;
        }
        if (o.pot === null) for (const s of o.slots) if (s.vessel !== null && pipeline(state, s.food).vessel === 'pot') s.vessel = null;
      }
    }
    this.orders = this.orders.filter((o) => !o.done);
    if (finished.length) this.extraOrders = this.rollExtraOrders();

    // Rebuild ownership sets.
    this.assigned.clear();
    this.vessels.clear();
    for (const o of this.orders) {
      if (o.plate !== null) this.assigned.add(o.plate);
      if (o.pot !== null) this.vessels.add(o.pot);
      for (const s of o.slots) {
        if (s.item !== null) this.assigned.add(s.item);
        if (s.vessel !== null) this.vessels.add(s.vessel);
      }
    }

    // Adopt orphan cooking vessels (e.g. a human teammate's pan, or after bots were re-created).
    for (const o of this.orders) {
      for (const s of o.slots) {
        if (s.onPlate || s.item !== null || s.vessel !== null) continue;
        const p = pipeline(state, s.food);
        if (p.vessel !== 'pan') continue;
        for (const t of k.pans) {
          if (this.vessels.has(t)) continue;
          const v = stationOf(state, t)?.vessel;
          if (v && (v.status === 'cooking' || v.status === 'done') && v.contents[0]?.kind === s.food.kind) {
            s.vessel = t;
            this.vessels.add(t);
            break;
          }
        }
      }
      if (o.pot === null && o.slots.some((s) => !s.onPlate && pipeline(state, s.food).vessel === 'pot')) {
        for (const t of k.pots) {
          if (this.vessels.has(t)) continue;
          const v = stationOf(state, t)?.vessel;
          if (!v || v.contents.length === 0 || v.status === 'burnt' || v.status === 'fire') continue;
          const need = o.slots.filter((s) => !s.onPlate && s.item === null && pipeline(state, s.food).vessel === 'pot');
          if (v.contents.length > need.length || !v.contents.every((f) => need.some((s) => s.food.kind === f.kind))) continue;
          o.pot = t;
          this.vessels.add(t);
          let n = v.contents.length;
          for (const s of need) if (n-- > 0) s.vessel = t;
          break;
        }
      }
    }

    // Backing: is a visible ticket left for each order (oldest orders first)?
    const spare = this.spareTickets(state);
    const used = new Map<string, number>();
    const next: Order[] = [];
    for (const o of this.orders) {
      const u = used.get(o.recipe.id) ?? 0;
      o.backed = u < (spare.get(o.recipe.id) ?? 0);
      used.set(o.recipe.id, u + 1);
      if (o.backed) {
        o.unbackedSince = null;
        next.push(o);
        continue;
      }
      o.unbackedSince ??= state.tick;
      const progress = o.plate !== null || o.pot !== null || o.slots.some((s) => s.onPlate || s.item !== null || s.vessel !== null);
      if (!progress) {
        if (!this.slotBusy(o)) o.cancelled = true;
        else next.push(o);
        continue;
      }
      // Can what we have become another dish that still has a ticket?
      const re = this.retarget(state, o, spare, used);
      if (re) {
        o.cancelled = true;
        used.set(re.recipe.id, (used.get(re.recipe.id) ?? 0) + 1);
        next.push(re);
        continue;
      }
      // Hold on for a while (tickets come every few seconds); give up once the plate is spoilt or it's been too long.
      const plateBad = o.plate !== null && !o.plateComplete && o.slots.every((s) => !s.onPlate) && this.plateHasFood(state, o.plate);
      const waited = state.tick - o.unbackedSince > T.unbackedPatienceSeconds * state.config.tuning.tickRate;
      if (plateBad || waited) o.cancelled = true;
      else next.push(o);
    }
    this.orders = next;
  }

  private plateHasFood(state: MatchState, id: number): boolean {
    const loc = itemIndex(state).get(id);
    return !!loc && loc.item.type === 'plate' && loc.item.contents.length > 0;
  }

  /** Visible tickets per recipe, minus the ones the rival is about to serve. */
  private spareTickets(state: MatchState): Map<string, number> {
    const out = new Map<string, number>();
    for (const t of visibleTickets(state, this.team)) out.set(t.recipe, (out.get(t.recipe) ?? 0) + 1);
    for (const [r, n] of this.rivalNearlyDone(state)) out.set(r, (out.get(r) ?? 0) - n);
    return out;
  }

  /** A new order for another recipe that keeps every bit of this order's progress, if one has a spare ticket. */
  private retarget(state: MatchState, o: Order, spare: Map<string, number>, used: Map<string, number>): Order | null {
    const plateFoods: Food[] = [];
    if (o.plate !== null) {
      const loc = itemIndex(state).get(o.plate);
      if (loc?.item.type === 'plate') plateFoods.push(...loc.item.contents);
    }
    for (const r of state.recipes) {
      if (r.id === o.recipe.id || (spare.get(r.id) ?? 0) <= (used.get(r.id) ?? 0)) continue;
      const need = r.ingredients.map((f) => ({ ...f }));
      if (!plateFoods.every((f) => takeFood(need, f))) continue;
      const slots: Slot[] = need.map((f) => ({ food: f, item: null, vessel: null, pendingVessel: null, onPlate: false }));
      let ok = true;
      for (const s of o.slots) {
        if (s.onPlate || (s.item === null && s.vessel === null)) continue;
        const target = slots.find((x) => x.item === null && x.vessel === null && x.food.kind === s.food.kind && x.food.state === s.food.state);
        if (!target) {
          ok = false;
          break;
        }
        target.item = s.item;
        target.vessel = s.vessel;
      }
      if (!ok) continue;
      const onPlate: Slot[] = plateFoods.map((f) => ({ food: { ...f }, item: null, vessel: null, pendingVessel: null, onPlate: true }));
      return { ...this.newOrder(state, r), slots: [...onPlate, ...slots], plate: o.plate, pot: o.pot };
    }
    return null;
  }

  /** Does `tile`'s vessel hold (or cook) this component? */
  private vesselHolds(state: MatchState, tile: number, food: Food, o: Order): boolean {
    const v = stationOf(state, tile)?.vessel;
    if (!v || v.status === 'burnt' || v.status === 'fire') return false;
    if (pipeline(state, food).vessel === 'pot') return v.contents.some((f) => f.kind === food.kind) && (o.pot === null || o.pot === tile);
    return (v.status === 'cooking' || v.status === 'done') && v.contents[0]?.kind === food.kind;
  }

  private slotBusy(o: Order): boolean {
    for (const key of this.claims.keys()) if (key.startsWith(`slot:${o.id}:`) || key === `plate:${o.id}`) return true;
    return false;
  }

  /** Rival plates that are one step (or zero) from a recipe: they will probably win that ticket. */
  private rivalNearlyDone(state: MatchState): Map<string, number> {
    const out = new Map<string, number>();
    const rivalTeam = (1 - this.team) as TeamId;
    const plates: PlateItem[] = [];
    const held = new Set<PlateItem>();
    for (const p of state.players) {
      if (p.team === rivalTeam && p.holding?.type === 'plate') {
        plates.push(p.holding);
        held.add(p.holding);
      }
    }
    const rk = kitchenFor(state, rivalTeam);
    for (const t of rk.counters) {
      const it = stationOf(state, t)?.item;
      if (it?.type === 'plate') plates.push(it);
    }
    for (const pl of plates) {
      if (pl.dirty || pl.contents.length === 0 || isPlateCold(state, pl)) continue;
      const fits = state.recipes.filter((r) => subBag(pl.contents, r.ingredients));
      const done = fits.find((r) => r.ingredients.length === pl.contents.length);
      const near = fits.length === 1 && fits[0]!.ingredients.length - pl.contents.length === 1 && held.has(pl) ? fits[0] : undefined;
      const r = done ?? near;
      if (r) out.set(r.id, (out.get(r.id) ?? 0) + 1);
    }
    return out;
  }

  // ---------- choosing dishes ----------

  private estimate(state: MatchState, k: Kitchen, r: RecipeDef): Estimate {
    const cached = this.estimates.get(r.id);
    if (cached) return cached;
    const t = state.config.tuning;
    const speed = t.playerSpeed;
    const hub = k.nav.access.get(k.assembly[0] ?? -1)?.[0]?.tile ?? k.idleTile;
    const trip = (st: number | undefined): number => (st === undefined ? T.unknownTripSeconds : (2 * k.nav.toStation(hub, st)) / speed + T.tripOverheadSeconds);
    let busy = trip(k.racks[0]) + trip(k.passes[0]);
    let wait = 0;
    let pot = false;
    for (const f of r.ingredients) {
      const p = pipeline(state, f);
      busy += trip(k.pantry.get(f.kind) ?? k.crate.get(f.kind));
      if (p.chop) busy += timerTicks(state.config, t.chopSeconds) / t.tickRate + T.chopOverheadSeconds;
      if (p.vessel === 'pan') {
        busy += trip(k.pans[0]) * 0.5;
        wait = Math.max(wait, vesselTimeline(state, 'pan').done / t.tickRate);
      } else if (p.vessel === 'pot') {
        if (!pot) busy += trip(k.pots[0]) * 0.5;
        pot = true;
        wait = Math.max(wait, vesselTimeline(state, 'pot').done / t.tickRate);
      }
    }
    const e = { busy, latency: busy + wait };
    this.estimates.set(r.id, e);
    return e;
  }

  private planOrders(state: MatchState, k: Kitchen): void {
    const phase = state.round.phase;
    if (phase !== 'service' && phase !== 'rush' && phase !== 'lastCall') return;
    const max = Math.max(1, this.members.length) + this.extraOrders;
    while (this.orders.filter((o) => o.backed).length < max && this.orders.length < max + 2) {
      const r = this.chooseRecipe(state, k);
      if (!r) return;
      this.orders.push(this.newOrder(state, r));
    }
  }

  private newOrder(state: MatchState, r: RecipeDef): Order {
    return {
      id: this.nextOrderId++,
      recipe: r,
      slots: r.ingredients.map((f) => ({ food: { kind: f.kind, state: f.state }, item: null, vessel: null, pendingVessel: null, onPlate: false })),
      plate: null,
      pot: null,
      created: state.tick,
      done: false,
      cancelled: false,
      backed: true,
      unbackedSince: null,
      plateComplete: false,
    };
  }

  private chooseRecipe(state: MatchState, k: Kitchen): RecipeDef | null {
    const tickets = visibleTickets(state, this.team).sort((a, b) => a.spawnTick - b.spawnTick || a.id - b.id);
    if (tickets.length === 0) return null;
    const t = state.config.tuning;
    const rate = t.tickRate;
    const roundLeft = (state.config.roundSeconds * rate - state.round.tick) / rate;
    const rival = this.rivalNearlyDone(state);
    const fakeCtx = { state, k, crew: this, me: state.players[this.members[0]!], tile: k.idleTile, items: itemIndex(state), stoveLeadTicks: 0 } as Ctx;
    // Plates: every dish needs one.
    const rackStock = k.racks.reduce((n, r) => n + (stationOf(state, r)?.stock ?? 0), 0);
    const platesFree = rackStock + this.sparePlates(state) - this.orders.filter((o) => o.plate === null).length;
    if (platesFree <= 0) return null;
    const freePans = k.pans.filter((p) => freeVessel(fakeCtx, [p]) !== null).length - this.pendingPanSlots(state);
    const freePots = k.pots.filter((p) => freeVessel(fakeCtx, [p]) !== null).length - this.orders.filter((o) => o.pot === null && o.recipe.ingredients.some((f) => pipeline(state, f).vessel === 'pot')).length;
    let best: RecipeDef | null = null;
    let bestScore = -Infinity;
    // Near the buzzer, an idle crew still goes for the quickest dish on the board (people do).
    let lastGasp: RecipeDef | null = null;
    let lastGaspBusy = Infinity;
    for (const r of state.recipes) {
      const e = this.estimate(state, k, r);
      const slack = this.orders.length * T.slackPerOrderSeconds;
      if (e.busy + slack > roundLeft) {
        if (this.orders.length === 0 && e.busy < lastGaspBusy && tickets.some((x) => x.recipe === r.id)) {
          lastGasp = r;
          lastGaspBusy = e.busy;
        }
        continue;
      }
      const usesPan = r.ingredients.filter((f) => pipeline(state, f).vessel === 'pan').length;
      const usesPot = r.ingredients.some((f) => pipeline(state, f).vessel === 'pot');
      if (usesPan > freePans || (usesPot && freePots <= 0)) continue;
      const finishTick = state.tick + Math.round((e.latency + slack) * rate);
      const live = tickets.filter((x) => x.recipe === r.id && x.expireTick > finishTick);
      const taken = this.orders.filter((o) => o.recipe.id === r.id).length + (rival.get(r.id) ?? 0);
      const tk = live[taken];
      if (!tk) continue;
      const life = Math.max(1, tk.expireTick - tk.spawnTick);
      const fresh = 1 - (1 - t.freshnessFloor) * Math.min(1, Math.max(0, finishTick - tk.spawnTick) / life);
      // Work-rate value: points per second of hands-on time, with a nudge for tickets about to lapse.
      let score = (tk.baseValue * fresh) / (e.busy + T.waitWeight * (e.latency - e.busy));
      if (this.hasLeftovers(state, k, r)) score *= T.leftoverBonus;
      score *= 1 + this.params.ticketNoise * (this.rng.next() * 2 - 1);
      if (score > bestScore) {
        bestScore = score;
        best = r;
      }
    }
    return best ?? (roundLeft > T.lastGaspMinSeconds ? lastGasp : null);
  }

  /** Some unclaimed food in the kitchen (a cooking vessel, a plated part) already belongs to this recipe. */
  private hasLeftovers(state: MatchState, k: Kitchen, r: RecipeDef): boolean {
    for (const t of this.orphanVessels(state, k)) {
      const v = stationOf(state, t)!.vessel!;
      if (v.contents.every((f) => r.ingredients.some((x) => x.kind === f.kind && pipeline(state, x).vessel === v.kind))) return true;
    }
    for (const [id, loc] of itemIndex(state)) {
      if (loc.item.type !== 'plate' || this.assigned.has(id) || loc.item.contents.length === 0 || loc.at !== 'station' || !k.counters.includes(loc.tile)) continue;
      if (!isPlateCold(state, loc.item) && subBag(loc.item.contents, r.ingredients)) return true;
    }
    return false;
  }

  private sparePlates(state: MatchState): number {
    let n = 0;
    const items = itemIndex(state);
    const k = kitchenFor(state, this.team);
    for (const [id, loc] of items) {
      if (loc.item.type !== 'plate' || loc.item.dirty || this.assigned.has(id) || loc.item.contents.length > 0) continue;
      if (loc.at === 'station' && k.counters.includes(loc.tile)) n++;
      else if (loc.at === 'held' && state.players[loc.player].team === this.team) n++;
    }
    return n;
  }

  private pendingPanSlots(state: MatchState): number {
    let n = 0;
    for (const o of this.orders) for (const s of o.slots) if (!s.onPlate && s.vessel === null && pipeline(state, s.food).vessel === 'pan') n++;
    return n;
  }

  // ---------- choosing a task ----------

  chooseTask(ctx: Ctx): Task {
    const { state, me, k } = ctx;
    const held = me.holding;
    if (held) return this.continuation(ctx);

    let best: Task | null = null;
    let bestScore = -Infinity;
    const offer = (task: Task, score: number, at: number | null): void => {
      if (this.claimedByOther(task.key, me.id) || this.recentlyFailed(task.key, state.tick)) return;
      const d = at === null ? 0 : k.nav.toStation(ctx.tile, at);
      const s = score - (Number.isFinite(d) ? d : 99) * T.distancePenaltyPerTile;
      if (s > bestScore) {
        bestScore = s;
        best = task;
        task.priority = score;
      }
    };

    // Emergencies.
    for (const f of state.fires) if (k.owned.includes(f.tile)) offer(new ExtinguishTask(f.tile), S.fire, f.tile);
    for (const t of [...k.pans, ...k.pots]) {
      const v = stationOf(state, t)?.vessel;
      if (v && v.status === 'burnt' && !onFire(state, t)) offer(new ClearBurntTask(t), S.burnt, t);
    }

    // Food cooking for no dish: save it before it burns.
    for (const t of this.orphanVessels(state, k)) {
      const v = stationOf(state, t)!.vessel!;
      const left = vesselTimeline(state, v.kind).done - v.cookTicks;
      if (v.status === 'done') offer(new RescueTask(t), S.rescueDone, t);
      else if (left <= ctx.stoveLeadTicks + this.plateTravelTicks(ctx, null, t)) offer(new RescueTask(t), S.rescueSoon, t);
    }

    // Dishes, oldest first.
    const rackStock = k.racks.reduce((n, t) => n + (stationOf(state, t)?.stock ?? 0), 0);
    this.orders.forEach((o, rank) => {
      const base = (o.backed ? 0 : S.unbacked) + rank * S.perRank;
      const run = this.plateRunNeed(ctx, o);
      if (run !== null) offer(new PlateRunTask(o), run + base, this.plateTile(ctx, o));
      o.slots.forEach((s, i) => {
        const need = this.slotNeed(ctx, o, s);
        if (need === null) return;
        offer(new PrepSlotTask(o, i), need + base, need >= 0 ? this.slotTile(ctx, s) : null);
      });
      if (o.plate === null && run === null && (rackStock > 0 || findSparePlate(ctx, o) !== null)) offer(new PlateRunTask(o), S.getPlate + base, k.racks[0] ?? null);
    });

    // Plates and tidying.
    for (const sink of k.sinks) {
      const st = stationOf(state, sink);
      if (!st || st.dirtyPlates <= 0) continue;
      const waiting = this.orders.some((o) => o.plate === null);
      const score = rackStock === 0 ? (waiting ? S.washUrgent : S.washEmpty) : rackStock === 1 ? S.washLow : S.washSome;
      offer(new WashTask(sink, rackStock === 0 && waiting ? 1 : 3), score, sink);
    }
    for (const [id, loc] of ctx.items) {
      if (this.assigned.has(id) || loc.at === 'held' || !reachable(ctx, loc)) continue;
      const it = loc.item;
      const at = loc.at === 'station' ? loc.tile : null;
      if (at !== null && !k.owned.includes(at)) continue;
      if (it.type === 'plate') {
        if (it.contents.length > 0 && (isPlateCold(state, it) || !state.recipes.some((r) => subBag(it.contents, r.ingredients)))) {
          offer(new TrashTask(id), S.trash, at);
        }
      } else if (it.state === 'burnt') {
        offer(new TrashTask(id), S.trash, at);
      } else if (at !== null && state.arena.tiles[at]?.kind === 'board' && !this.claimedByOther(`tile:${at}`, me.id)) {
        if (state.ingredients[it.kind]?.choppable && it.state === 'raw') offer(new StockTask(it.kind, id), S.clearBoardRaw, at);
        else if (countFreeCounters(ctx) >= T.tidyMinFreeCounters) offer(new StockTask(it.kind, id), S.clearBoard, at);
      }
    }

    // Idle time: stock basic chopped ingredients for later dishes, or (bolder bots) go and
    // contest the market while premium tickets are up.
    if (bestScore < S.idleThreshold) {
      const stock = this.stockNeed(ctx);
      if (stock) offer(new StockTask(stock), S.stock, k.pantry.get(stock) ?? null);
      const premiumUp = visibleTickets(state, this.team).some((t) => state.recipes.find((r) => r.id === t.recipe)?.premium);
      if (this.watchers.has(me.id) && premiumUp && k.watchTiles.length > 0) {
        const spot = k.watchTiles[Math.floor(state.tick / T.watchTicks) % k.watchTiles.length]!;
        offer(new WatchTask(spot), S.watch, null);
      }
    }
    return best ?? new IdleTask(k.idleTile);
  }

  /** Holding something: carry on with whatever it belongs to, or put it away. */
  private continuation(ctx: Ctx): Task {
    const held = ctx.me.holding!;
    const ok = (t: Task): boolean => !this.recentlyFailed(t.key, ctx.state.tick);
    {
      // Free my hands if food is about to burn (or burnt food is about to catch fire) and nobody is on it.
      const risk = this.burnRisk(ctx);
      const limit = held.type === 'ingredient' ? T.parkIngredientRiskSeconds : T.parkPlateRiskSeconds;
      if (risk !== null && risk < limit && countFreeCounters(ctx) > 0 && ok(new ParkTask())) return new ParkTask();
    }
    for (const o of this.orders) {
      if (o.plate === held.id) {
        const t = new PlateRunTask(o);
        return ok(t) ? t : new DisposeTask();
      }
      for (let i = 0; i < o.slots.length; i++) {
        if (o.slots[i]!.item !== held.id) continue;
        const t = new PrepSlotTask(o, i);
        return ok(t) ? t : new DisposeTask();
      }
    }
    if (!this.assigned.has(held.id)) {
      if (held.type === 'ingredient') {
        for (const o of this.orders) {
          for (let i = 0; i < o.slots.length; i++) {
            const s = o.slots[i]!;
            if (s.onPlate || s.item !== null || s.vessel !== null || this.claimedByOther(`slot:${o.id}:${i}`, ctx.me.id)) continue;
            if (canBecome(ctx.state, held.kind, held.state, s.food)) {
              this.assign(s, held.id);
              return new PrepSlotTask(o, i);
            }
          }
        }
      } else {
        for (const o of this.orders) {
          if (o.plate !== null || this.claimedByOther(`plate:${o.id}`, ctx.me.id)) continue;
          if (plateUsableFor(ctx.state, held, o)) {
            this.assignPlate(o, held.id);
            return new PlateRunTask(o);
          }
        }
      }
    }
    return new DisposeTask();
  }

  /** Score for running the plate now (scoop / deliver / trash), or null. */
  private plateRunNeed(ctx: Ctx, o: Order): number | null {
    const { state } = ctx;
    if (o.plateComplete) return this.ticketFor(state, o.recipe.id) ? S.deliver : null;
    if (o.plate !== null) {
      const loc = ctx.items.get(o.plate);
      if (loc && loc.item.type === 'plate' && loc.item.contents.length > 0 && !plateUsableFor(state, loc.item, o)) return S.badPlate;
    }
    let need: number | null = null;
    for (const s of o.slots) {
      if (s.onPlate || s.vessel === null) continue;
      const v = stationOf(state, s.vessel)?.vessel;
      if (!v) continue;
      if (v.status === 'done') {
        const tl = vesselTimeline(state, v.kind);
        const urgency = 1 - (tl.burnt - v.cookTicks) / Math.max(1, tl.burnt - tl.done);
        need = Math.max(need ?? 0, S.scoopBase + urgency * S.scoopUrgency);
      } else if (v.status === 'cooking') {
        const left = vesselTimeline(state, v.kind).done - v.cookTicks;
        const travel = this.plateTravelTicks(ctx, o, s.vessel);
        if (left <= ctx.stoveLeadTicks + travel) need = Math.max(need ?? 0, S.scoopSoon);
      }
    }
    return need;
  }

  private plateTravelTicks(ctx: Ctx, o: Order | null, stove: number): number {
    const { k, state } = ctx;
    const t = state.config.tuning;
    let tiles: number;
    const loc = o && o.plate !== null ? ctx.items.get(o.plate) : undefined;
    const plateTile = loc?.at === 'station' ? loc.tile : (k.racks[0] ?? stove);
    const a = k.nav.toStation(ctx.tile, plateTile);
    const acc = k.nav.access.get(plateTile)?.[0]?.tile ?? ctx.tile;
    tiles = a + k.nav.toStation(acc, stove);
    if (!Number.isFinite(tiles)) tiles = T.unknownTravelTiles;
    return (tiles / t.playerSpeed) * t.tickRate + T.stoveTravelPadTicks;
  }

  /** Own stoves cooking food that no dish has claimed. */
  orphanVessels(state: MatchState, k: Kitchen): number[] {
    const out: number[] = [];
    for (const t of [...k.pans, ...k.pots]) {
      if (this.vessels.has(t)) continue;
      const v = stationOf(state, t)?.vessel;
      if (v && (v.status === 'cooking' || v.status === 'done') && !onFire(state, t)) out.push(t);
    }
    return out;
  }

  /** A done vessel that will burn soon with nobody heading there (seconds left), or null. */
  private burnRisk(ctx: Ctx): number | null {
    const { state, k, me } = ctx;
    let worst: number | null = null;
    for (const t of [...k.pans, ...k.pots]) {
      const v = stationOf(state, t)?.vessel;
      if (!v || (v.status !== 'done' && v.status !== 'burnt') || onFire(state, t)) continue;
      const tl = vesselTimeline(state, v.kind);
      // Done: seconds until it burns. Burnt: seconds until it catches fire (worse), counted as sooner.
      const left = v.status === 'done' ? (tl.burnt - v.cookTicks) / state.config.tuning.tickRate : (tl.fire - v.cookTicks) / state.config.tuning.tickRate - 1;
      const covered = [...this.claims.entries()].some(
        ([key, who]) =>
          who !== me.id &&
          (key === `rescue:${t}` || key === `burnt:${t}` || (key.startsWith('plate:') && this.orders.some((o) => `plate:${o.id}` === key && o.slots.some((s) => s.vessel === t)))),
      );
      if (covered) continue;
      if (worst === null || left < worst) worst = left;
    }
    return worst;
  }

  private plateTile(ctx: Ctx, o: Order): number | null {
    if (o.plate === null) return ctx.k.racks[0] ?? null;
    const loc = ctx.items.get(o.plate);
    return loc?.at === 'station' ? loc.tile : null;
  }

  /** Score for working on this component now, or null if nothing to do (waiting / done). */
  private slotNeed(ctx: Ctx, o: Order, s: Slot): number | null {
    const { state, k } = ctx;
    if (s.onPlate || s.vessel !== null) return null;
    const p = pipeline(state, s.food);
    const vesselBonus = p.vessel === 'pan' ? S.panBonus : p.vessel === 'pot' ? S.potBonus : 0;
    if (s.item === null) {
      if (o.cancelled || !o.backed) return null;
      if (p.vessel === 'pan' && freeVessel(ctx, k.pans) === null && findAdoptable(ctx, s.food) === null) return null;
      if (p.vessel === 'pot' && o.pot === null && freeVessel(ctx, k.pots) === null) return null;
      return S.fetch + vesselBonus;
    }
    const loc = ctx.items.get(s.item);
    if (!loc || loc.item.type !== 'ingredient') return S.fetch;
    if (loc.at === 'held') return loc.player === ctx.me.id ? S.holdingSlot : null;
    const it = loc.item;
    if (it.state === 'raw' && p.chop) return S.chop + vesselBonus;
    const needsVessel = p.vessel !== null && it.state === (p.chop ? 'chopped' : 'raw');
    if (needsVessel) {
      const ok = p.vessel === 'pot' ? o.pot !== null || freeVessel(ctx, k.pots) !== null : freeVessel(ctx, k.pans) !== null;
      return ok ? S.choppedToVessel + vesselBonus : null;
    }
    if (it.state === s.food.state) {
      if (o.plate === null) return null;
      const pl = ctx.items.get(o.plate);
      return pl?.at === 'station' ? S.toPlate : null;
    }
    return null;
  }

  private slotTile(ctx: Ctx, s: Slot): number | null {
    if (s.item !== null) {
      const loc = ctx.items.get(s.item);
      if (loc?.at === 'station') return loc.tile;
      return null;
    }
    return ctx.k.pantry.get(s.food.kind) ?? ctx.k.crate.get(s.food.kind) ?? null;
  }

  /** A basic ingredient worth pre-chopping, if the counters have room. */
  private stockNeed(ctx: Ctx): Food['kind'] | null {
    const { state, k } = ctx;
    if (countFreeCounters(ctx) < T.stockMinFreeCounters) return null;
    const have = new Map<string, number>();
    for (const [id, loc] of ctx.items) {
      if (this.assigned.has(id) || loc.item.type !== 'ingredient' || loc.at === 'floor') continue;
      if (loc.at === 'held' && state.players[loc.player].team !== this.team) continue;
      if (loc.at === 'station' && !k.owned.includes(loc.tile)) continue;
      have.set(loc.item.kind, (have.get(loc.item.kind) ?? 0) + 1);
    }
    for (const key of this.claims.keys()) if (key.startsWith('stock:')) have.set(key.slice(6), (have.get(key.slice(6)) ?? 0) + 1);
    for (const kind of stockKinds(state, k)) if ((have.get(kind) ?? 0) < T.stockPerKind) return kind;
    return null;
  }
}

const stockCache = new WeakMap<Kitchen, Food['kind'][]>();

/**
 * Basic ingredients worth pre-chopping when idle: pantry items (free, unlimited) that recipes use
 * chopped, directly or as the first step before cooking. Most used first.
 */
export function stockKinds(state: MatchState, k: Kitchen): Food['kind'][] {
  const cached = stockCache.get(k);
  if (cached) return cached;
  const uses = new Map<Food['kind'], number>();
  for (const r of state.recipes) {
    for (const f of r.ingredients) {
      if (!k.pantry.has(f.kind) || !state.ingredients[f.kind]?.choppable || !pipeline(state, f).chop) continue;
      uses.set(f.kind, (uses.get(f.kind) ?? 0) + 1);
    }
  }
  const out = [...uses.keys()].sort((a, b) => uses.get(b)! - uses.get(a)! || (a < b ? -1 : a > b ? 1 : 0));
  stockCache.set(k, out);
  return out;
}

/** Pot contents that belong to this dish's recipe. */
function canPot(state: MatchState, f: Food, o: Order): boolean {
  return o.recipe.ingredients.some((r) => r.kind === f.kind && pipeline(state, r).vessel === 'pot');
}
