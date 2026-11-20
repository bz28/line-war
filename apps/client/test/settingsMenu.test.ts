// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cloneSettings } from '../src/settings/store';
import { DEFAULT_SETTINGS, P1_KEYS, P2_KEYS, type Settings } from '../src/settings/types';
import { SettingsMenu } from '../src/ui/settingsMenu';
import { fakePad } from './fakePad';

let menu: SettingsMenu | null = null;
afterEach(() => {
  menu?.dispose();
  menu = null;
  document.body.replaceChildren();
});

function mount(settings: Settings = cloneSettings(DEFAULT_SETTINGS), pads: (Gamepad | null)[] = []) {
  const onChange = vi.fn<(s: Settings) => void>();
  const onClose = vi.fn();
  menu = new SettingsMenu({ settings, onChange, onClose, getGamepads: () => pads });
  document.body.append(menu.el);
  const last = () => onChange.mock.calls.at(-1)![0];
  return { menu, onChange, onClose, last, q: <T extends HTMLElement>(key: string) => menu!.el.querySelector<T>(`[data-key="${key}"]`)! };
}

const press = (code: string) => window.dispatchEvent(Object.assign(new KeyboardEvent('keydown', { code, bubbles: true, cancelable: true })));
const choose = (el: HTMLSelectElement, value: string) => {
  el.value = value;
  el.dispatchEvent(new Event('change'));
};

describe('SettingsMenu', () => {
  it('changes match rules', () => {
    const { menu, last, q } = mount();
    menu.show('match');
    const round = q<HTMLInputElement>('roundSeconds');
    round.value = '120';
    round.dispatchEvent(new Event('input'));
    expect(last().match.roundSeconds).toBe(120);
    expect(round.parentElement!.querySelector('output')!.textContent).toBe('2:00');

    choose(q<HTMLSelectElement>('bestOf'), '5');
    expect(last().match.bestOf).toBe(5);

    q<HTMLInputElement>('brunchSpeed').click();
    expect(last().match.brunchSpeed).toBe(true);
    expect(last().match.roundSeconds).toBe(120);
  });

  it('switches a slot between controller kinds', () => {
    const pads = [null, fakePad({ id: 'Xbox Wireless Controller' })];
    const { last, q, menu } = mount(undefined, pads);
    choose(q<HTMLSelectElement>('slot-1-kind'), 'gamepad');
    expect(last().slots[1]).toEqual({ kind: 'gamepad', index: 0 });
    expect(menu.el.textContent).toContain('Pad 2 · Xbox Wireless Controller');
    choose(q<HTMLSelectElement>('slot-1-pad'), '1');
    expect(last().slots[1]).toEqual({ kind: 'gamepad', index: 1 });

    // P1 already uses the WASD preset, so a new keyboard slot gets the arrows preset.
    choose(q<HTMLSelectElement>('slot-2-kind'), 'keyboard');
    expect(last().slots[2]).toEqual({ kind: 'keyboard', bindings: P2_KEYS });

    choose(q<HTMLSelectElement>('slot-3-kind'), 'bot');
    choose(q<HTMLSelectElement>('slot-3-bot'), 'hard');
    expect(last().slots[3]).toEqual({ kind: 'bot', difficulty: 'hard' });

    choose(q<HTMLSelectElement>('slot-3-kind'), 'none');
    expect(last().slots[3]).toEqual({ kind: 'none' });
  });

  it('rebinds a key by clicking it and pressing a key', () => {
    const { menu, last, q } = mount();
    menu.show('controls');
    q<HTMLButtonElement>('bind-0-grab').click();
    expect(menu.isRebinding).toBe(true);
    expect(q('bind-0-grab').textContent).toContain('Press a key');
    press('KeyF');
    expect(menu.isRebinding).toBe(false);
    expect(last().slots[0]).toEqual({ kind: 'keyboard', bindings: { ...P1_KEYS, grab: 'KeyF' } });
    expect(q('bind-0-grab').textContent).toBe('F');
  });

  it('Esc cancels a rebind without closing the menu', () => {
    const { menu, onChange, onClose, q } = mount();
    menu.show('controls');
    q<HTMLButtonElement>('bind-0-up').click();
    press('Escape');
    expect(menu.isRebinding).toBe(false);
    expect(onChange).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(q('bind-0-up').textContent).toBe('W');
  });

  it('flags conflicting bindings between keyboard slots', () => {
    const s = cloneSettings(DEFAULT_SETTINGS);
    s.slots[1] = { kind: 'keyboard', bindings: { ...P2_KEYS } };
    const { menu, q } = mount(s);
    menu.show('controls');
    expect(menu.el.querySelector('.lw-warning')).toBeNull();
    q<HTMLButtonElement>('bind-1-dash').click();
    press('Space');
    expect(q('bind-1-dash').classList.contains('lw-conflict')).toBe(true);
    expect(q('bind-0-grab').classList.contains('lw-conflict')).toBe(true);
    expect(menu.el.querySelector('.lw-warning')!.textContent).toContain('Space: P1 Grab / drop, P2 Dash');

    q<HTMLButtonElement>('reset-1').click();
    expect(menu.el.querySelector('.lw-warning')).toBeNull();
  });

  it('updates audio and display without re-rendering the control', () => {
    const { menu, last, q } = mount();
    menu.show('audio');
    const music = q<HTMLInputElement>('music');
    music.value = '0.3';
    music.dispatchEvent(new Event('input'));
    expect(last().audio.music).toBeCloseTo(0.3);
    expect(q('music')).toBe(music);

    menu.show('display');
    q<HTMLInputElement>('showFps').click();
    expect(last().display.showFps).toBe(true);
  });

  it('closes via Back', () => {
    const { onClose, q } = mount();
    q<HTMLButtonElement>('back').click();
    expect(onClose).toHaveBeenCalledOnce();
  });
});
