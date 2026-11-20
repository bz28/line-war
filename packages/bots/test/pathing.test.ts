import { describe, expect, it } from 'vitest';
import { LEVELS } from '@line-war/content';
import { createMatch, interactTarget, makeConfig, NO_INPUT, step, tileOwner, type MatchInputs, type PlayerId, type PlayerState, type TeamId } from '@line-war/sim';
import { Bot } from '../src/bot';
import { Crew } from '../src/crew';
import { navFor } from '../src/nav';
import { BotRng } from '../src/rng';
import { resolveSkill, skillParams } from '../src/skill';
import { kitchenFor, type Kitchen } from '../src/world';
import { bot, newMatch, runMatch } from './harness';

const TEAMS: TeamId[] = [0, 1];

describe('navigation on Night Market', () => {
  const state = newMatch(1);

  it('never treats the rival kitchen as walkable', () => {
    for (const team of TEAMS) {
      const nav = navFor(state, team);
      for (let i = 0; i < nav.n; i++) {
        const owner = tileOwner(state, i);
        if (owner !== null && owner !== team) expect(nav.open[i], `tile ${i} for team ${team}`).toBe(0);
        if (nav.open[i]) expect(state.arena.tiles[i]!.kind).toBe('floor');
      }
    }
  });

  it('reaches and faces every station its team may use, from its spawns', () => {
    for (const team of TEAMS) {
      const nav = navFor(state, team);
      const k = kitchenFor(state, team);
      const spawns = [state.arena.spawns[team * 2]!, state.arena.spawns[team * 2 + 1]!].map((s) => nav.tileAt(s));
      const usable = state.arena.tiles
        .map((t, i) => ({ t, i }))
        .filter(({ t, i }) => t.kind !== 'floor' && t.kind !== 'wall' && (tileOwner(state, i) === team || t.kind === 'crate'));
      expect(usable.length).toBeGreaterThan(20);
      for (const { i } of usable) {
        const acc = nav.access.get(i) ?? [];
        expect(acc.length, `station ${i} has an access tile`).toBeGreaterThan(0);
        for (const s of spawns) expect(nav.path(s, acc.map((a) => a.tile), null, null), `path to ${i}`).not.toBeNull();
        for (const a of acc) {
          // Standing at the access tile centre facing the station, the sim's target is the station.
          const c = nav.center(a.tile);
          const p = { ...state.players[team * 2]!, pos: c, facing: a.dir } as PlayerState;
          expect(interactTarget(state, p).tile).toBe(i);
          expect(tileOwner(state, a.tile) === null || tileOwner(state, a.tile) === team).toBe(true);
        }
      }
      // The kitchen has everything a dish needs.
      expect(k.boards.length).toBeGreaterThan(0);
      expect(k.pans.length).toBeGreaterThan(0);
      expect(k.pots.length).toBeGreaterThan(0);
      expect(k.passes.length).toBeGreaterThan(0);
      expect(k.crate.size).toBe(2);
    }
  });

  it('paths never cross a rival-kitchen tile', () => {
    for (const team of TEAMS) {
      const nav = navFor(state, team);
      const from = nav.tileAt(state.arena.spawns[team * 2]!);
      for (const [st, acc] of nav.access) {
        const path = nav.path(from, acc.map((a) => a.tile), null, null) ?? [];
        for (const t of path) {
          const owner = tileOwner(state, t);
          expect(owner === null || owner === team, `path to ${st} via ${t}`).toBe(true);
        }
      }
    }
  });

  it('bots never stand in the rival kitchen during a match', () => {
    let bad = 0;
    runMatch({
      seed: 3,
      slots: [bot('hard'), bot('hard'), bot('hard'), bot('hard')],
      config: { bestOf: 1 },
      onTick: (s) => {
        for (const p of s.players) {
          const owner = tileOwner(s, Math.floor(p.pos.y) * s.arena.width + Math.floor(p.pos.x));
          if (owner !== null && owner !== p.team) bad++;
        }
      },
    });
    expect(bad).toBe(0);
  });
});

describe('mirrored tie-breaks (side fairness)', () => {
  it.each(LEVELS.map((l) => [l.name, l] as const))('on %s, each crew’s path to every market crate is the mirror image of the other’s', (_n, level) => {
    const state = createMatch({ arena: level.arena, recipes: level.recipes, ingredients: level.ingredients, config: makeConfig() });
    const w = state.arena.width;
    const [a, b] = [navFor(state, 0), navFor(state, 1)];
    const mirror = (i: number) => Math.floor(i / w) * w + (w - 1 - (i % w));
    const spawnA = a.tileAt(state.players[0].pos);
    const spawnB = b.tileAt(state.players[2].pos);
    expect(spawnB).toBe(mirror(spawnA));
    state.arena.tiles.forEach((t, crate) => {
      if (t.kind !== 'crate') return;
      const pa = a.path(spawnA, a.access.get(crate)!.map((x) => x.tile), null, null);
      const pb = b.path(spawnB, b.access.get(mirror(crate))!.map((x) => x.tile), null, null);
      expect(pb).toEqual(pa!.map(mirror));
    });
  });

  it.each(LEVELS.map((l) => [l.name, l] as const))('on %s, each crew’s kitchen layout and lists are the mirror of the other’s', (_n, level) => {
    const state = createMatch({ arena: level.arena, recipes: level.recipes, ingredients: level.ingredients, config: makeConfig() });
    const w = state.arena.width;
    const mirror = (i: number) => (i < 0 ? i : Math.floor(i / w) * w + (w - 1 - (i % w)));
    const [a, b] = [kitchenFor(state, 0), kitchenFor(state, 1)];
    const keys = ['boards', 'counters', 'pans', 'pots', 'racks', 'sinks', 'passes', 'trash', 'assembly', 'owned', 'rivalDoorFront', 'watchTiles'] as const;
    for (const key of keys) expect((b[key] as number[]).map(mirror), key).toEqual(a[key]);
    expect(mirror(b.idleTile)).toBe(a.idleTile);
    const accessOf = (k: Kitchen, st: number) => k.nav.access.get(st)!.map((x) => ({ tile: x.tile, dx: x.dir.x, dy: x.dir.y }));
    for (const st of a.nav.access.keys()) {
      expect(accessOf(b, mirror(st)).map((x) => ({ tile: mirror(x.tile), dx: -x.dx + 0, dy: x.dy }))).toEqual(accessOf(a, st).map((x) => ({ ...x, dx: x.dx + 0 })));
    }
  });

  // Bots whose seeds are swapped across the two sides must play exact mirror images of each other
  // until the first same-tick contest (which the sim settles by tick parity, fairly).
  it.each([1000, 1003])('on Harbor Pier, a 1v1 and its seed-swapped twin stay mirror images (seed %s)', (seed) => {
    const level = LEVELS.find((l) => l.id === 'harbor-pier')!;
    const play = (botSeeds: [number, number], crewSeeds: [number, number]) => {
      const state = createMatch({ arena: level.arena, recipes: level.recipes, ingredients: level.ingredients, config: makeConfig({ seed, bestOf: 1 }) });
      const skill = resolveSkill('normal');
      const bots = ([0, 2] as PlayerId[]).map((id, side) => {
        const crew = new Crew(side as TeamId, crewSeeds[side]!);
        crew.addMember(id, skill);
        return new Bot(id, crew, skillParams(skill), new BotRng(botSeeds[side]!));
      });
      const frames: number[][] = [];
      for (let t = 0; t < 1500; t++) {
        step(state, [bots[0]!.decide(state), NO_INPUT, bots[1]!.decide(state), NO_INPUT] as MatchInputs);
        frames.push([0, 2].flatMap((id) => [state.players[id]!.pos.x, state.players[id]!.pos.y]));
      }
      return { frames, w: state.arena.width };
    };
    const one = play([seed * 7, seed * 13], [seed + 1, seed + 2]);
    const twin = play([seed * 13, seed * 7], [seed + 2, seed + 1]);
    one.frames.forEach((f, t) => {
      const g = twin.frames[t]!;
      expect([one.w - g[2]!, g[3]!, one.w - g[0]!, g[1]!].map((v, i) => Math.abs(v - f[i]!) < 1e-6), `tick ${t + 1}`).toEqual([true, true, true, true]);
    });
  });
});
