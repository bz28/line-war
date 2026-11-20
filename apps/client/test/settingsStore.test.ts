import { describe, expect, it } from 'vitest';
import {
  findKeyConflicts,
  isConflicted,
  layoutOf,
  loadSettings,
  sanitizeSettings,
  saveSettings,
  STORAGE_KEY,
  type StorageLike,
} from '../src/settings/store';
import { DEFAULT_SETTINGS, P1_KEYS, P2_KEYS, type Settings } from '../src/settings/types';

class MemoryStorage implements StorageLike {
  data = new Map<string, string>();
  getItem(k: string) {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.data.set(k, v);
  }
}
const withRaw = (raw: string) => {
  const s = new MemoryStorage();
  s.setItem(STORAGE_KEY, raw);
  return s;
};
const throwing: StorageLike = {
  getItem: () => {
    throw new Error('SecurityError');
  },
  setItem: () => {
    throw new Error('QuotaExceededError');
  },
};

describe('loadSettings', () => {
  it('returns defaults when storage is unavailable', () => {
    expect(loadSettings(null)).toEqual(DEFAULT_SETTINGS);
  });

  it('returns defaults when nothing is saved', () => {
    expect(loadSettings(new MemoryStorage())).toEqual(DEFAULT_SETTINGS);
  });

  it('returns a copy, never the shared defaults object', () => {
    const s = loadSettings(null);
    s.match.roundSeconds = 99;
    s.slots[0] = { kind: 'none' };
    expect(DEFAULT_SETTINGS.match.roundSeconds).not.toBe(99);
    expect(DEFAULT_SETTINGS.slots[0].kind).toBe('keyboard');
  });

  it('survives corrupted JSON', () => {
    expect(loadSettings(withRaw('{"slots": [oops'))).toEqual(DEFAULT_SETTINGS);
    expect(loadSettings(withRaw('null'))).toEqual(DEFAULT_SETTINGS);
    expect(loadSettings(withRaw('"a string"'))).toEqual(DEFAULT_SETTINGS);
    expect(loadSettings(withRaw('[1,2,3]'))).toEqual(DEFAULT_SETTINGS);
  });

  it('survives storage that throws', () => {
    expect(loadSettings(throwing)).toEqual(DEFAULT_SETTINGS);
  });

  it('merges a partial or old save with defaults', () => {
    const s = loadSettings(withRaw(JSON.stringify({ version: 0, match: { bestOf: 5 }, display: { showFps: true } })));
    expect(s.version).toBe(1);
    expect(s.match.bestOf).toBe(5);
    expect(s.match.roundSeconds).toBe(DEFAULT_SETTINGS.match.roundSeconds);
    expect(s.display).toEqual({ ...DEFAULT_SETTINGS.display, showFps: true });
    expect(s.slots).toEqual(DEFAULT_SETTINGS.slots);
    expect(s.audio).toEqual(DEFAULT_SETTINGS.audio);
  });

  it('fills in missing key bindings and slots', () => {
    const s = loadSettings(withRaw(JSON.stringify({ slots: [{ kind: 'keyboard', bindings: { up: 'KeyI' } }, { kind: 'keyboard' }] })));
    expect(s.slots[0]).toEqual({ kind: 'keyboard', bindings: { ...P1_KEYS, up: 'KeyI' } });
    expect(s.slots[1]).toEqual({ kind: 'keyboard', bindings: P2_KEYS });
    expect(s.slots[2]).toEqual(DEFAULT_SETTINGS.slots[2]);
    expect(s.slots[3]).toEqual(DEFAULT_SETTINGS.slots[3]);
  });

  it('clamps out-of-range numbers', () => {
    const s = loadSettings(
      withRaw(
        JSON.stringify({
          slots: [{ kind: 'gamepad', index: 9 }, { kind: 'gamepad', index: -2 }, { kind: 'gamepad', index: 1.6 }, { kind: 'none' }],
          match: { roundSeconds: 5000, prepSeconds: -4 },
          audio: { master: 3, music: -1, effects: 0.42 },
        }),
      ),
    );
    expect(s.slots.map((x) => (x.kind === 'gamepad' ? x.index : null))).toEqual([3, 0, 2, null]);
    expect(s.match.roundSeconds).toBe(600);
    expect(s.match.prepSeconds).toBe(0);
    expect(s.audio).toEqual({ master: 1, music: 0, effects: 0.42 });
  });

  it('replaces invalid values with defaults', () => {
    const s = loadSettings(
      withRaw(
        JSON.stringify({
          slots: [
            { kind: 'keyboard', bindings: { up: 42, down: '', left: 'Escape', right: '<script>' } },
            { kind: 'robot' },
            { kind: 'bot', difficulty: 'nightmare' },
            'nope',
          ],
          match: { roundSeconds: 'long', prepSeconds: null, bestOf: 4, rushEnabled: 'yes', criticEnabled: 0 },
          audio: { master: Number.NaN, music: '0.5' },
          display: 'all of it',
        }),
      ),
    );
    expect(s.slots[0]).toEqual({ kind: 'keyboard', bindings: P1_KEYS });
    expect(s.slots[1]).toEqual(DEFAULT_SETTINGS.slots[1]);
    expect(s.slots[2]).toEqual({ kind: 'bot', difficulty: 'normal' });
    expect(s.slots[3]).toEqual(DEFAULT_SETTINGS.slots[3]);
    expect(s.match).toEqual(DEFAULT_SETTINGS.match);
    expect(s.audio).toEqual(DEFAULT_SETTINGS.audio);
    expect(s.display).toEqual(DEFAULT_SETTINGS.display);
  });

  it('keeps a known level and falls back to Night Market for an unknown one', () => {
    expect(sanitizeSettings({ level: 'rooftop-garden' }).level).toBe('rooftop-garden');
    expect(sanitizeSettings({ level: 'moon-base' }).level).toBe('night-market');
    expect(sanitizeSettings({}).level).toBe('night-market');
  });
});

describe('saveSettings', () => {
  it('round-trips through storage', () => {
    const storage = new MemoryStorage();
    const s: Settings = {
      version: 1,
      slots: [
        { kind: 'keyboard', bindings: { ...P1_KEYS, grab: 'KeyF' } },
        { kind: 'gamepad', index: 2 },
        { kind: 'bot', difficulty: 'hard' },
        { kind: 'none' },
      ],
      match: { roundSeconds: 180, prepSeconds: 5, bestOf: 1, rushEnabled: false, criticEnabled: true, brunchSpeed: true },
      level: 'harbor-pier',
      audio: { master: 0.5, music: 0, effects: 1 },
      display: { screenShake: false, colorblindShapes: true, showFps: true },
    };
    expect(saveSettings(s, storage)).toBe(true);
    expect(storage.data.has(STORAGE_KEY)).toBe(true);
    expect(loadSettings(storage)).toEqual(s);
  });

  it('returns false instead of throwing when storage fails', () => {
    expect(saveSettings(DEFAULT_SETTINGS, throwing)).toBe(false);
    expect(saveSettings(DEFAULT_SETTINGS, null)).toBe(false);
  });
});

describe('key conflicts', () => {
  it('finds none in the defaults or between the two presets', () => {
    expect(findKeyConflicts(DEFAULT_SETTINGS.slots).size).toBe(0);
    expect(
      findKeyConflicts([
        { kind: 'keyboard', bindings: P1_KEYS },
        { kind: 'keyboard', bindings: P2_KEYS },
        { kind: 'none' },
        { kind: 'none' },
      ]).size,
    ).toBe(0);
  });

  it('flags two keyboard slots sharing a key', () => {
    const c = findKeyConflicts([
      { kind: 'keyboard', bindings: P1_KEYS },
      { kind: 'bot', difficulty: 'easy' },
      { kind: 'keyboard', bindings: { ...P2_KEYS, grab: 'Space' } },
      { kind: 'none' },
    ]);
    expect([...c.keys()]).toEqual(['Space']);
    expect(c.get('Space')).toEqual([
      { slot: 0, action: 'grab' },
      { slot: 2, action: 'grab' },
    ]);
    expect(isConflicted(c, 2, 'grab')).toBe(true);
    expect(isConflicted(c, 2, 'dash')).toBe(false);
  });

  it('flags the same key used twice within one slot', () => {
    const c = findKeyConflicts([{ kind: 'keyboard', bindings: { ...P1_KEYS, throw: 'KeyW' } }, { kind: 'none' }, { kind: 'none' }, { kind: 'none' }]);
    expect(c.get('KeyW')).toEqual([
      { slot: 0, action: 'up' },
      { slot: 0, action: 'throw' },
    ]);
  });

  it('ignores non-keyboard slots', () => {
    const c = findKeyConflicts([
      { kind: 'keyboard', bindings: P1_KEYS },
      { kind: 'gamepad', index: 0 },
      { kind: 'gamepad', index: 0 },
      { kind: 'none' },
    ]);
    expect(c.size).toBe(0);
  });

  it('recognises presets', () => {
    expect(layoutOf(P1_KEYS)).toBe('p1');
    expect(layoutOf(P2_KEYS)).toBe('p2');
    expect(layoutOf({ ...P1_KEYS, up: 'KeyI' })).toBe('custom');
  });
});
