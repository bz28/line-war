import { describe, expect, it } from 'vitest';
import { secondsToTicks } from '../../src';
import { DOWN, kitchenMatch, LEFT, only, put, RIGHT, run, UP } from './helpers';

const R = 0.35;

describe('walking', () => {
  it('moves at playerSpeed and clamps diagonal input to length 1', () => {
    const s = kitchenMatch();
    put(s, 0, 9.5, 2.5);
    run(s, 15, only(0, { move: { x: 1, y: 0 } })); // 0.5 s at 4 tiles/s
    expect(s.players[0].pos.x).toBeCloseTo(11.5, 5); // 2 tiles
    expect(s.players[0].vel.x).toBeCloseTo(4, 5);

    const d = kitchenMatch();
    put(d, 0, 9.5, 2.5);
    run(d, 3, only(0, { move: { x: 1, y: 1 } }));
    const moved = Math.hypot(d.players[0].pos.x - 9.5, d.players[0].pos.y - 2.5);
    expect(moved).toBeCloseTo((4 / 30) * 3, 5);
  });

  it('sets facing from the last non-zero move and keeps it when idle', () => {
    const s = kitchenMatch();
    expect(s.players[0].facing).toEqual(UP);
    run(s, 1, only(0, { move: { x: -0.5, y: 0 } }));
    expect(s.players[0].facing.x).toBeCloseTo(-1);
    expect(s.players[0].facing.y).toBeCloseTo(0);
    run(s, 5);
    expect(s.players[0].facing.x).toBeCloseTo(-1);
  });

  it('collides with walls and slides into corners', () => {
    const s = kitchenMatch();
    put(s, 0, 3.5, 2.5);
    run(s, 60, only(0, { move: LEFT }));
    expect(s.players[0].pos.x).toBeCloseTo(1 + R, 5);
    expect(s.players[0].pos.y).toBeCloseTo(2.5, 5);
    // Diagonal into the top-left corner (wall at x<1, pantries at y<2).
    run(s, 60, only(0, { move: { x: -1, y: -1 } }));
    expect(s.players[0].pos.x).toBeCloseTo(1 + R, 5);
    expect(s.players[0].pos.y).toBeCloseTo(2 + R, 5);
  });

  it('treats stations as solid', () => {
    const s = kitchenMatch();
    put(s, 0, 3.5, 3.5);
    run(s, 60, only(0, { move: DOWN })); // row 5 is stations, row 4 floor
    expect(s.players[0].pos.y).toBeCloseTo(5 - R, 5);
  });

  it('dazed players move at half speed', () => {
    const s = kitchenMatch();
    put(s, 0, 9.5, 2.5).dazedTicks = 1000;
    run(s, 15, only(0, { move: RIGHT }));
    expect(s.players[0].pos.x).toBeCloseTo(10.5, 5);
  });
});

describe('rival kitchen and doors', () => {
  it('a team-0 player walks through the doorway into the market', () => {
    const s = kitchenMatch();
    put(s, 0, 2.5, 2.5);
    run(s, 60, only(0, { move: RIGHT }));
    expect(s.players[0].pos.x).toBeCloseTo(10.5, 5);
  });

  it("can't enter the rival kitchen, but its own team can", () => {
    const s = kitchenMatch();
    put(s, 0, 10.5, 2.5);
    run(s, 60, only(0, { move: RIGHT }));
    expect(s.players[0].pos.x).toBeCloseTo(13 - R, 5); // stopped at the door column 12

    put(s, 2, 10.5, 3.5);
    run(s, 30, only(2, { move: RIGHT }));
    expect(s.players[2].pos.x).toBeCloseTo(14.5, 5);

    put(s, 2, 10.5, 3.5);
    run(s, 60, only(2, { move: LEFT }));
    expect(s.players[2].pos.x).toBeCloseTo(8 + R, 5); // team 1 blocked by kitchen0 at x<8
  });

  it('follows the kitchen swap flag', () => {
    const s = kitchenMatch();
    s.round.swapped = true;
    put(s, 1, 10.5, 4.5);
    put(s, 3, 9.5, 4.5);
    put(s, 2, 10.5, 2.5);
    run(s, 60, only(2, { move: LEFT }));
    expect(s.players[2].pos.x).toBeLessThan(8); // kitchen0 now belongs to team 1
    put(s, 0, 10.5, 3.5);
    run(s, 60, only(0, { move: LEFT }));
    expect(s.players[0].pos.x).toBeCloseTo(8 + R, 5);
  });
});

describe('player-player push', () => {
  it('pushes overlapping players apart with an equal split', () => {
    const s = kitchenMatch();
    put(s, 0, 10.4, 3.0);
    put(s, 3, 10.6, 3.0);
    run(s, 1);
    const [a, b] = [s.players[0].pos, s.players[3].pos];
    expect(b.x - a.x).toBeCloseTo(2 * R, 5);
    expect((a.x + b.x) / 2).toBeCloseTo(10.5, 5);
  });

  it('a walking player shoves another player', () => {
    const s = kitchenMatch();
    put(s, 0, 9.5, 2.5);
    put(s, 1, 10.3, 2.5);
    run(s, 15, only(0, { move: RIGHT }));
    expect(s.players[1].pos.x).toBeGreaterThan(10.3);
    expect(s.players[1].pos.x - s.players[0].pos.x).toBeCloseTo(2 * R, 3);
  });

  it('separates exactly overlapping players deterministically and never into walls', () => {
    const s = kitchenMatch();
    put(s, 0, 1.4, 2.5);
    put(s, 1, 1.4, 2.5);
    run(s, 5);
    expect(s.players[0].pos.x).toBeGreaterThanOrEqual(1 + R - 1e-6);
    expect(s.players[1].pos.x - s.players[0].pos.x).toBeCloseTo(2 * R, 3);
  });
});

describe('dash', () => {
  it('moves dashDistance along facing over dashSeconds and starts a cooldown', () => {
    const s = kitchenMatch();
    const t = s.config.tuning;
    put(s, 0, 2.5, 2.5, RIGHT);
    const ev = run(s, 1, only(0, { dash: true }));
    expect(ev).toContainEqual({ type: 'dash', player: 0 });
    const dashTicks = secondsToTicks(s.config, t.dashSeconds);
    run(s, dashTicks - 1);
    expect(s.players[0].pos.x).toBeCloseTo(2.5 + t.dashDistance, 5);
    expect(s.players[0].dashTicks).toBe(0);
    run(s, 5);
    expect(s.players[0].pos.x).toBeCloseTo(2.5 + t.dashDistance, 5); // no drift after the dash
  });

  it('respects the cooldown', () => {
    const s = kitchenMatch();
    const cd = secondsToTicks(s.config, s.config.tuning.dashCooldownSeconds);
    put(s, 0, 9.5, 2.5, RIGHT);
    run(s, 1, only(0, { dash: true }));
    expect(s.players[0].dashCooldown).toBe(cd);
    run(s, cd - 2);
    expect(run(s, 1, only(0, { dash: true }))).not.toContainEqual({ type: 'dash', player: 0 }); // cooldown 1 left
    expect(run(s, 1, only(0, { dash: true }))).toContainEqual({ type: 'dash', player: 0 });
  });

  it('is stopped by walls', () => {
    const s = kitchenMatch();
    put(s, 0, 2.5, 2.5, LEFT);
    run(s, 10, only(0, { dash: true }));
    expect(s.players[0].pos.x).toBeCloseTo(1 + R, 5);
  });

  it('is allowed while holding an item, not while dazed', () => {
    const s = kitchenMatch();
    const p = put(s, 0, 9.5, 2.5, RIGHT);
    p.holding = { id: 99, type: 'ingredient', kind: 'bun', state: 'raw' };
    expect(run(s, 1, only(0, { dash: true }))).toContainEqual({ type: 'dash', player: 0 });

    const d = kitchenMatch();
    const q = put(d, 0, 9.5, 2.5, RIGHT);
    q.dazedTicks = 5;
    expect(run(d, 1, only(0, { dash: true }))).toEqual([]);
    expect(q.pos.x).toBe(9.5);
    expect(q.dashCooldown).toBe(0);
  });

  it('counts down daze, knock immunity and cooldown each tick', () => {
    const s = kitchenMatch();
    const p = s.players[0];
    p.dazedTicks = 3;
    p.knockImmuneTicks = 2;
    p.dashCooldown = 1;
    run(s, 2);
    expect([p.dazedTicks, p.knockImmuneTicks, p.dashCooldown]).toEqual([1, 0, 0]);
    run(s, 5);
    expect(p.dazedTicks).toBe(0);
  });
});
