import { LEVEL_CHARMS, LEVELS } from '@line-war/content';
import type { CharmVariantDef } from '@line-war/sim';
import { charmIcon } from '../hud/charmIcon';
import { CHARM_IDS, type Collection } from '../collection/store';
import { button, h } from './dom';
import { svg } from './screens';

/**
 * The charm shelf: three wooden shelves (one per level) of three charms each. Unlocked charms
 * show their figure and name, locked ones a silhouette with a "?", rare ones a gold frame.
 * Choosing an unlocked charm hangs it from your crew sign (choose it again to take it down).
 */

/** Where the favourite hangs when this machine has players on both crews (collection/store displayTeam). */
export const SIGN_RULE = 'Players on both crews? It hangs on one sign only: the crew of the first player, P1 before P2, P3 and P4.';

export interface ShelfActions {
  pick(id: string): void;
  back(): void;
}

const levelName = (id: string): string => LEVELS.find((l) => l.id === id)?.name ?? id;

/** "about 1 in 13": how often a variant turns up among its level's charms. */
export function charmOdds(level: string, id: string): string {
  const list = LEVEL_CHARMS[level] ?? [];
  const total = list.reduce((t, c) => t + c.weight, 0);
  const w = list.find((c) => c.id === id)?.weight ?? 0;
  if (!w || !total) return '';
  return `about 1 in ${Math.round(total / w)}`;
}

/** The sentence under the big figure for a charm. */
export function charmStatus(c: CharmVariantDef, level: string, col: Collection): string {
  if (!col.unlocked.includes(c.id)) {
    const rare = c.rare ? ` A rare one: ${charmOdds(level, c.id)} charms there.` : '';
    return `Bank one in ${levelName(level)} to add it to your shelf.${rare}`;
  }
  if (col.display === c.id) return 'Hanging from your crew sign. Choose it again to take it down.';
  return 'Choose it to hang it from your crew sign in matches.';
}

function slot(c: CharmVariantDef, level: string, col: Collection, index: number, onPick: (id: string) => void): HTMLElement {
  const open = col.unlocked.includes(c.id);
  const on = col.display === c.id;
  const cls = ['lw-shelf-slot', open ? 'lw-unlocked' : 'lw-locked', c.rare ? 'lw-rare' : '', on ? 'lw-on' : ''].filter(Boolean).join(' ');
  const label = open ? `${c.name}${c.rare ? ', rare' : ''}${on ? ', on your sign' : ''}` : `Locked charm from ${levelName(level)}${c.rare ? ', rare' : ''}`;
  return h(
    'button',
    {
      type: 'button',
      class: cls,
      'data-key': `charm-${c.id}`,
      'data-charm': c.id,
      'data-col': String(index),
      'aria-label': label,
      'aria-pressed': open ? (on ? 'true' : 'false') : undefined,
      'aria-disabled': open ? undefined : 'true',
      style: `--i:${index}`,
      onclick: () => onPick(c.id),
    },
    h('span', { class: 'lw-shelf-glow', 'aria-hidden': 'true' }),
    svg(charmIcon(c.id, { silhouette: !open }), 'lw-shelf-art'),
    open ? null : h('span', { class: 'lw-shelf-q', 'aria-hidden': 'true' }, '?'),
    h('span', { class: 'lw-shelf-name', 'aria-hidden': 'true' }, open ? c.name : 'Locked'),
    c.rare ? h('span', { class: 'lw-shelf-rare', 'aria-hidden': 'true' }, 'Rare') : null,
    on ? h('span', { class: 'lw-shelf-pin', 'aria-hidden': 'true' }, 'On your sign') : null,
  );
}

function detail(col: Collection): { el: HTMLElement; show(id: string | null): void } {
  const art = h('div', { class: 'lw-shelf-detail-art' });
  const name = h('h3', { class: 'lw-shelf-detail-name' });
  const meta = h('p', { class: 'lw-shelf-detail-meta' });
  const status = h('p', { class: 'lw-shelf-detail-status' });
  const el = h('aside', { class: 'lw-shelf-detail', 'aria-live': 'polite' }, art, name, meta, status);
  const show = (id: string | null) => {
    const level = Object.keys(LEVEL_CHARMS).find((l) => LEVEL_CHARMS[l]!.some((c) => c.id === id));
    const c = level ? LEVEL_CHARMS[level]!.find((x) => x.id === id) : undefined;
    if (!c || !level) {
      art.innerHTML = charmIcon(col.display ?? 'night-lantern', { silhouette: !col.display });
      name.textContent = col.display ? 'Your charm' : 'Your shelf';
      meta.textContent = '';
      status.textContent = 'Pick a charm to see where it comes from.';
      el.className = 'lw-shelf-detail';
      return;
    }
    const open = col.unlocked.includes(c.id);
    el.className = `lw-shelf-detail${open ? '' : ' lw-locked'}${c.rare ? ' lw-rare' : ''}`;
    art.innerHTML = charmIcon(c.id, { silhouette: !open });
    name.textContent = open ? c.name : '???';
    meta.textContent = `${levelName(level)}${c.rare ? ', rare' : ''}`;
    status.textContent = charmStatus(c, level, col);
  };
  return { el, show };
}

/** Little lanterns along the shelf's top string, one per charm, lit when unlocked. */
function progress(col: Collection): HTMLElement {
  const n = col.unlocked.length;
  return h(
    'div',
    { class: 'lw-shelf-progress', role: 'img', 'aria-label': `${n} of ${CHARM_IDS.length} charms collected` },
    h('span', { class: 'lw-shelf-count', 'aria-hidden': 'true' }, h('b', {}, String(n)), ` / ${CHARM_IDS.length}`),
    h(
      'span',
      { class: 'lw-shelf-pips', 'aria-hidden': 'true' },
      CHARM_IDS.map((id) => h('span', { class: `lw-shelf-pip${col.unlocked.includes(id) ? ' lw-lit' : ''}` })),
    ),
  );
}

export function charmShelfScreen(col: Collection, actions: ShelfActions): HTMLElement {
  const info = detail(col);
  const shelves = h(
    'div',
    { class: 'lw-shelves' },
    Object.entries(LEVEL_CHARMS).map(([level, list]) => {
      const got = list.filter((c) => col.unlocked.includes(c.id)).length;
      return h(
        'section',
        { class: 'lw-shelf-row', 'aria-label': `${levelName(level)}: ${got} of ${list.length}` },
        h('h3', { class: 'lw-shelf-level' }, levelName(level), h('span', {}, `${got} / ${list.length}`)),
        h('div', { class: 'lw-shelf-plank' }, list.map((c, i) => slot(c, level, col, i, actions.pick))),
      );
    }),
  );
  const onFocus = (e: Event) => {
    const id = (e.target as HTMLElement | null)?.closest?.('[data-charm]')?.getAttribute('data-charm') ?? null;
    if (id) info.show(id);
  };
  shelves.addEventListener('focusin', onFocus);
  shelves.addEventListener('pointerover', onFocus);
  info.show(col.display);
  return h(
    'div',
    { class: 'lw-panel lw-shelf' },
    h(
      'header',
      { class: 'lw-shelf-head' },
      h('div', {}, h('p', { class: 'lw-eyebrow' }, 'Collection'), h('h2', {}, 'Charm shelf')),
      progress(col),
    ),
    h('p', { class: 'lw-shelf-lede' }, 'Carry a charm home with your crew to add it here. Hang your favourite from your crew sign.'),
    h('p', { class: 'lw-shelf-note' }, SIGN_RULE),
    h('div', { class: 'lw-shelf-body' }, shelves, info.el),
    h('div', { class: 'lw-howto-foot lw-shelf-foot' }, button('Back', actions.back, { class: 'lw-btn lw-btn-primary', 'data-key': 'menu-Back' })),
  );
}
