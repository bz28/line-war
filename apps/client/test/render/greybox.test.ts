import { describe, expect, it } from 'vitest';
import { INGREDIENTS, NIGHT_MARKET, RECIPES } from '@line-war/content';
import { createMatch, makeConfig, secondsToTicks } from '@line-war/sim';
import type { MatchState, Phase } from '@line-war/sim';
import { buildDemoState } from '../../src/render/demo';
import { GreyboxRenderer } from '../../src/render/greybox';
import { computeLayout } from '../../src/render/layout';
import { badNumbers, fakeCanvas, texts } from './fakeCanvas';

function renderOnce(s: MatchState, alpha = 0.5, nowMs = 1000) {
  const { canvas, calls } = fakeCanvas();
  const r = new GreyboxRenderer(canvas, s, { now: () => nowMs, autoResize: false });
  calls.length = 0;
  r.render(s, alpha);
  return { r, canvas, calls };
}

describe('GreyboxRenderer', () => {
  it('renders the demo state without throwing or NaN, and does not mutate it', () => {
    const s = buildDemoState();
    const before = JSON.stringify(s);
    const { calls } = renderOnce(s);
    expect(JSON.stringify(s)).toBe(before);
    expect(calls.length).toBeGreaterThan(500);
    expect(badNumbers(calls)).toEqual([]);
  });

  it('draws the HUD, tickets and effects text for the demo', () => {
    const t = texts(renderOnce(buildDemoState()).calls);
    for (const want of ['CREW A', 'CREW B', '420', '365', 'Salad', 'Burger', 'Tomato soup', 'Grilled fish', 'SERVICE', 'FIRE', '+72', 'KNOCK!', 'DONE', 'MARKET', 'x2', 'PN', 'PT']) {
      expect(t, want).toContain(want);
    }
    expect(t.some((x) => x.startsWith('CRITIC: CREW B ONLY'))).toBe(true);
    expect(t).toContain('1:50'); // 240 - 130 s
    expect(t).toContain('ROUND 2 / BEST OF 3');
  });

  it('renders every phase banner', () => {
    const cases: [Phase, number, string][] = [
      ['prep', 2, 'PREP'],
      ['rush', 181, 'DINNER RUSH'],
      ['lastCall', 231, 'LAST CALL'],
      ['roundOver', 240, 'ROUND 2 OVER'],
      ['matchOver', 240, 'MATCH OVER'],
    ];
    for (const [phase, sec, title] of cases) {
      const s = buildDemoState();
      s.round.phase = phase;
      s.round.tick = secondsToTicks(s.config, sec);
      if (phase === 'matchOver') s.winner = 0;
      const { calls } = renderOnce(s);
      expect(texts(calls), phase).toContain(title);
      expect(badNumbers(calls), phase).toEqual([]);
    }
  });

  it('renders a fresh match (empty board, prep)', () => {
    const s = createMatch({ arena: NIGHT_MARKET, recipes: RECIPES, ingredients: INGREDIENTS, config: makeConfig() });
    const { calls } = renderOnce(s, 0);
    expect(texts(calls)).toContain('Tickets arrive when service starts');
    expect(badNumbers(calls)).toEqual([]);
  });

  it('interpolates player positions between ticks', () => {
    const s = buildDemoState();
    const { canvas, calls } = fakeCanvas();
    const r = new GreyboxRenderer(canvas, s, { now: () => 0, autoResize: false });
    r.render(s, 0);
    s.tick += 1;
    s.events = [];
    s.players[0].pos = { x: s.players[0].pos.x + 1, y: s.players[0].pos.y };
    const layout = computeLayout(s.arena.width, s.arena.height);
    const numberCall = (alpha: number) => {
      calls.length = 0;
      r.render(s, alpha);
      const c = calls.find((c) => c.name === 'fillText' && c.args[0] === '1');
      return c!.args[1] as number;
    };
    const x0 = numberCall(0);
    const x1 = numberCall(0.5);
    expect(x1 - x0).toBeCloseTo(layout.tile / 2);
  });

  it('expires event effects over time and only ingests each tick once', () => {
    const s = buildDemoState();
    let now = 0;
    const { canvas, calls } = fakeCanvas();
    const r = new GreyboxRenderer(canvas, s, { now: () => now, autoResize: false });
    r.render(s, 0);
    now = 100;
    calls.length = 0;
    r.render(s, 0); // same tick: events must not be re-added
    expect(texts(calls).filter((t) => t === '+72')).toHaveLength(1);
    now = 5000;
    calls.length = 0;
    r.render(s, 0);
    expect(texts(calls)).not.toContain('+72');
  });

  it('resize keeps aspect ratio and sets CSS + backing size', () => {
    const s = buildDemoState();
    const { canvas } = fakeCanvas();
    const r = new GreyboxRenderer(canvas, s, { autoResize: false });
    const l = computeLayout(s.arena.width, s.arena.height);
    expect(canvas.width).toBe(l.width);
    r.resize(l.width * 2, l.height * 10);
    expect(canvas.width).toBe(l.width * 2);
    expect(canvas.style.width).toBe(`${l.width * 2}px`);
    expect(canvas.style.height).toBe(`${l.height * 2}px`);
    r.dispose();
  });
});
