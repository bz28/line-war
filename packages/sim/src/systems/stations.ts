/**
 * OWNER: kitchen track (PR "sim-kitchen").
 * Per-tick station updates: cooking, burning, fire start/spread, dirty plate returns.
 * When food burns, call registerMistake() from scoring.ts for the owning team.
 */
import { inBounds, tileIndex, tileOwner, tileXY } from '../grid';
import { randomInt } from '../rng';
import { secondsToTicks } from '../tuning';
import type { MatchState } from '../types';
import { startFire, vesselTimeline } from './kitchen/cooking';
import { emit, fireAt, ownedStation, stationAt } from './kitchen/world';
import { registerMistake } from './scoring';

export function updateStations(state: MatchState): void {
  updateCooking(state);
  updateFires(state);
  updateDirtyPlateReturns(state);
}

/** §4 timeline: cooking → done → burnt → fire, measured from cooking start. */
function updateCooking(state: MatchState): void {
  for (const st of Object.values(state.stations)) {
    const v = st.vessel;
    if (!v || (v.status !== 'cooking' && v.status !== 'done' && v.status !== 'burnt')) continue;
    if (fireAt(state, st.tile)) continue; // a burning stove is frozen until extinguished
    v.cookTicks++;
    const tl = vesselTimeline(state, v.kind);
    if (v.status === 'cooking' && v.cookTicks >= tl.done) {
      v.status = 'done';
      for (const f of v.contents) f.state = 'cooked';
      emit(state, { type: 'cookDone', tile: st.tile });
    } else if (v.status === 'done' && v.cookTicks >= tl.burnt) {
      v.status = 'burnt';
      for (const f of v.contents) f.state = 'burnt';
      emit(state, { type: 'burnt', tile: st.tile });
      const owner = tileOwner(state, st.tile);
      if (owner !== null) registerMistake(state, owner);
    } else if (v.status === 'burnt' && v.cookTicks >= tl.fire) {
      startFire(state, st.tile);
    }
  }
}

/** Every fireSpreadSeconds each fire spreads to one random orthogonal interactive tile that isn't burning. */
function updateFires(state: MatchState): void {
  const spread = secondsToTicks(state.config, state.config.tuning.fireSpreadSeconds);
  const arena = state.arena;
  // Snapshot: fires started this tick don't spread until their own timer.
  for (const fire of state.fires.slice()) {
    if (state.tick < fire.spreadAtTick) continue;
    fire.spreadAtTick = state.tick + spread;
    const { x, y } = tileXY(arena, fire.tile);
    const candidates: number[] = [];
    for (const [nx, ny] of [
      [x, y - 1],
      [x - 1, y],
      [x + 1, y],
      [x, y + 1],
    ] as const) {
      if (!inBounds(arena, nx, ny)) continue;
      const i = tileIndex(arena, nx, ny);
      if (stationAt(state, i) && !fireAt(state, i)) candidates.push(i);
    }
    if (candidates.length === 0) continue;
    startFire(state, candidates[randomInt(state, candidates.length)]!);
  }
}

/** §5: returns whose atTick has passed land in the owning team's sink this round. */
function updateDirtyPlateReturns(state: MatchState): void {
  if (state.dirtyPlateReturns.length === 0) return;
  state.dirtyPlateReturns = state.dirtyPlateReturns.filter((r) => {
    if (r.atTick > state.tick) return true;
    const sink = ownedStation(state, 'sink', r.team);
    if (sink) sink.dirtyPlates++;
    return false;
  });
}
