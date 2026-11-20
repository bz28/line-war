import { applyDeadZone, isPressed, PAD, type GetGamepads } from '../input/gamepad';

/**
 * Menu navigation shared by every screen: arrow keys and any gamepad (D-pad / stick)
 * move focus between controls, left/right adjust selects, sliders and tabs, A / Enter
 * activates, B / Esc goes back, Start fires `onStart` (pause / resume). Q / E, PageUp /
 * PageDown and the pad's LB / RB turn tab pages (How to play, Settings).
 */
export interface NavHandlers {
  /** The element whose controls are navigable right now, or null when no menu is open. */
  getRoot(): HTMLElement | null;
  onBack(): void;
  onStart(): void;
  /** Any new gamepad button press (menus or match): a chance to unlock audio. */
  onPadButton?(): void;
}

const FOCUSABLE = 'button:not([disabled]), select:not([disabled]), input:not([disabled])';

/**
 * False for controls hidden by CSS (e.g. How to play's page tabs on tall screens), so focus
 * never lands on something invisible. Without layout support (jsdom) everything counts as shown.
 */
export function isShown(el: HTMLElement): boolean {
  return typeof el.checkVisibility === 'function' ? el.checkVisibility() : true;
}

/** Navigable controls under `root`, in document order. */
export const focusables = (root: ParentNode): HTMLElement[] => [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(isShown);
const PAGE_KEYS: Readonly<Record<string, 1 | -1>> = { KeyQ: -1, KeyE: 1, PageUp: -1, PageDown: 1, BracketLeft: -1, BracketRight: 1 };

/**
 * Select the tab `delta` pages from the selected one (clamped, no wrap: a manual has a first and
 * a last page). Keeps keyboard focus on the tab strip if it was there. False when `root` has no tabs.
 */
export function flipTab(root: HTMLElement, delta: 1 | -1): boolean {
  const tabs = focusables(root).filter((el) => el.getAttribute('role') === 'tab');
  if (!tabs.length) return false;
  const cur = Math.max(0, tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true'));
  const next = tabs[Math.max(0, Math.min(tabs.length - 1, cur + delta))]!;
  if (next === tabs[cur]) return true;
  const onTabs = document.activeElement?.getAttribute('role') === 'tab';
  const key = next.dataset.key;
  next.click();
  // Settings re-renders its tabs on click, so find the new node by its key.
  if (onTabs) (key ? root.querySelector<HTMLElement>(`[data-key="${key}"]`) : next)?.focus();
  return true;
}

/** Screens whose left / right arrows always turn the page (the manual), wherever focus is. */
const ARROWS_TURN_PAGES = '[data-arrows-turn-pages]';

const REPEAT_DELAY_MS = 380;
const REPEAT_MS = 110;

type Dir = 'up' | 'down' | 'left' | 'right';
interface Buttons {
  a: boolean;
  b: boolean;
  start: boolean;
  lb: boolean;
  rb: boolean;
}
const ALL_HELD: Buttons = { a: true, b: true, start: true, lb: true, rb: true };

export class MenuNav {
  private prevButtons = new Map<number, Buttons>();
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
    // Held Esc / Enter auto-repeat: one press is one action, never a pause/resume flutter.
    if (e.repeat && (e.code === 'Escape' || e.code === 'Enter' || e.code === 'NumpadEnter')) {
      if (this.handlers.getRoot() || e.code === 'Escape') e.preventDefault();
      return;
    }
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
    const page = PAGE_KEYS[e.code];
    const typing = document.activeElement instanceof HTMLInputElement && document.activeElement.type !== 'range' && document.activeElement.type !== 'checkbox';
    if (dir) {
      e.preventDefault();
      this.move(root, dir);
    } else if (page && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (flipTab(root, page)) e.preventDefault();
    } else if (e.code === 'Enter' && document.activeElement instanceof HTMLInputElement && document.activeElement.type === 'checkbox') {
      e.preventDefault();
      document.activeElement.click();
    }
  };

  /** Treat every pad button as already held, so only a fresh press after this counts. */
  rebaseline(): void {
    for (const i of [...this.prevButtons.keys()]) this.prevButtons.set(i, { ...ALL_HELD });
  }

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
      const prev = this.prevButtons.get(i) ?? ALL_HELD; // ignore buttons already held on connect
      const cur: Buttons = {
        a: isPressed(pad, PAD.A),
        b: isPressed(pad, PAD.B),
        start: isPressed(pad, PAD.START),
        lb: isPressed(pad, PAD.LB),
        rb: isPressed(pad, PAD.RB),
      };
      this.prevButtons.set(i, cur);
      if ((cur.a && !prev.a) || (cur.b && !prev.b) || (cur.start && !prev.start) || (cur.lb && !prev.lb) || (cur.rb && !prev.rb)) this.handlers.onPadButton?.();
      const root = this.handlers.getRoot();
      if (cur.start && !prev.start) this.handlers.onStart();
      else if (root && cur.b && !prev.b) this.handlers.onBack();
      else if (root && cur.a && !prev.a) activate(root);
      else if (root && cur.lb && !prev.lb) flipTab(root, -1);
      else if (root && cur.rb && !prev.rb) flipTab(root, 1);
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
    const items = focusables(root);
    if (!items.length) return;
    const active = document.activeElement as HTMLElement | null;
    const idx = active ? items.indexOf(active) : -1;
    if ((dir === 'left' || dir === 'right') && (root.matches(ARROWS_TURN_PAGES) || root.querySelector(ARROWS_TURN_PAGES))) {
      flipTab(root, dir === 'right' ? 1 : -1);
      return;
    }
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
  else focusables(root)[0]?.focus();
}
