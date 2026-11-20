import type { MatchState, TeamId } from '@line-war/sim';
import { formatClock, phaseStartSeconds, roundSeconds, roundsToWin } from '../render/format';
import { crewMark, lanternIcon } from './icons';
import { crewName, formatMult, formatScore } from './text';

/** One finished round's points and winner (the client's log of `roundEnd` events, ui/results.ts). */
export interface RoundLine {
  scores: readonly [number, number];
  winner: TeamId | null;
}

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
  card?: {
    winner: TeamId | null;
    scores: [number, number];
    rounds: [number, number];
    need: number;
    footer: string;
    /** What the big numbers are: "Round 2 points" or "Match points". */
    label: string;
    /** From round 2 on: every round so far and the match total, like the match-over ledger. */
    ledger?: { rounds: RoundLine[]; totals: [number, number] };
  };
}

/** The phase moment to show now, derived from state only (so it is deterministic and testable). */
export function currentMoment(s: MatchState, log: readonly RoundLine[] = []): Moment | null {
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
          // No number here: the banner is built once, and a frozen "0:15" would disagree with the
          // lantern clock ticking right above it.
          subtitle: 'Stock your stations before the first ticket drops.',
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
      // The earlier rounds come from the log; this one is read live, so it always matches the signs.
      const lines: RoundLine[] = idx > 0 && log.length >= idx ? [...log.slice(0, idx), { scores: [a.score, b.score], winner: w }] : [];
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
          label: `Round ${idx + 1} points`,
          ledger: lines.length ? { rounds: lines, totals: [s.totalScores[0], s.totalScores[1]] } : undefined,
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
          label: 'Match points',
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

export const OUT_MS = 380;

interface Built {
  key: string;
  kind: MomentKind;
  card: boolean;
  el: HTMLElement;
  footer: HTMLElement | null;
}

/**
 * Centred paper banners and stamps for phase changes, plus the round / match result card.
 * Only rebuilds when the moment's key changes; the footer countdown is updated in place.
 */
export class Moments {
  readonly root: HTMLElement;
  private current: Built | null = null;
  private outgoing: { el: HTMLElement; until: number; card: boolean }[] = [];
  /** A card waits off-stage until the card it replaces has finished leaving. */
  private enterAt = 0;
  private entered = true;

  /** True while a banner, stamp or card is showing. */
  get showing(): boolean {
    return this.current !== null;
  }

  /** Kind of the moment showing now (null when none). */
  get kind(): MomentKind | null {
    return this.current?.kind ?? null;
  }

  constructor(
    private now: () => number,
    private log: () => readonly RoundLine[] = () => [],
  ) {
    this.root = el('div', 'lw-moments');
    this.root.setAttribute('aria-live', 'polite');
  }

  render(s: MatchState): void {
    const now = this.now();
    const m = currentMoment(s, this.log());
    if ((m?.key ?? null) !== (this.current?.key ?? null)) {
      const prev = this.current;
      if (prev) {
        if (this.entered) {
          prev.el.classList.add('lw-moment--out');
          this.outgoing.push({ el: prev.el, until: now + OUT_MS, card: prev.card });
        } else prev.el.remove(); // never shown: drop it quietly
      }
      this.current = m ? this.build(m) : null;
      // Cards never share the stage: a card waits for the one before it (round -> match over),
      // and anything after a card waits for it to clear, so two cards are never on screen at once.
      const lastOut = this.outgoing.reduce((t, o) => (o.card || this.current?.card ? Math.max(t, o.until) : t), 0);
      this.enterAt = lastOut;
      this.entered = false;
      this.root.classList.toggle('lw-moments--card', !!m?.card);
    } else if (m?.card && this.current?.footer && this.current.footer.textContent !== m.card.footer) {
      this.current.footer.textContent = m.card.footer;
    }
    this.outgoing = this.outgoing.filter((o) => (now < o.until ? true : (o.el.remove(), false)));
    if (this.current && !this.entered && now >= this.enterAt) {
      this.entered = true;
      this.root.append(this.current.el);
    }
  }

  /** True once the current moment is on stage (false while it waits for a card to leave). */
  get onStage(): boolean {
    return this.current !== null && this.entered;
  }

  private build(m: Moment): Built {
    const root = el('div', `lw-moment lw-moment--${m.kind}`);
    root.dataset.moment = m.kind;
    if (!m.card) {
      root.append(el('div', 'lw-moment-title', m.title));
      if (m.subtitle) root.append(el('div', 'lw-moment-sub', m.subtitle));
      return { key: m.key, kind: m.kind, card: false, el: root, footer: null };
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
      if (team === 0) {
        const mid = el('span', 'lw-result-vs');
        mid.append(el('b', '', 'vs'), el('span', 'lw-result-label', c.label));
        row.append(mid);
      }
    });
    const footer = el('div', 'lw-moment-sub', c.footer);
    root.append(row);
    if (c.ledger) root.append(roundLedger(c.ledger));
    root.append(footer);
    return { key: m.key, kind: m.kind, card: true, el: root, footer };
  }

  dispose(): void {
    this.root.replaceChildren();
    this.current = null;
    this.outgoing = [];
  }
}

/**
 * The round card's receipt: each round so far (the winner's cell stamped with their mark) and
 * the match total. Same rows, numbers and marks as the match-over ledger (ui/results.ts).
 */
function roundLedger(l: { rounds: RoundLine[]; totals: [number, number] }): HTMLElement {
  const box = el('div', 'lw-rledger');
  box.setAttribute('role', 'table');
  box.setAttribute('aria-label', 'Points per round');
  const cell = (team: TeamId, v: number, won: boolean) => {
    const c = el('span', `lw-rledger-pts ${team === 0 ? 'lw-jade' : 'lw-ember'}${won ? ' lw-won' : ''}`);
    c.setAttribute('role', 'cell');
    c.append(el('span', '', formatScore(v)));
    if (won) {
      const mark = el('span', 'lw-rledger-mark');
      mark.innerHTML = crewMark(team);
      c.append(mark);
    }
    return c;
  };
  const row = (label: string, a: HTMLElement, b: HTMLElement, cls = '') => {
    const r = el('div', `lw-rledger-row${cls}`);
    r.setAttribute('role', 'row');
    const th = el('span', 'lw-rledger-label', label);
    th.setAttribute('role', 'rowheader');
    r.append(a, th, b);
    return r;
  };
  l.rounds.forEach((x, i) => {
    const r = row(`Round ${i + 1}`, cell(0, x.scores[0], x.winner === 0), cell(1, x.scores[1], x.winner === 1), i === l.rounds.length - 1 ? ' lw-now' : '');
    r.dataset.round = String(i + 1);
    box.append(r);
  });
  box.append(row('Total', cell(0, l.totals[0], false), cell(1, l.totals[1], false), ' lw-total'));
  return box;
}
