import { applyDeadZone, isPressed, PAD, type GetGamepads } from '../input/gamepad';

/**
 * Menu navigation shared by every screen: arrow keys and any gamepad (D-pad / stick)
 * move focus between controls, left/right adjust selects, sliders and tabs, A / Enter
 * activates, B / Esc goes back, Start fires `onStart` (pause / resume).
 */
export interface NavHandlers {
  /** The element whose controls are navigable right now, or null when no menu is open. */
  getRoot(): HTMLElement | null;
  onBack(): void;
  onStart(): void;
}

const FOCUSABLE = 'button:not([disabled]), select:not([disabled]), input:not([disabled])';
const REPEAT_DELAY_MS = 380;
const REPEAT_MS = 110;

type Dir = 'up' | 'down' | 'left' | 'right';

export class MenuNav {
  private prevButtons = new Map<number, { a: boolean; b: boolean; start: boolean }>();
  private held: { dir: Dir; next: number } | null = null;

  constructor(
    private handlers: NavHandlers,
    private getGamepads: GetGamepads,
    private keyTarget: EventTarget = window,
  ) {
    keyTarget.addEventListener('keydown', this.onKey);
  }

  dispose(): void {
    this.keyTarget.removeEventListener('keydown', this.onKey);
  }

  private onKey = (ev: Event): void => {
    const e = ev as KeyboardEvent;
    if (e.code === 'Escape') {
      e.preventDefault();
      // Esc means "back" in menus and "pause" in a match; the app decides via onBack/onStart.
      if (this.handlers.getRoot()) this.handlers.onBack();
      else this.handlers.onStart();
      return;
    }
    const root = this.handlers.getRoot();
    if (!root) return;
    const dir = ({ ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' } as const)[e.code as 'ArrowUp'];
    if (dir) {
      e.preventDefault();
      this.move(root, dir);
    } else if (e.code === 'Enter' && document.activeElement instanceof HTMLInputElement && document.activeElement.type === 'checkbox') {
      e.preventDefault();
      document.activeElement.click();
    }
  };

  /** Call once per animation frame. */
  poll(now: number): void {
    const pads = this.getGamepads();
    let dir: Dir | null = null;
    for (let i = 0; i < pads.length; i++) {
      const pad = pads[i];
      if (!pad || !pad.connected) {
        this.prevButtons.delete(i);
        continue;
      }
      const prev = this.prevButtons.get(i) ?? { a: true, b: true, start: true }; // ignore buttons already held on connect
      const cur = { a: isPressed(pad, PAD.A), b: isPressed(pad, PAD.B), start: isPressed(pad, PAD.START) };
      this.prevButtons.set(i, cur);
      const root = this.handlers.getRoot();
      if (cur.start && !prev.start) this.handlers.onStart();
      else if (root && cur.b && !prev.b) this.handlers.onBack();
      else if (root && cur.a && !prev.a) activate(root);
      dir ??= padDir(pad);
    }
    const root = this.handlers.getRoot();
    if (!dir || !root) {
      this.held = null;
      return;
    }
    if (!this.held || this.held.dir !== dir) {
      this.held = { dir, next: now + REPEAT_DELAY_MS };
      this.move(root, dir);
    } else if (now >= this.held.next) {
      this.held.next = now + REPEAT_MS;
      this.move(root, dir);
    }
  }

  private move(root: HTMLElement, dir: Dir): void {
    const items = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)];
    if (!items.length) return;
    const active = document.activeElement as HTMLElement | null;
    const idx = active ? items.indexOf(active) : -1;
    if (idx < 0) {
      items[0]!.focus();
      return;
    }
    if (dir === 'left' || dir === 'right') {
      if (adjust(active!, dir === 'right' ? 1 : -1)) return;
      if (active!.getAttribute('role') === 'tab') {
        const tabs = items.filter((el) => el.getAttribute('role') === 'tab');
        const t = tabs[(tabs.indexOf(active!) + (dir === 'right' ? 1 : tabs.length - 1)) % tabs.length];
        t?.focus();
        t?.click();
        return;
      }
    }
    const step = dir === 'down' || dir === 'right' ? 1 : -1;
    // Grids (the charm shelf): up/down keeps the column when the next row has one.
    const col = active!.dataset.col;
    if ((dir === 'up' || dir === 'down') && col !== undefined) {
      for (let i = idx + step; i >= 0 && i < items.length; i += step) {
        if (items[i]!.dataset.col === col) {
          items[i]!.focus();
          return;
        }
      }
      // No row beyond: leave the grid for the next control outside it (e.g. Back).
      for (let i = idx + step; i >= 0 && i < items.length; i += step) {
        if (items[i]!.dataset.col === undefined) {
          items[i]!.focus();
          return;
        }
      }
    }
    items[(idx + step + items.length) % items.length]!.focus();
  }
}

function padDir(pad: Gamepad): Dir | null {
  if (isPressed(pad, PAD.UP)) return 'up';
  if (isPressed(pad, PAD.DOWN)) return 'down';
  if (isPressed(pad, PAD.LEFT)) return 'left';
  if (isPressed(pad, PAD.RIGHT)) return 'right';
  const { x, y } = applyDeadZone(pad.axes[0] ?? 0, pad.axes[1] ?? 0, 0.5);
  if (x === 0 && y === 0) return null;
  return Math.abs(x) > Math.abs(y) ? (x > 0 ? 'right' : 'left') : y > 0 ? 'down' : 'up';
}

/** Change a select or slider by one step. Returns false if the element is not adjustable. */
function adjust(el: HTMLElement, delta: 1 | -1): boolean {
  if (el instanceof HTMLSelectElement) {
    const opts = [...el.options];
    let i = el.selectedIndex + delta;
    while (opts[i]?.disabled) i += delta;
    if (i < 0 || i >= opts.length) return true;
    el.selectedIndex = i;
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }
  if (el instanceof HTMLInputElement && el.type === 'range') {
    if (delta > 0) el.stepUp();
    else el.stepDown();
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }
  return false;
}

function activate(root: HTMLElement): void {
  const el = document.activeElement as HTMLElement | null;
  if (el && root.contains(el)) el.click();
  else root.querySelector<HTMLElement>(FOCUSABLE)?.focus();
}
