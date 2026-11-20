import { describe, expect, it } from 'vitest';
import type { SimEvent } from '@line-war/sim';
import { CUES, cueForEvent, cuesForEvents, EVENT_HANDLING, type CueContext } from '../../src/audio/cues';
import { RECIPES } from '../../src/audio/synth';
import { match, station } from './helpers';

type Sample = { [K in SimEvent['type']]: Extract<SimEvent, { type: K }> };

/** One example of every SimEvent type. Adding an event type to the sim breaks this (typecheck) until it is handled. */
const SAMPLES: Sample = {
  grab: { type: 'grab', player: 0, itemId: 1 },
  drop: { type: 'drop', player: 0, itemId: 1, tile: null },
  throw: { type: 'throw', player: 0, itemId: 1 },
  dash: { type: 'dash', player: 0 },
  knock: { type: 'knock', by: 0, victim: 2, itemId: 1 },
  chopDone: { type: 'chopDone', tile: 0 },
  washDone: { type: 'washDone', tile: 0 },
  cookDone: { type: 'cookDone', tile: 0 },
  burnt: { type: 'burnt', tile: 0 },
  fireStart: { type: 'fireStart', tile: 0 },
  fireOut: { type: 'fireOut', tile: 0 },
  ticketSpawn: { type: 'ticketSpawn', ticketId: 1, recipe: 'salad', isCritic: false },
  ticketExpired: { type: 'ticketExpired', ticketId: 1 },
  delivered: { type: 'delivered', team: 0, ticketId: 1, recipe: 'salad', points: 50 },
  serveRefused: { type: 'serveRefused', player: 0 },
  plateCold: { type: 'plateCold', itemId: 1 },
  heatChange: { type: 'heatChange', team: 0, heat: 1 },
  phaseChange: { type: 'phaseChange', phase: 'rush' },
  roundEnd: { type: 'roundEnd', winner: 0, scores: [10, 5] },
  matchEnd: { type: 'matchEnd', winner: 0 },
  charmSpawned: { type: 'charmSpawned', itemId: 1, tile: 0, variant: 'night-lantern' },
  charmBanked: { type: 'charmBanked', team: 0, player: 0, itemId: 1, variant: 'night-lantern' },
  charmFaded: { type: 'charmFaded', itemId: 1, variant: 'night-lantern' },
};

const ctx = (over: Partial<CueContext> = {}): CueContext => ({ localTeam: 0, prevHeat: [0, 0], inFlight: new Set(), ...over });

describe('event to cue mapping', () => {
  it('handles every SimEvent type: mapped ones make a sound, ignored ones do not', () => {
    const s = match();
    expect(Object.keys(EVENT_HANDLING).sort()).toEqual(Object.keys(SAMPLES).sort());
    for (const [type, how] of Object.entries(EVENT_HANDLING)) {
      const cue = cueForEvent(SAMPLES[type as SimEvent['type']], s, ctx());
      if (how === 'mapped') expect(cue, type).not.toBeNull();
      else expect(cue, type).toBeNull();
    }
  });

  it('every cue has a mix spec and a synth recipe', () => {
    expect(Object.keys(RECIPES).sort()).toEqual(Object.keys(CUES).sort());
  });

  it('phases: prep bell, service bell, Rush fanfare, Last Call bell; round/match over come from roundEnd/matchEnd', () => {
    const s = match();
    const phase = (phase: 'prep' | 'service' | 'rush' | 'lastCall' | 'roundOver' | 'matchOver') => cueForEvent({ type: 'phaseChange', phase }, s, ctx())?.id ?? null;
    expect([phase('prep'), phase('service'), phase('rush'), phase('lastCall'), phase('roundOver'), phase('matchOver')]).toEqual([
      'prepBell', 'serviceBell', 'rushFanfare', 'lastCallBell', null, null,
    ]);
    expect(cueForEvent(SAMPLES.roundEnd, s, ctx())?.id).toBe('roundWhistle');
  });

  it('a grab of an item that was in flight is a catch', () => {
    const s = match();
    expect(cueForEvent(SAMPLES.grab, s, ctx())?.id).toBe('grab');
    expect(cueForEvent(SAMPLES.grab, s, ctx({ inFlight: new Set([1]) }))?.id).toBe('catch');
  });

  it('own serves sparkle (higher with Heat); rival serves get the duller cue', () => {
    const s = match();
    s.teams[0].heat = 2;
    expect(cueForEvent(SAMPLES.delivered, s, ctx())).toMatchObject({ id: 'deliver', pitch: 4 });
    expect(cueForEvent({ ...SAMPLES.delivered, team: 1 }, s, ctx())?.id).toBe('deliverRival');
    // Both crews local: nobody is the rival.
    expect(cueForEvent({ ...SAMPLES.delivered, team: 1 }, s, ctx({ localTeam: null }))?.id).toBe('deliver');
  });

  it('heat up roars, heat down fizzles', () => {
    const s = match();
    expect(cueForEvent({ type: 'heatChange', team: 0, heat: 2 }, s, ctx({ prevHeat: [1, 0] }))?.id).toBe('heatUp');
    expect(cueForEvent({ type: 'heatChange', team: 0, heat: 0 }, s, ctx({ prevHeat: [1, 0] }))?.id).toBe('heatDown');
  });

  it('Critic spawns are left to criticAnnouncements; normal tickets flutter', () => {
    const s = match();
    expect(cueForEvent({ ...SAMPLES.ticketSpawn, isCritic: true }, s, ctx())).toBeNull();
    expect(cueForEvent(SAMPLES.ticketSpawn, s, ctx())?.id).toBe('ticketSpawn');
  });

  it('match end: a jingle for the winner side, a gentler one otherwise', () => {
    const s = match();
    expect(cueForEvent({ type: 'matchEnd', winner: 0 }, s, ctx())?.id).toBe('matchWin');
    expect(cueForEvent({ type: 'matchEnd', winner: 1 }, s, ctx())?.id).toBe('matchEnd');
    expect(cueForEvent({ type: 'matchEnd', winner: null }, s, ctx())?.id).toBe('matchEnd');
  });

  it('pans by world x: left kitchen left, right kitchen right, tickets centred', () => {
    const s = match();
    const left = station(s, 'board', { side: 'left' }).tile;
    const right = station(s, 'board', { side: 'right' }).tile;
    expect(cueForEvent({ type: 'chopDone', tile: left }, s, ctx())!.pan).toBeLessThan(-0.2);
    expect(cueForEvent({ type: 'chopDone', tile: right }, s, ctx())!.pan).toBeGreaterThan(0.2);
    expect(cueForEvent({ ...SAMPLES.delivered, team: 1 }, s, ctx())!.pan).toBeGreaterThan(0.2);
    expect(cueForEvent(SAMPLES.ticketExpired, s, ctx())!.pan).toBe(0);
    s.round.swapped = true;
    expect(cueForEvent({ ...SAMPLES.delivered, team: 1 }, s, ctx())!.pan).toBeLessThan(-0.2);
  });

  it('collapses identical cues on one tick into one', () => {
    const s = match();
    const cues = cuesForEvents([SAMPLES.grab, { ...SAMPLES.grab, player: 2 }, SAMPLES.grab, SAMPLES.dash], s, ctx());
    expect(cues.map((c) => c.id).sort()).toEqual(['dash', 'grab']);
  });
});
