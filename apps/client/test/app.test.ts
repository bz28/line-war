// @vitest-environment jsdom
import type { MatchState } from '@line-war/sim';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_KEY, type StorageLike } from '../src/settings/store';
import type { Settings } from '../src/settings/types';
import { App, type MatchSession } from '../src/ui/app';

let app: App | null = null;
afterEach(() => {
  app?.dispose();
  app = null;
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

function setup() {
  vi.stubGlobal('requestAnimationFrame', () => 0);
  vi.stubGlobal('cancelAnimationFrame', () => {});
  const store = new Map<string, string>();
  const storage: StorageLike = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => void store.set(k, v) };
  const sessions: { settings: Settings; paused: boolean; disposed: boolean; over: () => void; state: MatchState }[] = [];
  const root = document.createElement('div');
  document.body.append(root);
  app = new App({
    root,
    storage,
    getGamepads: () => [],
    startSession: (settings, _host, hooks): MatchSession => {
      const rec = {
        settings,
        paused: false,
        disposed: false,
        over: hooks.onMatchOver,
        state: { winner: 1, teams: [{ roundsWon: 0 }, { roundsWon: 2 }] } as unknown as MatchState,
      };
      sessions.push(rec);
      return {
        state: rec.state,
        setPaused: (p) => void (rec.paused = p),
        applySettings: (s) => void (rec.settings = s),
        dispose: () => void (rec.disposed = true),
      };
    },
  });
  const click = (label: string) => {
    const btn = [...root.querySelectorAll('button')].find((b) => b.textContent === label);
    if (!btn) throw new Error(`no button "${label}" in: ${root.textContent}`);
    btn.click();
  };
  const esc = () => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', bubbles: true }));
  return { app, root, store, sessions, click, esc };
}

describe('App flow', () => {
  it('goes title -> play -> pause -> resume', () => {
    const { app, root, sessions, click, esc } = setup();
    expect(app.currentScreen).toBe('title');
    expect(root.textContent).toContain('LINE');
    click('Play');
    expect(app.currentScreen).toBe('playing');
    expect(sessions).toHaveLength(1);

    esc();
    expect(app.currentScreen).toBe('paused');
    expect(sessions[0]!.paused).toBe(true);
    esc();
    expect(app.currentScreen).toBe('playing');
    expect(sessions[0]!.paused).toBe(false);
  });

  it('restart builds a fresh match and quit disposes it', () => {
    const { app, sessions, click, esc } = setup();
    click('Play');
    esc();
    click('Restart');
    expect(sessions).toHaveLength(2);
    expect(sessions[0]!.disposed).toBe(true);
    expect(app.currentScreen).toBe('playing');
    esc();
    click('Quit to title');
    expect(sessions[1]!.disposed).toBe(true);
    expect(app.currentScreen).toBe('title');
  });

  it('saves settings edits and applies them to the running match', () => {
    const { root, store, sessions, click, esc } = setup();
    click('Play');
    esc();
    click('Settings');
    const kind = root.querySelector<HTMLSelectElement>('[data-key="slot-1-kind"]')!;
    kind.value = 'none';
    kind.dispatchEvent(new Event('change'));
    expect(JSON.parse(store.get(STORAGE_KEY)!).slots[1]).toEqual({ kind: 'none' });
    expect(sessions[0]!.settings.slots[1]).toEqual({ kind: 'none' });
    esc(); // closes settings, back to pause menu
    expect(root.textContent).toContain('Paused');
    click('Restart');
    expect(sessions[1]!.settings.slots[1]).toEqual({ kind: 'none' });
  });

  it('shows the match-over screen with the winner', () => {
    const { app, root, sessions, click } = setup();
    click('Play');
    sessions[0]!.over();
    expect(app.currentScreen).toBe('over');
    expect(root.textContent).toContain('Ember wins');
    click('Play again');
    expect(sessions).toHaveLength(2);
    sessions[1]!.over();
    click('Title');
    expect(app.currentScreen).toBe('title');
  });
});
