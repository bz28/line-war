import { tileOwner } from '@line-war/sim';
import type { MatchState, TeamId, TileDef, TileKind, Zone } from '@line-war/sim';
import type { Layout, Rect } from '../layout';

/** Read-only view of the arena that the static painters and station drawing share. */
export interface Scene {
  s: MatchState;
  layout: Layout;
  T: number;
  W: number;
  H: number;
}

export const makeScene = (s: MatchState, layout: Layout): Scene => ({ s, layout, T: layout.tile, W: s.arena.width, H: s.arena.height });

export const tileAtXY = (sc: Scene, x: number, y: number): TileDef | null =>
  x < 0 || y < 0 || x >= sc.W || y >= sc.H ? null : (sc.s.arena.tiles[y * sc.W + x] ?? null);
export const kindAt = (sc: Scene, x: number, y: number): TileKind | null => tileAtXY(sc, x, y)?.kind ?? null;
export const zoneAt = (sc: Scene, x: number, y: number): Zone => sc.s.arena.zones[y * sc.W + x] ?? 'none';
export const ownerAt = (sc: Scene, x: number, y: number): TeamId | null => tileOwner(sc.s, y * sc.W + x);

/** Logical px of a tile column / row edge. */
export const px = (sc: Scene, col: number): number => sc.layout.world.x + col * sc.T;
export const py = (sc: Scene, row: number): number => sc.layout.world.y + row * sc.T;

/** How far each kind of block rises above the floor (fraction of a tile): the 3/4 "height". */
export const LIFT = { counter: 0.17, tall: 0.27, wall: 0.3, rail: 0.12 } as const;

/** Stations that sit on the continuous kitchen counter. */
const COUNTER_FAMILY: ReadonlySet<TileKind> = new Set(['counter', 'pantry', 'board', 'stove', 'sink', 'plates', 'pass']);
export const isCounterFamily = (k: TileKind | null): boolean => k !== null && COUNTER_FAMILY.has(k);

/** Per-level look for walls inside the market (Harbor's pond, Rooftop's planters); stone otherwise. */
const MARKET_ACCENT: Record<string, 'pond' | 'planter'> = { 'harbor-pier': 'pond', 'rooftop-garden': 'planter' };

export type WallLook = 'frame' | 'stone' | 'pond' | 'planter';

export function wallLook(sc: Scene, x: number, y: number): WallLook {
  if (zoneAt(sc, x, y) !== 'market') return 'frame';
  if (y === 0 || y === sc.H - 1) return y === 0 ? 'stone' : 'frame';
  return MARKET_ACCENT[sc.s.arena.id] ?? 'stone';
}

/** Lift of the block on tile (x,y) in px (0 for floor). */
export function liftAt(sc: Scene, x: number, y: number): number {
  const k = kindAt(sc, x, y);
  if (k === null || k === 'floor') return 0;
  if (k === 'wall' && wallLook(sc, x, y) === 'pond') return 0;
  if (k === 'wall' && wallLook(sc, x, y) === 'planter') return LIFT.counter * sc.T;
  if (k === 'wall') return (y === sc.H - 1 ? LIFT.rail : LIFT.wall) * sc.T;
  if (k === 'crate' || k === 'trash') return LIFT.tall * sc.T;
  return LIFT.counter * sc.T;
}

/** Centre of a station's top face (where items rest), in logical px. */
export function topCenter(sc: Scene, index: number): { x: number; y: number } {
  const x = index % sc.W;
  const y = Math.floor(index / sc.W);
  return { x: px(sc, x) + sc.T / 2, y: py(sc, y) + sc.T / 2 - liftAt(sc, x, y) };
}

/** Logical rect a row layer covers: the row plus everything its blocks draw above/below it. */
export function rowBounds(sc: Scene, row: number): Rect {
  const { layout, T, H } = sc;
  const top = row === 0 ? 0 : py(sc, row) - T * 0.75;
  const bottom = row === H - 1 ? layout.height : py(sc, row + 1) + T * 0.1;
  return { x: 0, y: top, w: layout.width, h: bottom - top };
}

/**
 * Rects to bake for a row: the full row strip for the back and front rows, otherwise one rect per
 * run of consecutive blocks, so per-frame blits skip empty floor (cheap on software rasterizers).
 */
export function rowRuns(sc: Scene, row: number): Rect[] {
  const b = rowBounds(sc, row);
  if (row === 0 || row === sc.H - 1) return [b];
  const out: Rect[] = [];
  let c = 0;
  while (c < sc.W) {
    const k = kindAt(sc, c, row);
    if (k === null || k === 'floor') {
      c++;
      continue;
    }
    let e = c;
    while (e + 1 < sc.W && kindAt(sc, e + 1, row) !== 'floor') e++;
    const x0 = Math.max(0, px(sc, c) - 2);
    const x1 = Math.min(sc.layout.width, px(sc, e + 1) + 2);
    out.push({ x: x0, y: b.y, w: x1 - x0, h: b.h });
    c = e + 1;
  }
  return out;
}
