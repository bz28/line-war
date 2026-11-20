/**
 * OWNER: rules track. Charms (RULES §10): mascot figurines that spawn on the market's middle
 * column a few times per round, are carried home to bank (points + Heat), and fade when left on
 * the floor. Picking up, throwing, catching and knocking are the ordinary item rules.
 */
import { tileIndexAtPos, tileOwner, tileXY, zoneAt } from '../grid';
import { newId } from '../match';
import { randomInt, weightedIndex } from '../rng';
import { secondsToTicks } from '../tuning';
import type { CharmItem, Item, MatchState, PlayerState } from '../types';
import { isResting } from './kitchen/world';
import { roundTimes } from './rules/timing';
import { heatForStreak } from './scoring';

export const isCharm = (item: Item | null | undefined): item is CharmItem => !!item && item.type === 'charm';

/** Charms run only when enabled and the level supplied variants. */
export const charmsActive = (state: MatchState): boolean => state.config.charmsEnabled !== false && state.charmVariants.length > 0;

/** Round tick at which charm k (0-based) is due. */
export function charmDueTick(state: MatchState, k: number): number {
  const t = roundTimes(state.config);
  const n = state.config.tuning.charmsPerRound;
  return t.prepEnd + Math.floor(((k + 1) * (t.lastCallStart - t.prepEnd)) / (n + 1));
}

/** The market's middle column(s): halfway between its leftmost and rightmost columns. */
function middleColumns(state: MatchState): number[] {
  const { arena } = state;
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < arena.tiles.length; i++) {
    if (zoneAt(arena, i) !== 'market') continue;
    const x = i % arena.width;
    if (x < lo) lo = x;
    if (x > hi) hi = x;
  }
  if (!Number.isFinite(lo)) return [];
  const sum = lo + hi;
  return sum % 2 === 0 ? [sum / 2] : [(sum - 1) / 2, (sum + 1) / 2];
}

/** Free floor tiles of the middle column(s), in tile-index order. */
export function charmSpawnTiles(state: MatchState): number[] {
  const { arena } = state;
  const cols = new Set(middleColumns(state));
  const taken = new Set<number>();
  for (const fi of state.floorItems) {
    const t = tileIndexAtPos(arena, fi.pos);
    if (t !== null) taken.add(t);
  }
  for (const p of state.players) {
    const t = tileIndexAtPos(arena, p.pos);
    if (t !== null) taken.add(t);
  }
  const out: number[] = [];
  for (let i = 0; i < arena.tiles.length; i++) {
    if (!cols.has(i % arena.width) || zoneAt(arena, i) !== 'market' || arena.tiles[i]?.kind !== 'floor' || taken.has(i)) continue;
    out.push(i);
  }
  return out;
}

function spawnCharms(state: MatchState): void {
  const phase = state.round.phase;
  const n = state.config.tuning.charmsPerRound;
  const r = state.round;
  if (phase === 'lastCall') {
    state.charmsSpawned = Math.max(state.charmsSpawned, n); // still-due charms are dropped
    return;
  }
  if (phase !== 'service' && phase !== 'rush') return;
  while (state.charmsSpawned < n && r.tick >= charmDueTick(state, state.charmsSpawned)) {
    const tiles = charmSpawnTiles(state);
    if (tiles.length === 0) return; // retried next tick
    const tile = tiles[randomInt(state, tiles.length)]!;
    const v = weightedIndex(
      state,
      state.charmVariants.map((c) => c.weight),
    );
    const variant = state.charmVariants[Math.max(0, v)]!.id;
    const { x, y } = tileXY(state.arena, tile);
    const item: CharmItem = { id: newId(state), type: 'charm', variant, floorSinceTick: state.tick };
    state.floorItems.push({ item, pos: { x: x + 0.5, y: y + 0.5 }, vel: { x: 0, y: 0 }, thrownBy: null, thrownAtTick: null, travelled: 0 });
    state.charmsSpawned++;
    state.events.push({ type: 'charmSpawned', itemId: item.id, tile, variant });
  }
}

function raiseHeat(state: MatchState, p: PlayerState): void {
  const ts = state.teams[p.team];
  const thresholds = state.config.tuning.heatThresholds;
  const top = thresholds.length;
  const target = Math.min(top, ts.heat + state.config.tuning.charmHeatTiers);
  if (target <= ts.heat) return;
  ts.cleanStreak = Math.max(ts.cleanStreak, thresholds[target - 1]!);
  const heat = heatForStreak(state, ts.cleanStreak);
  if (heat !== ts.heat) {
    ts.heat = heat;
    state.events.push({ type: 'heatChange', team: p.team, heat });
  }
}

function bankCharms(state: MatchState): void {
  for (const p of state.players) {
    const item = p.holding;
    if (!isCharm(item)) continue;
    const tile = tileIndexAtPos(state.arena, p.pos);
    if (tile === null || tileOwner(state, tile) !== p.team) continue;
    p.holding = null;
    state.teams[p.team].score += state.config.tuning.charmPoints;
    raiseHeat(state, p);
    state.events.push({ type: 'charmBanked', team: p.team, player: p.id, itemId: item.id, variant: item.variant });
  }
}

function fadeCharms(state: MatchState): void {
  for (const p of state.players) if (isCharm(p.holding)) p.holding.floorSinceTick = null;
  const life = secondsToTicks(state.config, state.config.tuning.charmLifetimeSeconds);
  let faded = false;
  for (const fi of state.floorItems) {
    if (!isCharm(fi.item)) continue;
    if (!isResting(fi.vel)) {
      fi.item.floorSinceTick = null;
      continue;
    }
    fi.item.floorSinceTick ??= state.tick;
    if (state.tick - fi.item.floorSinceTick >= life) {
      faded = true;
      state.events.push({ type: 'charmFaded', itemId: fi.item.id, variant: fi.item.variant });
    }
  }
  if (faded) state.floorItems = state.floorItems.filter((fi) => !(isCharm(fi.item) && fi.item.floorSinceTick !== null && state.tick - fi.item.floorSinceTick >= life));
}

/** Last system of the tick (RULES §10): bank, fade, then spawn. */
export function updateCharms(state: MatchState): void {
  if (!charmsActive(state)) return;
  bankCharms(state);
  fadeCharms(state);
  spawnCharms(state);
}

/** Round end: every charm still in play is removed (no event). */
export function clearCharms(state: MatchState): void {
  for (const p of state.players) if (isCharm(p.holding)) p.holding = null;
  if (state.floorItems.some((fi) => isCharm(fi.item))) state.floorItems = state.floorItems.filter((fi) => !isCharm(fi.item));
}
