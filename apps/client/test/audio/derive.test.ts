import { describe, expect, it } from 'vitest';
import { vesselTimeline } from '@line-war/sim';
import {
  burnBeepInterval,
  burnWarnings,
  criticAnnouncements,
  inFlightIds,
  loopTargets,
  workHits,
  CHOP_KNOCK_SECONDS,
} from '../../src/audio/derive';
import { match, nearlyBurnt, station } from './helpers';

describe('burn warning', () => {
  it('fires only inside the last 2 s before a done pan burns, with rising urgency', () => {
    const s = match();
    const rate = s.config.tuning.tickRate;
    const pan = station(s, 'stove', { vessel: 'pan', side: 'left' });
    nearlyBurnt(s, pan, 2 * rate + 1);
    expect(burnWarnings(s)).toEqual([]);
    nearlyBurnt(s, pan, 2 * rate);
    const early = burnWarnings(s);
    expect(early).toHaveLength(1);
    expect(early[0]).toMatchObject({ tile: pan.tile, next: 'burnt', remainingTicks: 2 * rate });
    expect(early[0]!.urgency).toBeCloseTo(0);
    expect(early[0]!.pan).toBeLessThan(0);
    nearlyBurnt(s, pan, 3);
    expect(burnWarnings(s)[0]!.urgency).toBeGreaterThan(0.9);
  });

  it('also warns before a burnt vessel catches fire, and never while still cooking', () => {
    const s = match();
    const pot = station(s, 'stove', { vessel: 'pot' });
    const v = pot.vessel!;
    v.status = 'cooking';
    v.cookTicks = vesselTimeline(s, 'pot').done - 5;
    expect(burnWarnings(s)).toEqual([]);
    v.status = 'burnt';
    v.cookTicks = vesselTimeline(s, 'pot').fire - 10;
    expect(burnWarnings(s)).toMatchObject([{ tile: pot.tile, next: 'fire', remainingTicks: 10 }]);
  });

  it('beeps faster as urgency rises', () => {
    expect(burnBeepInterval(0, 30)).toBeGreaterThan(burnBeepInterval(0.5, 30));
    expect(burnBeepInterval(0.5, 30)).toBeGreaterThan(burnBeepInterval(1, 30));
    expect(burnBeepInterval(1, 30)).toBeGreaterThanOrEqual(1);
  });
});

describe('loops', () => {
  it('sizzle while a pan cooks, bubble for pots, crackle for fires; silent otherwise', () => {
    const s = match();
    expect(loopTargets(s)).toMatchObject({ sizzle: { level: 0 }, bubble: { level: 0 }, fire: { level: 0 } });
    const pan = station(s, 'stove', { vessel: 'pan', side: 'right' });
    pan.vessel!.status = 'cooking';
    s.fires.push({ tile: pan.tile, spreadAtTick: 999, extinguishTicks: 0 });
    const t = loopTargets(s);
    expect(t.sizzle.level).toBeGreaterThan(0);
    expect(t.sizzle.pan).toBeGreaterThan(0);
    expect(t.fire.level).toBeGreaterThan(0);
    expect(t.bubble.level).toBe(0);
    s.round.phase = 'roundOver';
    expect(loopTargets(s).sizzle.level).toBe(0);
  });

  it('more pans are louder, but sub-linearly and never above 1', () => {
    const s = match();
    const pans = Object.values(s.stations).filter((x) => x.vessel?.kind === 'pan');
    const levels: number[] = [];
    for (const p of pans) {
      p.vessel!.status = 'cooking';
      levels.push(loopTargets(s).sizzle.level);
    }
    for (let i = 1; i < levels.length; i++) expect(levels[i]).toBeGreaterThan(levels[i - 1]!);
    expect(levels[levels.length - 1]).toBeLessThanOrEqual(1);
  });
});

describe('work rhythm', () => {
  it('knocks on the first chop tick and then every CHOP_KNOCK_SECONDS, and not when idle', () => {
    const s = match();
    const board = station(s, 'board');
    const prev = new Map<number, number>();
    const every = Math.round(CHOP_KNOCK_SECONDS * s.config.tuning.tickRate);
    const knocks: number[] = [];
    for (let t = 1; t <= every * 3; t++) {
      board.workTicks = t;
      if (workHits(s, prev).some((h) => h.kind === 'chop')) knocks.push(t);
    }
    expect(knocks).toEqual([1, 1 + every, 1 + 2 * every]);
    // Progress paused on a beat tick: no repeated knocks.
    board.workTicks = 1 + every;
    workHits(s, prev);
    expect(workHits(s, prev)).toEqual([]);
  });
});

describe('catches and the Critic', () => {
  it('tracks thrown items in the air only', () => {
    const s = match();
    const item = { id: 42, type: 'ingredient', kind: 'tomato', state: 'raw' } as const;
    s.floorItems.push({ item: { ...item }, pos: { x: 3, y: 3 }, vel: { x: 5, y: 0 }, thrownBy: 0, thrownAtTick: 0, travelled: 0 });
    s.floorItems.push({ item: { ...item, id: 43 }, pos: { x: 3, y: 3 }, vel: { x: 0, y: 0 }, thrownBy: 0, thrownAtTick: 0, travelled: 2 });
    expect([...inFlightIds(s)]).toEqual([42]);
  });

  it('announces a Critic once, and only once it is visible to the local crew', () => {
    const s = match();
    const announced = new Set<number>();
    s.tickets.push({ id: 7, recipe: 'x', spawnTick: 0, expireTick: 999, baseValue: 1, isCritic: true, visibleTo: 1, revealAllAtTick: 90 });
    expect(criticAnnouncements(s, 0, announced)).toEqual([]);
    expect(criticAnnouncements(s, 1, new Set())).toEqual([7]);
    s.tickets[0]!.visibleTo = null;
    expect(criticAnnouncements(s, 0, announced)).toEqual([7]);
    expect(criticAnnouncements(s, 0, announced)).toEqual([]);
    s.tickets = [];
    criticAnnouncements(s, 0, announced);
    expect(announced.size).toBe(0);
  });
});
