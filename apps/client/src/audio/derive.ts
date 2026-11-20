/**
 * OWNER: audio track. Sounds derived from MatchState rather than from events (pure, no Web Audio):
 * burn warnings, the cooking/fire loops, the chop/wash rhythm, catches and Critic arrivals.
 */
import { isVisibleTo, vesselTimeline, type MatchState, type TeamId } from '@line-war/sim';
import { panForX } from './mix';

/** Seconds before a vessel burns (or a burnt one catches fire) that the warning ticks. */
export const BURN_WARN_SECONDS = 2;

export interface BurnWarning {
  tile: number;
  /** What happens when the countdown hits zero. */
  next: 'burnt' | 'fire';
  /** Ticks until it happens (> 0). */
  remainingTicks: number;
  /** 0 at the start of the warning window, approaching 1 just before it happens. */
  urgency: number;
  pan: number;
}

/** Vessels inside the last BURN_WARN_SECONDS before burning or catching fire. */
export function burnWarnings(state: MatchState): BurnWarning[] {
  const windowTicks = Math.max(1, Math.round(BURN_WARN_SECONDS * state.config.tuning.tickRate));
  const out: BurnWarning[] = [];
  for (const st of Object.values(state.stations)) {
    const v = st.vessel;
    if (!v || (v.status !== 'done' && v.status !== 'burnt')) continue;
    const tl = vesselTimeline(state, v.kind);
    const next = v.status === 'done' ? 'burnt' : 'fire';
    const remainingTicks = (next === 'burnt' ? tl.burnt : tl.fire) - v.cookTicks;
    if (remainingTicks <= 0 || remainingTicks > windowTicks) continue;
    out.push({
      tile: st.tile,
      next,
      remainingTicks,
      urgency: 1 - remainingTicks / windowTicks,
      pan: panForX((st.tile % state.arena.width) + 0.5, state.arena.width),
    });
  }
  return out;
}

/** Ticks between warning beeps: slow at the start of the window, fast at the end. */
export function burnBeepInterval(urgency: number, tickRate: number): number {
  const seconds = 0.4 - 0.28 * Math.min(1, Math.max(0, urgency));
  return Math.max(1, Math.round(seconds * tickRate));
}

export interface LoopTarget {
  /** 0..1 loudness (before the cue's mix level). */
  level: number;
  pan: number;
}

export interface LoopTargets {
  sizzle: LoopTarget;
  bubble: LoopTarget;
  fire: LoopTarget;
}

/** More sources get louder, but sub-linearly (n=1 -> 0.6, 2 -> 0.84, 3 -> 0.94). */
const stack = (n: number): number => (n <= 0 ? 0 : 1 - 0.4 ** n);

/** Loop levels: pan sizzle while a pan has food on heat, pot bubble likewise, fire crackle while anything burns. */
export function loopTargets(state: MatchState): LoopTargets {
  const w = state.arena.width;
  const acc = { pan: { n: 0, x: 0 }, pot: { n: 0, x: 0 }, fire: { n: 0, x: 0 } };
  const playing = state.round.phase !== 'roundOver' && state.round.phase !== 'matchOver';
  if (playing) {
    for (const st of Object.values(state.stations)) {
      const v = st.vessel;
      if (!v || (v.status !== 'cooking' && v.status !== 'done' && v.status !== 'burnt')) continue;
      const a = acc[v.kind];
      a.n++;
      a.x += (st.tile % w) + 0.5;
    }
    for (const f of state.fires) {
      acc.fire.n++;
      acc.fire.x += (f.tile % w) + 0.5;
    }
  }
  const target = (a: { n: number; x: number }): LoopTarget => ({
    level: stack(a.n),
    pan: a.n ? panForX(a.x / a.n, w) : 0,
  });
  return { sizzle: target(acc.pan), bubble: target(acc.pot), fire: target(acc.fire) };
}

export interface WorkHit {
  tile: number;
  kind: 'chop' | 'wash' | 'extinguish';
  pan: number;
  /** Alternating 0/1 so the knock rhythm has a little lilt. */
  beat: number;
}

/** Seconds between knocks while chopping / swishes while washing or spraying a fire. */
export const CHOP_KNOCK_SECONDS = 0.22;
export const WASH_SWISH_SECONDS = 0.38;

/**
 * Rhythmic work sounds: a hit whenever a board/sink/fire's progress advanced this tick and
 * crossed a beat. `prev` maps tile -> progress at the previous tick; it is updated in place.
 */
export function workHits(state: MatchState, prev: Map<number, number>): WorkHit[] {
  const w = state.arena.width;
  const rate = state.config.tuning.tickRate;
  const out: WorkHit[] = [];
  const seen = new Set<number>();
  // Fires are keyed apart from station tiles (a burning stove has both).
  const check = (key: number, tile: number, ticks: number, kind: WorkHit['kind'], seconds: number) => {
    seen.add(key);
    const before = prev.get(key) ?? 0;
    prev.set(key, ticks);
    if (ticks <= before) return;
    const every = Math.max(1, Math.round(seconds * rate));
    // Beat on the first tick of work, then every `every` ticks.
    if ((ticks - 1) % every !== 0) return;
    out.push({ tile, kind, pan: panForX((tile % w) + 0.5, w), beat: Math.floor((ticks - 1) / every) % 2 });
  };
  for (const st of Object.values(state.stations)) {
    const kind = state.arena.tiles[st.tile]?.kind;
    if (kind === 'board') check(st.tile, st.tile, st.workTicks, 'chop', CHOP_KNOCK_SECONDS);
    else if (kind === 'sink') check(st.tile, st.tile, st.workTicks, 'wash', WASH_SWISH_SECONDS);
  }
  for (const f of state.fires) check(-1 - f.tile, f.tile, f.extinguishTicks, 'extinguish', WASH_SWISH_SECONDS);
  for (const key of [...prev.keys()]) if (!seen.has(key)) prev.delete(key);
  return out;
}

/** Ids of thrown items still in the air (used to tell a catch from a grab on the next tick). */
export function inFlightIds(state: MatchState): Set<number> {
  const ids = new Set<number>();
  for (const fi of state.floorItems) if (fi.thrownAtTick !== null && (fi.vel.x !== 0 || fi.vel.y !== 0)) ids.add(fi.item.id);
  return ids;
}

/**
 * Critic tickets that just became visible to the listener (at spawn, or when a Critic shown
 * to the trailing crew first is revealed to everyone). `announced` is updated in place.
 */
export function criticAnnouncements(state: MatchState, localTeam: TeamId | null, announced: Set<number>): number[] {
  const out: number[] = [];
  const live = new Set<number>();
  for (const t of state.tickets) {
    if (!t.isCritic) continue;
    live.add(t.id);
    if (announced.has(t.id)) continue;
    if (localTeam === null || isVisibleTo(t, localTeam)) {
      announced.add(t.id);
      out.push(t.id);
    }
  }
  for (const id of [...announced]) if (!live.has(id)) announced.delete(id);
  return out;
}
