import type { MatchState, TeamId } from '@line-war/sim';
import { roundsToWin } from '../render/format';
import { crewMark, FLAME, lanternIcon } from './icons';
import { crewName, formatMult, formatScore } from './text';

const HEAT_TIERS = 3;
/** Score count-up length (ms). */
export const COUNT_MS = 650;
const POP_MS = 1100;
const FLARE_MS = 900;
const THUMP_MS = 420;

const el = (tag: string, cls: string, text?: string): HTMLElement => {
  const e = document.createElement(tag);
  e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

const easeOut = (x: number) => 1 - (1 - x) ** 3;

/**
 * A crew's hanging wooden plaque: name, round score (counts up on serve), Heat as 0-3 flames
 * with the multiplier, and rounds won as small lanterns.
 */
export class CrewSign {
  readonly root: HTMLElement;
  /** The score number (score tokens fly into it). */
  readonly score: HTMLElement;
  private mult: HTMLElement;
  private flames: HTMLElement[] = [];
  private lanterns: HTMLElement;
  private pops: { el: HTMLElement; until: number }[] = [];
  private flares: { el: HTMLElement; cls: string; until: number }[] = [];

  private target = 0;
  private from = 0;
  private shownScore = -1;
  private tweenStart = 0;
  /** A score token is in flight: hold the count-up until it lands. */
  private holdUntil = 0;
  private thumpUntil = 0;
  private heat = -1;
  private mulShown = '';
  private rounds = '';

  constructor(
    readonly team: TeamId,
    private now: () => number,
    private reducedMotion: () => boolean,
  ) {
    const side = team === 0 ? 'lw-jade' : 'lw-ember';
    this.root = el('section', `lw-sign ${side}`);
    this.root.setAttribute('aria-label', `${crewName(team)} crew`);
    const board = el('div', 'lw-sign-board');
    const head = el('div', 'lw-sign-head');
    const mark = el('span', 'lw-sign-mark');
    mark.innerHTML = crewMark(team);
    this.lanterns = el('div', 'lw-sign-rounds');
    this.lanterns.setAttribute('aria-label', 'Rounds won');
    head.append(mark, el('span', 'lw-sign-name', crewName(team)), this.lanterns);
    this.score = el('div', 'lw-sign-score', '0');
    this.score.setAttribute('aria-live', 'off');
    const heat = el('div', 'lw-sign-heat');
    heat.setAttribute('aria-label', 'Heat');
    const flames = el('div', 'lw-flames');
    for (let i = 0; i < HEAT_TIERS; i++) {
      const f = el('span', 'lw-flame');
      f.innerHTML = FLAME;
      this.flames.push(f);
      flames.append(f);
    }
    this.mult = el('span', 'lw-sign-mult', '×1');
    heat.append(flames, this.mult);
    const row = el('div', 'lw-sign-row');
    row.append(this.score, heat);
    board.append(head, row, el('div', 'lw-sign-trim'));
    this.root.append(el('span', 'lw-sign-rope lw-sign-rope--l'), el('span', 'lw-sign-rope lw-sign-rope--r'), board);
  }

  /** Hold the next count-up until `until` (renderer ms): a score token is flying in. */
  deferCount(until: number): void {
    this.holdUntil = until;
  }

  /** Points arrive: pop the amount under the plaque and thump the board. */
  land(points: number): void {
    this.pop(`+${formatScore(points)}`);
    if (this.reducedMotion()) return;
    this.root.classList.remove('lw-sign--thump');
    void this.root.offsetWidth; // restart the CSS animation
    this.root.classList.add('lw-sign--thump');
    this.thumpUntil = this.now() + THUMP_MS;
  }

  render(s: MatchState): void {
    const now = this.now();
    const t = s.teams[this.team];
    this.renderScore(t.score, now);
    this.renderHeat(s, t.heat, now);
    const need = roundsToWin(s);
    const key = `${t.roundsWon}/${need}`;
    if (key !== this.rounds) {
      this.rounds = key;
      const frag: string[] = [];
      for (let i = 0; i < need; i++) frag.push(lanternIcon(`lw-mini-lantern${i < t.roundsWon ? ' lw-lit' : ''}`));
      this.lanterns.innerHTML = frag.join('');
      this.lanterns.setAttribute('aria-label', `Rounds won: ${t.roundsWon} of ${need}`);
    }
    this.pops = this.pops.filter((p) => (now < p.until ? true : (p.el.remove(), false)));
    this.flares = this.flares.filter((f) => (now < f.until ? true : (f.el.classList.remove(f.cls), false)));
    if (this.thumpUntil && now >= this.thumpUntil) {
      this.thumpUntil = 0;
      this.root.classList.remove('lw-sign--thump');
    }
  }

  /** The number currently displayed (mid count-up it trails the real score). */
  get displayedScore(): number {
    return this.shownScore;
  }

  private renderScore(score: number, now: number): void {
    if (score !== this.target) {
      // Count up on gains; snap on resets (new round) or when motion is reduced.
      const snap = score < this.target || this.reducedMotion();
      this.from = snap ? score : Math.max(this.shownScore, 0);
      this.target = score;
      this.tweenStart = snap ? now : Math.max(now, this.holdUntil);
    }
    const k = Math.max(0, Math.min(1, (now - this.tweenStart) / COUNT_MS));
    const v = Math.round(this.from + (this.target - this.from) * easeOut(k));
    if (v !== this.shownScore) {
      this.shownScore = v;
      const txt = formatScore(v);
      // Long scores step the type down so the plaque never overflows.
      const size = txt.length >= 6 ? 'xs' : txt.length >= 5 ? 's' : 'm';
      if (this.score.dataset.size !== size) this.score.dataset.size = size;
      this.score.textContent = txt;
    }
  }

  private renderHeat(s: MatchState, heat: number, now: number): void {
    if (heat === this.heat) return;
    const prev = this.heat;
    this.heat = heat;
    this.root.dataset.heat = String(heat);
    this.flames.forEach((f, i) => f.classList.toggle('lw-lit', i < heat));
    const m = formatMult(s.config.tuning.heatMultipliers[heat] ?? 1);
    if (m !== this.mulShown) {
      this.mulShown = m;
      this.mult.textContent = m;
    }
    if (prev < 0) return; // first frame: no fanfare
    // Roar the flames that just lit; smoke out the ones that went dark.
    for (let i = Math.min(prev, heat); i < Math.max(prev, heat); i++) {
      const cls = heat > prev ? 'lw-roar' : 'lw-smoke';
      const f = this.flames[i]!;
      f.classList.remove('lw-roar', 'lw-smoke');
      f.classList.add(cls);
      this.flares.push({ el: f, cls, until: now + FLARE_MS });
    }
    this.root.classList.toggle('lw-sign--hot', heat === HEAT_TIERS);
  }

  private pop(text: string): void {
    const p = el('span', 'lw-sign-pop', text);
    this.root.append(p);
    this.pops.push({ el: p, until: this.now() + POP_MS });
  }
}
