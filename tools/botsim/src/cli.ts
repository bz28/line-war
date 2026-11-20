/**
 * botsim CLI. Relative paths (--out, --bots) resolve against the current directory, which under
 * `pnpm --filter @line-war/botsim sim` is tools/botsim.
 */
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { parseArgs, USAGE } from './args';
import { defaultWorkers } from './pool';
import { renderJson, renderMarkdown } from './report';
import { runSuite } from './suite';

function commit(): string | undefined {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return undefined;
  }
}

async function main(): Promise<void> {
  const o = parseArgs(process.argv.slice(2));
  if (o.help) {
    process.stdout.write(USAGE);
    return;
  }
  const log = o.quiet ? () => {} : (m: string) => process.stderr.write(`${m}\n`);
  const result = await runSuite(
    {
      arena: o.arena,
      matches: o.matches,
      seed: o.seed,
      scenarios: o.scenarios,
      base: o.base,
      sweep: o.sweep,
      workers: o.workers ?? defaultWorkers(),
      botsModule: o.botsModule ? (o.botsModule.startsWith('.') || o.botsModule.startsWith('/') ? resolve(o.botsModule) : o.botsModule) : undefined,
      maxTicks: o.maxTicks,
      stuckSeconds: o.stuckSeconds,
      calibration: { matches: o.calibrationMatches, skills: o.calibrationSkills, target: o.target, fixedSkill: o.gapSkill },
    },
    log,
  );
  const meta = {
    commit: commit(),
    note: o.botsModule ? `Bots from \`${o.botsModule}\` (not @line-war/bots).` : undefined,
  };
  // Show the bots module as given (relative), so reports don't leak local absolute paths.
  result.options.botsModule = o.botsModule;
  const out = resolve(o.out);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, renderMarkdown(result, meta));
  if (o.json) writeFileSync(out.replace(/\.md$/, '') + '.json', renderJson(result, meta));
  const fails = result.points.flatMap((p) => p.bars.filter((b) => b.status === 'FAIL').map((b) => `${p.label}: ${b.name}`));
  log(`\n${result.matchesRun} matches in ${(result.elapsedMs / 1000).toFixed(1)} s (${(result.matchesRun / (result.elapsedMs / 1000)).toFixed(1)} matches/s)`);
  log(`report: ${out}`);
  log(fails.length ? `failing bars:\n  ${fails.join('\n  ')}` : 'all pass bars PASS');
}

main().catch((err: unknown) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
