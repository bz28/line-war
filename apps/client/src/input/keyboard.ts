import type { PlayerInput } from '@line-war/sim';
import type { KeyBindings } from '../settings/types';
import type { InputSource } from './types';

/** Tracks held keys for the whole page; one instance shared by all keyboard slots. */
export class KeyboardState {
  private held = new Set<string>();
  /** Keys whose browser default (scrolling, quick-find...) is suppressed while playing. */
  private captured = new Set<string>();
  private onDown = (e: Event) => {
    const { code } = e as KeyboardEvent;
    this.held.add(code);
    if (this.captured.has(code)) e.preventDefault();
  };
  private onUp = (e: Event) => this.held.delete((e as KeyboardEvent).code);
  private onBlur = () => this.held.clear();

  constructor(private target: EventTarget = window) {
    target.addEventListener('keydown', this.onDown);
    target.addEventListener('keyup', this.onUp);
    target.addEventListener('blur', this.onBlur);
  }
  /** Set the keys to capture (usually every bound key while a match is running; none in menus). */
  setCaptured(codes: Iterable<string>): void {
    this.captured = new Set(codes);
  }
  isDown(code: string): boolean {
    return this.held.has(code);
  }
  dispose(): void {
    this.target.removeEventListener('keydown', this.onDown);
    this.target.removeEventListener('keyup', this.onUp);
    this.target.removeEventListener('blur', this.onBlur);
  }
}

/** Keyboard slot: held keys -> PlayerInput with edge-triggered buttons. */
export class KeyboardInput implements InputSource {
  private prev = { grab: false, dash: false, throw: false };
  constructor(private keys: KeyboardState, private bindings: KeyBindings) {}

  poll(): PlayerInput {
    const k = (a: keyof KeyBindings) => this.keys.isDown(this.bindings[a]);
    const grab = k('grab');
    const dash = k('dash');
    const thr = k('throw');
    const input: PlayerInput = {
      move: { x: (k('right') ? 1 : 0) - (k('left') ? 1 : 0), y: (k('down') ? 1 : 0) - (k('up') ? 1 : 0) },
      grab: grab && !this.prev.grab,
      work: k('work'),
      dash: dash && !this.prev.dash,
      throw: thr && !this.prev.throw,
    };
    this.prev = { grab, dash, throw: thr };
    return input;
  }
}
