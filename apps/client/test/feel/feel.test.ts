import { describe, expect, it } from 'vitest';
import { INGREDIENTS, NIGHT_MARKET, RECIPES } from '@line-war/content';
import { createMatch, makeConfig, secondsToTicks } from '@line-war/sim';
import type { MatchState } from '@line-war/sim';
import { celebratingTeam, hopAt, knockKick, nearestOfTeam, youArrowAlpha, YOU_ARROW_TAIL_SECONDS, type Hop } from '../../src/render/feel';
import { flightPoint } from '../../src/hud/flyers';
import { frameAdvance } from '../../src/loop';

const match = (): MatchState => createMatch({ arena: NIGHT_MARKET, recipes: RECIPES, ingredients: INGREDIENTS, config: makeConfig({ seed: 5 }) });

describe('hopAt', () => {
  const hop: Hop = { lift: 0, squash: 0 };
  it('rests outside the hop', () => {
    for (const t of [-1, 0, 1, 2, NaN]) expect(hopAt(t, hop)).toEqual({ lift: 0, squash: 0 });
  });
  it('crouches, leaps with a stretch, then lands with a squash', () => {
    expect(hopAt(0.07, hop).squash).toBeGreaterThan(0);
    expect(hopAt(0.07, hop).lift).toBe(0);
    const top = hopAt(0.475, hop);
    expect(top.lift).toBeCloseTo(0.55, 2);
    expect(hopAt(0.3, hop).squash).toBeLessThan(0);
    expect(hopAt(0.9, hop).squash).toBeGreaterThan(0.2);
    expect(hopAt(0.9, hop).lift).toBe(0);
  });
  it('reuses the output object (no per-frame allocation)', () => {
    expect(hopAt(0.5, hop)).toBe(hop);
  });
});

describe('knockKick', () => {
  it('snaps out fast, then eases back to zero', () => {
    expect(knockKick(0)).toBe(0);
    expect(knockKick(0.1)).toBeCloseTo(1);
    expect(knockKick(0.05)).toBeCloseTo(0.5);
    expect(knockKick(0.5)).toBeLessThan(knockKick(0.2));
    expect(knockKick(1)).toBe(0);
    expect(knockKick(-0.1)).toBe(0);
  });
});

describe('celebratingTeam', () => {
  it('is the round leader at round over, the match winner at match over, else null', () => {
    const s = match();
    expect(celebratingTeam(s)).toBeNull();
    s.round.phase = 'roundOver';
    s.teams[1].score = 50;
    expect(celebratingTeam(s)).toBe(1);
    s.teams[0].score = 50;
    expect(celebratingTeam(s)).toBeNull();
    s.round.phase = 'matchOver';
    s.winner = 0;
    expect(celebratingTeam(s)).toBe(0);
    s.winner = null;
    expect(celebratingTeam(s)).toBeNull();
  });
});

describe('youArrowAlpha', () => {
  it('is full in prep, fades early in service, and is gone after', () => {
    const s = match();
    expect(youArrowAlpha(s)).toBe(1);
    s.round.phase = 'service';
    s.round.tick = secondsToTicks(s.config, s.config.prepSeconds + YOU_ARROW_TAIL_SECONDS / 2);
    expect(youArrowAlpha(s)).toBeCloseTo(0.5, 1);
    s.round.tick = secondsToTicks(s.config, s.config.prepSeconds + YOU_ARROW_TAIL_SECONDS + 1);
    expect(youArrowAlpha(s)).toBe(0);
    s.round.phase = 'matchOver';
    expect(youArrowAlpha(s)).toBe(0);
  });
});

describe('nearestOfTeam', () => {
  it('picks the closest chef of that crew', () => {
    const s = match();
    s.players[0].pos = { x: 2, y: 2 };
    s.players[1].pos = { x: 6, y: 6 };
    s.players[2].pos = { x: 5.5, y: 5.5 };
    expect(nearestOfTeam(s.players, 0, { x: 5, y: 5 })!.id).toBe(1);
    expect(nearestOfTeam(s.players, 1, { x: 5, y: 5 })!.team).toBe(1);
  });
});

describe('flightPoint', () => {
  it('starts at the pass, ends at the sign, and arcs above both', () => {
    const from = { x: 900, y: 300 };
    const to = { x: 1300, y: 90 };
    expect(flightPoint(from, to, 0)).toEqual(from);
    const end = flightPoint(from, to, 1);
    expect(end.x).toBeCloseTo(to.x);
    expect(end.y).toBeCloseTo(to.y);
    // Eased in: the first half covers less than half the distance.
    const mid = flightPoint(from, to, 0.5);
    expect(mid.x - from.x).toBeLessThan((to.x - from.x) / 2);
  });
});

describe('frameAdvance (hit-stop)', () => {
  it('adds wall time, capped', () => {
    expect(frameAdvance(1000, 1016, 0)).toBe(16);
    expect(frameAdvance(0, 5000, 0)).toBe(250);
  });
  it('adds nothing while held and only the time after the hold ends', () => {
    expect(frameAdvance(1000, 1016, 1080)).toBe(0);
    expect(frameAdvance(1070, 1086, 1080)).toBe(6);
  });
});
