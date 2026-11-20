/** Aggregate MatchRecords of one scenario into the numbers the report prints. */
import { mean, ratio, sum, wilson, type Interval } from './stats';
import type { MatchRecord, Pair, RoundRecord, StuckEvent } from './types';

/** A round is "close" when the margin is within this share of the winner's score. */
export const CLOSE_MARGIN = 0.1;

export interface RecipeAggregate {
  spawned: number;
  served: number;
  expired: number;
  leftover: number;
  /** (expired + leftover) / spawned: tickets nobody served. */
  skipShare: number;
}

export interface ScenarioAggregate {
  scenario: string;
  matches: number;
  rounds: number;
  runaways: number;
  roundWins: Pair;
  roundDraws: number;
  /** Crew A share of decisive rounds (draws excluded). */
  aRoundWinRate: number;
  aRoundWinCI: Interval;
  matchWins: Pair;
  matchDraws: number;
  pointsPerRound: Pair;
  servedPerRound: Pair;
  meanMargin: number;
  /** Rounds where someone scored. Close-round share is over these. */
  scoredRounds: number;
  closeRoundShare: number;
  comeback: { eligible: number; comebacks: number; rate: number };
  leadChangesPerRound: number;
  knocksPerRound: number;
  steals: number;
  stealRate: number;
  burnsPerRound: number;
  firesPerRound: number;
  served: number;
  contested: number;
  contestedShare: number;
  wastedPerRound: { cold: number; trashed: number; leftover: number; total: number };
  ticketsPerRound: { spawned: number; served: number; expired: number; leftover: number };
  recipes: Record<string, RecipeAggregate>;
  /** Share of service time at each Heat tier, per crew. */
  heatShare: [number[], number[]];
  critic: { spawned: number; wonA: number; wonB: number; unserved: number; trailingFirst: number; trailingWon: number };
  stuck: number;
  stuckSamples: StuckEvent[];
}

const both = (p: Pair): number => p[0] + p[1];
const perRound = (rounds: readonly RoundRecord[], f: (r: RoundRecord) => number): number => mean(rounds.map(f));

export function aggregate(scenario: string, records: readonly MatchRecord[]): ScenarioAggregate {
  const rounds = records.flatMap((m) => m.rounds);
  const n = rounds.length;
  const winsA = rounds.filter((r) => r.winner === 0).length;
  const winsB = rounds.filter((r) => r.winner === 1).length;
  const scored = rounds.filter((r) => Math.max(r.scores[0], r.scores[1]) > 0);

  let eligible = 0;
  let comebacks = 0;
  for (const r of rounds) {
    const s = r.rushStartScores;
    if (!s || s[0] === s[1]) continue;
    eligible++;
    const trailing = s[0] < s[1] ? 0 : 1;
    if (r.winner === trailing) comebacks++;
  }

  const recipes: Record<string, RecipeAggregate> = {};
  for (const r of rounds) {
    for (const [id, c] of Object.entries(r.tickets)) {
      const a = (recipes[id] ??= { spawned: 0, served: 0, expired: 0, leftover: 0, skipShare: 0 });
      a.spawned += c.spawned;
      a.served += c.served;
      a.expired += c.expired;
      a.leftover += c.leftover;
    }
  }
  for (const a of Object.values(recipes)) a.skipShare = ratio(a.expired + a.leftover, a.spawned);

  const heatShare = ([0, 1] as const).map((t) => {
    const ticks = [0, 1, 2, 3].map((tier) => sum(rounds.map((r) => r.heatTicks[t][tier] ?? 0)));
    const total = sum(ticks);
    return ticks.map((x) => ratio(x, total));
  }) as [number[], number[]];

  const critics = rounds.flatMap((r) => (r.critic ? [r.critic] : []));
  const served = sum(rounds.map((r) => both(r.served)));
  const contested = sum(rounds.map((r) => r.contested));
  const knocks = sum(rounds.map((r) => both(r.knocks)));
  const steals = sum(rounds.map((r) => both(r.steals)));
  const stuck = records.flatMap((m) => m.stuck);
  const wasted = {
    cold: perRound(rounds, (r) => both(r.wasted.cold)),
    trashed: perRound(rounds, (r) => both(r.wasted.trashed)),
    leftover: perRound(rounds, (r) => both(r.wasted.leftover)),
    total: 0,
  };
  wasted.total = wasted.cold + wasted.trashed + wasted.leftover;
  const ticketTotal = (f: (c: RoundRecord['tickets'][string]) => number): number =>
    perRound(rounds, (r) => sum(Object.values(r.tickets).map(f)));

  return {
    scenario,
    matches: records.length,
    rounds: n,
    runaways: records.filter((m) => m.runaway).length,
    roundWins: [winsA, winsB],
    roundDraws: n - winsA - winsB,
    aRoundWinRate: ratio(winsA, winsA + winsB, 0.5),
    aRoundWinCI: wilson(winsA, winsA + winsB),
    matchWins: [records.filter((m) => m.winner === 0).length, records.filter((m) => m.winner === 1).length],
    matchDraws: records.filter((m) => !m.runaway && m.winner === null).length,
    pointsPerRound: [perRound(rounds, (r) => r.scores[0]), perRound(rounds, (r) => r.scores[1])],
    servedPerRound: [perRound(rounds, (r) => r.served[0]), perRound(rounds, (r) => r.served[1])],
    meanMargin: mean(scored.map((r) => r.margin)),
    scoredRounds: scored.length,
    closeRoundShare: ratio(scored.filter((r) => r.margin <= CLOSE_MARGIN).length, scored.length),
    comeback: { eligible, comebacks, rate: ratio(comebacks, eligible) },
    leadChangesPerRound: perRound(rounds, (r) => r.leadChanges),
    knocksPerRound: ratio(knocks, n),
    steals,
    stealRate: ratio(steals, knocks),
    burnsPerRound: perRound(rounds, (r) => both(r.burns)),
    firesPerRound: perRound(rounds, (r) => both(r.fires)),
    served,
    contested,
    contestedShare: ratio(contested, served),
    wastedPerRound: wasted,
    ticketsPerRound: {
      spawned: ticketTotal((c) => c.spawned),
      served: ticketTotal((c) => c.served),
      expired: ticketTotal((c) => c.expired),
      leftover: ticketTotal((c) => c.leftover),
    },
    recipes,
    heatShare,
    critic: {
      spawned: critics.length,
      wonA: critics.filter((c) => c.winner === 0).length,
      wonB: critics.filter((c) => c.winner === 1).length,
      unserved: critics.filter((c) => c.winner === null).length,
      trailingFirst: critics.filter((c) => c.visibleTo !== null).length,
      trailingWon: critics.filter((c) => c.visibleTo !== null && c.winner === c.visibleTo).length,
    },
    stuck: stuck.length,
    stuckSamples: stuck.slice(0, 10),
  };
}
