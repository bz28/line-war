import { describe, expect, it } from 'vitest';
import { computeLayout, fitToViewport, ticketSlots, tileRect, TILE, worldToScreen } from '../../src/render/layout';

describe('computeLayout', () => {
  it('stacks top bar, ticket bar and world', () => {
    const l = computeLayout(25, 13);
    expect(l.width).toBe(25 * TILE);
    expect(l.ticketBar.y).toBe(l.topBar.y + l.topBar.h);
    expect(l.world.y).toBe(l.ticketBar.y + l.ticketBar.h);
    expect(l.height).toBe(l.world.y + 13 * TILE);
  });

  it('maps tiles and world positions to pixels', () => {
    const l = computeLayout(25, 13);
    expect(tileRect(l, 25, 25 + 3)).toEqual({ x: 3 * TILE, y: l.world.y + TILE, w: TILE, h: TILE });
    expect(worldToScreen(l, { x: 0.5, y: 1 })).toEqual({ x: TILE / 2, y: l.world.y + TILE });
  });
});

describe('fitToViewport', () => {
  it('keeps aspect ratio and fits inside the viewport', () => {
    expect(fitToViewport(1000, 500, 4000, 1000)).toMatchObject({ cssWidth: 2000, cssHeight: 1000, scale: 2 });
    expect(fitToViewport(1000, 500, 500, 4000)).toMatchObject({ cssWidth: 500, cssHeight: 250, scale: 0.5 });
  });

  it('applies devicePixelRatio to the backing store only', () => {
    expect(fitToViewport(1000, 500, 1000, 500, 2)).toMatchObject({
      cssWidth: 1000,
      cssHeight: 500,
      pixelWidth: 2000,
      pixelHeight: 1000,
      scale: 2,
    });
  });

  it('survives a zero-size viewport', () => {
    const v = fitToViewport(1000, 500, 0, 0);
    expect(v.cssWidth).toBeGreaterThanOrEqual(1);
    expect(Number.isFinite(v.scale)).toBe(true);
  });
});

describe('ticketSlots', () => {
  it('lays out cards left to right inside the area', () => {
    const area = { x: 0, y: 100, w: 1000, h: 100 };
    const slots = ticketSlots(area, 7, 3, 10);
    expect(slots).toHaveLength(3);
    expect(slots[0]!.x).toBe(10);
    expect(slots[1]!.x).toBeGreaterThan(slots[0]!.x + slots[0]!.w);
    const last = ticketSlots(area, 7, 7, 10)[6]!;
    expect(last.x + last.w).toBeCloseTo(990);
    expect(ticketSlots(area, 7, 12)).toHaveLength(7);
  });
});
