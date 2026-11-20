import type { TeamId } from '@line-war/sim';
import { findKeyConflicts, layoutOf } from '../settings/store';
import type { Settings, SlotController } from '../settings/types';
import { button, h } from './dom';
import { slotName } from './settingsMenu';

export interface MenuItem {
  label: string;
  onSelect(): void;
  primary?: boolean;
}

function menu(items: MenuItem[]): HTMLElement {
  return h(
    'div',
    { class: 'lw-menu' },
    items.map((it) => button(it.label, it.onSelect, { class: `lw-btn${it.primary ? ' lw-btn-primary' : ''}`, 'data-key': `menu-${it.label}` })),
  );
}

function slotSummary(slot: SlotController): string {
  switch (slot.kind) {
    case 'keyboard': {
      const l = layoutOf(slot.bindings);
      return l === 'p1' ? 'Keys · WASD' : l === 'p2' ? 'Keys · Arrows' : 'Keys · custom';
    }
    case 'gamepad':
      return `Pad ${slot.index + 1}`;
    case 'bot':
      return `Bot · ${slot.difficulty}`;
    case 'none':
      return 'Empty';
  }
}

function lineup(settings: Settings): HTMLElement {
  const crew = (label: string, ids: number[], cls: string) =>
    h(
      'div',
      { class: `lw-lineup-crew ${cls}` },
      h('h3', {}, label),
      ids.map((i) => h('div', { class: 'lw-lineup-slot' }, h('b', {}, slotName(i)), ' ', slotSummary(settings.slots[i]!))),
    );
  return h(
    'div',
    { class: 'lw-lineup' },
    crew('Crew A', [0, 1], 'lw-crew-a'),
    h('span', { class: 'lw-vs' }, 'vs'),
    crew('Crew B', [2, 3], 'lw-crew-b'),
  );
}

export function titleScreen(settings: Settings, actions: { play(): void; settings(): void }): HTMLElement {
  const m = settings.match;
  const rules = [
    `${Math.floor(m.roundSeconds / 60)}:${String(m.roundSeconds % 60).padStart(2, '0')} rounds`,
    m.bestOf === 1 ? 'single round' : `best of ${m.bestOf}`,
    m.rushEnabled ? 'Dinner Rush' : null,
    m.criticEnabled ? 'Critic' : null,
    m.brunchSpeed ? 'Brunch Speed' : null,
  ].filter(Boolean);
  const conflicts = findKeyConflicts(settings.slots).size;
  return h(
    'div',
    { class: 'lw-panel lw-title' },
    h('h1', { class: 'lw-logo' }, 'LINE', h('span', {}, 'WAR')),
    h('p', { class: 'lw-tagline' }, 'Two crews. One market. Every plate is a fight.'),
    lineup(settings),
    h('p', { class: 'lw-muted lw-center' }, rules.join(' · ')),
    conflicts ? h('p', { class: 'lw-warning lw-center', role: 'alert' }, 'Some keys are bound twice. Check Settings → Controls.') : null,
    menu([
      { label: 'Play', onSelect: actions.play, primary: true },
      { label: 'Settings', onSelect: actions.settings },
    ]),
    h('p', { class: 'lw-hint' }, 'Arrows / D-pad to move · Enter / A to choose · Esc / B back'),
  );
}

export function pauseScreen(actions: { resume(): void; restart(): void; settings(): void; quit(): void }): HTMLElement {
  return h(
    'div',
    { class: 'lw-panel lw-pause' },
    h('h2', {}, 'Paused'),
    menu([
      { label: 'Resume', onSelect: actions.resume, primary: true },
      { label: 'Restart', onSelect: actions.restart },
      { label: 'Settings', onSelect: actions.settings },
      { label: 'Quit to title', onSelect: actions.quit },
    ]),
  );
}

export function matchOverScreen(
  result: { winner: TeamId | null; roundsWon: [number, number] },
  actions: { again(): void; title(): void },
): HTMLElement {
  const crew = result.winner === 0 ? 'Crew A' : result.winner === 1 ? 'Crew B' : null;
  return h(
    'div',
    { class: `lw-panel lw-over${result.winner === null ? '' : ` lw-crew-${result.winner === 0 ? 'a' : 'b'}`}` },
    h('p', { class: 'lw-eyebrow' }, 'Match over'),
    h('h2', { class: 'lw-winner' }, crew ? `${crew} wins` : 'Draw'),
    h(
      'p',
      { class: 'lw-score' },
      h('span', { class: 'lw-a' }, String(result.roundsWon[0])),
      ' – ',
      h('span', { class: 'lw-b' }, String(result.roundsWon[1])),
      h('small', {}, ' rounds'),
    ),
    menu([
      { label: 'Play again', onSelect: actions.again, primary: true },
      { label: 'Title', onSelect: actions.title },
    ]),
  );
}
