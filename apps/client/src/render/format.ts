import { secondsToTicks, timerTicks } from '@line-war/sim';
import type { MatchState, Phase, TeamId, Ticket, VesselState } from '@line-war/sim';
import { PALETTE, WORLD } from '../art/tokens';

/** Pure formatting / derived-number helpers for the renderer. Never mutate state. */

/** 83.2 -> "1:24" (rounds up so the clock reads 0:00 only when time is really out). */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds - 1e-9));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export const roundSeconds = (s: MatchState): number => s.round.tick / s.config.tuning.tickRate;

/** Seconds left in the current round. */
export function roundSecondsLeft(s: MatchState): number {
  return Math.max(0, s.config.roundSeconds - roundSeconds(s));
}

export function phaseLabel(phase: Phase): string {
  switch (phase) {
    case 'prep':
      return 'PREP';
    case 'service':
      return 'SERVICE';
    case 'rush':
      return 'DINNER RUSH';
    case 'lastCall':
      return 'LAST CALL';
    case 'roundOver':
      return 'ROUND OVER';
    case 'matchOver':
      return 'MATCH OVER';
  }
}

/** Round time (seconds) at which the given in-round phase starts; null for between-round phases. */
export function phaseStartSeconds(s: MatchState, phase: Phase): number | null {
  const c = s.config;
  switch (phase) {
    case 'prep':
      return 0;
    case 'service':
      return c.prepSeconds;
    case 'rush':
      return c.roundSeconds - c.tuning.rushSeconds;
    case 'lastCall':
      return c.roundSeconds - c.tuning.lastCallSeconds;
    default:
      return null;
  }
}

export const isRushActive = (s: MatchState): boolean =>
  s.config.rushEnabled && (s.round.phase === 'rush' || s.round.phase === 'lastCall');

export const roundsToWin = (s: MatchState): number => Math.ceil(s.config.bestOf / 2);

export interface Banner {
  title: string;
  subtitle: string;
  color: string;
  /** Draw a full-screen dim behind it (between rounds). */
  overlay: boolean;
}

/** How long the big DINNER RUSH / LAST CALL banner stays up after the phase starts. */
export const PHASE_BANNER_SECONDS = 2.5;

/** The big centred banner to show now, or null. Derived from state only (deterministic). */
export function phaseBanner(s: MatchState, names: Record<TeamId, string>): Banner | null {
  const phase = s.round.phase;
  const t = roundSeconds(s);
  const [a, b] = s.teams;
  switch (phase) {
    case 'prep':
      return {
        title: 'PREP',
        subtitle: `Service starts in ${formatClock(s.config.prepSeconds - t)}`,
        color: WORLD.frost,
        overlay: false,
      };
    case 'rush':
    case 'lastCall': {
      const start = phaseStartSeconds(s, phase) ?? 0;
      if (t - start > PHASE_BANNER_SECONDS) return null;
      return phase === 'rush'
        ? { title: 'DINNER RUSH', subtitle: `Points x${s.config.tuning.rushMultiplier}`, color: PALETTE.lanternHot, overlay: false }
        : { title: 'LAST CALL', subtitle: 'No new tickets', color: PALETTE.danger, overlay: false };
    }
    case 'roundOver': {
      const w = a.score === b.score ? null : a.score > b.score ? 0 : 1;
      return {
        title: `ROUND ${s.round.index + 1} OVER`,
        subtitle: `${names[0]} ${Math.round(a.score)} - ${Math.round(b.score)} ${names[1]}   ${w === null ? 'TIE' : `${names[w]} WINS THE ROUND`}`,
        color: PALETTE.paper,
        overlay: true,
      };
    }
    case 'matchOver':
      return {
        title: 'MATCH OVER',
        subtitle: `${s.winner === null ? 'DRAW' : `${names[s.winner]} WINS`}   rounds ${a.roundsWon} - ${b.roundsWon}`,
        color: PALETTE.lantern,
        overlay: true,
      };
    case 'service':
      return null;
  }
}

/** Fraction of a ticket's lifetime remaining (1 = fresh, 0 = expiring). */
export function ticketTimeLeft(s: MatchState, t: Ticket): number {
  const life = t.expireTick - t.spawnTick;
  if (life <= 0) return 0;
  return Math.max(0, Math.min(1, (t.expireTick - s.tick) / life));
}

/** Freshness multiplier per RULES.md section 8. */
export function ticketFreshness(s: MatchState, t: Ticket): number {
  const life = t.expireTick - t.spawnTick;
  const age = Math.max(0, Math.min(life, s.tick - t.spawnTick));
  return 1 - (1 - s.config.tuning.freshnessFloor) * (life > 0 ? age / life : 1);
}

/**
 * Points this ticket would pay right now (before tips). `heat` defaults to 0 so the
 * value shown is team-neutral; pass a team's heat to get that team's payout.
 */
export function ticketValue(s: MatchState, t: Ticket, heat = 0): number {
  const heatMult = s.config.tuning.heatMultipliers[heat] ?? 1;
  const rush = isRushActive(s) ? s.config.tuning.rushMultiplier : 1;
  return Math.round(t.baseValue * ticketFreshness(s, t) * heatMult * rush);
}

/** Critic first, then oldest first (the order a plate would claim them in). */
export function sortTickets(tickets: readonly Ticket[]): Ticket[] {
  return [...tickets].sort((x, y) => Number(y.isCritic) - Number(x.isCritic) || x.spawnTick - y.spawnTick || x.id - y.id);
}

/** Seconds until a team-exclusive Critic ticket is revealed to everyone; null if already public. */
export function criticExclusiveSeconds(s: MatchState, t: Ticket): number | null {
  if (t.visibleTo === null) return null;
  if (t.revealAllAtTick === null) return Infinity;
  return Math.max(0, (t.revealAllAtTick - s.tick) / s.config.tuning.tickRate);
}

export type ProgressKind = 'cook' | 'burn' | 'fire' | 'work';

export interface Progress {
  kind: ProgressKind;
  /** 0..1 */
  fraction: number;
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** Cook / burn-warning / fire-countdown progress of a vessel; null when nothing is cooking. */
export function vesselProgress(s: MatchState, v: VesselState): Progress | null {
  const tu = s.config.tuning;
  const cookT = timerTicks(s.config, v.kind === 'pan' ? tu.panCookSeconds : tu.potCookSeconds);
  const burnT = timerTicks(s.config, v.kind === 'pan' ? tu.panBurnSeconds : tu.potBurnSeconds);
  const fireT = timerTicks(s.config, tu.fireAfterBurnSeconds);
  switch (v.status) {
    case 'empty':
      return null;
    case 'cooking':
      return { kind: 'cook', fraction: clamp01(v.cookTicks / cookT) };
    case 'done':
      return { kind: 'burn', fraction: clamp01((v.cookTicks - cookT) / burnT) };
    case 'burnt':
      return { kind: 'fire', fraction: clamp01((v.cookTicks - cookT - burnT) / fireT) };
    case 'fire':
      return { kind: 'fire', fraction: 1 };
  }
}

export const chopProgress = (s: MatchState, workTicks: number): number =>
  clamp01(workTicks / timerTicks(s.config, s.config.tuning.chopSeconds));

export const washProgress = (s: MatchState, workTicks: number): number =>
  clamp01(workTicks / timerTicks(s.config, s.config.tuning.washSeconds));

export const extinguishProgress = (s: MatchState, extinguishTicks: number): number =>
  clamp01(extinguishTicks / secondsToTicks(s.config, s.config.tuning.extinguishSeconds));

/** Dash cooldown remaining as a fraction (1 = just used, 0 = ready). */
export const dashCooldownFraction = (s: MatchState, cooldownTicks: number): number =>
  clamp01(cooldownTicks / secondsToTicks(s.config, s.config.tuning.dashCooldownSeconds));
