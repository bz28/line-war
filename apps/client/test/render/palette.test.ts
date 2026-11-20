import { describe, expect, it } from 'vitest';
import { NIGHT_MARKET } from '@line-war/content';
import type { IngredientKind } from '@line-war/sim';
import {
  darken,
  foodLook,
  INGREDIENT_STYLE,
  plateColor,
  PLATE_CLEAN,
  PLATE_COLD,
  PLATE_DIRTY,
  stationLabel,
  withAlpha,
} from '../../src/render/palette';

const KINDS = Object.keys(INGREDIENT_STYLE) as IngredientKind[];

describe('ingredient styles', () => {
  it('every ingredient has a unique colour, shape and letter', () => {
    const styles = KINDS.map((k) => INGREDIENT_STYLE[k]);
    expect(new Set(styles.map((s) => s.color)).size).toBe(KINDS.length);
    expect(new Set(styles.map((s) => s.shape)).size).toBe(KINDS.length);
    expect(new Set(styles.map((s) => s.letter)).size).toBe(KINDS.length);
  });

  it('food state changes the look', () => {
    const raw = foodLook('tomato', 'raw');
    expect(foodLook('tomato', 'chopped').scale).toBeLessThan(raw.scale);
    expect(foodLook('tomato', 'chopped').sliced).toBe(true);
    const cooked = foodLook('tomato', 'cooked');
    expect(cooked.fill).not.toBe(raw.fill);
    expect(cooked.outlineWidth).toBeGreaterThan(raw.outlineWidth);
    expect(foodLook('tomato', 'burnt').fill).toBe('#111111');
    expect(foodLook('fish', 'burnt').shape).toBe('triangle'); // shape survives burning
  });
});

describe('plateColor', () => {
  const base = { id: 1, type: 'plate' as const, contents: [], platedAtTick: null };
  it('dirty beats cold beats clean', () => {
    expect(plateColor({ ...base, dirty: false, cold: false })).toBe(PLATE_CLEAN);
    expect(plateColor({ ...base, dirty: false, cold: true })).toBe(PLATE_COLD);
    expect(plateColor({ ...base, dirty: true, cold: true })).toBe(PLATE_DIRTY);
  });
});

describe('stationLabel', () => {
  it('labels every Night Market station with 1-2 letters', () => {
    for (const [ch, def] of Object.entries(NIGHT_MARKET.legend)) {
      const label = stationLabel(def);
      if (def.kind === 'floor' || def.kind === 'wall' || def.kind === 'counter') {
        expect(label, ch).toBe('');
      } else {
        expect(label.length, ch).toBeGreaterThanOrEqual(1);
        expect(label.length, ch).toBeLessThanOrEqual(2);
      }
    }
    expect(stationLabel({ kind: 'pantry', ingredient: 'bun' })).toBe('B');
    expect(stationLabel({ kind: 'stove', vessel: 'pot' })).toBe('PT');
    expect(stationLabel({ kind: 'stove', vessel: 'pan' })).toBe('PN');
  });
});

describe('colour helpers', () => {
  it('darken and withAlpha', () => {
    expect(darken('#ffffff', 0.5)).toBe('#808080');
    expect(darken('#123456', 0)).toBe('#123456');
    expect(darken('#ffffff', 1)).toBe('#000000');
    expect(withAlpha('#ff0000', 0.5)).toBe('rgba(255,0,0,0.5)');
    expect(withAlpha('#ff0000', 3)).toBe('rgba(255,0,0,1)');
  });
});
