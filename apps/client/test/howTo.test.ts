// @vitest-environment jsdom
import { INGREDIENTS, RECIPES } from '@line-war/content';
import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../src/settings/types';
import { howToScreen, recipeSteps } from '../src/ui/howTo';
import { DEFAULT_TUNING } from '@line-war/sim';
import { padActionLabel } from '../src/input/gamepad';

const recipe = (id: string) => RECIPES.find((r) => r.id === id)!;

describe('how to play', () => {
  it('derives recipe steps from content', () => {
    expect(recipeSteps(recipe('salad'), INGREDIENTS)).toEqual(['Lettuce: chop', 'Tomato: chop']);
    expect(recipeSteps(recipe('burger'), INGREDIENTS)).toEqual(['Bun', 'Meat: pan']);
    expect(recipeSteps(recipe('soup'), INGREDIENTS)).toEqual(['3× Tomato: chop, then pot (fills with 3)']);
    expect(recipeSteps(recipe('steak'), INGREDIENTS)[0]).toBe('Steak (market): pan');
  });

  it('lists every recipe and the real key bindings', () => {
    const el = howToScreen(DEFAULT_SETTINGS, { back: () => {} });
    const text = el.textContent ?? '';
    for (const r of RECIPES) expect(text).toContain(r.name);
    expect(text).toContain('P1 keyboard');
    expect(text).toContain('Space');
    expect(text).toContain('Gamepad');
  });

  it('reads like a manual page: the loop in four steps, multipliers from tuning, pad labels from the mapping', () => {
    const el = howToScreen(DEFAULT_SETTINGS, { back: () => {} });
    expect([...el.querySelectorAll('.lw-howto-step h4')].map((e) => e.textContent)).toEqual(['Grab', 'Prep', 'Plate', 'Serve']);
    const text = el.textContent ?? '';
    expect(text).toContain(`×${DEFAULT_TUNING.criticMultiplier}`);
    expect(text).toContain(`${DEFAULT_TUNING.plateColdSeconds} s`);
    const pad = [...el.querySelectorAll('.lw-howto-keys')].find((k) => k.textContent?.startsWith('Gamepad'))!;
    const caps = [...pad.querySelectorAll('kbd')].map((k) => k.textContent);
    expect(caps).toEqual(['Stick', padActionLabel('grab'), padActionLabel('work'), padActionLabel('dash'), padActionLabel('throw'), 'Start']);
  });

  it('Back calls back', () => {
    let backed = false;
    const el = howToScreen(DEFAULT_SETTINGS, { back: () => (backed = true) });
    (el.querySelector('[data-key="menu-Back"]') as HTMLButtonElement).click();
    expect(backed).toBe(true);
  });
});
