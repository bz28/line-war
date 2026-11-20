/**
 * OWNER: audio track. SimEvent -> sound cue mapping (pure, no Web Audio).
 *
 * `EVENT_HANDLING` is a Record over every SimEvent type, so adding an event to the sim
 * without deciding how it sounds fails the typecheck (and test/audio/cues.test.ts).
 */
import type { MatchState, SimEvent, TeamId } from '@line-war/sim';
import { panForX } from './mix';

/** Loudness/priority class. Frequent sounds are quiet; alerts and stingers cut through. */
export type CueCategory = 'frequent' | 'feedback' | 'alert' | 'stinger';

export type CueId =
  | 'grab' | 'drop' | 'catch' | 'throw' | 'dash' | 'knock'
  | 'chopKnock' | 'washSwish' | 'extinguish' | 'chopDone' | 'washDone'
  | 'cookDone' | 'burnWarn' | 'burnt' | 'fireStart' | 'fireOut'
  | 'ticketSpawn' | 'ticketExpired' | 'critic'
  | 'deliver' | 'deliverRival' | 'serveRefused' | 'plateCold'
  | 'heatUp' | 'heatDown'
  | 'prepBell' | 'serviceBell' | 'rushFanfare' | 'lastCallBell' | 'roundWhistle' | 'matchWin' | 'matchEnd'
  | 'clockTick'
  // Feel cues, triggered by the client (hit-stop, score token landing), not by a SimEvent.
  | 'knockThud' | 'scoreLand';

export interface CueSpec {
  category: CueCategory;
  /** Voice gain in dB. Recipes differ in density, so this is tuned by rendering (see the PR level table). */
  gainDb: number;
  /** Max simultaneous voices of this cue. */
  maxConcurrent: number;
  /** Retrigger guard: a second trigger within this many seconds is dropped. */
  minGap: number;
}

const spec = (category: CueCategory, gainDb: number, maxConcurrent = 2, minGap = 0.04): CueSpec => ({
  category,
  gainDb,
  maxConcurrent,
  minGap,
});

export const CUES: Record<CueId, CueSpec> = {
  grab: spec('frequent', -26, 2, 0.05),
  drop: spec('frequent', -28, 2, 0.05),
  chopKnock: spec('frequent', -25, 3, 0.06),
  washSwish: spec('frequent', -27, 2, 0.12),
  extinguish: spec('frequent', -30, 2, 0.12),
  catch: spec('feedback', -21),
  throw: spec('feedback', -19),
  dash: spec('feedback', -17, 2, 0.08),
  chopDone: spec('feedback', -21),
  washDone: spec('feedback', -24),
  plateCold: spec('feedback', -20, 1, 0.3),
  ticketSpawn: spec('feedback', -11, 1, 0.15),
  serveRefused: spec('feedback', -21, 1, 0.25),
  knock: spec('feedback', -13, 2, 0.1),
  // A sign ticking up is confirmation, not news: it sits under the serve's own ka-ching.
  scoreLand: spec('feedback', -20, 2, 0.06),
  // The hit-stop thud is felt more than heard (sub energy); one at a time, the freeze is shared.
  knockThud: spec('alert', -9, 1, 0.12),
  cookDone: spec('alert', -15, 2, 0.1),
  ticketExpired: spec('alert', -5, 1, 0.2),
  heatUp: spec('alert', -15, 2, 0.2),
  heatDown: spec('alert', -14, 2, 0.2),
  fireOut: spec('alert', -16, 2, 0.15),
  burnt: spec('alert', -12, 2, 0.15),
  burnWarn: spec('alert', -9, 2, 0.05),
  fireStart: spec('alert', -10, 2, 0.15),
  deliver: spec('alert', -10, 2, 0.08),
  deliverRival: spec('alert', -11, 2, 0.08),
  clockTick: spec('stinger', -20, 1, 0.1),
  critic: spec('stinger', -7, 1, 1),
  prepBell: spec('stinger', -10, 1, 1),
  serviceBell: spec('stinger', -11, 1, 1),
  rushFanfare: spec('stinger', -8, 1, 1),
  lastCallBell: spec('stinger', -10, 1, 1),
  roundWhistle: spec('stinger', -15, 1, 1),
  matchWin: spec('stinger', -9, 1, 1),
  matchEnd: spec('stinger', -11, 1, 1),
};

export const CATEGORY_PRIORITY: Record<CueCategory, number> = { frequent: 0, feedback: 1, alert: 2, stinger: 3 };

/** Cues that duck the music so they read. */
export const DUCKING_CUES: ReadonlySet<CueId> = new Set<CueId>([
  'critic', 'rushFanfare', 'lastCallBell', 'prepBell', 'roundWhistle', 'matchWin', 'matchEnd', 'deliverRival',
]);

export interface Cue {
  id: CueId;
  /** Stereo position in [-1, 1]. */
  pan: number;
  /** Pitch offset in semitones (Heat tier, variation). */
  pitch: number;
}

/** What the mapper needs besides the event itself. */
export interface CueContext {
  /** Crew the listener plays for; null when both crews have local humans (no "rival"). */
  localTeam: TeamId | null;
  /** Heat per team at the end of the previous tick (to tell heat up from heat down). */
  prevHeat: readonly [number, number];
  /** Item ids that were in flight (thrown) at the end of the previous tick: a grab of one is a catch. */
  inFlight: ReadonlySet<number>;
}

export type EventHandling = 'mapped' | 'ignored';

/**
 * Every SimEvent type and whether it makes a sound. 'ignored' entries say why in a comment.
 * Critic tickets are announced from state (criticAnnouncements) rather than from ticketSpawn,
 * so a Critic shown only to the trailing crew does not leak through audio to the leader.
 */
export const EVENT_HANDLING: Record<SimEvent['type'], EventHandling> = {
  grab: 'mapped',
  drop: 'mapped',
  throw: 'mapped',
  dash: 'mapped',
  knock: 'mapped',
  chopDone: 'mapped',
  washDone: 'mapped',
  cookDone: 'mapped',
  burnt: 'mapped',
  fireStart: 'mapped',
  fireOut: 'mapped',
  ticketSpawn: 'mapped',
  ticketExpired: 'mapped',
  delivered: 'mapped',
  serveRefused: 'mapped',
  plateCold: 'mapped',
  heatChange: 'mapped',
  phaseChange: 'mapped',
  roundEnd: 'mapped',
  matchEnd: 'mapped',
  // Charms (RULES §10): no sounds yet; the client never passes charm variants to createMatch, so these don't fire.
  charmSpawned: 'ignored',
  charmBanked: 'ignored',
  charmFaded: 'ignored',
};

const tileX = (state: MatchState, tile: number): number => (tile % state.arena.width) + 0.5;

/** x of the kitchen a team plays in this round (kitchen0 is the left one). */
export function teamSideX(state: MatchState, team: TeamId): number {
  const side = state.round.swapped ? 1 - team : team;
  return state.arena.width * (side === 0 ? 0.2 : 0.8);
}

/** Where an item is right now (held, on a station, or on the floor); null if gone. */
function itemX(state: MatchState, itemId: number): number | null {
  for (const p of state.players) if (p.holding?.id === itemId) return p.pos.x;
  for (const fi of state.floorItems) if (fi.item.id === itemId) return fi.pos.x;
  for (const st of Object.values(state.stations)) if (st.item?.id === itemId) return tileX(state, st.tile);
  return null;
}

/** The cue for one event, or null if it makes no sound in this context. */
export function cueForEvent(ev: SimEvent, state: MatchState, ctx: CueContext): Cue | null {
  const w = state.arena.width;
  const at = (id: CueId, x: number | null, pitch = 0): Cue => ({ id, pan: x === null ? 0 : panForX(x, w), pitch });
  const player = (p: number): number => state.players[p]?.pos.x ?? w / 2;
  const isRival = (team: TeamId): boolean => ctx.localTeam !== null && ctx.localTeam !== team;

  switch (ev.type) {
    case 'grab':
      return ctx.inFlight.has(ev.itemId) ? at('catch', player(ev.player)) : at('grab', player(ev.player));
    case 'drop':
      return at('drop', ev.tile === null ? player(ev.player) : tileX(state, ev.tile));
    case 'throw':
      return at('throw', player(ev.player));
    case 'dash':
      return at('dash', player(ev.player));
    case 'knock':
      return at('knock', player(ev.victim));
    case 'chopDone':
      return at('chopDone', tileX(state, ev.tile));
    case 'washDone':
      return at('washDone', tileX(state, ev.tile));
    case 'cookDone':
      return at('cookDone', tileX(state, ev.tile));
    case 'burnt':
      return at('burnt', tileX(state, ev.tile));
    case 'fireStart':
      return at('fireStart', tileX(state, ev.tile));
    case 'fireOut':
      return at('fireOut', tileX(state, ev.tile));
    case 'ticketSpawn':
      return ev.isCritic ? null : at('ticketSpawn', null);
    case 'ticketExpired':
      return at('ticketExpired', null);
    case 'delivered': {
      const x = teamSideX(state, ev.team);
      if (isRival(ev.team)) return at('deliverRival', x);
      // Each Heat tier lifts the sparkle a whole tone.
      return at('deliver', x, 2 * (state.teams[ev.team]?.heat ?? 0));
    }
    case 'serveRefused':
      return at('serveRefused', player(ev.player));
    case 'plateCold':
      return at('plateCold', itemX(state, ev.itemId));
    case 'heatChange': {
      const up = ev.heat > (ctx.prevHeat[ev.team] ?? 0);
      return at(up ? 'heatUp' : 'heatDown', teamSideX(state, ev.team), up ? 2 * ev.heat : 0);
    }
    case 'phaseChange':
      switch (ev.phase) {
        case 'prep':
          return at('prepBell', null);
        case 'service':
          return at('serviceBell', null);
        case 'rush':
          return at('rushFanfare', null);
        case 'lastCall':
          return at('lastCallBell', null);
        case 'roundOver': // the whistle comes from roundEnd, emitted on the same tick
        case 'matchOver': // the jingle comes from matchEnd
          return null;
      }
      return null;
    case 'roundEnd':
      return at('roundWhistle', null);
    case 'matchEnd': {
      const won = ev.winner !== null && (ctx.localTeam === null || ctx.localTeam === ev.winner);
      return at(won ? 'matchWin' : 'matchEnd', null);
    }
    case 'charmSpawned':
    case 'charmBanked':
    case 'charmFaded':
      return null;
  }
}

/**
 * All cues for one tick's events, de-duplicated: several identical cues on one tick
 * (e.g. 3 grabs) collapse into one, panned to their average position.
 */
export function cuesForEvents(events: readonly SimEvent[], state: MatchState, ctx: CueContext): Cue[] {
  const byId = new Map<CueId, { cue: Cue; n: number }>();
  for (const ev of events) {
    const cue = cueForEvent(ev, state, ctx);
    if (!cue) continue;
    const prev = byId.get(cue.id);
    if (!prev) byId.set(cue.id, { cue: { ...cue }, n: 1 });
    else {
      prev.cue.pan = (prev.cue.pan * prev.n + cue.pan) / (prev.n + 1);
      prev.cue.pitch = Math.max(prev.cue.pitch, cue.pitch);
      prev.n++;
    }
  }
  return [...byId.values()].map((v) => v.cue);
}
