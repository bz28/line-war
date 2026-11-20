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

  it('lets the owning team (both teams for the market) face every station straight on from a reachable floor tile', () => {
    const arena = buildArena(NIGHT_MARKET);
    const { width, height } = arena;
    // Floor tiles each team can walk to from its spawns (rival kitchen floor is solid).
    const reachable = (team: 0 | 1): Set<number> => {
      const open = (i: number) => arena.tiles[i]?.kind === 'floor' && (arena.owners[i] === null || arena.owners[i] === team);
      const start = NIGHT_MARKET.spawns.filter((_, id) => (id < 2 ? 0 : 1) === team).map((s) => Math.floor(s.y) * width + Math.floor(s.x));
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
