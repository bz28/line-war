/**
 * OWNER: rules track (PR "sim-rules").
 * Points for a delivery (base x freshness x heat x phase multiplier + tip) and Heat tiers.
 * Spec: docs/RULES.md §8.
 */
import { secondsToTicks } from '../tuning';
import type { MatchState, PlateItem, TeamId, Ticket } from '../types';
import { isRushActive } from './rules/timing';

/** 1.0 when the ticket is brand new, falling linearly to freshnessFloor at expiry. */
export function freshness(state: MatchState, ticket: Ticket): number {
  const lifetime = ticket.expireTick - ticket.spawnTick;
  if (lifetime <= 0) return state.config.tuning.freshnessFloor;
  const age = Math.min(lifetime, Math.max(0, state.tick - ticket.spawnTick));
  return 1 - (1 - state.config.tuning.freshnessFloor) * (age / lifetime);
}

/** Heat tier for a clean streak: the number of heatThresholds already reached. */
export const heatForStreak = (state: MatchState, streak: number): number =>
  state.config.tuning.heatThresholds.filter((t) => t <= streak).length;

/**
 * Points this plate earns for this ticket right now, using the team's current Heat.
 * Pure: does not change any state (deliverPlate applies the points and the streak).
 */
export function scoreDelivery(state: MatchState, team: TeamId, ticket: Ticket, plate: PlateItem): number {
  const t = state.config.tuning;
  const heatMult = t.heatMultipliers[state.teams[team].heat] ?? t.heatMultipliers[t.heatMultipliers.length - 1]!;
  const rushMult = isRushActive(state) ? t.rushMultiplier : 1;
  const tipped =
    plate.platedAtTick !== null && state.tick - plate.platedAtTick <= secondsToTicks(state.config, t.tipWindowSeconds);
  return Math.round(ticket.baseValue * freshness(state, ticket) * heatMult * rushMult) + (tipped ? t.tipPoints : 0);
}

function setHeat(state: MatchState, team: TeamId, heat: number): void {
  const ts = state.teams[team];
  if (ts.heat === heat) return;
  ts.heat = heat;
  state.events.push({ type: 'heatChange', team, heat });
}

/** A clean delivery: streak + 1, Heat recomputed from heatThresholds. */
export function registerCleanDelivery(state: MatchState, team: TeamId): void {
  const ts = state.teams[team];
  ts.cleanStreak++;
  setHeat(state, team, heatForStreak(state, ts.cleanStreak));
}

/** A mistake (only burning food, for now) drops the team one Heat tier: the clean streak is set to that tier's threshold. */
export function registerMistake(state: MatchState, team: TeamId): void {
  const ts = state.teams[team];
  if (ts.heat === 0) {
    ts.cleanStreak = 0;
    return;
  }
  const heat = ts.heat - 1;
  ts.cleanStreak = heat === 0 ? 0 : state.config.tuning.heatThresholds[heat - 1]!;
  setHeat(state, team, heat);
}
