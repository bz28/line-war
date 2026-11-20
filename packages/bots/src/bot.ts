/**
 * One bot: picks tasks from its crew, turns the task's Act into stick + button input
 * (walk the path, face the station, press Grab only when the sim's interaction target is the
 * station), handles getting blocked, and plays the market (knocks, steals, evasion).
 */
import {
  NO_INPUT,
  interactTarget,
  tileOwner,
  vecLength,
  type Item,
  type MatchState,
  type PlayerId,
  type PlayerInput,
  type Vec2,
} from '@line-war/sim';
import type { Crew } from './crew';
import { STEP_COST, type Nav } from './nav';
import { BotRng } from './rng';
import type { SkillParams } from './skill';
import { DONE, FAIL, type Act, type Ctx, type Task } from './tasks';
import { BOT_TUNING } from './tuning';
import { itemIndex, kitchenFor } from './world';

const {
  arriveDist: ARRIVE_DIST,
  arriveMargin: ARRIVE_MARGIN,
  waypointDist: WAYPOINT_DIST,
  stuckTicks: STUCK_TICKS,
  giveUpLevel: GIVE_UP_LEVEL,
  repathTicks: REPATH_TICKS,
  grabGapTicks: GRAB_GAP_TICKS,
  maxPresses: MAX_PRESSES,
  maxTaskTicks: MAX_TASK_TICKS,
  urgentPriority: URGENT_PRIORITY,
  huntRange: HUNT_RANGE,
  huntTicks: HUNT_TICKS,
  cutMarginSeconds: CUT_MARGIN_SECONDS,
  episodeTtlTicks: EPISODE_TTL_TICKS,
} = BOT_TUNING;
/** Interaction target offset (RULES §1: pos + facing × 0.75). */
const TARGET_OFFSET = 0.75;

const BODY_OFFSETS: readonly [number, number][] = [
  [0, 0],
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/** walk() result when there is no way to the goal (the caller decides what that means). */
const NO_WAY = 'noWay' as const;
type Walk = Vec2 | null | typeof NO_WAY;

const actKey = (a: Act): string =>
  a.kind === 'pick' ? `pick:${a.item}` : a.kind === 'wait' || a.kind === 'drop' ? a.kind : `${a.kind}:${a.tile}`;

const ORTHO: readonly [number, number][] = [
  [0, 1],
  [1, 0],
  [0, -1],
  [-1, 0],
];

export class Bot {
  private task: Task | null = null;
  private taskSince = 0;
  private act: Act | null = null;
  private key = '';
  private readyAt = 0;
  private lastGrab = -99;
  private presses = 0;
  private roundIndex = -1;
  private lastTick = -1;
  // navigation
  private path: number[] | null = null;
  private pathKey = '';
  private pathIdx = 0;
  private pathTick = 0;
  private pathFrom = -1;
  private nextGlance = 0;
  private best = Infinity;
  private bestTick = 0;
  private stuck = 0;
  private sidestepUntil = 0;
  private sidestep: Vec2 = { x: 0, y: 0 };
  private extra: Int32Array | null = null;
  private blocked: Uint8Array | null = null;
  // market play
  private huntTarget: PlayerId | null = null;
  private huntUntil = 0;
  /** One roll per market encounter (episode key → decision and the tick it was last seen). */
  private considered = new Map<number, { take: boolean; seen: number }>();
  private chase: number | null = null;
  private chaseUntil = 0;
  /** Knocks this bot landed (for tests / stats). */
  knocks = 0;
  /** Stats for tuning: ticks per task kind, failed tasks, stuck repaths. */
  readonly stats = { ticks: new Map<string, number>(), fails: new Map<string, number>(), stuck: 0, giveUps: 0 };

  constructor(
    readonly id: PlayerId,
    readonly crew: Crew,
    readonly params: SkillParams,
    readonly rng: BotRng,
  ) {}

  decide(state: MatchState): PlayerInput {
    const phase = state.round.phase;
    if (phase === 'roundOver' || phase === 'matchOver') {
      this.resetRound(-1);
      return NO_INPUT;
    }
    // Time went backwards: these brains are being reused for a new match. Start from scratch.
    if (state.tick < this.lastTick) this.resetMatch();
    if (this.roundIndex !== state.round.index) this.resetRound(state.round.index);
    this.lastTick = state.tick;
    const me = state.players[this.id];
    const k = kitchenFor(state, me.team);
    this.crew.sync(state);
    for (const ev of state.events) if (ev.type === 'knock' && ev.by === this.id) this.onKnock(ev.itemId, state, !me.holding);

    const ctx: Ctx = {
      state,
      me,
      crew: this.crew,
      k,
      items: itemIndex(state, me.team),
      tile: k.nav.openTileNear(me.pos),
      stoveLeadTicks: this.params.stoveLeadSeconds * state.config.tuning.tickRate,
    };

    const market = this.marketPlay(ctx);
    if (market) return market;

    this.maybePreempt(ctx);
    let act: Act | null = null;
    for (let tries = 0; tries < 3 && act === null; tries++) {
      if (!this.task) this.startTask(ctx, this.crew.chooseTask(ctx));
      const r = this.task!.step(ctx);
      if (r === DONE || r === FAIL || state.tick - this.taskSince > MAX_TASK_TICKS) {
        if (r !== DONE) {
          this.crew.noteFailed(this.task!.key, state.tick);
          this.count(this.stats.fails, this.task!.key);
        }
        this.endTask();
        continue;
      }
      act = r;
    }
    if (this.task) this.count(this.stats.ticks, this.task.key);
    if (!act) return NO_INPUT;
    return this.execute(ctx, act);
  }

  private count(m: Map<string, number>, key: string): void {
    const k = key.split(':')[0]!;
    m.set(k, (m.get(k) ?? 0) + 1);
  }

  /** Forget everything tied to the old match's clock (a reused brain must not wait for old ticks). */
  private resetMatch(): void {
    this.endTask();
    this.resetRound(-1);
    this.taskSince = 0;
    this.readyAt = 0;
    this.lastGrab = -99;
    this.presses = 0;
    this.pathTick = 0;
    this.pathFrom = -1;
    this.nextGlance = 0;
    this.best = Infinity;
    this.bestTick = 0;
    this.stuck = 0;
    this.sidestepUntil = 0;
    this.huntUntil = 0;
    this.chaseUntil = 0;
  }

  private resetRound(index: number): void {
    this.roundIndex = index;
    this.task = null;
    this.act = null;
    this.key = '';
    this.path = null;
    this.huntTarget = null;
    this.chase = null;
    this.considered.clear();
  }

  /**
   * With empty hands, drop a routine job for an urgent one (food about to be done or burn, a
   * fire) that nobody else has picked up. Checked a few times a second, like a glance around.
   */
  private maybePreempt(ctx: Ctx): void {
    const { state, me } = ctx;
    if (!this.task || me.holding || state.tick < this.nextGlance) return;
    this.nextGlance = state.tick + Math.max(1, Math.round(this.params.glanceTicks * (0.75 + 0.5 * this.rng.next())));
    const cand = this.crew.chooseTask(ctx);
    if (cand.key === this.task.key || cand.priority < URGENT_PRIORITY || cand.priority < this.task.priority + BOT_TUNING.preemptMargin) return;
    this.endTask();
    this.startTask(ctx, cand);
  }

  private startTask(ctx: Ctx, t: Task): void {
    this.task = t;
    this.taskSince = ctx.state.tick;
    this.key = ''; // a new task re-reacts and re-counts presses even if its first act looks the same
    for (const c of t.claims) this.crew.claim(c, this.id);
  }

  private endTask(): void {
    this.crew.releaseAll(this.id);
    this.task = null;
  }

  private failTask(ctx: Ctx): void {
    if (this.task) {
      this.crew.noteFailed(this.task.key, ctx.state.tick);
      this.count(this.stats.fails, this.task.key);
    }
    this.endTask();
  }

  // ---------- executing acts ----------

  private execute(ctx: Ctx, act: Act): PlayerInput {
    const { state, me } = ctx;
    const key = actKey(act);
    if (key !== this.key) {
      this.key = key;
      this.act = act;
      this.presses = 0;
      this.stuck = 0;
      this.best = Infinity;
      this.bestTick = state.tick;
      this.readyAt = state.tick + this.reactionDelay();
    }
    if (state.tick < this.readyAt) return NO_INPUT;

    switch (act.kind) {
      case 'wait':
        return NO_INPUT;
      case 'goto':
        return this.taskMove(ctx, this.walk(ctx, [act.tile], key));
      case 'pick':
        return this.pick(ctx, act.item, key, () => this.failTask(ctx));
      case 'drop':
        return this.drop(ctx, key);
      default:
        break;
    }
    const tile = act.tile;
    const acc = ctx.k.nav.access.get(tile);
    if (!acc || acc.length === 0) {
      this.failTask(ctx);
      return NO_INPUT;
    }
    // Empty-handed, Grab takes a resting floor item in front before the station (RULES §2). Use
    // an access tile where that won't happen, unless the item is one we want anyway.
    const emptyUse = act.kind === 'use' && !me.holding;
    const clean = emptyUse ? acc.filter((a) => !this.unwantedInFront(ctx, ctx.k.nav.center(a.tile), a.dir)) : acc;
    const here = acc.find((a) => a.tile === ctx.tile);
    const atHere = !!here && this.reaches(ctx, me.pos, here.dir, tile);
    const blockedHere = emptyUse && atHere && this.unwantedInFront(ctx, me.pos, here!.dir);
    const elsewhere = clean.filter((a) => a.tile !== ctx.tile);
    if (!atHere || (blockedHere && elsewhere.length > 0)) {
      const pool = blockedHere ? elsewhere : clean.length > 0 ? clean : acc;
      const goals = this.freeAccess(ctx, pool.map((a) => a.tile));
      return this.taskMove(ctx, this.walk(ctx, goals, key));
    }
    // (No clean spot at all: take the item; the crew then puts it away like any other.)
    this.stuck = 0;
    const facingOk = me.facing.x * here.dir.x + me.facing.y * here.dir.y > 0.999 && interactTarget(state, me).tile === tile;
    if (!facingOk) return { ...NO_INPUT, move: { x: here.dir.x * 0.01, y: here.dir.y * 0.01 } };
    if (act.kind === 'work') return { ...NO_INPUT, work: true };
    if (act.kind === 'face') return NO_INPUT;
    return this.press(ctx, () => this.failTask(ctx));
  }

  /** Face a floor tile of our own kitchen and press Grab: the held item is dropped there (RULES §2). */
  private drop(ctx: Ctx, key: string): PlayerInput {
    const { state, me, k } = ctx;
    const nav = k.nav;
    if (!me.holding) return NO_INPUT;
    const ownFloor = (t: number | null): boolean =>
      t !== null && t >= 0 && nav.open[t] === 1 && state.arena.tiles[t]?.kind === 'floor' && tileOwner(state, t) === me.team;
    if (ownFloor(interactTarget(state, me).tile)) return this.press(ctx, () => this.failTask(ctx));
    if (ownFloor(ctx.tile)) {
      const [x, y] = nav.xy(ctx.tile);
      for (const [dx, dy] of nav.dirs(ORTHO)) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= nav.w || ny >= nav.h || !ownFloor(ny * nav.w + nx)) continue;
        // Facing it already but the target falls short (off-centre): step to the tile centre.
        if (me.facing.x * dx + me.facing.y * dy > 0.999) return this.input(this.toward(me.pos, nav.center(ctx.tile), ctx));
        return { ...NO_INPUT, move: { x: dx * 0.01, y: dy * 0.01 } };
      }
    }
    return this.taskMove(ctx, this.walk(ctx, [k.idleTile], key));
  }

  /** A task's walk: no way there fails the task. */
  private taskMove(ctx: Ctx, w: Walk): PlayerInput {
    if (w === NO_WAY) {
      this.failTask(ctx);
      return NO_INPUT;
    }
    return this.input(w ?? { x: 0, y: 0 });
  }

  /**
   * Would an empty-handed Grab from `pos` facing `dir` pick up a resting floor item (RULES §2:
   * nearest within interactReach, in front, not on a rival tile) that the crew has no use for?
   */
  private unwantedInFront(ctx: Ctx, pos: Vec2, dir: Vec2): boolean {
    const { state } = ctx;
    const reach = state.config.tuning.interactReach;
    let best: Item | null = null;
    let bestD = Infinity;
    for (const fi of state.floorItems) {
      if (fi.vel.x !== 0 || fi.vel.y !== 0) continue;
      const d = dist(pos, fi.pos);
      if (d > reach || d >= bestD) continue;
      if ((fi.pos.x - pos.x) * dir.x + (fi.pos.y - pos.y) * dir.y < 0) continue;
      const t = ctx.k.nav.tileAt(fi.pos);
      if (t >= 0 && tileOwner(state, t) === 1 - ctx.me.team) continue;
      best = fi.item;
      bestD = d;
    }
    return best !== null && !this.crew.wantsItem(state, best);
  }

  /**
   * Standing here and facing `dir`, would the interaction target (RULES §1) land inside `tile`,
   * with a small margin so a nudge from another player doesn't flip it?
   */
  private reaches(ctx: Ctx, pos: Vec2, dir: Vec2, tile: number): boolean {
    const nav = ctx.k.nav;
    const p = { x: pos.x + dir.x * TARGET_OFFSET, y: pos.y + dir.y * TARGET_OFFSET };
    if (nav.tileAt(p) !== tile) return false;
    const c = nav.center(tile);
    // Depth into the tile along the facing axis (0 at the near edge, 1 at the far edge).
    const depth = dir.x !== 0 ? (p.x - c.x) * dir.x + 0.5 : (p.y - c.y) * dir.y + 0.5;
    return depth >= ARRIVE_MARGIN;
  }

  /** Press Grab (rate-limited); `onFail` runs when repeated presses achieve nothing. */
  private press(ctx: Ctx, onFail: () => void): PlayerInput {
    const tick = ctx.state.tick;
    if (ctx.me.dazedTicks > 0 || tick - this.lastGrab < GRAB_GAP_TICKS) return NO_INPUT;
    if (++this.presses > MAX_PRESSES) {
      onFail();
      return NO_INPUT;
    }
    this.lastGrab = tick;
    // The next press of the same act waits for a fresh reaction (the human checks it worked).
    this.readyAt = tick + GRAB_GAP_TICKS;
    return { ...NO_INPUT, grab: true };
  }

  private pick(ctx: Ctx, item: number, key: string, onFail: () => void): PlayerInput {
    const { me } = ctx;
    const loc = ctx.items.get(item);
    if (!loc || loc.at !== 'floor') return NO_INPUT;
    const d = dist(me.pos, loc.pos);
    const reach = ctx.state.config.tuning.interactReach;
    if (d < 0.55 || (d < reach * 0.9 && me.facing.x * (loc.pos.x - me.pos.x) + me.facing.y * (loc.pos.y - me.pos.y) > 0.2 * d)) {
      if (d > 0.05) {
        const front = me.facing.x * (loc.pos.x - me.pos.x) + me.facing.y * (loc.pos.y - me.pos.y);
        if (front < 0) return { ...NO_INPUT, move: { x: ((loc.pos.x - me.pos.x) / d) * 0.01, y: ((loc.pos.y - me.pos.y) / d) * 0.01 } };
      }
      return this.press(ctx, onFail);
    }
    const t = ctx.k.nav.tileAt(loc.pos);
    if (t === ctx.tile || d < 1.2) return this.input(this.toward(me.pos, loc.pos, ctx));
    const w = this.walk(ctx, [t], key);
    if (w === NO_WAY) {
      onFail();
      return NO_INPUT;
    }
    return this.input(w ?? { x: 0, y: 0 });
  }

  private input(move: Vec2, extra: Partial<PlayerInput> = {}): PlayerInput {
    return { ...NO_INPUT, ...extra, move };
  }

  private reactionDelay(): number {
    const p = this.params;
    const base = Math.floor(p.reactionTicks);
    let d = base + (this.rng.next() < p.reactionTicks - base ? 1 : 0);
    if (this.rng.chance(p.hesitateChance)) d += this.rng.int(p.hesitateTicks[0], p.hesitateTicks[1]);
    return d;
  }

  /** Access tiles of a station, without those a stationary player is standing on (if any remain). */
  private freeAccess(ctx: Ctx, tiles: number[]): number[] {
    if (tiles.length < 2) return tiles;
    const occ = new Set<number>();
    for (const p of ctx.state.players) {
      if (p.id === this.id) continue;
      if (vecLength(p.vel.x, p.vel.y) < 0.5) occ.add(ctx.k.nav.tileAt(p.pos));
    }
    const free = tiles.filter((t) => !occ.has(t));
    return free.length ? free : tiles;
  }

  // ---------- walking ----------

  /** Unit-ish move toward a point, slowing to land exactly on it. */
  private toward(from: Vec2, to: Vec2, ctx: Ctx): Vec2 {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const d = vecLength(dx, dy);
    if (d < 1e-6) return { x: 0, y: 0 };
    const t = ctx.state.config.tuning;
    const stepLen = (t.playerSpeed / t.tickRate) * this.params.moveScale;
    const m = Math.min(this.params.moveScale, (d / stepLen) * this.params.moveScale);
    return { x: (dx / d) * m, y: (dy / d) * m };
  }

  /**
   * Follow a path to any goal tile's centre. Returns the move, null when there, or NO_WAY when
   * there is no path or we gave up after getting stuck repeatedly. Never touches the task.
   */
  private walk(ctx: Ctx, goals: number[], key: string): Walk {
    const { state, me, k } = ctx;
    const nav = k.nav;
    const cur = ctx.tile;
    const goalKey = `${key}|${goals.join(',')}`;
    if (goals.includes(cur)) {
      const c = nav.center(cur);
      if (dist(me.pos, c) <= ARRIVE_DIST * 0.8) return null;
      return this.toward(me.pos, c, ctx);
    }
    // Pushed off the path (by a player, or a wall slide) means a fresh path.
    const onPath = this.path !== null && (cur === this.pathFrom || this.path.includes(cur));
    if (this.path === null || this.pathKey !== goalKey || !onPath || state.tick - this.pathTick > REPATH_TICKS) {
      this.repath(ctx, goals, goalKey, this.stuck > 0);
      if (this.path === null) return NO_WAY;
    }
    const path = this.path!;
    if (path.length === 0) return null;
    while (this.pathIdx < path.length - 1) {
      const wp = path[this.pathIdx]!;
      if (cur === wp && dist(me.pos, nav.center(wp)) < WAYPOINT_DIST) this.pathIdx++;
      else if (path.indexOf(cur, this.pathIdx + 1) > this.pathIdx) this.pathIdx = path.indexOf(cur, this.pathIdx + 1);
      else break;
    }
    const target = nav.center(path[this.pathIdx]!);
    // Progress / stuck detection.
    const remaining = (path.length - this.pathIdx) * 1 + dist(me.pos, target);
    if (remaining < this.best - 0.05) {
      this.best = remaining;
      this.bestTick = state.tick;
    } else if (state.tick - this.bestTick > STUCK_TICKS) {
      this.stuck++;
      this.stats.stuck++;
      this.bestTick = state.tick;
      if (this.stuck >= GIVE_UP_LEVEL) {
        this.stats.giveUps++;
        this.stuck = 0;
        return NO_WAY;
      }
      this.repath(ctx, goals, goalKey, true);
      // Same coin, mirrored on the right-hand side, so the two crews' sidesteps are mirror images.
      const s = (this.rng.chance(0.5) ? 1 : -1) * (nav.flip ? -1 : 1);
      const dx = target.x - me.pos.x;
      const dy = target.y - me.pos.y;
      const l = vecLength(dx, dy) || 1;
      this.sidestep = { x: (-dy / l) * s, y: (dx / l) * s };
      this.sidestepUntil = state.tick + this.rng.int(5, 10);
    }
    if (state.tick < this.sidestepUntil) return this.sidestep;
    return this.toward(me.pos, target, ctx);
  }

  private repath(ctx: Ctx, goals: number[], goalKey: string, avoidPlayers: boolean): void {
    const { state, me, k } = ctx;
    const nav = k.nav;
    if (!this.extra || this.extra.length !== nav.n) {
      this.extra = new Int32Array(nav.n);
      this.blocked = new Uint8Array(nav.n);
    }
    const extra = this.extra;
    const blocked = this.blocked!;
    extra.fill(0);
    blocked.fill(0);
    const r = state.config.tuning.playerRadius;
    for (const p of state.players) {
      if (p.id === this.id) continue;
      // Every tile the player's body overlaps: a stationary player plugs a 1-wide aisle.
      const slow = vecLength(p.vel.x, p.vel.y) < 0.5;
      for (const [ox, oy] of BODY_OFFSETS) {
        const t = nav.tileAt({ x: p.pos.x + ox * r, y: p.pos.y + oy * r });
        if (t < 0 || (ox !== 0 || oy !== 0 ? t === nav.tileAt(p.pos) : false)) continue;
        extra[t] = extra[t]! + (slow ? BOT_TUNING.playerTileCostSlow : BOT_TUNING.playerTileCostMoving) * STEP_COST;
        if (avoidPlayers && t !== ctx.tile) blocked[t] = 1;
      }
    }
    // Carrying through the market: keep away from rivals (stronger with skill).
    if (me.holding && this.params.defend > 0 && nav.market[ctx.tile]) {
      const w = Math.round(this.params.defend * 4 * STEP_COST);
      for (const p of state.players) {
        if (p.team === me.team) continue;
        const [px, py] = [Math.floor(p.pos.x), Math.floor(p.pos.y)];
        for (let dy = -2; dy <= 2; dy++)
          for (let dx = -2; dx <= 2; dx++) {
            const x = px + dx;
            const y = py + dy;
            if (x < 0 || y < 0 || x >= nav.w || y >= nav.h) continue;
            const i = y * nav.w + x;
            extra[i] = extra[i]! + Math.round(w / (1 + Math.abs(dx) + Math.abs(dy)));
          }
      }
    }
    let path = nav.path(ctx.tile, goals, extra, avoidPlayers ? blocked : null);
    if (path === null && avoidPlayers) path = nav.path(ctx.tile, goals, extra, null);
    this.path = path;
    this.pathFrom = ctx.tile;
    this.pathKey = goalKey;
    this.pathIdx = 0;
    this.pathTick = state.tick;
  }

  // ---------- market play ----------

  private onKnock(itemId: number, state: MatchState, emptyHanded: boolean): void {
    this.knocks++;
    if (!emptyHanded) return; // carrying: we only denied it
    this.endTask();
    this.chase = itemId;
    this.chaseUntil = state.tick + BOT_TUNING.chaseTicks;
  }

  /** Knocks, stealing the popped item, hunting carriers, evasive dashes. Returns an input to override the task. */
  private marketPlay(ctx: Ctx): PlayerInput | null {
    const { state, me, k } = ctx;
    const nav = k.nav;
    const t = state.config.tuning;
    // Grab the item we just knocked loose.
    if (this.chase !== null) {
      const loc = ctx.items.get(this.chase);
      if (!loc || loc.at !== 'floor' || state.tick > this.chaseUntil || me.holding) this.chase = null;
      else if (loc.resting) return this.pick(ctx, this.chase, `chase:${this.chase}`, () => (this.chase = null));
      else return NO_INPUT;
    }
    if (me.dazedTicks > 0) return null;
    const canDash = me.dashCooldown === 0 && me.dashTicks === 0;
    const myTile = nav.tileAt(me.pos);
    const nearMarket = myTile >= 0 && (nav.market[myTile] === 1 || state.arena.zones[myTile] === 'none');

    if (canDash && nearMarket && (!me.holding || me.holding.type === 'ingredient')) {
      const dashSpeed = t.dashDistance / Math.max(1e-6, t.dashSeconds);
      for (const r of state.players) {
        if (r.team === me.team || !r.holding || r.knockImmuneTicks > 0) continue;
        const rt = nav.tileAt(r.pos);
        if (rt < 0 || nav.market[rt] !== 1) continue;
        const d = dist(me.pos, r.pos);
        // Contact happens at 2 radii, so a full dash reaches a bit further than dashDistance.
        if (d > t.dashDistance + 2 * t.playerRadius - 0.15 || d < 0.3) continue;
        const lead = d / dashSpeed;
        const aim = { x: r.pos.x + r.vel.x * lead - me.pos.x, y: r.pos.y + r.vel.y * lead - me.pos.y };
        const al = vecLength(aim.x, aim.y);
        if (al < 1e-6) continue;
        const ux = aim.x / al;
        const uy = aim.y / al;
        // In front: within ~60° of where we're facing (or the rival we are hunting); a human turns and dashes.
        const ahead = me.facing.x * ux + me.facing.y * uy;
        if ((ahead < 0.5 && this.huntTarget !== r.id) || !this.dashLaneClear(nav, me.pos, ux, uy, Math.min(al, t.dashDistance))) continue;
        const episode = r.id * 100000 + (r.holding.id % 100000);
        // Empty-handed we can steal the popped item; carrying we can still deny it (less tempting).
        // A charm carrier is worth more than a crate run: points and Heat (RULES §10).
        const appetite = r.holding.type === 'charm' ? BOT_TUNING.charmAppetite : 1;
        const chance = Math.min(1, this.params.knockChance * appetite * (me.holding ? BOT_TUNING.knockWhileCarrying : 1));
        if (this.huntTarget === r.id || this.decideOnce(episode, chance, state.tick)) return { ...NO_INPUT, move: { x: ux, y: uy }, dash: true };
      }
    }
    // Hunt a rival carrying a premium item: chase one that's close, or (with time on our hands)
    // run out and wait in front of their doorway if we can get there first.
    if (this.huntTarget === null && !me.holding && canDash && !this.taskIsUrgent()) {
      const spare = !this.task || this.task.priority < 40;
      for (const r of state.players) {
        if (r.team === me.team || !r.holding || r.knockImmuneTicks > 0) continue;
        const it = r.holding;
        const premium = it.type === 'ingredient' ? !!state.ingredients[it.kind]?.premium : it.type === 'plate' ? it.contents.length > 0 : true;
        const rt = nav.tileAt(r.pos);
        if (!premium || rt < 0 || nav.market[rt] !== 1) continue;
        const close = nearMarket && dist(me.pos, r.pos) <= HUNT_RANGE;
        if (!close && !(spare && this.cutOff(ctx, r) !== null)) continue;
        const episode = -(r.id * 100000 + (it.id % 100000));
        const appetite = it.type === 'charm' ? BOT_TUNING.charmAppetite : 1;
        if (this.decideOnce(episode, Math.min(1, this.params.huntChance * appetite), state.tick)) {
          this.huntTarget = r.id;
          this.huntUntil = state.tick + HUNT_TICKS;
          // Drop the kitchen job (and its claims) so a crewmate can pick it up meanwhile.
          this.endTask();
          break;
        }
      }
    }
    if (this.huntTarget !== null) {
      const r = state.players[this.huntTarget];
      const rt = nav.tileAt(r.pos);
      if (me.holding || !r.holding || r.knockImmuneTicks > 0 || state.tick > this.huntUntil || rt < 0 || nav.market[rt] !== 1) {
        this.huntTarget = null;
      } else {
        const cut = this.cutOff(ctx, r);
        if (cut !== null && dist(me.pos, r.pos) > t.dashDistance) {
          // Wait in their way, facing them.
          const mv = this.walk(ctx, [cut], 'cut');
          if (mv === NO_WAY) {
            this.huntTarget = null;
            return null;
          }
          if (mv) return this.input(mv);
          const dx = r.pos.x - me.pos.x;
          const dy = r.pos.y - me.pos.y;
          const l = vecLength(dx, dy) || 1;
          return this.input({ x: (dx / l) * 0.01, y: (dy / l) * 0.01 });
        }
        // Chase: aim where they will be by the time we get there.
        const lead = Math.min(1, dist(me.pos, r.pos) / t.playerSpeed);
        const aim = { x: r.pos.x + r.vel.x * lead, y: r.pos.y + r.vel.y * lead };
        const ax = aim.x - me.pos.x;
        const ay = aim.y - me.pos.y;
        const al = vecLength(ax, ay);
        const at = nav.tileAt(aim);
        if (at >= 0 && nav.open[at] && al > 1e-6 && this.dashLaneClear(nav, me.pos, ax / al, ay / al, al)) return this.input(this.toward(me.pos, aim, ctx));
        // Something (a crate, a wall) is in the way: go round it.
        const mv = this.walk(ctx, [at >= 0 && nav.open[at] ? at : rt], 'hunt');
        if (mv === NO_WAY) {
          this.huntTarget = null;
          return null;
        }
        return this.input(mv ?? this.toward(me.pos, r.pos, ctx));
      }
    }
    // Evasion: carrying in the market with a rival closing in head-on, dash on along our way.
    if (me.holding && canDash && myTile >= 0 && nav.market[myTile] === 1 && this.params.defend > 0 && this.path && this.path.length > this.pathIdx + 2) {
      for (const r of state.players) {
        if (r.team === me.team || r.holding || r.dashCooldown > 0) continue;
        const d = dist(me.pos, r.pos);
        if (d > t.dashDistance + 0.8 || d < 0.4) continue;
        const towardMe = (r.facing.x * (me.pos.x - r.pos.x) + r.facing.y * (me.pos.y - r.pos.y)) / d;
        if (towardMe < 0.85) continue;
        const wp = nav.center(this.path[Math.min(this.path.length - 1, this.pathIdx + 2)]!);
        const dx = wp.x - me.pos.x;
        const dy = wp.y - me.pos.y;
        const l = vecLength(dx, dy);
        if (l < 1e-6) continue;
        const away = (dx * (me.pos.x - r.pos.x) + dy * (me.pos.y - r.pos.y)) / (l * d);
        const episode = -1e9 - r.id * 1000 - (state.tick >> 5);
        if (away > 0.3 && this.decideOnce(episode, this.params.defend * BOT_TUNING.evadeShare, state.tick) && this.dashLaneClear(nav, me.pos, dx / l, dy / l, t.dashDistance)) {
          return { ...NO_INPUT, move: { x: dx / l, y: dy / l }, dash: true };
        }
      }
    }
    return null;
  }

  /**
   * Roll once per encounter and stick with it while the encounter lasts. Encounters not seen for
   * EPISODE_TTL_TICKS are forgotten (never one still going on, so a decision is never re-rolled mid-way).
   */
  decideOnce(episode: number, chance: number, tick: number): boolean {
    let d = this.considered.get(episode);
    if (!d) {
      if (this.considered.size >= 32) {
        for (const [e, old] of this.considered) if (tick - old.seen > EPISODE_TTL_TICKS) this.considered.delete(e);
      }
      d = { take: this.rng.chance(chance), seen: tick };
      this.considered.set(episode, d);
    }
    d.seen = tick;
    return d.take;
  }

  /** For tests: encounters remembered. */
  get encountersRemembered(): number {
    return this.considered.size;
  }

  /**
   * The market tile in front of the rival's doorway that `r` will most likely use, if we can be
   * standing on it before they reach it.
   */
  private cutOff(ctx: Ctx, r: { pos: Vec2 }): number | null {
    const { k, state } = ctx;
    const nav = k.nav;
    let best = -1;
    let bestD = Infinity;
    for (const t of k.rivalDoorFront) {
      const d = dist(r.pos, nav.center(t));
      if (d < bestD) {
        bestD = d;
        best = t;
      }
    }
    if (best < 0) return null;
    const speed = state.config.tuning.playerSpeed;
    const mine = nav.tiles(ctx.tile, best) / (speed * this.params.moveScale) + this.params.reactionTicks / state.config.tuning.tickRate;
    return mine + CUT_MARGIN_SECONDS < bestD / speed ? best : null;
  }

  private taskIsUrgent(): boolean {
    const key = this.task?.key ?? '';
    return key.startsWith('plate:') || key.startsWith('fire:') || key.startsWith('burnt:');
  }

  private dashLaneClear(nav: Nav, from: Vec2, ux: number, uy: number, len: number): boolean {
    for (let s = 0.5; s <= len; s += 0.5) {
      const t = nav.tileAt({ x: from.x + ux * s, y: from.y + uy * s });
      if (t < 0 || !nav.open[t]) return false;
    }
    return true;
  }

  /** For tests: current act key. */
  get actKey(): string {
    return this.key;
  }

  /** For tests: the rival this bot is hunting, if any. */
  get hunting(): PlayerId | null {
    return this.huntTarget;
  }

  /** For tests: current task key. */
  get taskKey(): string | null {
    return this.task?.key ?? null;
  }
}

function dist(a: Vec2, b: Vec2): number {
  return vecLength(a.x - b.x, a.y - b.y);
}

