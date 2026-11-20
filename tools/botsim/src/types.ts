/** Records produced by the botsim runner and collector. All plain JSON. */
import type { BotOptions } from '@line-war/bots';
import type { MatchConfig, PlayerId, RecipeId, TeamId, Tuning } from '@line-war/sim';

export type Pair = [number, number];

/** A player with no movement and no grab/work/throw input for longer than the threshold while tickets exist. */
export interface StuckEvent {
  seed: number;
  /** Global tick at which the threshold was crossed. */
  tick: number;
  round: number;
  player: PlayerId;
  /** Seconds idle when flagged (= threshold). */
  idleSeconds: number;
  pos: { x: number; y: number };
  holding: string | null;
}

/** Ticket outcomes for one recipe (regular tickets only; the Critic is tracked separately). */
export interface TicketCounts {
  spawned: number;
  served: number;
  expired: number;
  /** Still on the board when the round ended. */
  leftover: number;
}

export interface CriticRecord {
  recipe: RecipeId;
  /** Team that saw it first (the trailing crew), null if the score was tied. */
  visibleTo: TeamId | null;
  /** Crew that served it; null if it expired or was still on the board at round end. */
  winner: TeamId | null;
}

export interface RoundRecord {
  index: number;
  winner: TeamId | null;
  scores: Pair;
  /** |a − b| / max(a, b); 0 when both scored 0. */
  margin: number;
  /** Scores sampled once per second of the round clock (index = second). */
  timeline: { a: number[]; b: number[] };
  served: Pair;
  /** Deliveries per recipe per crew (Critic included). */
  servedByRecipe: Record<RecipeId, Pair>;
  /** Regular-ticket outcomes per recipe. */
  tickets: Record<RecipeId, TicketCounts>;
  /** Deliveries where the rival crew had a dish in progress that matched the served recipe. */
  contested: number;
  /** Plated food lost, by crew: went cold, trashed while still warm, or still on a plate at round end. */
  wasted: { cold: Pair; trashed: Pair; leftover: Pair };
  /** Knocks landed, by the knocker's crew. */
  knocks: Pair;
  /** Knocks where the knocker's crew was the next to pick up the popped item. */
  steals: Pair;
  burns: Pair;
  /** fireStart events (spreads included), by owning crew of the tile. */
  fires: Pair;
  /** Ticks spent at each Heat tier (service, rush and last call only), per crew. */
  heatTicks: [number[], number[]];
  critic: CriticRecord | null;
  /** Scores when Dinner Rush began; null if rush is disabled. */
  rushStartScores: Pair | null;
  /** Times the (non-tied) leader changed during the round, counted at each delivery. */
  leadChanges: number;
  /** Charms (RULES §10): spawned, banked by each crew, faded, and knocks on charm carriers (by the knocker's crew). */
  charms: { spawned: number; banked: Pair; faded: number; knocks: Pair };
}

export interface MatchRecord {
  seed: number;
  ticks: number;
  /** True if maxTicks was reached before the match ended. */
  runaway: boolean;
  winner: TeamId | null;
  roundsWon: Pair;
  totalScores: Pair;
  rounds: RoundRecord[];
  stuck: StuckEvent[];
}

export type ConfigOverrides = Partial<Omit<MatchConfig, 'tuning' | 'seed'>>;
export type TuningOverrides = Partial<Tuning>;

/** Serializable description of one match (what workers receive). */
export interface MatchSpec {
  arena: string;
  seed: number;
  slots: (BotOptions | null)[];
  config?: ConfigOverrides;
  tuning?: TuningOverrides;
  maxTicks?: number;
  stuckSeconds?: number;
  /** Module exporting `createBots` (same contract as @line-war/bots). Default: @line-war/bots. */
  botsModule?: string;
}
