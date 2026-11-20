import type { MatchState } from '@line-war/sim';
import { formatClock, roundSecondsLeft } from '../render/format';
import { CLOCK_LANTERN } from './icons';
import { phaseName, roundLabel } from './text';

/**
 * The round clock: the big paper lantern in the middle of the ticket line. During prep it
 * counts down to service; afterwards it shows time left in the round. It glows hotter in
 * Dinner Rush and flickers fast in Last call (both via a data-phase attribute + CSS).
 */
export class LanternClock {
  readonly root: HTMLElement;
  private time: HTMLElement;
  private tag: HTMLElement;
  private round: HTMLElement;
  private shown = { time: '', tag: '', round: '', phase: '' };

  constructor() {
    this.root = document.createElement('div');
    this.root.className = 'lw-clock';
    this.root.setAttribute('role', 'timer');
    const lantern = document.createElement('div');
    lantern.className = 'lw-clock-lantern';
    lantern.innerHTML = `<span class="lw-clock-glow"></span>${CLOCK_LANTERN}`;
    this.time = document.createElement('div');
    this.time.className = 'lw-clock-time';
    lantern.append(this.time);
    this.tag = document.createElement('div');
    this.tag.className = 'lw-clock-tag';
    this.round = document.createElement('div');
    this.round.className = 'lw-clock-round';
    this.root.append(lantern, this.tag, this.round);
  }

  render(s: MatchState): void {
    const phase = s.round.phase;
    const secs =
      phase === 'prep' ? s.config.prepSeconds - s.round.tick / s.config.tuning.tickRate : roundSecondsLeft(s);
    this.set('time', this.time, formatClock(secs));
    this.set('tag', this.tag, phaseName(s));
    this.set('round', this.round, roundLabel(s));
    if (phase !== this.shown.phase) {
      this.shown.phase = phase;
      this.root.dataset.phase = phase;
    }
  }

  private set(key: 'time' | 'tag' | 'round', node: HTMLElement, text: string): void {
    if (this.shown[key] === text) return;
    this.shown[key] = text;
    node.textContent = text;
  }
}
