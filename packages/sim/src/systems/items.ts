/**
 * OWNER: kitchen track (PR "sim-kitchen").
 * Thrown / knocked items in flight: landing on the first surface that accepts them, being
 * caught by any empty-handed player in the path (rivals included, in the market), bouncing
 * off a rival kitchen's doorway, or coming to rest on the floor. Also plates going cold
 * (plateColdSeconds after platedAtTick) wherever they are.
 */
import { dist, tileIndexAtPos, vecLength } from '../grid';
import { secondsToTicks } from '../tuning';
import type { FloorItem, Item, MatchState, PlayerState } from '../types';
import { teamOf } from '../types';
import { CATCH_MARGIN, EPS, SELF_CATCH_SECONDS, SUBSTEP } from './kitchen/constants';
import { actingOrder, emit, fireAt, isResting, isRivalTile, kindAt, stationAt } from './kitchen/world';

export function updateFloorItems(state: MatchState): void {
  const gone = new Set<FloorItem>();
  for (const fi of state.floorItems) {
    if (!isResting(fi.vel) && fly(state, fi)) gone.add(fi);
  }
  if (gone.size > 0) state.floorItems = state.floorItems.filter((fi) => !gone.has(fi));
  updateColdPlates(state);
}

const rest = (fi: FloorItem): void => {
  fi.vel = { x: 0, y: 0 };
};

/**
 * Advance one flying item by one tick. Returns true if it left the floor (landed on a
 * surface or was caught). Stops at the first of: empty counter/board entered, catch,
 * wall / rival-kitchen tile (rests on the last open tile), max range (rests on the floor).
 */
function fly(state: MatchState, fi: FloorItem): boolean {
  const t = state.config.tuning;
  const speed = vecLength(fi.vel.x, fi.vel.y);
  const dx = fi.vel.x / speed;
  const dy = fi.vel.y / speed;
  const team = fi.thrownBy === null ? null : teamOf(fi.thrownBy);
  let remaining = speed / t.tickRate;

  while (remaining > EPS) {
    const room = t.throwRange - fi.travelled;
    if (room <= EPS) break;
    const sub = Math.min(SUBSTEP, remaining, room);
    const next = { x: fi.pos.x + dx * sub, y: fi.pos.y + dy * sub };
    const from = tileIndexAtPos(state.arena, fi.pos);
    const to = tileIndexAtPos(state.arena, next);
    if (to !== from) {
      if (to === null || isRivalTile(state, team, to)) {
        rest(fi);
        return false;
      }
      if (kindAt(state, to) !== 'floor') {
        const st = stationAt(state, to);
        const kind = kindAt(state, to);
        if (st && (kind === 'counter' || kind === 'board') && st.item === null && !fireAt(state, to)) {
          st.item = fi.item;
          st.workTicks = 0;
          if (fi.thrownBy !== null) emit(state, { type: 'drop', player: fi.thrownBy, itemId: fi.item.id, tile: to });
          return true;
        }
        rest(fi);
        return false;
      }
    }
    fi.pos = next;
    fi.travelled += sub;
    remaining -= sub;
    const catcher = findCatcher(state, fi);
    if (catcher) {
      catcher.holding = fi.item;
      emit(state, { type: 'grab', player: catcher.id, itemId: fi.item.id });
      return true;
    }
  }
  if (t.throwRange - fi.travelled <= EPS) rest(fi);
  return false;
}

/**
 * Nearest empty-handed player whose centre is within playerRadius + CATCH_MARGIN.
 * Equal distances go to whoever comes first in actingOrder (alternates by tick parity).
 */
function findCatcher(state: MatchState, fi: FloorItem): PlayerState | null {
  const reach = state.config.tuning.playerRadius + CATCH_MARGIN;
  const selfTicks = secondsToTicks(state.config, SELF_CATCH_SECONDS);
  let best: PlayerState | null = null;
  let bestDist = Infinity;
  for (const p of actingOrder(state)) {
    if (p.holding !== null) continue;
    if (p.id === fi.thrownBy && fi.thrownAtTick !== null && state.tick - fi.thrownAtTick < selfTicks) continue;
    const d = dist(p.pos, fi.pos);
    if (d <= reach && d < bestDist) {
      best = p;
      bestDist = d;
    }
  }
  return best;
}

/** §5: a plate with food goes cold plateColdSeconds after platedAtTick, wherever it is. */
function updateColdPlates(state: MatchState): void {
  const coldTicks = secondsToTicks(state.config, state.config.tuning.plateColdSeconds);
  const check = (item: Item | null): void => {
    if (!item || item.type !== 'plate' || item.cold || item.platedAtTick === null || item.contents.length === 0) return;
    if (state.tick >= item.platedAtTick + coldTicks) {
      item.cold = true;
      emit(state, { type: 'plateCold', itemId: item.id });
    }
  };
  for (const p of state.players) check(p.holding);
  for (const st of Object.values(state.stations)) check(st.item);
  for (const fi of state.floorItems) check(fi.item);
}
