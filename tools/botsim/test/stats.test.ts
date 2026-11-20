import { describe, expect, it } from 'vitest';
import { wilson } from '../src/stats';
import { pickSkill } from '../src/suite';

describe('wilson interval', () => {
  it('matches reference values (95%)', () => {
    const half = wilson(5, 10);
    expect(half.lo).toBeCloseTo(0.2366, 4);
    expect(half.hi).toBeCloseTo(0.7634, 4);
    const all = wilson(10, 10);
    expect(all.lo).toBeCloseTo(0.7225, 4);
    expect(all.hi).toBe(1);
    const none = wilson(0, 20);
    expect(none.lo).toBe(0);
    expect(none.hi).toBeCloseTo(0.1611, 4);
    const big = wilson(140, 200);
    expect(big.lo).toBeCloseTo(0.6332, 4);
    expect(big.hi).toBeCloseTo(0.7593, 4);
  });

  it('is [0, 1] with no data and narrows with more samples', () => {
    expect(wilson(0, 0)).toEqual({ lo: 0, hi: 1 });
    const small = wilson(7, 10);
    const large = wilson(700, 1000);
    expect(large.hi - large.lo).toBeLessThan(small.hi - small.lo);
    expect(large.lo).toBeLessThan(0.7);
    expect(large.hi).toBeGreaterThan(0.7);
  });
});

describe('gap calibration skill pick', () => {
  const rows = [
    { skill: 0.8, pointsPerRound: 100, ratio: 1 },
    { skill: 0.9, pointsPerRound: 120, ratio: 1.2 },
    { skill: 1, pointsPerRound: 130, ratio: 1.3 },
  ];
  it('interpolates where throughput crosses target × baseline', () => {
    const r = pickSkill(100, rows, 1.1);
    expect(r.skill).toBeCloseTo(0.85);
    expect(r.achieved).toBe(1.1);
  });
  it('falls back to the closest grid point, or none when the baseline never scores', () => {
    expect(pickSkill(100, rows, 1.5).skill).toBe(1);
    expect(pickSkill(0, rows, 1.1).skill).toBeNull();
  });
});
