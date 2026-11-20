import { buildArena, createMatch, makeConfig } from '@line-war/sim';
import { describe, expect, it } from 'vitest';
import { INGREDIENTS, LEVELS, NIGHT_MARKET, RECIPES, levelById } from '../src';

describe('Night Market', () => {
  it('is a valid rectangular grid with known legend chars', () => {
    const arena = buildArena(NIGHT_MARKET);
    expect(arena.width).toBe(25);
    expect(arena.height).toBe(13);
  });

  it('puts the corner pans in reach and one trash per kitchen (review fix)', () => {
    const arena = buildArena(NIGHT_MARKET);
    const at = (x: number, y: number) => arena.tiles[y * arena.width + x]?.kind;
    expect([at(1, 10), at(23, 10)]).toEqual(['floor', 'floor']);
    expect([at(1, 11), at(23, 11)]).toEqual(['stove', 'stove']);
    expect([at(7, 11), at(17, 11)]).toEqual(['trash', 'trash']);
    expect(arena.tiles.filter((t) => t.kind === 'trash')).toHaveLength(2);
  });

  it('puts the crates in the market and the passes in the kitchens', () => {
    const arena = buildArena(NIGHT_MARKET);
    arena.tiles.forEach((t, i) => {
      if (t.kind === 'crate') expect(arena.zones[i]).toBe('market');
      if (t.kind === 'pass' || t.kind === 'pantry' || t.kind === 'stove') expect(arena.zones[i]).not.toBe('market');
    });
  });
});

describe.each(LEVELS.map((l) => [l.name, l] as const))('level %s', (_name, level) => {
  it('is left-right mirrored (fairness)', () => {
    for (const row of level.arena.rows) expect(row).toBe([...row].reverse().join(''));
    const [a, b, c, d] = level.arena.spawns;
    expect(a.x + c.x).toBe(25);
    expect(b.x + d.x).toBe(25);
    expect(a.y).toBe(c.y);
  });

  it('spawns players on floor tiles inside their own kitchen', () => {
    const arena = buildArena(level.arena);
    level.arena.spawns.forEach((s, i) => {
      const idx = Math.floor(s.y) * arena.width + Math.floor(s.x);
      expect(arena.tiles[idx]?.kind).toBe('floor');
      expect(arena.zones[idx]).toBe(i < 2 ? 'kitchen0' : 'kitchen1');
    });
  });

  it('has doorways at least 2 tiles wide between each kitchen and the market', () => {
    const arena = buildArena(level.arena);
    for (const col of [8, 16]) {
      const open = level.arena.rows.map((r, y) => (r[col] === '.' ? y : -1)).filter((y) => y >= 0);
      expect(open.length).toBeGreaterThanOrEqual(2);
      for (const y of open) expect(arena.zones[y * arena.width + col]).toBe('none');
    }
  });

  it('lets the owning team (both teams for the market) face every station straight on from a reachable floor tile', () => {
    const arena = buildArena(level.arena);
    const { width, height } = arena;
    // Floor tiles each team can walk to from its spawns (rival kitchen floor is solid).
    const reachable = (team: 0 | 1): Set<number> => {
      const open = (i: number) => arena.tiles[i]?.kind === 'floor' && (arena.owners[i] === null || arena.owners[i] === team);
      const start = level.arena.spawns.filter((_, id) => (id < 2 ? 0 : 1) === team).map((s) => Math.floor(s.y) * width + Math.floor(s.x));
      const seen = new Set(start);
      const queue = [...start];
      while (queue.length) {
        const i = queue.shift()!;
        const x = i % width;
        const y = Math.floor(i / width);
        for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]] as const) {
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const n = ny * width + nx;
          if (!seen.has(n) && open(n)) {
            seen.add(n);
            queue.push(n);
          }
        }
      }
      return seen;
    };
    const walk = [reachable(0), reachable(1)] as const;
    const unreachable: string[] = [];
    arena.tiles.forEach((t, i) => {
      if (t.kind === 'floor' || t.kind === 'wall') return;
      const x = i % width;
      const y = Math.floor(i / width);
      const owner = arena.owners[i] ?? null;
      const teams: (0 | 1)[] = owner === null ? [0, 1] : [owner];
      const neighbours = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]].map(([nx, ny]) => ny! * width + nx!);
      for (const team of teams) {
        if (!neighbours.some((n) => walk[team].has(n))) unreachable.push(`${t.kind}@${x},${y} for team ${team}`);
      }
    });
    expect(unreachable).toEqual([]);
  });

  it('keeps crates in the market and kitchen stations in the kitchens', () => {
    const arena = buildArena(level.arena);
    arena.tiles.forEach((t, i) => {
      if (t.kind === 'crate') expect(arena.zones[i]).toBe('market');
      if (t.kind === 'pass' || t.kind === 'pantry' || t.kind === 'stove') expect(arena.zones[i]).not.toBe('market');
    });
  });

  it('can make every recipe on its menu: each ingredient comes from a pantry or a market crate', () => {
    const sources = new Set(Object.values(level.arena.legend).flatMap((t) => ((t.kind === 'crate' || t.kind === 'pantry') && t.ingredient ? [t.ingredient] : [])));
    for (const r of level.recipes) for (const f of r.ingredients) expect(sources.has(f.kind), `${r.id}:${f.kind}`).toBe(true);
    const kinds = new Set(level.arena.rows.join(''));
    for (const k of ['X', 'K', 'P', 'U', 'W', 'D', 'R']) expect(kinds.has(k), k).toBe(true);
  });

  it('marks exactly the market-sold ingredients premium, and every premium recipe has a market ingredient', () => {
    for (const r of level.recipes) expect(r.premium).toBe(r.ingredients.some((f) => level.ingredients[f.kind].premium));
    expect(level.recipes.some((r) => r.premium)).toBe(true);
  });

  it('creates a match', () => {
    const state = createMatch({ arena: level.arena, recipes: level.recipes, ingredients: level.ingredients, config: makeConfig() });
    expect(state.players).toHaveLength(4);
  });
});

describe('levels', () => {
  it('has three levels with unique ids, and levelById finds them', () => {
    expect(LEVELS.map((l) => l.id)).toEqual(['night-market', 'harbor-pier', 'rooftop-garden']);
    expect(levelById('harbor-pier').name).toBe('Harbor Pier');
    expect(() => levelById('nope')).toThrow();
  });
  it('Rooftop Garden sells produce in the market and keeps steak and fish at home', () => {
    const l = levelById('rooftop-garden');
    expect(l.ingredients.lettuce.premium).toBe(true);
    expect(l.ingredients.steak.premium).toBe(false);
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
