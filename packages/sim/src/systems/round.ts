/**
 * OWNER: rules track (PR "sim-rules").
 * Round clock and phases: prep -> service -> rush -> lastCall -> roundOver -> next round / matchOver.
 * Handles critic timing hand-off to tickets, kitchen swap and full reset between rounds.
 * Spec: docs/RULES.md §9.
 */
import { createStations, spawnPlayers } from '../match';
import { secondsToTicks, timerTicks } from '../tuning';
import type { MatchState, Phase, TeamId } from '../types';
import { phaseAt, roundStartTick, roundTimes } from './rules/timing';

/** Rounds a team needs to win the match. */
export const roundsToWin = (state: MatchState): number => Math.ceil(state.config.bestOf / 2);

function setPhase(state: MatchState, phase: Phase): void {
  if (state.round.phase === phase) return;
  state.round.phase = phase;
  state.events.push({ type: 'phaseChange', phase });
}

function endRound(state: MatchState): void {
  const [a, b] = state.teams;
  const winner: TeamId | null = a.score > b.score ? 0 : b.score > a.score ? 1 : null;
  if (winner !== null) state.teams[winner].roundsWon++;
  state.round.intermissionTicks = secondsToTicks(state.config, state.config.tuning.intermissionSeconds);
  setPhase(state, 'roundOver');
  state.events.push({ type: 'roundEnd', winner, scores: [a.score, b.score] });
}

/** Full reset for the next round (RULES §9). roundsWon is kept; the kitchen swap stays off. */
export function startNextRound(state: MatchState): void {
  const { arena, config } = state;
  const r = state.round;
  r.swapped = false;
  state.stations = createStations(arena, config);
  state.players = spawnPlayers(arena, r.swapped);
  state.floorItems = [];
  state.fires = [];
  state.tickets = [];
  state.dirtyPlateReturns = [];
  for (const t of state.teams) {
    t.score = 0;
    t.heat = 0;
    t.cleanStreak = 0;
  }
  r.index++;
  r.tick = 0;
  r.intermissionTicks = 0;
  r.criticSpawned = false;
  setPhase(state, 'prep');
}

export function updateRound(state: MatchState): void {
  const r = state.round;
  if (r.phase === 'matchOver') return;

  if (r.phase === 'roundOver') {
    if (r.intermissionTicks > 0) r.intermissionTicks--;
    if (r.intermissionTicks > 0) return;
    const need = roundsToWin(state);
    const winner = state.teams[0].roundsWon >= need ? 0 : state.teams[1].roundsWon >= need ? 1 : null;
    if (winner !== null) {
      state.winner = winner;
      setPhase(state, 'matchOver');
      state.events.push({ type: 'matchEnd', winner });
      return;
    }
    startNextRound(state);
    r.tick++;
    // First ticket spawns when prep ends (global tick, like round 0's createMatch value).
    state.nextTicketTick = roundStartTick(state) + roundTimes(state.config).prepEnd;
  } else {
    r.tick++;
  }

  const next = phaseAt(state.config, r.tick);
  if (next === 'roundOver') {
    endRound(state);
    return;
  }
  const entersRush = next === 'rush' && r.phase !== 'rush';
  setPhase(state, next);
  if (entersRush) {
    // The ticket scheduled during service may be a full service interval away: pull it in
    // so the first rush ticket comes at most one rush interval after Dinner Rush starts.
    const rushNext = state.tick + timerTicks(state.config, state.config.tuning.rushTicketSpawnSeconds);
    state.nextTicketTick = Math.min(state.nextTicketTick, rushNext);
  }
}
