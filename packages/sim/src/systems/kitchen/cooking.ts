/** Vessel and fire helpers shared by interact.ts and stations.ts (RULES §3, §4). */
import { secondsToTicks, timerTicks } from '../../tuning';
import type { IngredientItem, MatchState, VesselKind, VesselState } from '../../types';
import { emit, fireAt, stationAt } from './world';

/** Cumulative ticks from cooking start at which the vessel becomes done / burnt / catches fire. */
export function vesselTimeline(state: MatchState, kind: VesselKind): { done: number; burnt: number; fire: number } {
  const t = state.config.tuning;
  const cook = timerTicks(state.config, kind === 'pan' ? t.panCookSeconds : t.potCookSeconds);
  const burn = timerTicks(state.config, kind === 'pan' ? t.panBurnSeconds : t.potBurnSeconds);
  const fire = timerTicks(state.config, t.fireAfterBurnSeconds);
  return { done: cook, burnt: cook + burn, fire: cook + burn + fire };
}

export function resetVessel(v: VesselState): void {
  v.contents = [];
  v.cookTicks = 0;
  v.status = 'empty';
}

/**
 * §4: try to put an ingredient into a vessel. Returns true if accepted.
 * Pan: one ingredient, only when empty, cooks at once. Pot: fills up to potCapacity, cooks when full.
 */
export function addToVessel(state: MatchState, v: VesselState, ing: IngredientItem): boolean {
  const cook = state.ingredients[ing.kind]?.cook ?? null;
  if (!cook || cook.vessel !== v.kind || ing.state !== cook.from) return false;
  if (v.status !== 'empty') return false;
  const capacity = v.kind === 'pan' ? 1 : state.config.tuning.potCapacity;
  if (v.contents.length >= capacity) return false;
  v.contents.push({ kind: ing.kind, state: ing.state });
  if (v.contents.length >= capacity) {
    v.status = 'cooking';
    v.cookTicks = 0;
  }
  return true;
}

/** Set a tile on fire (no-op if it already burns). A burning stove's vessel goes to 'fire'. */
export function startFire(state: MatchState, tile: number): void {
  if (fireAt(state, tile)) return;
  state.fires.push({
    tile,
    spreadAtTick: state.tick + secondsToTicks(state.config, state.config.tuning.fireSpreadSeconds),
    extinguishTicks: 0,
  });
  const v = stationAt(state, tile)?.vessel;
  if (v) v.status = 'fire';
  emit(state, { type: 'fireStart', tile });
}

/** Remove a fire; a burning stove's vessel resets to empty. */
export function putOutFire(state: MatchState, tile: number): void {
  const i = state.fires.findIndex((f) => f.tile === tile);
  if (i < 0) return;
  state.fires.splice(i, 1);
  const v = stationAt(state, tile)?.vessel;
  if (v) resetVessel(v);
  emit(state, { type: 'fireOut', tile });
}
