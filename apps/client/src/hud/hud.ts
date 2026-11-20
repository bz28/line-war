import type { MatchState, TeamId, Vec2 } from '@line-war/sim';
import { passCenter } from '../render/effects';
import type { PlayerId } from '@line-war/sim';
import { Coach, type CoachKeys, type CoachStorage } from './coach';
import { FLY_MS, ScoreFlyers } from './flyers';
import { formatScore } from './text';
import type { Renderer } from '../render/types';
import { LanternClock } from './clock';
import { Moments } from './moments';
import { CrewSign } from './signs';
import { TicketLine } from './slips';
import { bankLabel, CharmCallout, heatRaised } from './charms';
import { charmIcon } from './charmIcon';

/** A banked charm's flight from the carrier to the crew sign (ms): a touch slower than a score token. */
export const CHARM_FLY_MS = 820;
import './hud.css';

export interface HudOptions {
  /** Millisecond clock for animations (default performance.now). */
  now?: () => number;
  /** Override prefers-reduced-motion (tests). */
  reducedMotion?: boolean;
  /** World position (tiles) -> client px, from the world renderer; enables score tokens flying to the signs. */
  locate?: (pos: Vec2) => Vec2 | null;
  /** First-match coach for this local player (omit for no coach, e.g. all bots or already seen). */
  coach?: { player: PlayerId; keys: CoachKeys; storage: CoachStorage | null };
  /** A flying score token reached its crew sign (audio's tick-chime). */
  onScoreLand?: (team: 0 | 1) => void;
  /** The local players' display charm per crew (hung from that crew's sign). */
  displayCharms?: Partial<Record<TeamId, string>>;
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
  private flyers: ScoreFlyers;
  private callout: CharmCallout;
  private prevHeat: [number, number] = [0, 0];
  readonly coach: Coach | null;
  private now: () => number;
  private reduced: () => boolean;
  private locate: ((pos: Vec2) => Vec2 | null) | null;
  private onScoreLand: ((team: 0 | 1) => void) | null;
  private lastTick = -1;
  private phase = '';
  private coaching = false;

  constructor(host: HTMLElement, opts: HudOptions = {}) {
    const now = opts.now ?? (() => performance.now());
    const mq = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    const reduced = () => opts.reducedMotion ?? mq?.matches ?? false;
    this.now = now;
    this.reduced = reduced;
    this.locate = opts.locate ?? null;
    this.onScoreLand = opts.onScoreLand ?? null;

    this.root = document.createElement('div');
    this.root.className = 'lw-hud';
    this.signs = [new CrewSign(0, now, reduced), new CrewSign(1, now, reduced)];
    this.line = new TicketLine(now, reduced);
    this.clock = new LanternClock();
    this.moments = new Moments(now);
    this.callout = new CharmCallout(now);
    for (const team of [0, 1] as const) {
      const d = opts.displayCharms?.[team];
      if (d) this.signs[team].setDisplay(d);
    }

    const band = document.createElement('div');
    band.className = 'lw-hud-band';
    const lights = document.createElement('div');
    lights.className = 'lw-lights';
    lights.setAttribute('aria-hidden', 'true');
    const centre = document.createElement('div');
    centre.className = 'lw-line-wrap';
    centre.append(this.line.root, this.clock.root);
    band.append(lights, this.signs[0].root, centre, this.signs[1].root, this.callout.root);
    const fly = document.createElement('div');
    fly.className = 'lw-flyers';
    this.flyers = new ScoreFlyers(fly);
    this.coach = opts.coach ? new Coach(opts.coach.player, opts.coach.keys, now, this.locate, opts.coach.storage) : null;
    const edge = document.createElement('div');
    edge.className = 'lw-edge';
    edge.setAttribute('aria-hidden', 'true');
    this.root.append(edge, band, this.moments.root, fly);
    if (this.coach) this.root.append(this.coach.root);
    host.append(this.root);
  }

  onTick(s: MatchState): void {
    if (s.tick === this.lastTick) return;
    this.lastTick = s.tick;
    this.line.onTick(s);
    this.coach?.onTick(s);
    for (const e of s.events) {
      if (e.type === 'delivered') this.serve(s, e.team, e.points);
      else if (e.type === 'charmSpawned') this.callout.show(e.variant);
      else if (e.type === 'charmBanked') this.bankCharm(s, e.team, e.player, e.variant);
    }
    this.prevHeat = [s.teams[0].heat, s.teams[1].heat];
  }

  /** Charms banked per crew this match (row on each sign). */
  bankedCharms(team: TeamId): readonly string[] {
    return this.signs[team].bankedCharms;
  }

  /** A charm is banked: the figure flies from its carrier into the crew sign, then "+50, Heat up". */
  private bankCharm(s: MatchState, team: TeamId, player: number, variant: string): void {
    const sign = this.signs[team];
    const label = bankLabel(s, heatRaised(s.events, team, this.prevHeat[team]));
    const land = () => {
      sign.charmLand(variant, label);
      this.onScoreLand?.(team);
    };
    const carrier = s.players[player as 0 | 1 | 2 | 3];
    const from = this.locate && !this.reduced() && carrier ? this.locate({ x: carrier.pos.x, y: carrier.pos.y - 1 }) : null;
    if (from) {
      const r = sign.charmRow.getBoundingClientRect();
      const to = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      if (this.flyers.launch(team, charmIcon(variant, { plain: true }), from, to, land, { html: true, cls: 'lw-fly--charm', ms: CHARM_FLY_MS })) {
        sign.deferCount(this.now() + CHARM_FLY_MS);
        return;
      }
    }
    land();
  }

  /** A serve pays out: the points fly from the crew's pass into its sign (or land at once). */
  private serve(s: MatchState, team: 0 | 1, points: number): void {
    const sign = this.signs[team];
    const pass = this.locate && !this.reduced() ? passCenter(s, team) : null;
    const from = pass && this.locate ? this.locate(pass) : null;
    if (from) {
      const r = sign.score.getBoundingClientRect();
      const to = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      if (
        this.flyers.launch(team, `+${formatScore(points)}`, from, to, () => {
          sign.land(points);
          this.onScoreLand?.(team);
        })
      ) {
        sign.deferCount(this.now() + FLY_MS);
        return;
      }
    }
    sign.land(points);
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
    this.callout.render();
    if (this.coach) {
      // The 3-2-1 stamps share the stage with the coach (prep is its best window); banners and
      // cards still get it to step aside.
      const kind = this.moments.kind;
      this.coach.render(s, this.moments.onStage && kind !== 'count');
      const coaching = this.coach.noteShowing;
      if (coaching !== this.coaching) {
        this.coaching = coaching;
        this.root.classList.toggle('lw-hud--coaching', coaching);
      }
    }
  }

  dispose(): void {
    this.line.dispose();
    this.flyers.dispose();
    this.coach?.dispose();
    this.moments.dispose();
    this.root.remove();
  }
}
