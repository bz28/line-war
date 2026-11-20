import { describe, expect, it } from 'vitest';
import { computeLayout, fitToBox, MARGIN, tileRect, TILE, worldToScreen } from '../../src/render/layout';

describe('computeLayout', () => {
  it('surrounds the arena with the diorama margins', () => {
    const l = computeLayout(25, 13);
    expect(l.world).toEqual({ x: MARGIN.left * TILE, y: MARGIN.top * TILE, w: 25 * TILE, h: 13 * TILE });
    expect(l.width).toBeCloseTo(l.world.w + (MARGIN.left + MARGIN.right) * TILE);
    expect(l.height).toBeCloseTo(l.world.h + (MARGIN.top + MARGIN.bottom) * TILE);
  });

  it('maps tiles and world positions to pixels', () => {
    const l = computeLayout(25, 13);
    expect(tileRect(l, 25, 25 + 3)).toEqual({ x: l.world.x + 3 * TILE, y: l.world.y + TILE, w: TILE, h: TILE });
    expect(worldToScreen(l, { x: 0.5, y: 1 })).toEqual({ x: l.world.x + TILE / 2, y: l.world.y + TILE });
  });
});

describe('fitToBox', () => {
  it('fills the box and fits the diorama inside it, centred', () => {
    const wide = fitToBox(1000, 500, 4000, 1000);
    expect(wide).toMatchObject({ cssWidth: 4000, cssHeight: 1000, scale: 2, offsetX: 1000, offsetY: 0 });
    const tall = fitToBox(1000, 500, 500, 4000);
    expect(tall).toMatchObject({ cssWidth: 500, cssHeight: 4000, scale: 0.5, offsetX: 0, offsetY: 1875 });
  });

  it('applies devicePixelRatio to the backing store only', () => {
    expect(fitToBox(1000, 500, 1000, 500, 2)).toMatchObject({
      cssWidth: 1000,
      cssHeight: 500,
      pixelWidth: 2000,
      pixelHeight: 1000,
      scale: 2,
      offsetX: 0,
      offsetY: 0,
    });
  });

  it('survives a zero-size box and a bad dpr', () => {
    const v = fitToBox(1000, 500, 0, 0, Number.NaN);
    expect(v.cssWidth).toBeGreaterThanOrEqual(1);
    expect(Number.isFinite(v.scale)).toBe(true);
    expect(Number.isFinite(v.offsetX)).toBe(true);
  });
});
