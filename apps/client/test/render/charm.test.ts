import { describe, expect, it } from 'vitest';
import { ALL_CHARMS, INGREDIENTS, LEVEL_CHARMS, NIGHT_MARKET, RECIPES } from '@line-war/content';
import { createMatch, makeConfig, NO_INPUT, secondsToTicks, step, type CharmItem, type MatchInputs, type MatchState } from '@line-war/sim';
import { WorldRenderer } from '../../src/render/world';
import { charmBlink, charmPopScale, paintCharm } from '../../src/render/art/charm';
import { CHARM_ART_IDS } from '../../src/render/art/charmShapes';
import { eventsToEffects } from '../../src/render/effects';
import { charmSecondsLeft } from '../../src/render/format';
import { humanTeams, unlocksFromEvents } from '../../src/collection/store';
import { DEFAULT_SETTINGS } from '../../src/settings/types';
import { badNumbers, fakeCanvas, fakeContext, fakeFactory } from './fakeCanvas';

const IDLE = [NO_INPUT, NO_INPUT, NO_INPUT, NO_INPUT] as unknown as MatchInputs;

function charmMatch(): MatchState {
  const s = createMatch({ arena: NIGHT_MARKET, recipes: RECIPES, ingredients: INGREDIENTS, charms: LEVEL_CHARMS['night-market'], config: makeConfig({ seed: 5, prepSeconds: 1 }) });
  // Into service.
  for (let i = 0; i < secondsToTicks(s.config, 2); i++) step(s, IDLE);
  return s;
}

const charm = (s: MatchState, variant: string, since: number | null): CharmItem => ({ id: 80000 + s.floorItems.length, type: 'charm', variant, floorSinceTick: since });

describe('charm art', () => {
  it('has art for every content variant', () => {
    expect([...CHARM_ART_IDS].sort()).toEqual(ALL_CHARMS.map((c) => c.id).sort());
  });

  it('paints every variant (and its silhouette) with finite numbers', () => {
    for (const id of CHARM_ART_IDS) {
      for (const sil of [false, true]) {
        const { ctx, calls } = fakeContext();
        paintCharm(ctx, id, sil);
        expect(calls.length).toBeGreaterThan(40);
        expect(badNumbers(calls)).toEqual([]);
      }
    }
  });

  it('blinks faster and faster in the last 5 s, and only dims under reduced motion', () => {
    expect(charmBlink(12, 5, false)).toBe(1);
    const flips = (from: number, to: number) => {
      let n = 0;
      let prev = charmBlink(from, 5, false);
      for (let t = from; t > to; t -= 0.005) {
        const v = charmBlink(t, 5, false);
        if (v !== prev) n++;
        prev = v;
      }
      return n;
    };
    expect(flips(5, 4)).toBeLessThan(flips(1, 0));
    for (let t = 0; t <= 5; t += 0.25) {
      const v = charmBlink(t, 5, true);
      expect(v).toBeGreaterThan(0.4);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('pops in with an overshoot and settles at 1', () => {
    expect(charmPopScale(0)).toBe(0);
    expect(Math.max(...[100, 200, 300].map((t) => charmPopScale(t)))).toBeGreaterThan(1);
    expect(charmPopScale(420)).toBe(1);
    expect(charmPopScale(5000)).toBe(1);
  });
});

describe('charms in the world', () => {
  it('draws resting (fresh and nearly faded), carried and flying charms of every variant without NaN', () => {
    const s = charmMatch();
    const life = s.config.tuning.charmLifetimeSeconds;
    s.floorItems = [];
    CHARM_ART_IDS.forEach((id, i) => {
      const since = i % 2 ? s.tick : s.tick - secondsToTicks(s.config, life - 1.2);
      s.floorItems.push({ item: charm(s, id, since), pos: { x: 9.5 + (i % 3), y: 4.5 + Math.floor(i / 3) }, vel: { x: 0, y: 0 }, thrownBy: null, thrownAtTick: null, travelled: 0 });
    });
    s.floorItems.push({ item: charm(s, 'night-moon', null), pos: { x: 10, y: 9 }, vel: { x: 0.3, y: 0 }, thrownBy: 0, thrownAtTick: s.tick, travelled: 1.2 });
    s.players[0].holding = charm(s, 'harbor-lighthouse', null);
    s.players[3].holding = charm(s, 'rooftop-watering-can', null);
    s.players[3].facing = { x: 0, y: -1 }; // facing away: the charm still goes over the head
    const before = JSON.stringify(s);
    for (const reducedMotion of [false, true]) {
      for (const createCanvas of [null, fakeFactory().factory]) {
        let now = 1000;
        const { canvas, calls } = fakeCanvas();
        const r = new WorldRenderer(canvas, s, { now: () => now, autoResize: false, createCanvas, reducedMotion });
        for (let f = 0; f < 4; f++) {
          r.render(s, 0.5);
          now += 130;
        }
        expect(badNumbers(calls)).toEqual([]);
      }
    }
    expect(JSON.stringify(s)).toBe(before);
    expect(charmSecondsLeft(s, s.floorItems[0]!.item as CharmItem)).toBeCloseTo(1.2, 1);
    expect(charmSecondsLeft(s, s.players[0].holding as CharmItem)).toBe(life);
  });

  it('a real spawn, bank and fade play through the renderer without NaN', () => {
    const s = charmMatch();
    let now = 0;
    const { canvas, calls } = fakeCanvas();
    const r = new WorldRenderer(canvas, s, { now: () => now, autoResize: false, createCanvas: null });
    const seen = new Set<string>();
    const due = secondsToTicks(s.config, s.config.roundSeconds);
    for (let i = 0; i < due && seen.size < 3; i++) {
      step(s, IDLE);
      for (const e of s.events) if (e.type.startsWith('charm')) seen.add(e.type);
      // Whoever is idle near a fresh charm: hand the first one to P1 and walk it home.
      const fi = s.floorItems.find((f) => f.item.type === 'charm');
      if (fi && seen.has('charmFaded') && !s.players[0].holding) {
        s.floorItems = s.floorItems.filter((f) => f !== fi);
        s.players[0].holding = fi.item;
        s.players[0].pos = { x: 3.5, y: 8.5 };
      }
      r.onTick(s);
      now += 1000 / 30;
      if (i % 15 === 0) r.render(s, 0);
    }
    expect([...seen].sort()).toEqual(['charmBanked', 'charmFaded', 'charmSpawned']);
    expect(badNumbers(calls)).toEqual([]);
  });

  it('turns charm events into effects; a fade puffs where the charm was last seen', () => {
    const s = charmMatch();
    const fx = eventsToEffects(
      s,
      [
        { type: 'charmSpawned', itemId: 1, tile: 30, variant: 'night-moon' },
        { type: 'charmBanked', team: 0, player: 0, itemId: 2, variant: 'night-lantern' },
        { type: 'charmFaded', itemId: 3, variant: 'harbor-fish' },
        { type: 'charmFaded', itemId: 4, variant: 'harbor-fish' },
      ],
      0,
      (id) => (id === 3 ? { x: 10, y: 5 } : undefined),
    );
    expect(fx.map((e) => [e.kind, e.burst])).toEqual([
      ['charmPop', 'charm'],
      ['ring', 'charmBank'],
      ['charmPuff', 'charmPuff'],
    ]);
    expect(fx[2]!.pos).toEqual({ x: 10, y: 5 });
  });

  it('a bank by the human crew yields an unlock (event to unlock)', () => {
    const s = charmMatch();
    s.players[1].holding = charm(s, 'night-moon', null); // P2: a bot on P1's crew
    s.players[1].pos = { x: 3.5, y: 8.5 };
    s.players[2].holding = charm(s, 'night-noodle', null); // P3: the rival crew
    s.players[2].pos = { x: s.arena.width - 3.5, y: 8.5 };
    step(s, IDLE);
    expect(s.events.filter((e) => e.type === 'charmBanked')).toHaveLength(2);
    expect(unlocksFromEvents(s.events, humanTeams(DEFAULT_SETTINGS.slots))).toEqual(['night-moon']);
  });
});
