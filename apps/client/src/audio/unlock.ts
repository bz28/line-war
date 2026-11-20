/**
 * OWNER: audio track. One AudioContext for the app's lifetime, and the gestures that wake it.
 *
 * Browsers start a context 'suspended' until a real user gesture, and Safari/iOS can move it to
 * 'interrupted' later (a call, another app). Every real gesture retries resume() while the
 * context is not running: keys, pointer, touch, a newly connected or pressed gamepad (menus and
 * matches report pad presses), and the tab becoming visible again. A one-shot listener is not
 * enough: Esc can use it up, and a synthetic click from pad A is not a gesture at all.
 * While the context waits, a small "Press any key for sound" note shows in the corner.
 */

type Ctx = Pick<AudioContext, 'state' | 'resume'> & Partial<Pick<AudioContext, 'addEventListener' | 'removeEventListener'>>;

const GESTURES = ['keydown', 'pointerdown', 'touchend', 'gamepadconnected'] as const;

export class AudioUnlock {
  private ctx: Ctx | null | undefined;
  readonly hint: HTMLElement | null;

  constructor(
    private readonly create: () => Ctx | null,
    private readonly win: Pick<Window, 'addEventListener' | 'removeEventListener'> = window,
    private readonly doc: Document = document,
  ) {
    for (const g of GESTURES) win.addEventListener(g, this.wake, { capture: true });
    doc.addEventListener('visibilitychange', this.onVisible);
    this.hint = doc.createElement('div');
    this.hint.className = 'lw-sound-hint';
    this.hint.setAttribute('role', 'status');
    this.hint.textContent = 'Press any key for sound';
    this.hint.hidden = true;
    doc.body.append(this.hint);
    this.context(); // created up front so the hint can tell whether sound is waiting
  }

  /** The shared context, created on first use; null without Web Audio. */
  context(): Ctx | null {
    if (this.ctx === undefined) {
      try {
        this.ctx = this.create();
      } catch {
        this.ctx = null;
      }
      this.ctx?.addEventListener?.('statechange', this.sync);
      this.sync();
    }
    return this.ctx;
  }

  /** Call from any real user gesture. Safe to call often. */
  wake = (): void => {
    const ctx = this.context();
    if (!ctx || ctx.state === 'running' || ctx.state === 'closed') return;
    try {
      void ctx.resume().then(this.sync, () => undefined);
    } catch {
      // stays silent
    }
  };

  private onVisible = (): void => {
    if (this.doc.visibilityState === 'visible') this.wake();
  };

  /** Show the hint only while sound is waiting on a gesture. */
  sync = (): void => {
    if (!this.hint) return;
    const s = this.ctx?.state as string | undefined;
    this.hint.hidden = !this.ctx || s === 'running' || s === 'closed';
  };

  dispose(): void {
    for (const g of GESTURES) this.win.removeEventListener(g, this.wake, { capture: true });
    this.doc.removeEventListener('visibilitychange', this.onVisible);
    this.ctx?.removeEventListener?.('statechange', this.sync);
    this.hint?.remove();
  }
}
