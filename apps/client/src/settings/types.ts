import { DEFAULT_MATCH_CONFIG, type MatchConfig } from '@line-war/sim';

/** OWNER: input-settings track. Persisted in localStorage by that track. */

export type Action = 'up' | 'down' | 'left' | 'right' | 'grab' | 'work' | 'dash' | 'throw';
export const ACTIONS: readonly Action[] = ['up', 'down', 'left', 'right', 'grab', 'work', 'dash', 'throw'];

/** KeyboardEvent.code values per action, e.g. 'KeyW', 'Space', 'ShiftLeft'. */
export type KeyBindings = Record<Action, string>;

export type SlotController =
  | { kind: 'keyboard'; bindings: KeyBindings }
  | { kind: 'gamepad'; index: number }
  | { kind: 'bot'; difficulty: 'easy' | 'normal' | 'hard' }
  | { kind: 'none' };

export interface Settings {
  version: 1;
  /** One entry per PlayerId (0,1 = crew A; 2,3 = crew B). */
  slots: [SlotController, SlotController, SlotController, SlotController];
  match: Omit<MatchConfig, 'tuning' | 'seed'>;
  audio: { master: number; music: number; effects: number };
  display: { screenShake: boolean; colorblindShapes: boolean; showFps: boolean };
}

export const P1_KEYS: KeyBindings = {
  up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', grab: 'Space', work: 'KeyE', dash: 'ShiftLeft', throw: 'KeyQ',
};
export const P2_KEYS: KeyBindings = {
  up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', grab: 'Enter', work: 'Slash', dash: 'ShiftRight', throw: 'Period',
};

export const DEFAULT_SETTINGS: Settings = {
  version: 1,
  slots: [
    { kind: 'keyboard', bindings: P1_KEYS },
    { kind: 'bot', difficulty: 'normal' },
    { kind: 'bot', difficulty: 'normal' },
    { kind: 'bot', difficulty: 'normal' },
  ],
  match: {
    roundSeconds: DEFAULT_MATCH_CONFIG.roundSeconds,
    prepSeconds: DEFAULT_MATCH_CONFIG.prepSeconds,
    bestOf: DEFAULT_MATCH_CONFIG.bestOf,
    rushEnabled: true,
    criticEnabled: true,
    brunchSpeed: false,
  },
  audio: { master: 0.8, music: 0.8, effects: 0.8 },
  display: { screenShake: true, colorblindShapes: false, showFps: false },
};
