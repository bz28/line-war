// @vitest-environment jsdom
import type { MatchState } from '@line-war/sim';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AudioDirector } from '../../src/audio';
import { AudioUnlock } from '../../src/audio/unlock';
import { changedSlots } from '../../src/settings/store';
import { DEFAULT_SETTINGS, P2_KEYS, type Settings } from '../../src/settings/types';
import { App, RESULT_GUARD_MS, type MatchSession, type StartSession } from '../../src/ui/app';
import { MenuNav } from '../../src/ui/nav';
import { PAD } from '../../src/input/gamepad';
import { fakeAudioContext } from '../audio/fakeAudio';
import { fakePad } from '../fakePad';

let app: App | null = null;
afterEach(() => {
  app?.dispose();
  app = null;
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

function setup(startSession?: StartSession) {
  vi.stubGlobal('requestAnimationFrame', () => 0);
  vi.stubGlobal('cancelAnimationFrame', () => {});
  let t = 1000;
  const over: (() => void)[] = [];
  const started: number[] = [];
  const root = document.createElement('div');
  document.body.append(root);
  app = new App({
    root,
    storage: null,
    getGamepads: () => [],
    now: () => t,
    startSession:
      startSession ??
      ((_s, _h, hooks): MatchSession => {
        started.push(t);
        over.push(hooks.onMatchOver);
        return {
          state: { winner: 0, teams: [{ roundsWon: 1 }, { roundsWon: 0 }], totalScores: [300, 200] } as unknown as MatchState,
          setPaused: () => {},
          applySettings: () => {},
          dispose: () => {},
        };
      }),
  });
  const button = (label: string) => [...root.querySelectorAll('button')].find((b) => b.textContent === label)!;
  return { root, app, over, started, button, advance: (ms: number) => (t += ms) };
}

describe('audit 1: the result screen ignores presses at the buzzer', () => {
  it('a tap on the focused Play again within the guard does not restart; after it, it does', () => {
    const { app, over, started, button, advance } = setup();
    button('Play').click();
    over[0]!();
    expect(app.currentScreen).toBe('over');
    expect(document.activeElement?.textContent).toBe('Play again');
    button('Play again').click(); // grab held / tapped through the stamp (Enter, Space, pad A)
    expect(app.currentScreen).toBe('over');
    expect(started).toHaveLength(1);
    advance(RESULT_GUARD_MS + 1);
    button('Play again').click();
    expect(app.currentScreen).toBe('playing');
    expect(started).toHaveLength(2);
  });

  it('a pad A held from the match must be released before it counts again', () => {
    let pads: Gamepad[] = [fakePad({ pressed: [PAD.A] })];
    const root = document.createElement('div');
    root.innerHTML = '<button>Play again</button>';
    document.body.append(root);
    let clicks = 0;
    root.querySelector('button')!.addEventListener('click', () => clicks++);
    root.querySelector('button')!.focus();
    const nav = new MenuNav({ getRoot: () => root, onBack: () => {}, onStart: () => {} }, () => pads);
    nav.poll(0); // held from the match
    nav.rebaseline(); // the result screen opens
    nav.poll(16);
    expect(clicks).toBe(0); // still held: not a press
    pads = [fakePad()];
    nav.poll(32);
    pads = [fakePad({ pressed: [PAD.A] })];
    nav.poll(48);
    expect(clicks).toBe(1); // a fresh press after release counts
    nav.dispose();
  });
});

describe('audit 2: audio wakes for every player, including gamepad-only', () => {
  function suspended() {
    const listeners = new Map<string, () => void>();
    const ctx = {
      state: 'suspended' as AudioContextState | 'interrupted',
      resume: vi.fn(() => {
        ctx.state = 'running';
        listeners.get('statechange')?.();
        return Promise.resolve();
      }),
      addEventListener: (k: string, f: () => void) => listeners.set(k, f),
      removeEventListener: () => {},
    };
    return ctx;
  }

  it('one shared context; any key, pointer or pad wakes it, every time it is not running', () => {
    const ctx = suspended();
    const win = new EventTarget() as unknown as Window;
    const create = vi.fn(() => ctx as unknown as AudioContext);
    const u = new AudioUnlock(create, win, document);
    expect(u.hint?.hidden).toBe(false);
    expect(u.hint?.textContent).toBe('Press any key for sound');
    win.dispatchEvent(new Event('keydown'));
    expect(ctx.resume).toHaveBeenCalledTimes(1);
    expect(u.hint?.hidden).toBe(true);
    ctx.state = 'interrupted'; // a phone call
    win.dispatchEvent(new Event('gamepadconnected'));
    expect(ctx.resume).toHaveBeenCalledTimes(2);
    u.context();
    expect(create).toHaveBeenCalledTimes(1);
    u.dispose();
  });

  it('menus report pad presses (the app passes them on to wake audio)', () => {
    let pads: Gamepad[] = [fakePad()];
    let presses = 0;
    const nav = new MenuNav({ getRoot: () => null, onBack: () => {}, onStart: () => {}, onPadButton: () => presses++ }, () => pads);
    nav.poll(0);
    pads = [fakePad({ pressed: [PAD.A] })];
    nav.poll(16);
    nav.poll(32);
    expect(presses).toBe(1);
    nav.dispose();
  });

  it('a match on the shared context unplugs its graph at the end instead of closing it', () => {
    const fake = fakeAudioContext();
    const close = vi.spyOn(fake.raw, 'close');
    const d = new AudioDirector({ createContext: () => fake.ctx, realtime: false, ownsContext: false });
    d.resume();
    d.dispose();
    expect(close).not.toHaveBeenCalled();
  });
});

describe('audit 3: interrupted audio comes back', () => {
  it('unpausing resumes a context in any state but running or closed', () => {
    const fake = fakeAudioContext();
    const resume = vi.spyOn(fake.raw, 'resume');
    const d = new AudioDirector({ createContext: () => fake.ctx, realtime: false });
    d.resume();
    resume.mockClear();
    (fake.raw as { state: string }).state = 'interrupted';
    d.setPaused(true);
    expect(resume).not.toHaveBeenCalled();
    d.setPaused(false);
    expect(resume).toHaveBeenCalledTimes(1);
    (fake.raw as { state: string }).state = 'closed';
    d.setPaused(false);
    expect(resume).toHaveBeenCalledTimes(1);
  });

  it('the tab becoming visible again wakes the shared context', () => {
    const ctx = { state: 'interrupted', resume: vi.fn(() => Promise.resolve()) };
    const u = new AudioUnlock(() => ctx as unknown as AudioContext, new EventTarget() as unknown as Window, document);
    document.dispatchEvent(new Event('visibilitychange')); // jsdom reports 'visible'
    expect(ctx.resume).toHaveBeenCalledTimes(1);
    u.dispose();
  });
});

describe('audit 4: holding Esc does not flutter pause', () => {
  it('auto-repeated Escape and Enter are ignored', () => {
    let back = 0;
    let start = 0;
    const nav = new MenuNav({ getRoot: () => null, onBack: () => back++, onStart: () => start++ }, () => []);
    const key = (code: string, repeat: boolean) => window.dispatchEvent(new KeyboardEvent('keydown', { code, repeat, bubbles: true, cancelable: true }));
    key('Escape', false);
    for (let i = 0; i < 5; i++) key('Escape', true);
    expect(start).toBe(1);
    const enter = new KeyboardEvent('keydown', { code: 'Enter', repeat: true, cancelable: true });
    const nav2 = new MenuNav({ getRoot: () => document.body, onBack: () => back++, onStart: () => {} }, () => []);
    window.dispatchEvent(enter);
    expect(enter.defaultPrevented).toBe(true);
    expect(back).toBe(0);
    nav.dispose();
    nav2.dispose();
  });
});

describe('audit 5: a settings change only rebuilds the slots it touched', () => {
  it('volume or display changes rebuild nothing; a slot change rebuilds that slot', () => {
    const a = DEFAULT_SETTINGS;
    const vol: Settings = { ...a, audio: { ...a.audio, music: 0.2 }, display: { ...a.display, showFps: true } };
    expect(changedSlots(a.slots, vol.slots)).toEqual([]);
    const slots = [...a.slots] as Settings['slots'];
    slots[3] = { kind: 'bot', difficulty: 'hard' };
    slots[1] = { kind: 'keyboard', bindings: P2_KEYS };
    expect(changedSlots(a.slots, slots)).toEqual([1, 3]);
  });
});

describe('audit 6: a match that fails to start returns to the title', () => {
  it('shows a short error and stays navigable', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { app, root, button } = setup(() => {
      throw new Error('boom');
    });
    button('Play').click();
    expect(app.currentScreen).toBe('title');
    expect(root.querySelector('[data-error]')?.textContent).toContain('could not start');
    expect(root.querySelector('.lw-overlay')?.hasAttribute('hidden')).toBe(false);
    err.mockRestore();
  });
});

describe('audit 1b: a key pressed inside the guard does not click when released after it', () => {
  it('swallows the release click of a Space held across the guard', () => {
    const { app, over, started, button, advance } = setup();
    button('Play').click();
    over[0]!();
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', cancelable: true }));
    advance(RESULT_GUARD_MS + 300);
    const up = new KeyboardEvent('keyup', { code: 'Space', cancelable: true });
    window.dispatchEvent(up);
    expect(up.defaultPrevented).toBe(true);
    expect(app.currentScreen).toBe('over');
    expect(started).toHaveLength(1);
    button('Play again').click();
    expect(app.currentScreen).toBe('playing');
  });
});
