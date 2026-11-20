import { charmById } from '@line-war/content';
import type { MatchState, SimEvent, TeamId } from '@line-war/sim';
import { charmIcon } from './charmIcon';

/** Charm moments in the HUD: the "A charm appeared!" callout under the clock. */

/** How long the callout stays up (ms), not counting its exit. */
export const CALLOUT_MS = 2800;
const CALLOUT_OUT_MS = 360;

export const charmName = (variant: string): string => charmById(variant)?.name ?? 'Charm';
export const charmRare = (variant: string): boolean => charmById(variant)?.rare ?? false;

/** A paper tag that drops in under the lantern clock when a charm appears in the market. */
export class CharmCallout {
  readonly root: HTMLElement;
  private until = 0;
  private outUntil = 0;

  constructor(private now: () => number) {
    this.root = document.createElement('div');
    this.root.className = 'lw-charm-callout';
    this.root.hidden = true;
    this.root.setAttribute('role', 'status');
  }

  show(variant: string): void {
    const rare = charmRare(variant);
    this.root.className = `lw-charm-callout${rare ? ' lw-charm-callout--rare' : ''}`;
    this.root.innerHTML = '';
    const icon = document.createElement('span');
    icon.className = 'lw-charm-callout-icon';
    icon.innerHTML = charmIcon(variant);
    const text = document.createElement('span');
    text.className = 'lw-charm-callout-text';
    const title = document.createElement('b');
    title.textContent = rare ? 'A rare charm appeared!' : 'A charm appeared!';
    const sub = document.createElement('span');
    sub.textContent = `${charmName(variant)} in the market. Carry it home for +50.`;
    text.append(title, sub);
    this.root.append(icon, text);
    this.root.hidden = false;
    this.until = this.now() + CALLOUT_MS;
    this.outUntil = 0;
  }

  /**
   * Stack the callout below another note (the first-match coach), `top` px from the top of the
   * band; null puts it back under the clock.
   */
  stackBelow(top: number | null): void {
    this.root.classList.toggle('lw-charm-callout--stacked', top !== null);
    if (top === null) this.root.style.removeProperty('top');
    else this.root.style.top = `calc(${Math.round(top)}px + var(--s) * 0.9)`;
  }

  get showing(): boolean {
    return !this.root.hidden;
  }

  render(): void {
    if (this.root.hidden) return;
    const now = this.now();
    if (!this.outUntil && now >= this.until) {
      this.outUntil = now + CALLOUT_OUT_MS;
      this.root.classList.add('lw-charm-callout--out');
    }
    if (this.outUntil && now >= this.outUntil) this.root.hidden = true;
  }
}

/** True when this tick also raised the team's Heat (the bank's "+1 Heat" really landed). */
export function heatRaised(events: readonly SimEvent[], team: TeamId, prevHeat: number): boolean {
  return events.some((e) => e.type === 'heatChange' && e.team === team && e.heat > prevHeat);
}

/** "+50 · Heat up" (or just "+50" when Heat was already at the top). */
export function bankLabel(s: MatchState, heatUp: boolean): { points: string; heat: string | null } {
  return { points: `+${s.config.tuning.charmPoints}`, heat: heatUp ? 'Heat up' : null };
}
