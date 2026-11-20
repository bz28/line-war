import { browserGamepads, listGamepads, type GetGamepads } from '../input/gamepad';
import {
  BOT_DIFFICULTIES,
  cloneSettings,
  findKeyConflicts,
  isConflicted,
  isValidKeyCode,
  layoutOf,
  LIMITS,
  RESERVED_KEYS,
} from '../settings/store';
import {
  ACTIONS,
  P1_KEYS,
  P2_KEYS,
  type Action,
  type BotDifficulty,
  type KeyBindings,
  type Settings,
  type SlotController,
} from '../settings/types';
import { TEAMS } from '../art/tokens';
import { button, h, select, slider, toggle } from './dom';
import { keyLabel } from './keyNames';

export interface SettingsMenuOptions {
  settings: Settings;
  /** Called after every edit with a fresh copy of the full settings. */
  onChange(settings: Settings): void;
  onClose(): void;
  getGamepads?: GetGamepads;
  /** Where rebinding listens for the key press. Defaults to window. */
  keyTarget?: EventTarget;
  /** Shown under the title, e.g. "Player and rule changes apply on restart". */
  note?: string;
}

type Section = 'players' | 'controls' | 'match' | 'audio' | 'display';
const SECTIONS: { id: Section; label: string }[] = [
  { id: 'players', label: 'Players' },
  { id: 'controls', label: 'Controls' },
  { id: 'match', label: 'Match rules' },
  { id: 'audio', label: 'Audio' },
  { id: 'display', label: 'Display' },
];

type Kind = SlotController['kind'];
const KIND_OPTIONS: { value: Kind; label: string }[] = [
  { value: 'keyboard', label: 'Keyboard' },
  { value: 'gamepad', label: 'Gamepad' },
  { value: 'bot', label: 'Bot' },
  { value: 'none', label: 'Empty' },
];
const ACTION_LABELS: Record<Action, string> = {
  up: 'Move up', down: 'Move down', left: 'Move left', right: 'Move right',
  grab: 'Grab / drop', work: 'Work (hold)', dash: 'Dash', throw: 'Throw',
};
const DIFFICULTY_LABELS: Record<BotDifficulty, string> = { easy: 'Easy', normal: 'Normal', hard: 'Hard' };

/** Under the volume sliders: what the levels do (sound is live; changes apply at once). */
export const AUDIO_NOTE = 'Changes apply right away. Music sits under the effects, so serves, knocks and charms always cut through.';

export const slotName = (i: number) => `P${i + 1}`;
export const crewName = (i: number) => TEAMS[i < 2 ? 0 : 1].name;
const actionName = (a: Action) => ACTION_LABELS[a];
const pct = (v: number) => `${Math.round(v * 100)}%`;
const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/** Default bindings for a slot switching to keyboard: the first preset no other keyboard slot uses. */
function freeLayout(slots: readonly SlotController[], self: number): KeyBindings {
  const used = new Set(slots.map((s, i) => (i !== self && s.kind === 'keyboard' ? layoutOf(s.bindings) : null)));
  return { ...(used.has('p1') && !used.has('p2') ? P2_KEYS : P1_KEYS) };
}
function freePad(slots: readonly SlotController[], self: number): number {
  const used = new Set(slots.map((s, i) => (i !== self && s.kind === 'gamepad' ? s.index : -1)));
  for (let i = LIMITS.gamepadIndex.min; i <= LIMITS.gamepadIndex.max; i++) if (!used.has(i)) return i;
  return 0;
}

/**
 * The settings overlay. Works on its own copy of the settings and reports every edit via
 * onChange. Re-renders the active section after each edit and restores focus by `data-key`,
 * so keyboard and gamepad navigation are not lost.
 */
export class SettingsMenu {
  readonly el: HTMLElement;
  private s: Settings;
  private section: Section = 'players';
  private body: HTMLElement;
  private tabs: HTMLElement;
  private rebinding: { slot: number; action: Action } | null = null;
  private getGamepads: GetGamepads;
  private keyTarget: EventTarget;

  constructor(private opts: SettingsMenuOptions) {
    this.s = cloneSettings(opts.settings);
    this.getGamepads = opts.getGamepads ?? browserGamepads;
    this.keyTarget = opts.keyTarget ?? window;
    this.tabs = h('nav', { class: 'lw-tabs', role: 'tablist' });
    this.body = h('div', { class: 'lw-section' });
    this.el = h(
      'div',
      { class: 'lw-panel lw-settings', role: 'dialog', 'aria-label': 'Settings' },
      h('header', { class: 'lw-panel-head' }, h('h2', {}, 'Settings'), opts.note ? h('p', { class: 'lw-note' }, opts.note) : null),
      h('div', { class: 'lw-settings-grid' }, this.tabs, this.body),
      h('footer', { class: 'lw-panel-foot' }, button('Back', () => this.opts.onClose(), { 'data-key': 'back', class: 'lw-btn lw-btn-primary' })),
    );
    this.keyTarget.addEventListener('keydown', this.onRebindKey, { capture: true });
    this.render();
  }

  get settings(): Settings {
    return cloneSettings(this.s);
  }

  get isRebinding(): boolean {
    return this.rebinding !== null;
  }

  /** Esc / B: cancel a pending rebind if there is one, otherwise close. */
  back(): void {
    if (this.rebinding) {
      this.rebinding = null;
      this.render();
    } else this.opts.onClose();
  }

  /** Re-render (e.g. after a gamepad connects) without losing focus. */
  refresh(): void {
    if (!this.rebinding) this.render();
  }

  dispose(): void {
    this.keyTarget.removeEventListener('keydown', this.onRebindKey, { capture: true });
  }

  /** Jump to a section; used by tests and could be used by deep links. */
  show(section: Section): void {
    this.section = section;
    this.rebinding = null;
    this.render();
  }

  // ---------- editing ----------

  /** Apply an edit and report it. Sliders and toggles pass rerender=false so a drag is not interrupted. */
  private update(mutate: (s: Settings) => void, rerender = true): void {
    mutate(this.s);
    this.opts.onChange(cloneSettings(this.s));
    if (rerender) this.render();
  }

  /** Edit that leaves the DOM as is (the control already shows the new value). */
  private set(mutate: (s: Settings) => void): void {
    this.update(mutate, false);
  }

  private setSlot(i: number, slot: SlotController): void {
    this.update((s) => {
      s.slots[i] = slot;
    });
  }

  private onRebindKey = (ev: Event): void => {
    if (!this.rebinding) return;
    const e = ev as KeyboardEvent;
    e.preventDefault();
    e.stopImmediatePropagation();
    const { slot, action } = this.rebinding;
    this.rebinding = null;
    const target = this.s.slots[slot];
    if (e.code !== 'Escape' && isValidKeyCode(e.code) && target?.kind === 'keyboard') {
      this.update(() => {
        target.bindings[action] = e.code;
      });
    } else this.render();
  };

  // ---------- rendering ----------

  private render(): void {
    const focusKey = (document.activeElement as HTMLElement | null)?.dataset?.key;
    this.tabs.replaceChildren(
      ...SECTIONS.map((sec) =>
        button(sec.label, () => this.show(sec.id), {
          role: 'tab',
          class: 'lw-tab',
          'aria-selected': sec.id === this.section ? 'true' : 'false',
          'data-key': `tab-${sec.id}`,
        }),
      ),
    );
    const content =
      this.section === 'players'
        ? this.renderPlayers()
        : this.section === 'controls'
          ? this.renderControls()
          : this.section === 'match'
            ? this.renderMatch()
            : this.section === 'audio'
              ? this.renderAudio()
              : this.renderDisplay();
    this.body.replaceChildren(...content);
    if (focusKey) {
      const el = [...this.el.querySelectorAll<HTMLElement>('[data-key]')].find((n) => n.dataset.key === focusKey);
      el?.focus();
    }
  }

  private renderPlayers(): Node[] {
    const pads = listGamepads(this.getGamepads);
    const padName = (i: number) => pads.find((p) => p.index === i)?.id;
    const row = (i: number) => {
      const slot = this.s.slots[i]!;
      const kind = select(KIND_OPTIONS, slot.kind, (k) => this.setSlot(i, this.defaultSlot(k, i)), {
        'data-key': `slot-${i}-kind`,
        'aria-label': `${slotName(i)} controller`,
      });
      let detail: Node;
      switch (slot.kind) {
        case 'keyboard': {
          const layout = layoutOf(slot.bindings);
          detail = select(
            [
              { value: 'p1', label: 'P1 keys (WASD)' },
              { value: 'p2', label: 'P2 keys (Arrows)' },
              { value: 'custom', label: 'Custom', disabled: layout !== 'custom' },
            ],
            layout,
            (v) => {
              if (v === 'custom') return;
              this.setSlot(i, { kind: 'keyboard', bindings: { ...(v === 'p1' ? P1_KEYS : P2_KEYS) } });
            },
            { 'data-key': `slot-${i}-layout`, 'aria-label': `${slotName(i)} key layout` },
          );
          break;
        }
        case 'gamepad': {
          const opts = [0, 1, 2, 3].map((n) => ({
            value: String(n),
            label: `Pad ${n + 1}${padName(n) ? `: ${shortPadName(padName(n)!)}` : ' (not connected)'}`,
          }));
          detail = select(opts, String(slot.index), (v) => this.setSlot(i, { kind: 'gamepad', index: Number(v) }), {
            'data-key': `slot-${i}-pad`,
            'aria-label': `${slotName(i)} gamepad`,
          });
          break;
        }
        case 'bot':
          detail = select(
            BOT_DIFFICULTIES.map((d) => ({ value: d, label: DIFFICULTY_LABELS[d] })),
            slot.difficulty,
            (d) => this.setSlot(i, { kind: 'bot', difficulty: d }),
            { 'data-key': `slot-${i}-bot`, 'aria-label': `${slotName(i)} bot difficulty` },
          );
          break;
        case 'none':
          detail = h('span', { class: 'lw-muted' }, 'Stands idle');
          break;
      }
      return h(
        'div',
        { class: `lw-slot lw-crew-${i < 2 ? 'a' : 'b'}` },
        h('span', { class: 'lw-slot-name' }, slotName(i)),
        kind,
        detail,
      );
    };
    const crew = (label: string, ids: number[], cls: string) =>
      h('fieldset', { class: `lw-crew ${cls}` }, h('legend', {}, label), ids.map(row));
    const padSummary = pads.length
      ? `Connected gamepads: ${pads.map((p) => `Pad ${p.index + 1}`).join(', ')}`
      : 'No gamepads detected. Press a button on a pad to wake it up.';
    return [
      crew(TEAMS[0].name, [0, 1], 'lw-crew-a'),
      crew(TEAMS[1].name, [2, 3], 'lw-crew-b'),
      h('p', { class: 'lw-muted' }, padSummary),
    ];
  }

  private defaultSlot(kind: Kind, i: number): SlotController {
    const current = this.s.slots[i]!;
    if (current.kind === kind) return current;
    switch (kind) {
      case 'keyboard':
        return { kind, bindings: freeLayout(this.s.slots, i) };
      case 'gamepad':
        return { kind, index: freePad(this.s.slots, i) };
      case 'bot':
        return { kind, difficulty: 'normal' };
      case 'none':
        return { kind };
    }
  }

  private renderControls(): Node[] {
    const conflicts = findKeyConflicts(this.s.slots);
    const keyboardSlots = this.s.slots.flatMap((s, i) => (s.kind === 'keyboard' ? [{ i, bindings: s.bindings }] : []));
    const out: Node[] = [];
    if (conflicts.size) {
      const lines = [...conflicts].map(
        ([code, refs]) => `${keyLabel(code)}: ${refs.map((r) => `${slotName(r.slot)} ${actionName(r.action)}`).join(', ')}`,
      );
      out.push(
        h('div', { class: 'lw-warning', role: 'alert' }, h('strong', {}, 'Conflicting keys'), h('ul', {}, lines.map((l) => h('li', {}, l)))),
      );
    }
    if (!keyboardSlots.length) out.push(h('p', { class: 'lw-muted' }, 'No player uses the keyboard. Set one up under Players.'));
    for (const { i, bindings } of keyboardSlots) {
      const rows = ACTIONS.map((a) => {
        const waiting = this.rebinding?.slot === i && this.rebinding.action === a;
        const bad = isConflicted(conflicts, i, a);
        const btn = button(waiting ? 'Press a key… (Esc cancels)' : keyLabel(bindings[a]), () => this.startRebind(i, a), {
          class: `lw-key${waiting ? ' lw-waiting' : ''}${bad ? ' lw-conflict' : ''}`,
          'data-key': `bind-${i}-${a}`,
          'aria-label': `${slotName(i)} ${actionName(a)}: ${keyLabel(bindings[a])}${bad ? ' (conflict)' : ''}`,
        });
        return h('div', { class: 'lw-row' }, h('span', {}, actionName(a)), btn);
      });
      out.push(
        h(
          'fieldset',
          { class: `lw-bindings lw-crew-${i < 2 ? 'a' : 'b'}` },
          h('legend', {}, `${slotName(i)} keyboard, ${crewName(i)}`),
          rows,
          h(
            'div',
            { class: 'lw-row lw-row-end' },
            button(
              'Reset to defaults',
              () => this.setSlot(i, { kind: 'keyboard', bindings: { ...(i === 0 ? P1_KEYS : P2_KEYS) } }),
              { class: 'lw-btn lw-btn-small', 'data-key': `reset-${i}` },
            ),
          ),
        ),
      );
    }
    out.push(
      h(
        'p',
        { class: 'lw-muted' },
        `On a gamepad, move with the stick or D-pad, A grabs, X works (hold), B dashes, Y throws and Start pauses. ${RESERVED_KEYS.map(keyLabel).join(', ')} is reserved for pause.`,
      ),
    );
    return out;
  }

  private startRebind(slot: number, action: Action): void {
    this.rebinding = { slot, action };
    this.render();
  }

  private renderMatch(): Node[] {
    const m = this.s.match;
    return [
      slider('Round length', m.roundSeconds, LIMITS.roundSeconds, clock, (v) => this.set((s) => void (s.match.roundSeconds = v)), 'roundSeconds'),
      slider('Prep time', m.prepSeconds, LIMITS.prepSeconds, (v) => `${v} s`, (v) => this.set((s) => void (s.match.prepSeconds = v)), 'prepSeconds'),
      h(
        'label',
        { class: 'lw-row' },
        h('span', {}, 'Match length'),
        select(
          LIMITS.bestOf.map((n) => ({ value: String(n), label: n === 1 ? 'Single round' : `Best of ${n}` })),
          String(m.bestOf),
          (v) => this.set((s) => void (s.match.bestOf = Number(v))),
          { 'data-key': 'bestOf', name: 'bestOf' },
        ),
      ),
      toggle('Dinner Rush', m.rushEnabled, (v) => this.set((s) => void (s.match.rushEnabled = v)), 'rushEnabled'),
      toggle('Critic ticket', m.criticEnabled, (v) => this.set((s) => void (s.match.criticEnabled = v)), 'criticEnabled'),
      toggle('Brunch Speed (slower timers)', m.brunchSpeed, (v) => this.set((s) => void (s.match.brunchSpeed = v)), 'brunchSpeed'),
    ].map(withKey);
  }

  private renderAudio(): Node[] {
    const a = this.s.audio;
    const vol = (label: string, key: keyof Settings['audio']) =>
      slider(label, a[key], LIMITS.volume, pct, (v) => this.set((s) => void (s.audio[key] = v)), key);
    return [vol('Master', 'master'), vol('Music', 'music'), vol('Effects', 'effects'), h('p', { class: 'lw-muted' }, AUDIO_NOTE)].map(withKey);
  }

  private renderDisplay(): Node[] {
    const d = this.s.display;
    const t = (label: string, key: keyof Settings['display']) =>
      toggle(label, d[key], (v) => this.set((s) => void (s.display[key] = v)), key);
    return [t('Screen shake', 'screenShake'), t('Colour-blind shapes', 'colorblindShapes'), t('Show FPS', 'showFps')].map(withKey);
  }
}

/** Give the inner input of a labelled control a stable data-key (its name) so focus survives re-render. */
function withKey(node: Node): Node {
  if (node instanceof HTMLElement) {
    const input = node.querySelector<HTMLElement>('input[name], select[name]');
    const name = input?.getAttribute('name');
    if (input && name && !input.dataset.key) input.dataset.key = name;
  }
  return node;
}

function shortPadName(id: string): string {
  const clean = id.replace(/\(.*?\)/g, '').trim();
  return clean.length > 28 ? `${clean.slice(0, 27)}…` : clean || 'Gamepad';
}
