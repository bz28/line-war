/** Audit regressions: a rival walling in a doorway, plates in the sink. */
import { describe, expect, it } from 'vitest';
import { levelById } from '@line-war/content';
import { createMatch, makeConfig, NO_INPUT, step, type MatchInputs, type MatchState } from '@line-war/sim';
import { createBotsDebug } from '../src';
import { kitchenFor } from '../src/world';
import { bot, newMatch } from './harness';

const T = 120_000;

function harbor(seed: number): MatchState {
  const lv = levelById('harbor-pier');
  return createMatch({ arena: lv.arena, recipes: lv.recipes, ingredients: lv.ingredients, charms: lv.charms, charmsPerRound: lv.charmsPerRound, config: makeConfig({ seed, bestOf: 1, roundSeconds: 120 }) });
}

describe('a rival standing in the doorway (Harbor Pier)', () => {
  it('the crew notices, drops market / premium / charm jobs, cooks from the pantries, and goes back out once it clears', () => {
    const state = harbor(3);
    const { brains, bots } = createBotsDebug([null, null, { ...bot('normal'), seed: 5 }, { ...bot('normal'), seed: 6 }]);
    const crew = bots[2]!.crew;
    const doors = kitchenFor(state, 1).doorTiles.map((t) => ({ x: (t % state.arena.width) + 0.5, y: Math.floor(t / state.arena.width) + 0.5 }));
    expect(doors).toHaveLength(2);
    // Stand on the seam between the two doorway tiles: touching both lanes.
    const seam = { x: doors[0]!.x, y: (doors[0]!.y + doors[1]!.y) / 2 };
    const rate = state.config.tuning.tickRate;
    const releaseAt = 90 * rate; // round tick at which the blocker walks away
    let blockedTicks = 0;
    let premiumWhileBlocked = 0;
    let servedWhileBlocked = 0;
    let unblockedAgainAt = -1;
    while (state.round.phase !== 'matchOver' && state.round.phase !== 'roundOver') {
      const playing = state.round.phase !== 'prep';
      const blocking = playing && state.round.tick < releaseAt;
      state.players[0].pos = blocking ? { ...seam } : { x: 3.5, y: 9.5 };
      const inputs = [0, 1, 2, 3].map((i) => brains[i]?.decide(state, i as 0 | 1 | 2 | 3) ?? NO_INPUT) as MatchInputs;
      step(state, inputs);
      if (crew.doorBlocked) {
        blockedTicks++;
        if (crew.orders.some((o) => o.recipe.premium)) premiumWhileBlocked++;
        servedWhileBlocked += state.events.filter((e) => e.type === 'delivered' && e.team === 1).length;
      }
      if (state.round.tick >= releaseAt && unblockedAgainAt < 0 && !crew.doorBlocked) unblockedAgainAt = state.round.tick;
    }
    // Blocked from soon after service starts (3 s to notice) until it clears.
    expect(blockedTicks / rate).toBeGreaterThan(60);
    // A premium dish already started may be finished, but none is planned while blocked.
    expect(premiumWhileBlocked / rate).toBeLessThan(5);
    expect(servedWhileBlocked).toBeGreaterThanOrEqual(4);
    expect(unblockedAgainAt).toBeGreaterThan(0);
    expect((unblockedAgainAt - releaseAt) / rate).toBeLessThanOrEqual(3);
  }, T);

  it('one rival in a doorway of a two-door kitchen is not a blockade (Rooftop Garden)', () => {
    const lv = levelById('rooftop-garden');
    const state = createMatch({ arena: lv.arena, recipes: lv.recipes, ingredients: lv.ingredients, config: makeConfig({ seed: 2, bestOf: 1 }) });
    const { brains, bots } = createBotsDebug([null, null, { ...bot('normal'), seed: 5 }, null]);
    const door = kitchenFor(state, 1).doorTiles[0]!;
    const at = { x: (door % state.arena.width) + 0.5, y: Math.floor(door / state.arena.width) + 0.5 };
    for (let i = 0; i < 30 * 30; i++) {
      state.players[0].pos = { ...at };
      step(state, [0, 1, 2, 3].map((p) => brains[p]?.decide(state, p as 0 | 1 | 2 | 3) ?? NO_INPUT) as MatchInputs);
      expect(bots[2]!.crew.doorBlocked).toBe(false);
    }
  });
});
