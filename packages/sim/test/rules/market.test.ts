import { describe, expect, it } from 'vitest';
import { tileIndex, type MatchState, type PlayerId, type Vec2 } from '../../src';
import { takeFromCrate, tryKnock, updateMarket } from '../../src/systems/market';
import { addTicket, DOUBLE_STEAK, newRulesMatch, SALAD, STEAK } from './helpers';

const CRATE = 3 * 9 + 4; // 'S' (steak) in TEST_ARENA
const crateStock = (s: MatchState) => s.stations[String(CRATE)]!.stock;

describe('market stock', () => {
  it('starts at marketExtraStock and tops up to extra + board demand, counting duplicates', () => {
    const s = newRulesMatch({}, [SALAD, STEAK, DOUBLE_STEAK]);
    expect(crateStock(s)).toBe(1);
    addTicket(s, SALAD);
    updateMarket(s);
    expect(crateStock(s)).toBe(1);
    addTicket(s, STEAK);
    addTicket(s, DOUBLE_STEAK);
    updateMarket(s);
    expect(crateStock(s)).toBe(1 + 1 + 2);
  });

  it('counts critic tickets and respects marketExtraStock', () => {
    const s = newRulesMatch({ tuning: { marketExtraStock: 3 } }, [SALAD, STEAK]);
    addTicket(s, STEAK, { isCritic: true, visibleTo: 0 });
    updateMarket(s);
    expect(crateStock(s)).toBe(4);
  });

  it('never lowers stock except by takes', () => {
    const s = newRulesMatch({}, [SALAD, STEAK, DOUBLE_STEAK]);
    addTicket(s, DOUBLE_STEAK);
    updateMarket(s);
    expect(crateStock(s)).toBe(3);
    s.tickets = [];
    updateMarket(s);
    expect(crateStock(s)).toBe(3);
    takeFromCrate(s, CRATE);
    expect(crateStock(s)).toBe(2);
    updateMarket(s);
    expect(crateStock(s)).toBe(2);
  });

  it('takeFromCrate returns a raw ingredient and decrements, null when empty or not a crate', () => {
    const s = newRulesMatch();
    const item = takeFromCrate(s, CRATE);
    expect(item).toMatchObject({ type: 'ingredient', kind: 'steak', state: 'raw' });
    expect(crateStock(s)).toBe(0);
    expect(takeFromCrate(s, CRATE)).toBeNull();
    expect(crateStock(s)).toBe(0);
    expect(takeFromCrate(s, tileIndex(s.arena, 1, 1))).toBeNull(); // pantry
    // Demand refills the crate on the next market update.
    addTicket(s, STEAK);
    updateMarket(s);
    const again = takeFromCrate(s, CRATE);
    expect(again?.id).not.toBe(item?.id);
  });
});

describe('tryKnock', () => {
  /** Attacker player 0 (team 0) dashing; victim player 2 (team 1) holding a bun in the market. */
  function setup(victimPos: Vec2 = { x: 4.5, y: 1.2 }, dashDir: Vec2 = { x: 0, y: 1 }, victim: PlayerId = 2) {
    const s = newRulesMatch();
    const a = s.players[0];
    a.pos = { x: 4.5, y: 2.5 };
    a.dashDir = dashDir;
    a.dashTicks = 3;
    const v = s.players[victim];
    v.pos = victimPos;
    v.holding = { id: 500, type: 'ingredient', kind: 'bun', state: 'raw' };
    return s;
  }

  it('pops the item along the dash direction, dazes and grants immunity, emits knock', () => {
    const s = setup();
    expect(tryKnock(s, 0, 2)).toBe(true);
    const v = s.players[2];
    expect(v.holding).toBeNull();
    expect(v.dazedTicks).toBe(Math.round(0.8 * 30));
    expect(v.knockImmuneTicks).toBe(Math.round(1.5 * 30));
    expect(s.floorItems).toHaveLength(1);
    const fi = s.floorItems[0]!;
    expect(fi.item.id).toBe(500);
    expect(fi.pos.x).toBeCloseTo(4.5);
    expect(fi.pos.y).toBeCloseTo(2.7);
    expect(fi.vel).toEqual({ x: 0, y: 0 });
    expect(fi.thrownBy).toBe(0);
    expect(s.events).toEqual([{ type: 'knock', by: 0, victim: 2, itemId: 500 }]);
    // Attacker timers untouched.
    expect(s.players[0].dazedTicks).toBe(0);
  });

  it('clamps the pop into the market when it would land in a rival kitchen', () => {
    const s = setup({ x: 4.5, y: 1.5 }, { x: 1, y: 0 });
    expect(tryKnock(s, 0, 2)).toBe(true);
    const p = s.floorItems[0]!.pos;
    expect(s.arena.zones[tileIndex(s.arena, Math.floor(p.x), Math.floor(p.y))]).toBe('market');
    expect(p.x).toBeCloseTo(5, 2);
    expect(p.x).toBeLessThan(5);
    expect(p.y).toBeCloseTo(1.5);
  });

  it('clamps the pop off walls and crates onto walkable market floor', () => {
    for (const [pos, dir] of [
      [{ x: 4.5, y: 1.5 }, { x: 0, y: -1 }], // into the outer wall
      [{ x: 4.5, y: 2.5 }, { x: 0, y: 1 }], // onto the crate / out of bounds
      [{ x: 4.5, y: 1.5 }, { x: -1, y: 0 }], // into the door column wall
    ] as [Vec2, Vec2][]) {
      const s = setup(pos, dir);
      s.players[0].pos = { x: 4.5, y: 2.5 };
      expect(tryKnock(s, 0, 2)).toBe(true);
      const p = s.floorItems[0]!.pos;
      const idx = tileIndex(s.arena, Math.floor(p.x), Math.floor(p.y));
      expect(s.arena.zones[idx]).toBe('market');
      expect(s.arena.tiles[idx]?.kind).toBe('floor');
    }
  });

  function expectNoKnock(s: MatchState, by: PlayerId, victim: PlayerId) {
    const before = JSON.stringify(s);
    expect(tryKnock(s, by, victim)).toBe(false);
    expect(JSON.stringify(s)).toBe(before);
  }

  it('fails against a teammate', () => {
    const s = setup({ x: 4.5, y: 1.2 }, { x: 0, y: 1 }, 1);
    expectNoKnock(s, 0, 1);
  });

  it('fails when the victim is outside the market (door column or kitchen)', () => {
    expectNoKnock(setup({ x: 3.5, y: 2.5 }), 0, 2);
    expectNoKnock(setup({ x: 6.5, y: 2.5 }), 0, 2);
  });

  it('fails when the victim holds nothing', () => {
    const s = setup();
    s.players[2].holding = null;
    expectNoKnock(s, 0, 2);
  });

  it('fails while the victim is knock-immune', () => {
    const s = setup();
    s.players[2].knockImmuneTicks = 1;
    expectNoKnock(s, 0, 2);
  });

  it('a knocked victim cannot be knocked again immediately', () => {
    const s = setup();
    expect(tryKnock(s, 0, 2)).toBe(true);
    s.players[2].holding = { id: 501, type: 'ingredient', kind: 'bun', state: 'raw' };
    s.events = [];
    expectNoKnock(s, 0, 2);
  });
});
