import type { TeamId } from '@line-war/sim';
import { TEAMS } from '../art/tokens';
import { crewMark, lanternIcon } from '../hud/icons';
import { findKeyConflicts, layoutOf } from '../settings/store';
import type { Settings, SlotController } from '../settings/types';
import { button, h } from './dom';
import { levelPicker } from './levelPicker';
import { levelById } from '@line-war/content';
import { slotName } from './settingsMenu';
import { charmIcon } from '../hud/charmIcon';
import { charmById } from '@line-war/content';

export interface MenuItem {
  label: string;
  onSelect(): void;
  primary?: boolean;
  /** Small trailing note on the button (e.g. the charm count). */
  badge?: string;
  /** Inline SVG shown before the label. */
  icon?: string;
}

function menu(items: MenuItem[]): HTMLElement {
  return h(
    'div',
    { class: 'lw-menu' },
    items.map((it) => {
      const b = button(it.label, it.onSelect, { class: `lw-btn${it.primary ? ' lw-btn-primary' : ''}${it.icon ? ' lw-btn-icon' : ''}`, 'data-key': `menu-${it.label}` });
      if (it.icon) b.prepend(svg(it.icon, 'lw-btn-art'));
      if (it.badge) b.append(h('span', { class: 'lw-btn-badge' }, it.badge));
      return b;
    }),
  );
}

/** Inline SVG markup -> element (icons are authored as strings in hud/icons.ts). */
export function svg(markup: string, cls: string): HTMLElement {
  const span = h('span', { class: cls, 'aria-hidden': 'true' });
  span.innerHTML = markup;
  return span;
}

function slotSummary(slot: SlotController): string {
  switch (slot.kind) {
    case 'keyboard': {
      const l = layoutOf(slot.bindings);
      return l === 'p1' ? 'WASD keys' : l === 'p2' ? 'Arrow keys' : 'Custom keys';
    }
    case 'gamepad':
      return `Gamepad ${slot.index + 1}`;
    case 'bot':
      return `${slot.difficulty[0]!.toUpperCase()}${slot.difficulty.slice(1)} bot`;
    case 'none':
      return 'Empty';
  }
}

function lineup(settings: Settings): HTMLElement {
  const crew = (team: TeamId, ids: number[]) =>
    h(
      'div',
      { class: `lw-lineup-crew ${team === 0 ? 'lw-crew-a' : 'lw-crew-b'}` },
      h('h3', {}, svg(crewMark(team), 'lw-lineup-mark'), TEAMS[team].name),
      ids.map((i) => h('div', { class: 'lw-lineup-slot' }, h('b', {}, slotName(i)), ' ', slotSummary(settings.slots[i]!))),
    );
  return h('div', { class: 'lw-lineup' }, crew(0, [0, 1]), h('span', { class: 'lw-vs' }, 'vs'), crew(1, [2, 3]));
}

/** "Best of 3 rounds, 4 minutes each, with Dinner Rush and the Critic." */
export function rulesSentence(m: Settings['match']): string {
  const len = m.roundSeconds % 60 === 0 ? `${m.roundSeconds / 60} minute${m.roundSeconds === 60 ? '' : 's'}` : `${Math.floor(m.roundSeconds / 60)}:${String(m.roundSeconds % 60).padStart(2, '0')}`;
  const base = m.bestOf === 1 ? `One round of ${len}` : `Best of ${m.bestOf} rounds, ${len} each`;
  const extras = [m.rushEnabled ? 'Dinner Rush' : null, m.criticEnabled ? 'the Critic' : null, m.brunchSpeed ? 'Brunch Speed' : null].filter(
    (x): x is string => x !== null,
  );
  const list = extras.length <= 1 ? extras.join('') : `${extras.slice(0, -1).join(', ')} and ${extras[extras.length - 1]}`;
  return `${base}${list ? `, with ${list}` : ''}.`;
}

/** The LINE WAR wordmark: the two crew colours meeting at a lantern. */
export function logo(): HTMLElement {
  return h(
    'h1',
    { class: 'lw-logo', 'aria-label': 'LINE WAR' },
    h('span', { class: 'lw-logo-word lw-logo-line', 'aria-hidden': 'true' }, 'LINE'),
    svg(lanternIcon('lw-logo-lantern-svg'), 'lw-logo-lantern'),
    h('span', { class: 'lw-logo-word lw-logo-war', 'aria-hidden': 'true' }, 'WAR'),
  );
}

export function titleScreen(
  settings: Settings,
  actions: { play(): void; howTo(): void; settings(): void; pickLevel(id: string): void; charms?(): void },
  charms?: { unlocked: number; total: number; display: string | null },
): HTMLElement {
  const conflicts = findKeyConflicts(settings.slots).size;
  return h(
    'div',
    { class: 'lw-panel lw-title' },
    logo(),
    h('p', { class: 'lw-tagline' }, 'Two crews. One market. Every plate is a fight.'),
    lineup(settings),
    levelPicker(settings.level, actions.pickLevel),
    h('p', { class: 'lw-level-blurb lw-center' }, levelById(settings.level).blurb),
    h('p', { class: 'lw-muted lw-center' }, rulesSentence(settings.match)),
    conflicts ? h('p', { class: 'lw-warning lw-center', role: 'alert' }, 'Some keys are bound twice. Open Settings, then Controls, to fix them.') : null,
    menu([
      { label: 'Play', onSelect: actions.play, primary: true },
      { label: 'How to play', onSelect: actions.howTo },
      ...(actions.charms && charms
        ? [{ label: 'Charms', onSelect: actions.charms, badge: `${charms.unlocked} / ${charms.total}`, icon: charmIcon(charms.display ?? 'night-lantern', { plain: true, silhouette: !charms.display && charms.unlocked === 0 }) }]
        : []),
      { label: 'Settings', onSelect: actions.settings },
    ]),
    h('p', { class: 'lw-hint' }, 'Move with the arrows or D-pad, choose with Enter or A, and go back with Esc or B.'),
  );
}

export function pauseScreen(actions: { resume(): void; restart(): void; settings(): void; quit(): void }): HTMLElement {
  return h(
    'div',
    { class: 'lw-panel lw-pause' },
    svg(lanternIcon('lw-pause-lantern-svg'), 'lw-pause-lantern'),
    h('h2', {}, 'Paused'),
    h('p', { class: 'lw-muted lw-center' }, 'The market waits for you.'),
    menu([
      { label: 'Resume', onSelect: actions.resume, primary: true },
      { label: 'Restart', onSelect: actions.restart },
      { label: 'Settings', onSelect: actions.settings },
      { label: 'Quit to title', onSelect: actions.quit },
    ]),
  );
}

/** "New charm!": each charm unlocked for the first time this match pops out of a burst of lantern rays. */
export function charmReveal(ids: readonly string[]): HTMLElement | null {
  if (!ids.length) return null;
  return h(
    'section',
    { class: `lw-reveal${ids.length > 2 ? ' lw-reveal--many' : ''}`, 'aria-label': ids.length > 1 ? 'New charms' : 'New charm' },
    h('p', { class: 'lw-reveal-eyebrow' }, ids.length > 1 ? `${ids.length} new charms!` : 'New charm!'),
    h(
      'div',
      { class: 'lw-reveal-row' },
      ids.map((id, i) => {
        const c = charmById(id);
        return h(
          'div',
          { class: `lw-reveal-card${c?.rare ? ' lw-rare' : ''}`, style: `--i:${i}`, 'data-charm': id },
          h('span', { class: 'lw-reveal-rays', 'aria-hidden': 'true' }),
          svg(charmIcon(id, { label: c?.name ?? id }), 'lw-reveal-art'),
          h('b', { class: 'lw-reveal-name' }, c?.name ?? id),
          c?.rare ? h('span', { class: 'lw-reveal-rare' }, 'Rare') : null,
        );
      }),
    ),
    h('p', { class: 'lw-reveal-note' }, 'Added to your charm shelf.'),
  );
}

export function matchOverScreen(
  result: { winner: TeamId | null; roundsWon: [number, number] },
  actions: { again(): void; title(): void; shelf?(): void },
  newCharms: readonly string[] = [],
): HTMLElement {
  const w = result.winner;
  const crew = (team: TeamId) =>
    h(
      'div',
      { class: `lw-over-crew ${team === 0 ? 'lw-crew-a' : 'lw-crew-b'}${w === team ? ' lw-won' : ''}` },
      svg(crewMark(team), 'lw-over-mark'),
      h('span', { class: 'lw-over-name' }, TEAMS[team].name),
      h('span', { class: `lw-over-rounds ${team === 0 ? 'lw-a' : 'lw-b'}` }, String(result.roundsWon[team])),
    );
  return h(
    'div',
    { class: `lw-panel lw-over${w === null ? '' : ` lw-crew-${w === 0 ? 'a' : 'b'}`}` },
    h('p', { class: 'lw-eyebrow' }, 'Match over'),
    h('h2', { class: 'lw-winner' }, w === null ? 'A draw!' : `${TEAMS[w].name} wins`),
    h('div', { class: 'lw-score', 'aria-label': `Rounds won: ${TEAMS[0].name} ${result.roundsWon[0]}, ${TEAMS[1].name} ${result.roundsWon[1]}` }, crew(0), h('span', { class: 'lw-vs' }, 'rounds'), crew(1)),
    charmReveal(newCharms),
    menu([
      { label: 'Play again', onSelect: actions.again, primary: true },
      ...(newCharms.length && actions.shelf ? [{ label: 'Charm shelf', onSelect: actions.shelf }] : []),
      { label: 'Title', onSelect: actions.title },
    ]),
  );
}
