/** Markdown report and JSON sidecar for a SuiteResult. */
import type { ScenarioAggregate } from './aggregate';
import { CLOSE_MARGIN } from './aggregate';
import type { BarResult, PointResult, SuiteResult } from './suite';

export interface ReportMeta {
  /** e.g. git commit, shown in the settings table. */
  commit?: string;
  /** Free-text note shown under the title (e.g. "scripted test bots"). */
  note?: string;
}

const pct = (x: number): string => `${(x * 100).toFixed(1)}%`;
const f1 = (x: number): string => x.toFixed(1);
const f2 = (x: number): string => x.toFixed(2);
const pair = (p: [number, number], f: (x: number) => string = f1): string => `${f(p[0])} / ${f(p[1])}`;
const badge = (s: BarResult['status']): string => (s === 'PASS' ? '✅ PASS' : s === 'FAIL' ? '❌ FAIL' : '➖ N/A');

function table(head: string[], rows: string[][]): string {
  const line = (cells: string[]): string => `| ${cells.map((c) => c.replace(/\|/g, '\\|')).join(' | ')} |`;
  return [line(head), line(head.map(() => '---')), ...rows.map(line)].join('\n');
}

function barsTable(points: readonly PointResult[], pick: (p: PointResult) => BarResult[]): string {
  const first = points[0];
  if (!first) return '_no results_';
  const ids = [...new Set(points.flatMap((p) => pick(p).map((b) => b.id)))];
  if (ids.length === 0) return '';
  if (points.length === 1) {
    return table(
      ['Check', 'Target', 'Value', 'Result'],
      pick(first).map((b) => [b.name, b.target, b.value, badge(b.status)]),
    );
  }
  return table(
    ['Check', 'Target', ...points.map((p) => p.label)],
    ids.map((id) => {
      const any = points.map((p) => pick(p).find((b) => b.id === id)).find(Boolean)!;
      return [
        any.name,
        any.target,
        ...points.map((p) => {
          const b = pick(p).find((x) => x.id === id);
          return b ? `${b.value} ${badge(b.status)}` : '—';
        }),
      ];
    }),
  );
}

function scenarioTable(scenarios: readonly ScenarioAggregate[]): string {
  return table(
    [
      'Scenario',
      'Matches / rounds',
      'A round win % [95% CI]',
      'Draws',
      'Pts/round A / B',
      'Served/round A / B',
      'Knocks/round',
      'Steal %',
      'Contested %',
      'Wasted/round',
      'Close %',
      'Comeback %',
      'Lead changes/round',
      'Burns/round',
      'Stuck',
      'Runaway',
    ],
    scenarios.map((s) => [
      s.scenario,
      `${s.matches} / ${s.rounds}`,
      s.roundWins[0] + s.roundWins[1] ? `${pct(s.aRoundWinRate)} [${pct(s.aRoundWinCI.lo)}, ${pct(s.aRoundWinCI.hi)}]` : 'n/a',
      `${s.roundDraws}`,
      pair(s.pointsPerRound),
      pair(s.servedPerRound, f2),
      f2(s.knocksPerRound),
      pct(s.stealRate),
      pct(s.contestedShare),
      f2(s.wastedPerRound.total),
      s.scoredRounds ? pct(s.closeRoundShare) : 'n/a',
      s.comeback.eligible ? `${pct(s.comeback.rate)} (${s.comeback.comebacks}/${s.comeback.eligible})` : 'n/a',
      f2(s.leadChangesPerRound),
      f2(s.burnsPerRound),
      `${s.stuck}`,
      `${s.runaways}`,
    ]),
  );
}

function recipeTable(scenarios: readonly ScenarioAggregate[]): string {
  const ids = [...new Set(scenarios.flatMap((s) => Object.keys(s.recipes)))];
  return table(
    ['Recipe served rate (served / spawned)', ...scenarios.map((s) => s.scenario)],
    ids.map((id) => [
      id,
      ...scenarios.map((s) => {
        const r = s.recipes[id];
        return r && r.spawned ? `${pct(r.servedRate)} (${r.served}/${r.spawned})` : '—';
      }),
    ]),
  );
}

function contextTable(scenarios: readonly ScenarioAggregate[]): string {
  return table(
    ['Scenario', 'Tickets/round spawned · served · expired · left', 'Wasted/round cold · trashed · left', 'Critic A · B · unserved', 'Trailing crew wins Critic', 'Heat A t0/t1/t2/t3', 'Heat B t0/t1/t2/t3', 'Fires/round'],
    scenarios.map((s) => {
      const t = s.ticketsPerRound;
      const w = s.wastedPerRound;
      const c = s.critic;
      const heat = (h: number[]): string => h.map((x) => (x * 100).toFixed(0)).join('/');
      return [
        s.scenario,
        `${f1(t.spawned)} · ${f1(t.served)} · ${f1(t.expired)} · ${f1(t.leftover)}`,
        `${f2(w.cold)} · ${f2(w.trashed)} · ${f2(w.leftover)}`,
        `${c.wonA} · ${c.wonB} · ${c.unserved}`,
        c.trailingFirst ? `${pct(c.trailingWon / c.trailingFirst)} (${c.trailingWon}/${c.trailingFirst})` : 'n/a',
        heat(s.heatShare[0]),
        heat(s.heatShare[1]),
        f2(s.firesPerRound),
      ];
    }),
  );
}

function calibrationSection(p: PointResult): string {
  const c = p.calibration;
  if (!c) return '';
  const rows = c.rows.map((r) => [f2(r.skill), f1(r.pointsPerRound), `${r.ratio.toFixed(3)}×`]);
  const chosen = c.skill === null ? 'none (gap-2v2 runs at the baseline skill)' : `**${c.skill.toFixed(3)}**${c.achieved ? ` (≈${c.achieved.toFixed(3)}×)` : ''}`;
  return [
    `Crew throughput: two normal bots at the given skill vs an empty kitchen, points per round. Baseline (normal, no skill override): **${f1(c.baseline)}**.`,
    '',
    rows.length ? table(['Skill', 'Points/round', 'vs baseline'], rows) : '',
    '',
    `Chosen crew-A skill: ${chosen}. ${c.note}`,
  ].join('\n');
}

function stuckSection(scenarios: readonly ScenarioAggregate[]): string {
  const rows = scenarios.flatMap((s) =>
    s.stuckSamples.map((e) => [s.scenario, `${e.seed}`, `${e.round}`, `${e.tick}`, `P${e.player}`, `(${e.pos.x}, ${e.pos.y})`, e.holding ?? '—']),
  );
  if (rows.length === 0) return 'No stuck events.';
  return `First ${rows.length} (up to 10 per scenario). Reproduce with \`runMatch({ seed, slots })\` for that scenario.\n\n${table(['Scenario', 'Seed', 'Round', 'Tick', 'Player', 'Pos', 'Holding'], rows)}`;
}

function sweepComparison(points: readonly PointResult[]): string {
  const names = [...new Set(points.flatMap((p) => p.scenarios.map((s) => s.scenario)))];
  return names
    .map((name) => {
      const rows = points.flatMap((p) => {
        const s = p.scenarios.find((x) => x.scenario === name);
        if (!s) return [];
        return [
          [
            p.label,
            s.roundWins[0] + s.roundWins[1] ? `${pct(s.aRoundWinRate)} [${pct(s.aRoundWinCI.lo)}, ${pct(s.aRoundWinCI.hi)}]` : 'n/a',
            pair(s.pointsPerRound),
            f2(s.knocksPerRound),
            pct(s.contestedShare),
            f2(s.wastedPerRound.total),
            s.scoredRounds ? pct(s.closeRoundShare) : 'n/a',
            s.comeback.eligible ? pct(s.comeback.rate) : 'n/a',
            `${s.stuck}`,
          ],
        ];
      });
      return `### ${name}\n\n${table(['Point', 'A win %', 'Pts/round A / B', 'Knocks/round', 'Contested %', 'Wasted/round', 'Close %', 'Comeback %', 'Stuck'], rows)}`;
    })
    .join('\n\n');
}

function pointDetails(p: PointResult): string {
  const parts = [
    '### Scenarios',
    scenarioTable(p.scenarios),
    '### Recipes',
    recipeTable(p.scenarios),
    '### Context: tickets, waste, Critic, Heat',
    contextTable(p.scenarios),
  ];
  if (p.calibration) parts.push('### gap-2v2 calibration', calibrationSection(p));
  parts.push('### Stuck events', stuckSection(p.scenarios));
  return parts.join('\n\n');
}

export function renderMarkdown(r: SuiteResult, meta: ReportMeta = {}): string {
  const o = r.options;
  const seconds = r.elapsedMs / 1000;
  const overrides = (x: { config: object; tuning: object }): string => {
    const kv = [...Object.entries(x.config).map(([k, v]) => `config.${k}=${JSON.stringify(v)}`), ...Object.entries(x.tuning).map(([k, v]) => `tuning.${k}=${JSON.stringify(v)}`)];
    return kv.length ? kv.join(', ') : 'none (defaults from tuning.ts)';
  };
  const settings = table(
    ['Setting', 'Value'],
    [
      ['Bots', o.botsModule ? `\`${o.botsModule}\`` : '`@line-war/bots`'],
      ['Arena', o.arena],
      ['Matches per scenario', `${o.matches}`],
      ['Scenarios', o.scenarios.map((s) => `\`${s.name}\``).join(', ')],
      ['Base seed', `${o.seed}`],
      ['Overrides', overrides(o.base)],
      ['Sweep', o.sweep.length ? o.sweep.map((a) => `${a.key} = ${a.values.map((v) => JSON.stringify(v)).join(', ')}`).join('; ') : 'none'],
      ['Stuck threshold', `${o.stuckSeconds} s`],
      ['Max ticks', o.maxTicks ? `${o.maxTicks}` : '1.5 × longest possible match'],
      [
        'Calibration',
        o.calibration.fixedSkill !== undefined
          ? `fixed skill ${o.calibration.fixedSkill}`
          : `${o.calibration.matches} crew-vs-empty matches × ${o.calibration.skills.length + 1} skills, target ${o.calibration.target}×`,
      ],
      ['Workers', `${o.workers}`],
      ['Matches run', `${r.matchesRun} in ${seconds.toFixed(1)} s (${(r.matchesRun / Math.max(seconds, 1e-9)).toFixed(1)} matches/s)`],
      ...(meta.commit ? [['Commit', `\`${meta.commit}\``]] : []),
    ],
  );

  const out = ['# Botsim balance report', ''];
  if (meta.note) out.push(`> ${meta.note}`, '');
  out.push('## Pass bars', '', 'From the design doc, validation step 4.', '', barsTable(r.points, (p) => p.bars), '');
  out.push('## Side bias', '', 'Even scenarios: crew A should win about 50% of decisive rounds.', '', barsTable(r.points, (p) => p.sideBias) || '_no even scenarios_', '');
  if (r.points.length > 1) out.push('## Sweep comparison', '', sweepComparison(r.points), '');
  for (const p of r.points) {
    out.push(r.points.length > 1 ? `## Details: ${p.label}` : '## Details', '', pointDetails(p), '');
  }
  out.push('## Run settings', '', settings, '');
  out.push(
    '## Definitions',
    '',
    [
      '- **Round win %**: crew A share of decisive rounds (draws excluded), 95% Wilson interval.',
      '- **Knocks/round**: successful knocks (both crews). **Steal %**: knocks after which the knocker\'s crew was the next to pick up the popped item.',
      '- **Contested %**: deliveries where the rival crew had a dish in progress for the same recipe (a warm plate whose food is part of the recipe, or that food cooking on its stove).',
      '- **Wasted/round**: plated food lost — went cold, trashed while warm, or still on a plate at round end.',
      `- **Close %**: rounds with a margin ≤ ${CLOSE_MARGIN * 100}% of the winner's score (rounds where someone scored).`,
      '- **Comeback %**: rounds where the crew trailing when Dinner Rush began went on to win (rounds tied at rush start excluded).',
      '- **Lead changes**: times the non-tied leader changed, checked at each delivery.',
      '- **Served rate** (recipe bar): regular tickets of the recipe served, over tickets spawned (the Critic is excluded). The bar passes when the lowest rate is at least half the highest.',
      `- **Stuck**: a bot whose position stayed within 0.25 tiles and who pressed no grab/work/throw for more than ${o.stuckSeconds} s of time with tickets on the board. Idle (non-bot) slots are not checked.`,
      '- **Heat**: share of service/rush/last-call time at each Heat tier.',
    ].join('\n'),
    '',
  );
  return out.join('\n');
}

/** Raw aggregates (no per-match records) for the JSON sidecar. */
export function renderJson(r: SuiteResult, meta: ReportMeta = {}): string {
  const { options, ...rest } = r;
  return JSON.stringify({ meta, options, ...rest }, null, 2);
}
