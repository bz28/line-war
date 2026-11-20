import type { TeamId } from '@line-war/sim';

/** Score tokens that fly from a crew's pass up into its sign, so every serve visibly pays the crew. */

/** Flight time from the pass to the sign (ms). */
export const FLY_MS = 680;

export interface Point {
  x: number;
  y: number;
}

/**
 * A point on the flight path at t (0..1): a quadratic arc that rises first, then accelerates
 * into the sign (ease-in), so the hit on arrival feels earned.
 */
export function flightPoint(from: Point, to: Point, t: number): Point {
  const k = t * t * (1.6 - 0.6 * t); // ease-in with a soft landing
  // Control point: above the start, pulled toward the sign's side.
  const cx = from.x + (to.x - from.x) * 0.25;
  const cy = Math.min(from.y, to.y) - Math.abs(to.x - from.x) * 0.12 - 40;
  const u = 1 - k;
  return { x: u * u * from.x + 2 * u * k * cx + k * k * to.x, y: u * u * from.y + 2 * u * k * cy + k * k * to.y };
}

const STEPS = 8;

export class ScoreFlyers {
  private live = new Set<{ el: HTMLElement; anim: Animation }>();

  constructor(private host: HTMLElement) {}

  /**
   * Launch "+points" from `from` to `to` (client px). Calls `land` on arrival; returns false (and
   * launches nothing) when the browser can't animate, so the caller lands it at once.
   */
  launch(team: TeamId, text: string, from: Point, to: Point, land: () => void): boolean {
    const el = document.createElement('div');
    if (typeof el.animate !== 'function') return false;
    el.className = `lw-fly ${team === 0 ? 'lw-jade' : 'lw-ember'}`;
    el.textContent = text;
    el.setAttribute('aria-hidden', 'true');
    this.host.append(el);
    const frames: Keyframe[] = [];
    for (let i = 0; i <= STEPS; i++) {
      const t = i / STEPS;
      const p = flightPoint(from, to, t);
      const pop = t < 0.15 ? 0.6 + (t / 0.15) * 0.75 : 1.35 - 0.6 * ((t - 0.15) / 0.85);
      frames.push({ transform: `translate(${p.x}px, ${p.y}px) translate(-50%, -50%) scale(${pop.toFixed(3)})`, opacity: t > 0.92 ? 0.4 : 1, offset: t });
    }
    const anim = el.animate(frames, { duration: FLY_MS, easing: 'linear', fill: 'forwards' });
    const entry = { el, anim };
    this.live.add(entry);
    anim.onfinish = () => {
      this.live.delete(entry);
      el.remove();
      land();
    };
    return true;
  }

  dispose(): void {
    for (const f of this.live) {
      f.anim.onfinish = null;
      f.anim.cancel();
      f.el.remove();
    }
    this.live.clear();
  }
}
