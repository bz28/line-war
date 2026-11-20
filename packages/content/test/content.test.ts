import { buildArena, createMatch, makeConfig } from '@line-war/sim';
import { describe, expect, it } from 'vitest';
import { INGREDIENTS, NIGHT_MARKET, RECIPES } from '../src';

describe('Night Market', () => {
  it('is a valid rectangular grid with known legend chars', () => {
    const arena = buildArena(NIGHT_MARKET);
    expect(arena.width).toBe(25);
    expect(arena.height).toBe(13);
  });

  it('is left-right mirrored (fairness)', () => {
    for (const row of NIGHT_MARKET.rows) expect(row).toBe([...row].reverse().join(''));
    const [a, b, c, d] = NIGHT_MARKET.spawns;
    expect(a.x + c.x).toBe(25);
    expect(b.x + d.x).toBe(25);
    expect(a.y).toBe(c.y);
  });

  it('spawns players on floor tiles inside their own kitchen', () => {
    const arena = buildArena(NIGHT_MARKET);
    NIGHT_MARKET.spawns.forEach((s, i) => {
      const idx = Math.floor(s.y) * arena.width + Math.floor(s.x);
      expect(arena.tiles[idx]?.kind).toBe('floor');
      expect(arena.zones[idx]).toBe(i < 2 ? 'kitchen0' : 'kitchen1');
    });
  });

  it('has 3-tile doorways between each kitchen and the market', () => {
    const arena = buildArena(NIGHT_MARKET);
    for (const col of [8, 16]) {
      const open = NIGHT_MARKET.rows.filter((r) => r[col] === '.').length;
      expect(open).toBe(3);
      expect(arena.zones[5 * arena.width + col]).toBe('none');
    }
  });

  it('puts the crates in the market and the passes in the kitchens', () => {
    const arena = buildArena(NIGHT_MARKET);
    arena.tiles.forEach((t, i) => {
      if (t.kind === 'crate') expect(arena.zones[i]).toBe('market');
      if (t.kind === 'pass' || t.kind === 'pantry' || t.kind === 'stove') expect(arena.zones[i]).not.toBe('market');
    });
  });
});

describe('recipes', () => {
  it('only use reachable food states', () => {
    for (const r of RECIPES) {
      for (const f of r.ingredients) {
        const def = INGREDIENTS[f.kind];
        if (f.state === 'chopped') expect(def.choppable).toBe(true);
        if (f.state === 'cooked') expect(def.cook).not.toBeNull();
      }
    }
  });

  it('premium flag matches premium ingredients, and every premium ingredient has a crate', () => {
    const crates = new Set(Object.values(NIGHT_MARKET.legend).filter((t) => t.kind === 'crate').map((t) => t.ingredient));
    for (const r of RECIPES) {
      const premium = r.ingredients.some((f) => INGREDIENTS[f.kind].premium);
      expect(r.premium).toBe(premium);
      for (const f of r.ingredients) if (INGREDIENTS[f.kind].premium) expect(crates.has(f.kind)).toBe(true);
    }
  });

  it('creates a match on Night Market', () => {
    const state = createMatch({ arena: NIGHT_MARKET, recipes: RECIPES, ingredients: INGREDIENTS, config: makeConfig() });
    expect(state.players).toHaveLength(4);
    expect(Object.keys(state.stations).length).toBeGreaterThan(30);
  });
});
