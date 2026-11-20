import type { MatchState, TeamId, Ticket } from '@line-war/sim';
import { criticExclusiveSeconds, sortTickets, ticketTimeLeft, ticketValue } from '../render/format';
import { foodIcon, LOCK } from './icons';
import { crewName, formatMult, formatScore } from './text';

/** Why a slip left the line. 'cleared' = removed without an event (round or match over, new round). */
export type SlipExit = 'served' | 'expired' | 'cleared';

/** Slot positions along the string: four left of the clock lantern, four right of it. */
export const SLOTS_PER_SIDE = 4;

/** How long a leaving slip stays in the DOM to finish its animation (ms). */
export const EXIT_MS: Record<SlipExit, number> = { served: 1300, expired: 1400, cleared: 1100 };
/** Cleared slips roll up into the string one after another, from the clock outwards (ms apart). */
export const FOLD_STAGGER_MS = 70;

/**
 * Empty-line placeholder: while no slip hangs (prep, or a lull in service), a dashed ghost slip
 * waits where the first ticket will clip on, counting down to it. Null when it should not show.
 */
export function ghostSeconds(s: MatchState, slipsShowing: number): number | null {
  if (slipsShowing > 0 || lineClosed(s)) return null;
  const left = (s.nextTicketTick - s.tick) / s.config.tuning.tickRate;
  return Number.isFinite(left) ? Math.max(0, Math.ceil(left)) : null;
}

/** True when the line should be empty: the round is over, so every slip folds away. */
export const lineClosed = (s: MatchState): boolean => s.round.phase === 'roundOver' || s.round.phase === 'matchOver';
const REDUCED_EXIT_MS = 300;

interface SlipView {
  ticket: Ticket;
  el: HTMLElement;
  value: HTMLElement;
  secs: HTMLElement;
  /** Critic only: the lock tag shown while one crew has it exclusively. */
  lock: { root: HTMLElement; name: HTMLElement; count: HTMLElement } | null;
  slot: number;
  /** Last values written to the DOM, so frames only touch what changed. */
  shown: { value: number; secs: number; age: number; urgent: boolean; locked: boolean | null; count: string };
  leaveAt: number | null;
}

const el = (tag: string, cls: string, text?: string): HTMLElement => {
  const e = document.createElement(tag);
  e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

/** Slot index (0..7) -> horizontal offset in "pitch" units from the centre, and which side of the clock. */
export function slotOffset(slot: number): { off: number; side: -1 | 1 } {
  const s = Math.max(0, Math.min(SLOTS_PER_SIDE * 2 - 1, slot));
  return s < SLOTS_PER_SIDE ? { off: s - SLOTS_PER_SIDE, side: -1 } : { off: s - SLOTS_PER_SIDE, side: 1 };
}

/**
 * The ticket line: one paper slip per ticket, clipped to the lantern string. Slips are created
 * once, updated in place every frame (only changed text / CSS variables are written) and kept
 * in the DOM while their exit animation plays.
 */
export class TicketLine {
  readonly root: HTMLElement;
  private views = new Map<number, SlipView>();
  private served = new Map<number, { team: TeamId; points: number }>();
  private expired = new Set<number>();
  private ghost: HTMLElement;
  private ghostSecs: HTMLElement;
  private ghostShown: number | null = null;

  constructor(
    private now: () => number,
    private reducedMotion: () => boolean,
  ) {
    this.root = el('div', 'lw-line');
    this.root.setAttribute('aria-label', 'Tickets');
    this.ghost = el('div', 'lw-slip-ghost');
    this.ghost.setAttribute('aria-hidden', 'true');
    this.ghost.style.setProperty('--off', String(slotOffset(0).off));
    this.ghost.style.setProperty('--side', String(slotOffset(0).side));
    this.ghostSecs = el('span', 'lw-slip-ghost-secs');
    this.ghost.append(el('span', 'lw-slip-ghost-label', 'Next ticket'), this.ghostSecs);
    this.ghost.hidden = true;
    this.root.append(this.ghost);
  }

  /** Remember why tickets left this tick (events are cleared by the next step). */
  onTick(s: MatchState): void {
    for (const e of s.events) {
      if (e.type === 'delivered') this.served.set(e.ticketId, { team: e.team, points: e.points });
      else if (e.type === 'ticketExpired') this.expired.add(e.ticketId);
    }
  }

  render(s: MatchState): void {
    const now = this.now();
    const tickets = lineClosed(s) ? [] : sortTickets(s.tickets);
    const live = new Set<number>();
    tickets.forEach((t, i) => {
      live.add(t.id);
      let v = this.views.get(t.id);
      if (!v) {
        v = this.create(s, t);
        this.views.set(t.id, v);
        this.root.append(v.el);
      }
      v.ticket = t;
      this.place(v, i);
      this.update(s, v);
    });
    for (const [id, v] of this.views) {
      if (!live.has(id) && v.leaveAt === null) this.leave(v, now);
      else if (v.leaveAt !== null && now >= v.leaveAt) {
        v.el.remove();
        this.views.delete(id);
      }
    }
    const ghost = ghostSeconds(s, this.views.size);
    if (ghost !== this.ghostShown) {
      if ((ghost === null) !== (this.ghostShown === null)) this.ghost.hidden = ghost === null;
      this.ghostShown = ghost;
      if (ghost !== null) this.ghostSecs.textContent = `${ghost}s`;
    }
  }

  dispose(): void {
    this.views.clear();
    this.root.replaceChildren();
    this.ghostShown = null;
  }

  // ---------- slips ----------

  private create(s: MatchState, t: Ticket): SlipView {
    const recipe = s.recipes.find((r) => r.id === t.recipe);
    const name = recipe?.name ?? t.recipe;
    const slip = el('div', `lw-slip lw-slip--new${t.isCritic ? ' lw-slip--critic' : ''}`);
    slip.dataset.ticket = String(t.id);
    slip.dataset.state = 'live';
    // Each slip sways at its own pace so the line never moves in lockstep.
    slip.style.setProperty('--sway-dur', `${(3.4 + (t.id % 5) * 0.37).toFixed(2)}s`);
    slip.style.setProperty('--sway-delay', `${(-((t.id * 0.61) % 3)).toFixed(2)}s`);

    const swing = el('div', 'lw-slip-swing');
    const pin = el('span', 'lw-slip-pin');
    const card = el('div', 'lw-slip-card');
    const front = el('div', 'lw-slip-face lw-slip-front');
    if (t.isCritic) front.append(el('div', 'lw-slip-critic', 'Critic'));
    front.append(el('div', 'lw-slip-name', name));
    const items = el('div', 'lw-slip-items');
    items.innerHTML = (recipe?.ingredients ?? [])
      .map((f) => {
        const def = s.ingredients[f.kind];
        const label = `${f.state === 'raw' ? '' : `${f.state} `}${def?.name.toLowerCase() ?? f.kind}`;
        return foodIcon(f.kind, f.state, def?.cook?.vessel ?? null, label);
      })
      .join('');
    front.append(items);
    const foot = el('div', 'lw-slip-foot');
    const value = el('span', 'lw-slip-value');
    const secs = el('span', 'lw-slip-secs');
    foot.append(value, secs);
    front.append(foot, el('div', 'lw-slip-fresh'));
    card.append(front);

    swing.append(pin, card);
    // The Critic is face-up for everyone; while one crew has it exclusively a lock tag in that
    // crew's colour hangs under it with the seconds until everyone may serve it.
    let lock: SlipView['lock'] = null;
    if (t.isCritic) {
      const root = el('div', 'lw-slip-lock');
      const icon = el('span', 'lw-slip-lock-icon');
      icon.innerHTML = LOCK;
      const lockName = el('span', 'lw-slip-lock-name');
      const count = el('span', 'lw-slip-lock-count');
      root.append(icon, lockName, count);
      swing.append(root);
      lock = { root, name: lockName, count };
    }
    slip.append(swing);
    return {
      ticket: t,
      el: slip,
      value,
      secs,
      lock,
      slot: -1,
      shown: { value: -1, secs: -1, age: -1, urgent: false, locked: null, count: '' },
      leaveAt: null,
    };
  }

  private place(v: SlipView, slot: number): void {
    if (v.slot === slot || v.leaveAt !== null) return;
    v.slot = slot;
    const { off, side } = slotOffset(slot);
    v.el.style.setProperty('--off', String(off));
    v.el.style.setProperty('--side', String(side));
  }

  private update(s: MatchState, v: SlipView): void {
    const t = v.ticket;
    const sh = v.shown;
    const left = ticketTimeLeft(s, t);
    const age = Math.round((1 - left) * 100) / 100;
    if (age !== sh.age) {
      sh.age = age;
      v.el.style.setProperty('--age', String(age));
    }
    const urgent = left < 0.2;
    if (urgent !== sh.urgent) {
      sh.urgent = urgent;
      v.el.classList.toggle('lw-slip--urgent', urgent);
    }
    const value = ticketValue(s, t);
    if (value !== sh.value) {
      sh.value = value;
      const txt = formatScore(value);
      const size = txt.length >= 3 ? 's' : 'm';
      if (v.value.dataset.size !== size) v.value.dataset.size = size;
      v.value.textContent = txt;
    }
    const secs = Math.max(0, Math.ceil((t.expireTick - s.tick) / s.config.tuning.tickRate));
    if (secs !== sh.secs) {
      sh.secs = secs;
      v.secs.textContent = `${secs}s`;
    }
    if (t.isCritic) {
      const locked = t.visibleTo !== null;
      if (locked !== sh.locked) {
        sh.locked = locked;
        v.el.classList.toggle('lw-slip--locked', locked);
        v.el.dataset.locked = String(locked);
        if (t.visibleTo !== null) {
          v.el.dataset.lockTeam = String(t.visibleTo);
          v.lock!.name.textContent = `${crewName(t.visibleTo)} only`;
        } else delete v.el.dataset.lockTeam;
        v.el.querySelector('.lw-slip-critic')!.textContent = `Critic ${formatMult(s.config.tuning.criticMultiplier)}`;
      }
      if (locked && v.lock) {
        const left = criticExclusiveSeconds(s, t);
        const txt = left === null || !Number.isFinite(left) ? '' : String(Math.ceil(left));
        if (txt !== sh.count) {
          sh.count = txt;
          v.lock.count.textContent = txt;
          v.lock.root.setAttribute('aria-label', `${v.lock.name.textContent}${txt ? ` for ${txt} more seconds` : ''}`);
        }
      }
    }
  }

  private leave(v: SlipView, now: number): void {
    const id = v.ticket.id;
    const served = this.served.get(id);
    const reason: SlipExit = served ? 'served' : this.expired.has(id) ? 'expired' : 'cleared';
    this.served.delete(id);
    this.expired.delete(id);
    v.leaveAt = now + (this.reducedMotion() ? REDUCED_EXIT_MS : EXIT_MS[reason]);
    v.el.dataset.state = reason;
    v.el.classList.add(`lw-slip--${reason}`);
    v.el.classList.remove('lw-slip--locked');
    v.el.setAttribute('aria-hidden', 'true');
    if (reason === 'cleared') {
      // Nearest the clock first, so the line rolls up from the middle out.
      const { off } = slotOffset(Math.max(0, v.slot));
      const rank = off < 0 ? -off - 1 : off;
      v.el.style.setProperty('--fold-delay', `${rank * FOLD_STAGGER_MS}ms`);
    }
    if (served) {
      v.el.dataset.team = String(served.team);
      v.el.classList.add(served.team === 0 ? 'lw-jade' : 'lw-ember');
      const stamp = el('div', 'lw-slip-stamp');
      stamp.append(el('b', '', crewName(served.team)), el('span', '', `+${formatScore(served.points)}`));
      v.el.querySelector('.lw-slip-front')!.append(stamp);
    }
  }
}
