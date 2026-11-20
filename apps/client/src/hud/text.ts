import type { MatchState, Phase, TeamId } from '@line-war/sim';
import { TEAMS } from '../art/tokens';

/** Player-facing copy for the HUD. Sentence case, crew names from the art tokens. */

export const crewName = (team: TeamId): string => TEAMS[team].name;

export const CREW_NAMES: Record<TeamId, string> = { 0: TEAMS[0].name, 1: TEAMS[1].name };

/** 1234 -> "1,234". */
export const formatScore = (n: number): string => Math.round(n).toLocaleString('en-US');

/** 1.25 -> "×1.25", 2 -> "×2". */
export const formatMult = (n: number): string => `×${Number(n.toFixed(2))}`;

export function phaseName(s: MatchState, phase: Phase = s.round.phase): string {
  switch (phase) {
    case 'prep':
      return 'Prep';
    case 'service':
      return 'Service';
    case 'rush':
      return `Dinner Rush ${formatMult(s.config.tuning.rushMultiplier)}`;
    case 'lastCall':
      return 'Last call';
    case 'roundOver':
      return 'Round over';
    case 'matchOver':
      return 'Match over';
  }
}

export function roundLabel(s: MatchState): string {
  return s.config.bestOf === 1 ? 'Single round' : `Round ${s.round.index + 1} of ${s.config.bestOf}`;
}
