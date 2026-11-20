import type { MatchConfig, Tuning } from './types';

/** Starting values from the design doc. Tune here, never hard-code numbers in systems. */
export const DEFAULT_TUNING: Tuning = {
  tickRate: 30,
  playerSpeed: 4,
  playerRadius: 0.35,
  interactReach: 1.1,
  dashDistance: 2.5,
  dashSeconds: 0.15,
  dashCooldownSeconds: 1.2,
  throwRange: 5,
  throwSpeed: 12,
  chopSeconds: 2,
  washSeconds: 1.5,
  panCookSeconds: 6,
  panBurnSeconds: 4,
  potCookSeconds: 12,
  potBurnSeconds: 10,
  potCapacity: 3,
  fireAfterBurnSeconds: 3,
  fireSpreadSeconds: 3,
  extinguishSeconds: 1,
  maxTickets: 6,
  ticketLifetimeSeconds: 60,
  ticketSpawnSeconds: 4,
  rushTicketSpawnSeconds: 3,
  freshnessFloor: 0.5,
  tipWindowSeconds: 5,
  tipPoints: 0, // tips are held for later (design doc: Rule count)
  // Heat and rush retuned with botsim on all three levels (balance pass: Heat saturated at [2, 4, 7]).
  heatThresholds: [4, 8, 13],
  heatMultipliers: [1, 1.25, 1.5, 2],
  criticAtFraction: 0.5,
  criticMultiplier: 3,
  criticEarlySeconds: 3,
  rushSeconds: 60,
  rushMultiplier: 1.75,
  lastCallSeconds: 10,
  marketExtraStock: 1,
  knockImmuneSeconds: 1.5,
  dazeSeconds: 0.8,
  knockPopDistance: 1.5,
  platesPerTeam: 4,
  dirtyPlateReturnSeconds: 5,
  intermissionSeconds: 5,
  /** Plated food goes cold (must be trashed) this long after plating. From the design sim. */
  plateColdSeconds: 20,
  // Charms (RULES §10). Tuned with botsim on all three levels.
  charmsPerRound: 3,
  charmLifetimeSeconds: 20,
  charmPoints: 50,
  charmHeatTiers: 1,
};

export const DEFAULT_MATCH_CONFIG: MatchConfig = {
  roundSeconds: 240,
  prepSeconds: 15,
  bestOf: 3,
  rushEnabled: true,
  criticEnabled: true,
  brunchSpeed: false,
  charmsEnabled: true,
  seed: 1,
  tuning: DEFAULT_TUNING,
};

export function makeConfig(overrides: Partial<Omit<MatchConfig, 'tuning'>> & { tuning?: Partial<Tuning> } = {}): MatchConfig {
  const { tuning, ...rest } = overrides;
  return { ...DEFAULT_MATCH_CONFIG, ...rest, tuning: { ...DEFAULT_TUNING, ...tuning } };
}

/** Convert authored seconds to whole ticks (at least 1 for positive durations). */
export function secondsToTicks(config: MatchConfig, seconds: number): number {
  if (seconds <= 0) return 0;
  return Math.max(1, Math.round(seconds * config.tuning.tickRate));
}

/** Same as secondsToTicks but stretched by Brunch Speed. Use for cook/burn/spawn/chop timers. */
export function timerTicks(config: MatchConfig, seconds: number): number {
  return secondsToTicks(config, config.brunchSpeed ? seconds * 1.5 : seconds);
}
