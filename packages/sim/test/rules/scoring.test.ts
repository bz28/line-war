import { describe, expect, it } from 'vitest';
import type { MatchState } from '../../src';
import { freshness, registerCleanDelivery, registerMistake, scoreDelivery } from '../../src/systems/scoring';
import { addTicket, newRulesMatch, ofType, plate, SALAD, SALAD_FOOD, stepToRoundTick, type ConfigOverrides } from './helpers';

function atRoundTick(roundTick: number, overrides: ConfigOverrides = {}): MatchState {
  const s = newRulesMatch({ criticEnabled: false, ...overrides });
  stepToRoundTick(s, roundTick);
  s.tickets = [];
  s.events = [];
  return s;
}

describe('freshness', () => {
  it('decays linearly from 1 to freshnessFloor over the ticket lifetime', () => {
    const s = atRoundTick(20 * 30);
    const life = 60 * 30;
    const at = (age: number) => freshness(s, addTicket(s, SALAD, { spawnTick: s.tick - age, expireTick: s.tick - age + life }));
    expect(at(0)).toBe(1);
    expect(at(life / 4)).toBeCloseTo(0.875);
    expect(at(life / 2)).toBeCloseTo(0.75);
    expect(at(life)).toBeCloseTo(0.5);
    expect(at(life * 2)).toBeCloseTo(0.5);
  });

  it('respects a custom freshnessFloor', () => {
    const s = atRoundTick(20 * 30, { tuning: { freshnessFloor: 0.2 } });
    const t = addTicket(s, SALAD, { spawnTick: s.tick - 900, expireTick: s.tick + 900 });
    expect(freshness(s, t)).toBeCloseTo(0.6);
    expect(scoreDelivery(s, 0, t, plate(s, SALAD_FOOD))).toBe(24);
  });
});

describe('scoreDelivery multipliers', () => {
  it('applies each heat multiplier', () => {
    const s = atRoundTick(20 * 30);
    const t = addTicket(s, SALAD);
    const pts = [0, 1, 2, 3].map((h) => {
      s.teams[0].heat = h;
      return scoreDelivery(s, 0, t, plate(s, SALAD_FOOD));
    });
    expect(pts).toEqual([40, 50, 60, 80]);
  });

  it('applies the rush multiplier in Dinner Rush and Last Call', () => {
    const rush = atRoundTick(200 * 30);
    const want = Math.round(40 * rush.config.tuning.rushMultiplier);
    expect(rush.round.phase).toBe('rush');
    expect(scoreDelivery(rush, 0, addTicket(rush, SALAD), plate(rush, SALAD_FOOD))).toBe(want);
    const last = atRoundTick(235 * 30);
    expect(last.round.phase).toBe('lastCall');
    expect(scoreDelivery(last, 0, addTicket(last, SALAD), plate(last, SALAD_FOOD))).toBe(want);
    const service = atRoundTick(100 * 30);
    expect(scoreDelivery(service, 0, addTicket(service, SALAD), plate(service, SALAD_FOOD))).toBe(40);
  });

  it('has no rush multiplier when rush is disabled', () => {
    const s = atRoundTick(235 * 30, { rushEnabled: false });
    expect(s.round.phase).toBe('lastCall');
    expect(scoreDelivery(s, 0, addTicket(s, SALAD), plate(s, SALAD_FOOD))).toBe(40);
  });

  it('adds tipPoints only within tipWindowSeconds of plating (0 by default)', () => {
    const def = atRoundTick(20 * 30);
    expect(scoreDelivery(def, 0, addTicket(def, SALAD), plate(def, SALAD_FOOD))).toBe(40);
    const s = atRoundTick(20 * 30, { tuning: { tipPoints: 7 } });
    const t = addTicket(s, SALAD);
    expect(scoreDelivery(s, 0, t, plate(s, SALAD_FOOD, { platedAtTick: s.tick - 5 * 30 }))).toBe(47);
    expect(scoreDelivery(s, 0, t, plate(s, SALAD_FOOD, { platedAtTick: s.tick - 5 * 30 - 1 }))).toBe(40);
  });

  it('rounds the product', () => {
    const s = atRoundTick(20 * 30);
    const t = addTicket(s, { ...SALAD, baseValue: 33 }, { baseValue: 33 });
    s.teams[0].heat = 1;
    expect(scoreDelivery(s, 0, t, plate(s, SALAD_FOOD))).toBe(41); // 41.25
  });
});

/** Rule arithmetic below is written against these thresholds, not the live defaults. */
const HEAT_FIXTURE: ConfigOverrides = { tuning: { heatThresholds: [2, 4, 7] } };

describe('heat', () => {
  it('climbs tiers at heatThresholds and emits heatChange only on change', () => {
    const s = newRulesMatch(HEAT_FIXTURE);
    const heats: number[] = [];
    for (let i = 0; i < 9; i++) {
      registerCleanDelivery(s, 1);
      heats.push(s.teams[1].heat);
    }
    expect(heats).toEqual([0, 1, 1, 2, 2, 2, 3, 3, 3]);
    expect(ofType(s.events, 'heatChange')).toEqual([
      { type: 'heatChange', team: 1, heat: 1 },
      { type: 'heatChange', team: 1, heat: 2 },
      { type: 'heatChange', team: 1, heat: 3 },
    ]);
    expect(s.teams[0]).toMatchObject({ heat: 0, cleanStreak: 0 });
  });

  it('registerMistake drops one tier and resets the streak to that tier threshold', () => {
    const s = newRulesMatch(HEAT_FIXTURE);
    s.teams[0].heat = 3;
    s.teams[0].cleanStreak = 9;
    registerMistake(s, 0);
    expect(s.teams[0]).toMatchObject({ heat: 2, cleanStreak: 4 });
    registerMistake(s, 0);
    expect(s.teams[0]).toMatchObject({ heat: 1, cleanStreak: 2 });
    registerMistake(s, 0);
    expect(s.teams[0]).toMatchObject({ heat: 0, cleanStreak: 0 });
    expect(ofType(s.events, 'heatChange').map((e) => e.heat)).toEqual([2, 1, 0]);
    s.teams[0].cleanStreak = 1;
    s.events = [];
    registerMistake(s, 0);
    expect(s.teams[0]).toMatchObject({ heat: 0, cleanStreak: 0 });
    expect(s.events).toEqual([]);
  });

  it('after a mistake, the next clean delivery continues from the threshold', () => {
    const s = newRulesMatch(HEAT_FIXTURE);
    for (let i = 0; i < 5; i++) registerCleanDelivery(s, 0);
    expect(s.teams[0].heat).toBe(2);
    registerMistake(s, 0);
    expect(s.teams[0]).toMatchObject({ heat: 1, cleanStreak: 2 });
    registerCleanDelivery(s, 0);
    registerCleanDelivery(s, 0);
    expect(s.teams[0]).toMatchObject({ heat: 2, cleanStreak: 4 });
  });
});
