/**
 * LINE WAR — shared simulation contracts.
 *
 * Everything in MatchState is plain, JSON-serializable data so the same state can be
 * rendered locally, sent over the network, or snapshotted in tests.
 *
 * Units: positions are in TILES (1 tile = 1 unit, tile (x,y) spans [x,x+1) x [y,y+1)).
 * Time inside the sim is counted in TICKS (config.tuning.tickRate per second).
 * Tuning values are authored in SECONDS and converted with secondsToTicks().
 */

// ---------- basics ----------

export type TeamId = 0 | 1;
/** Players 0 and 1 are team 0; players 2 and 3 are team 1. */
export type PlayerId = 0 | 1 | 2 | 3;
export const PLAYER_IDS: readonly PlayerId[] = [0, 1, 2, 3];
export const teamOf = (p: PlayerId): TeamId => (p < 2 ? 0 : 1);

export interface Vec2 {
  x: number;
  y: number;
}

// ---------- food and items ----------

export type IngredientKind = 'lettuce' | 'tomato' | 'bun' | 'meat' | 'steak' | 'fish';
export type FoodState = 'raw' | 'chopped' | 'cooked' | 'burnt';
export type VesselKind = 'pan' | 'pot';

/** A piece of food inside a plate or vessel (no identity needed). */
export interface Food {
  kind: IngredientKind;
  state: FoodState;
}

export interface IngredientItem {
  id: number;
  type: 'ingredient';
  kind: IngredientKind;
  state: FoodState;
}

export interface PlateItem {
  id: number;
  type: 'plate';
  dirty: boolean;
  contents: Food[];
  /** Tick when the last food was added; the plate goes cold plateColdSeconds later. null = empty. */
  platedAtTick: number | null;
  /** True once the plate has gone cold. Cold plates cannot be served; trash them. */
  cold: boolean;
}

export type Item = IngredientItem | PlateItem;

/** Static description of an ingredient (content data). */
export interface IngredientDef {
  kind: IngredientKind;
  name: string;
  premium: boolean;
  choppable: boolean;
  /** Vessel it cooks in, and which state it must be in to go in. null = not cookable. */
  cook: { vessel: VesselKind; from: FoodState } | null;
}

export type RecipeId = string;

export interface RecipeDef {
  id: RecipeId;
  name: string;
  /** Exact multiset of food the plate must contain (order does not matter). */
  ingredients: Food[];
  premium: boolean;
  baseValue: number;
  /** Relative chance this recipe is picked when a ticket spawns. */
  weight: number;
}

// ---------- arena ----------

export type TileKind =
  | 'floor'
  | 'wall'
  | 'counter' // holds one item
  | 'pantry' // infinite basic ingredient source
  | 'crate' // market crate: limited stock of a premium ingredient
  | 'board' // chopping board: holds one item, X to chop
  | 'stove' // holds a vessel (pan or pot)
  | 'sink' // dirty plates go in, X to wash, clean plate comes out
  | 'plates' // clean plate rack (team-owned stack)
  | 'pass' // serving window
  | 'trash'; // destroys food / empties plates

export type Zone = 'kitchen0' | 'kitchen1' | 'market' | 'none';

export interface TileDef {
  kind: TileKind;
  ingredient?: IngredientKind; // pantry, crate
  vessel?: VesselKind; // stove
}

/** Authored arena (content package). */
export interface ArenaDef {
  id: string;
  name: string;
  /** ASCII rows, all the same length. */
  rows: string[];
  legend: Record<string, TileDef>;
  /** Inclusive column ranges per zone; anything else is 'none'. */
  zones: { kitchen0: [number, number]; market: [number, number]; kitchen1: [number, number] };
  /** Spawn positions (tile centers, in tiles) indexed by PlayerId. */
  spawns: [Vec2, Vec2, Vec2, Vec2];
}

/** Arena as the sim uses it (flattened, index = y * width + x). */
export interface ArenaRuntime {
  id: string;
  name: string;
  width: number;
  height: number;
  tiles: TileDef[];
  zones: Zone[];
  /** Owning team of each tile (from its zone), null in market/none. */
  owners: (TeamId | null)[];
  spawns: [Vec2, Vec2, Vec2, Vec2];
}

// ---------- dynamic state ----------

export type VesselStatus = 'empty' | 'cooking' | 'done' | 'burnt' | 'fire';

export interface VesselState {
  kind: VesselKind;
  contents: Food[];
  /** Seconds-equivalent progress in ticks since cooking started. */
  cookTicks: number;
  status: VesselStatus;
}

/** Dynamic state of an interactive tile. Keyed by tile index in MatchState.stations. */
export interface StationState {
  tile: number;
  /** Item resting on the surface (counter, board, pass, sink...). */
  item: Item | null;
  /** Work progress in ticks (chopping, washing). */
  workTicks: number;
  vessel: VesselState | null;
  /**
   * Market crates: remaining stock (topped up by market.ts so it is always at least
   * 1 + the number of board tickets that need this ingredient). Plates rack: clean plates.
   */
  stock: number;
  /** Sink: number of dirty plates waiting. */
  dirtyPlates: number;
}

export interface FireState {
  tile: number;
  /** Tick at which this fire spreads to a neighbour. */
  spreadAtTick: number;
  /** Ticks of extinguishing applied so far. */
  extinguishTicks: number;
}

export interface FloorItem {
  item: Item;
  pos: Vec2;
  vel: Vec2;
  /** Player who threw/knocked it (for events); null if dropped by the world. */
  thrownBy: PlayerId | null;
  /** Tick it was thrown (thrower can't catch it for 0.2 s); null if not thrown. */
  thrownAtTick: number | null;
  /** Tiles travelled so far in flight (stops at tuning.throwRange). */
  travelled: number;
}

export interface PlayerState {
  id: PlayerId;
  team: TeamId;
  pos: Vec2;
  /** Unit vector of the last movement direction (used for interact target + throw). */
  facing: Vec2;
  vel: Vec2;
  holding: Item | null;
  /** Ticks until dash is available again. */
  dashCooldown: number;
  /** Ticks remaining in an active dash. */
  dashTicks: number;
  /** Unit direction of the current/last dash (knocks pop items this way). */
  dashDir: Vec2;
  /** True once this dash has already triggered a knock attempt. */
  dashHit: boolean;
  /** Ticks remaining of immunity to being knocked. */
  knockImmuneTicks: number;
  /** Ticks remaining dazed after being knocked: half speed, cannot grab or dash. */
  dazedTicks: number;
  /** True while the player is holding Work on a valid target this tick. */
  working: boolean;
}

export interface Ticket {
  id: number;
  recipe: RecipeId;
  spawnTick: number;
  expireTick: number;
  baseValue: number;
  isCritic: boolean;
  /** Critic tickets are visible to the trailing team first; null = visible to all. */
  visibleTo: TeamId | null;
  /** Tick when visibleTo resets to null. */
  revealAllAtTick: number | null;
}

export interface TeamState {
  /** Score in the current round. */
  score: number;
  roundsWon: number;
  /** Heat tier 0..3 (index into tuning.heatMultipliers). */
  heat: number;
  /** Consecutive clean deliveries (drives heat tier). */
  cleanStreak: number;
}

export type Phase = 'prep' | 'service' | 'rush' | 'lastCall' | 'roundOver' | 'matchOver';

export interface RoundState {
  /** 0-based round number. */
  index: number;
  phase: Phase;
  /** Tick within the current round (0 at round start). */
  tick: number;
  /** Ticks to wait in 'roundOver' before the next round starts. */
  intermissionTicks: number;
  criticSpawned: boolean;
  /** Teams swap kitchens each round: if true, team 0 plays kitchen1. */
  swapped: boolean;
}

export interface MatchState {
  /** Global tick since match start. */
  tick: number;
  config: MatchConfig;
  arena: ArenaRuntime;
  recipes: RecipeDef[];
  ingredients: Record<IngredientKind, IngredientDef>;
  players: [PlayerState, PlayerState, PlayerState, PlayerState];
  /** Interactive tiles by tile index (as string key for JSON safety). */
  stations: Record<string, StationState>;
  floorItems: FloorItem[];
  fires: FireState[];
  tickets: Ticket[];
  nextTicketTick: number;
  /** Plates served at the pass come back dirty to that team's sink after a delay. */
  dirtyPlateReturns: { team: TeamId; atTick: number }[];
  teams: [TeamState, TeamState];
  round: RoundState;
  /** Seeded RNG state (mulberry32). Only mutate via rng.ts. */
  rngState: number;
  /** Monotonic id source for items and tickets. */
  nextId: number;
  /** Events produced during the most recent step() call. Cleared at the start of each step. */
  events: SimEvent[];
  /** Match winner once phase is 'matchOver'; null while playing, or for a drawn match. */
  winner: TeamId | null;
  /**
   * Points per team summed over every completed round of the match (match tiebreak, RULES §9).
   * Added at each round end; reset only by createMatch.
   */
  totalScores: [number, number];
}

// ---------- inputs ----------

/**
 * One player's input for one tick. Button fields are EDGE-triggered (true only on the
 * tick the button went down) except `work`, which is true while held. The client is
 * responsible for edge detection.
 */
export interface PlayerInput {
  /** Desired movement, each axis in [-1, 1]. Length is clamped to 1 by the sim. */
  move: Vec2;
  grab: boolean;
  work: boolean;
  dash: boolean;
  throw: boolean;
}

export const NO_INPUT: PlayerInput = Object.freeze({
  move: Object.freeze({ x: 0, y: 0 }),
  grab: false,
  work: false,
  dash: false,
  throw: false,
}) as PlayerInput;

export type MatchInputs = [PlayerInput, PlayerInput, PlayerInput, PlayerInput];

// ---------- events (for rendering, audio, stats) ----------

export type SimEvent =
  | { type: 'grab'; player: PlayerId; itemId: number }
  | { type: 'drop'; player: PlayerId; itemId: number; tile: number | null }
  | { type: 'throw'; player: PlayerId; itemId: number }
  | { type: 'dash'; player: PlayerId }
  | { type: 'knock'; by: PlayerId; victim: PlayerId; itemId: number }
  | { type: 'chopDone'; tile: number }
  | { type: 'washDone'; tile: number }
  | { type: 'cookDone'; tile: number }
  | { type: 'burnt'; tile: number }
  | { type: 'fireStart'; tile: number }
  | { type: 'fireOut'; tile: number }
  | { type: 'ticketSpawn'; ticketId: number; recipe: RecipeId; isCritic: boolean }
  | { type: 'ticketExpired'; ticketId: number }
  | { type: 'delivered'; team: TeamId; ticketId: number; recipe: RecipeId; points: number }
  | { type: 'serveRefused'; player: PlayerId }
  | { type: 'plateCold'; itemId: number }
  | { type: 'heatChange'; team: TeamId; heat: number }
  | { type: 'phaseChange'; phase: Phase }
  | { type: 'roundEnd'; winner: TeamId | null; scores: [number, number] }
  | { type: 'matchEnd'; winner: TeamId | null };

// ---------- config ----------

export interface Tuning {
  tickRate: number;
  playerSpeed: number; // tiles / s
  playerRadius: number; // tiles
  interactReach: number; // tiles from player center to target tile center
  dashDistance: number; // tiles
  dashSeconds: number;
  dashCooldownSeconds: number;
  throwRange: number; // tiles
  throwSpeed: number; // tiles / s
  chopSeconds: number;
  washSeconds: number;
  panCookSeconds: number;
  panBurnSeconds: number; // after done
  potCookSeconds: number;
  potBurnSeconds: number; // after done
  potCapacity: number;
  fireAfterBurnSeconds: number;
  fireSpreadSeconds: number;
  extinguishSeconds: number;
  maxTickets: number;
  ticketLifetimeSeconds: number;
  ticketSpawnSeconds: number;
  rushTicketSpawnSeconds: number;
  freshnessFloor: number; // multiplier at expiry (1.0 when fresh)
  tipWindowSeconds: number;
  tipPoints: number;
  heatThresholds: [number, number, number]; // clean deliveries for tier 1, 2, 3
  heatMultipliers: [number, number, number, number];
  /** Critic ticket appears at this fraction of the round (0.5 = halfway). */
  criticAtFraction: number;
  criticMultiplier: number;
  criticEarlySeconds: number;
  /** Dinner Rush is the final N seconds of the round (includes Last Call). */
  rushSeconds: number;
  rushMultiplier: number;
  lastCallSeconds: number;
  /** Crates always hold this many more than the board tickets needing them. */
  marketExtraStock: number;
  knockImmuneSeconds: number;
  dazeSeconds: number;
  /** Distance a knocked item travels in the dasher's direction. */
  knockPopDistance: number;
  platesPerTeam: number;
  dirtyPlateReturnSeconds: number;
  intermissionSeconds: number;
  plateColdSeconds: number;
}

export interface MatchConfig {
  roundSeconds: number;
  prepSeconds: number;
  /** Rounds needed to win = ceil(bestOf / 2). */
  bestOf: number;
  rushEnabled: boolean;
  criticEnabled: boolean;
  /** "Brunch Speed": multiplies all cook/burn/spawn timers by 1.5. */
  brunchSpeed: boolean;
  seed: number;
  tuning: Tuning;
}
