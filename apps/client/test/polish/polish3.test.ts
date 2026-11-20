// @vitest-environment jsdom
import { levelById, LEVELS, RECIPES } from '@line-war/content';
import type { SimEvent } from '@line-war/sim';
import { afterEach, describe, expect, it } from 'vitest';
import { displayTeam } from '../../src/collection/store';
import { DEFAULT_SETTINGS, P1_KEYS, P2_KEYS, type Settings, type SlotController } from '../../src/settings/types';
import { charmShelfScreen, SIGN_RULE } from '../../src/ui/charmShelf';
import { howToScreen, marketFoods, menuOdds, offMenu } from '../../src/ui/howTo';
import { focusables } from '../../src/ui/nav';
import { decidedOnTotal, ledger, recordRoundEnds, type RoundResult } from '../../src/ui/results';
import { matchOverScreen } from '../../src/ui/screens';

afterEach(() => document.body.replaceChildren());

const kb = (bindings = P1_KEYS): SlotController => ({ kind: 'keyboard', bindings });
const bot: SlotController = { kind: 'bot', difficulty: 'normal' };
const pad = (index: number): SlotController => ({ kind: 'gamepad', index });
const slots = (...s: SlotController[]) => s as Settings['slots'];
const noop = () => {};

describe('favourite charm: one sign, the first local player’s crew', () => {
  it('hangs on the crew of the lowest-numbered human, even with humans on both crews', () => {
    expect(displayTeam(slots(kb(), bot, kb(P2_KEYS), bot))).toBe(0);
    expect(displayTeam(slots(bot, bot, kb(), bot))).toBe(1);
    expect(displayTeam(slots(bot, pad(0), bot, kb()))).toBe(0);
    expect(displayTeam(slots(bot, bot, bot, pad(1)))).toBe(1);
  });

  it('hangs nowhere in a bots-only match', () => {
    expect(displayTeam(slots(bot, bot, bot, { kind: 'none' }))).toBeNull();
  });

  it('the shelf explains the rule', () => {
    const el = charmShelfScreen({ version: 1, unlocked: [], display: null }, { pick: noop, back: noop });
    expect(el.textContent).toContain(SIGN_RULE);
    expect(SIGN_RULE).toContain('P1');
  });
});

describe('how to play follows the chosen level', () => {
  const at = (level: string): Settings => ({ ...DEFAULT_SETTINGS, level });

  it('Rooftop Garden has no soup, says so, and labels the level', () => {
    const roof = levelById('rooftop-garden');
    expect(offMenu(roof).map((r) => r.id)).toEqual(['soup']);
    const el = howToScreen(at('rooftop-garden'), { back: noop });
    const menu = el.querySelector('[data-sec="3"]')!;
    expect([...menu.querySelectorAll('[data-recipe]')].map((r) => r.getAttribute('data-recipe'))).toEqual(roof.recipes.map((r) => r.id));
    expect(menu.querySelector('[data-recipe="soup"]')).toBeNull();
    expect(menu.querySelector('.lw-howto-level')?.textContent).toContain('Rooftop Garden');
    expect(menu.textContent).toContain('Not on the menu in Rooftop Garden: Tomato soup.');
  });

  it('every level shows its whole menu with odds that come from its weights', () => {
    for (const lv of LEVELS) {
      const odds = menuOdds(lv);
      expect(odds.map((o) => o.recipe.id)).toEqual(lv.recipes.map((r) => r.id));
      expect(odds.reduce((t, o) => t + o.share, 0)).toBeCloseTo(1, 9);
    }
    // Harbor Pier is fish night: fish is its most common ticket (weight 3 of 10.5).
    const harbor = menuOdds(levelById('harbor-pier'));
    const fish = harbor.find((o) => o.recipe.id === 'fish')!;
    expect(fish.share).toBe(Math.max(...harbor.map((o) => o.share)));
    expect(fish.label).toBe('About 1 in 4 tickets');
    expect(offMenu(levelById('night-market'))).toEqual([]);
  });

  it('marks market-only food per level', () => {
    expect(marketFoods(levelById('night-market'))).toBe('Steak and fish');
    expect(marketFoods(levelById('rooftop-garden'))).toBe('Lettuce and tomato');
    const roofText = howToScreen(at('rooftop-garden'), { back: noop }).textContent ?? '';
    expect(roofText).toContain('Lettuce (market): chop');
    expect(roofText).toContain('Lettuce and tomato only from the market crates');
    const nightText = howToScreen(at('night-market'), { back: noop }).textContent ?? '';
    expect(nightText).toContain('Lettuce: chop');
    for (const r of RECIPES) expect(nightText).toContain(r.name);
  });

  it('page tabs switch the visible section (used on short screens)', () => {
    const el = howToScreen(DEFAULT_SETTINGS, { back: noop });
    expect(el.dataset.page).toBe('1');
    const tabs = [...el.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
    expect(tabs.map((t) => t.textContent)).toEqual(['1The loop', '2How you win', '3Menu', '4Controls']);
    tabs[2]!.click();
    expect(el.dataset.page).toBe('3');
    expect(tabs.map((t) => t.getAttribute('aria-selected'))).toEqual(['false', 'false', 'true', 'false']);
  });

  it('menu navigation skips controls hidden by CSS', () => {
    const root = document.createElement('div');
    root.innerHTML = '<button id="a"></button><button id="b"></button><button id="c" disabled></button>';
    document.body.append(root);
    (root.querySelector('#a') as HTMLElement & { checkVisibility(): boolean }).checkVisibility = () => false;
    expect(focusables(root).map((e) => e.id)).toEqual(['b']);
  });
});

describe('match over: points per round and the total', () => {
  const end = (a: number, b: number, winner: 0 | 1 | null): SimEvent => ({ type: 'roundEnd', winner, scores: [a, b] });

  it('records every roundEnd in order and ignores other events', () => {
    const log: RoundResult[] = [];
    expect(recordRoundEnds([{ type: 'phaseChange', phase: 'roundOver' } as SimEvent, end(320, 245, 0)], log)).toBe(1);
    recordRoundEnds([], log);
    recordRoundEnds([end(180, 410, 1)], log);
    expect(log).toEqual([
      { scores: [320, 245], winner: 0 },
      { scores: [180, 410], winner: 1 },
    ]);
  });

  it('shows each round with its winner marked, and the total', () => {
    const rounds: RoundResult[] = [
      { scores: [320, 245], winner: 0 },
      { scores: [180, 410], winner: 1 },
      { scores: [515, 290], winner: 0 },
    ];
    const el = matchOverScreen({ winner: 0, roundsWon: [2, 1], rounds, totals: [1015, 945] }, { again: noop, title: noop });
    const rows = [...el.querySelectorAll('.lw-ledger tbody tr')];
    expect(rows.map((r) => r.getAttribute('data-winner'))).toEqual(['0', '1', '0']);
    expect(rows[1]!.querySelector('.lw-ledger-won')?.textContent).toBe('410');
    expect(rows[0]!.textContent).toContain('Round 1');
    const total = el.querySelector('.lw-ledger tfoot')!.textContent;
    expect(total).toContain('1,015');
    expect(total).toContain('945');
    expect(el.querySelector('.lw-over-tiebreak')).toBeNull();
  });

  it('a draw round says so, and a match level on rounds says the total decided it', () => {
    const r = { winner: 1 as const, roundsWon: [1, 1] as [number, number], rounds: [
      { scores: [200, 200], winner: null },
      { scores: [300, 100], winner: 0 },
      { scores: [100, 450], winner: 1 },
    ] as RoundResult[], totals: [600, 750] as [number, number] };
    expect(decidedOnTotal(r)).toBe(true);
    const el = matchOverScreen(r, { again: noop, title: noop });
    expect(el.querySelector('[data-round="1"]')?.textContent).toContain('Draw');
    expect(el.querySelector('.lw-over-tiebreak')).not.toBeNull();
    expect(el.querySelector('tfoot .lw-ledger-won')?.textContent).toBe('750');
  });

  it('without round data the card shows rounds won only', () => {
    expect(ledger({ winner: null, roundsWon: [0, 0] })).toBeNull();
  });
});
