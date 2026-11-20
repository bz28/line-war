/**
 * Bot tuning: every fixed number the bots use, in one documented table. Skill-dependent levers
 * live in skill.ts; these are the same for every bot. Times are in ticks (30 per second) unless
 * the name says seconds; distances in tiles.
 */
export const BOT_TUNING = {
  // ---------- executor (bot.ts) ----------
  /** Close enough to a goal tile's centre to count as there. */
  arriveDist: 0.18,
  /** How deep (fraction of a tile) the interaction target must land inside a station. */
  arriveMargin: 0.08,
  /** Distance to a path waypoint's centre at which we move on to the next one. */
  waypointDist: 0.3,
  /** Ticks without getting closer before we count as stuck (then sidestep and repath). */
  stuckTicks: 18,
  /** Stuck this many times in a row: give up on the destination. */
  giveUpLevel: 5,
  /** Repath at least this often, as players move about. */
  repathTicks: 40,
  /** Minimum ticks between Grab presses (a human checks the press worked). */
  grabGapTicks: 3,
  /** Presses of the same act with no effect before the task is abandoned. */
  maxPresses: 6,
  /** Longest a single task may run before it is abandoned. */
  maxTaskTicks: 30 * 30,
  /** Task score from which an empty-handed bot drops routine work for it (see crew scores). */
  urgentPriority: 74,
  /** ...and it must beat the current task by at least this much. */
  preemptMargin: 15,
  /** Path cost added for a tile a slow / moving player's body covers (in STEP_COST units). */
  playerTileCostSlow: 6,
  playerTileCostMoving: 2,

  // ---------- market (bot.ts) ----------
  /** How far away (tiles) a carrier can be for a bot in the market to go after them. */
  huntRange: 7,
  /** Longest a hunt lasts. */
  huntTicks: 120,
  /** Seconds we want to be in place before the rival reaches their doorway. */
  cutMarginSeconds: 0.4,
  /** How long we chase an item we knocked loose. */
  chaseTicks: 75,
  /** A market encounter not seen for this long is forgotten (its decision may be rolled again). */
  episodeTtlTicks: 300,
  /** Knock appetite multiplier while carrying an ingredient (deny, can't steal). */
  knockWhileCarrying: 0.5,
  /** Evasive dash chance as a fraction of the defend lever. */
  evadeShare: 0.6,

  // ---------- charms (RULES §10) ----------
  /** Farthest (path tiles) a resting charm can be for a crewmate to go and fetch it. */
  charmRange: 16,
  /** Knock / hunt appetite multiplier against a rival carrying a charm (they are worth points and Heat). */
  charmAppetite: 1.6,

  // ---------- crew planning (crew.ts) ----------
  /** A task that failed is not offered again for this long. */
  failBlacklistTicks: 45,
  /** How long a dish with progress but no ticket left is kept, hoping a matching ticket spawns. */
  unbackedPatienceSeconds: 12,
  /** Fraction of hunt-willing bots that also go out to watch the market when idle. */
  watchShare: 0.6,
  /** Task score lost per tile of walking to the task. */
  distancePenaltyPerTile: 0.8,
  /** Dish estimates: seconds for a trip to a station the kitchen doesn't have. */
  unknownTripSeconds: 20,
  /** Dish estimates: seconds of handling per station visit (turn, press). */
  tripOverheadSeconds: 0.6,
  /** Dish estimates: seconds of handling per chop on top of chopSeconds. */
  chopOverheadSeconds: 0.5,
  /** Planning slack (seconds) per dish already on the go. */
  slackPerOrderSeconds: 3,
  /** Score multiplier for a dish that can use leftovers already in the kitchen. */
  leftoverBonus: 1.6,
  /** Weight of waiting on the stove vs hands-on time in the dish score. */
  waitWeight: 0.25,
  /** Seconds of round left below which the last-gasp dish isn't started. */
  lastGaspMinSeconds: 2,
  /** Free counters needed before idle stocking, and before tidying a finished item off a board. */
  stockMinFreeCounters: 4,
  tidyMinFreeCounters: 2,
  /** How many of each basic chopped ingredient to keep stocked when idle. */
  stockPerKind: 2,
  /** Hands full and food about to burn / catch fire within this many seconds: park what we hold. */
  parkIngredientRiskSeconds: 3.5,
  parkPlateRiskSeconds: 2,
  /** Tiles assumed for a stove visit we can't path (shouldn't happen on a sane map). */
  unknownTravelTiles: 10,
  /** Travel ticks added on top of walking time when timing a stove visit. */
  stoveTravelPadTicks: 10,

  /** Task scores (higher = more urgent). The executor pre-empts for scores ≥ urgentPriority. */
  score: {
    fire: 100,
    burnt: 95,
    rescueDone: 88,
    rescueSoon: 74,
    /** Scoop a done vessel: base + up to `scoopUrgency` as it nears burning. */
    scoopBase: 85,
    scoopUrgency: 10,
    scoopSoon: 78,
    deliver: 80,
    badPlate: 70,
    holdingSlot: 60,
    choppedToVessel: 56,
    chop: 55,
    toPlate: 54,
    fetch: 50,
    /** Extra for components that go in a pan / pot (start the long jobs first). */
    panBonus: 10,
    potBonus: 6,
    /** Penalties: a dish without a ticket, and each older dish ahead of this one. */
    unbacked: -20,
    perRank: -6,
    getPlate: 44,
    /** Fetch a resting charm (one crewmate at a time), minus distancePenaltyPerTile per path tile. */
    charm: 66,
    /** Washing: no plates and a dish waiting / no plates / one plate / some plates. */
    washUrgent: 70,
    washEmpty: 45,
    washLow: 30,
    washSome: 12,
    trash: 30,
    clearBoardRaw: 22,
    clearBoard: 15,
    /** Idle jobs are only considered while the best offer is below this. */
    idleThreshold: 12,
    watch: 11,
    stock: 10,
  },

  // ---------- tasks (tasks.ts) ----------
  /** Waiting for a free board / vessel before parking the ingredient on a counter. */
  prepWaitTicks: 45,
  /** Head to a cooking stove with the plate if it's done within lead + travel + this. */
  stoveWaitMarginTicks: 90,
  /** Holding something with no free counter: wait this long, then trash / drop it. */
  noSurfaceWaitTicks: 60,
  /** Length of an idle stint, and of a market watch, before re-planning. */
  idleTicks: 20,
  watchTicks: 90,
} as const;
