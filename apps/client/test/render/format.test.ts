import { describe, expect, it } from 'vitest';
import { INGREDIENTS, NIGHT_MARKET, RECIPES } from '@line-war/content';
import { createMatch, makeConfig, secondsToTicks, timerTicks } from '@line-war/sim';
import type { MatchState, Ticket, VesselState } from '@line-war/sim';
import {
  chopProgress,
  criticExclusiveSeconds,
  dashCooldownFraction,
  formatClock,
  phaseBanner,
  phaseLabel,
  roundSecondsLeft,
  sortTickets,
  ticketFreshness,
  ticketTimeLeft,
  ticketValue,
  vesselProgress,
} from '../../src/render/format';
import { TEAM_NAMES } from '../../src/render/palette';

const match = (): MatchState =>
  createMatch({ arena: NIGHT_MARKET, recipes: RECIPES, ingredients: INGREDIENTS, config: makeConfig() });

const atRound = (s: MatchState, seconds: number, phase: MatchState['round']['phase']) => {
  s.round.tick = secondsToTicks(s.config, seconds);
  s.tick = s.round.tick;
  s.round.phase = phase;
  return s;
};

const ticket = (over: Partial<Ticket> = {}): Ticket => ({
  id: 1,
  recipe: 'salad',
  spawnTick: 0,
  expireTick: 1800,
  baseValue: 40,
  isCritic: false,
  visibleTo: null,
  revealAllAtTick: null,
  ...over,
});

describe('formatClock', () => {
  it('formats m:ss and rounds up', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(59.2)).toBe('1:00');
    expect(formatClock(83.2)).toBe('1:24');
    expect(formatClock(240)).toBe('4:00');
    expect(formatClock(-5)).toBe('0:00');
  });

  it('round time left', () => {
    const s = atRound(match(), 100, 'service');
    expect(roundSecondsLeft(s)).toBeCloseTo(140);
  });
});

describe('phases', () => {
  it('labels every phase', () => {
    expect(phaseLabel('rush')).toBe('DINNER RUSH');
    expect(phaseLabel('lastCall')).toBe('LAST CALL');
    expect(phaseLabel('matchOver')).toBe('MATCH OVER');
  });

  it('shows PREP during prep, nothing mid-service', () => {
    expect(phaseBanner(atRound(match(), 3, 'prep'), TEAM_NAMES)?.title).toBe('PREP');
    expect(phaseBanner(atRound(match(), 3, 'prep'), TEAM_NAMES)?.subtitle).toContain('0:12');
    expect(phaseBanner(atRound(match(), 100, 'service'), TEAM_NAMES)).toBeNull();
  });

  it('shows DINNER RUSH / LAST CALL briefly after they start', () => {
    expect(phaseBanner(atRound(match(), 181, 'rush'), TEAM_NAMES)?.title).toBe('DINNER RUSH');
    expect(phaseBanner(atRound(match(), 200, 'rush'), TEAM_NAMES)).toBeNull();
    expect(phaseBanner(atRound(match(), 231, 'lastCall'), TEAM_NAMES)?.title).toBe('LAST CALL');
  });

  it('round over shows scores and the round winner', () => {
    const s = atRound(match(), 240, 'roundOver');
    s.teams[0].score = 120;
    s.teams[1].score = 300;
    const b = phaseBanner(s, TEAM_NAMES)!;
    expect(b.overlay).toBe(true);
    expect(b.title).toBe('ROUND 1 OVER');
    expect(b.subtitle).toContain('120 - 300');
    expect(b.subtitle).toContain(`${TEAM_NAMES[1]} WINS`);
    s.teams[0].score = 300;
    expect(phaseBanner(s, TEAM_NAMES)!.subtitle).toContain('TIE');
  });

  it('match over shows the winner', () => {
    const s = atRound(match(), 240, 'matchOver');
    s.winner = 0;
    s.teams[0].roundsWon = 2;
    const b = phaseBanner(s, TEAM_NAMES)!;
    expect(b.title).toBe('MATCH OVER');
    expect(b.subtitle).toContain(`${TEAM_NAMES[0]} WINS`);
    expect(b.subtitle).toContain('2 - 0');
  });
});

describe('tickets', () => {
  it('time left and freshness', () => {
    const s = match();
    s.tick = 900;
    const t = ticket();
    expect(ticketTimeLeft(s, t)).toBeCloseTo(0.5);
    expect(ticketFreshness(s, t)).toBeCloseTo(0.75);
    s.tick = 5000;
    expect(ticketTimeLeft(s, t)).toBe(0);
    expect(ticketFreshness(s, t)).toBeCloseTo(0.5);
  });

  it('value includes freshness, rush and optional heat', () => {
    const s = match();
    s.tick = 0;
    s.round.phase = 'service';
    expect(ticketValue(s, ticket())).toBe(40);
    expect(ticketValue(s, ticket(), 3)).toBe(80);
    s.round.phase = 'rush';
    expect(ticketValue(s, ticket())).toBe(Math.round(40 * s.config.tuning.rushMultiplier));
    s.config = { ...s.config, rushEnabled: false };
    expect(ticketValue(s, ticket())).toBe(40);
  });

  it('sorts critic first, then oldest', () => {
    const sorted = sortTickets([
      ticket({ id: 1, spawnTick: 50 }),
      ticket({ id: 2, spawnTick: 10 }),
      ticket({ id: 3, spawnTick: 90, isCritic: true }),
    ]);
    expect(sorted.map((t) => t.id)).toEqual([3, 2, 1]);
  });

  it('critic exclusivity countdown', () => {
    const s = match();
    s.tick = 30;
    expect(criticExclusiveSeconds(s, ticket({ isCritic: true }))).toBeNull();
    expect(criticExclusiveSeconds(s, ticket({ isCritic: true, visibleTo: 1, revealAllAtTick: 120 }))).toBeCloseTo(3);
    expect(criticExclusiveSeconds(s, ticket({ isCritic: true, visibleTo: 1, revealAllAtTick: 0 }))).toBe(0);
  });
});

describe('progress', () => {
  const vessel = (over: Partial<VesselState>): VesselState => ({ kind: 'pan', contents: [], cookTicks: 0, status: 'empty', ...over });

  it('vessel cook -> burn warning -> fire countdown', () => {
    const s = match();
    const cook = timerTicks(s.config, s.config.tuning.panCookSeconds);
    const burn = timerTicks(s.config, s.config.tuning.panBurnSeconds);
    expect(vesselProgress(s, vessel({}))).toBeNull();
    expect(vesselProgress(s, vessel({ status: 'cooking', cookTicks: cook / 2 }))).toEqual({ kind: 'cook', fraction: 0.5 });
    expect(vesselProgress(s, vessel({ status: 'done', cookTicks: cook + burn / 4 }))).toEqual({ kind: 'burn', fraction: 0.25 });
    expect(vesselProgress(s, vessel({ status: 'burnt', cookTicks: cook + burn }))?.kind).toBe('fire');
    expect(vesselProgress(s, vessel({ status: 'fire', cookTicks: 99999 }))).toEqual({ kind: 'fire', fraction: 1 });
  });

  it('pot uses pot timers', () => {
    const s = match();
    const cook = timerTicks(s.config, s.config.tuning.potCookSeconds);
    expect(vesselProgress(s, vessel({ kind: 'pot', status: 'cooking', cookTicks: cook / 4 }))?.fraction).toBeCloseTo(0.25);
  });

  it('chop and dash cooldown fractions are clamped', () => {
    const s = match();
    const chop = timerTicks(s.config, s.config.tuning.chopSeconds);
    expect(chopProgress(s, chop / 2)).toBeCloseTo(0.5);
    expect(chopProgress(s, chop * 3)).toBe(1);
    expect(dashCooldownFraction(s, 0)).toBe(0);
    expect(dashCooldownFraction(s, secondsToTicks(s.config, s.config.tuning.dashCooldownSeconds))).toBe(1);
  });
});
