import { INGREDIENTS, levelById, RECIPES } from '@line-war/content';
import { DEFAULT_TUNING, type IngredientDef, type IngredientKind, type RecipeDef } from '@line-war/sim';
import { formatMult } from '../hud/text';

type IngredientDefs = Readonly<Record<IngredientKind, IngredientDef>>;
import type { KeyBindings, Settings } from '../settings/types';
import { button, h } from './dom';
import { foodIcon } from '../hud/icons';
import { charmIcon } from '../hud/charmIcon';
import { keyLabel } from './keyNames';
import { padActionLabel, type PadAction } from '../input/gamepad';
import { svg } from './screens';
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

const ACTIONS: { key: PadAction; label: string }[] = [
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
        h('h4', {}, `${slotName(i)} keyboard`),
        h('div', {}, h('kbd', {}, keysFor(b)), ' Move'),
        ACTIONS.map((a) => h('div', {}, h('kbd', {}, keyLabel(b[a.key])), ` ${a.label}`)),
      ),
    );
  });
  cols.push(
    h(
      'div',
      { class: 'lw-howto-keys' },
      h('h4', {}, 'Gamepad'),
      h('div', {}, h('kbd', {}, 'Stick'), ' Move'),
      ACTIONS.map((a) => h('div', {}, h('kbd', {}, padActionLabel(a.key)), ` ${a.label}`)),
    ),
  );
  return h('div', { class: 'lw-howto-controls' }, cols);
}

/** Small manual illustrations, drawn in the HUD's ink-and-paper style. */
const PLATE_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="14" rx="10" ry="6.5" fill="#FFF3D6" stroke="#2A2238" stroke-width="1.4"/><ellipse cx="12" cy="13.4" rx="6.2" ry="3.6" fill="none" stroke="#C98E5A" stroke-width="1.2"/></svg>`;
const BELL_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 17a7 7 0 0 1 14 0Z" fill="#FFC857" stroke="#2A2238" stroke-width="1.4" stroke-linejoin="round"/><rect x="3" y="17" width="18" height="2.6" rx="1.3" fill="#8A5A3B"/><circle cx="12" cy="8.6" r="1.6" fill="#2A2238"/></svg>`;
const DASH_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 8h8M2 12h9M4 16h7" stroke="#FFF3D6" stroke-width="2" stroke-linecap="round" opacity=".7"/><circle cx="16" cy="12" r="5.5" fill="#FF6B3D" stroke="#2A2238" stroke-width="1.4"/><path d="M20.5 5.5l1.5-2M21.8 9l2-.6M20.5 18.5l1.5 2" stroke="#FFC857" stroke-width="1.6" stroke-linecap="round"/></svg>`;

interface Step {
  n: number;
  title: string;
  body: string;
  icon: string;
}

/** The core loop as four illustrated steps, like a manual's first page. */
function loopSteps(): Step[] {
  const t = INGREDIENTS.tomato;
  return [
    { n: 1, title: 'Grab', body: 'Food comes from your shelves. Steak and fish only from the market crates in the middle.', icon: foodIcon('tomato', 'raw', null, 'raw tomato') },
    { n: 2, title: 'Prep', body: 'Chop on a board. Pans and pots cook by themselves, so pull them before they burn.', icon: foodIcon('tomato', 'chopped', t.cook?.vessel ?? null, 'chopped tomato') },
    { n: 3, title: 'Plate', body: `Put what the ticket asks for on one plate. Plated food goes cold after ${DEFAULT_TUNING.plateColdSeconds} s.`, icon: PLATE_ICON },
    { n: 4, title: 'Serve', body: 'Bring it to the window in your crew’s colour. First crew to serve a ticket wins it.', icon: BELL_ICON },
  ];
}

function stepCard(st: Step): HTMLElement {
  return h(
    'li',
    { class: 'lw-howto-step' },
    h('span', { class: 'lw-howto-step-n', 'aria-hidden': 'true' }, String(st.n)),
    svg(st.icon, 'lw-howto-step-icon'),
    h('h4', {}, st.title),
    h('p', {}, st.body),
  );
}

/** "How you win" tiles: one big number each, so the multipliers read at a glance. */
function winTiles(level: string): HTMLElement {
  const tu = DEFAULT_TUNING;
  const heat = tu.heatMultipliers.slice(1).map(formatMult).join(' · ');
  const tile = (stamp: HTMLElement, title: string, body: string) =>
    h('div', { class: 'lw-howto-tile' }, stamp, h('div', {}, h('h4', {}, title), h('p', {}, body)));
  const chip = (text: string, cls = '') => h('span', { class: `lw-howto-chip ${cls}` }, text);
  return h(
    'div',
    { class: 'lw-howto-tiles' },
    tile(svg(DASH_ICON, 'lw-howto-chip lw-howto-chip-icon'), 'Fight for the market', 'Dash into a rival carrying food in the market to knock it loose, then grab it.'),
    tile(chip(formatMult(tu.heatMultipliers[tu.heatMultipliers.length - 1]!), 'lw-howto-chip-heat'), 'Build Heat', `Clean serves in a row multiply your points (${heat}). Burning food drops you a tier.`),
    tile(
      chip(formatMult(tu.criticMultiplier), 'lw-howto-chip-critic'),
      'Finish strong',
      `The Critic (${formatMult(tu.criticMultiplier)}) shows up halfway, and the trailing crew sees it first. Dinner Rush scores ${formatMult(tu.rushMultiplier)} in the last minute.`,
    ),
    tile(
      svg(charmIcon('night-lantern'), 'lw-howto-chip lw-howto-chip-charm'),
      'Grab the charms',
      `${charmCountSentence(level)} Carry it into your kitchen for +${tu.charmPoints} and a Heat tier. It can be knocked loose, and it fades if nobody picks it up for ${tu.charmLifetimeSeconds} s. Each one you bank joins your charm shelf.`,
    ),
  );
}

/** "In Night Market, a lantern bunny charm pops up in the middle of the market 3 times a round." */
export function charmCountSentence(levelId: string): string {
  const lv = levelById(levelId);
  const n = lv.charmsPerRound;
  const times = n === 1 ? 'once' : n === 2 ? 'twice' : `${n} times`;
  return `In ${lv.name}, a lantern bunny charm pops up in the middle of the market ${times} a round.`;
}

const section = (n: string, title: string, ...body: (HTMLElement | HTMLElement[])[]) =>
  h('section', { class: 'lw-howto-section' }, h('h3', {}, h('span', { class: 'lw-howto-sec-n' }, n), title), ...body);

export function howToScreen(settings: Settings, actions: { back(): void }): HTMLElement {
  return h(
    'div',
    { class: 'lw-panel lw-howto' },
    h(
      'header',
      { class: 'lw-howto-head' },
      h('p', { class: 'lw-eyebrow' }, 'Field manual'),
      h('h2', {}, 'How to play'),
      h('p', { class: 'lw-howto-lede' }, 'Two crews, one ticket line. Race the other crew to every order.'),
    ),
    section('1', 'The loop', h('ol', { class: 'lw-howto-steps' }, loopSteps().map(stepCard))),
    section('2', 'How you win', winTiles(settings.level)),
    section(
      '3',
      'Menu',
      h(
        'div',
        { class: 'lw-howto-recipes' },
        RECIPES.map((r) =>
          h(
            'div',
            { class: `lw-howto-recipe${r.premium ? ' lw-premium' : ''}` },
            h('div', { class: 'lw-howto-recipe-head' }, h('b', {}, r.name), h('span', { class: 'lw-howto-value' }, `${r.baseValue}`)),
            svg(
              r.ingredients.map((f) => foodIcon(f.kind, f.state, INGREDIENTS[f.kind].cook?.vessel ?? null, `${f.state} ${f.kind}`)).join(''),
              'lw-howto-icons',
            ),
            recipeSteps(r, INGREDIENTS).map((s) => h('div', {}, s)),
          ),
        ),
      ),
    ),
    section('4', 'Controls', controls(settings)),
    h('div', { class: 'lw-howto-foot' }, button('Back', actions.back, { class: 'lw-btn lw-btn-primary', 'data-key': 'menu-Back' })),
  );
}
