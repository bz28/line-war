/** CLI argument parsing (no dependencies). */
import { NIGHT_MARKET } from '@line-war/content';
import { parseCustomScenario, selectScenarios, type ScenarioDef } from './scenarios';
import { applyOverride, resolveKey, type Overrides, type SweepAxis } from './suite';

export interface CliOptions {
  matches: number;
  scenarios: ScenarioDef[];
  out: string;
  seed: number;
  workers: number | null;
  botsModule?: string;
  base: Overrides;
  sweep: SweepAxis[];
  maxTicks?: number;
  stuckSeconds: number;
  calibrationMatches: number;
  calibrationSkills: number[];
  target: number;
  gapSkill?: number;
  arena: string;
  json: boolean;
  quiet: boolean;
  help: boolean;
}

export const USAGE = `Usage: pnpm --filter @line-war/botsim sim -- [options]

  --matches N             matches per scenario (default 200)
  --scenario LIST         'all' or comma list: even-2v2,gap-2v2,even-1v1,easy-vs-hard,mixed (default all)
  --custom SPEC           extra scenario, repeatable: name=<crew A> vs <crew B>,
                          crew = 1-2 comma slots of easy|normal|hard[@skill] or '-' (idle)
                          e.g. --custom "duo=hard,normal vs normal@0.9,-"
  --out PATH              Markdown report path (default reports/latest.md); JSON sidecar next to it
  --no-json               skip the JSON sidecar
  --seed N                base seed (default 1)
  --workers N             worker threads (default: cores - 1; 0 = in-process)
  --bots MODULE           module exporting createBots (default @line-war/bots)
  --set KEY=VALUE         override a setting for every match, repeatable (tuning.X or config.X; JSON value)
  --sweep KEY=V1,V2,...   compare values in one report, repeatable (grid). Use ';' between values that contain commas
  --max-ticks N           hard stop per match (default 1.5 x longest possible match)
  --stuck-seconds S       stuck threshold (default 10)
  --calibration-matches N crew-vs-empty matches per skill when calibrating gap-2v2 (default 200)
  --calibration-skills L  skill grid, comma list or lo:hi:step (default 0.5:1:0.05)
  --target R              gap-2v2 throughput ratio (default 1.10)
  --gap-skill S           skip calibration; crew A skill in gap-2v2
  --arena ID              level id: night-market, harbor-pier, rooftop-garden (default ${NIGHT_MARKET.id})
  --quiet                 no progress output
  -h, --help              this help
`;

function parseValue(key: string, raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`bad value for ${key}: '${raw}' is not JSON (numbers, true/false, [arrays])`);
  }
}

function splitValues(raw: string): string[] {
  return (raw.includes(';') ? raw.split(';') : raw.split(',')).map((s) => s.trim()).filter((s) => s.length > 0);
}

function parseKeyValue(flag: string, arg: string): [string, string] {
  const eq = arg.indexOf('=');
  if (eq <= 0) throw new Error(`${flag} expects KEY=VALUE, got '${arg}'`);
  return [arg.slice(0, eq).trim(), arg.slice(eq + 1).trim()];
}

/** lo:hi:step (inclusive) or a comma list. */
export function parseSkillGrid(raw: string): number[] {
  if (raw.includes(':')) {
    const [lo, hi, step] = raw.split(':').map(Number) as [number, number, number];
    if (![lo, hi, step].every(Number.isFinite) || step <= 0 || hi < lo) throw new Error(`bad skill grid '${raw}'`);
    const out: number[] = [];
    for (let k = 0; lo + k * step <= hi + 1e-9; k++) out.push(Math.round((lo + k * step) * 1e6) / 1e6);
    return out;
  }
  const xs = raw.split(',').map(Number);
  if (xs.some((x) => !Number.isFinite(x))) throw new Error(`bad skill grid '${raw}'`);
  return xs;
}

function int(flag: string, raw: string | undefined, min = 0): number {
  const n = Number(raw);
  if (raw === undefined || !Number.isInteger(n) || n < min) throw new Error(`${flag} expects an integer ≥ ${min}, got '${raw}'`);
  return n;
}

function num(flag: string, raw: string | undefined): number {
  const n = Number(raw);
  if (raw === undefined || !Number.isFinite(n)) throw new Error(`${flag} expects a number, got '${raw}'`);
  return n;
}

export function parseArgs(argv: readonly string[]): CliOptions {
  const o: CliOptions = {
    matches: 200,
    scenarios: [],
    out: 'reports/latest.md',
    seed: 1,
    workers: null,
    base: { config: {}, tuning: {} },
    sweep: [],
    stuckSeconds: 10,
    calibrationMatches: 200,
    calibrationSkills: parseSkillGrid('0.5:1:0.05'),
    target: 1.1,
    arena: NIGHT_MARKET.id,
    json: true,
    quiet: false,
    help: false,
  };
  let scenarioNames = 'all';
  const custom: ScenarioDef[] = [];
  const args = argv[0] === '--' ? argv.slice(1) : [...argv];
  for (let i = 0; i < args.length; i++) {
    const flag = args[i]!;
    const [name, inline] = flag.startsWith('--') && flag.includes('=') && !flag.startsWith('--set') && !flag.startsWith('--sweep') && !flag.startsWith('--custom')
      ? [flag.slice(0, flag.indexOf('=')), flag.slice(flag.indexOf('=') + 1)]
      : [flag, undefined];
    const value = (): string => {
      if (inline !== undefined) return inline;
      const v = args[++i];
      if (v === undefined) throw new Error(`${name} needs a value`);
      return v;
    };
    switch (name) {
      case '--':
        break;
      case '-h':
      case '--help':
        o.help = true;
        break;
      case '--matches':
        o.matches = int(name, value(), 1);
        break;
      case '--scenario':
      case '--scenarios':
        scenarioNames = value();
        break;
      case '--custom':
        custom.push(parseCustomScenario(value()));
        break;
      case '--out':
        o.out = value();
        break;
      case '--no-json':
        o.json = false;
        break;
      case '--seed':
        o.seed = int(name, value());
        break;
      case '--workers':
        o.workers = int(name, value());
        break;
      case '--bots':
        o.botsModule = value();
        break;
      case '--set': {
        const [k, v] = parseKeyValue(name, value());
        o.base = applyOverride(o.base, k, parseValue(k, v));
        break;
      }
      case '--sweep': {
        const [k, v] = parseKeyValue(name, value());
        const { scope, name: key } = resolveKey(k);
        const full = `${scope}.${key}`;
        const values = splitValues(v).map((x) => parseValue(full, x));
        if (values.length === 0) throw new Error(`--sweep ${k} has no values`);
        for (const x of values) applyOverride({ config: {}, tuning: {} }, full, x); // type-check each value
        if (o.sweep.some((a) => a.key === full)) throw new Error(`--sweep ${full} given twice`);
        o.sweep.push({ key: full, values });
        break;
      }
      case '--max-ticks':
        o.maxTicks = int(name, value(), 1);
        break;
      case '--stuck-seconds':
        o.stuckSeconds = num(name, value());
        break;
      case '--calibration-matches':
        o.calibrationMatches = int(name, value(), 1);
        break;
      case '--calibration-skills':
        o.calibrationSkills = parseSkillGrid(value());
        break;
      case '--target':
        o.target = num(name, value());
        break;
      case '--gap-skill':
        o.gapSkill = num(name, value());
        break;
      case '--arena':
        o.arena = value();
        break;
      case '--quiet':
        o.quiet = true;
        break;
      default:
        throw new Error(`unknown option '${flag}'\n\n${USAGE}`);
    }
  }
  o.scenarios = selectScenarios(scenarioNames, custom);
  return o;
}
