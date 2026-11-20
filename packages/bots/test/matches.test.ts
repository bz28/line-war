import { RECIPES } from '@line-war/content';
import { describe, expect, it } from 'vitest';
import { step, type MatchInputs, type PlayerId } from '@line-war/sim';
import { createBots } from '../src';
import { bot, newMatch, runMatch, summarize, type MatchStats, type Slots } from './harness';

const SEEDS_2V2 = [1, 2, 3, 4];
const T = 120_000;

const botSlots = (slots: Slots): number[] => slots.map((s, i) => (s ? i : -1)).filter((i) => i >= 0);

function expectNotStuck(s: MatchStats, slots: Slots): void {
  for (const i of botSlots(slots)) expect(s.maxIdleSeconds[i], `player ${i} idle`).toBeLessThanOrEqual(10);
}

describe('solo bot vs idle (1v1)', () => {
  it('cooks and serves every recipe across a few seeded matches', () => {
    const served: Record<string, number> = {};
    for (const seed of [1, 2, 3]) {
      const slots: Slots = [bot('normal'), null, null, null];
      const s = runMatch({ seed, slots });
      expect(s.matchOver).toBe(true);
      expect(s.winner).toBe(0);
      expectNotStuck(s, slots);
      for (const r of s.rounds) for (const [k, v] of Object.entries(r.byRecipe[0])) served[k] = (served[k] ?? 0) + v;
    }
    console.log('solo served by recipe', served);
    for (const r of RECIPES) expect(served[r.id] ?? 0, r.id).toBeGreaterThanOrEqual(1);
  }, T);
});

describe('full bot matches', () => {
  it('2v2 normal: matches finish, nobody gets stuck, crews serve a sensible number of dishes', () => {
    const lines: string[] = [];
    for (const seed of SEEDS_2V2) {
      const slots: Slots = [bot('normal'), bot('normal'), bot('normal'), bot('normal')];
      const s = runMatch({ seed, slots });
      lines.push(`seed ${seed}\n${summarize(s)}`);
      expect(s.matchOver).toBe(true);
      expectNotStuck(s, slots);
      for (const r of s.rounds) {
        for (const team of [0, 1] as const) {
          expect(r.delivered[team]).toBeGreaterThanOrEqual(10);
          expect(r.delivered[team]).toBeLessThanOrEqual(40);
          expect(r.scores[team]).toBeGreaterThan(0);
        }
      }
    }
    console.log(lines.join('\n'));
  }, T);

  it('1v1, mixed difficulty and a human-held (idle) slot all play without getting stuck', () => {
    const cases: Slots[] = [
      [bot('hard'), null, bot('easy'), null],
      [bot('easy'), bot('hard'), bot('normal'), null],
      [null, bot('normal'), bot('hard'), bot('hard')],
    ];
    cases.forEach((slots, i) => {
      const s = runMatch({ seed: 10 + i, slots, config: { bestOf: 1 } });
      expect(s.matchOver).toBe(true);
      expectNotStuck(s, slots);
      for (const team of [0, 1] as const) expect(s.rounds[0]!.delivered[team]).toBeGreaterThanOrEqual(5);
    });
  }, T);

  it('knocks happen at normal and hard difficulty', () => {
    let knocks = 0;
    for (const d of ['normal', 'hard'] as const) {
      for (const seed of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
        const s = runMatch({ seed, slots: [bot(d), bot(d), bot(d), bot(d)], config: { bestOf: 1 } });
        knocks += s.rounds.reduce((n, r) => n + r.knocks[0] + r.knocks[1], 0);
      }
    }
    console.log('knocks in 20 normal/hard rounds:', knocks);
    expect(knocks).toBeGreaterThan(0);
  }, T);

  it('plays other match settings (Brunch Speed, no rush, no prep) without getting stuck', () => {
    const slots: Slots = [bot('normal'), bot('normal'), bot('hard'), bot('easy')];
    const configs = [{ brunchSpeed: true }, { rushEnabled: false, criticEnabled: false }, { prepSeconds: 0, roundSeconds: 120 }];
    configs.forEach((config, i) => {
      const s = runMatch({ seed: 20 + i, slots, config: { bestOf: 1, ...config } });
      expect(s.matchOver).toBe(true);
      expectNotStuck(s, slots);
      for (const team of [0, 1] as const) expect(s.rounds[0]!.delivered[team]).toBeGreaterThanOrEqual(4);
    });
  }, T);

  it('never mutates the match state it is shown', () => {
    const { brains, state } = { brains: createBots([bot('hard'), bot('normal'), bot('normal'), bot('easy')]), state: newMatch(5, { prepSeconds: 2 }) };
    for (let t = 0; t < 1500; t++) {
      const before = JSON.stringify(state);
      const inputs = brains.map((b, i) => b!.decide(state, i as PlayerId)) as MatchInputs;
      expect(JSON.stringify(state)).toBe(before);
      step(state, inputs);
    }
  }, T);

  it('is deterministic: same seeds give identical final state', () => {
    const slots: Slots = [bot('normal'), bot('hard'), bot('easy'), bot('normal', 0.75)];
    const a = runMatch({ seed: 42, slots, config: { bestOf: 1 } });
    const b = runMatch({ seed: 42, slots, config: { bestOf: 1 } });
    expect(JSON.stringify(b.final)).toBe(JSON.stringify(a.final));
    const c = runMatch({ seed: 43, slots, config: { bestOf: 1 } });
    expect(JSON.stringify(c.final)).not.toBe(JSON.stringify(a.final));
  }, T);
});

describe('skill', () => {
  it('points per round rise with skill (0.3 < 0.6 < 0.9) against a fixed 0.6 crew', () => {
    // Same seeds for every skill (paired), so the ticket sequence noise cancels out.
    const seeds = Array.from({ length: 40 }, (_, i) => 100 + i);
    const levels = [0.3, 0.6, 0.9];
    const pts = levels.map((skill) =>
      seeds.map((seed) => runMatch({ seed, slots: [bot('normal', skill), bot('normal', skill), bot('normal'), bot('normal')], config: { bestOf: 1 } }).rounds[0]!.scores[0]),
    );
    const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;
    console.log('skill → points/round', levels.map((l, i) => `${l}: ${mean(pts[i]!).toFixed(0)}`).join(', '));
    for (let i = 1; i < levels.length; i++) {
      const diff = pts[i]!.map((p, j) => p - pts[i - 1]![j]!);
      const m = mean(diff);
      const se = Math.sqrt(diff.reduce((a, b) => a + (b - m) ** 2, 0) / (diff.length - 1) / diff.length);
      console.log(`  ${levels[i - 1]} → ${levels[i]}: +${m.toFixed(0)} ± ${se.toFixed(0)} (paired)`);
      expect(m).toBeGreaterThan(2 * se);
    }
  }, T);
});

describe('performance', () => {
  it('stays well under the per-tick budget for a 4-bot match', () => {
    const s = runMatch({ seed: 7, slots: [bot('hard'), bot('normal'), bot('normal'), bot('easy')], config: { bestOf: 1 } });
    console.log(`bot decide: ${s.usPerBotTick.toFixed(2)} µs per bot per tick (${s.ticks} ticks)`);
    // Budget is 20 µs; leave headroom for slow CI machines.
    expect(s.usPerBotTick).toBeLessThan(60);
  }, T);
});
