// @vitest-environment jsdom
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { INGREDIENTS, LEVEL_CHARMS, NIGHT_MARKET, RECIPES } from '@line-war/content';
import { createMatch, makeConfig, secondsToTicks, type MatchState } from '@line-war/sim';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { addUnlocks, emptyCollection } from '../../src/collection/store';
import { HudRenderer } from '../../src/hud/hud';
import { LIMITS, loadSettings } from '../../src/settings/store';
import { App, type MatchSession } from '../../src/ui/app';
import { charmShelfScreen } from '../../src/ui/charmShelf';
import { howToScreen } from '../../src/ui/howTo';
import { matchOverScreen } from '../../src/ui/screens';
import { DEFAULT_SETTINGS } from '../../src/settings/types';
import { DEFAULT_TUNING } from '@line-war/sim';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '../../src');
const cssFiles = (dir = SRC): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
    d.isDirectory() ? cssFiles(join(dir, d.name)) : d.name.endsWith('.css') ? [join(dir, d.name)] : [],
  );
/** Every `selector { … }` rule in the client's stylesheets (flat; nested at-rule blocks included). */
const rules = (): { selector: string; body: string }[] =>
  cssFiles().flatMap((f) =>
    [...readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}@]+)\{([^{}]*)\}/g)].map((m) => ({
      selector: m[1]!.trim(),
      body: m[2]!,
    })),
  );

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

describe('final audit 1: match-over crew names keep their own colour', () => {
  it('when Ember wins, Jade\'s name only matches the Jade colour rule (and vice versa)', () => {
    const nameRules = rules().flatMap((r) =>
      r.selector.split(',').map((sel) => ({ sel: sel.trim(), body: r.body })).filter((r) => r.sel.endsWith('.lw-over-name') && /--(jade|ember)/.test(r.body)),
    );
    expect(nameRules.length).toBeGreaterThanOrEqual(2);
    for (const winner of [0, 1] as const) {
      const panel = matchOverScreen({ winner, roundsWon: winner === 0 ? [2, 1] : [1, 2] }, { again: () => {}, title: () => {} });
      document.body.replaceChildren(panel);
      const names = [...panel.querySelectorAll<HTMLElement>('.lw-over-name')];
      expect(names.map((n) => n.textContent)).toEqual(['Jade', 'Ember']);
      names.forEach((n, team) => {
        const colours = nameRules.filter((r) => n.matches(r.sel)).map((r) => (/--jade/.test(r.body) ? 'jade' : 'ember'));
        expect(colours).toEqual([team === 0 ? 'jade' : 'ember']);
      });
    }
  });
});

describe('final audit 2: the charm callout and the coach note coexist', () => {
  const store = () => {
    const m = new Map<string, string>();
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
  };
  const match = (): MatchState => {
    const s = createMatch({ arena: NIGHT_MARKET, recipes: RECIPES, ingredients: INGREDIENTS, charms: LEVEL_CHARMS['night-market'], config: makeConfig({ seed: 3 }) });
    s.round.phase = 'service';
    s.round.tick = secondsToTicks(s.config, 40);
    s.tick = s.round.tick;
    return s;
  };

  it('stacks the callout below the coach note while the note is up, and back under the clock after', () => {
    const now = 0;
    const hud = new HudRenderer(document.body, {
      now: () => now,
      reducedMotion: true,
      coach: { player: 0, keys: { grab: 'Space', work: 'E', dash: 'L Shift' }, storage: store() },
    });
    const note = hud.root.querySelector<HTMLElement>('.lw-coach-note')!;
    note.getBoundingClientRect = () => ({ bottom: 240 }) as DOMRect;
    const callout = hud.root.querySelector<HTMLElement>('.lw-charm-callout')!;
    const s = match();
    s.tick++;
    s.events = [{ type: 'charmSpawned', itemId: 1, tile: 40, variant: 'night-moon' }];
    hud.onTick(s);
    hud.render(s);
    expect(hud.coach!.noteShowing).toBe(true);
    expect(callout.hidden).toBe(false);
    expect(callout.classList.contains('lw-charm-callout--stacked')).toBe(true);
    expect(callout.style.top).toContain('240px');

    hud.coach!.root.querySelector<HTMLButtonElement>('.lw-coach-skip')!.click();
    hud.render(s);
    expect(hud.coach!.noteShowing).toBe(false);
    expect(callout.classList.contains('lw-charm-callout--stacked')).toBe(false);
    expect(callout.style.top).toBe('');
    hud.dispose();
  });
});

describe('final audit 3: leaving How to play or Settings returns focus to its button', () => {
  function setup() {
    vi.stubGlobal('requestAnimationFrame', () => 0);
    vi.stubGlobal('cancelAnimationFrame', () => {});
    const root = document.createElement('div');
    document.body.append(root);
    const app = new App({
      root,
      storage: null,
      getGamepads: () => [],
      now: () => 0,
      startSession: (): MatchSession => ({
        state: { round: null } as unknown as MatchState,
        setPaused: () => {},
        applySettings: () => {},
        dispose: () => {},
      }),
    });
    const button = (label: string) => [...root.querySelectorAll('button')].find((b) => b.textContent === label)!;
    const active = () => (document.activeElement as HTMLElement | null)?.dataset.key;
    return { app, button, active };
  }
  const esc = () => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', bubbles: true, cancelable: true }));

  it('How to play: Back button and Esc', () => {
    const { app, button, active } = setup();
    button('How to play').click();
    button('Back').click();
    expect(active()).toBe('menu-How to play');
    button('How to play').click();
    esc();
    expect(app.currentScreen).toBe('title');
    expect(active()).toBe('menu-How to play');
    app.dispose();
  });

  it('Settings from the title and from the pause menu', () => {
    const { app, button, active } = setup();
    button('Settings').click();
    esc();
    expect(app.currentScreen).toBe('title');
    expect(active()).toBe('menu-Settings');
    button('Play').click();
    app.pause();
    button('Settings').click();
    esc();
    expect(app.currentScreen).toBe('paused');
    expect(active()).toBe('menu-Settings');
    app.dispose();
  });
});

describe('final audit 4: the charm shelf card follows one cursor', () => {
  it('hovering a slot moves focus there, so the card and the focused slot always agree', () => {
    const col = addUnlocks(emptyCollection(), ['night-lantern', 'harbor-fish']).collection;
    const el = charmShelfScreen(col, { pick: () => {}, back: () => {} });
    document.body.append(el);
    const slot = (id: string) => el.querySelector<HTMLButtonElement>(`[data-charm="${id}"]`)!;
    const card = () => el.querySelector('.lw-shelf-detail-name')!.textContent;
    slot('night-lantern').focus();
    expect(card()).toBe('Lantern Bunny');
    slot('harbor-fish').dispatchEvent(new Event('pointerover', { bubbles: true }));
    expect(document.activeElement).toBe(slot('harbor-fish'));
    expect(card()).toBe('Fish Bunny');
  });
});

describe('final audit 5: sentence-case labels and the pause key', () => {
  it('no stylesheet forces all-caps', () => {
    for (const r of rules()) expect(r.body, r.selector).not.toMatch(/text-transform:\s*uppercase/);
  });

  it('the Controls page lists Esc and Start to pause', () => {
    const text = howToScreen(DEFAULT_SETTINGS, { back: () => {} }).textContent ?? '';
    expect(text).toContain('Esc Pause');
    expect(text).toContain('Start Pause');
  });
});

describe('final audit 6: no round shorter than the Dinner Rush can be set', () => {
  it('the minimum round is longer than the Rush, and stored values below it clamp up', () => {
    expect(LIMITS.roundSeconds.min).toBe(90);
    expect(LIMITS.roundSeconds.min).toBeGreaterThan(DEFAULT_TUNING.rushSeconds);
    const raw = JSON.stringify({ match: { roundSeconds: 60 } });
    const s = loadSettings({ getItem: () => raw, setItem: () => {} });
    expect(s.match.roundSeconds).toBe(90);
  });
});
