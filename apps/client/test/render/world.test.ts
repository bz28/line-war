import { afterEach, describe, expect, it, vi } from 'vitest';
import { INGREDIENTS, LEVELS, NIGHT_MARKET, RECIPES } from '@line-war/content';
import { createMatch, makeConfig, NO_INPUT, secondsToTicks, step } from '@line-war/sim';
import type { MatchInputs } from '@line-war/sim';
import type { MatchState, Phase } from '@line-war/sim';
import { buildDemoState } from '../../src/render/demo';
import { GreyboxRenderer } from '../../src/render/greybox';
import { WorldRenderer, type WorldOptions } from '../../src/render/world';
import { computeLayout } from '../../src/render/layout';
import { badNumbers, fakeCanvas, fakeFactory, texts, type FakeParent } from './fakeCanvas';

function renderOnce(s: MatchState, opts: WorldOptions = {}, alpha = 0.5, nowMs = 1000) {
  const { canvas, calls } = fakeCanvas();
  const r = new WorldRenderer(canvas, s, { now: () => nowMs, autoResize: false, createCanvas: null, ...opts });
  calls.length = 0;
  r.render(s, alpha);
  return { r, canvas, calls };
}

const PHASES: [Phase, number][] = [
  ['prep', 2],
  ['service', 100],
  ['rush', 181],
  ['lastCall', 231],
  ['roundOver', 240],
  ['matchOver', 240],
];

describe('WorldRenderer', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('keeps the GreyboxRenderer name working for main.ts', () => {
    expect(GreyboxRenderer).toBe(WorldRenderer);
  });

  it('renders the demo state without throwing or NaN, and does not mutate it', () => {
    const s = buildDemoState();
    const before = JSON.stringify(s);
    const { calls } = renderOnce(s);
    expect(JSON.stringify(s)).toBe(before);
    expect(calls.length).toBeGreaterThan(2000);
    expect(badNumbers(calls)).toEqual([]);
  });

  it('draws the world only: player tags and world popups, no HUD text', () => {
    const t = texts(renderOnce(buildDemoState()).calls);
    for (const want of ['P1', 'P2', 'P3', 'P4', '+72', 'Knock!', 'Done']) expect(t, want).toContain(want);
    // Scores, clock, ticket names and phase labels belong to the DOM HUD now.
    for (const hud of ['420', '365', '1:50', 'Salad', 'Burger', 'SERVICE', 'PREP', 'CREW A', 'Jade', 'Ember']) expect(t, hud).not.toContain(hud);
  });

  it('renders every phase, and swapped kitchens, without NaN', () => {
    for (const [phase, sec] of PHASES) {
      for (const swapped of [false, true]) {
        const s = buildDemoState();
        s.round.phase = phase;
        s.round.tick = secondsToTicks(s.config, sec);
        s.round.swapped = swapped;
        if (phase === 'matchOver') s.winner = 0;
        const { calls } = renderOnce(s);
        expect(badNumbers(calls), `${phase} swapped=${swapped}`).toEqual([]);
        expect(texts(calls).filter((x) => /^(PREP|DINNER RUSH|LAST CALL|MATCH OVER)$/.test(x))).toEqual([]);
      }
    }
  });

  it('renders a fresh match (empty board, prep) without NaN', () => {
    const s = createMatch({ arena: NIGHT_MARKET, recipes: RECIPES, ingredients: INGREDIENTS, config: makeConfig() });
    const before = JSON.stringify(s);
    const { calls } = renderOnce(s, {}, 0);
    expect(JSON.stringify(s)).toBe(before);
    expect(badNumbers(calls)).toEqual([]);
  });

  it('draws every level from its tiles (no Night Market assumptions), baked and live', () => {
    for (const level of LEVELS) {
      const s = createMatch({ arena: level.arena, recipes: level.recipes, ingredients: level.ingredients, config: makeConfig({ seed: 5 }) });
      const idle = [NO_INPUT, NO_INPUT, NO_INPUT, NO_INPUT] as MatchInputs;
      for (let i = 0; i < 30 * 20; i++) step(s, idle); // into service, tickets on the board
      for (const swapped of [false, true]) {
        s.round.swapped = swapped;
        const before = JSON.stringify(s);
        const { calls } = renderOnce(s);
        expect(JSON.stringify(s), level.id).toBe(before);
        expect(badNumbers(calls), `${level.id} live`).toEqual([]);
        const { factory, made } = fakeFactory();
        renderOnce(s, { createCanvas: factory });
        for (const m of made) expect(badNumbers(m.calls), `${level.id} baked`).toEqual([]);
      }
    }
  });

  it('interpolates player positions between ticks', () => {
    const s = buildDemoState();
    const { canvas, calls } = fakeCanvas();
    const r = new WorldRenderer(canvas, s, { now: () => 0, autoResize: false, createCanvas: null, reducedMotion: true });
    r.render(s, 0);
    s.tick += 1;
    s.events = [];
    s.players[0].pos = { x: s.players[0].pos.x + 1, y: s.players[0].pos.y };
    const layout = computeLayout(s.arena.width, s.arena.height);
    const tagX = (alpha: number) => {
      calls.length = 0;
      r.render(s, alpha);
      return calls.find((c) => c.name === 'fillText' && c.args[0] === 'P1')!.args[1] as number;
    };
    const x0 = tagX(0);
    const x1 = tagX(0.5);
    expect(x1 - x0).toBeCloseTo(layout.tile / 2);
  });

  it('expires event effects over time and only ingests each tick once', () => {
    const s = buildDemoState();
    let now = 0;
    const { canvas, calls } = fakeCanvas();
    const r = new WorldRenderer(canvas, s, { now: () => now, autoResize: false, createCanvas: null });
    r.render(s, 0);
    now = 100;
    calls.length = 0;
    r.render(s, 0); // same tick: events must not be re-added
    expect(texts(calls).filter((t) => t === '+72')).toHaveLength(1);
    now = 5000;
    calls.length = 0;
    r.render(s, 0);
    expect(texts(calls)).not.toContain('+72');
    expect(badNumbers(calls)).toEqual([]);
  });

  it('keeps effects from every tick when one frame runs several steps (onTick)', () => {
    const s = buildDemoState();
    const { canvas, calls } = fakeCanvas();
    const r = new WorldRenderer(canvas, s, { now: () => 0, autoResize: false, createCanvas: null });
    const delivered = s.events.find((e) => e.type === 'delivered');
    expect(delivered).toBeDefined();
    r.onTick(s);
    s.tick++;
    s.events = [];
    r.onTick(s);
    s.tick++;
    r.onTick(s);
    calls.length = 0;
    r.render(s, 0);
    expect(texts(calls)).toContain(`+${(delivered as { points: number }).points}`);
  });

  it('bakes static layers and sprites once, then blits them', () => {
    const s = buildDemoState();
    const { factory, made } = fakeFactory();
    const { canvas, calls } = fakeCanvas();
    let now = 0;
    const r = new WorldRenderer(canvas, s, { now: () => now, autoResize: false, createCanvas: factory });
    r.render(s, 0);
    const baked = made.length;
    // 1 base + 1 per row + 1 lights, plus sprites.
    expect(baked).toBeGreaterThan(s.arena.height + 2);
    for (const m of made) expect(badNumbers(m.calls)).toEqual([]);
    calls.length = 0;
    now = 16;
    r.render(s, 0.5);
    expect(made.length).toBe(baked); // nothing re-baked on a plain frame
    expect(calls.filter((c) => c.name === 'drawImage').length).toBeGreaterThan(s.arena.height + 2);
    expect(badNumbers(calls)).toEqual([]);
    // A kitchen swap (new round) re-bakes the static layers with the new crew colours.
    s.round.swapped = true;
    r.render(s, 0);
    expect(made.length).toBeGreaterThan(baked);
  });

  it('turns off camera shake in reduced motion', () => {
    const offsets = (opts: WorldOptions) => {
      const s = buildDemoState(); // has a knock this tick
      const { r, calls } = renderOnce(s, opts, 0, 1030);
      const vp = r.viewport;
      return calls
        .filter((c) => c.name === 'setTransform' && c.args[0] === vp.scale)
        .map((c) => [(c.args[4] as number) - vp.offsetX, (c.args[5] as number) - vp.offsetY]);
    };
    expect(offsets({ reducedMotion: true })[0]).toEqual([0, 0]);
    expect(offsets({ reducedMotion: false, screenShake: false })[0]).toEqual([0, 0]);
    const shaken = offsets({ reducedMotion: false, screenShake: true })[0]!;
    expect(Math.abs(shaken[0]!) + Math.abs(shaken[1]!)).toBeGreaterThan(0);
  });

  it('resize fills the box at devicePixelRatio and centres the arena', () => {
    vi.stubGlobal('window', { devicePixelRatio: 2 });
    const s = buildDemoState();
    const { canvas } = fakeCanvas();
    const r = new WorldRenderer(canvas, s, { autoResize: false, createCanvas: null });
    r.resize(1000, 1000);
    expect(canvas.width).toBe(2000);
    expect(canvas.height).toBe(2000);
    expect(canvas.style.width).toBe('1000px');
    expect(canvas.style.height).toBe('1000px');
    const vp = r.viewport;
    const l = computeLayout(s.arena.width, s.arena.height);
    expect(vp.scale).toBeCloseTo(2000 / l.width);
    expect(vp.offsetX).toBe(0);
    expect(vp.offsetY).toBeCloseTo((2000 - l.height * vp.scale) / 2, 0);
  });

  it('follows its parent element with a ResizeObserver', () => {
    let observed: unknown = null;
    let fire: (() => void) | null = null;
    let disconnected = false;
    const listeners = new Set<string>();
    vi.stubGlobal('window', {
      devicePixelRatio: 1,
      innerWidth: 1600,
      innerHeight: 900,
      addEventListener: (k: string) => listeners.add(k),
      removeEventListener: (k: string) => listeners.delete(k),
    });
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(cb: () => void) {
          fire = cb;
        }
        observe(el: unknown) {
          observed = el;
        }
        disconnect() {
          disconnected = true;
        }
      },
    );
    const parent: FakeParent = { clientWidth: 800, clientHeight: 500, style: { position: '' } };
    const s = buildDemoState();
    const { canvas } = fakeCanvas(parent);
    const r = new WorldRenderer(canvas, s, { createCanvas: null, reducedMotion: true });
    expect(observed).toBe(parent);
    expect(canvas.style.width).toBe('800px');
    expect(canvas.style.height).toBe('500px');
    expect(canvas.style.position).toBe('absolute');
    expect(parent.style.position).toBe('relative');
    parent.clientWidth = 1200;
    parent.clientHeight = 700;
    fire!();
    expect(canvas.width).toBe(1200);
    expect(canvas.height).toBe(700);
    // An unsized parent (not laid out yet) falls back to the window.
    parent.clientWidth = 0;
    fire!();
    expect(canvas.width).toBe(1600);
    expect(canvas.style.position).toBe('fixed');
    r.dispose();
    expect(disconnected).toBe(true);
    expect(listeners.size).toBe(0);
  });

  it('renders a busy frame quickly (JS cost, live-painted worst case)', () => {
    const s = buildDemoState();
    const { factory } = fakeFactory();
    const { canvas, calls } = fakeCanvas();
    let now = 0;
    const r = new WorldRenderer(canvas, s, { now: () => now, autoResize: false, createCanvas: factory });
    r.render(s, 0);
    const N = 120;
    const t0 = performance.now();
    for (let i = 0; i < N; i++) {
      now += 16.7;
      calls.length = 0;
      r.render(s, (i % 10) / 10);
    }
    const ms = (performance.now() - t0) / N;
    // Fake-context cost only; the real browser numbers are in the PR. Generous bound for CI.
    expect(ms).toBeLessThan(12);
  });
});
