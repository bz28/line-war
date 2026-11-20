import { NO_INPUT, type PlayerInput, type Vec2 } from '@line-war/sim';
import type { InputSource } from './types';

/** Returns the browser's gamepad list. Injected so tests can use fake pads. */
export type GetGamepads = () => readonly (Gamepad | null)[];

/** Button indices of the W3C "standard" gamepad mapping. */
export const PAD = {
  A: 0, // Cross
  B: 1, // Circle
  X: 2, // Square
  Y: 3, // Triangle
  LB: 4, // L1
  RB: 5, // R1
  SELECT: 8,
  START: 9,
  UP: 12,
  DOWN: 13,
  LEFT: 14,
  RIGHT: 15,
} as const;

/** Which standard-mapping button does each action. The single source for input and prompts. */
export const PAD_ACTIONS = { grab: PAD.A, work: PAD.X, dash: PAD.B, throw: PAD.Y } as const;
export type PadAction = keyof typeof PAD_ACTIONS;

/** Face-button names as printed on an Xbox-layout pad (the standard mapping's labels). */
const BUTTON_NAMES: Partial<Record<number, string>> = { [PAD.A]: 'A', [PAD.B]: 'B', [PAD.X]: 'X', [PAD.Y]: 'Y', [PAD.LB]: 'LB', [PAD.RB]: 'RB', [PAD.START]: 'Start', [PAD.SELECT]: 'Select' };

/** Prompt label for a standard-mapping button index, e.g. 0 -> "A". */
export const padButtonLabel = (button: number): string => BUTTON_NAMES[button] ?? `Button ${button + 1}`;

/** Prompt label for an action, from the live mapping (never hardcoded at call sites). */
export const padActionLabel = (action: PadAction): string => padButtonLabel(PAD_ACTIONS[action]);

export const DEFAULT_DEAD_ZONE = 0.25;

export const browserGamepads: GetGamepads = () => {
  try {
    return typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : [];
  } catch {
    return [];
  }
};

/** The pad at `index` if it is present and connected. */
export function padAt(getGamepads: GetGamepads, index: number): Gamepad | null {
  const pad = getGamepads()[index];
  return pad && pad.connected ? pad : null;
}

export function isPressed(pad: Gamepad, button: number): boolean {
  const b = pad.buttons[button];
  return !!b && (b.pressed || b.value > 0.5);
}

/**
 * Radial dead zone: inside `deadZone` reads as 0; outside it the magnitude is rescaled so
 * the stick still covers the full 0..1 range.
 */
export function applyDeadZone(x: number, y: number, deadZone = DEFAULT_DEAD_ZONE): Vec2 {
  const mag = Math.hypot(x, y);
  if (!Number.isFinite(mag) || mag < deadZone) return { x: 0, y: 0 };
  const scaled = Math.min(1, (mag - deadZone) / (1 - deadZone));
  return { x: (x / mag) * scaled, y: (y / mag) * scaled };
}

/** Movement from the D-pad if any direction is held, otherwise the left stick. */
export function padMove(pad: Gamepad, deadZone = DEFAULT_DEAD_ZONE): Vec2 {
  const dx = (isPressed(pad, PAD.RIGHT) ? 1 : 0) - (isPressed(pad, PAD.LEFT) ? 1 : 0);
  const dy = (isPressed(pad, PAD.DOWN) ? 1 : 0) - (isPressed(pad, PAD.UP) ? 1 : 0);
  if (dx !== 0 || dy !== 0) return { x: dx, y: dy };
  return applyDeadZone(pad.axes[0] ?? 0, pad.axes[1] ?? 0, deadZone);
}

/** Connected pads, for the settings menu. */
export function listGamepads(getGamepads: GetGamepads = browserGamepads): { index: number; id: string }[] {
  const out: { index: number; id: string }[] = [];
  const pads = getGamepads();
  for (let i = 0; i < pads.length; i++) {
    const p = pads[i];
    if (p && p.connected) out.push({ index: i, id: p.id });
  }
  return out;
}

const neutral = (): PlayerInput => ({ ...NO_INPUT, move: { x: 0, y: 0 } });

/**
 * Gamepad slot (standard mapping): left stick / D-pad move, A grab, X work (held), B dash,
 * Y throw. Grab, dash and throw are edge-triggered. A missing pad yields neutral input.
 */
export class GamepadInput implements InputSource {
  private prev = { grab: false, dash: false, throw: false };

  constructor(
    readonly index: number,
    private getGamepads: GetGamepads = browserGamepads,
    private deadZone = DEFAULT_DEAD_ZONE,
  ) {}

  poll(): PlayerInput {
    const pad = padAt(this.getGamepads, this.index);
    if (!pad) {
      this.prev = { grab: false, dash: false, throw: false };
      return neutral();
    }
    const grab = isPressed(pad, PAD_ACTIONS.grab);
    const dash = isPressed(pad, PAD_ACTIONS.dash);
    const thr = isPressed(pad, PAD_ACTIONS.throw);
    const input: PlayerInput = {
      move: padMove(pad, this.deadZone),
      grab: grab && !this.prev.grab,
      work: isPressed(pad, PAD_ACTIONS.work),
      dash: dash && !this.prev.dash,
      throw: thr && !this.prev.throw,
    };
    this.prev = { grab, dash, throw: thr };
    return input;
  }
}
