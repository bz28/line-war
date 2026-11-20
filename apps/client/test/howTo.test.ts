// @vitest-environment jsdom
import { INGREDIENTS, RECIPES } from '@line-war/content';
import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../src/settings/types';
import { howToScreen, recipeSteps } from '../src/ui/howTo';

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

  it('Back calls back', () => {
    let backed = false;
    const el = howToScreen(DEFAULT_SETTINGS, { back: () => (backed = true) });
    (el.querySelector('[data-key="menu-Back"]') as HTMLButtonElement).click();
    expect(backed).toBe(true);
  });
});
