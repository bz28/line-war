import type { MatchState, PlayerState, TeamId } from '@line-war/sim';

/**
 * Game-feel timing curves for the world renderer. Pure functions of state and renderer time,
 * so they are testable and never touch the sim.
 */

/** How long a serve hop lasts (ms). */
export const SERVE_HOP_MS = 420;
/** Period of the winners' victory bounce (ms). */
export const CHEER_PERIOD_MS = 620;
/** Hit-stop on a knock: the whole match holds this long so the impact lands (ms). */
export const HIT_STOP_MS = 85;
/** Seconds of service the "this is you" arrow stays up after prep. */
export const YOU_ARROW_TAIL_SECONDS = 2.5;

export interface Hop {
  /** Lift off the ground as a fraction of the chef radius. */
  lift: number;
  /** Squash (+) / stretch (-) about the feet, as a scale delta. */
  squash: number;
}

/**
 * One hop: a quick crouch, a parabolic jump with stretch, and a squashy landing.
 * `t` is 0..1 through the hop; outside that range the chef is at rest.
 */
export function hopAt(t: number, out: Hop, height = 0.55): Hop {
  out.lift = 0;
  out.squash = 0;
  if (!(t > 0 && t < 1)) return out;
  if (t < 0.15) {
    out.squash = 0.18 * Math.sin((t / 0.15) * Math.PI); // anticipation crouch
  } else if (t < 0.8) {
    const k = (t - 0.15) / 0.65;
    out.lift = height * 4 * k * (1 - k);
    out.squash = -0.14 * (1 - k); // stretch on the way up, relaxing at the top
  } else {
    out.squash = 0.22 * Math.sin(((t - 0.8) / 0.2) * Math.PI); // landing squash
  }
  return out;
}

/**
 * Directional camera kick for a knock, 0..1 at effect age `age` (0..1): snaps out along the dash
 * in the first frames, then eases back so the impact reads as a punch, not a wobble.
 */
export function knockKick(age: number): number {
  if (!(age >= 0) || age >= 1) return 0;
  return age < 0.1 ? age / 0.1 : (1 - (age - 0.1) / 0.9) ** 3;
}

/** The team that is celebrating right now (round or match winner), or null. */
export function celebratingTeam(s: MatchState): TeamId | null {
  const phase = s.round.phase;
  if (phase === 'matchOver') return s.winner;
  if (phase !== 'roundOver') return null;
  const [a, b] = s.teams;
  return a.score === b.score ? null : a.score > b.score ? 0 : 1;
}

/**
 * Opacity of the bobbing "you" arrow over a local human chef: full through prep (so the player
 * finds themselves before tickets arrive), fading over the first seconds of service.
 */
export function youArrowAlpha(s: MatchState): number {
  const phase = s.round.phase;
  if (phase === 'prep') return 1;
  if (phase === 'roundOver' || phase === 'matchOver') return 0;
  const since = s.round.tick / s.config.tuning.tickRate - s.config.prepSeconds;
  if (since >= YOU_ARROW_TAIL_SECONDS) return 0;
  return Math.max(0, 1 - since / YOU_ARROW_TAIL_SECONDS);
}

/** The chef of `team` standing closest to `pos` (the one who just served at the pass). */
export function nearestOfTeam(players: readonly PlayerState[], team: TeamId, pos: { x: number; y: number }): PlayerState | null {
  let best: PlayerState | null = null;
  let bestD = Infinity;
  for (const p of players) {
    if (p.team !== team) continue;
    const d = (p.pos.x - pos.x) ** 2 + (p.pos.y - pos.y) ** 2;
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
}
