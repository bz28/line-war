import { describe, expect, it } from 'vitest';
import { buildArena, findRecipe, matchesRecipe, nextRandom, step } from '../src';
import { IDLE, newTestMatch, TEST_ARENA, TEST_RECIPES } from './fixtures';

const idle = IDLE;
const newMatch = (seed = 1) => newTestMatch({ seed });

describe('buildArena', () => {
  it('flattens rows, zones and owners', () => {
    const a = buildArena(TEST_ARENA);
    expect(a.width).toBe(9);
    expect(a.tiles[1 * 9 + 1]?.kind).toBe('pantry');
    expect(a.zones[2 * 9 + 1]).toBe('kitchen0');
    expect(a.zones[2 * 9 + 4]).toBe('market');
    expect(a.zones[2 * 9 + 3]).toBe('none');
    expect(a.owners[2 * 9 + 7]).toBe(1);
  });

  it('rejects ragged rows and unknown chars', () => {
    expect(() => buildArena({ ...TEST_ARENA, rows: ['###', '##'] })).toThrow(/length/);
    expect(() => buildArena({ ...TEST_ARENA, rows: ['#?#'] })).toThrow(/legend/);
  });
});

describe('createMatch', () => {
  it('creates stations for interactive tiles only, with crate and stove state', () => {
    const s = newMatch();
    const kinds = Object.values(s.stations).map((st) => s.arena.tiles[st.tile]?.kind);
    expect(kinds).not.toContain('floor');
    expect(kinds).not.toContain('wall');
    const stove = Object.values(s.stations).find((st) => s.arena.tiles[st.tile]?.kind === 'stove');
    expect(stove?.vessel?.kind).toBe('pan');
    expect(s.players.map((p) => p.team)).toEqual([0, 0, 1, 1]);
    expect(s.round.phase).toBe('prep');
  });
});

describe('step', () => {
  it('advances ticks and clears events', () => {
    const s = newMatch();
    s.events.push({ type: 'dash', player: 0 });
    step(s, idle);
    expect(s.tick).toBe(1);
    expect(s.events).toEqual([]);
  });

  it('is deterministic for the same seed and inputs', () => {
    const a = newMatch(42);
    const b = newMatch(42);
    for (let i = 0; i < 300; i++) {
      step(a, idle);
      step(b, idle);
    }
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('keeps state JSON-serializable', () => {
    const s = newMatch();
    for (let i = 0; i < 30; i++) step(s, idle);
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });
});

describe('recipes', () => {
  const salad = TEST_RECIPES[0]!;
  it('matches order-independent multisets', () => {
    expect(matchesRecipe([{ kind: 'tomato', state: 'chopped' }, { kind: 'lettuce', state: 'chopped' }], salad)).toBe(true);
    expect(matchesRecipe([{ kind: 'lettuce', state: 'chopped' }], salad)).toBe(false);
    expect(matchesRecipe([{ kind: 'lettuce', state: 'raw' }, { kind: 'tomato', state: 'chopped' }], salad)).toBe(false);
    expect(findRecipe([], TEST_RECIPES)).toBeNull();
  });
});

describe('rng', () => {
  it('is seeded and in [0, 1)', () => {
    const a = newMatch(7);
    const b = newMatch(7);
    const xs = Array.from({ length: 100 }, () => nextRandom(a));
    expect(xs).toEqual(Array.from({ length: 100 }, () => nextRandom(b)));
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true);
  });
});
