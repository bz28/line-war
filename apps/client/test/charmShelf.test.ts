// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { addUnlocks, emptyCollection, setDisplay } from '../src/collection/store';
import { charmIcon } from '../src/hud/charmIcon';
import { charmShelfScreen, charmStatus } from '../src/ui/charmShelf';
import { charmCountSentence, howToScreen } from '../src/ui/howTo';
import { MenuNav } from '../src/ui/nav';
import { charmReveal, matchOverScreen, titleScreen } from '../src/ui/screens';
import { DEFAULT_SETTINGS } from '../src/settings/types';
import { LEVEL_CHARMS } from '@line-war/content';

const noop = () => {};
const col = () => setDisplay(addUnlocks(emptyCollection(), ['night-lantern', 'harbor-fish', 'harbor-lighthouse', 'rooftop-sprout']).collection, 'harbor-lighthouse');

afterEach(() => document.body.replaceChildren());

describe('charm shelf', () => {
  it('shows three shelves of three, the progress, and locked slots as "?" silhouettes', () => {
    const el = charmShelfScreen(col(), { pick: noop, back: noop });
    expect(el.querySelectorAll('.lw-shelf-row')).toHaveLength(3);
    const slots = [...el.querySelectorAll<HTMLButtonElement>('.lw-shelf-slot')];
    expect(slots).toHaveLength(9);
    expect(el.querySelector('.lw-shelf-progress')!.getAttribute('aria-label')).toBe('4 of 9 charms collected');
    expect(el.querySelector('.lw-shelf-count')!.textContent).toBe('4 / 9');
    expect(el.querySelectorAll('.lw-shelf-pip.lw-lit')).toHaveLength(4);
    const locked = slots.filter((s) => s.classList.contains('lw-locked'));
    expect(locked).toHaveLength(5);
    for (const s of locked) {
      expect(s.querySelector('.lw-shelf-q')!.textContent).toBe('?');
      expect(s.querySelector('svg.lw-charm-locked')).not.toBeNull();
      expect(s.getAttribute('aria-disabled')).toBe('true');
      expect(s.textContent).not.toMatch(/Bunny/);
    }
    expect(slots.find((s) => s.dataset.charm === 'harbor-fish')!.textContent).toContain('Fish Bunny');
  });

  it('gives each rare charm a special frame, locked or not', () => {
    const el = charmShelfScreen(col(), { pick: noop, back: noop });
    const rare = [...el.querySelectorAll<HTMLElement>('.lw-shelf-slot.lw-rare')].map((s) => s.dataset.charm);
    expect(rare).toEqual(['night-moon', 'harbor-lighthouse', 'rooftop-watering-can']);
    for (const id of rare) expect(el.querySelector(`[data-charm="${id}"] .lw-shelf-rare`)!.textContent).toBe('Rare');
  });

  it('marks the display charm and passes picks through', () => {
    const picked: string[] = [];
    const el = charmShelfScreen(col(), { pick: (id) => picked.push(id), back: noop });
    const on = el.querySelector<HTMLButtonElement>('.lw-shelf-slot.lw-on')!;
    expect(on.dataset.charm).toBe('harbor-lighthouse');
    expect(on.getAttribute('aria-pressed')).toBe('true');
    expect(on.textContent).toContain('On your sign');
    el.querySelector<HTMLButtonElement>('[data-charm="harbor-fish"]')!.click();
    expect(picked).toEqual(['harbor-fish']);
  });

  it('updates the label card with where a charm comes from', () => {
    const el = charmShelfScreen(col(), { pick: noop, back: noop });
    document.body.append(el);
    el.querySelector<HTMLButtonElement>('[data-charm="night-moon"]')!.focus();
    const card = el.querySelector('.lw-shelf-detail')!;
    expect(card.querySelector('.lw-shelf-detail-name')!.textContent).toBe('???');
    expect(card.textContent).toContain('Bank one in Night Market');
    expect(card.textContent).toContain('about 1 in 13');
    el.querySelector<HTMLButtonElement>('[data-charm="harbor-fish"]')!.focus();
    expect(card.querySelector('.lw-shelf-detail-name')!.textContent).toBe('Fish Bunny');
    expect(charmStatus(LEVEL_CHARMS['harbor-pier']![2]!, 'harbor-pier', col())).toContain('Hanging from your crew sign');
  });

  it('arrow keys move down a column through the shelves, then on to Back', () => {
    const el = charmShelfScreen(col(), { pick: noop, back: noop });
    document.body.append(el);
    const nav = new MenuNav({ getRoot: () => el, onBack: noop, onStart: noop }, () => []);
    const press = (code: string) => window.dispatchEvent(new KeyboardEvent('keydown', { code }));
    el.querySelector<HTMLButtonElement>('[data-charm="night-noodle"]')!.focus();
    press('ArrowDown');
    expect((document.activeElement as HTMLElement).dataset.charm).toBe('harbor-fish');
    press('ArrowDown');
    expect((document.activeElement as HTMLElement).dataset.charm).toBe('rooftop-tomato');
    press('ArrowDown');
    expect(document.activeElement!.textContent).toBe('Back');
    press('ArrowUp');
    expect((document.activeElement as HTMLElement).dataset.charm).toBe('rooftop-watering-can');
    nav.dispose();
  });
});

describe('charm menus', () => {
  it('the title has a Charms button with the progress', () => {
    let opened = 0;
    const el = titleScreen(DEFAULT_SETTINGS, { play: noop, howTo: noop, settings: noop, pickLevel: noop, charms: () => opened++ }, { unlocked: 4, total: 9, display: null });
    const b = el.querySelector<HTMLButtonElement>('[data-key="menu-Charms"]')!;
    expect(b.textContent).toBe('Charms4 / 9');
    expect(b.querySelector('svg.lw-charm')).not.toBeNull();
    b.click();
    expect(opened).toBe(1);
  });

  it('match over reveals each first-time unlock, and offers the shelf', () => {
    expect(charmReveal([])).toBeNull();
    const el = matchOverScreen({ winner: 0, roundsWon: [1, 0] }, { again: noop, title: noop, shelf: noop }, ['night-moon', 'harbor-fish']);
    const cards = [...el.querySelectorAll<HTMLElement>('.lw-reveal-card')];
    expect(cards.map((c) => c.querySelector('.lw-reveal-name')!.textContent)).toEqual(['Moon Bunny', 'Fish Bunny']);
    expect(cards[0]!.classList.contains('lw-rare')).toBe(true);
    expect(el.querySelector('.lw-reveal-eyebrow')!.textContent).toBe('2 new charms!');
    expect(el.querySelector('[data-key="menu-Charm shelf"]')).not.toBeNull();
    const plain = matchOverScreen({ winner: 1, roundsWon: [0, 1] }, { again: noop, title: noop, shelf: noop });
    expect(plain.querySelector('.lw-reveal')).toBeNull();
    expect(plain.querySelector('[data-key="menu-Charm shelf"]')).toBeNull();
  });

  it('the manual explains charms with the level\'s own count', () => {
    expect(charmCountSentence('night-market')).toContain('3 times a round');
    expect(charmCountSentence('rooftop-garden')).toContain('once a round');
    const el = howToScreen(DEFAULT_SETTINGS, { back: noop });
    expect(el.textContent).toContain('Grab the charms');
    expect(el.textContent).toContain('+50');
  });

  it('draws every variant as SVG with finite numbers; silhouettes drop the face', () => {
    for (const id of ['night-lantern', 'night-moon', 'harbor-lighthouse', 'rooftop-watering-can', 'unknown-id']) {
      const markup = charmIcon(id);
      expect(markup).not.toMatch(/NaN|Infinity/);
      const host = document.createElement('div');
      host.innerHTML = markup;
      expect(host.querySelectorAll('path, ellipse').length).toBeGreaterThan(10);
    }
    expect(charmIcon('night-moon')).toContain('lw-charm-rare');
    expect(charmIcon('night-lantern')).not.toContain('lw-charm-rare');
    const full = charmIcon('night-noodle').match(/<(path|ellipse)/g)!.length;
    const sil = charmIcon('night-noodle', { silhouette: true });
    expect(sil.match(/<(path|ellipse)/g)!.length).toBeLessThan(full);
    expect(sil).not.toMatch(/#[0-9A-Fa-f]{6}/);
  });
});
