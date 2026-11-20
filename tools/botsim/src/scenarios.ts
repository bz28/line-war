/** Named match-ups. Slots are indexed by PlayerId: 0, 1 = crew A; 2, 3 = crew B. null = idle player. */
import type { BotDifficulty, BotOptions } from '@line-war/bots';

export interface ScenarioDef {
  name: string;
  description: string;
  slots: (BotOptions | null)[];
  /** Both crews are identical, so crew A should win about 50% (side-bias check). */
  even: boolean;
  /** Crew A's skill comes from the throughput calibration (gap-2v2). */
  calibrated?: boolean;
}

const bot = (difficulty: BotDifficulty, skill?: number): BotOptions => (skill === undefined ? { difficulty } : { difficulty, skill });
const N = bot('normal');

export const BUILTIN_SCENARIOS: readonly ScenarioDef[] = [
  { name: 'even-2v2', description: 'Both crews: two normal bots.', slots: [N, N, N, N], even: true },
  {
    name: 'gap-2v2',
    description: 'Crew A: two normal bots at the calibrated skill (≈1.10× solo throughput). Crew B: two normal bots.',
    slots: [N, N, N, N],
    even: false,
    calibrated: true,
  },
  { name: 'even-1v1', description: 'One normal bot per crew; the other slot is empty (stands still).', slots: [N, null, N, null], even: true },
  { name: 'easy-vs-hard', description: 'Crew A: two easy bots. Crew B: two hard bots.', slots: [bot('easy'), bot('easy'), bot('hard'), bot('hard')], even: false },
  {
    name: 'mixed',
    description: "One normal bot per crew in the second slot, next to an idle 'human' teammate in the first slot.",
    slots: [null, N, null, N],
    even: true,
  },
];

export const DIFFICULTIES: readonly BotDifficulty[] = ['easy', 'normal', 'hard'];

function parseSlot(token: string): BotOptions | null {
  const t = token.trim();
  if (t === '-' || t === 'idle' || t === 'none') return null;
  const [diff, skill] = t.split('@');
  if (!DIFFICULTIES.includes(diff as BotDifficulty)) {
    throw new Error(`bad slot '${token}': use easy|normal|hard, optionally @skill (0..1), or '-' for idle`);
  }
  if (skill === undefined) return bot(diff as BotDifficulty);
  const s = Number(skill);
  if (!Number.isFinite(s) || s < 0 || s > 1) throw new Error(`bad skill in '${token}': expected a number in 0..1`);
  return bot(diff as BotDifficulty, s);
}

const crewKey = (slots: (BotOptions | null)[]): string =>
  slots
    .map((s) => (s ? `${s.difficulty}@${s.skill ?? ''}` : '-'))
    .sort()
    .join(',');

/**
 * Custom scenario: `name=<crew A> vs <crew B>`, each crew one or two comma-separated slots:
 * `easy|normal|hard[@skill]` or `-` (idle). Example: `pair=hard,normal vs normal@0.9,-`.
 */
export function parseCustomScenario(spec: string): ScenarioDef {
  const eq = spec.indexOf('=');
  if (eq <= 0) throw new Error(`bad --custom '${spec}': expected name=<crew A> vs <crew B>`);
  const name = spec.slice(0, eq).trim();
  const crews = spec.slice(eq + 1).split(/\s+vs\s+/);
  if (crews.length !== 2) throw new Error(`bad --custom '${spec}': expected exactly one ' vs '`);
  const parsed = crews.map((c) => {
    const slots = c.split(',').map(parseSlot);
    if (slots.length < 1 || slots.length > 2) throw new Error(`bad --custom '${spec}': each crew has 1 or 2 slots`);
    return slots.length === 1 ? [slots[0]!, null] : slots;
  });
  const [a, b] = parsed as [(BotOptions | null)[], (BotOptions | null)[]];
  return {
    name,
    description: `Custom: ${crews[0]!.trim()} vs ${crews[1]!.trim()}.`,
    slots: [...a, ...b],
    even: crewKey(a) === crewKey(b),
  };
}

/** Resolve `--scenario` (comma list or 'all') plus custom definitions. Custom ones are always included. */
export function selectScenarios(names: string, custom: readonly ScenarioDef[] = []): ScenarioDef[] {
  const wanted = names === 'all' ? BUILTIN_SCENARIOS.map((s) => s.name) : names.split(',').map((s) => s.trim()).filter(Boolean);
  const pool = [...BUILTIN_SCENARIOS, ...custom];
  const out: ScenarioDef[] = [];
  for (const n of wanted) {
    const s = pool.find((x) => x.name === n);
    if (!s) throw new Error(`unknown scenario '${n}' (known: ${pool.map((x) => x.name).join(', ')})`);
    if (!out.includes(s)) out.push(s);
  }
  for (const c of custom) if (!out.includes(c)) out.push(c);
  return out;
}
