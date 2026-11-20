import { describe, expect, it } from 'vitest';
import { timerTicks } from '../../src';
import { plateFits } from '../../src/systems/kitchen/plate';
import { DOWN, food, ingredient, kitchenMatch, KITCHEN_RECIPES, LEFT, only, plate, put, RIGHT, run, stationXY, tileAtXY, UP } from './helpers';

const GRAB = only(0, { grab: true });
const WORK = only(0, { work: true });

describe('Grab: empty hands', () => {
  it('picks up the nearest resting floor item in front, before any station', () => {
    const s = kitchenMatch();
    put(s, 0, 1.5, 2.5, UP); // facing the lettuce pantry
    const near = ingredient(s, 'bun');
    const far = ingredient(s, 'meat');
    const behind = ingredient(s, 'tomato');
    const flying = ingredient(s, 'steak');
    const rest = { x: 0, y: 0 };
    s.floorItems.push(
      { item: far, pos: { x: 1.5, y: 1.6 + 0.4 }, vel: rest, thrownBy: null, thrownAtTick: null, travelled: 0 },
      { item: near, pos: { x: 1.5, y: 2.3 }, vel: rest, thrownBy: null, thrownAtTick: null, travelled: 0 },
      { item: behind, pos: { x: 1.5, y: 2.6 }, vel: rest, thrownBy: null, thrownAtTick: null, travelled: 0 },
      { item: flying, pos: { x: 1.5, y: 2.4 }, vel: { x: 1, y: 0 }, thrownBy: null, thrownAtTick: null, travelled: 0 },
    );
    // `behind` is 0.1 behind; `flying` is in flight. `near` (0.2 in front) wins over the pantry.
    run(s, 1, GRAB);
    expect(s.players[0].holding?.id).toBe(near.id);
    expect(s.events).toContainEqual({ type: 'grab', player: 0, itemId: near.id });
    expect(s.floorItems.map((fi) => fi.item.id)).not.toContain(near.id);
  });

  it('ignores floor items beyond interactReach', () => {
    const s = kitchenMatch();
    put(s, 0, 9.5, 3.5, DOWN);
    const it = ingredient(s, 'bun');
    s.floorItems.push({ item: it, pos: { x: 9.5, y: 3.5 + 1.2 }, vel: { x: 0, y: 0 }, thrownBy: null, thrownAtTick: null, travelled: 0 });
    run(s, 1, GRAB);
    expect(s.players[0].holding).toBeNull();
  });

  it('takes a new raw ingredient from a pantry', () => {
    const s = kitchenMatch();
    put(s, 0, 2.5, 2.5, UP); // tomato pantry
    run(s, 1, GRAB);
    expect(s.players[0].holding).toMatchObject({ type: 'ingredient', kind: 'tomato', state: 'raw' });
    const first = s.players[0].holding!.id;
    s.players[0].holding = null;
    run(s, 1, GRAB);
    expect(s.players[0].holding!.id).not.toBe(first);
  });

  it('crate: takes a raw ingredient while stocked, nothing when empty', () => {
    const s = kitchenMatch();
    put(s, 0, 10.5, 2.5, UP);
    const crate = stationXY(s, 10, 1);
    crate.stock = 0;
    run(s, 1, GRAB);
    expect(s.players[0].holding).toBeNull();
    crate.stock = 1;
    run(s, 1, GRAB);
    expect(s.players[0].holding).toMatchObject({ type: 'ingredient', state: 'raw' });
  });

  it('takes a clean empty plate from a rack with stock, none when empty', () => {
    const s = kitchenMatch();
    put(s, 0, 3.5, 4.5, DOWN);
    const rack = stationXY(s, 3, 5);
    expect(rack.stock).toBe(4);
    run(s, 1, GRAB);
    expect(s.players[0].holding).toMatchObject({ type: 'plate', dirty: false, contents: [], cold: false, platedAtTick: null });
    expect(rack.stock).toBe(3);
    s.players[0].holding = null;
    rack.stock = 0;
    run(s, 1, GRAB);
    expect(s.players[0].holding).toBeNull();
  });

  it('picks up an item from a counter or board (board progress resets)', () => {
    const s = kitchenMatch();
    const lettuce = ingredient(s, 'lettuce');
    const board = stationXY(s, 6, 1);
    board.item = lettuce;
    board.workTicks = 10;
    put(s, 0, 6.5, 2.5, UP);
    run(s, 1, GRAB);
    expect(s.players[0].holding).toBe(lettuce);
    expect(board.item).toBeNull();
    expect(board.workTicks).toBe(0);

    const counter = stationXY(s, 5, 1);
    const p = plate(s);
    counter.item = p;
    s.players[0].holding = null;
    put(s, 0, 5.5, 2.5, UP);
    run(s, 1, GRAB);
    expect(s.players[0].holding).toBe(p);
  });

  it('picks up burnt food from a burnt stove and resets the vessel', () => {
    const s = kitchenMatch();
    const pan = stationXY(s, 7, 1).vessel!;
    Object.assign(pan, { contents: [food('meat', 'burnt')], status: 'burnt', cookTicks: 300 });
    put(s, 0, 7.5, 2.5, UP);
    run(s, 1, GRAB);
    expect(s.players[0].holding).toMatchObject({ type: 'ingredient', kind: 'meat', state: 'burnt' });
    expect(pan).toEqual({ kind: 'pan', contents: [], cookTicks: 0, status: 'empty' });
  });

  it('does nothing on an empty counter, a cooking stove, a wall or the trash', () => {
    const s = kitchenMatch();
    const pan = stationXY(s, 7, 1).vessel!;
    Object.assign(pan, { contents: [food('meat', 'raw')], status: 'cooking', cookTicks: 3 });
    for (const [x, y, dir] of [
      [5.5, 2.5, UP],
      [7.5, 2.5, UP],
      [9.5, 2.5, UP],
      [5.5, 4.5, DOWN],
    ] as const) {
      put(s, 0, x, y, dir);
      run(s, 1, GRAB);
      expect(s.players[0].holding).toBeNull();
    }
  });
});

describe('Grab: holding an ingredient', () => {
  it('places it on an empty counter or board', () => {
    const s = kitchenMatch();
    const ing = ingredient(s, 'lettuce');
    put(s, 0, 6.5, 2.5, UP).holding = ing;
    run(s, 1, GRAB);
    expect(stationXY(s, 6, 1).item).toBe(ing);
    expect(s.players[0].holding).toBeNull();
    expect(s.events).toContainEqual({ type: 'drop', player: 0, itemId: ing.id, tile: tileAtXY(s, 6, 1) });
  });

  it('adds it to a plate on a counter only if it fits', () => {
    const s = kitchenMatch();
    const counter = stationXY(s, 5, 1);
    const p = plate(s);
    counter.item = p;
    put(s, 0, 5.5, 2.5, UP).holding = ingredient(s, 'lettuce', 'raw'); // raw lettuce is in no recipe
    run(s, 1, GRAB);
    expect(p.contents).toEqual([]);
    expect(s.players[0].holding).not.toBeNull();

    s.players[0].holding = ingredient(s, 'lettuce', 'chopped');
    run(s, 1, GRAB);
    expect(p.contents).toEqual([food('lettuce', 'chopped')]);
    expect(p.platedAtTick).toBe(s.tick);
    expect(s.players[0].holding).toBeNull();
  });

  it("can't place on an occupied counter (ingredient on ingredient)", () => {
    const s = kitchenMatch();
    const other = ingredient(s, 'bun');
    stationXY(s, 5, 1).item = other;
    const mine = ingredient(s, 'meat');
    put(s, 0, 5.5, 2.5, UP).holding = mine;
    run(s, 1, GRAB);
    expect(s.players[0].holding).toBe(mine);
    expect(stationXY(s, 5, 1).item).toBe(other);
  });

  it('puts a cookable ingredient into the stove vessel', () => {
    const s = kitchenMatch();
    put(s, 0, 7.5, 2.5, UP).holding = ingredient(s, 'meat');
    run(s, 1, GRAB);
    expect(stationXY(s, 7, 1).vessel).toMatchObject({ status: 'cooking', contents: [food('meat', 'raw')] });
    expect(s.players[0].holding).toBeNull();
  });

  it('trash destroys an ingredient', () => {
    const s = kitchenMatch();
    const ing = ingredient(s, 'bun');
    put(s, 0, 5.5, 4.5, DOWN).holding = ing;
    run(s, 1, GRAB);
    expect(s.players[0].holding).toBeNull();
    expect(s.floorItems).toHaveLength(0);
    expect(Object.values(s.stations).some((st) => st.item?.id === ing.id)).toBe(false);
    expect(s.events).toContainEqual({ type: 'drop', player: 0, itemId: ing.id, tile: tileAtXY(s, 5, 5) });
  });
});

describe('Grab: holding a plate', () => {
  it('trash empties the plate and resets cold, plate stays in hand', () => {
    const s = kitchenMatch();
    const p = plate(s, [food('bun', 'raw')], { cold: true });
    put(s, 0, 5.5, 4.5, DOWN).holding = p;
    run(s, 1, GRAB);
    expect(s.players[0].holding).toBe(p);
    expect(p).toMatchObject({ contents: [], cold: false, platedAtTick: null });
  });

  it('own pass calls deliverPlate; refused (stub) keeps the plate in hand', () => {
    const s = kitchenMatch();
    const p = plate(s, [food('bun', 'raw'), food('meat', 'cooked')]);
    put(s, 0, 4.5, 4.5, DOWN).holding = p;
    run(s, 1, GRAB);
    expect(s.players[0].holding).toBe(p);
  });

  it('pulls a fitting ingredient off a counter onto the plate', () => {
    const s = kitchenMatch();
    const counter = stationXY(s, 5, 1);
    counter.item = ingredient(s, 'tomato', 'chopped');
    const p = plate(s, [food('lettuce', 'chopped')]);
    put(s, 0, 5.5, 2.5, UP).holding = p;
    run(s, 1, GRAB);
    expect(counter.item).toBeNull();
    expect(p.contents).toEqual([food('lettuce', 'chopped'), food('tomato', 'chopped')]);
    expect(s.players[0].holding).toBe(p);

    counter.item = ingredient(s, 'bun'); // salad + bun fits nothing
    run(s, 1, GRAB);
    expect(counter.item).not.toBeNull();
    expect(p.contents).toHaveLength(2);
  });

  it('takes all contents from a done vessel if they fit, resetting the vessel', () => {
    const s = kitchenMatch();
    const pot = stationXY(s, 1, 5).vessel!;
    Object.assign(pot, { contents: [food('tomato', 'cooked'), food('tomato', 'cooked'), food('tomato', 'cooked')], status: 'done', cookTicks: 400 });
    const bad = plate(s, [food('lettuce', 'chopped')]);
    put(s, 0, 1.5, 4.5, DOWN).holding = bad;
    run(s, 1, GRAB);
    expect(pot.status).toBe('done');
    expect(bad.contents).toHaveLength(1);

    const good = plate(s);
    s.players[0].holding = good;
    run(s, 1, GRAB);
    expect(good.contents).toEqual(Array(3).fill(food('tomato', 'cooked')));
    expect(good.platedAtTick).toBe(s.tick);
    expect(pot).toEqual({ kind: 'pot', contents: [], cookTicks: 0, status: 'empty' });
  });

  it("doesn't take from a vessel that is still cooking", () => {
    const s = kitchenMatch();
    const pan = stationXY(s, 7, 1).vessel!;
    Object.assign(pan, { contents: [food('meat', 'raw')], status: 'cooking', cookTicks: 1 });
    const p = plate(s, [food('bun', 'raw')]);
    put(s, 0, 7.5, 2.5, UP).holding = p;
    run(s, 1, GRAB);
    expect(p.contents).toHaveLength(1);
  });

  it('places the plate on an empty counter', () => {
    const s = kitchenMatch();
    const p = plate(s);
    put(s, 0, 7.5, 4.5, DOWN).holding = p;
    run(s, 1, GRAB);
    expect(stationXY(s, 7, 5).item).toBe(p);
    expect(s.players[0].holding).toBeNull();
  });
});

describe('Grab: floor drops and restrictions', () => {
  it('drops anything on the floor at pos + facing × 0.6', () => {
    const s = kitchenMatch();
    const ing = ingredient(s, 'bun');
    put(s, 0, 9.5, 3.5, RIGHT).holding = ing;
    run(s, 1, GRAB);
    expect(s.players[0].holding).toBeNull();
    expect(s.floorItems).toHaveLength(1);
    expect(s.floorItems[0]).toMatchObject({ item: ing, vel: { x: 0, y: 0 } });
    expect(s.floorItems[0]!.pos.x).toBeCloseTo(10.1);
    expect(s.events).toContainEqual({ type: 'drop', player: 0, itemId: ing.id, tile: null });
    // And picks it back up.
    run(s, 1, GRAB);
    expect(s.players[0].holding).toBe(ing);
  });

  it('never drops onto a wall or into the rival kitchen', () => {
    const s = kitchenMatch();
    const ing = ingredient(s, 'bun');
    put(s, 0, 1.4, 2.5, LEFT).holding = ing;
    run(s, 1, GRAB);
    expect(s.players[0].holding).toBe(ing);
    put(s, 0, 12.6, 2.5, RIGHT);
    run(s, 1, GRAB);
    expect(s.players[0].holding).toBe(ing);
    expect(s.floorItems).toHaveLength(0);
  });

  it("dazed players can't grab", () => {
    const s = kitchenMatch();
    put(s, 0, 1.5, 2.5, UP).dazedTicks = 10;
    run(s, 1, GRAB);
    expect(s.players[0].holding).toBeNull();
  });

  it("can't use the rival team's stations (kitchen swap respected)", () => {
    const s = kitchenMatch();
    s.round.swapped = true; // kitchen0 now belongs to team 1
    put(s, 0, 1.5, 2.5, UP);
    run(s, 1, GRAB);
    expect(s.players[0].holding).toBeNull();
    put(s, 2, 1.5, 2.5, UP);
    run(s, 1, only(2, { grab: true }));
    expect(s.players[2].holding).toMatchObject({ kind: 'lettuce' });
  });

  it("a burning station can't be used", () => {
    const s = kitchenMatch();
    s.fires.push({ tile: tileAtXY(s, 1, 1), spreadAtTick: 10_000, extinguishTicks: 0 });
    put(s, 0, 1.5, 2.5, UP);
    run(s, 1, GRAB);
    expect(s.players[0].holding).toBeNull();
  });
});

describe('plate fits', () => {
  const s = kitchenMatch();
  const R = KITCHEN_RECIPES;
  it('accepts sub-multisets of at least one recipe', () => {
    expect(plateFits(plate(s), [food('lettuce', 'chopped')], R)).toBe(true); // salad, steak
    expect(plateFits(plate(s, [food('steak', 'cooked')]), [food('lettuce', 'chopped')], R)).toBe(true);
    expect(plateFits(plate(s, [food('tomato', 'cooked'), food('tomato', 'cooked')]), [food('tomato', 'cooked')], R)).toBe(true);
    expect(plateFits(plate(s), Array(3).fill(food('tomato', 'cooked')), R)).toBe(true);
  });

  it('rejects over-counts, cross-recipe mixes and wrong states', () => {
    expect(plateFits(plate(s, Array(3).fill(food('tomato', 'cooked'))), [food('tomato', 'cooked')], R)).toBe(false);
    expect(plateFits(plate(s, [food('lettuce', 'chopped')]), [food('lettuce', 'chopped')], R)).toBe(false);
    expect(plateFits(plate(s, [food('lettuce', 'chopped')]), [food('bun', 'raw')], R)).toBe(false);
    expect(plateFits(plate(s), [food('meat', 'raw')], R)).toBe(false);
    expect(plateFits(plate(s), [food('meat', 'burnt')], R)).toBe(false);
  });

  it('dirty and cold plates accept nothing', () => {
    expect(plateFits(plate(s, [], { dirty: true }), [food('bun', 'raw')], R)).toBe(false);
    expect(plateFits(plate(s, [food('bun', 'raw')], { cold: true }), [food('meat', 'cooked')], R)).toBe(false);
  });
});

describe('Work', () => {
  it('chops a raw choppable ingredient; releasing keeps progress', () => {
    const s = kitchenMatch();
    const chop = timerTicks(s.config, s.config.tuning.chopSeconds);
    const board = stationXY(s, 6, 1);
    const ing = ingredient(s, 'lettuce');
    board.item = ing;
    put(s, 0, 6.5, 2.5, UP);
    run(s, 10, WORK);
    expect(board.workTicks).toBe(10);
    expect(s.players[0].working).toBe(true);
    run(s, 20);
    expect(board.workTicks).toBe(10);
    expect(s.players[0].working).toBe(false);
    const ev = run(s, chop - 10, WORK);
    expect(ing.state).toBe('chopped');
    expect(board.workTicks).toBe(0);
    expect(ev).toContainEqual({ type: 'chopDone', tile: board.tile });
    run(s, 1, WORK);
    expect(s.players[0].working).toBe(false); // nothing left to chop
  });

  it("doesn't chop non-choppable or already chopped food, nor on a counter", () => {
    const s = kitchenMatch();
    const board = stationXY(s, 6, 1);
    board.item = ingredient(s, 'meat');
    put(s, 0, 6.5, 2.5, UP);
    run(s, 5, WORK);
    expect(board.workTicks).toBe(0);
    const counter = stationXY(s, 5, 1);
    counter.item = ingredient(s, 'lettuce');
    put(s, 0, 5.5, 2.5, UP);
    run(s, 100, WORK);
    expect(counter.item).toMatchObject({ state: 'raw' });
  });

  it('washes a dirty plate back onto the rack', () => {
    const s = kitchenMatch();
    const wash = timerTicks(s.config, s.config.tuning.washSeconds);
    const sink = stationXY(s, 2, 5);
    const rack = stationXY(s, 3, 5);
    sink.dirtyPlates = 2;
    rack.stock = 0;
    put(s, 0, 2.5, 4.5, DOWN);
    const ev = run(s, wash, WORK);
    expect(sink.dirtyPlates).toBe(1);
    expect(rack.stock).toBe(1);
    expect(ev.filter((e) => e.type === 'washDone')).toHaveLength(1);
    run(s, wash, WORK);
    expect([sink.dirtyPlates, rack.stock]).toEqual([0, 2]);
    run(s, wash, WORK);
    expect(rack.stock).toBe(2);
  });

  it('extinguishes a fire and resets a burning stove', () => {
    const s = kitchenMatch();
    const pan = stationXY(s, 7, 1);
    Object.assign(pan.vessel!, { contents: [food('meat', 'burnt')], status: 'fire', cookTicks: 999 });
    s.fires.push({ tile: pan.tile, spreadAtTick: 10_000, extinguishTicks: 0 });
    put(s, 0, 7.5, 2.5, UP);
    const ticks = Math.round(s.config.tuning.extinguishSeconds * s.config.tuning.tickRate);
    run(s, ticks - 1, WORK);
    expect(s.fires).toHaveLength(1);
    const ev = run(s, 1, WORK);
    expect(s.fires).toHaveLength(0);
    expect(ev).toContainEqual({ type: 'fireOut', tile: pan.tile });
    expect(pan.vessel).toEqual({ kind: 'pan', contents: [], cookTicks: 0, status: 'empty' });
  });
});
