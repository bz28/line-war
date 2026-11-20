import { describe, expect, it } from 'vitest';
import { interactTarget, tileOwner, type PlayerState, type TeamId } from '@line-war/sim';
import { navFor } from '../src/nav';
import { kitchenFor } from '../src/world';
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
