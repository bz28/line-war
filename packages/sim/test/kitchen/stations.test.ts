import { describe, expect, it } from 'vitest';
import { secondsToTicks, timerTicks, type MatchState } from '../../src';
import { DOWN, food, ingredient, kitchenMatch, only, put, run, stationXY, tileAtXY, UP } from './helpers';

const GRAB = only(0, { grab: true });

function panTimeline(s: MatchState) {
  const t = s.config.tuning;
  const done = timerTicks(s.config, t.panCookSeconds);
  const burnt = done + timerTicks(s.config, t.panBurnSeconds);
  const fire = burnt + timerTicks(s.config, t.fireAfterBurnSeconds);
  return { done, burnt, fire };
}

describe('pan', () => {
  it('cooks immediately: done → burnt → fire on schedule', () => {
    const s = kitchenMatch();
    const tl = panTimeline(s);
    const stove = stationXY(s, 7, 1);
    put(s, 0, 7.5, 2.5, UP).holding = ingredient(s, 'meat');
    run(s, 1, GRAB); // placed and first cook tick
    expect(stove.vessel).toMatchObject({ status: 'cooking', cookTicks: 1 });

    run(s, tl.done - 2);
    expect(stove.vessel!.status).toBe('cooking');
    let ev = run(s, 1);
    expect(stove.vessel).toMatchObject({ status: 'done', contents: [food('meat', 'cooked')] });
    expect(ev).toContainEqual({ type: 'cookDone', tile: stove.tile });

    run(s, tl.burnt - tl.done - 1);
    expect(stove.vessel!.status).toBe('done');
    ev = run(s, 1);
    expect(stove.vessel).toMatchObject({ status: 'burnt', contents: [food('meat', 'burnt')] });
    expect(ev).toContainEqual({ type: 'burnt', tile: stove.tile });

    run(s, tl.fire - tl.burnt - 1);
    expect(s.fires).toHaveLength(0);
    ev = run(s, 1);
    expect(stove.vessel!.status).toBe('fire');
    expect(s.fires).toEqual([{ tile: stove.tile, spreadAtTick: s.tick + secondsToTicks(s.config, s.config.tuning.fireSpreadSeconds), extinguishTicks: 0 }]);
    expect(ev).toContainEqual({ type: 'fireStart', tile: stove.tile });
  });

  it('Brunch Speed stretches the cook time ×1.5', () => {
    const s = kitchenMatch({ brunchSpeed: true });
    const stove = stationXY(s, 7, 1);
    put(s, 0, 7.5, 2.5, UP).holding = ingredient(s, 'meat');
    run(s, 1, GRAB);
    run(s, Math.round(6 * 30 * 1.5) - 2);
    expect(stove.vessel!.status).toBe('cooking');
    run(s, 1);
    expect(stove.vessel!.status).toBe('done');
  });

  it('accepts only one matching ingredient, only when empty', () => {
    const s = kitchenMatch();
    const stove = stationXY(s, 7, 1);
    const p = put(s, 0, 7.5, 2.5, UP);
    for (const bad of [ingredient(s, 'lettuce'), ingredient(s, 'tomato', 'chopped'), ingredient(s, 'meat', 'cooked')]) {
      p.holding = bad;
      run(s, 1, GRAB);
      expect(p.holding).toBe(bad);
    }
    expect(stove.vessel!.status).toBe('empty');
    p.holding = ingredient(s, 'steak');
    run(s, 1, GRAB);
    const second = ingredient(s, 'meat');
    p.holding = second;
    run(s, 1, GRAB);
    expect(p.holding).toBe(second);
    expect(stove.vessel!.contents).toEqual([food('steak', 'raw')]);
  });

  it('picking up burnt food resets the vessel so it can cook again', () => {
    const s = kitchenMatch();
    const tl = panTimeline(s);
    const stove = stationXY(s, 7, 1);
    const p = put(s, 0, 7.5, 2.5, UP);
    p.holding = ingredient(s, 'meat');
    run(s, 1, GRAB);
    run(s, tl.burnt - 1);
    expect(stove.vessel!.status).toBe('burnt');
    run(s, 1, GRAB);
    expect(p.holding).toMatchObject({ kind: 'meat', state: 'burnt' });
    expect(stove.vessel).toEqual({ kind: 'pan', contents: [], cookTicks: 0, status: 'empty' });
    run(s, tl.fire);
    expect(s.fires).toHaveLength(0); // the reset vessel never catches fire
  });
});

describe('pot', () => {
  it('fills up to potCapacity and only starts cooking when full', () => {
    const s = kitchenMatch();
    const t = s.config.tuning;
    const pot = stationXY(s, 1, 5).vessel!;
    const p = put(s, 0, 1.5, 4.5, DOWN);
    const raw = ingredient(s, 'tomato', 'raw');
    p.holding = raw;
    run(s, 1, GRAB);
    expect(p.holding).toBe(raw); // must be chopped first
    for (let i = 0; i < t.potCapacity - 1; i++) {
      p.holding = ingredient(s, 'tomato', 'chopped');
      run(s, 1, GRAB);
      expect(p.holding).toBeNull();
    }
    run(s, 100);
    expect(pot).toMatchObject({ status: 'empty', cookTicks: 0 });
    expect(pot.contents).toHaveLength(t.potCapacity - 1);
    p.holding = ingredient(s, 'tomato', 'chopped');
    run(s, 1, GRAB);
    expect(pot.status).toBe('cooking');
    const cook = timerTicks(s.config, t.potCookSeconds);
    run(s, cook - 1);
    expect(pot).toMatchObject({ status: 'done', contents: Array(3).fill(food('tomato', 'cooked')) });
    const extra = ingredient(s, 'tomato', 'chopped');
    p.holding = extra;
    run(s, 1, GRAB);
    expect(p.holding).toBe(extra); // full / not empty
    run(s, timerTicks(s.config, t.potBurnSeconds));
    expect(pot.status).toBe('burnt');
  });
});

describe('fire', () => {
  it('spreads every fireSpreadSeconds to an orthogonal interactive tile that is not burning', () => {
    const s = kitchenMatch();
    const spread = secondsToTicks(s.config, s.config.tuning.fireSpreadSeconds);
    const counter = tileAtXY(s, 5, 1); // neighbours: meat pantry (4,1), board (6,1), wall, floor
    s.fires.push({ tile: counter, spreadAtTick: s.tick + spread, extinguishTicks: 0 });
    run(s, spread - 1);
    expect(s.fires).toHaveLength(1);
    const ev = run(s, 1);
    expect(s.fires).toHaveLength(2);
    const first = s.fires[1]!.tile;
    expect([tileAtXY(s, 4, 1), tileAtXY(s, 6, 1)]).toContain(first);
    expect(ev).toContainEqual({ type: 'fireStart', tile: first });
    run(s, spread);
    // The counter's other neighbour is now burning too (it is the only non-burning candidate left).
    const tiles = s.fires.map((f) => f.tile);
    expect(tiles).toContain(tileAtXY(s, 4, 1));
    expect(tiles).toContain(tileAtXY(s, 6, 1));
    expect(new Set(tiles).size).toBe(tiles.length);
    for (const t of tiles) expect(s.arena.tiles[t]!.kind).not.toMatch(/floor|wall/);
  });

  it('picks the spread target with the seeded rng (both neighbours happen across seeds)', () => {
    const picks = new Set<number>();
    const bySeed = (seed: number) => {
      const s = kitchenMatch({ seed });
      s.fires.push({ tile: tileAtXY(s, 5, 1), spreadAtTick: s.tick + 1, extinguishTicks: 0 });
      run(s, 1);
      return s.fires[1]!.tile;
    };
    for (let seed = 1; seed <= 20; seed++) {
      expect(bySeed(seed)).toBe(bySeed(seed));
      picks.add(bySeed(seed));
    }
    expect(picks.size).toBe(2);
  });

  it('a fire spreading onto a cooking stove stops it; extinguishing empties it', () => {
    const s = kitchenMatch();
    const stove = stationXY(s, 7, 1);
    Object.assign(stove.vessel!, { contents: [food('meat', 'raw')], status: 'cooking', cookTicks: 5 });
    // Board (6,1) burns; its other neighbour, counter (5,1), already burns, so the pan is the only candidate.
    s.fires.push({ tile: tileAtXY(s, 6, 1), spreadAtTick: s.tick + 1, extinguishTicks: 0 });
    s.fires.push({ tile: tileAtXY(s, 5, 1), spreadAtTick: 10_000, extinguishTicks: 0 });
    run(s, 1);
    expect(s.fires.map((f) => f.tile)).toContain(stove.tile);
    expect(stove.vessel!.status).toBe('fire');
    const frozenAt = stove.vessel!.cookTicks;
    run(s, 30);
    expect(stove.vessel!.cookTicks).toBe(frozenAt);
    put(s, 0, 7.5, 2.5, UP);
    run(s, secondsToTicks(s.config, s.config.tuning.extinguishSeconds), only(0, { work: true }));
    expect(s.fires.map((f) => f.tile)).not.toContain(stove.tile);
    expect(stove.vessel!.status).toBe('empty');
  });

  it('extinguish progress is per fire and survives releasing Work', () => {
    const s = kitchenMatch();
    const tile = tileAtXY(s, 1, 1);
    s.fires.push({ tile, spreadAtTick: 10_000, extinguishTicks: 0 });
    put(s, 0, 1.5, 2.5, UP);
    run(s, 10, only(0, { work: true }));
    run(s, 10);
    expect(s.fires[0]!.extinguishTicks).toBe(10);
    expect(s.players[0].working).toBe(false);
  });
});

describe('dirty plate returns', () => {
  it("lands in the team's sink once atTick passes", () => {
    const s = kitchenMatch();
    const sink = stationXY(s, 2, 5);
    s.dirtyPlateReturns.push({ team: 0, atTick: s.tick + 5 }, { team: 0, atTick: s.tick + 8 });
    run(s, 4);
    expect(sink.dirtyPlates).toBe(0);
    run(s, 1);
    expect(sink.dirtyPlates).toBe(1);
    expect(s.dirtyPlateReturns).toHaveLength(1);
    run(s, 3);
    expect(sink.dirtyPlates).toBe(2);
    expect(s.dirtyPlateReturns).toHaveLength(0);
  });

  it('uses the sink the team owns this round (swap)', () => {
    const s = kitchenMatch();
    s.round.swapped = true;
    const sink = stationXY(s, 2, 5);
    s.dirtyPlateReturns.push({ team: 0, atTick: s.tick + 1 }, { team: 1, atTick: s.tick + 1 });
    run(s, 1);
    expect(sink.dirtyPlates).toBe(1); // team 1's; team 0 has no sink in this arena
  });
});
