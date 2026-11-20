import { LEVELS } from '@line-war/content';
import { createMatch, makeConfig, NO_INPUT, step, type MatchInputs, type MatchState, type PlayerId } from '@line-war/sim';
import { describe, expect, it } from 'vitest';
import { createBotsDebug, type BotOptions } from '../src';

const T = 120_000;
const N: BotOptions = { difficulty: 'normal' };

interface CharmRun {
  state: MatchState;
  spawned: number;
  banked: [number, number];
  /** Knocks whose popped item was a charm, by the knocker's team. */
  charmKnocks: [number, number];
  /** Most crewmates of one team chasing the same resting charm at once (task key 'charm'). */
  maxChasers: number;
}

function run(levelId: string, seed: number, slots: (BotOptions | null)[], bestOf = 1): CharmRun {
  const level = LEVELS.find((l) => l.id === levelId)!;
  const state = createMatch({ arena: level.arena, recipes: level.recipes, ingredients: level.ingredients, charms: level.charms, config: makeConfig({ seed, bestOf }) });
  const { brains, bots } = createBotsDebug(slots.map((s, i) => (s ? { ...s, seed: seed * 31 + i } : null)));
  const out: CharmRun = { state, spawned: 0, banked: [0, 0], charmKnocks: [0, 0], maxChasers: 0 };
  while (state.round.phase !== 'matchOver' && state.tick < 40_000) {
    const inputs = [0, 1, 2, 3].map((i) => brains[i]?.decide(state, i as PlayerId) ?? NO_INPUT) as MatchInputs;
    step(state, inputs);
    for (const ev of state.events) {
      if (ev.type === 'charmSpawned') out.spawned++;
      if (ev.type === 'charmBanked') out.banked[ev.team]++;
      if (ev.type === 'knock' && state.floorItems.some((f) => f.item.id === ev.itemId && f.item.type === 'charm')) out.charmKnocks[ev.by < 2 ? 0 : 1]++;
    }
    for (const team of [0, 1]) {
      const chasers = bots.filter((b, i) => b && (i < 2 ? 0 : 1) === team && b.taskKey === 'charm').length;
      out.maxChasers = Math.max(out.maxChasers, chasers);
    }
  }
  return out;
}

describe('bots and charms (RULES §10)', () => {
  it('a lone crew fetches and banks charms, one crewmate at a time', () => {
    let spawned = 0;
    let banked = 0;
    for (const level of LEVELS) {
      const r = run(level.id, 3, [N, N, null, null]);
      expect(r.spawned, level.id).toBe(r.state.config.tuning.charmsPerRound);
      expect(r.banked[0], level.id).toBeGreaterThan(0);
      expect(r.maxChasers, level.id).toBeLessThanOrEqual(1);
      spawned += r.spawned;
      banked += r.banked[0];
    }
    // A busy crew may let one fade during Dinner Rush; most get banked.
    expect(banked / spawned).toBeGreaterThanOrEqual(0.75);
  }, T);

  it('2v2: both crews bank charms on every level, and knock rival charm carriers', () => {
    let knocks = 0;
    for (const level of LEVELS) {
      const total = { banked: [0, 0], knocks: [0, 0] };
      for (const seed of [1, 2, 3]) {
        const r = run(level.id, seed, [N, N, N, N]);
        expect(r.state.round.phase).toBe('matchOver');
        expect(r.maxChasers).toBeLessThanOrEqual(1);
        for (const t of [0, 1]) {
          total.banked[t]! += r.banked[t]!;
          total.knocks[t]! += r.charmKnocks[t]!;
        }
      }
      console.log(level.id, 'charms banked', total.banked, 'charm knocks', total.knocks);
      expect(total.banked[0], level.id).toBeGreaterThan(0);
      expect(total.banked[1], level.id).toBeGreaterThan(0);
      knocks += total.knocks[0]! + total.knocks[1]!;
    }
    expect(knocks).toBeGreaterThan(0);
  }, T);
});
