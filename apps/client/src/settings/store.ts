import { LEVELS } from '@line-war/content';
import {
  ACTIONS,
  DEFAULT_SETTINGS,
  P1_KEYS,
  P2_KEYS,
  type Action,
  type BotDifficulty,
  type KeyBindings,
  type Settings,
  type SlotController,
} from './types';

const LEVEL_IDS: readonly string[] = LEVELS.map((l) => l.id);

/** Versioned so a future incompatible format can live beside (and migrate from) this one. */
export const STORAGE_KEY = 'line-war:settings:v1';

/** The subset of the Web Storage API we use; injectable for tests. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Allowed ranges for numeric settings. The menu reads these too. */
export const LIMITS = {
  roundSeconds: { min: 90, max: 600, step: 10 },
  prepSeconds: { min: 0, max: 30, step: 1 },
  bestOf: [1, 3, 5] as const,
  volume: { min: 0, max: 1, step: 0.05 },
  gamepadIndex: { min: 0, max: 3 },
};

export const BOT_DIFFICULTIES: readonly BotDifficulty[] = ['easy', 'normal', 'hard'];

/** Keys reserved by the client (pause / menu back); never bindable. */
export const RESERVED_KEYS: readonly string[] = ['Escape'];

/** window.localStorage, or null when it is missing or access throws (privacy mode, sandboxed iframe). */
export function browserStorage(): StorageLike | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/** Load settings; never throws. Missing, corrupted or partial data falls back to defaults field by field. */
export function loadSettings(storage: StorageLike | null = browserStorage()): Settings {
  if (!storage) return cloneSettings(DEFAULT_SETTINGS);
  let raw: string | null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return cloneSettings(DEFAULT_SETTINGS);
  }
  if (raw === null) return cloneSettings(DEFAULT_SETTINGS);
  try {
    return sanitizeSettings(JSON.parse(raw));
  } catch {
    return cloneSettings(DEFAULT_SETTINGS);
  }
}

/** Save settings; returns false if storage is unavailable or full. Never throws. */
export function saveSettings(settings: Settings, storage: StorageLike | null = browserStorage()): boolean {
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}

export function cloneSettings(s: Settings): Settings {
  return JSON.parse(JSON.stringify(s)) as Settings;
}

// ---------- validation ----------

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const obj = (v: unknown): Obj => (isObj(v) ? v : {});

function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

/** Finite numbers are clamped into range (and rounded to `step` when given); anything else is the fallback. */
function num(v: unknown, fallback: number, min: number, max: number, step?: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return fallback;
  const stepped = step ? Math.round(v / step) * step : v;
  return Math.min(max, Math.max(min, Number(stepped.toFixed(4))));
}

function oneOf<T>(v: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(v as T) ? (v as T) : fallback;
}

/** KeyboardEvent.code values are ASCII words like 'KeyW', 'Digit1', 'ShiftLeft', 'Numpad0'. */
export function isValidKeyCode(v: unknown): v is string {
  return typeof v === 'string' && /^[A-Za-z][A-Za-z0-9]{0,31}$/.test(v) && !RESERVED_KEYS.includes(v);
}

function sanitizeBindings(v: unknown, fallback: KeyBindings): KeyBindings {
  const o = obj(v);
  const out = {} as KeyBindings;
  for (const a of ACTIONS) out[a] = isValidKeyCode(o[a]) ? (o[a] as string) : fallback[a];
  return out;
}

/** Bindings to fall back to for a keyboard slot that has none: P1 layout for the first slot, P2 otherwise. */
const fallbackKeys = (slot: number): KeyBindings => (slot === 0 ? P1_KEYS : P2_KEYS);

export function sanitizeSlot(v: unknown, index: number): SlotController {
  const fallback = DEFAULT_SETTINGS.slots[index] ?? { kind: 'none' };
  const o = obj(v);
  switch (o.kind) {
    case 'keyboard':
      return { kind: 'keyboard', bindings: sanitizeBindings(o.bindings, fallbackKeys(index)) };
    case 'gamepad': {
      const { min, max } = LIMITS.gamepadIndex;
      return { kind: 'gamepad', index: num(o.index, index % (max + 1), min, max, 1) };
    }
    case 'bot':
      return { kind: 'bot', difficulty: oneOf(o.difficulty, BOT_DIFFICULTIES, 'normal') };
    case 'none':
      return { kind: 'none' };
    default:
      return JSON.parse(JSON.stringify(fallback)) as SlotController;
  }
}

/** Turn any parsed JSON value into valid Settings. Unknown or invalid fields take the default. */
export function sanitizeSettings(raw: unknown): Settings {
  const d = DEFAULT_SETTINGS;
  const o = obj(raw);
  const slotsIn = Array.isArray(o.slots) ? o.slots : [];
  const m = obj(o.match);
  const a = obj(o.audio);
  const disp = obj(o.display);
  const vol = (v: unknown, f: number) => num(v, f, LIMITS.volume.min, LIMITS.volume.max);
  return {
    version: 1,
    slots: [0, 1, 2, 3].map((i) => sanitizeSlot(slotsIn[i], i)) as Settings['slots'],
    match: {
      roundSeconds: num(m.roundSeconds, d.match.roundSeconds, LIMITS.roundSeconds.min, LIMITS.roundSeconds.max, 1),
      prepSeconds: num(m.prepSeconds, d.match.prepSeconds, LIMITS.prepSeconds.min, LIMITS.prepSeconds.max, 1),
      bestOf: oneOf(m.bestOf, LIMITS.bestOf, d.match.bestOf as 1 | 3 | 5),
      rushEnabled: bool(m.rushEnabled, d.match.rushEnabled),
      criticEnabled: bool(m.criticEnabled, d.match.criticEnabled),
      brunchSpeed: bool(m.brunchSpeed, d.match.brunchSpeed),
    },
    level: oneOf(o.level, LEVEL_IDS, d.level),
    audio: { master: vol(a.master, d.audio.master), music: vol(a.music, d.audio.music), effects: vol(a.effects, d.audio.effects) },
    display: {
      screenShake: bool(disp.screenShake, d.display.screenShake),
      colorblindShapes: bool(disp.colorblindShapes, d.display.colorblindShapes),
      showFps: bool(disp.showFps, d.display.showFps),
    },
  };
}

// ---------- key conflicts ----------

export interface BindingRef {
  slot: number;
  action: Action;
}

/**
 * Every key code bound more than once across all keyboard slots (including twice within one
 * slot), mapped to the bindings that share it. Empty map = no conflicts.
 */
export function findKeyConflicts(slots: readonly SlotController[]): Map<string, BindingRef[]> {
  const byCode = new Map<string, BindingRef[]>();
  slots.forEach((slot, i) => {
    if (slot.kind !== 'keyboard') return;
    for (const action of ACTIONS) {
      const code = slot.bindings[action];
      const list = byCode.get(code) ?? [];
      list.push({ slot: i, action });
      byCode.set(code, list);
    }
  });
  for (const [code, refs] of byCode) if (refs.length < 2) byCode.delete(code);
  return byCode;
}

/** True if this slot/action shares its key with another binding. */
export function isConflicted(conflicts: Map<string, BindingRef[]>, slot: number, action: Action): boolean {
  for (const refs of conflicts.values()) if (refs.some((r) => r.slot === slot && r.action === action)) return true;
  return false;
}

/** Which preset a binding set matches, for the layout picker. */
export function layoutOf(bindings: KeyBindings): 'p1' | 'p2' | 'custom' {
  const same = (preset: KeyBindings) => ACTIONS.every((a) => bindings[a] === preset[a]);
  return same(P1_KEYS) ? 'p1' : same(P2_KEYS) ? 'p2' : 'custom';
}

/** Player slots whose controller (kind, keys, pad index or bot difficulty) differs between two settings. */
export function changedSlots(prev: Settings['slots'], next: Settings['slots']): number[] {
  const out: number[] = [];
  next.forEach((slot, i) => {
    if (JSON.stringify(slot) !== JSON.stringify(prev[i])) out.push(i);
  });
  return out;
}
