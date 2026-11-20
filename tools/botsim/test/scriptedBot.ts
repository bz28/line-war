/**
 * A tiny scripted test bot (burgers and salads only, no market, no knocks) used to prove the botsim
 * pipeline end to end until the real bots land. Same contract as @line-war/bots `createBots`.
 *
 * Each bot owns one counter (where its plate lives), one board and one pan, chosen by its slot in
 * the crew. It is purely reactive: every tick it looks at its hands and its stations and picks the
 * next station to use. `skill` (or difficulty) scales walking speed.
 */
import type { BotBrain, BotOptions } from '@line-war/bots';
import {
  NO_INPUT,
  tileIndex,
  tileOwner,
  tileXY,
  type Food,
  type IngredientKind,
  type MatchState,
  type PlateItem,
  type PlayerId,
  type PlayerInput,
  type RecipeDef,
  type StationState,
  type TeamId,
  type TileKind,
} from '@line-war/sim';

const MAKES = ['burger', 'salad'];
const SPEED: Record<BotOptions['difficulty'], number> = { easy: 0.6, normal: 0.8, hard: 1 };
const PRESS_COOLDOWN = 4;

interface Kit {
  counter: number;
  board: number;
  pan: number;
  rack: number;
  sink: number;
  trash: number;
  pass: number;
  pantry: Partial<Record<IngredientKind, number>>;
}

const key = (f: Food): string => `${f.kind}:${f.state}`;
function missing(contents: readonly Food[], recipe: RecipeDef): Food[] | null {
  const left = recipe.ingredients.map(key);
  for (const f of contents) {
    const i = left.indexOf(key(f));
    if (i < 0) return null;
    left.splice(i, 1);
  }
  return recipe.ingredients.filter((f) => {
    const i = left.indexOf(key(f));
    if (i < 0) return false;
    left.splice(i, 1);
    return true;
  });
}

function ownedTiles(state: MatchState, team: TeamId, kind: TileKind): number[] {
  const out: number[] = [];
  state.arena.tiles.forEach((t, i) => {
    if (t.kind === kind && tileOwner(state, i) === team) out.push(i);
  });
  // Mirror-safe order: top to bottom, then outer wall to centre, so both crews pick mirrored stations.
  const { width } = state.arena;
  const outer = (i: number): number => Math.abs((i % width) + 0.5 - width / 2);
  return out.sort((a, b) => Math.floor(a / width) - Math.floor(b / width) || outer(b) - outer(a));
}

function buildKit(state: MatchState, team: TeamId, slot: number): Kit {
  const pick = (kind: TileKind, i = 0): number => {
    const list = ownedTiles(state, team, kind);
    const t = list[i % list.length];
    if (t === undefined) throw new Error(`scripted bot: no ${kind} for team ${team}`);
    return t;
  };
  const pantry: Kit['pantry'] = {};
  for (const i of ownedTiles(state, team, 'pantry')) {
    const ing = state.arena.tiles[i]!.ingredient;
    if (ing) pantry[ing] = i;
  }
  return {
    counter: pick('counter', slot),
    board: pick('board', slot),
    pan: ownedTiles(state, team, 'stove').filter((i) => state.arena.tiles[i]!.vessel === 'pan')[slot % 2]!,
    rack: pick('plates'),
    sink: pick('sink'),
    trash: pick('trash'),
    pass: pick('pass', slot),
    pantry,
  };
}

/** Distance (in tiles) to the nearest floor tile next to `target`, per tile, for one team. */
function distanceField(state: MatchState, team: TeamId, target: number, avoid: ReadonlySet<number> = new Set()): Int32Array {
  const { width, height, tiles } = state.arena;
  const open = (i: number): boolean => !avoid.has(i) && tiles[i]?.kind === 'floor' && (tileOwner(state, i) ?? team) === team;
  const dist = new Int32Array(width * height).fill(-1);
  const queue: number[] = [];
  const { x: tx, y: ty } = tileXY(state.arena, target);
  for (const [dx, dy] of DIRS) {
    const x = tx + dx;
    const y = ty + dy;
    if (x < 0 || y < 0 || x >= width || y >= height) continue;
    const i = tileIndex(state.arena, x, y);
    if (open(i)) {
      dist[i] = 0;
      queue.push(i);
    }
  }
  for (let q = 0; q < queue.length; q++) {
    const i = queue[q]!;
    const { x, y } = tileXY(state.arena, i);
    for (const [dx, dy] of DIRS) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const n = tileIndex(state.arena, nx, ny);
      if (dist[n] !== -1 || !open(n)) continue;
      dist[n] = dist[i]! + 1;
      queue.push(n);
    }
  }
  return dist;
}

const DIRS: readonly [number, number][] = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];
/** Tie-breaking order mirrored for crew B, so both crews make mirror-image choices. */
const MIRRORED: readonly [number, number][] = DIRS.map(([dx, dy]) => [-dx, dy]);
const dirsFor = (team: TeamId): readonly [number, number][] => (team === 0 ? DIRS : MIRRORED);

interface Crew {
  jobs: Map<number, string | null>;
  goals: Map<number, number | null>;
  fields: Map<number, Int32Array>;
}
const BLOCKED_TICKS = 8;
const PARK_TICKS = 30;
const MAX_HESITATE_TICKS = 6;

/** mulberry32: the bot's own RNG (never the sim's). */
function rng(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const DETOUR_TICKS = 60;

type Goal = { tile: number; act: 'grab' | 'work' | 'wait' } | null;

class ScriptedBot implements BotBrain {
  private kit: Kit | null = null;
  private job: string | null = null;
  private lastPress = -100;
  private lastPos = { x: 0, y: 0 };
  private blocked = 0;
  private lastGoal = -2;
  private hesitate = 0;
  private park: { tile: number; ticks: number } | null = null;
  private detour: { goal: number; field: Int32Array; ticks: number } | null = null;

  constructor(
    private readonly speed: number,
    private readonly rand: () => number,
    private readonly crew: Crew,
  ) {}

  decide(state: MatchState, self: PlayerId): PlayerInput {
    const p = state.players[self];
    if (!this.kit) this.kit = buildKit(state, p.team, self % 2);
    const goal = this.choose(state, self);
    this.crew.jobs.set(self, this.job);
    this.crew.goals.set(self, goal?.tile ?? null);
    if (this.park) return this.parked(state, self);
    // Human-like hesitation (seeded): a short pause whenever the next station changes.
    const key = goal ? goal.tile * 4 + ['grab', 'work', 'wait'].indexOf(goal.act) : -1;
    if (key !== this.lastGoal) {
      this.lastGoal = key;
      this.hesitate = Math.floor(this.rand() * (MAX_HESITATE_TICKS + 1));
    }
    if (this.hesitate > 0) {
      this.hesitate--;
      return NO_INPUT;
    }
    if (!goal) {
      // Nothing to do: wait next to the spawn point, out of the way of the crewmate.
      const s = state.arena.spawns[self];
      return this.go(state, self, { tile: tileIndex(state.arena, Math.floor(s.x), Math.floor(s.y)), act: 'wait' });
    }
    return this.go(state, self, goal);
  }

  private field(state: MatchState, team: TeamId, tile: number): Int32Array {
    let f = this.crew.fields.get(tile);
    if (!f) {
      f = distanceField(state, team, tile);
      this.crew.fields.set(tile, f);
    }
    return f;
  }

  /** Lower id has right of way: the other bot steps onto the nearest tile off its path and waits. */
  private startParking(state: MatchState, self: PlayerId): boolean {
    const p = state.players[self];
    const other = state.players.find((q) => q.id < self && q.team === p.team && Math.abs(q.pos.x - p.pos.x) + Math.abs(q.pos.y - p.pos.y) < 1.2);
    if (!other) return false;
    const { arena } = state;
    const at = (pos: { x: number; y: number }): number => tileIndex(arena, Math.floor(pos.x), Math.floor(pos.y));
    const path = new Set<number>([at(other.pos)]);
    const goal = this.crew.goals.get(other.id) ?? null;
    // Only yield to a teammate that is on its way somewhere; one standing at its station is walked around.
    if (goal === null || (this.field(state, other.team, goal)[at(other.pos)] ?? 0) <= 0) return false;
    {
      const f = this.field(state, other.team, goal);
      let cur = at(other.pos);
      for (let guard = 0; guard < 64 && (f[cur] ?? 0) > 0; guard++) {
        const { x, y } = tileXY(arena, cur);
        const next = dirsFor(other.team).map(([dx, dy]) => tileIndex(arena, x + dx, y + dy)).find((n) => f[n] === f[cur]! - 1);
        if (next === undefined) break;
        path.add(next);
        cur = next;
      }
    }
    const open = (i: number): boolean => arena.tiles[i]?.kind === 'floor' && (tileOwner(state, i) ?? p.team) === p.team;
    const seen = new Set<number>([at(p.pos)]);
    const queue = [at(p.pos)];
    for (let q = 0; q < queue.length; q++) {
      const i = queue[q]!;
      const { x: ix, y: iy } = tileXY(arena, i);
      const { x: ox, y: oy } = tileXY(arena, at(other.pos));
      if (!path.has(i) && i !== at(p.pos) && Math.abs(ix - ox) + Math.abs(iy - oy) >= 2) {
        this.park = { tile: i, ticks: PARK_TICKS };
        return true;
      }
      const { x, y } = tileXY(arena, i);
      for (const [dx, dy] of dirsFor(p.team)) {
        const n = tileIndex(arena, x + dx, y + dy);
        if (seen.has(n) || !open(n)) continue;
        seen.add(n);
        queue.push(n);
      }
    }
    return false;
  }

  private parked(state: MatchState, self: PlayerId): PlayerInput {
    const park = this.park!;
    const p = state.players[self];
    if (--park.ticks <= 0) this.park = null;
    const c = tileXY(state.arena, park.tile);
    const mx = c.x + 0.5 - p.pos.x;
    const my = c.y + 0.5 - p.pos.y;
    const len = Math.sqrt(mx * mx + my * my);
    if (len < 0.1) return NO_INPUT;
    return { ...NO_INPUT, move: { x: (mx / len) * this.speed, y: (my / len) * this.speed } };
  }

  private station(state: MatchState, tile: number): StationState {
    return state.stations[String(tile)]!;
  }

  private recipe(state: MatchState, id: string | null): RecipeDef | null {
    return id === null ? null : (state.recipes.find((r) => r.id === id) ?? null);
  }

  private ticketFor(state: MatchState, team: TeamId, recipe: string): boolean {
    return state.tickets.some((t) => t.recipe === recipe && (t.visibleTo === null || t.visibleTo === team));
  }

  /** How a component gets ready: chopped on the board, cooked in the pan, or straight from the pantry. */
  private route(f: Food): 'chop' | 'pan' | 'none' {
    return f.state === 'chopped' ? 'chop' : f.state === 'cooked' ? 'pan' : 'none';
  }

  private pickJob(state: MatchState, self: PlayerId): string | null {
    const team = state.players[self].team;
    const mate = this.crew.jobs.get(self ^ 1) ?? null;
    const visible = state.tickets
      .filter((t) => MAKES.includes(t.recipe) && (t.visibleTo === null || t.visibleTo === team))
      .sort((a, b) => a.spawnTick - b.spawnTick);
    const free = visible.find((t) => t.recipe !== mate) ?? visible[0];
    return free?.recipe ?? null;
  }

  private choose(state: MatchState, self: PlayerId): Goal {
    const k = this.kit!;
    const p = state.players[self];
    const c = this.station(state, k.counter);
    const board = this.station(state, k.board);
    const pan = this.station(state, k.pan).vessel!;
    const trash: Goal = { tile: k.trash, act: 'grab' };

    if (state.fires.some((f) => f.tile === k.pan)) return { tile: k.pan, act: 'work' };
    if (p.holding === null && c.item === null && board.item === null && pan.contents.length === 0) this.job = this.pickJob(state, self);
    const recipe = this.recipe(state, this.job);
    const held = p.holding;

    if (held?.type === 'ingredient') {
      const f: Food = { kind: held.kind, state: held.state };
      const want = recipe?.ingredients.find((x) => x.kind === f.kind);
      if (!want || f.state === 'burnt') return trash;
      if (key(f) === key(want)) return { tile: k.counter, act: 'grab' };
      const route = this.route(want);
      if (route === 'chop') return board.item === null ? { tile: k.board, act: 'grab' } : trash;
      if (route === 'pan') return pan.status === 'empty' && pan.contents.length === 0 ? { tile: k.pan, act: 'grab' } : trash;
      return trash;
    }

    if (held?.type === 'plate') return this.withPlate(state, p.team, held, recipe, c, pan);

    // Empty hands.
    if (pan.status === 'burnt') return { tile: k.pan, act: 'grab' };
    if (board.item?.type === 'ingredient') {
      if (board.item.state === 'raw') return { tile: k.board, act: 'work' };
      return { tile: k.board, act: 'grab' };
    }
    if (!recipe) {
      if (c.item) return { tile: k.counter, act: 'grab' };
      return this.washIfNeeded(state);
    }
    if (c.item?.type === 'plate') {
      const plate = c.item;
      const need = missing(plate.contents, recipe);
      if (plate.cold || plate.dirty || need === null) return { tile: k.counter, act: 'grab' };
      if (need.length === 0) return this.ticketFor(state, p.team, recipe.id) ? { tile: k.counter, act: 'grab' } : null;
      // Bring the plate to the pan while it cooks, so the food is plated before it burns.
      if (pan.contents.length > 0 && need.some((f) => this.route(f) === 'pan')) return { tile: k.counter, act: 'grab' };
      const next = need.find((f) => {
        const r = this.route(f);
        if (r === 'pan') return pan.contents.length === 0;
        return true;
      });
      if (!next) return { tile: k.pan, act: 'wait' };
      const src = k.pantry[next.kind];
      return src === undefined ? null : { tile: src, act: 'grab' };
    }
    if (c.item?.type === 'ingredient' && !recipe.ingredients.some((f) => key(f) === key(c.item as Food))) {
      return { tile: k.counter, act: 'grab' };
    }
    // Counter empty or holding a ready ingredient: fetch a plate.
    if (this.station(state, k.rack).stock > 0) return { tile: k.rack, act: 'grab' };
    return this.washIfNeeded(state);
  }

  private washIfNeeded(state: MatchState): Goal {
    const k = this.kit!;
    return this.station(state, k.sink).dirtyPlates > 0 ? { tile: k.sink, act: 'work' } : null;
  }

  private withPlate(
    state: MatchState,
    team: TeamId,
    plate: PlateItem,
    recipe: RecipeDef | null,
    c: StationState,
    pan: NonNullable<StationState['vessel']>,
  ): Goal {
    const k = this.kit!;
    const trash: Goal = { tile: k.trash, act: 'grab' };
    if (plate.cold || plate.dirty) return trash;
    if (!recipe) return plate.contents.length > 0 ? trash : c.item === null ? { tile: k.counter, act: 'grab' } : trash;
    const need = missing(plate.contents, recipe);
    if (need === null) return trash;
    if (need.length === 0) {
      if (this.ticketFor(state, team, recipe.id)) return { tile: k.pass, act: 'grab' };
      this.job = null;
      return trash;
    }
    if (pan.status === 'done' && need.some((f) => key(f) === key(pan.contents[0] ?? f) && this.route(f) === 'pan')) {
      return { tile: k.pan, act: 'grab' };
    }
    if (c.item?.type === 'ingredient' && need.some((f) => key(f) === key(c.item as Food))) return { tile: k.counter, act: 'grab' };
    if (pan.status === 'cooking' && need.some((f) => this.route(f) === 'pan')) return { tile: k.pan, act: 'wait' };
    if (c.item === null) return { tile: k.counter, act: 'grab' };
    return trash;
  }

  private go(state: MatchState, self: PlayerId, goal: NonNullable<Goal>): PlayerInput {
    const p = state.players[self];
    const team = p.team;
    if (this.detour && (this.detour.goal !== goal.tile || --this.detour.ticks <= 0)) this.detour = null;
    const field = this.detour?.field ?? this.field(state, team, goal.tile);
    const tx = Math.floor(p.pos.x);
    const ty = Math.floor(p.pos.y);
    const here = tileIndex(state.arena, tx, ty);
    const d = field[here] ?? -1;
    const moved = Math.abs(p.pos.x - this.lastPos.x) + Math.abs(p.pos.y - this.lastPos.y) > 0.02;
    this.lastPos = { x: p.pos.x, y: p.pos.y };

    if (d === 0 && Math.abs(p.pos.x - (tx + 0.5)) < 0.3 && Math.abs(p.pos.y - (ty + 0.5)) < 0.3) {
      this.blocked = 0;
      const g = tileXY(state.arena, goal.tile);
      const face = { x: Math.sign(g.x - tx), y: Math.sign(g.y - ty) };
      if (goal.act === 'work') return { ...NO_INPUT, move: face, work: true };
      if (goal.act === 'wait') return { ...NO_INPUT, move: { x: 0, y: 0 } };
      const press = state.tick - this.lastPress >= PRESS_COOLDOWN;
      if (press) this.lastPress = state.tick;
      return { ...NO_INPUT, move: face, grab: press };
    }

    let target = { x: tx + 0.5, y: ty + 0.5 };
    if (d > 0) {
      for (const [dx, dy] of dirsFor(team)) {
        const n = tileIndex(state.arena, tx + dx, ty + dy);
        if (field[n] === d - 1) {
          target = { x: tx + dx + 0.5, y: ty + dy + 0.5 };
          break;
        }
      }
    }
    let mx = target.x - p.pos.x;
    let my = target.y - p.pos.y;
    const len = Math.sqrt(mx * mx + my * my) || 1;
    mx /= len;
    my /= len;
    this.blocked = moved ? 0 : this.blocked + 1;
    if (this.blocked > BLOCKED_TICKS) {
      this.blocked = 0;
      if (this.startParking(state, self)) return this.parked(state, self);
      const avoid = new Set(state.players.filter((q) => q.id !== self).map((q) => tileIndex(state.arena, Math.floor(q.pos.x), Math.floor(q.pos.y))));
      avoid.delete(here);
      this.detour = { goal: goal.tile, field: distanceField(state, team, goal.tile, avoid), ticks: DETOUR_TICKS };
      [mx, my] = team === 0 ? [-my, mx] : [my, -mx]; // mirror-image sidestep for crew B
    }
    return { ...NO_INPUT, move: { x: mx * this.speed, y: my * this.speed } };
  }
}

export function createBots(slots: readonly (BotOptions | null)[]): (BotBrain | null)[] {
  const crew = (): Crew => ({ jobs: new Map(), goals: new Map(), fields: new Map() });
  const crews = [crew(), crew()];
  return slots.map((s, i) => (s ? new ScriptedBot(s.skill ?? SPEED[s.difficulty], rng(s.seed ?? i + 1), crews[i < 2 ? 0 : 1]!) : null));
}
