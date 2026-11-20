import { describe, expect, it } from 'vitest';
import { parseArgs, parseSkillGrid } from '../src/args';
import { BUILTIN_SCENARIOS, parseCustomScenario } from '../src/scenarios';
import { sweepPoints } from '../src/suite';

describe('CLI args', () => {
  it('has sensible defaults: all scenarios, 200 matches, reports/latest.md', () => {
    const o = parseArgs([]);
    expect(o.matches).toBe(200);
    expect(o.scenarios.map((s) => s.name)).toEqual(BUILTIN_SCENARIOS.map((s) => s.name));
    expect(o.out).toBe('reports/latest.md');
    expect(o.workers).toBeNull();
    expect(o.sweep).toEqual([]);
    expect(o.base).toEqual({ config: {}, tuning: {} });
  });

  it('parses the documented invocation (with the pnpm "--" separator)', () => {
    const o = parseArgs(['--', '--matches', '50', '--scenario', 'even-2v2,gap-2v2', '--out', 'x/y.md', '--workers=3', '--seed', '9']);
    expect(o.matches).toBe(50);
    expect(o.scenarios.map((s) => s.name)).toEqual(['even-2v2', 'gap-2v2']);
    expect(o.out).toBe('x/y.md');
    expect(o.workers).toBe(3);
    expect(o.seed).toBe(9);
  });

  it('parses --set and --sweep (grid, bare keys, array values)', () => {
    const o = parseArgs([
      '--set',
      'config.roundSeconds=180',
      '--set',
      'tuning.heatMultipliers=[1,1.5,2,3]',
      '--sweep',
      'tuning.ticketSpawnSeconds=3,4,5',
      '--sweep',
      'rushEnabled=true,false',
    ]);
    expect(o.base).toEqual({ config: { roundSeconds: 180 }, tuning: { heatMultipliers: [1, 1.5, 2, 3] } });
    expect(o.sweep).toEqual([
      { key: 'tuning.ticketSpawnSeconds', values: [3, 4, 5] },
      { key: 'config.rushEnabled', values: [true, false] },
    ]);
    const points = sweepPoints(o.base, o.sweep);
    expect(points).toHaveLength(6);
    expect(points[0]!.label).toBe('tuning.ticketSpawnSeconds=3 config.rushEnabled=true');
    expect(points[5]!.overrides).toEqual({
      config: { roundSeconds: 180, rushEnabled: false },
      tuning: { heatMultipliers: [1, 1.5, 2, 3], ticketSpawnSeconds: 5 },
    });
    const arr = parseArgs(['--sweep', 'tuning.heatThresholds=[2,4,7];[3,6,9]']);
    expect(arr.sweep[0]!.values).toEqual([
      [2, 4, 7],
      [3, 6, 9],
    ]);
  });

  it('rejects unknown settings, wrong value types, unknown flags and scenarios', () => {
    expect(() => parseArgs(['--set', 'tuning.nope=1'])).toThrow(/unknown setting/);
    expect(() => parseArgs(['--set', 'tuning.maxTickets=true'])).toThrow(/expects a number/);
    expect(() => parseArgs(['--sweep', 'tuning.maxTickets=a,b'])).toThrow(/not JSON/);
    expect(() => parseArgs(['--frobnicate'])).toThrow(/unknown option/);
    expect(() => parseArgs(['--scenario', 'nope'])).toThrow(/unknown scenario/);
    expect(() => parseArgs(['--matches', '0'])).toThrow(/integer/);
    expect(() => parseArgs(['--matches'])).toThrow(/needs a value/);
  });

  it('parses custom scenarios and always includes them', () => {
    const o = parseArgs(['--scenario', 'even-1v1', '--custom', 'duo=hard,normal@0.9 vs normal,-']);
    expect(o.scenarios.map((s) => s.name)).toEqual(['even-1v1', 'duo']);
    expect(o.scenarios[1]!.slots).toEqual([{ difficulty: 'hard' }, { difficulty: 'normal', skill: 0.9 }, { difficulty: 'normal' }, null]);
    expect(o.scenarios[1]!.even).toBe(false);
    expect(parseCustomScenario('m=normal,- vs -,normal').even).toBe(true);
    expect(parseCustomScenario('solo=hard vs easy').slots).toEqual([{ difficulty: 'hard' }, null, { difficulty: 'easy' }, null]);
    expect(() => parseCustomScenario('bad=pro vs normal')).toThrow(/bad slot/);
    expect(() => parseCustomScenario('bad=normal')).toThrow(/vs/);
  });

  it('parses calibration options', () => {
    expect(parseSkillGrid('0.5:1:0.25')).toEqual([0.5, 0.75, 1]);
    expect(parseSkillGrid('0.6,0.9')).toEqual([0.6, 0.9]);
    const o = parseArgs(['--gap-skill', '0.9', '--target', '1.2', '--calibration-matches', '5', '--stuck-seconds', '8', '--no-json', '--quiet']);
    expect(o).toMatchObject({ gapSkill: 0.9, target: 1.2, calibrationMatches: 5, stuckSeconds: 8, json: false, quiet: true });
  });
});
