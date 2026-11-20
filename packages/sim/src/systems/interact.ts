/**
 * OWNER: kitchen track (PR "sim-kitchen").
 * Grab / drop / place / throw / work (chop, wash, extinguish) against the faced tile.
 * - Grabbing from a market crate goes through takeFromCrate() in market.ts.
 * - Placing a plate on your team's pass goes through deliverPlate() in tickets.ts.
 * Players may only use stations their team owns (tileOwner) or market tiles.
 */
import { dist, tileIndexAtPos, tileOwner } from '../grid';
import { newId } from '../match';
import { secondsToTicks, timerTicks } from '../tuning';
import type { IngredientItem, Item, MatchInputs, MatchState, PlateItem, PlayerState, StationState, Vec2 } from '../types';
import { addToVessel, putOutFire, resetVessel } from './kitchen/cooking';
import { DROP_OFFSET } from './kitchen/constants';
import { addToPlate, emptyPlate, plateFits } from './kitchen/plate';
import {
  actingOrder,
  canUseTile,
  emit,
  fireAt,
  interactTarget,
  isOpenPosFor,
  isResting,
  isRivalTile,
  kindAt,
  ownedStation,
  stationAt,
} from './kitchen/world';
import { takeFromCrate } from './market';
import { deliverPlate } from './tickets';

export function handleInteractions(state: MatchState, inputs: MatchInputs): void {
  for (const p of state.players) p.working = false;
  // Contested pickups go to whoever acts first; the order alternates by tick parity (fairness).
  for (const p of actingOrder(state)) {
    const input = inputs[p.id];
    // One button action per tick; Grab wins over Throw. Dazed players can't grab or throw.
    if (p.dazedTicks === 0) {
      if (input.grab) grab(state, p);
      else if (input.throw) throwHeld(state, p);
    }
    if (input.work) work(state, p);
  }
}

// ---------- grab ----------

/** The usable, non-burning station the player faces, or null. Also returns the raw tile index. */
function facedStation(state: MatchState, p: PlayerState): { tile: number | null; station: StationState | null } {
  const { tile } = interactTarget(state, p);
  if (tile === null || !canUseTile(state, p.team, tile) || fireAt(state, tile)) return { tile, station: null };
  return { tile, station: stationAt(state, tile) ?? null };
}

function grab(state: MatchState, p: PlayerState): void {
  const { tile, station } = facedStation(state, p);
  if (p.holding === null) {
    if (pickUpFloorItem(state, p)) return;
    if (station) grabFromStation(state, p, station);
    return;
  }
  if (station) {
    if (p.holding.type === 'ingredient') useIngredientOn(state, p, p.holding, station);
    else usePlateOn(state, p, p.holding, station);
    return;
  }
  if (tile !== null && kindAt(state, tile) === 'floor' && canUseTile(state, p.team, tile)) dropOnFloor(state, p);
}

const give = (state: MatchState, p: PlayerState, item: Item): void => {
  p.holding = item;
  emit(state, { type: 'grab', player: p.id, itemId: item.id });
};

/** Nearest resting floor item within interactReach in front of the player (facing · offset ≥ 0). */
function pickUpFloorItem(state: MatchState, p: PlayerState): boolean {
  const reach = state.config.tuning.interactReach;
  let best = -1;
  let bestDist = Infinity;
  state.floorItems.forEach((fi, i) => {
    if (!isResting(fi.vel)) return;
    const d = dist(p.pos, fi.pos);
    if (d > reach || d >= bestDist) return;
    const front = (fi.pos.x - p.pos.x) * p.facing.x + (fi.pos.y - p.pos.y) * p.facing.y;
    if (front < 0) return;
    const t = tileIndexAtPos(state.arena, fi.pos);
    if (t !== null && isRivalTile(state, p.team, t)) return;
    best = i;
    bestDist = d;
  });
  if (best < 0) return false;
  const [fi] = state.floorItems.splice(best, 1);
  give(state, p, fi!.item);
  return true;
}

function grabFromStation(state: MatchState, p: PlayerState, st: StationState): void {
  const def = state.arena.tiles[st.tile];
  switch (def?.kind) {
    case 'pantry': {
      if (!def.ingredient) return;
      give(state, p, newIngredient(state, def.ingredient));
      return;
    }
    case 'crate': {
      const item = takeFromCrate(state, st.tile);
      if (item) give(state, p, item);
      return;
    }
    case 'plates': {
      if (st.stock <= 0) return;
      st.stock--;
      const plate: PlateItem = { id: newId(state), type: 'plate', dirty: false, contents: [], platedAtTick: null, cold: false };
      give(state, p, plate);
      return;
    }
    case 'counter':
    case 'board': {
      if (!st.item) return;
      const item = st.item;
      st.item = null;
      st.workTicks = 0;
      give(state, p, item);
      return;
    }
    case 'stove': {
      const v = st.vessel;
      if (!v || v.status !== 'burnt') return;
      const kind = v.contents[0]?.kind;
      resetVessel(v);
      if (kind) give(state, p, { id: newId(state), type: 'ingredient', kind, state: 'burnt' });
      return;
    }
    default:
      return;
  }
}

function newIngredient(state: MatchState, kind: IngredientItem['kind']): IngredientItem {
  return { id: newId(state), type: 'ingredient', kind, state: 'raw' };
}

const placed = (state: MatchState, p: PlayerState, itemId: number, tile: number): void => {
  emit(state, { type: 'drop', player: p.id, itemId, tile });
};

function useIngredientOn(state: MatchState, p: PlayerState, ing: IngredientItem, st: StationState): void {
  const kind = kindAt(state, st.tile);
  if (kind === 'counter' || kind === 'board') {
    if (st.item === null) {
      st.item = ing;
      st.workTicks = 0;
      p.holding = null;
      placed(state, p, ing.id, st.tile);
    } else if (st.item.type === 'plate' && plateFits(st.item, [ing], state.recipes)) {
      addToPlate(state, st.item, [ing]);
      p.holding = null;
      placed(state, p, ing.id, st.tile);
    }
  } else if (kind === 'stove') {
    if (st.vessel && addToVessel(state, st.vessel, ing)) {
      p.holding = null;
      placed(state, p, ing.id, st.tile);
    }
  } else if (kind === 'trash') {
    p.holding = null;
    placed(state, p, ing.id, st.tile);
  }
}

function usePlateOn(state: MatchState, p: PlayerState, plate: PlateItem, st: StationState): void {
  const kind = kindAt(state, st.tile);
  if (kind === 'trash') {
    emptyPlate(plate);
    placed(state, p, plate.id, st.tile);
  } else if (kind === 'pass') {
    // Only our own (or neutral) pass gets here; deliverPlate validates and emits its own events.
    if (deliverPlate(state, p.id, plate).ok) p.holding = null;
  } else if (kind === 'counter' || kind === 'board') {
    if (st.item === null) {
      st.item = plate;
      st.workTicks = 0;
      p.holding = null;
      placed(state, p, plate.id, st.tile);
    } else if (st.item.type === 'ingredient' && plateFits(plate, [st.item], state.recipes)) {
      const ing = st.item;
      addToPlate(state, plate, [ing]);
      st.item = null;
      st.workTicks = 0;
      emit(state, { type: 'grab', player: p.id, itemId: ing.id });
    }
  } else if (kind === 'stove') {
    const v = st.vessel;
    if (v && v.status === 'done' && plateFits(plate, v.contents, state.recipes)) {
      addToPlate(state, plate, v.contents);
      resetVessel(v);
      emit(state, { type: 'grab', player: p.id, itemId: plate.id });
    }
  }
}

function dropOnFloor(state: MatchState, p: PlayerState): void {
  const item = p.holding;
  if (!item) return;
  const pos: Vec2 = { x: p.pos.x + p.facing.x * DROP_OFFSET, y: p.pos.y + p.facing.y * DROP_OFFSET };
  if (!isOpenPosFor(state, p.team, pos)) return;
  state.floorItems.push({ item, pos, vel: { x: 0, y: 0 }, thrownBy: p.id, thrownAtTick: null, travelled: 0 });
  p.holding = null;
  emit(state, { type: 'drop', player: p.id, itemId: item.id, tile: null });
}

// ---------- throw ----------

function throwHeld(state: MatchState, p: PlayerState): void {
  const item = p.holding;
  if (!item) return;
  const speed = state.config.tuning.throwSpeed;
  state.floorItems.push({
    item,
    pos: { x: p.pos.x, y: p.pos.y },
    vel: { x: p.facing.x * speed, y: p.facing.y * speed },
    thrownBy: p.id,
    thrownAtTick: state.tick,
    travelled: 0,
  });
  p.holding = null;
  emit(state, { type: 'throw', player: p.id, itemId: item.id });
}

// ---------- work ----------

function work(state: MatchState, p: PlayerState): void {
  const { tile } = interactTarget(state, p);
  if (tile === null || !canUseTile(state, p.team, tile)) return;
  const cfg = state.config;

  const fire = fireAt(state, tile);
  if (fire) {
    p.working = true;
    fire.extinguishTicks++;
    if (fire.extinguishTicks >= secondsToTicks(cfg, cfg.tuning.extinguishSeconds)) putOutFire(state, tile);
    return;
  }

  const st = stationAt(state, tile);
  if (!st) return;
  const kind = kindAt(state, tile);
  if (kind === 'board') {
    const it = st.item;
    if (!it || it.type !== 'ingredient' || it.state !== 'raw' || !state.ingredients[it.kind]?.choppable) return;
    p.working = true;
    st.workTicks++;
    if (st.workTicks >= timerTicks(cfg, cfg.tuning.chopSeconds)) {
      it.state = 'chopped';
      st.workTicks = 0;
      emit(state, { type: 'chopDone', tile });
    }
  } else if (kind === 'sink') {
    if (st.dirtyPlates <= 0) return;
    p.working = true;
    st.workTicks++;
    if (st.workTicks >= timerTicks(cfg, cfg.tuning.washSeconds)) {
      st.workTicks = 0;
      st.dirtyPlates--;
      // The clean plate goes to the sink owner's rack (a neutral sink would feed the washer's team).
      const rack = ownedStation(state, 'plates', tileOwner(state, tile) ?? p.team);
      if (rack) rack.stock++;
      emit(state, { type: 'washDone', tile });
    }
  }
}
