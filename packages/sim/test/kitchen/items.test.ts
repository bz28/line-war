import { describe, expect, it } from 'vitest';
import { secondsToTicks } from '../../src';
import { updateFloorItems } from '../../src/systems/items';
import { food, ingredient, kitchenMatch, LEFT, only, plate, put, RIGHT, run, stationXY, tileAtXY, UP } from './helpers';

const THROW = only(0, { throw: true });

describe('throw', () => {
  it('flies along facing and lands on the first empty counter it enters', () => {
    const s = kitchenMatch();
    const ing = ingredient(s, 'bun');
    put(s, 0, 5.5, 3.5, UP).holding = ing;
    const ev = run(s, 1, THROW);
    expect(ev).toContainEqual({ type: 'throw', player: 0, itemId: ing.id });
    expect(s.players[0].holding).toBeNull();
    expect(s.floorItems[0]!.vel).toEqual({ x: 0, y: -s.config.tuning.throwSpeed });
    expect(s.floorItems[0]!.pos.y).toBeCloseTo(3.5 - 12 / 30);
    const ev2 = run(s, 5);
    expect(stationXY(s, 5, 1).item).toBe(ing);
    expect(s.floorItems).toHaveLength(0);
    expect(ev2).toContainEqual({ type: 'drop', player: 0, itemId: ing.id, tile: tileAtXY(s, 5, 1) });
  });

  it('stops in front of an occupied counter and rests on the floor', () => {
    const s = kitchenMatch();
    stationXY(s, 5, 1).item = ingredient(s, 'meat');
    put(s, 0, 5.5, 3.5, UP).holding = ingredient(s, 'bun');
    run(s, 10, THROW);
    expect(s.floorItems).toHaveLength(1);
    const fi = s.floorItems[0]!;
    expect(fi.vel).toEqual({ x: 0, y: 0 });
    expect(Math.floor(fi.pos.y)).toBe(2);
  });

  it('is caught by an empty-handed teammate in the path', () => {
    const s = kitchenMatch();
    const ing = ingredient(s, 'bun');
    put(s, 0, 9.5, 2.5, RIGHT).holding = ing;
    put(s, 1, 12.2, 2.5);
    const ev = run(s, 6, THROW);
    expect(s.players[1].holding).toBe(ing);
    expect(s.floorItems).toHaveLength(0);
    expect(ev).toContainEqual({ type: 'grab', player: 1, itemId: ing.id });
  });

  it('can be caught by a rival; players with full hands let it pass', () => {
    const s = kitchenMatch();
    const ing = ingredient(s, 'steak');
    put(s, 0, 9.5, 3.5, RIGHT).holding = ing;
    put(s, 1, 10.5, 3.5).holding = ingredient(s, 'bun'); // teammate busy: no catch
    put(s, 2, 12.0, 3.5);
    run(s, 6, THROW);
    expect(s.players[2].holding).toBe(ing);
  });

  it('stops at a wall on the last open tile', () => {
    const s = kitchenMatch();
    put(s, 0, 3.5, 2.5, LEFT).holding = ingredient(s, 'bun');
    run(s, 10, THROW);
    const fi = s.floorItems[0]!;
    expect(fi.vel).toEqual({ x: 0, y: 0 });
    expect(Math.floor(fi.pos.x)).toBe(1);
  });

  it("stops at the rival kitchen's edge, but flies into the thrower's own kitchen", () => {
    const s = kitchenMatch();
    put(s, 0, 10.5, 2.5, RIGHT).holding = ingredient(s, 'bun');
    run(s, 15, THROW);
    const fi = s.floorItems[0]!;
    expect(fi.vel).toEqual({ x: 0, y: 0 });
    expect(Math.floor(fi.pos.x)).toBe(12);

    const t = kitchenMatch();
    put(t, 3, 10.5, 2.5, RIGHT).holding = ingredient(t, 'bun');
    put(t, 2, 19.5, 4.5);
    run(t, 15, only(3, { throw: true }));
    expect(t.floorItems[0]!.pos.x).toBeCloseTo(10.5 + t.config.tuning.throwRange, 5);
  });

  it('rests on the floor at max range and never moves again', () => {
    const s = kitchenMatch();
    put(s, 0, 2.5, 3.5, RIGHT).holding = ingredient(s, 'bun');
    run(s, 1, THROW);
    const flightTicks = Math.ceil(s.config.tuning.throwRange / (12 / 30));
    run(s, flightTicks - 2);
    expect(s.floorItems[0]!.vel.x).not.toBe(0);
    run(s, 1);
    const fi = s.floorItems[0]!;
    expect(fi.vel).toEqual({ x: 0, y: 0 });
    expect(fi.pos.x).toBeCloseTo(7.5, 5);
    expect(fi.travelled).toBeCloseTo(5, 5);
    run(s, 30);
    expect(fi.pos.x).toBeCloseTo(7.5, 5);
  });

  it("the thrower can't catch their own throw for 0.2 s", () => {
    const s = kitchenMatch();
    const ing = ingredient(s, 'bun');
    put(s, 0, 9.5, 2.5, RIGHT).holding = ing;
    run(s, 1, THROW); // item is 0.4 ahead: within catch range of the thrower
    expect(s.players[0].holding).toBeNull();
    expect(s.floorItems).toHaveLength(1);

    // Once the window has passed the same geometry is a catch.
    const fi = s.floorItems[0]!;
    fi.thrownAtTick = s.tick - secondsToTicks(s.config, 0.2);
    fi.pos = { x: 9.6, y: 2.5 };
    updateFloorItems(s);
    expect(s.players[0].holding).toBe(ing);
  });

  it("dazed players can't throw", () => {
    const s = kitchenMatch();
    const p = put(s, 0, 9.5, 2.5, RIGHT);
    p.holding = ingredient(s, 'bun');
    p.dazedTicks = 5;
    run(s, 1, THROW);
    expect(p.holding).not.toBeNull();
    expect(s.floorItems).toHaveLength(0);
  });
});

describe('cold plates', () => {
  it('a plate with food goes cold plateColdSeconds after plating, wherever it is, once', () => {
    const s = kitchenMatch();
    const cold = secondsToTicks(s.config, s.config.tuning.plateColdSeconds);
    const inHand = plate(s, [food('bun', 'raw')]);
    const onCounter = plate(s, [food('bun', 'raw')]);
    const onFloor = plate(s, [food('bun', 'raw')]);
    const empty = plate(s);
    put(s, 0, 9.5, 2.5).holding = inHand;
    stationXY(s, 5, 1).item = onCounter;
    stationXY(s, 7, 5).item = empty;
    s.floorItems.push({ item: onFloor, pos: { x: 10.5, y: 4.5 }, vel: { x: 0, y: 0 }, thrownBy: null, thrownAtTick: null, travelled: 0 });
    run(s, cold - 1);
    expect(inHand.cold).toBe(false);
    const ev = run(s, 1);
    expect([inHand.cold, onCounter.cold, onFloor.cold, empty.cold]).toEqual([true, true, true, false]);
    expect(ev.filter((e) => e.type === 'plateCold').map((e) => (e as { itemId: number }).itemId).sort()).toEqual(
      [inHand.id, onCounter.id, onFloor.id].sort(),
    );
    expect(run(s, 30).filter((e) => e.type === 'plateCold')).toHaveLength(0);
  });

  it('adding food restarts the cold clock', () => {
    const s = kitchenMatch();
    const cold = secondsToTicks(s.config, s.config.tuning.plateColdSeconds);
    const p = plate(s, [food('lettuce', 'chopped')]);
    stationXY(s, 5, 1).item = p;
    run(s, cold - 10);
    put(s, 0, 5.5, 2.5, UP).holding = ingredient(s, 'tomato', 'chopped');
    run(s, 1, only(0, { grab: true }));
    expect(p.contents).toHaveLength(2);
    run(s, 20);
    expect(p.cold).toBe(false);
  });
});
