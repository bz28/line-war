/** End to end: suite (calibration, scenarios, sweep) with the scripted test bots, then the report. */
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { renderJson, renderMarkdown } from '../src/report';
import { BUILTIN_SCENARIOS } from '../src/scenarios';
import { runSuite, type SuiteOptions } from '../src/suite';

const SCRIPTED = fileURLToPath(new URL('./scriptedBot.ts', import.meta.url));

const options = (over: Partial<SuiteOptions> = {}): SuiteOptions => ({
  arena: 'night-market',
  matches: 3,
  seed: 1,
  scenarios: BUILTIN_SCENARIOS.filter((s) => ['even-2v2', 'gap-2v2', 'even-1v1'].includes(s.name)),
  base: { config: { roundSeconds: 90, bestOf: 1 }, tuning: {} },
  sweep: [],
  workers: 0,
  botsModule: SCRIPTED,
  stuckSeconds: 10,
  calibration: { matches: 2, skills: [0.7, 0.9, 1], target: 1.1 },
  ...over,
});

describe('suite + report', () => {
  it('runs every scenario, calibrates the gap, judges the bars and renders Markdown + JSON', async () => {
    const r = await runSuite(options());
    expect(r.points).toHaveLength(1);
    const p = r.points[0]!;
    expect(p.scenarios.map((s) => s.scenario)).toEqual(['even-2v2', 'gap-2v2', 'even-1v1']);
    expect(p.scenarios.every((s) => s.matches === 3 && s.rounds === 3)).toBe(true);
    expect(p.calibration!.rows.map((x) => x.skill)).toEqual([0.7, 0.9, 1]);
    expect(p.calibration!.baseline).toBeGreaterThan(0);
    expect(p.bars.map((b) => b.id)).toEqual(['stuck', 'knocks', 'skips', 'gap']);
    expect(p.bars.find((b) => b.id === 'knocks')!.status).toBe('FAIL'); // the scripted bots never knock
    expect(p.sideBias.map((b) => b.id)).toEqual(['side-even-2v2', 'side-even-1v1']);
    expect(r.matchesRun).toBe(4 * 2 + 3 * 3);

    const md = renderMarkdown(r, { commit: 'abc1234' });
    for (const heading of ['## Pass bars', '## Side bias', '## Details', '### Recipes', '### gap-2v2 calibration', '### Stuck events', '## Run settings', '## Definitions']) {
      expect(md).toContain(heading);
    }
    expect(md).toMatch(/Knocks per round \| 2–6 \(even-2v2\) \| 0\.00 \| ❌ FAIL/);
    expect(md).toContain('`abc1234`');
    const json = JSON.parse(renderJson(r));
    expect(json.points[0].scenarios[0].scenario).toBe('even-2v2');
    expect(json.options.matches).toBe(3);
  }, 60_000);

  it('sweeps compare points on the same seeds and render a comparison table', async () => {
    const r = await runSuite(
      options({
        scenarios: BUILTIN_SCENARIOS.filter((s) => s.name === 'even-1v1'),
        sweep: [{ key: 'tuning.ticketSpawnSeconds', values: [4, 8] }],
        matches: 2,
      }),
    );
    expect(r.points.map((p) => p.label)).toEqual(['tuning.ticketSpawnSeconds=4', 'tuning.ticketSpawnSeconds=8']);
    const [fast, slow] = r.points.map((p) => p.scenarios[0]!.ticketsPerRound.spawned);
    expect(fast!).toBeGreaterThan(slow!);
    const md = renderMarkdown(r);
    expect(md).toContain('## Sweep comparison');
    expect(md).toContain('## Details: tuning.ticketSpawnSeconds=8');
  }, 60_000);
});
