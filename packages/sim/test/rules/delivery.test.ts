import { beforeEach, describe, expect, it } from 'vitest';
import type { MatchState } from '../../src';
import { deliverPlate } from '../../src/systems/tickets';
import { addTicket, facePass, newRulesMatch, ofType, plate, SALAD, SALAD_FOOD, STEAK, STEAK_FOOD, stepToRoundTick, type ConfigOverrides } from './helpers';

/** A match in service with an empty board and no automatic spawns; player 0 faces their pass. */
function inService(overrides: ConfigOverrides = {}): MatchState {
  const s = newRulesMatch({ criticEnabled: false, ...overrides });
  stepToRoundTick(s, 20 * 30);
  expect(s.round.phase).toBe('service');
  s.tickets = [];
  s.nextTicketTick = Number.MAX_SAFE_INTEGER;
  s.events = [];
  facePass(s, 0);
  facePass(s, 2);
  return s;
}

describe('deliverPlate success', () => {
  let s: MatchState;
  beforeEach(() => {
    s = inService();
  });

  it('wins the oldest matching visible ticket, scores it, queues the dirty plate and emits delivered', () => {
    const newer = addTicket(s, SALAD, { spawnTick: s.tick - 10 });
    const older = addTicket(s, SALAD, { spawnTick: s.tick - 20 });
    const steak = addTicket(s, STEAK);
    const res = deliverPlate(s, 0, plate(s, SALAD_FOOD));
    expect(res).toEqual({ ok: true, ticketId: older.id, points: expect.any(Number) });
    expect(s.tickets.map((t) => t.id)).toEqual([newer.id, steak.id]);
    expect(s.teams[0].score).toBe(res.ok ? res.points : -1);
    expect(s.teams[1].score).toBe(0);
    expect(s.teams[0].cleanStreak).toBe(1);
    expect(s.dirtyPlateReturns).toEqual([{ team: 0, atTick: s.tick + 5 * 30 }]);
    expect(s.events).toEqual([{ type: 'delivered', team: 0, ticketId: older.id, recipe: 'salad', points: res.ok ? res.points : -1 }]);
  });

  it('scores base value on a fresh ticket with no heat', () => {
    addTicket(s, SALAD);
    expect(deliverPlate(s, 0, plate(s, SALAD_FOOD))).toMatchObject({ ok: true, points: 40 });
  });

  it('applies freshness, heat and both teams independently', () => {
    addTicket(s, SALAD, { spawnTick: s.tick - 30 * 30, expireTick: s.tick + 30 * 30 }); // half-way: freshness 0.75
    s.teams[1].heat = 2;
    s.teams[1].cleanStreak = 4;
    const res = deliverPlate(s, 2, plate(s, SALAD_FOOD));
    expect(res).toMatchObject({ ok: true, points: Math.round(40 * 0.75 * 1.5) });
    expect(s.teams[1].score).toBe(45);
    expect(s.dirtyPlateReturns[0]?.team).toBe(1);
  });

  it('accepts a critic ticket visible to the team (critic value)', () => {
    addTicket(s, STEAK, { isCritic: true, baseValue: 300, visibleTo: 0, revealAllAtTick: s.tick + 90 });
    expect(deliverPlate(s, 0, plate(s, STEAK_FOOD))).toMatchObject({ ok: true, points: 300 });
  });

  it('raises heat after enough clean deliveries and emits heatChange', () => {
    addTicket(s, SALAD);
    addTicket(s, SALAD);
    deliverPlate(s, 0, plate(s, SALAD_FOOD));
    expect(ofType(s.events, 'heatChange')).toEqual([]);
    s.events = [];
    deliverPlate(s, 0, plate(s, SALAD_FOOD));
    expect(s.teams[0].heat).toBe(1);
    expect(ofType(s.events, 'heatChange')).toEqual([{ type: 'heatChange', team: 0, heat: 1 }]);
  });
});

describe('deliverPlate refusals (no penalty)', () => {
  function expectRefused(s: MatchState, res: ReturnType<typeof deliverPlate>, reason: string) {
    expect(res).toEqual({ ok: false, reason });
    expect(s.events).toEqual([{ type: 'serveRefused', player: 0 }]);
    expect(s.teams.map((t) => t.score)).toEqual([0, 0]);
    expect(s.teams[0].cleanStreak).toBe(0);
    expect(s.dirtyPlateReturns).toEqual([]);
  }

  it('refuses during prep', () => {
    const s = newRulesMatch();
    stepToRoundTick(s, 30);
    s.events = [];
    facePass(s, 0);
    addTicket(s, SALAD);
    expectRefused(s, deliverPlate(s, 0, plate(s, SALAD_FOOD)), 'notPlaying');
    expect(s.tickets).toHaveLength(1);
  });

  it('refuses when not facing a pass', () => {
    const s = inService();
    addTicket(s, SALAD);
    s.players[0].facing = { x: 0, y: -1 };
    expectRefused(s, deliverPlate(s, 0, plate(s, SALAD_FOOD)), 'notOwnPass');
  });

  it("refuses at the rival team's pass", () => {
    const s = inService();
    addTicket(s, SALAD);
    s.players[0].pos = { x: 7.5, y: 2.5 };
    s.players[0].facing = { x: 0, y: 1 };
    expectRefused(s, deliverPlate(s, 0, plate(s, SALAD_FOOD)), 'notOwnPass');
  });

  it('refuses a dirty plate', () => {
    const s = inService();
    addTicket(s, SALAD);
    expectRefused(s, deliverPlate(s, 0, plate(s, SALAD_FOOD, { dirty: true })), 'dirtyOrEmpty');
  });

  it('refuses an empty plate', () => {
    const s = inService();
    addTicket(s, SALAD);
    expectRefused(s, deliverPlate(s, 0, plate(s, [], { platedAtTick: null })), 'dirtyOrEmpty');
  });

  it('refuses a cold plate', () => {
    const s = inService();
    addTicket(s, SALAD);
    expectRefused(s, deliverPlate(s, 0, plate(s, SALAD_FOOD, { cold: true })), 'cold');
  });

  it('refuses a plate with no matching ticket', () => {
    const s = inService();
    addTicket(s, STEAK);
    expectRefused(s, deliverPlate(s, 0, plate(s, SALAD_FOOD)), 'noMatchingTicket');
    s.events = [];
    expectRefused(s, deliverPlate(s, 0, plate(s, [SALAD_FOOD[0]!])), 'noMatchingTicket');
  });

  it("refuses a critic ticket that is only visible to the other team", () => {
    const s = inService();
    addTicket(s, STEAK, { isCritic: true, baseValue: 300, visibleTo: 1, revealAllAtTick: s.tick + 90 });
    expectRefused(s, deliverPlate(s, 0, plate(s, STEAK_FOOD)), 'noMatchingTicket');
    expect(s.tickets).toHaveLength(1);
  });
});
