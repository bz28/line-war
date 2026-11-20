import type { MatchState, TeamId } from '@line-war/sim';
import { formatClock, phaseStartSeconds, roundSeconds, roundsToWin } from '../render/format';
import { crewMark, lanternIcon } from './icons';
import { crewName, formatMult, formatScore } from './text';

/** How long the brief phase banners stay up (seconds of round time). Kept short so the market stays visible. */
export const BRIEF_SECONDS = 2;
/** Prep countdown stamps for the final N seconds of prep. */
export const COUNTDOWN_FROM = 3;

export type MomentKind = 'prep' | 'count' | 'open' | 'rush' | 'lastCall' | 'roundOver' | 'matchOver';

export interface Moment {
  /** Stable identity: the DOM banner is rebuilt only when this changes. */
  key: string;
  kind: MomentKind;
  title: string;
  subtitle?: string;
  /** Round / match result cards stay up; banners and stamps are brief. */
  card?: { winner: TeamId | null; scores: [number, number]; rounds: [number, number]; need: number; footer: string };
}

/** The phase moment to show now, derived from state only (so it is deterministic and testable). */
export function currentMoment(s: MatchState): Moment | null {
  const phase = s.round.phase;
  const t = roundSeconds(s);
  const idx = s.round.index;
  const [a, b] = s.teams;
  switch (phase) {
    case 'prep': {
      const left = s.config.prepSeconds - t;
      if (left <= COUNTDOWN_FROM) {
        const n = Math.max(1, Math.ceil(left));
        return { key: `count-${idx}-${n}`, kind: 'count', title: String(n) };
      }
      if (t < BRIEF_SECONDS)
        return {
          key: `prep-${idx}`,
          kind: 'prep',
          title: idx === 0 ? 'Prep time' : `Round ${idx + 1}`,
          subtitle: `Stock your stations. Tickets arrive in ${formatClock(left)}.`,
        };
      return null;
    }
    case 'service':
      if (t - s.config.prepSeconds < BRIEF_SECONDS * 0.75)
        return { key: `open-${idx}`, kind: 'open', title: 'Open for service' };
      return null;
    case 'rush':
    case 'lastCall': {
      const start = phaseStartSeconds(s, phase) ?? 0;
      if (t - start >= BRIEF_SECONDS) return null;
      return phase === 'rush'
        ? { key: `rush-${idx}`, kind: 'rush', title: 'Dinner Rush', subtitle: `Every plate scores ${formatMult(s.config.tuning.rushMultiplier)}` }
        : { key: `last-${idx}`, kind: 'lastCall', title: 'Last call', subtitle: 'No new tickets. Clear the line!' };
    }
    case 'roundOver': {
      const w: TeamId | null = a.score === b.score ? null : a.score > b.score ? 0 : 1;
      const need = roundsToWin(s);
      const decided = a.roundsWon >= need || b.roundsWon >= need || idx + 1 >= s.config.bestOf;
      const secs = Math.ceil(s.round.intermissionTicks / s.config.tuning.tickRate);
      return {
        key: `round-${idx}`,
        kind: 'roundOver',
        title: w === null ? `Round ${idx + 1} is a tie` : `${crewName(w)} takes round ${idx + 1}`,
        card: {
          winner: w,
          scores: [a.score, b.score],
          rounds: [a.roundsWon, b.roundsWon],
          need,
          footer: decided ? 'Final tally coming up' : `Next round in ${secs}`,
        },
      };
    }
    case 'matchOver': {
      const w = s.winner;
      return {
        key: 'match',
        kind: 'matchOver',
        title: w === null ? 'A draw!' : `${crewName(w)} wins the match`,
        card: {
          winner: w,
          scores: [s.totalScores[0], s.totalScores[1]],
          rounds: [a.roundsWon, b.roundsWon],
          need: roundsToWin(s),
          footer: 'Total points across every round',
        },
      };
    }
  }
}

const el = (tag: string, cls: string, text?: string): HTMLElement => {
  const e = document.createElement(tag);
  e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

const OUT_MS = 380;

/**
 * Centred paper banners and stamps for phase changes, plus the round / match result card.
 * Only rebuilds when the moment's key changes; the footer countdown is updated in place.
 */
export class Moments {
  readonly root: HTMLElement;
  private current: { key: string; el: HTMLElement; footer: HTMLElement | null } | null = null;
  private outgoing: { el: HTMLElement; until: number }[] = [];

  constructor(private now: () => number) {
    this.root = el('div', 'lw-moments');
    this.root.setAttribute('aria-live', 'polite');
  }

  render(s: MatchState): void {
    const now = this.now();
    const m = currentMoment(s);
    if ((m?.key ?? null) !== (this.current?.key ?? null)) {
      if (this.current) {
        this.current.el.classList.add('lw-moment--out');
        this.outgoing.push({ el: this.current.el, until: now + OUT_MS });
      }
      this.current = m ? this.build(m) : null;
      if (this.current) this.root.append(this.current.el);
      this.root.classList.toggle('lw-moments--card', !!m?.card);
    } else if (m?.card && this.current?.footer && this.current.footer.textContent !== m.card.footer) {
      this.current.footer.textContent = m.card.footer;
    }
    this.outgoing = this.outgoing.filter((o) => (now < o.until ? true : (o.el.remove(), false)));
  }

  private build(m: Moment): { key: string; el: HTMLElement; footer: HTMLElement | null } {
    const root = el('div', `lw-moment lw-moment--${m.kind}`);
    root.dataset.moment = m.kind;
    if (!m.card) {
      root.append(el('div', 'lw-moment-title', m.title));
      if (m.subtitle) root.append(el('div', 'lw-moment-sub', m.subtitle));
      return { key: m.key, el: root, footer: null };
    }
    const c = m.card;
    if (c.winner !== null) root.classList.add(c.winner === 0 ? 'lw-jade' : 'lw-ember');
    root.append(el('div', 'lw-moment-title', m.title));
    const row = el('div', 'lw-result');
    ([0, 1] as const).forEach((team) => {
      const side = el('div', `lw-result-crew ${team === 0 ? 'lw-jade' : 'lw-ember'}${c.winner === team ? ' lw-won' : ''}`);
      const mark = el('span', 'lw-result-mark');
      mark.innerHTML = crewMark(team);
      const lanterns = el('span', 'lw-result-rounds');
      lanterns.innerHTML = Array.from({ length: c.need }, (_, i) => lanternIcon(`lw-mini-lantern${i < c.rounds[team] ? ' lw-lit' : ''}`)).join('');
      side.append(mark, el('span', 'lw-result-name', crewName(team)), el('span', 'lw-result-score', formatScore(c.scores[team])), lanterns);
      row.append(side);
      if (team === 0) row.append(el('span', 'lw-result-vs', 'vs'));
    });
    const footer = el('div', 'lw-moment-sub', c.footer);
    root.append(row, footer);
    return { key: m.key, el: root, footer };
  }

  dispose(): void {
    this.root.replaceChildren();
    this.current = null;
    this.outgoing = [];
  }
}
