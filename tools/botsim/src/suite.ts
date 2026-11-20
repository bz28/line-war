/**
 * The evaluation suite: for each sweep point, calibrate the gap scenario, run every scenario,
 * aggregate, and judge the pass bars (design doc, validation step 4).
 */
import { DEFAULT_MATCH_CONFIG, DEFAULT_TUNING } from '@line-war/sim';
import { aggregate, type ScenarioAggregate } from './aggregate';
import { MatchPool } from './pool';
import type { ScenarioDef } from './scenarios';
import { deriveSeed } from './seeds';
import { mean } from './stats';
import type { ConfigOverrides, MatchSpec, TuningOverrides } from './types';

// ---------- overrides and sweeps ----------

export interface Overrides {
  config: ConfigOverrides;
  tuning: TuningOverrides;
}

export interface SweepAxis {
  /** 'tuning.<key>' or 'config.<key>'. */
  key: string;
  values: unknown[];
}

/** Normalise a key to 'tuning.x' / 'config.x' and check it exists. Bare keys are looked up in tuning, then config. */
export function resolveKey(key: string): { scope: 'tuning' | 'config'; name: string } {
  const [scope, name] = key.includes('.') ? (key.split('.', 2) as [string, string]) : [key in DEFAULT_TUNING ? 'tuning' : 'config', key];
  if (scope === 'tuning' && name in DEFAULT_TUNING) return { scope, name };
  if (scope === 'config' && name in DEFAULT_MATCH_CONFIG && name !== 'tuning' && name !== 'seed') return { scope, name };
  throw new Error(`unknown setting '${key}' (use tuning.<key> or config.<key>; see packages/sim/src/tuning.ts)`);
}

export function applyOverride(base: Overrides, key: string, value: unknown): Overrides {
  const { scope, name } = resolveKey(key);
  const current = scope === 'tuning' ? (DEFAULT_TUNING as unknown as Record<string, unknown>)[name] : (DEFAULT_MATCH_CONFIG as unknown as Record<string, unknown>)[name];
  const want = Array.isArray(current) ? 'array' : typeof current;
  const got = Array.isArray(value) ? 'array' : typeof value;
  if (want !== got) throw new Error(`setting '${key}' expects a ${want}, got ${JSON.stringify(value)}`);
  return scope === 'tuning' ? { ...base, tuning: { ...base.tuning, [name]: value } } : { ...base, config: { ...base.config, [name]: value } };
}

export interface SweepPoint {
  label: string;
  /** key -> value for this point (empty for the baseline). */
  values: Record<string, unknown>;
  overrides: Overrides;
}

/** Cartesian product of the sweep axes on top of the base overrides. No axes = one baseline point. */
export function sweepPoints(base: Overrides, axes: readonly SweepAxis[]): SweepPoint[] {
  let points: SweepPoint[] = [{ label: 'baseline', values: {}, overrides: base }];
  for (const axis of axes) {
    points = points.flatMap((p) =>
      axis.values.map((v) => {
        const values = { ...p.values, [axis.key]: v };
        return {
          label: Object.entries(values)
            .map(([k, x]) => `${k}=${JSON.stringify(x)}`)
            .join(' '),
          values,
          overrides: applyOverride(p.overrides, axis.key, v),
        };
      }),
    );
  }
  return points;
}

// ---------- calibration ----------

export interface CalibrationOptions {
  matches: number;
  skills: number[];
  /** Target throughput ratio vs the baseline normal bot (1.10 = 10% faster). */
  target: number;
  /** Skip calibration and use this skill for crew A in gap-2v2. */
  fixedSkill?: number;
}

export interface CalibrationResult {
  baseline: number;
  rows: { skill: number; pointsPerRound: number; ratio: number }[];
  /** Chosen crew-A skill; null = could not calibrate (gap-2v2 then runs at the baseline skill). */
  skill: number | null;
  /** Throughput ratio at the chosen skill (interpolated). */
  achieved: number | null;
  note: string;
}

/** Pick the skill where throughput crosses target × baseline (linear interpolation between grid points). */
export function pickSkill(baseline: number, rows: CalibrationResult['rows'], target: number): Pick<CalibrationResult, 'skill' | 'achieved' | 'note'> {
  if (baseline <= 0) return { skill: null, achieved: null, note: 'baseline bot scored 0 points per round solo; cannot calibrate.' };
  const goal = baseline * target;
  const sorted = [...rows].sort((a, b) => a.skill - b.skill);
  for (let i = 1; i < sorted.length; i++) {
    const lo = sorted[i - 1]!;
    const hi = sorted[i]!;
    if (lo.pointsPerRound < goal && hi.pointsPerRound >= goal) {
      const t = (goal - lo.pointsPerRound) / (hi.pointsPerRound - lo.pointsPerRound);
      return { skill: lo.skill + t * (hi.skill - lo.skill), achieved: target, note: `interpolated between skill ${lo.skill} and ${hi.skill}.` };
    }
  }
  const best = sorted.reduce<CalibrationResult['rows'][number] | null>(
    (b, r) => (b === null || Math.abs(r.pointsPerRound - goal) < Math.abs(b.pointsPerRound - goal) ? r : b),
    null,
  );
  if (!best) return { skill: null, achieved: null, note: 'no calibration grid.' };
  return { skill: best.skill, achieved: best.ratio, note: `target ${target}× not bracketed by the grid; using the closest skill.` };
}

// ---------- suite ----------

export interface SuiteOptions {
  arena: string;
  matches: number;
  seed: number;
  scenarios: ScenarioDef[];
  base: Overrides;
  sweep: SweepAxis[];
  workers: number;
  botsModule?: string;
  maxTicks?: number;
  stuckSeconds: number;
  calibration: CalibrationOptions;
}

export type BarStatus = 'PASS' | 'FAIL' | 'N/A';

export interface BarResult {
  id: string;
  name: string;
  target: string;
  value: string;
  status: BarStatus;
}

export interface PointResult {
  label: string;
  values: Record<string, unknown>;
  overrides: Overrides;
  calibration: CalibrationResult | null;
  scenarios: ScenarioAggregate[];
  bars: BarResult[];
  sideBias: BarResult[];
}

export interface SuiteResult {
  options: SuiteOptions;
  points: PointResult[];
  matchesRun: number;
  elapsedMs: number;
}

function spec(o: SuiteOptions, point: SweepPoint, seed: number, slots: MatchSpec['slots']): MatchSpec {
  return {
    arena: o.arena,
    seed,
    slots,
    config: point.overrides.config,
    tuning: point.overrides.tuning,
    maxTicks: o.maxTicks,
    stuckSeconds: o.stuckSeconds,
    botsModule: o.botsModule,
  };
}

const solo = (skill?: number): MatchSpec['slots'] => [skill === undefined ? { difficulty: 'normal' } : { difficulty: 'normal', skill }, null, null, null];

async function calibrate(o: SuiteOptions, point: SweepPoint, pool: MatchPool): Promise<{ result: CalibrationResult; matches: number }> {
  const c = o.calibration;
  // Same seeds for every skill value (common random numbers): the comparison is paired.
  const seeds = Array.from({ length: c.matches }, (_, i) => deriveSeed(o.seed, 'calibration', i));
  const grid = [undefined, ...c.skills];
  const specs = grid.flatMap((s) => seeds.map((seed) => spec(o, point, seed, solo(s))));
  const records = await pool.run(specs);
  const ppr = (k: number): number => mean(records.slice(k * seeds.length, (k + 1) * seeds.length).flatMap((m) => m.rounds.map((r) => r.scores[0])));
  const baseline = ppr(0);
  const rows = c.skills.map((skill, i) => {
    const p = ppr(i + 1);
    return { skill, pointsPerRound: p, ratio: baseline > 0 ? p / baseline : 0 };
  });
  return { result: { baseline, rows, ...pickSkill(baseline, rows, c.target) }, matches: specs.length };
}

const pct = (x: number): string => `${(x * 100).toFixed(1)}%`;

export function judgeBars(scenarios: readonly ScenarioAggregate[]): BarResult[] {
  const find = (name: string): ScenarioAggregate | undefined => scenarios.find((s) => s.scenario === name);
  const bars: BarResult[] = [];

  const stuck = scenarios.reduce((a, s) => a + s.stuck, 0);
  bars.push({
    id: 'stuck',
    name: 'Bots never get stuck',
    target: '0 stuck events (all scenarios)',
    value: `${stuck}`,
    status: scenarios.length === 0 ? 'N/A' : stuck === 0 ? 'PASS' : 'FAIL',
  });

  const even = find('even-2v2');
  bars.push(
    even
      ? {
          id: 'knocks',
          name: 'Knocks per round',
          target: '2–6 (even-2v2)',
          value: even.knocksPerRound.toFixed(2),
          status: even.knocksPerRound >= 2 && even.knocksPerRound <= 6 ? 'PASS' : 'FAIL',
        }
      : { id: 'knocks', name: 'Knocks per round', target: '2–6 (even-2v2)', value: 'not run', status: 'N/A' },
  );

  if (even) {
    const skips = Object.entries(even.recipes).filter(([, r]) => r.spawned > 0);
    const shares = skips.map(([, r]) => r.skipShare);
    const max = Math.max(...shares);
    const min = Math.min(...shares);
    const ok = shares.length > 0 && (max === 0 || max <= 2 * min);
    const hi = skips.find(([, r]) => r.skipShare === max)?.[0];
    const lo = skips.find(([, r]) => r.skipShare === min)?.[0];
    bars.push({
      id: 'skips',
      name: 'No recipe skipped 2× as often as another',
      target: 'max skip share ≤ 2 × min (even-2v2)',
      value: shares.length ? `${hi} ${pct(max)} vs ${lo} ${pct(min)}` : 'no tickets',
      status: shares.length === 0 ? 'N/A' : ok ? 'PASS' : 'FAIL',
    });
  } else {
    bars.push({ id: 'skips', name: 'No recipe skipped 2× as often as another', target: 'max ≤ 2 × min (even-2v2)', value: 'not run', status: 'N/A' });
  }

  const gap = find('gap-2v2');
  bars.push(
    gap
      ? {
          id: 'gap',
          name: 'A 10% faster crew wins 65–80% of rounds',
          target: '65–80% (gap-2v2, crew A)',
          value:
            gap.roundWins[0] + gap.roundWins[1] === 0
              ? 'no decisive rounds'
              : `${pct(gap.aRoundWinRate)} [${pct(gap.aRoundWinCI.lo)}, ${pct(gap.aRoundWinCI.hi)}]`,
          status: gap.roundWins[0] + gap.roundWins[1] === 0 ? 'FAIL' : gap.aRoundWinRate >= 0.65 && gap.aRoundWinRate <= 0.8 ? 'PASS' : 'FAIL',
        }
      : { id: 'gap', name: 'A 10% faster crew wins 65–80% of rounds', target: '65–80% (gap-2v2)', value: 'not run', status: 'N/A' },
  );
  return bars;
}

/** Even scenarios: crew A's decisive-round win rate should be ~50% (0.5 inside the 95% Wilson interval). */
export function judgeSideBias(scenarios: readonly ScenarioAggregate[], defs: readonly ScenarioDef[]): BarResult[] {
  return scenarios
    .filter((s) => defs.find((d) => d.name === s.scenario)?.even)
    .map((s) => {
      const decisive = s.roundWins[0] + s.roundWins[1];
      return {
        id: `side-${s.scenario}`,
        name: `Side bias, ${s.scenario}`,
        target: '50% inside the 95% CI',
        value: decisive ? `${pct(s.aRoundWinRate)} [${pct(s.aRoundWinCI.lo)}, ${pct(s.aRoundWinCI.hi)}] (${decisive} decisive)` : 'no decisive rounds',
        status: decisive === 0 ? 'N/A' : s.aRoundWinCI.lo <= 0.5 && s.aRoundWinCI.hi >= 0.5 ? 'PASS' : 'FAIL',
      };
    });
}

export async function runSuite(o: SuiteOptions, log: (msg: string) => void = () => {}): Promise<SuiteResult> {
  const start = performance.now();
  const pool = new MatchPool(o.workers);
  let matchesRun = 0;
  const points: PointResult[] = [];
  try {
    for (const point of sweepPoints(o.base, o.sweep)) {
      let calibration: CalibrationResult | null = null;
      const needsCal = o.scenarios.some((s) => s.calibrated);
      if (needsCal && o.calibration.fixedSkill === undefined) {
        log(`[${point.label}] calibrating gap-2v2 skill (${(o.calibration.skills.length + 1) * o.calibration.matches} solo matches)...`);
        const cal = await calibrate(o, point, pool);
        calibration = cal.result;
        matchesRun += cal.matches;
      } else if (needsCal) {
        calibration = { baseline: 0, rows: [], skill: o.calibration.fixedSkill!, achieved: null, note: 'fixed by --gap-skill.' };
      }
      const scenarios: ScenarioAggregate[] = [];
      for (const sc of o.scenarios) {
        const slots = sc.calibrated
          ? sc.slots.map((s, i) => (s && i < 2 && calibration?.skill != null ? { ...s, skill: calibration.skill } : s))
          : sc.slots;
        // Seeds depend on scenario and index only, so sweep points are compared on the same matches.
        const specs = Array.from({ length: o.matches }, (_, i) => spec(o, point, deriveSeed(o.seed, sc.name, i), slots));
        const t0 = performance.now();
        const records = await pool.run(specs);
        matchesRun += specs.length;
        log(`[${point.label}] ${sc.name}: ${specs.length} matches in ${((performance.now() - t0) / 1000).toFixed(1)} s`);
        scenarios.push(aggregate(sc.name, records));
      }
      points.push({
        label: point.label,
        values: point.values,
        overrides: point.overrides,
        calibration,
        scenarios,
        bars: judgeBars(scenarios),
        sideBias: judgeSideBias(scenarios, o.scenarios),
      });
    }
  } finally {
    await pool.close();
  }
  return { options: o, points, matchesRun, elapsedMs: performance.now() - start };
}
