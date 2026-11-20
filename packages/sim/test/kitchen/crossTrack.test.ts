/**
 * Calls into the rules track (market.ts, tickets.ts, scoring.ts are stubs on main): mocked here
 * so we can check the kitchen systems call them exactly as specified.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { timerTicks } from '../../src';
import { handleInteractions } from '../../src/systems/interact';
import { deliverPlate } from '../../src/systems/tickets';
import { registerMistake } from '../../src/systems/scoring';
import { takeFromCrate, tryKnock } from '../../src/systems/market';
import { DOWN, food, ingredient, kitchenMatch, only, plate, put, RIGHT, run, stationXY, tileAtXY, UP } from './helpers';

vi.mock('../../src/systems/market', async (orig) => ({
  ...(await orig<typeof import('../../src/systems/market')>()),
  tryKnock: vi.fn(() => false),
  takeFromCrate: vi.fn(() => null),
}));
vi.mock('../../src/systems/tickets', async (orig) => ({
  ...(await orig<typeof import('../../src/systems/tickets')>()),
  deliverPlate: vi.fn(() => ({ ok: false, reason: 'noMatchingTicket' })),
}));
vi.mock('../../src/systems/scoring', async (orig) => ({
  ...(await orig<typeof import('../../src/systems/scoring')>()),
  registerMistake: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('dash knocks → tryKnock', () => {
  it('calls tryKnock once per dash on first rival contact', () => {
    const s = kitchenMatch();
    put(s, 0, 9.5, 2.5, RIGHT);
    put(s, 2, 11.0, 2.5);
    run(s, 10, only(0, { dash: true, move: RIGHT }));
    expect(tryKnock).toHaveBeenCalledTimes(1);
    expect(tryKnock).toHaveBeenCalledWith(s, 0, 2);
    expect(s.players[0].dashHit).toBe(true);
  });

  it('ignores teammates and non-dashing contact', () => {
    const s = kitchenMatch();
    put(s, 0, 9.5, 2.5, RIGHT);
    put(s, 1, 11.0, 2.5);
    run(s, 10, only(0, { dash: true }));
    put(s, 2, s.players[0].pos.x + 0.6, 2.5);
    run(s, 10, only(0, { move: RIGHT }));
    expect(tryKnock).not.toHaveBeenCalled();
  });

  it('a new dash can knock again', () => {
    const s = kitchenMatch();
    const cd = Math.round(s.config.tuning.dashCooldownSeconds * 30);
    put(s, 0, 9.5, 2.5, RIGHT);
    put(s, 2, 10.5, 2.5);
    run(s, 1, only(0, { dash: true }));
    run(s, cd);
    put(s, 2, s.players[0].pos.x + 0.7, 2.5);
    run(s, 1, only(0, { dash: true }));
    expect(tryKnock).toHaveBeenCalledTimes(2);
  });
});

describe('crate → takeFromCrate', () => {
  it('gives the returned item to the player', () => {
    const s = kitchenMatch();
    const steak = ingredient(s, 'steak');
    vi.mocked(takeFromCrate).mockReturnValueOnce(steak);
    put(s, 0, 10.5, 2.5, UP);
    const ev = run(s, 1, only(0, { grab: true }));
    expect(takeFromCrate).toHaveBeenCalledWith(s, tileAtXY(s, 10, 1));
    expect(s.players[0].holding).toBe(steak);
    expect(ev).toContainEqual({ type: 'grab', player: 0, itemId: steak.id });
  });
});

describe('pass → deliverPlate', () => {
  it('on ok the plate leaves the hands; on refusal it stays', () => {
    const s = kitchenMatch();
    const p = plate(s, [food('bun', 'raw'), food('meat', 'cooked')]);
    put(s, 0, 4.5, 4.5, DOWN).holding = p;
    run(s, 1, only(0, { grab: true }));
    expect(deliverPlate).toHaveBeenCalledWith(s, 0, p);
    expect(s.players[0].holding).toBe(p);
    vi.mocked(deliverPlate).mockReturnValueOnce({ ok: true, ticketId: 1, points: 60 });
    run(s, 1, only(0, { grab: true }));
    expect(s.players[0].holding).toBeNull();
  });

  it("is never called for the rival's pass", () => {
    const s = kitchenMatch();
    s.round.swapped = true;
    const p = plate(s, [food('bun', 'raw')]);
    put(s, 0, 4.5, 4.5, DOWN).holding = p;
    handleInteractions(s, only(0, { grab: true }));
    expect(deliverPlate).not.toHaveBeenCalled();
    expect(s.players[0].holding).toBe(p);
  });
});

describe('burn → registerMistake', () => {
  it('calls registerMistake for the stove owner exactly once', () => {
    const s = kitchenMatch();
    const t = s.config.tuning;
    put(s, 0, 7.5, 2.5, UP).holding = ingredient(s, 'meat');
    run(s, 1, only(0, { grab: true }));
    run(s, timerTicks(s.config, t.panCookSeconds) + timerTicks(s.config, t.panBurnSeconds) + 40);
    expect(stationXY(s, 7, 1).vessel!.status).toBe('burnt');
    expect(registerMistake).toHaveBeenCalledTimes(1);
    expect(registerMistake).toHaveBeenCalledWith(s, 0);
  });
});
