/**
 * Navigation: the walkable tile graph for one team (floor tiles that aren't the rival kitchen),
 * the floor tiles from which each usable station can be faced, and 8-connected Dijkstra paths.
 * Built once per (arena, swap, team) and cached; per-query buffers are reused.
 */
import { tileOwner, type ArenaRuntime, type MatchState, type TeamId, type Vec2 } from '@line-war/sim';

/** A floor tile next to a station, and the unit axis pointing from it into the station. */
export interface Access {
  tile: number;
  dir: Vec2;
}

const ORTHO: readonly [number, number][] = [
  [0, -1],
  [-1, 0],
  [1, 0],
  [0, 1],
];
const DIAG: readonly [number, number][] = [
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
];
/** The same neighbour orders seen from the right-hand kitchen (x mirrored). */
const ORTHO_FLIP = ORTHO.map(([dx, dy]) => [-dx, dy] as [number, number]);
const DIAG_FLIP = DIAG.map(([dx, dy]) => [-dx, dy] as [number, number]);
export const STEP_COST = 10;
const DIAG_COST = 14;

export class Nav {
  readonly w: number;
  readonly h: number;
  readonly n: number;
  /** 1 = this team may stand here. */
  readonly open: Uint8Array;
  /** 1 = market zone tile. */
  readonly market: Uint8Array;
  /**
   * This team's kitchen is on the right: every scan and neighbour order runs mirrored (x
   * descending, right before left), so ties break the same way for both crews (side fairness).
   */
  readonly flip: boolean;
  /** Station tile → access points (stations this team may use: own kitchen + neutral). */
  readonly access = new Map<number, Access[]>();
  private readonly ortho: readonly [number, number][];
  private readonly diag: readonly [number, number][];
  private readonly fields = new Map<number, Int32Array>();
  private readonly cost: Int32Array;
  private readonly prev: Int32Array;
  private readonly heapNode: Int32Array;
  private readonly heapCost: Int32Array;

  constructor(state: MatchState, readonly team: TeamId) {
    const a = state.arena;
    this.w = a.width;
    this.h = a.height;
    this.n = a.width * a.height;
    this.open = new Uint8Array(this.n);
    this.market = new Uint8Array(this.n);
    this.flip = (team === 1) !== state.round.swapped;
    this.ortho = this.flip ? ORTHO_FLIP : ORTHO;
    this.diag = this.flip ? DIAG_FLIP : DIAG;
    for (let i = 0; i < this.n; i++) {
      const owner = tileOwner(state, i);
      this.open[i] = a.tiles[i]?.kind === 'floor' && (owner === null || owner === team) ? 1 : 0;
      this.market[i] = a.zones[i] === 'market' ? 1 : 0;
    }
    for (const i of this.order()) {
      const kind = a.tiles[i]?.kind;
      if (!kind || kind === 'floor' || kind === 'wall') continue;
      const owner = tileOwner(state, i);
      if (owner !== null && owner !== team) continue;
      const x = i % this.w;
      const y = (i - x) / this.w;
      const list: Access[] = [];
      for (const [dx, dy] of this.ortho) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= this.w || ny >= this.h) continue;
        const t = ny * this.w + nx;
        if (this.open[t]) list.push({ tile: t, dir: { x: -dx, y: -dy } });
      }
      this.access.set(i, list);
    }
    this.cost = new Int32Array(this.n);
    this.prev = new Int32Array(this.n);
    this.heapNode = new Int32Array(this.n * 8 + 8);
    this.heapCost = new Int32Array(this.n * 8 + 8);
  }

  /** The tile seen from the other kitchen: same row, mirrored column. */
  mirror(i: number): number {
    const x = i % this.w;
    return i - x + (this.w - 1 - x);
  }

  /** Tie-break rank of a tile: its index, counted from this team's own side of the map. */
  rank(i: number): number {
    return this.flip ? this.mirror(i) : i;
  }

  /** Every tile index in this team's scan order (row by row, from its own side). */
  order(): number[] {
    const out: number[] = [];
    for (let i = 0; i < this.n; i++) out.push(this.flip ? this.mirror(i) : i);
    return out;
  }

  /** Offsets written from the left kitchen's point of view, as this team sees them (x mirrored on the right). */
  dirs(offsets: readonly (readonly [number, number])[]): [number, number][] {
    return offsets.map(([dx, dy]) => [this.flip ? -dx : dx, dy]);
  }

  xy(i: number): [number, number] {
    const x = i % this.w;
    return [x, (i - x) / this.w];
  }

  center(i: number): Vec2 {
    const x = i % this.w;
    return { x: x + 0.5, y: (i - x) / this.w + 0.5 };
  }

  tileAt(p: Vec2): number {
    const x = Math.floor(p.x);
    const y = Math.floor(p.y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return -1;
    return y * this.w + x;
  }

  /**
   * Nearest open tile to a position (its own tile if open). A point exactly on a column boundary
   * counts as being in the column on this team's side, so the answer mirrors the rival's.
   */
  openTileNear(p: Vec2): number {
    const x0 = this.flip ? this.w - 1 - Math.floor(this.w - p.x) : Math.floor(p.x);
    const y0 = Math.floor(p.y);
    const t = x0 < 0 || y0 < 0 || x0 >= this.w || y0 >= this.h ? -1 : y0 * this.w + x0;
    if (t >= 0 && this.open[t]) return t;
    let best = -1;
    let bestD = Infinity;
    for (let dy = -2; dy <= 2; dy++) {
      for (let k = -2; k <= 2; k++) {
        const dx = this.flip ? -k : k;
        const x = x0 + dx;
        const y = y0 + dy;
        if (x < 0 || y < 0 || x >= this.w || y >= this.h) continue;
        const i = y * this.w + x;
        if (!this.open[i]) continue;
        const d = (x + 0.5 - p.x) ** 2 + (y + 0.5 - p.y) ** 2;
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
    }
    return best;
  }

  /** Path cost field (STEP_COST per tile) from `from` to every tile; cached. -1 = unreachable. */
  field(from: number): Int32Array {
    let f = this.fields.get(from);
    if (!f) {
      this.dijkstra(from, null, null);
      f = new Int32Array(this.n);
      for (let i = 0; i < this.n; i++) f[i] = this.cost[i] === INF ? -1 : this.cost[i]!;
      this.fields.set(from, f);
    }
    return f;
  }

  /**
   * Compute the cost field from every open tile up front (a few ms, once per arena and team), so
   * no single tick mid-service pays for a first-time Dijkstra.
   */
  warm(): void {
    for (let i = 0; i < this.n; i++) if (this.open[i]) this.field(i);
  }

  /** Path cost between two open tiles (in tiles), or Infinity. */
  tiles(from: number, to: number): number {
    if (from < 0 || to < 0) return Infinity;
    const c = this.field(from)[to]!;
    return c < 0 ? Infinity : c / STEP_COST;
  }

  /** Cheapest path cost from `from` to any access tile of `station` (in tiles). */
  toStation(from: number, station: number): number {
    const acc = this.access.get(station);
    if (!acc || from < 0) return Infinity;
    const f = this.field(from);
    let best = Infinity;
    for (const a of acc) {
      const c = f[a.tile]!;
      if (c >= 0 && c < best) best = c;
    }
    return best / STEP_COST;
  }

  /**
   * Cheapest path from `from` to any of `goals`. `extra` adds per-tile entry cost (avoidance);
   * `blocked` tiles are impassable (except goals and the start). Returns the tiles after `from`
   * up to and including the goal ([] if already on a goal), or null if unreachable.
   */
  path(from: number, goals: readonly number[], extra: Int32Array | null, blocked: Uint8Array | null): number[] | null {
    if (from < 0 || goals.length === 0) return null;
    if (goals.includes(from)) return [];
    const reached = this.dijkstra(from, goals, extra, blocked);
    if (reached < 0) return null;
    const out: number[] = [];
    for (let t = reached; t !== from; t = this.prev[t]!) out.push(t);
    out.reverse();
    return out;
  }

  private dijkstra(from: number, goals: readonly number[] | null, extra: Int32Array | null, blocked: Uint8Array | null = null): number {
    const { cost, prev, heapNode, heapCost, open, w, h } = this;
    cost.fill(INF);
    cost[from] = 0;
    prev[from] = -1;
    let size = 0;
    const push = (node: number, c: number): void => {
      let i = size++;
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (heapCost[p]! <= c) break;
        heapNode[i] = heapNode[p]!;
        heapCost[i] = heapCost[p]!;
        i = p;
      }
      heapNode[i] = node;
      heapCost[i] = c;
    };
    const pop = (): number => {
      const top = heapNode[0]!;
      const lastN = heapNode[--size]!;
      const lastC = heapCost[size]!;
      let i = 0;
      for (;;) {
        let c = 2 * i + 1;
        if (c >= size) break;
        if (c + 1 < size && heapCost[c + 1]! < heapCost[c]!) c++;
        if (heapCost[c]! >= lastC) break;
        heapNode[i] = heapNode[c]!;
        heapCost[i] = heapCost[c]!;
        i = c;
      }
      heapNode[i] = lastN;
      heapCost[i] = lastC;
      return top;
    };
    const isGoal = (t: number): boolean => goals !== null && goals.includes(t);
    push(from, 0);
    while (size > 0) {
      const c0 = heapCost[0]!;
      const u = pop();
      if (c0 > cost[u]!) continue;
      if (isGoal(u)) return u;
      const x = u % w;
      const y = (u - x) / w;
      const relax = (nx: number, ny: number, step: number): void => {
        const v = ny * w + nx;
        if (!open[v]) return;
        if (blocked && blocked[v] && !isGoal(v)) return;
        const nc = c0 + step + (extra ? extra[v]! : 0);
        if (nc < cost[v]!) {
          cost[v] = nc;
          prev[v] = u;
          push(v, nc);
        }
      };
      for (const [dx, dy] of this.ortho) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < w && ny < h) relax(nx, ny, STEP_COST);
      }
      for (const [dx, dy] of this.diag) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        // No corner cutting: both orthogonal neighbours must be open.
        if (!open[y * w + nx] || !open[ny * w + x]) continue;
        relax(nx, ny, DIAG_COST);
      }
    }
    return -1;
  }
}

const INF = 0x3fffffff;

const cache = new WeakMap<ArenaRuntime, Map<string, Nav>>();

/** Cached nav graph for a team this round (accounts for the kitchen swap). */
export function navFor(state: MatchState, team: TeamId): Nav {
  let m = cache.get(state.arena);
  if (!m) {
    m = new Map();
    cache.set(state.arena, m);
  }
  const key = `${team}:${state.round.swapped ? 1 : 0}`;
  let nav = m.get(key);
  if (!nav) {
    nav = new Nav(state, team);
    m.set(key, nav);
  }
  return nav;
}
