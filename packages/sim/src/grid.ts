import type { ArenaRuntime, MatchState, TeamId, TileDef, Vec2, Zone } from './types';

export const tileIndex = (arena: ArenaRuntime, x: number, y: number): number => y * arena.width + x;

export function tileXY(arena: ArenaRuntime, index: number): Vec2 {
  return { x: index % arena.width, y: Math.floor(index / arena.width) };
}

export function inBounds(arena: ArenaRuntime, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < arena.width && y < arena.height;
}

export function tileAt(arena: ArenaRuntime, x: number, y: number): TileDef | null {
  if (!inBounds(arena, x, y)) return null;
  return arena.tiles[tileIndex(arena, x, y)] ?? null;
}

/** Tile under a world position (in tiles). */
export function tileIndexAtPos(arena: ArenaRuntime, pos: Vec2): number | null {
  const x = Math.floor(pos.x);
  const y = Math.floor(pos.y);
  return inBounds(arena, x, y) ? tileIndex(arena, x, y) : null;
}

/** Players can only walk on floor tiles. Everything else blocks movement. */
export function isWalkable(def: TileDef | null): boolean {
  return def !== null && def.kind === 'floor';
}

export function zoneAt(arena: ArenaRuntime, index: number): Zone {
  return arena.zones[index] ?? 'none';
}

/**
 * Team that owns a tile this round, accounting for the kitchen swap between rounds.
 * Market and 'none' tiles have no owner.
 */
export function tileOwner(state: MatchState, index: number): TeamId | null {
  const base = state.arena.owners[index] ?? null;
  if (base === null) return null;
  return state.round.swapped ? ((1 - base) as TeamId) : base;
}

export const tileCenter = (arena: ArenaRuntime, index: number): Vec2 => {
  const { x, y } = tileXY(arena, index);
  return { x: x + 0.5, y: y + 0.5 };
};

/**
 * Euclidean length. Uses Math.sqrt (IEEE-754 correctly rounded on every engine), not
 * Math.hypot, whose result may differ in the last bit between JS engines.
 */
export const vecLength = (x: number, y: number): number => Math.sqrt(x * x + y * y);

export const dist =(a: Vec2, b: Vec2): number => vecLength(a.x - b.x, a.y - b.y);
