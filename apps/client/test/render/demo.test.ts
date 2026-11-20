import { describe, expect, it } from 'vitest';
import { step, NO_INPUT, tileIndexAtPos, isWalkable, tileAt } from '@line-war/sim';
import type { Item, MatchInputs, MatchState } from '@line-war/sim';
import { buildDemoState } from '../../src/render/demo';

const allItems = (s: MatchState): Item[] => [
  ...s.players.flatMap((p) => (p.holding ? [p.holding] : [])),
  ...Object.values(s.stations).flatMap((st) => (st.item ? [st.item] : [])),
  ...s.floorItems.map((f) => f.item),
];

describe('buildDemoState', () => {
  const s = buildDemoState();

  it('is JSON-serializable and round-trips', () => {
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });

  it('is a mid-round Night Market state', () => {
    expect(s.arena.id).toBe('night-market');
    expect(s.round.phase).toBe('service');
    expect(s.round.index).toBe(1);
    expect(s.teams[0].roundsWon + s.teams[1].roundsWon).toBe(1);
    expect(s.teams.some((t) => t.heat > 0)).toBe(true);
  });

  it('has unique item/ticket ids below nextId', () => {
    const ids = [...allItems(s).map((i) => i.id), ...s.tickets.map((t) => t.id)];
    expect(new Set(ids).size).toBe(ids.length);
    expect(Math.max(...ids)).toBeLessThan(s.nextId);
  });

  it('puts players and floor items on walkable tiles', () => {
    for (const p of [...s.players.map((p) => p.pos), ...s.floorItems.map((f) => f.pos)]) {
      expect(isWalkable(tileAt(s.arena, Math.floor(p.x), Math.floor(p.y)))).toBe(true);
      expect(tileIndexAtPos(s.arena, p)).not.toBeNull();
    }
  });

  it('showcases every renderer feature', () => {
    const vessels = Object.values(s.stations).flatMap((st) => (st.vessel ? [st.vessel] : []));
    const statuses = new Set(vessels.map((v) => v.status));
    for (const st of ['cooking', 'done', 'burnt', 'fire'] as const) expect(statuses).toContain(st);
    expect(vessels.some((v) => v.kind === 'pot' && v.contents.length > 0)).toBe(true);
    expect(s.fires.length).toBeGreaterThan(0);

    const items = allItems(s);
    const foodStates = new Set(items.flatMap((i) => (i.type === 'ingredient' ? [i.state] : i.contents.map((f) => f.state))));
    for (const st of ['raw', 'chopped', 'cooked', 'burnt'] as const) expect(foodStates).toContain(st);
    const plates = items.filter((i) => i.type === 'plate');
    expect(plates.some((p) => p.type === 'plate' && p.cold)).toBe(true);
    expect(plates.some((p) => p.type === 'plate' && p.dirty)).toBe(true);
    expect(plates.some((p) => p.type === 'plate' && !p.dirty && !p.cold && p.contents.length > 0)).toBe(true);

    expect(s.players.some((p) => p.dazedTicks > 0)).toBe(true);
    expect(s.players.some((p) => p.dashTicks > 0)).toBe(true);
    expect(s.players.some((p) => p.holding !== null)).toBe(true);
    expect(s.players.some((p) => p.working)).toBe(true);
    expect(s.floorItems.some((f) => f.vel.x !== 0 || f.vel.y !== 0)).toBe(true);

    expect(s.tickets.length).toBeGreaterThanOrEqual(5);
    const critic = s.tickets.find((t) => t.isCritic);
    expect(critic?.visibleTo).not.toBeNull();
    expect(s.tickets.every((t) => s.recipes.some((r) => r.id === t.recipe))).toBe(true);
    expect(s.tickets.every((t) => t.expireTick > s.tick)).toBe(true);

    expect(Object.values(s.stations).some((st) => st.dirtyPlates > 0)).toBe(true);
    expect(Object.values(s.stations).some((st) => s.arena.tiles[st.tile]?.kind === 'board' && st.workTicks > 0)).toBe(true);
    const events = new Set(s.events.map((e) => e.type));
    for (const e of ['knock', 'delivered', 'chopDone', 'cookDone', 'serveRefused'] as const) expect(events).toContain(e);
  });

  it('builds a fresh state each call', () => {
    const a = buildDemoState();
    a.teams[0].score = -1;
    expect(buildDemoState().teams[0].score).toBe(420);
  });

  it('can be stepped by the sim without throwing', () => {
    const d = buildDemoState();
    const idle = [NO_INPUT, NO_INPUT, NO_INPUT, NO_INPUT] as MatchInputs;
    expect(() => {
      for (let i = 0; i < 10; i++) step(d, idle);
    }).not.toThrow();
  });
});
