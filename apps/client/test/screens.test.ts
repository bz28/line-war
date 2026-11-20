// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../src/settings/types';
import { matchOverScreen, rulesSentence, titleScreen } from '../src/ui/screens';

const noop = () => {};

describe('menu screens', () => {
  it('title names the crews Jade and Ember and states the rules as a sentence', () => {
    const el = titleScreen(DEFAULT_SETTINGS, { play: noop, howTo: noop, settings: noop, pickLevel: noop });
    const text = el.textContent ?? '';
    expect(text).toContain('Jade');
    expect(text).toContain('Ember');
    expect(text).not.toContain('Crew A');
    expect(text).not.toContain(' · ');
    expect(el.querySelector('.lw-logo')!.getAttribute('aria-label')).toBe('LINE WAR');
    expect(el.querySelector('.lw-logo-lantern svg')).not.toBeNull();
  });

  it('title offers every level as a card, marks the chosen one and shows its blurb', () => {
    const picked: string[] = [];
    const el = titleScreen({ ...DEFAULT_SETTINGS, level: 'harbor-pier' }, { play: noop, howTo: noop, settings: noop, pickLevel: (id) => picked.push(id) });
    const cards = [...el.querySelectorAll<HTMLButtonElement>('.lw-level')];
    expect(cards.map((c) => c.textContent)).toEqual(['Night Market', 'Harbor Pier', 'Rooftop Garden']);
    expect(cards.map((c) => c.getAttribute('aria-pressed'))).toEqual(['false', 'true', 'false']);
    expect(cards[0]!.querySelector('svg rect')).not.toBeNull();
    expect(el.querySelector('.lw-level-blurb')!.textContent).toContain('Fish night');
    cards[2]!.click();
    expect(picked).toEqual(['rooftop-garden']);
  });

  it('rulesSentence reads naturally for every combination', () => {
    expect(rulesSentence(DEFAULT_SETTINGS.match)).toBe('Best of 3 rounds, 4 minutes each, with Dinner Rush and the Critic.');
    expect(rulesSentence({ ...DEFAULT_SETTINGS.match, bestOf: 1, roundSeconds: 90, rushEnabled: false, criticEnabled: false })).toBe(
      'One round of 1:30.',
    );
    expect(rulesSentence({ ...DEFAULT_SETTINGS.match, roundSeconds: 60, brunchSpeed: true })).toBe(
      'Best of 3 rounds, 1 minute each, with Dinner Rush, the Critic and Brunch Speed.',
    );
  });

  it('match over shows the winner crew and a draw', () => {
    const won = matchOverScreen({ winner: 0, roundsWon: [2, 1] }, { again: noop, title: noop });
    expect(won.querySelector('.lw-winner')!.textContent).toBe('Jade wins');
    expect(won.querySelector('.lw-won')!.textContent).toContain('Jade');
    const draw = matchOverScreen({ winner: null, roundsWon: [1, 1] }, { again: noop, title: noop });
    expect(draw.querySelector('.lw-winner')!.textContent).toBe('A draw!');
  });
});
