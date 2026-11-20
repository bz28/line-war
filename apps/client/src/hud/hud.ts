import type { MatchState } from '@line-war/sim';
import type { Renderer } from '../render/types';
import { LanternClock } from './clock';
import { Moments } from './moments';
import { CrewSign } from './signs';
import { TicketLine } from './slips';
import './hud.css';

export interface HudOptions {
  /** Millisecond clock for animations (default performance.now). */
  now?: () => number;
  /** Override prefers-reduced-motion (tests). */
  reducedMotion?: boolean;
}

/**
 * The in-match DOM HUD ("Lantern Night Market"): crew signs left and right, the ticket line
 * with the lantern clock across the top, and centred phase moments. Implements Renderer so
 * main.ts drives it exactly like the world canvas. Every DOM node is built once; frames only
 * write text and CSS variables that changed, and never read layout.
 */
export class HudRenderer implements Renderer {
  readonly root: HTMLElement;
  private signs: [CrewSign, CrewSign];
  private line: TicketLine;
  private clock: LanternClock;
  private moments: Moments;
  private lastTick = -1;
  private phase = '';

  constructor(host: HTMLElement, opts: HudOptions = {}) {
    const now = opts.now ?? (() => performance.now());
    const mq = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    const reduced = () => opts.reducedMotion ?? mq?.matches ?? false;

    this.root = document.createElement('div');
    this.root.className = 'lw-hud';
    this.signs = [new CrewSign(0, now, reduced), new CrewSign(1, now, reduced)];
    this.line = new TicketLine(now, reduced);
    this.clock = new LanternClock();
    this.moments = new Moments(now);

    const band = document.createElement('div');
    band.className = 'lw-hud-band';
    const lights = document.createElement('div');
    lights.className = 'lw-lights';
    lights.setAttribute('aria-hidden', 'true');
    const centre = document.createElement('div');
    centre.className = 'lw-line-wrap';
    centre.append(this.line.root, this.clock.root);
    band.append(lights, this.signs[0].root, centre, this.signs[1].root);
    this.root.append(band, this.moments.root);
    host.append(this.root);
  }

  onTick(s: MatchState): void {
    if (s.tick === this.lastTick) return;
    this.lastTick = s.tick;
    this.line.onTick(s);
    this.signs[0].onTick(s);
    this.signs[1].onTick(s);
  }

  render(s: MatchState): void {
    if (s.round.phase !== this.phase) {
      this.phase = s.round.phase;
      this.root.dataset.phase = s.round.phase;
    }
    this.signs[0].render(s);
    this.signs[1].render(s);
    this.line.render(s);
    this.clock.render(s);
    this.moments.render(s);
  }

  dispose(): void {
    this.line.dispose();
    this.moments.dispose();
    this.root.remove();
  }
}
