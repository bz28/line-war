import { describe, expect, it } from 'vitest';
import { step, type MatchState, type Phase, type SimEvent } from '../../src';
import { deliverPlate, isVisibleTo } from '../../src/systems/tickets';
import { IDLE } from '../fixtures';
import { facePass, newRulesMatch, ofType, plate } from './helpers';

const ROUND_TICKS = 240 * 30;
const INTERMISSION_TICKS = 5 * 30;

/** Team 0 serves every ticket it can see the moment it appears; team 1 stays idle. */
function serveEverythingForTeam0(s: MatchState) {
  facePass(s, 0);
  for (const t of [...s.tickets]) {
    if (!isVisibleTo(t, 0)) continue;
    const recipe = s.recipes.find((r) => r.id === t.recipe)!;
    const res = deliverPlate(s, 0, plate(s, recipe.ingredients));
    expect(res.ok).toBe(true);
  }
}

function run(s: MatchState, act: (s: MatchState) => void, maxTicks: number) {
  const events: SimEvent[] = [];
  while (s.round.phase !== 'matchOver' && s.tick < maxTicks) {
    step(s, IDLE);
    if (s.round.phase === 'service' || s.round.phase === 'rush' || s.round.phase === 'lastCall') act(s);
    events.push(...s.events); // step events plus anything act() emitted
  }
  return events;
}

describe('full match smoke test (default config, idle inputs)', () => {
  it('ends a best-of-3 in two rounds when one team scores', () => {
    const s = newRulesMatch();
    const events = run(s, serveEverythingForTeam0, 10 * ROUND_TICKS);
    expect(s.round.phase).toBe('matchOver');
    expect(s.winner).toBe(0);
    expect(s.round.index).toBe(1);
    expect(s.teams.map((t) => t.roundsWon)).toEqual([2, 0]);
    expect(s.tick).toBe(2 * (ROUND_TICKS + INTERMISSION_TICKS) - 1);
    const phases = ofType(events, 'phaseChange').map((e) => e.phase);
    const round: Phase[] = ['service', 'rush', 'lastCall', 'roundOver'];
    expect(phases).toEqual([...round, 'prep', ...round, 'matchOver']);
    expect(ofType(events, 'roundEnd').map((e) => e.winner)).toEqual([0, 0]);
    expect(ofType(events, 'matchEnd')).toEqual([{ type: 'matchEnd', winner: 0 }]);
    // Each round had a critic and team 0 reached max heat.
    expect(ofType(events, 'ticketSpawn').filter((e) => e.isCritic)).toHaveLength(2);
    expect(ofType(events, 'heatChange').some((e) => e.team === 0 && e.heat === 3)).toBe(true);
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });

  it('keeps playing extra rounds while every round is a tie', () => {
    const s = newRulesMatch();
    run(s, () => {}, 3 * (ROUND_TICKS + INTERMISSION_TICKS) + 10);
    expect(s.round.phase).not.toBe('matchOver');
    expect(s.round.index).toBe(3);
    expect(s.teams.map((t) => t.roundsWon)).toEqual([0, 0]);
    expect(s.winner).toBeNull();
  });

  it('is deterministic over a full match', () => {
    const a = newRulesMatch({ seed: 99 });
    const b = newRulesMatch({ seed: 99 });
    run(a, serveEverythingForTeam0, 10 * ROUND_TICKS);
    run(b, serveEverythingForTeam0, 10 * ROUND_TICKS);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
