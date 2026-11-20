import { describe, expect, it } from 'vitest';
import { lerp, PositionTracker } from '../../src/render/interp';

describe('PositionTracker', () => {
  it('interpolates between the previous and current tick', () => {
    const t = new PositionTracker<number>();
    const pos = { x: 1, y: 1 };
    t.update(1, [[0, pos]]);
    expect(t.get(0, 0.5, pos)).toEqual({ x: 1, y: 1 }); // first sighting: no history
    pos.x = 2; // sim mutates in place
    t.update(2, [[0, pos]]);
    expect(t.get(0, 0, pos)).toEqual({ x: 1, y: 1 });
    expect(t.get(0, 0.5, pos)).toEqual({ x: 1.5, y: 1 });
    expect(t.get(0, 1, pos)).toEqual({ x: 2, y: 1 });
  });

  it('ignores repeated updates for the same tick', () => {
    const t = new PositionTracker<number>();
    t.update(1, [[0, { x: 0, y: 0 }]]);
    t.update(2, [[0, { x: 1, y: 0 }]]);
    t.update(2, [[0, { x: 1, y: 0 }]]);
    expect(t.get(0, 0.5, { x: 9, y: 9 })).toEqual({ x: 0.5, y: 0 });
  });

  it('snaps on teleports and when time goes backwards', () => {
    const t = new PositionTracker<number>();
    t.update(1, [[0, { x: 0, y: 0 }]]);
    t.update(2, [[0, { x: 10, y: 0 }]]);
    expect(t.get(0, 0.5, { x: 0, y: 0 })).toEqual({ x: 10, y: 0 });
    t.update(1, [[0, { x: 3, y: 0 }]]);
    expect(t.get(0, 0.5, { x: 0, y: 0 })).toEqual({ x: 3, y: 0 });
  });

  it('falls back for unknown keys and drops vanished ones', () => {
    const t = new PositionTracker<number>();
    t.update(1, [[5, { x: 1, y: 1 }]]);
    t.update(2, []);
    expect(t.get(5, 0.5, { x: 7, y: 7 })).toEqual({ x: 7, y: 7 });
  });

  it('lerp', () => {
    expect(lerp(0, 10, 0.25)).toBe(2.5);
  });
});
