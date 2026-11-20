/** Regression tests for review findings: reused brains, odd options, edge cases in the executor. */
import { describe, expect, it } from 'vitest';
import { createBotsDebug } from '../src';
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
