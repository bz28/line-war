/** Metric extraction on small hand-built event streams over a real Night Market state. */
import { INGREDIENTS, NIGHT_MARKET, RECIPES } from '@line-war/content';
import { createMatch, makeConfig, NO_INPUT, type Item, type MatchInputs, type MatchState, type SimEvent } from '@line-war/sim';
import { describe, expect, it } from 'vitest';
import { aggregate } from '../src/aggregate';
import { Collector, ENDGAME_GRACE_SECONDS } from '../src/collector';
import type { MatchRecord, RoundRecord } from '../src/types';

const IDLE: MatchInputs = [NO_INPUT, NO_INPUT, NO_INPUT, NO_INPUT];

function setup(botSlots = [true, true, true, true]): { state: MatchState; c: Collector } {
  const state = createMatch({ arena: NIGHT_MARKET, recipes: RECIPES, ingredients: INGREDIENTS, config: makeConfig({ seed: 1 }) });
  state.round.phase = 'service';
  return { state, c: new Collector(state, { seed: 1, botSlots, stuckSeconds: 10 }) };
}

/** Advance one tick with the given events, as step() would leave them. */
function tick(state: MatchState, c: Collector, events: SimEvent[] = [], inputs: MatchInputs = IDLE): void {
  state.tick++;
  state.round.tick++;
  state.events = events;
  c.observe(state, inputs);
}

function endRound(state: MatchState, c: Collector, scores: [number, number] = [0, 0]): RoundRecord {
  const winner = scores[0] > scores[1] ? 0 : scores[1] > scores[0] ? 1 : null;
  state.round.phase = 'roundOver';
  tick(state, c, [{ type: 'roundEnd', winner, scores }]);
  return c.rounds.at(-1)!;
}

let nextId = 1000;
const plate = (contents: { kind: 'bun' | 'meat' | 'lettuce' | 'tomato'; state: 'raw' | 'cooked' | 'chopped' }[], extra: Partial<Item> = {}): Item =>
  ({ id: nextId++, type: 'plate', dirty: false, contents, platedAtTick: contents.length ? 0 : null, cold: false, ...extra }) as Item;

const WIDTH = NIGHT_MARKET.rows[0]!.length;
const tile = (x: number, y: number): number => y * WIDTH + x;
const station = (state: MatchState, x: number, y: number) => state.stations[String(tile(x, y))]!;
const delivered = (team: 0 | 1, recipe: string, ticketId = 1): SimEvent => ({ type: 'delivered', team, ticketId, recipe, points: 60 });

describe('contested tickets', () => {
  it('counts a delivery when the rival holds a plate that is part of the same recipe', () => {
    const { state, c } = setup();
    state.players[2].holding = plate([{ kind: 'bun', state: 'raw' }]);
    tick(state, c, [delivered(0, 'burger')]);
    expect(endRound(state, c).contested).toBe(1);
  });

  it('counts matching food cooking on the rival stove (as cooked)', () => {
    const { state, c } = setup();
    // Crew B's pan at (23, 11) with raw meat cooking.
    station(state, 23, 11).vessel = { kind: 'pan', contents: [{ kind: 'meat', state: 'raw' }], cookTicks: 10, status: 'cooking' };
    tick(state, c, [delivered(0, 'burger')]);
    expect(endRound(state, c).contested).toBe(1);
  });

  it('ignores the rival working on a different recipe, cold plates, and the server’s own crew', () => {
    const { state, c } = setup();
    state.players[2].holding = plate([{ kind: 'lettuce', state: 'chopped' }]); // salad/steak, not burger
    state.players[3].holding = plate([{ kind: 'bun', state: 'raw' }], { cold: true });
    state.players[1].holding = plate([{ kind: 'bun', state: 'raw' }]); // same crew as the server
    tick(state, c, [delivered(0, 'burger')]);
    const r = endRound(state, c);
    expect(r.contested).toBe(0);
    expect(r.served).toEqual([1, 0]);
    expect(r.servedByRecipe.burger).toEqual([1, 0]);
  });
});

describe('wasted dishes', () => {
  it('counts plates going cold for the crew that has them', () => {
    const { state, c } = setup();
    const p = plate([{ kind: 'bun', state: 'raw' }], { cold: true });
    station(state, 1, 3).item = p; // crew A counter
    tick(state, c, [{ type: 'plateCold', itemId: p.id }]);
    expect(endRound(state, c).wasted.cold).toEqual([1, 0]);
  });

  it('counts trashing a warm plate with food, but not an empty or already-cold one', () => {
    const { state, c } = setup();
    const warm = plate([{ kind: 'lettuce', state: 'chopped' }]);
    const empty = plate([]);
    const cold = plate([{ kind: 'bun', state: 'raw' }], { cold: true });
    state.players[2].holding = warm;
    state.players[3].holding = empty;
    state.players[0].holding = cold;
    tick(state, c); // collector sees the plates with their food
    const trash = tile(17, 11);
    for (const p of [warm, empty, cold]) if (p.type === 'plate') p.contents = [];
    tick(state, c, [
      { type: 'drop', player: 2, itemId: warm.id, tile: trash },
      { type: 'drop', player: 3, itemId: empty.id, tile: trash },
      { type: 'drop', player: 0, itemId: cold.id, tile: tile(7, 11) },
    ]);
    expect(endRound(state, c).wasted.trashed).toEqual([0, 1]);
  });

  it('counts plated food never served at round end', () => {
    const { state, c } = setup();
    station(state, 23, 3).item = plate([{ kind: 'lettuce', state: 'chopped' }, { kind: 'tomato', state: 'chopped' }]);
    station(state, 1, 4).item = plate([]); // empty plate: not waste
    expect(endRound(state, c).wasted.leftover).toEqual([0, 1]);
  });
});

describe('knocks, tickets, critic, lead changes', () => {
  it('counts a steal only when the knocker’s crew picks the popped item up first', () => {
    const { state, c } = setup();
    tick(state, c, [{ type: 'knock', by: 0, victim: 2, itemId: 50 }]);
    tick(state, c, [{ type: 'grab', player: 1, itemId: 50 }]);
    tick(state, c, [{ type: 'knock', by: 0, victim: 3, itemId: 51 }]);
    tick(state, c, [{ type: 'grab', player: 3, itemId: 51 }]);
    tick(state, c, [{ type: 'grab', player: 0, itemId: 51 }]); // too late: already recovered
    const r = endRound(state, c);
    expect(r.knocks).toEqual([2, 0]);
    expect(r.steals).toEqual([1, 0]);
  });

  it('tracks ticket outcomes per recipe, the Critic winner and lead changes', () => {
    const { state, c } = setup();
    tick(state, c, [
      { type: 'ticketSpawn', ticketId: 1, recipe: 'salad', isCritic: false },
      { type: 'ticketSpawn', ticketId: 2, recipe: 'salad', isCritic: false },
      { type: 'ticketSpawn', ticketId: 3, recipe: 'soup', isCritic: false },
      { type: 'ticketSpawn', ticketId: 4, recipe: 'steak', isCritic: true },
    ]);
    state.teams[0].score = 40;
    tick(state, c, [delivered(0, 'salad', 1)]);
    state.teams[1].score = 300;
    tick(state, c, [delivered(1, 'steak', 4)]);
    tick(state, c, [{ type: 'ticketExpired', ticketId: 3 }]);
    const r = endRound(state, c, [40, 300]);
    expect(r.tickets.salad).toEqual({ spawned: 2, served: 1, expired: 0, leftover: 1 });
    expect(r.tickets.soup).toEqual({ spawned: 1, served: 0, expired: 1, leftover: 0 });
    expect(r.tickets.steak!.spawned).toBe(0); // the Critic is tracked separately
    expect(r.critic).toEqual({ recipe: 'steak', visibleTo: null, winner: 1 });
    expect(r.leadChanges).toBe(1);
    expect(r.winner).toBe(1);
    expect(r.margin).toBeCloseTo(260 / 300);
  });

  it('records scores when Dinner Rush starts and starts a new record on the next round', () => {
    const { state, c } = setup();
    state.teams[0].score = 120;
    state.teams[1].score = 80;
    tick(state, c, [{ type: 'phaseChange', phase: 'rush' }]);
    endRound(state, c, [120, 200]);
    state.round.index = 1;
    state.round.phase = 'prep';
    tick(state, c, [{ type: 'phaseChange', phase: 'prep' }]);
    endRound(state, c);
    expect(c.rounds.map((r) => r.index)).toEqual([0, 1]);
    expect(c.rounds[0]!.rushStartScores).toEqual([120, 80]);
    expect(c.rounds[1]!.rushStartScores).toBeNull();
  });
});

describe('comeback rate', () => {
  const round = (rush: [number, number] | null, winner: 0 | 1 | null): RoundRecord =>
    ({ ...emptyRound(), rushStartScores: rush, winner, scores: winner === 0 ? [2, 1] : winner === 1 ? [1, 2] : [1, 1] }) as RoundRecord;
  const emptyRound = (): RoundRecord => {
    const { state, c } = setup();
    return endRound(state, c);
  };

  it('is the share of rounds won by the crew trailing at the start of Dinner Rush', () => {
    const rounds = [round([100, 50], 1), round([100, 50], 0), round([30, 90], 0), round([60, 60], 1), round(null, 0)];
    const rec: MatchRecord = { seed: 1, ticks: 0, runaway: false, winner: null, roundsWon: [0, 0], totalScores: [0, 0], rounds, stuck: [] };
    const a = aggregate('x', [rec]);
    expect(a.comeback).toEqual({ eligible: 3, comebacks: 2, rate: 2 / 3 });
  });
});

describe('stuck detection', () => {
  const TEN_S = 10 * 30;
  const ticket = { id: 1, recipe: 'salad', spawnTick: 0, expireTick: 1e9, baseValue: 40, isCritic: false, visibleTo: null, revealAllAtTick: null };

  it('flags a bot that neither moves nor presses grab/work/throw for more than 10 s while tickets exist', () => {
    const { state, c } = setup();
    state.tickets = [ticket];
    for (let i = 0; i < TEN_S; i++) tick(state, c);
    expect(c.stuck).toHaveLength(0);
    tick(state, c);
    expect(c.stuck.map((s) => s.player)).toEqual([0, 1, 2, 3]);
    expect(c.stuck[0]).toMatchObject({ seed: 1, round: 0, tick: state.tick, idleSeconds: 10 });
    for (let i = 0; i < TEN_S * 2; i++) tick(state, c);
    expect(c.stuck).toHaveLength(4); // one event per idle spell
  });

  it('does not flag while no tickets exist (prep), idle non-bot slots, or players pressing work', () => {
    const { state, c } = setup([true, false, true, true]);
    for (let i = 0; i < TEN_S * 3; i++) tick(state, c);
    expect(c.stuck).toHaveLength(0);
    state.tickets = [ticket];
    const working: MatchInputs = [{ ...NO_INPUT, work: true }, NO_INPUT, { ...NO_INPUT, grab: true }, NO_INPUT];
    for (let i = 0; i < TEN_S + 5; i++) {
      state.players[3].pos.x += i % 2 === 0 ? 0.3 : -0.3; // keeps moving
      tick(state, c, [], working);
    }
    expect(c.stuck).toHaveLength(0);
  });

  it('does not count idling in the last ENDGAME_GRACE_SECONDS of a round (no dish can be finished)', () => {
    const { state, c } = setup([true, false, false, false]);
    state.tickets = [ticket];
    state.round.tick = (state.config.roundSeconds - ENDGAME_GRACE_SECONDS) * 30;
    for (let i = 0; i < TEN_S * 2; i++) {
      tick(state, c);
      state.round.tick++;
    }
    expect(c.stuck).toHaveLength(0);
  });

  it('treats jitter within 0.25 tiles as not moving', () => {
    const { state, c } = setup([true, false, false, false]);
    state.tickets = [ticket];
    for (let i = 0; i <= TEN_S; i++) {
      state.players[0].pos.x += i % 2 === 0 ? 0.01 : -0.01;
      tick(state, c);
    }
    expect(c.stuck).toHaveLength(1);
  });
});

describe('scoring economy: points by source, Heat drops, cold causes', () => {
  const T = { recipe: 'salad', spawnTick: 0, expireTick: 1e9, isCritic: false, visibleTo: null, revealAllAtTick: null };

  it('splits a delivery into base, Critic, Heat and rush in formula order, and counts charm points', () => {
    const { state, c } = setup();
    state.tickets = [
      { ...T, id: 1, baseValue: 40 },
      { ...T, id: 2, recipe: 'steak', baseValue: 300, isCritic: true },
    ];
    tick(state, c, [
      { type: 'ticketSpawn', ticketId: 1, recipe: 'salad', isCritic: false },
      { type: 'ticketSpawn', ticketId: 2, recipe: 'steak', isCritic: true },
    ]);
    // Salad at Heat 2 (×1.5) in rush (×1.5): 40 → base 40, heat 20, rush 30 = 90.
    state.round.phase = 'rush';
    tick(state, c, [{ type: 'delivered', team: 0, ticketId: 1, recipe: 'salad', points: 90 }]);
    // Critic steak at Heat 0, no rush: 300 → base 100, Critic 200.
    state.round.phase = 'service';
    tick(state, c, [
      { type: 'delivered', team: 1, ticketId: 2, recipe: 'steak', points: 300 },
      { type: 'charmBanked', team: 1, player: 2, itemId: 9, variant: 'gold' },
    ]);
    const r = endRound(state, c, [90, 350]);
    expect(r.points.base[0]).toBeCloseTo(40);
    expect(r.points.heat[0]).toBeCloseTo(20);
    expect(r.points.rush[0]).toBeCloseTo(30);
    expect(r.points.base[1]).toBeCloseTo(100);
    expect(r.points.critic[1]).toBeCloseTo(200);
    expect(r.points.charm).toEqual([0, state.config.tuning.charmPoints]);
    const a = aggregate('x', [{ seed: 1, ticks: 0, runaway: false, winner: 1, roundsWon: [0, 1], totalScores: r.scores, rounds: [r], stuck: [] }]);
    const share = a.pointsShare;
    expect(share.base + share.critic + share.heat + share.rush + share.charm).toBeCloseTo(1);
    expect(share.critic).toBeCloseTo(200 / 440);
  });

  it('counts Heat drops but not rises', () => {
    const { state, c } = setup();
    tick(state, c, [{ type: 'heatChange', team: 0, heat: 1 }]);
    tick(state, c, [{ type: 'heatChange', team: 0, heat: 2 }]);
    tick(state, c, [{ type: 'heatChange', team: 0, heat: 1 }]);
    tick(state, c, [{ type: 'heatChange', team: 1, heat: 1 }]);
    expect(endRound(state, c).heatDrops).toEqual([1, 0]);
  });

  it('classifies cold plates: finished with no ticket (sniped), finished with a ticket (slow), unfinished (partial)', () => {
    const { state, c } = setup();
    const salad = [{ kind: 'lettuce' as const, state: 'chopped' as const }, { kind: 'tomato' as const, state: 'chopped' as const }];
    const sniped = plate(salad, { cold: true });
    const partial = plate([{ kind: 'lettuce', state: 'chopped' }], { cold: true });
    station(state, 1, 3).item = sniped;
    station(state, 1, 4).item = partial;
    tick(state, c, [
      { type: 'plateCold', itemId: sniped.id },
      { type: 'plateCold', itemId: partial.id },
    ]);
    const slow = plate(salad, { cold: true });
    station(state, 23, 3).item = slow;
    state.tickets = [{ ...T, id: 7, baseValue: 40 }];
    tick(state, c, [{ type: 'plateCold', itemId: slow.id }]);
    const r = endRound(state, c);
    expect(r.wasted.cold).toEqual([2, 1]);
    expect(r.coldCause).toEqual({ sniped: [1, 0], slow: [0, 1], partial: [1, 0] });
  });
});
