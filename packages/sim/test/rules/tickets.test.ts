import { describe, expect, it } from 'vitest';
import { step, type MatchState } from '../../src';
import { IDLE } from '../fixtures';
import { addTicket, DOUBLE_STEAK, newRulesMatch, ofType, RULE_RECIPES, SALAD, STEAK, stepN, stepToRoundTick, stepUntil, type ConfigOverrides } from './helpers';

/** Round ticks at which regular tickets spawned during one full round. */
function spawnTicks(overrides: ConfigOverrides): number[] {
  const s = newRulesMatch(overrides);
  const out: number[] = [];
  while (s.round.phase !== 'roundOver') {
    step(s, IDLE);
    for (const e of s.events) if (e.type === 'ticketSpawn' && !e.isCritic) out.push(s.round.tick);
  }
  return out;
}

const ROOMY = { maxTickets: 1000, ticketLifetimeSeconds: 1000 };

describe('ticket spawning', () => {
  it('spawns nothing during prep; the first ticket arrives when prep ends', () => {
    const s = newRulesMatch();
    stepN(s, 15 * 30 - 1);
    expect(s.tickets).toEqual([]);
    step(s, IDLE);
    expect(s.tickets).toHaveLength(1);
    expect(ofType(s.events, 'ticketSpawn')).toHaveLength(1);
  });

  it('spawns every ticketSpawnSeconds, at the rush rate in Dinner Rush, and never in Last Call', () => {
    const ticksSeen = spawnTicks({ roundSeconds: 60, prepSeconds: 5, criticEnabled: false, tuning: { ...ROOMY, rushSeconds: 20, lastCallSeconds: 5 } });
    const service = [150, 270, 390, 510, 630, 750, 870, 990, 1110];
    // The interval scheduled in service still applies (1230); after that, every 3 s.
    const rush = [1230, 1320, 1410, 1500, 1590];
    expect(ticksSeen).toEqual([...service, ...rush]);
    expect(ticksSeen.every((t) => t < 55 * 30)).toBe(true);
  });

  it('keeps the service rate when rush is disabled', () => {
    const ticksSeen = spawnTicks({ roundSeconds: 60, prepSeconds: 5, rushEnabled: false, criticEnabled: false, tuning: { ...ROOMY, rushSeconds: 20, lastCallSeconds: 5 } });
    const diffs = ticksSeen.slice(1).map((t, i) => t - ticksSeen[i]!);
    expect(new Set(diffs)).toEqual(new Set([120]));
    expect(ticksSeen.at(-1)).toBeLessThan(55 * 30);
  });

  it('stretches the spawn interval with Brunch Speed', () => {
    const ticksSeen = spawnTicks({ roundSeconds: 30, prepSeconds: 5, brunchSpeed: true, criticEnabled: false, tuning: { ...ROOMY, rushSeconds: 0 } });
    expect(ticksSeen.slice(0, 3)).toEqual([150, 330, 510]);
  });

  it('skips a spawn while maxTickets non-critic tickets are on the board, and retries next interval', () => {
    const s = newRulesMatch({ criticEnabled: false, tuning: { maxTickets: 2, ticketLifetimeSeconds: 1000 } });
    // A critic ticket on the board does not count toward the cap.
    stepToRoundTick(s, 15 * 30 - 1);
    addTicket(s, STEAK, { isCritic: true, baseValue: 300 });
    stepToRoundTick(s, 15 * 30 + 120);
    expect(s.tickets.filter((t) => !t.isCritic)).toHaveLength(2);
    // Third interval: board full, skipped.
    const ev = stepN(s, 120);
    expect(ofType(ev, 'ticketSpawn')).toEqual([]);
    expect(s.tickets.filter((t) => !t.isCritic)).toHaveLength(2);
    // Free a slot: nothing happens until the next interval.
    s.tickets = s.tickets.filter((t) => t.isCritic || t.id !== s.tickets.find((x) => !x.isCritic)!.id);
    expect(ofType(stepN(s, 119), 'ticketSpawn')).toEqual([]);
    expect(ofType(stepN(s, 1), 'ticketSpawn')).toHaveLength(1);
    expect(s.tickets.filter((t) => !t.isCritic)).toHaveLength(2);
  });

  it('gives tickets the recipe base value and lifetime, and expires them', () => {
    const s = newRulesMatch({ criticEnabled: false, tuning: { ticketLifetimeSeconds: 10 } });
    stepToRoundTick(s, 450);
    const first = s.tickets[0]!;
    const recipe = RULE_RECIPES.find((r) => r.id === first.recipe)!;
    expect(first).toMatchObject({ spawnTick: s.tick, expireTick: s.tick + 300, baseValue: recipe.baseValue, isCritic: false, visibleTo: null });
    stepN(s, 299);
    expect(s.tickets.some((t) => t.id === first.id)).toBe(true);
    step(s, IDLE);
    expect(s.tickets.some((t) => t.id === first.id)).toBe(false);
    expect(ofType(s.events, 'ticketExpired')).toEqual([{ type: 'ticketExpired', ticketId: first.id }]);
  });
});

describe('weighted recipe choice', () => {
  const recipesFor = (seed: number): string[] => {
    const s = newRulesMatch({ seed, criticEnabled: false, tuning: ROOMY });
    stepUntil(s, (x) => x.tickets.length >= 40);
    return s.tickets.map((t) => t.recipe);
  };

  it('is deterministic per seed', () => {
    expect(recipesFor(5)).toEqual(recipesFor(5));
    expect(recipesFor(5)).not.toEqual(recipesFor(6));
  });

  it('follows the weights (zero weight is never picked)', () => {
    const recipes = [SALAD, { ...STEAK, weight: 0 }];
    const s = newRulesMatch({ criticEnabled: false, tuning: ROOMY }, recipes);
    stepUntil(s, (x) => x.tickets.length >= 30);
    expect(new Set(s.tickets.map((t) => t.recipe))).toEqual(new Set(['salad']));
  });
});

describe('critic ticket', () => {
  const criticAt = 120 * 30; // 0.5 × 240 s

  function atCritic(setup: (s: MatchState) => void = () => {}, overrides: ConfigOverrides = {}) {
    const s = newRulesMatch(overrides, [SALAD, STEAK, { ...DOUBLE_STEAK, weight: 0 }]);
    stepToRoundTick(s, criticAt - 1);
    setup(s);
    expect(s.tickets.some((t) => t.isCritic)).toBe(false);
    step(s, IDLE);
    return s;
  }

  it('spawns once at criticAtFraction with a premium recipe at ×criticMultiplier', () => {
    const s = atCritic();
    const critics = s.tickets.filter((t) => t.isCritic);
    expect(critics).toHaveLength(1);
    expect(critics[0]).toMatchObject({ recipe: 'steak', baseValue: 300, spawnTick: s.tick, expireTick: s.tick + 60 * 30 });
    expect(ofType(s.events, 'ticketSpawn').filter((e) => e.isCritic)).toHaveLength(1);
    expect(s.round.criticSpawned).toBe(true);
    const later = stepN(s, 30 * 30);
    expect(ofType(later, 'ticketSpawn').filter((e) => e.isCritic)).toEqual([]);
  });

  it('is visible to the trailing team first, then to everyone', () => {
    const s = atCritic((x) => {
      x.teams[0].score = 100;
      x.teams[1].score = 40;
    });
    const critic = s.tickets.find((t) => t.isCritic)!;
    expect(critic.visibleTo).toBe(1);
    expect(critic.revealAllAtTick).toBe(s.tick + 3 * 30);
    stepN(s, 3 * 30 - 1);
    expect(critic.visibleTo).toBe(1);
    step(s, IDLE);
    expect(critic.visibleTo).toBeNull();
  });

  it('is visible to all when scores are tied', () => {
    const s = atCritic();
    expect(s.tickets.find((t) => t.isCritic)!.visibleTo).toBeNull();
  });

  it('does not count toward maxTickets', () => {
    const s = atCritic(() => {}, { tuning: { maxTickets: 1, ticketLifetimeSeconds: 1000 } });
    expect(s.tickets.filter((t) => !t.isCritic)).toHaveLength(1);
    expect(s.tickets.filter((t) => t.isCritic)).toHaveLength(1);
  });

  it('never spawns when criticEnabled is false', () => {
    const s = newRulesMatch({ criticEnabled: false });
    const ev = stepUntil(s, (x) => x.round.phase === 'roundOver');
    expect(ofType(ev, 'ticketSpawn').filter((e) => e.isCritic)).toEqual([]);
  });

  it('waits for prep to end if its time falls in prep', () => {
    const s = newRulesMatch({ tuning: { criticAtFraction: 0.01 } });
    const ev = stepUntil(s, (x) => x.tickets.some((t) => t.isCritic));
    expect(s.round.tick).toBe(15 * 30);
    expect(ofType(ev, 'ticketSpawn')).toHaveLength(2);
  });
});
