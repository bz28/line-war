/** Same-tick contention alternates between teams by tick parity (review fix: team 0 always won). */
import { describe, expect, it } from 'vitest';
import type { MatchInputs, MatchState } from '../../src';
import { handleInteractions } from '../../src/systems/interact';
import { updateFloorItems } from '../../src/systems/items';
import { actingOrder } from '../../src/systems/kitchen/world';
import { ingredient, input, kitchenMatch, LEFT, put, RIGHT } from './helpers';

const bothGrab: MatchInputs = [input({ grab: true }), input(), input({ grab: true }), input()];

function contestedPickup(tick: number): MatchState {
  const s = kitchenMatch();
  s.tick = tick;
  put(s, 0, 9.5, 3.0, RIGHT);
  put(s, 2, 11.5, 3.0, LEFT);
  s.floorItems.push({ item: ingredient(s, 'steak'), pos: { x: 10.5, y: 3.0 }, vel: { x: 0, y: 0 }, thrownBy: null, thrownAtTick: null, travelled: 0 });
  handleInteractions(s, bothGrab);
  return s;
}

function tiedCatch(tick: number): MatchState {
  const s = kitchenMatch();
  s.tick = tick;
  put(s, 1, 10.1, 2.5);
  put(s, 2, 10.1, 3.5);
  s.floorItems.push({ item: ingredient(s, 'steak'), pos: { x: 10.0, y: 3.0 }, vel: { x: 12, y: 0 }, thrownBy: null, thrownAtTick: null, travelled: 0 });
  updateFloorItems(s);
  return s;
}

describe('acting order', () => {
  it('is [0,1,2,3] on even ticks and [2,3,0,1] on odd ticks', () => {
    const s = kitchenMatch();
    s.tick = 10;
    expect(actingOrder(s).map((p) => p.id)).toEqual([0, 1, 2, 3]);
    s.tick = 11;
    expect(actingOrder(s).map((p) => p.id)).toEqual([2, 3, 0, 1]);
  });

  it('a contested floor pickup goes to team 0 on even ticks and team 1 on odd ticks', () => {
    const even = contestedPickup(100);
    expect(even.players[0].holding).not.toBeNull();
    expect(even.players[2].holding).toBeNull();
    const odd = contestedPickup(101);
    expect(odd.players[2].holding).not.toBeNull();
    expect(odd.players[0].holding).toBeNull();
  });

  it('an exactly tied catch alternates the same way', () => {
    const even = tiedCatch(100);
    expect(even.players[1].holding).not.toBeNull();
    expect(even.players[2].holding).toBeNull();
    const odd = tiedCatch(101);
    expect(odd.players[2].holding).not.toBeNull();
    expect(odd.players[1].holding).toBeNull();
  });
});
