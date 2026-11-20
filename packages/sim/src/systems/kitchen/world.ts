/** Shared spatial / station helpers for the kitchen systems. */
import { inBounds, isWalkable, tileAt, tileIndex, tileIndexAtPos, tileOwner } from '../../grid';
import type { FireState, MatchState, PlayerId, PlayerState, SimEvent, StationState, TeamId, TileKind, Vec2 } from '../../types';
import { TARGET_OFFSET } from './constants';

export const emit = (state: MatchState, ev: SimEvent): void => {
  state.events.push(ev);
};

/** Tile owned by the other team this round (rival kitchen). `team` null = no rival (world items). */
export function isRivalTile(state: MatchState, team: TeamId | null, index: number): boolean {
  if (team === null) return false;
  const owner = tileOwner(state, index);
  return owner !== null && owner !== team;
}

/** True if `team` may stand on / throw through tile (x, y): floor that isn't the rival kitchen. */
export function isOpenFor(state: MatchState, team: TeamId | null, x: number, y: number): boolean {
  if (!inBounds(state.arena, x, y)) return false;
  if (!isWalkable(tileAt(state.arena, x, y))) return false;
  return !isRivalTile(state, team, tileIndex(state.arena, x, y));
}

export function isOpenPosFor(state: MatchState, team: TeamId | null, pos: Vec2): boolean {
  return isOpenFor(state, team, Math.floor(pos.x), Math.floor(pos.y));
}

/** §2: a team may use its own stations and unowned (market / doorway) ones. */
export function canUseTile(state: MatchState, team: TeamId, index: number): boolean {
  const owner = tileOwner(state, index);
  return owner === null || owner === team;
}

export const stationAt = (state: MatchState, index: number): StationState | undefined => state.stations[String(index)];

export const kindAt = (state: MatchState, index: number): TileKind | undefined => state.arena.tiles[index]?.kind;

export const fireAt = (state: MatchState, index: number): FireState | undefined => state.fires.find((f) => f.tile === index);

/** First station of `kind` owned by `team` this round (lowest tile index), if any. */
export function ownedStation(state: MatchState, kind: TileKind, team: TeamId): StationState | undefined {
  for (const st of Object.values(state.stations)) {
    if (kindAt(state, st.tile) === kind && tileOwner(state, st.tile) === team) return st;
  }
  return undefined;
}

/** §1: interaction target point and the tile containing it (null if off the map). */
export function interactTarget(state: MatchState, p: PlayerState): { tile: number | null; point: Vec2 } {
  const point = { x: p.pos.x + p.facing.x * TARGET_OFFSET, y: p.pos.y + p.facing.y * TARGET_OFFSET };
  return { tile: tileIndexAtPos(state.arena, point), point };
}

const EVEN_ORDER: readonly PlayerId[] = [0, 1, 2, 3];
const ODD_ORDER: readonly PlayerId[] = [2, 3, 0, 1];

/**
 * Order in which players act when they contend for the same thing in one tick (interactions,
 * catch ties). Alternates by tick parity so neither team always wins: even ticks team 0 first,
 * odd ticks team 1 first. Deterministic.
 */
export function actingOrder(state: MatchState): PlayerState[] {
  return (state.tick % 2 === 0 ? EVEN_ORDER : ODD_ORDER).map((id) => state.players[id]);
}

export const isResting =(v: Vec2): boolean => v.x === 0 && v.y === 0;
