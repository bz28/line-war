/** Runner smoke tests (idle bots from @line-war/bots) and determinism (scripted test bots). */
import { fileURLToPath } from 'node:url';
import { idleBot, type BotOptions } from '@line-war/bots';
import { DEFAULT_MATCH_CONFIG, DEFAULT_TUNING } from '@line-war/sim';
import { describe, expect, it } from 'vitest';
import { MatchPool } from '../src/pool';
import { buildConfig, longestMatchTicks, runMatch } from '../src/runner';
import type { MatchSpec } from '../src/types';
import { createBots as scripted } from './scriptedBot';

const N = { difficulty: 'normal' } as const;
const SCRIPTED = fileURLToPath(new URL('./scriptedBot.ts', import.meta.url));
const short = { roundSeconds: 60, bestOf: 1 };
/** Bots that never act (the real ones in @line-war/bots now play), for the runner smoke test. */
const idle = (slots: readonly (BotOptions | null)[]) => slots.map((s) => (s ? idleBot : null));

describe('runner smoke test (idle bots)', () => {
  const rec = runMatch({ seed: 7, slots: [N, N, N, N], createBots: idle });
  const prepEndTick = DEFAULT_MATCH_CONFIG.prepSeconds * DEFAULT_TUNING.tickRate;

  it('plays a full best-of-3 to a draw', () => {
    expect(rec.runaway).toBe(false);
    expect(rec.winner).toBeNull();
    expect(rec.rounds).toHaveLength(3);
    expect(rec.rounds.every((r) => r.winner === null && r.scores[0] === 0 && r.scores[1] === 0)).toBe(true);
    expect(rec.totalScores).toEqual([0, 0]);
    expect(rec.ticks).toBeLessThanOrEqual(longestMatchTicks(buildConfig(7)));
  });

  it('tickets spawn and expire unserved; per-second timeline covers the round', () => {
    const r = rec.rounds[0]!;
    const t = Object.values(r.tickets);
    expect(t.reduce((a, c) => a + c.spawned, 0)).toBeGreaterThan(0);
    expect(t.reduce((a, c) => a + c.served, 0)).toBe(0);
    expect(r.timeline.a.length).toBeGreaterThanOrEqual(DEFAULT_MATCH_CONFIG.roundSeconds - 1);
  });

  it('does not flag idle players during prep (no tickets), but does once tickets are up', () => {
    const firstRound = rec.stuck.filter((s) => s.round === 0);
    expect(firstRound.every((s) => s.tick >= prepEndTick + 10 * DEFAULT_TUNING.tickRate)).toBe(true);
    // Idle bots really are stuck once service starts: the detector must see that.
    expect(firstRound.map((s) => s.player).sort()).toEqual([0, 1, 2, 3]);
  });

  it('never checks empty slots', () => {
    const r = runMatch({ seed: 7, slots: [N, null, null, null], config: short, createBots: idle });
    expect(new Set(r.stuck.map((s) => s.player))).toEqual(new Set([0]));
  });

  it('flags runaway matches at maxTicks', () => {
    const r = runMatch({ seed: 7, slots: [null, null, null, null], maxTicks: 100 });
    expect(r.runaway).toBe(true);
    expect(r.ticks).toBe(100);
  });
});

describe('determinism', () => {
  it('same seed gives the same MatchRecord; a different seed does not', () => {
    const opts = { seed: 42, slots: [N, N, N, N], config: short, createBots: scripted };
    const a = runMatch(opts);
    const b = runMatch(opts);
    expect(JSON.stringify(b)).toBe(JSON.stringify(a));
    expect(a.rounds[0]!.served[0] + a.rounds[0]!.served[1]).toBeGreaterThan(0); // the scripted bots really play
    expect(JSON.stringify(runMatch({ ...opts, seed: 43 }))).not.toBe(JSON.stringify(a));
  });

  it('results do not depend on the worker count', async () => {
    const specs: MatchSpec[] = [1, 2, 3, 4, 5].map((seed) => ({
      arena: 'night-market',
      seed,
      slots: [N, N, N, null],
      config: short,
      botsModule: SCRIPTED,
    }));
    const inProcess = new MatchPool(0);
    const two = new MatchPool(2);
    const three = new MatchPool(3);
    try {
      const [a, b, c] = await Promise.all([inProcess.run(specs), two.run(specs), three.run(specs)]);
      expect(JSON.stringify(b)).toBe(JSON.stringify(a));
      expect(JSON.stringify(c)).toBe(JSON.stringify(a));
    } finally {
      await Promise.all([inProcess.close(), two.close(), three.close()]);
    }
  }, 60_000);
});
