import { INGREDIENTS, RECIPES } from '@line-war/content';
import type { IngredientDef, IngredientKind, RecipeDef } from '@line-war/sim';

type IngredientDefs = Readonly<Record<IngredientKind, IngredientDef>>;
import type { KeyBindings, Settings } from '../settings/types';
import { button, h } from './dom';
import { keyLabel } from './keyNames';
import { slotName } from './settingsMenu';

/** One short line per ingredient on a plate, e.g. "Tomato: chop, then cook in a pot". */
export function ingredientStep(food: RecipeDef['ingredients'][number], defs: IngredientDefs): string {
  const def = defs[food.kind];
  const name = def?.name ?? food.kind;
  const where = def?.premium ? ' (market)' : '';
  if (food.state === 'raw') return `${name}${where}`;
  if (food.state === 'chopped') return `${name}${where}: chop`;
  if (food.state === 'cooked' && def?.cook) {
    const vessel = def.cook.vessel === 'pan' ? 'pan' : 'pot (fills with 3)';
    return def.cook.from === 'chopped' ? `${name}${where}: chop, then ${vessel}` : `${name}${where}: ${vessel}`;
  }
  return `${name}${where}: ${food.state}`;
}

/** Recipe card lines: each distinct ingredient once, with a count when it repeats. */
export function recipeSteps(recipe: RecipeDef, defs: IngredientDefs): string[] {
  const counts = new Map<string, number>();
  for (const f of recipe.ingredients) {
    const step = ingredientStep(f, defs);
    counts.set(step, (counts.get(step) ?? 0) + 1);
  }
  return [...counts].map(([step, n]) => (n > 1 ? `${n}× ${step}` : step));
}

const ACTIONS: { key: keyof KeyBindings; label: string }[] = [
  { key: 'grab', label: 'Grab / place / serve' },
  { key: 'work', label: 'Chop / wash / put out fire (hold)' },
  { key: 'dash', label: 'Dash (knocks rivals in the market)' },
  { key: 'throw', label: 'Throw' },
];

function keysFor(b: KeyBindings): string {
  return [b.up, b.left, b.down, b.right].map(keyLabel).join(' ');
}

function controls(settings: Settings): HTMLElement {
  const cols: HTMLElement[] = [];
  settings.slots.forEach((slot, i) => {
    if (slot.kind !== 'keyboard') return;
    const b = slot.bindings;
    cols.push(
      h(
        'div',
        { class: 'lw-howto-keys' },
        h('h3', {}, `${slotName(i)} keyboard`),
        h('div', {}, h('kbd', {}, keysFor(b)), ' Move'),
        ACTIONS.map((a) => h('div', {}, h('kbd', {}, keyLabel(b[a.key])), ` ${a.label}`)),
      ),
    );
  });
  cols.push(
    h(
      'div',
      { class: 'lw-howto-keys' },
      h('h3', {}, 'Gamepad'),
      h('div', {}, h('kbd', {}, 'Stick'), ' Move'),
      ACTIONS.map((a, j) => h('div', {}, h('kbd', {}, ['A', 'X', 'B', 'Y'][j]!), ` ${a.label}`)),
    ),
  );
  return h('div', { class: 'lw-howto-controls' }, cols);
}

export function howToScreen(settings: Settings, actions: { back(): void }): HTMLElement {
  return h(
    'div',
    { class: 'lw-panel lw-howto' },
    h('h2', {}, 'How to play'),
    h(
      'ol',
      { class: 'lw-howto-rules' },
      h('li', {}, h('b', {}, 'Race the other crew. '), 'Both crews cook from one ticket board. The first crew to serve a matching dish at its own pass (coloured squares) wins the ticket.'),
      h('li', {}, h('b', {}, 'Cook. '), 'Take ingredients from your shelves, chop on a board, cook in a pan or pot, put them on a plate, serve. Food burns if you leave it, and plated food goes cold after 20 s.'),
      h('li', {}, h('b', {}, 'Fight for the market. '), 'Steak and fish only come from the crates in the middle. Dash into a rival who is carrying something there to knock it loose, then grab it.'),
      h('li', {}, h('b', {}, 'Build Heat. '), 'Clean serves in a row multiply your points (×1.25, ×1.5, ×2). Burning food drops you a tier.'),
      h('li', {}, h('b', {}, 'Finish strong. '), 'The Critic (×3) shows up halfway, and the trailing crew sees it first. Dinner Rush scores ×1.5 in the last minute.'),
    ),
    h('h3', {}, 'Menu'),
    h(
      'div',
      { class: 'lw-howto-recipes' },
      RECIPES.map((r) =>
        h('div', { class: 'lw-howto-recipe' }, h('b', {}, `${r.name} · ${r.baseValue}`), recipeSteps(r, INGREDIENTS).map((s) => h('div', {}, s))),
      ),
    ),
    h('h3', {}, 'Controls'),
    controls(settings),
    h('div', { class: 'lw-menu' }, button('Back', actions.back, { class: 'lw-btn lw-btn-primary', 'data-key': 'menu-Back' })),
  );
}
