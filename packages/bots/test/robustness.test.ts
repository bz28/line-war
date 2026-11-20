/** Regression tests for review findings: reused brains, odd options, edge cases in the executor. */
import { describe, expect, it } from 'vitest';
import { newId, type FloorItem } from '@line-war/sim';
import { createBotsDebug, navFor } from '../src';
import { bot, runMatch, type Slots } from './harness';

const T = 120_000;

describe('reusing brains', () => {
  it('the same brains play a second match as well as fresh ones', () => {
    const slots: Slots = [bot('normal'), bot('normal'), bot('hard'), bot('easy')];
    const seeded = slots.map((s, i) => (s ? { ...s, seed: 7 * 31 + i } : null));
    const brains = createBotsDebug(seeded);
    const config = { bestOf: 1 as const };
    const first = runMatch({ seed: 7, slots, config, brains });
    const second = runMatch({ seed: 8, slots, config, brains });
    for (const s of [first, second]) {
      expect(s.matchOver).toBe(true);
      for (const i of [0, 1, 2, 3]) expect(s.maxIdleSeconds[i], `player ${i} idle`).toBeLessThanOrEqual(10);
      for (const team of [0, 1] as const) expect(s.rounds[0]!.delivered[team]).toBeGreaterThanOrEqual(10);
    }
  }, T);
});

describe('market play', () => {
  it('a hunting bot holds no kitchen claims (crewmates can take over its job)', () => {
    let huntTicks = 0;
    for (const seed of [1, 2, 3]) {
      const slots: Slots = [bot('hard'), bot('hard'), bot('hard'), bot('hard')];
      runMatch({
        seed,
        slots,
        config: { bestOf: 1 },
        onTick: (_state, _inputs, bots) => {
          for (const b of bots) {
            if (!b || b.hunting === null) continue;
            huntTicks++;
            expect(b.crew.claimsOf(b.id)).toEqual([]);
          }
        },
      });
    }
    expect(huntTicks).toBeGreaterThan(0);
  }, T);
});

describe('floor items in front of stations', () => {
  it('an empty-handed station grab never scoops up junk lying in front when another spot is clean', () => {
    let junkScoops = 0;
    let checks = 0;
    for (const seed of [1, 2]) {
      const slots: Slots = [bot('normal'), bot('normal'), bot('normal'), bot('normal')];
      const junk = new Set<number>();
      let seededRound = -1;
      runMatch({
        seed,
        slots,
        config: { bestOf: 1 },
        onTick: (state, inputs, bots) => {
          // At the start of service, drop a burnt tomato on one access tile of every station that has
          // more than one, just in front of where a player stands to use it.
          if (state.round.phase === 'service' && seededRound !== state.round.index) {
            seededRound = state.round.index;
            for (const team of [0, 1] as const) {
              const nav = navFor(state, team);
              for (const [, acc] of nav.access) {
                if (acc.length < 2) continue;
                const c = nav.center(acc[0]!.tile);
                const id = newId(state);
                junk.add(id);
                const fi: FloorItem = {
                  item: { id, type: 'ingredient', kind: 'tomato', state: 'burnt' },
                  pos: { x: c.x + acc[0]!.dir.x * 0.4, y: c.y + acc[0]!.dir.y * 0.4 },
                  vel: { x: 0, y: 0 },
                  thrownBy: null,
                  thrownAtTick: null,
                  travelled: 0,
                };
                state.floorItems.push(fi);
              }
            }
          }
          for (const b of bots) {
            if (!b || !inputs[b.id].grab || !b.actKey.startsWith('use:') || state.players[b.id].holding) continue;
            checks++;
            // What would this grab take? Nearest resting floor item in front within reach (RULES §2).
            const me = state.players[b.id];
            let best: number | null = null;
            let bestD = Infinity;
            for (const fi of state.floorItems) {
              const dx = fi.pos.x - me.pos.x;
              const dy = fi.pos.y - me.pos.y;
              const d = Math.hypot(dx, dy);
              if (fi.vel.x || fi.vel.y || d > state.config.tuning.interactReach || d >= bestD || dx * me.facing.x + dy * me.facing.y < 0) continue;
              best = fi.item.id;
              bestD = d;
            }
            if (best !== null && junk.has(best)) junkScoops++;
          }
        },
      });
    }
    expect(checks).toBeGreaterThan(100);
    expect(junkScoops).toBe(0);
  }, T);
});
