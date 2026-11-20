import type { Vec2 } from '@line-war/sim';

/** Anything moving further than this in one tick is a teleport (respawn, new round): snap. */
export const SNAP_DISTANCE = 2;

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export function lerpVec(a: Vec2, b: Vec2, t: number): Vec2 {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
}

/**
 * Remembers the previous and current sim-tick position of keyed entities so the renderer
 * can draw them between ticks. Copies positions (the sim mutates its own objects in place).
 */
export class PositionTracker<K extends string | number> {
  private prev = new Map<K, Vec2>();
  private curr = new Map<K, Vec2>();
  private tick: number | null = null;

  /** Feed the positions for `tick`. Calling again with the same tick is a no-op. */
  update(tick: number, entries: Iterable<[K, Vec2]>): void {
    if (tick === this.tick) return;
    const continuous = this.tick !== null && tick > this.tick;
    const next = new Map<K, Vec2>();
    for (const [k, p] of entries) next.set(k, { x: p.x, y: p.y });
    this.prev = new Map();
    for (const [k, p] of next) {
      const before = continuous ? this.curr.get(k) : undefined;
      const jump = before ? Math.hypot(before.x - p.x, before.y - p.y) : Infinity;
      this.prev.set(k, before && jump <= SNAP_DISTANCE ? before : p);
    }
    this.curr = next;
    this.tick = tick;
  }

  /** Interpolated position (alpha in [0,1)); falls back to `fallback` for unknown keys. */
  get(key: K, alpha: number, fallback: Vec2): Vec2 {
    const c = this.curr.get(key);
    const p = this.prev.get(key);
    if (!c || !p) return { x: fallback.x, y: fallback.y };
    return lerpVec(p, c, Math.max(0, Math.min(1, alpha)));
  }
}
