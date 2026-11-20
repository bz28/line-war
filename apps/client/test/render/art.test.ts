import { describe, expect, it } from 'vitest';
import type { FoodState, IngredientKind } from '@line-war/sim';
import { drawChef, newChefAnim } from '../../src/render/art/chef';
import { paintFood, paintPlate } from '../../src/render/art/food';
import { Particles } from '../../src/render/art/fx';
import { SpriteCache } from '../../src/render/sprites';
import { buildDemoState } from '../../src/render/demo';
import { badNumbers, fakeContext, fakeFactory, texts, type Call } from './fakeCanvas';

const KINDS: IngredientKind[] = ['lettuce', 'tomato', 'bun', 'meat', 'steak', 'fish'];
const STATES: FoodState[] = ['raw', 'chopped', 'cooked', 'burnt'];

/** The geometry a painter emits (path commands only), ignoring colours. */
const shapeOf = (calls: Call[]) =>
  calls
    .filter((c) => ['moveTo', 'lineTo', 'arc', 'ellipse', 'bezierCurveTo', 'quadraticCurveTo', 'roundRect'].includes(c.name))
    .map((c) => `${c.name}(${c.args.map((a) => (typeof a === 'number' ? a.toFixed(1) : '')).join(',')})`)
    .join(';');

describe('food art', () => {
  it('paints every ingredient in every state with finite geometry', () => {
    for (const kind of KINDS)
      for (const state of STATES) {
        const { ctx, calls } = fakeContext();
        paintFood(ctx, { kind, state }, 12);
        expect(calls.length, `${kind} ${state}`).toBeGreaterThan(5);
        expect(badNumbers(calls), `${kind} ${state}`).toEqual([]);
      }
  });

  it('gives every ingredient its own silhouette, so identity never rests on colour alone', () => {
    for (const state of STATES) {
      const shapes = KINDS.map((kind) => {
        const { ctx, calls } = fakeContext();
        paintFood(ctx, { kind, state }, 12);
        return shapeOf(calls);
      });
      expect(new Set(shapes).size, state).toBe(KINDS.length);
    }
  });

  it('draws each state of an ingredient differently', () => {
    for (const kind of KINDS) {
      const looks = STATES.map((state) => {
        const { ctx, calls } = fakeContext();
        paintFood(ctx, { kind, state }, 12);
        return JSON.stringify(calls);
      });
      expect(new Set(looks).size, kind).toBe(STATES.length);
    }
  });

  it('paints plates: clean, dirty, cold (with a snowflake) and full', () => {
    const variants = [
      { dirty: false, cold: false, contents: [] },
      { dirty: true, cold: false, contents: [] },
      { dirty: false, cold: true, contents: [{ kind: 'steak' as const, state: 'cooked' as const }] },
      { dirty: false, cold: false, contents: KINDS.slice(0, 3).map((kind) => ({ kind, state: 'chopped' as const })) },
      {
        dirty: false,
        cold: false,
        contents: [
          { kind: 'bun' as const, state: 'raw' as const },
          { kind: 'meat' as const, state: 'cooked' as const },
        ],
      },
    ];
    const outs = variants.map((v) => {
      const { ctx, calls } = fakeContext();
      paintPlate(ctx, v, 12);
      expect(badNumbers(calls)).toEqual([]);
      return JSON.stringify(calls);
    });
    expect(new Set(outs).size).toBe(variants.length);
  });
});

describe('chef art', () => {
  it('draws every player in every pose with finite geometry and a P tag', () => {
    const s = buildDemoState();
    const { factory } = fakeFactory();
    const sprites = new SpriteCache(factory);
    for (const p of s.players) {
      for (const facing of [
        { x: 0, y: 1 },
        { x: 0, y: -1 },
        { x: 1, y: 0 },
        { x: 0, y: 0 },
      ]) {
        const { ctx, calls } = fakeContext();
        const anim = { ...newChefAnim(), speed: 2, walk: 1.3 };
        drawChef(ctx, { T: 48, now: 500, radius: 20, reducedMotion: false, sprites, cooldown: 0.5, refusedAge: 100 }, { ...p, facing }, 100, 100, anim);
        expect(badNumbers(calls)).toEqual([]);
        expect(texts(calls)).toContain(`P${p.id + 1}`);
      }
    }
  });
});

describe('particles', () => {
  it('bursts, ages out and never produces NaN', () => {
    const ps = new Particles();
    for (const k of ['knock', 'serve', 'chop', 'wash', 'cook', 'fire', 'smoke'] as const) ps.burst(k, 100, 100, 48, 0);
    ps.fireflies(5, 0, 0, 100, 100);
    expect(ps.count).toBeGreaterThan(50);
    const { ctx, calls } = fakeContext();
    for (let i = 0; i < 30; i++) ps.update(1 / 30);
    ps.draw(ctx);
    expect(badNumbers(calls)).toEqual([]);
    for (let i = 0; i < 400; i++) ps.update(1 / 30);
    expect(ps.count).toBe(0);
  });
});
