import { levelById, RECIPES, type LevelDef } from '@line-war/content';
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
function loopSteps(level: LevelDef): Step[] {
  const t = level.ingredients.tomato;
  const market = marketFoods(level);
  const grab = market ? `Food comes from your shelves. ${market} only from the market crates in the middle.` : 'Food comes from your shelves.';
  return [
    { n: 1, title: 'Grab', body: grab, icon: foodIcon('tomato', 'raw', null, 'raw tomato') },
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

/** "Steak and fish": the level's market-only ingredients, or '' when every food is on the shelves. */
export function marketFoods(level: LevelDef): string {
  const names = Object.values(level.ingredients)
    .filter((d) => d.premium)
    .map((d, i) => (i === 0 ? d.name : d.name.toLowerCase()));
  return names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** How often a recipe turns up on this level: its share of the ticket weights. */
export interface MenuOdds {
  recipe: RecipeDef;
  /** 0..1 share of tickets. */
  share: number;
  /** "About 1 in 4 tickets". */
  label: string;
}

export function menuOdds(level: LevelDef): MenuOdds[] {
  const total = level.recipes.reduce((t, r) => t + r.weight, 0);
  return level.recipes.map((recipe) => {
    const share = total > 0 ? recipe.weight / total : 0;
    return { recipe, share, label: share > 0 ? `About 1 in ${Math.max(1, Math.round(1 / share))} tickets` : 'Not served' };
  });
}

/** Recipes from the full cookbook that this level leaves off its menu (Rooftop has no soup). */
export const offMenu = (level: LevelDef): RecipeDef[] => RECIPES.filter((r) => !level.recipes.some((x) => x.id === r.id));

function menuSection(level: LevelDef): HTMLElement[] {
  const odds = menuOdds(level);
  const top = Math.max(...odds.map((o) => o.share), 0.0001);
  const missing = offMenu(level);
  const out: HTMLElement[] = [
    h(
      'div',
      { class: 'lw-howto-recipes' },
      odds.map(({ recipe: r, share, label }) =>
        h(
          'div',
          { class: `lw-howto-recipe${r.premium ? ' lw-premium' : ''}`, 'data-recipe': r.id },
          h('div', { class: 'lw-howto-recipe-head' }, h('b', {}, r.name), h('span', { class: 'lw-howto-value' }, `${r.baseValue}`)),
          svg(
            r.ingredients.map((f) => foodIcon(f.kind, f.state, level.ingredients[f.kind].cook?.vessel ?? null, `${f.state} ${f.kind}`)).join(''),
            'lw-howto-icons',
          ),
          recipeSteps(r, level.ingredients).map((s) => h('div', {}, s)),
          h(
            'div',
            { class: 'lw-howto-odds', title: label },
            h('span', { class: 'lw-howto-odds-bar', 'aria-hidden': 'true' }, h('i', { style: `width:${Math.round((share / top) * 100)}%` })),
            h('span', {}, label),
          ),
        ),
      ),
    ),
  ];
  if (missing.length) out.push(h('p', { class: 'lw-howto-offmenu' }, `Not on the menu in ${level.name}: ${missing.map((r) => r.name).join(', ')}.`));
  return out;
}

const SECTIONS = ['The loop', 'How you win', 'Menu', 'Controls'] as const;

const section = (n: number, title: string, tag: HTMLElement | null, ...body: (HTMLElement | HTMLElement[])[]) =>
  h(
    'section',
    { class: 'lw-howto-section', id: `lw-howto-sec-${n}`, role: 'tabpanel', 'aria-labelledby': `lw-howto-tab-${n}`, 'data-sec': String(n) },
    h('h3', {}, h('span', { class: 'lw-howto-sec-n' }, String(n)), title, tag),
    ...body,
  );

/**
 * Turn the manual to `page` (1-based, clamped). The tabs, the page dots and the page number
 * follow, and `data-dir` tells the CSS which way the new page slides in.
 */
export function turnPage(manual: HTMLElement, page: number): void {
  const n = Math.max(1, Math.min(SECTIONS.length, page));
  const cur = Number(manual.dataset.page ?? '1');
  if (n === cur) return;
  manual.dataset.dir = n > cur ? 'next' : 'prev';
  manual.dataset.page = String(n);
  manual.querySelectorAll('.lw-howto-tab').forEach((t, j) => t.setAttribute('aria-selected', j + 1 === n ? 'true' : 'false'));
  manual.querySelectorAll('.lw-howto-dot').forEach((d, j) => d.classList.toggle('lw-on', j + 1 === n));
  const folio = manual.querySelector('.lw-howto-folio');
  if (folio) folio.textContent = `Page ${n} of ${SECTIONS.length}`;
}

/** The manual's page tabs: one section per page, at every screen size, so nothing ever scrolls. */
function pageTabs(page: HTMLElement): HTMLElement {
  const tabs = SECTIONS.map((title, i) =>
    h(
      'button',
      {
        type: 'button',
        class: 'lw-howto-tab',
        role: 'tab',
        id: `lw-howto-tab-${i + 1}`,
        'aria-controls': `lw-howto-sec-${i + 1}`,
        'aria-selected': i === 0 ? 'true' : 'false',
        'data-key': `howto-tab-${i + 1}`,
        onclick: () => turnPage(page, i + 1),
      },
      h('span', { class: 'lw-howto-sec-n' }, String(i + 1)),
      title,
    ),
  );
  return h('div', { class: 'lw-howto-tabs', role: 'tablist', 'aria-label': 'Manual pages' }, tabs);
}

/** Footer: how to turn pages (keys and pad shoulders), page dots, the folio, and Back. */
function pageFoot(back: () => void): HTMLElement {
  return h(
    'div',
    { class: 'lw-howto-foot' },
    h(
      'p',
      { class: 'lw-howto-turn' },
      h('kbd', {}, 'Q'),
      h('kbd', {}, 'E'),
      h('span', { class: 'lw-howto-or' }, 'or'),
      h('kbd', {}, 'LB'),
      h('kbd', {}, 'RB'),
      h('span', {}, 'turn pages'),
    ),
    h(
      'div',
      { class: 'lw-howto-pager', 'aria-hidden': 'true' },
      h('span', { class: 'lw-howto-dots' }, SECTIONS.map((_, i) => h('i', { class: `lw-howto-dot${i === 0 ? ' lw-on' : ''}` }))),
      h('span', { class: 'lw-howto-folio' }, `Page 1 of ${SECTIONS.length}`),
    ),
    button('Back', back, { class: 'lw-btn lw-btn-primary', 'data-key': 'menu-Back' }),
  );
}

export function howToScreen(settings: Settings, actions: { back(): void }): HTMLElement {
  const level = levelById(settings.level);
  const page = h(
    'div',
    { class: 'lw-panel lw-howto', 'data-page': '1', 'data-arrows-turn-pages': '' },
    h(
      'header',
      { class: 'lw-howto-head' },
      h('p', { class: 'lw-eyebrow' }, 'Field manual'),
      h('h2', {}, 'How to play'),
      h('p', { class: 'lw-howto-lede' }, 'Two crews, one ticket line. Race the other crew to every order.'),
    ),
  );
  page.append(
    pageTabs(page),
    section(1, SECTIONS[0], null, h('ol', { class: 'lw-howto-steps' }, loopSteps(level).map(stepCard))),
    section(2, SECTIONS[1], null, winTiles(settings.level)),
    section(3, SECTIONS[2], h('span', { class: 'lw-howto-level', 'data-level': level.id }, `Tonight at ${level.name}`), ...menuSection(level)),
    section(4, SECTIONS[3], null, controls(settings)),
    pageFoot(actions.back),
  );
  return page;
}
