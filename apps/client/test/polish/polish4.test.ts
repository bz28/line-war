// @vitest-environment jsdom
import { INGREDIENTS, NIGHT_MARKET, RECIPES } from '@line-war/content';
import { createMatch, makeConfig, secondsToTicks, type MatchState, type Phase } from '@line-war/sim';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HudRenderer } from '../../src/hud/hud';
import { currentMoment, type RoundLine } from '../../src/hud/moments';
import { PAD } from '../../src/input/gamepad';
import { DEFAULT_SETTINGS } from '../../src/settings/types';
import { howToScreen, turnPage } from '../../src/ui/howTo';
import { flipTab, MenuNav } from '../../src/ui/nav';
import { liftSplash, SPLASH_FADE_MS, TITLE_FONTS, titleFontsReady } from '../../src/ui/splash';
import { fakePad } from '../fakePad';

let hud: HudRenderer | null = null;
let nav: MenuNav | null = null;
afterEach(() => {
  hud?.dispose();
  hud = null;
  nav?.dispose();
  nav = null;
  document.body.replaceChildren();
});
const noop = () => {};

function manual(): HTMLElement {
  const el = howToScreen(DEFAULT_SETTINGS, { back: noop });
  document.body.append(el);
  return el;
}
const key = (code: string, init: KeyboardEventInit = {}) => window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true, ...init }));
const selected = (el: HTMLElement) => [...el.querySelectorAll('[role="tab"]')].findIndex((t) => t.getAttribute('aria-selected') === 'true') + 1;

describe('How to play: a manual with pages at every size', () => {
  it('turnPage moves the page, tabs, dots and folio together, with a direction for the page turn', () => {
    const el = manual();
    turnPage(el, 3);
    expect(el.dataset.page).toBe('3');
    expect(el.dataset.dir).toBe('next');
    expect(selected(el)).toBe(3);
    expect([...el.querySelectorAll('.lw-howto-dot')].map((d) => d.classList.contains('lw-on'))).toEqual([false, false, true, false]);
    expect(el.querySelector('.lw-howto-folio')!.textContent).toBe('Page 3 of 4');
    turnPage(el, 2);
    expect(el.dataset.dir).toBe('prev');
    turnPage(el, 99);
    expect(el.dataset.page).toBe('4'); // clamped
  });

  it('the footer says how to turn pages on keys and on a pad', () => {
    const text = manual().querySelector('.lw-howto-turn')!.textContent;
    for (const k of ['Q', 'E', 'LB', 'RB']) expect(text).toContain(k);
  });

  it('Q / E, PageUp / PageDown and [ / ] turn pages, clamped at the covers', () => {
    const el = manual();
    nav = new MenuNav({ getRoot: () => el, onBack: noop, onStart: noop }, () => []);
    key('KeyE');
    expect(el.dataset.page).toBe('2');
    key('PageDown');
    key('BracketRight');
    expect(el.dataset.page).toBe('4');
    key('KeyE');
    expect(el.dataset.page).toBe('4');
    key('KeyQ');
    key('PageUp');
    key('BracketLeft');
    key('KeyQ');
    expect(el.dataset.page).toBe('1');
  });

  it('left / right turn the page wherever focus is (even on Back)', () => {
    const el = manual();
    nav = new MenuNav({ getRoot: () => el, onBack: noop, onStart: noop }, () => []);
    (el.querySelector('[data-key="menu-Back"]') as HTMLElement).focus();
    key('ArrowRight');
    expect(el.dataset.page).toBe('2');
    expect((document.activeElement as HTMLElement).dataset.key).toBe('menu-Back');
    key('ArrowLeft');
    expect(el.dataset.page).toBe('1');
  });

  it('pad LB / RB turn pages on a fresh press only', () => {
    const el = manual();
    let pads = [fakePad()];
    nav = new MenuNav({ getRoot: () => el, onBack: noop, onStart: noop }, () => pads);
    nav.poll(0);
    pads = [fakePad({ pressed: [PAD.RB] })];
    nav.poll(16);
    nav.poll(32); // still held
    expect(el.dataset.page).toBe('2');
    pads = [fakePad()];
    nav.poll(48);
    pads = [fakePad({ pressed: [PAD.RB] })];
    nav.poll(64);
    pads = [fakePad({ pressed: [PAD.LB] })];
    nav.poll(80);
    expect(el.dataset.page).toBe('2');
  });

  it('page keys leave typing and modified shortcuts alone, and do nothing without tabs', () => {
    const el = manual();
    const input = document.createElement('input');
    input.type = 'text';
    el.append(input);
    nav = new MenuNav({ getRoot: () => el, onBack: noop, onStart: noop }, () => []);
    input.focus();
    key('KeyE');
    expect(el.dataset.page).toBe('1');
    input.blur();
    key('KeyE', { metaKey: true });
    expect(el.dataset.page).toBe('1');
    const plain = document.createElement('div');
    plain.innerHTML = '<button>One</button>';
    expect(flipTab(plain, 1)).toBe(false);
  });

  it('flipTab keeps keyboard focus on the tab strip when it was there', () => {
    const el = manual();
    (el.querySelector('[data-key="howto-tab-1"]') as HTMLElement).focus();
    flipTab(el, 1);
    expect((document.activeElement as HTMLElement).dataset.key).toBe('howto-tab-2');
  });
});

function match(): MatchState {
  return createMatch({ arena: NIGHT_MARKET, recipes: RECIPES, ingredients: INGREDIENTS, config: makeConfig({ seed: 3 }) });
}
function at(s: MatchState, seconds: number, phase: Phase): MatchState {
  s.round.tick = secondsToTicks(s.config, seconds);
  s.tick = s.round.tick;
  s.round.phase = phase;
  return s;
}

describe('round over card: this round’s points, like the match ledger', () => {
  it('round 1 labels the big numbers as this round’s points and has no ledger yet', () => {
    const s = at(match(), 240, 'roundOver');
    s.teams[0].score = 320;
    s.teams[1].score = 245;
    const m = currentMoment(s, [{ scores: [320, 245], winner: 0 }])!;
    expect(m.card!.scores).toEqual([320, 245]);
    expect(m.card!.label).toBe('Round 1 points');
    expect(m.card!.ledger).toBeUndefined();
  });

  it('from round 2 it lists every round so far and the match total', () => {
    const s = at(match(), 240, 'roundOver');
    s.round.index = 1;
    s.teams[0].score = 180;
    s.teams[1].score = 410;
    s.totalScores = [500, 655];
    const log: RoundLine[] = [
      { scores: [320, 245], winner: 0 },
      { scores: [180, 410], winner: 1 },
    ];
    const m = currentMoment(s, log)!;
    expect(m.card!.label).toBe('Round 2 points');
    expect(m.card!.ledger).toEqual({ rounds: log, totals: [500, 655] });
    // The live round is read from state, so it matches the signs even before the log catches up.
    expect(currentMoment(s, log.slice(0, 1))!.card!.ledger!.rounds[1]).toEqual({ scores: [180, 410], winner: 1 });
    // Without the earlier rounds (e.g. the dev demo) there is no partial ledger.
    expect(currentMoment(s, [])!.card!.ledger).toBeUndefined();
  });

  it('the HUD card renders the ledger with the winners stamped and the total', () => {
    const s = at(match(), 240, 'roundOver');
    s.round.index = 1;
    s.teams[0].score = 180;
    s.teams[1].score = 410;
    s.totalScores = [500, 655];
    const log: RoundLine[] = [
      { scores: [320, 245], winner: 0 },
      { scores: [180, 410], winner: 1 },
    ];
    const host = document.createElement('div');
    document.body.append(host);
    hud = new HudRenderer(host, { now: () => 0, reducedMotion: false, rounds: () => log });
    hud.render(s);
    const rows = [...host.querySelectorAll<HTMLElement>('.lw-rledger-row')];
    expect(rows.map((r) => r.querySelector('.lw-rledger-label')!.textContent)).toEqual(['Round 1', 'Round 2', 'Total']);
    expect(rows[0]!.querySelector('.lw-won')!.textContent).toBe('320');
    expect(rows[1]!.querySelector('.lw-won')!.textContent).toBe('410');
    expect(rows[1]!.classList.contains('lw-now')).toBe(true);
    expect([...rows[2]!.querySelectorAll('.lw-rledger-pts')].map((c) => c.textContent)).toEqual(['500', '655']);
    expect(host.querySelector('.lw-result-label')!.textContent).toBe('Round 2 points');
  });

  it('match over card labels its numbers as match points', () => {
    const s = at(match(), 240, 'matchOver');
    expect(currentMoment(s)!.card!.label).toBe('Match points');
  });
});

describe('3-2-1 countdown lives in the clock lantern', () => {
  it('flags the HUD while counting so the clock steps aside, and clears after', () => {
    const s = match();
    const host = document.createElement('div');
    document.body.append(host);
    hud = new HudRenderer(host, { now: () => 0, reducedMotion: false });
    at(s, s.config.prepSeconds - 2.5, 'prep');
    hud.render(s);
    const root = host.querySelector('.lw-hud')!;
    expect(host.querySelector('.lw-moment--count')).not.toBeNull();
    expect(root.classList.contains('lw-hud--count')).toBe(true);
    at(s, 60, 'service');
    hud.render(s);
    expect(root.classList.contains('lw-hud--count')).toBe(false);
  });

  it('the prep banner carries no frozen clock number', () => {
    const m = currentMoment(at(match(), 0.5, 'prep'))!;
    expect(m.kind).toBe('prep');
    expect(m.subtitle).not.toMatch(/\d:\d\d/);
  });
});

describe('first paint: the splash waits for the title fonts, never for long', () => {
  it('resolves when the stylesheet and every title font are in', async () => {
    const load = vi.fn((_font: string, _text?: string) => Promise.resolve([] as FontFace[]));
    await expect(titleFontsReady({ load }, 2500, () => 0, Promise.resolve())).resolves.toBe('fonts');
    expect(load.mock.calls.map((c) => c[0])).toEqual([...TITLE_FONTS]);
  });

  it('waits for the stylesheet before asking for fonts', async () => {
    let cssDone!: () => void;
    const css = new Promise<void>((r) => (cssDone = r));
    const load = vi.fn((_font: string, _text?: string) => Promise.resolve([] as FontFace[]));
    const ready = titleFontsReady({ load }, 2500, () => 0, css);
    await Promise.resolve();
    expect(load).not.toHaveBeenCalled();
    cssDone();
    await expect(ready).resolves.toBe('fonts');
  });

  it('gives up after the cap when a font hangs, and copes with a failed load or no font API', async () => {
    let fire!: () => void;
    const hang = { load: () => new Promise<FontFace[]>(() => {}) };
    const ready = titleFontsReady(hang, 2500, (fn) => (fire = fn), Promise.resolve());
    fire();
    await expect(ready).resolves.toBe('timeout');
    await expect(titleFontsReady({ load: () => Promise.reject(new Error('offline')) }, 2500, () => 0, Promise.resolve())).resolves.toBe('fonts');
    await expect(titleFontsReady(undefined)).resolves.toBe('unsupported');
  });

  it('liftSplash fades the splash, then removes it', () => {
    const el = document.createElement('div');
    el.setAttribute('role', 'status');
    document.body.append(el);
    let removeAfter = 0;
    let remove!: () => void;
    liftSplash(el, (fn, ms) => ((remove = fn), (removeAfter = ms)));
    expect(el.classList.contains('lw-splash--out')).toBe(true);
    expect(el.hasAttribute('role')).toBe(false);
    expect(removeAfter).toBeGreaterThanOrEqual(SPLASH_FADE_MS);
    remove();
    expect(el.isConnected).toBe(false);
    expect(() => liftSplash(null)).not.toThrow();
  });
});
