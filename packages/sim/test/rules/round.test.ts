import { describe, expect, it } from 'vitest';
import { step, type MatchState, type Phase } from '../../src';
import { IDLE } from '../fixtures';
import { addTicket, newRulesMatch, ofType, SALAD, stepN, stepUntil, type ConfigOverrides } from './helpers';

/** Run one round and record the round tick of every phase change. */
function phaseTimeline(overrides: ConfigOverrides): [number, Phase][] {
  const s = newRulesMatch(overrides);
  const out: [number, Phase][] = [];
  while (s.round.phase !== 'roundOver') {
    step(s, IDLE);
    for (const e of s.events) if (e.type === 'phaseChange') out.push([s.round.tick, e.phase]);
  }
  return out;
}

describe('round phases', () => {
  it('follows prep/service/rush/lastCall/roundOver with the default config', () => {
    expect(phaseTimeline({})).toEqual([
      [15 * 30, 'service'],
      [180 * 30, 'rush'],
      [230 * 30, 'lastCall'],
      [240 * 30, 'roundOver'],
    ]);
  });

  it('has no rush when rushEnabled is false', () => {
    expect(phaseTimeline({ rushEnabled: false })).toEqual([
      [15 * 30, 'service'],
      [230 * 30, 'lastCall'],
      [240 * 30, 'roundOver'],
    ]);
  });

  it('scales with a shorter roundSeconds', () => {
    expect(phaseTimeline({ roundSeconds: 90, prepSeconds: 5 })).toEqual([
      [5 * 30, 'service'],
      [30 * 30, 'rush'],
      [80 * 30, 'lastCall'],
      [90 * 30, 'roundOver'],
    ]);
  });

  it('is still prep one tick before prep ends', () => {
    const s = newRulesMatch();
    stepN(s, 15 * 30 - 1);
    expect(s.round.phase).toBe('prep');
    step(s, IDLE);
    expect(s.round.phase).toBe('service');
  });
});

/** Step to the end of the current round with the given scores set just before the end. */
function finishRound(s: MatchState, scores: [number, number]) {
  stepUntil(s, (x) => x.round.tick === x.config.roundSeconds * 30 - 1);
  s.teams[0].score = scores[0];
  s.teams[1].score = scores[1];
  step(s, IDLE);
  return s.events;
}

/** Step through the intermission (until play resumes or the match ends). */
const finishIntermission = (s: MatchState) => stepUntil(s, (x) => x.round.phase !== 'roundOver');

const SHORT: ConfigOverrides = { roundSeconds: 30, prepSeconds: 2, tuning: { rushSeconds: 10 } };

describe('round end', () => {
  it('gives the round to the higher score and emits roundEnd', () => {
    const s = newRulesMatch(SHORT);
    const ev = finishRound(s, [10, 30]);
    expect(s.round.phase).toBe('roundOver');
    expect(s.teams.map((t) => t.roundsWon)).toEqual([0, 1]);
    expect(ofType(ev, 'roundEnd')).toEqual([{ type: 'roundEnd', winner: 1, scores: [10, 30] }]);
    expect(s.round.intermissionTicks).toBe(5 * 30);
  });

  it('gives nobody the round on a tie', () => {
    const s = newRulesMatch(SHORT);
    const ev = finishRound(s, [20, 20]);
    expect(s.teams.map((t) => t.roundsWon)).toEqual([0, 0]);
    expect(ofType(ev, 'roundEnd')[0]?.winner).toBeNull();
  });

  it('waits intermissionSeconds, then starts the next round', () => {
    const s = newRulesMatch(SHORT);
    finishRound(s, [1, 0]);
    const ev = stepN(s, 5 * 30 - 1);
    expect(s.round.phase).toBe('roundOver');
    expect(ev).toEqual([]);
    step(s, IDLE);
    expect(s.round.phase).toBe('prep');
    expect(s.round.index).toBe(1);
    expect(s.round.tick).toBe(1);
    expect(ofType(s.events, 'phaseChange')).toEqual([{ type: 'phaseChange', phase: 'prep' }]);
  });

  it('ends a best-of-3 after two wins', () => {
    const s = newRulesMatch(SHORT);
    finishRound(s, [5, 0]);
    finishIntermission(s);
    finishRound(s, [9, 3]);
    const ev = finishIntermission(s);
    expect(s.round.phase).toBe('matchOver');
    expect(s.winner).toBe(0);
    expect(s.round.index).toBe(1);
    expect(ofType(ev, 'matchEnd')).toEqual([{ type: 'matchEnd', winner: 0 }]);
    // Nothing moves after the match is over.
    const tick = s.round.tick;
    expect(stepN(s, 100)).toEqual([]);
    expect(s.round.tick).toBe(tick);
  });

  /** Play rounds with the given scores; returns events from the last intermission. */
  function playRounds(s: MatchState, rounds: [number, number][]) {
    let ev: ReturnType<typeof finishIntermission> = [];
    for (const r of rounds) {
      finishRound(s, r);
      ev = finishIntermission(s);
    }
    return ev;
  }

  it('is capped at bestOf rounds: all level on rounds and points is a draw', () => {
    const s = newRulesMatch(SHORT);
    const ev = playRounds(s, [
      [5, 0],
      [0, 5],
      [3, 3],
    ]);
    expect(s.round.index).toBe(2);
    expect(s.round.phase).toBe('matchOver');
    expect(s.winner).toBeNull();
    expect(s.totalScores).toEqual([8, 8]);
    expect(ofType(ev, 'matchEnd')).toEqual([{ type: 'matchEnd', winner: null }]);
    expect(stepN(s, 50)).toEqual([]); // nothing runs after the match
  });

  it('after bestOf rounds without a majority, more round wins takes the match', () => {
    const s = newRulesMatch(SHORT);
    const ev = playRounds(s, [
      [2, 2],
      [4, 4],
      [0, 1],
    ]);
    expect(s.teams.map((t) => t.roundsWon)).toEqual([0, 1]);
    expect(s.round.phase).toBe('matchOver');
    expect(s.winner).toBe(1);
    expect(ofType(ev, 'matchEnd')).toEqual([{ type: 'matchEnd', winner: 1 }]);
  });

  it('level on round wins after bestOf rounds: more total match points wins', () => {
    const s = newRulesMatch(SHORT);
    playRounds(s, [
      [50, 0],
      [0, 30],
      [7, 7],
    ]);
    expect(s.teams.map((t) => t.roundsWon)).toEqual([1, 1]);
    expect(s.totalScores).toEqual([57, 37]);
    expect(s.winner).toBe(0);
    expect(s.round.phase).toBe('matchOver');
  });

  it('keeps playing before bestOf rounds even after ties, and keeps totals across rounds', () => {
    const s = newRulesMatch(SHORT);
    playRounds(s, [[3, 3]]);
    expect(s.round.phase).toBe('prep');
    expect(s.round.index).toBe(1);
    expect(s.totalScores).toEqual([3, 3]);
    expect(s.teams.map((t) => t.score)).toEqual([0, 0]);
  });

  it('respects bestOf (best of 1 ends after one win)', () => {
    const s = newRulesMatch({ ...SHORT, bestOf: 1 });
    finishRound(s, [0, 1]);
    finishIntermission(s);
    expect(s.round.phase).toBe('matchOver');
    expect(s.winner).toBe(1);
  });

  it('fully resets the next round but keeps roundsWon', () => {
    const s = newRulesMatch(SHORT);
    stepN(s, 3 * 30);
    s.teams[0] = { score: 50, roundsWon: 0, heat: 2, cleanStreak: 5 };
    s.teams[1].heat = 1;
    s.players[0].pos = { x: 4.5, y: 1.5 };
    s.players[0].holding = { id: 999, type: 'ingredient', kind: 'lettuce', state: 'raw' };
    s.floorItems.push({ item: { id: 998, type: 'ingredient', kind: 'bun', state: 'raw' }, pos: { x: 4.5, y: 2.5 }, vel: { x: 0, y: 0 }, thrownBy: null, thrownAtTick: null, travelled: 0 });
    s.fires.push({ tile: 10, spreadAtTick: 0, extinguishTicks: 0 });
    s.dirtyPlateReturns.push({ team: 0, atTick: 1e9 });
    s.stations['11']!.workTicks = 7;
    s.round.criticSpawned = true;
    addTicket(s, SALAD);
    finishRound(s, [50, 0]);
    finishIntermission(s);

    const fresh = newRulesMatch(SHORT);
    expect(s.round).toEqual({ index: 1, phase: 'prep', tick: 1, intermissionTicks: 0, criticSpawned: false, swapped: false });
    expect(s.teams).toEqual([
      { score: 0, roundsWon: 1, heat: 0, cleanStreak: 0 },
      { score: 0, roundsWon: 0, heat: 0, cleanStreak: 0 },
    ]);
    expect(s.players).toEqual(fresh.players);
    expect(s.stations).toEqual(fresh.stations);
    expect(s.floorItems).toEqual([]);
    expect(s.fires).toEqual([]);
    expect(s.tickets).toEqual([]);
    expect(s.dirtyPlateReturns).toEqual([]);
    // First ticket of the new round is due exactly when its prep ends.
    expect(s.nextTicketTick).toBe(s.tick - 1 + 2 * 30);
  });

  it('spawns the first ticket of round 2 when its prep ends', () => {
    const s = newRulesMatch(SHORT);
    finishRound(s, [1, 0]);
    finishIntermission(s);
    const ev = stepUntil(s, (x) => x.tickets.length > 0);
    expect(s.round.tick).toBe(2 * 30);
    expect(ofType(ev, 'phaseChange').map((e) => e.phase)).toEqual(['service']);
  });
});
