import { tileOwner } from '@line-war/sim';
import type { MatchState, PlayerState, StationState, TeamId, Ticket, TileDef, Vec2 } from '@line-war/sim';
import { EffectQueue, effectAge, eventsToEffects, shakeOffset, type Effect } from './effects';
import {
  chopProgress,
  criticExclusiveSeconds,
  dashCooldownFraction,
  extinguishProgress,
  formatClock,
  phaseBanner,
  phaseLabel,
  roundSecondsLeft,
  roundsToWin,
  sortTickets,
  ticketTimeLeft,
  ticketValue,
  vesselProgress,
  washProgress,
} from './format';
import { PositionTracker } from './interp';
import { computeLayout, fitToViewport, ticketSlots, tileRect, worldToScreen, type Layout, type Rect } from './layout';
import {
  BG,
  DOOR_FLOOR,
  INGREDIENT_STYLE,
  INK,
  KITCHEN_FLOOR,
  MARKET_FLOOR,
  MARKET_FLOOR_ALT,
  MUTED,
  PANEL,
  PANEL_EDGE,
  PLATE_CLEAN,
  PLATE_DIRTY,
  TEAM_COLORS,
  TEAM_DARK,
  TEAM_NAMES,
  TILE_COLORS,
  WALL,
  stationLabel,
  withAlpha,
} from './palette';
import { bar, circle, drawFood, drawItem, outlinedText, ring, roundRect, text } from './shapes';
import type { Renderer } from './types';

/** Minimal canvas surface the renderer needs (an HTMLCanvasElement satisfies it; tests pass a fake). */
export interface CanvasLike {
  width: number;
  height: number;
  style?: { width: string; height: string };
  getContext(id: '2d'): CanvasRenderingContext2D | null;
}

export interface GreyboxOptions {
  /** Millisecond clock for effects and animation (default performance.now). */
  now?: () => number;
  /** Fit the canvas to the window and follow window resizes (default true when `window` exists). */
  autoResize?: boolean;
}

const PROGRESS_COLORS = { cook: '#6fdc6f', burn: '#ffb347', fire: '#ff4a3a', work: '#9be89b' } as const;

/**
 * Greybox renderer: plain shapes and text on a Canvas2D. Readable enough to debug the sim
 * and to run the human playtest. Never mutates the MatchState it draws.
 */
export class GreyboxRenderer implements Renderer {
  private ctx: CanvasRenderingContext2D;
  private layout: Layout;
  private scale = 1;
  private now: () => number;
  private lastTick: number | null = null;
  private players = new PositionTracker<number>();
  private floor = new PositionTracker<number>();
  private effects = new EffectQueue();
  private onWindowResize: (() => void) | null = null;

  constructor(
    private canvas: CanvasLike,
    state: MatchState,
    opts: GreyboxOptions = {},
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas not supported');
    this.ctx = ctx;
    this.now = opts.now ?? (() => (typeof performance !== 'undefined' ? performance.now() : 0));
    this.layout = computeLayout(state.arena.width, state.arena.height);
    const hasWindow = typeof window !== 'undefined' && typeof window.addEventListener === 'function';
    if ((opts.autoResize ?? true) && hasWindow) {
      this.onWindowResize = () => this.resize(window.innerWidth, window.innerHeight);
      window.addEventListener('resize', this.onWindowResize);
      this.onWindowResize();
    } else {
      this.resize(this.layout.width, this.layout.height);
    }
  }

  /** Fit the logical layout into a width x height (CSS px) box, keeping aspect ratio. */
  resize(width: number, height: number): void {
    const dpr = typeof window !== 'undefined' && window.devicePixelRatio ? window.devicePixelRatio : 1;
    const vp = fitToViewport(this.layout.width, this.layout.height, width, height, dpr);
    this.canvas.width = vp.pixelWidth;
    this.canvas.height = vp.pixelHeight;
    if (this.canvas.style) {
      this.canvas.style.width = `${vp.cssWidth}px`;
      this.canvas.style.height = `${vp.cssHeight}px`;
    }
    this.scale = vp.scale;
  }

  dispose(): void {
    if (this.onWindowResize && typeof window !== 'undefined') window.removeEventListener('resize', this.onWindowResize);
    this.onWindowResize = null;
    this.effects.clear();
  }

  render(s: MatchState, alpha = 0): void {
    const now = this.now();
    this.ingest(s, now);
    const { ctx, layout } = this;
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, layout.width, layout.height);

    const fx = this.effects.active(now);
    this.drawTiles(s, now);
    this.drawFires(s, now);
    this.drawFloorItems(s, alpha);
    for (const p of s.players) this.drawPlayer(s, p, alpha, now, fx);
    this.drawWorldEffects(fx, now);
    this.drawTopBar(s, fx, now);
    this.drawTickets(s, fx, now);
    this.drawBanner(s);
  }

  // ---------- state tracking ----------

  onTick(s: MatchState) {
    this.ingest(s, this.now());
  }

  /** Once per new sim tick: remember positions and turn this tick's events into effects. */
  private ingest(s: MatchState, now: number) {
    if (s.tick === this.lastTick) return;
    if (this.lastTick !== null && s.tick < this.lastTick) this.effects.clear(); // new match
    this.players.update(s.tick, s.players.map((p) => [p.id, p.pos] as [number, Vec2]));
    this.floor.update(s.tick, s.floorItems.map((f) => [f.item.id, f.pos] as [number, Vec2]));
    this.effects.push(eventsToEffects(s, s.events, now));
    this.lastTick = s.tick;
  }

  // ---------- world ----------

  private drawTiles(s: MatchState, now: number) {
    const { ctx, layout } = this;
    const w = s.arena.width;
    ctx.fillStyle = WALL;
    ctx.fillRect(layout.world.x, layout.world.y, layout.world.w, layout.world.h);
    s.arena.tiles.forEach((t, i) => {
      const r = tileRect(layout, w, i);
      const zone = s.arena.zones[i];
      const owner = tileOwner(s, i);
      if (t.kind === 'wall') {
        ctx.fillStyle = WALL;
        ctx.fillRect(r.x, r.y, r.w, r.h);
        return;
      }
      // Floor under everything.
      if (zone === 'market') {
        const alt = ((i % w) + Math.floor(i / w)) % 2 === 0;
        ctx.fillStyle = alt ? MARKET_FLOOR : MARKET_FLOOR_ALT;
      } else if (zone === 'none') {
        ctx.fillStyle = DOOR_FLOOR;
      } else {
        ctx.fillStyle = KITCHEN_FLOOR;
      }
      ctx.fillRect(r.x, r.y, r.w, r.h);
      if (owner !== null) {
        ctx.fillStyle = withAlpha(TEAM_COLORS[owner], 0.07);
        ctx.fillRect(r.x, r.y, r.w, r.h);
      }
      if (t.kind === 'floor') {
        if (zone === 'none') this.drawDoorway(r);
        return;
      }
      const st = s.stations[String(i)];
      this.drawStation(s, t, st, r, owner, now);
    });
    // Market label.
    const marketCols = s.arena.zones.slice(0, w).map((z, x) => (z === 'market' ? x : -1)).filter((x) => x >= 0);
    if (marketCols.length) {
      const cx = layout.world.x + ((marketCols[0]! + marketCols[marketCols.length - 1]! + 1) / 2) * layout.tile;
      text(ctx, 'MARKET', cx, layout.world.y + layout.world.h - layout.tile * 1.5, withAlpha('#ffd27a', 0.25), 22, 'center', 800);
    }
  }

  private drawDoorway(r: Rect) {
    const { ctx } = this;
    ctx.strokeStyle = '#d9c27a66';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(r.x + r.w / 2, r.y + 3);
    ctx.lineTo(r.x + r.w / 2, r.y + r.h - 3);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  private drawStation(s: MatchState, t: TileDef, st: StationState | undefined, r: Rect, owner: TeamId | null, now: number) {
    const { ctx } = this;
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    const T = r.w;
    const pad = 2;
    ctx.fillStyle = TILE_COLORS[t.kind];
    roundRect(ctx, r.x + pad, r.y + pad, r.w - pad * 2, r.h - pad * 2, 5);
    ctx.fill();
    ctx.strokeStyle = '#00000066';
    ctx.lineWidth = 1;
    ctx.stroke();

    switch (t.kind) {
      case 'counter':
        ctx.fillStyle = '#ffffff14';
        ctx.fillRect(r.x + pad, r.y + pad, r.w - pad * 2, 4);
        break;
      case 'pantry':
        if (t.ingredient) {
          ctx.globalAlpha = 0.85;
          drawFood(ctx, { kind: t.ingredient, state: 'raw' }, cx, cy + 2, T * 0.26);
          ctx.globalAlpha = 1;
        }
        break;
      case 'crate': {
        ctx.strokeStyle = '#00000055';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(r.x + 5, r.y + 5);
        ctx.lineTo(r.x + r.w - 5, r.y + r.h - 5);
        ctx.moveTo(r.x + r.w - 5, r.y + 5);
        ctx.lineTo(r.x + 5, r.y + r.h - 5);
        ctx.stroke();
        const stock = st?.stock ?? 0;
        if (t.ingredient) {
          ctx.globalAlpha = stock > 0 ? 1 : 0.3;
          drawFood(ctx, { kind: t.ingredient, state: 'raw' }, cx, cy, T * 0.24);
          ctx.globalAlpha = 1;
        }
        outlinedText(ctx, `x${stock}`, r.x + r.w - 4, r.y + r.h - 9, stock > 0 ? '#fff' : '#ff7b7b', 12, 'right');
        break;
      }
      case 'board':
        ctx.strokeStyle = '#5a4528';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(r.x + 7, r.y + r.h - 8);
        ctx.lineTo(r.x + r.w - 7, r.y + r.h - 8);
        ctx.stroke();
        break;
      case 'stove':
        circle(ctx, cx, cy, T * 0.36, '#2b2d33');
        break;
      case 'sink':
        ctx.fillStyle = '#1f3d52';
        roundRect(ctx, r.x + 7, r.y + 9, r.w - 14, r.h - 16, 6);
        ctx.fill();
        break;
      case 'plates': {
        const n = st?.stock ?? 0;
        for (let k = Math.min(n, 4) - 1; k >= 0; k--) {
          circle(ctx, cx, cy + 4 - k * 3, T * 0.28, PLATE_CLEAN);
          ctx.strokeStyle = '#00000055';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(cx, cy + 4 - k * 3, T * 0.28, 0, Math.PI * 2);
          ctx.stroke();
        }
        outlinedText(ctx, `x${n}`, r.x + r.w - 4, r.y + r.h - 9, n > 0 ? '#fff' : '#ff7b7b', 12, 'right');
        break;
      }
      case 'pass': {
        const team = owner;
        if (team !== null) {
          ctx.fillStyle = TEAM_COLORS[team];
          roundRect(ctx, r.x + pad, r.y + pad, r.w - pad * 2, r.h - pad * 2, 5);
          ctx.fill();
        }
        ctx.fillStyle = '#ffffffcc';
        ctx.beginPath();
        ctx.moveTo(cx - 8, cy + 6);
        ctx.lineTo(cx, cy - 6);
        ctx.lineTo(cx + 8, cy + 6);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 'trash':
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, T * 0.26, 0, Math.PI * 2);
        ctx.moveTo(cx - 7, cy - 7);
        ctx.lineTo(cx + 7, cy + 7);
        ctx.moveTo(cx + 7, cy - 7);
        ctx.lineTo(cx - 7, cy + 7);
        ctx.stroke();
        break;
      default:
        break;
    }

    // Vessel on a stove.
    if (st?.vessel) this.drawVessel(s, st, cx, cy, T, now);

    // Item resting on the surface.
    if (st?.item) drawItem(ctx, st.item, cx, cy, T * 0.22);

    // Board chop progress.
    if (t.kind === 'board' && st && st.workTicks > 0) {
      bar(ctx, r.x + 5, r.y + r.h - 8, r.w - 10, 5, chopProgress(s, st.workTicks), PROGRESS_COLORS.work);
    }
    // Sink: dirty plates waiting + wash progress.
    if (t.kind === 'sink' && st) {
      if (st.dirtyPlates > 0) {
        circle(ctx, cx, cy, T * 0.2, PLATE_DIRTY);
        outlinedText(ctx, `x${st.dirtyPlates}`, r.x + r.w - 4, r.y + r.h - 9, '#ffd27a', 12, 'right');
      }
      if (st.workTicks > 0) bar(ctx, r.x + 5, r.y + r.h - 7, r.w - 10, 5, washProgress(s, st.workTicks), '#9ad0ff');
    }

    const label = stationLabel(t);
    if (label) outlinedText(ctx, label, r.x + 4, r.y + 10, '#ffffffdd', 10, 'left');
  }

  private drawVessel(s: MatchState, st: StationState, cx: number, cy: number, T: number, now: number) {
    const v = st.vessel!;
    const { ctx } = this;
    const burnt = v.status === 'burnt' || v.status === 'fire';
    if (v.kind === 'pan') {
      ctx.fillStyle = '#c9ccd4';
      ctx.fillRect(cx + T * 0.2, cy - 2, T * 0.28, 4); // handle
      circle(ctx, cx, cy, T * 0.27, burnt ? '#3a3a3a' : '#8e939e');
      circle(ctx, cx, cy, T * 0.22, '#55595f');
    } else {
      ctx.fillStyle = '#c9ccd4';
      ctx.fillRect(cx - T * 0.38, cy - 3, T * 0.76, 6); // handles
      ctx.fillStyle = burnt ? '#3a3a3a' : '#8e939e';
      roundRect(ctx, cx - T * 0.27, cy - T * 0.27, T * 0.54, T * 0.54, 6);
      ctx.fill();
      ctx.fillStyle = '#55595f';
      roundRect(ctx, cx - T * 0.22, cy - T * 0.22, T * 0.44, T * 0.44, 5);
      ctx.fill();
    }
    const n = v.contents.length;
    v.contents.forEach((f, i) => {
      const a = n <= 1 ? 0 : (Math.PI * 2 * i) / n - Math.PI / 2;
      const off = n <= 1 ? 0 : T * 0.1;
      drawFood(ctx, f, cx + Math.cos(a) * off, cy + Math.sin(a) * off, n <= 1 ? T * 0.15 : T * 0.1);
    });
    if (v.kind === 'pot' && v.status === 'empty' && n > 0) {
      outlinedText(ctx, `${n}/${s.config.tuning.potCapacity}`, cx, cy + T * 0.36, '#fff', 10);
    }
    const p = vesselProgress(s, v);
    if (p) {
      const blink = p.kind !== 'cook' && Math.floor(now / 200) % 2 === 0;
      ring(ctx, cx, cy, T * 0.42, p.fraction, blink ? '#ffffff' : PROGRESS_COLORS[p.kind], 4);
      if (v.status === 'done') outlinedText(ctx, '✓', cx + T * 0.32, cy - T * 0.3, '#6fdc6f', 14);
      if (v.status === 'burnt') outlinedText(ctx, '!', cx + T * 0.32, cy - T * 0.3, '#ff4a3a', 16);
    }
  }

  private drawFires(s: MatchState, now: number) {
    const { ctx, layout } = this;
    for (const f of s.fires) {
      const r = tileRect(layout, s.arena.width, f.tile);
      const cx = r.x + r.w / 2;
      const base = r.y + r.h - 6;
      ctx.fillStyle = withAlpha('#ff5a00', 0.35 + 0.15 * Math.sin(now / 90 + f.tile));
      ctx.fillRect(r.x, r.y, r.w, r.h);
      const flames: [number, number, string][] = [
        [-0.22, 0.55, '#ff3b1a'],
        [0.2, 0.6, '#ff3b1a'],
        [0, 0.8, '#ff8a1a'],
        [0, 0.45, '#ffe14a'],
      ];
      flames.forEach(([dx, hgt, color], k) => {
        const flick = 1 + 0.18 * Math.sin(now / (60 + k * 17) + k * 2 + f.tile);
        const h = r.h * hgt * flick;
        const w = r.w * 0.22;
        const x = cx + dx * r.w;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x - w, base);
        ctx.quadraticCurveTo(x - w * 0.6, base - h * 0.6, x, base - h);
        ctx.quadraticCurveTo(x + w * 0.6, base - h * 0.6, x + w, base);
        ctx.closePath();
        ctx.fill();
      });
      outlinedText(ctx, 'FIRE', cx, r.y + 9, '#ffe14a', 10);
      if (f.extinguishTicks > 0) bar(ctx, r.x + 4, r.y + r.h - 6, r.w - 8, 4, extinguishProgress(s, f.extinguishTicks), '#9ad0ff');
    }
  }

  private drawFloorItems(s: MatchState, alpha: number) {
    const { ctx, layout } = this;
    for (const fi of s.floorItems) {
      const pos = this.floor.get(fi.item.id, alpha, fi.pos);
      const p = worldToScreen(layout, pos);
      const flying = fi.vel.x !== 0 || fi.vel.y !== 0;
      if (flying) {
        const sp = Math.hypot(fi.vel.x, fi.vel.y) || 1;
        const dx = (fi.vel.x / sp) * layout.tile * 0.8;
        const dy = (fi.vel.y / sp) * layout.tile * 0.8;
        ctx.strokeStyle = '#ffffff55';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(p.x - dx, p.y - dy);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        // Shadow below the airborne item.
        ctx.fillStyle = '#00000066';
        ctx.beginPath();
        ctx.ellipse(p.x, p.y + layout.tile * 0.3, layout.tile * 0.2, layout.tile * 0.08, 0, 0, Math.PI * 2);
        ctx.fill();
        drawItem(ctx, fi.item, p.x, p.y - layout.tile * 0.15, layout.tile * 0.2);
      } else {
        ctx.fillStyle = '#00000044';
        ctx.beginPath();
        ctx.ellipse(p.x, p.y + layout.tile * 0.18, layout.tile * 0.22, layout.tile * 0.08, 0, 0, Math.PI * 2);
        ctx.fill();
        drawItem(ctx, fi.item, p.x, p.y, layout.tile * 0.2);
      }
    }
  }

  private drawPlayer(s: MatchState, p: PlayerState, alpha: number, now: number, fx: readonly Effect[]) {
    const { ctx, layout } = this;
    const T = layout.tile;
    const pos = this.players.get(p.id, alpha, p.pos);
    let { x, y } = worldToScreen(layout, pos);
    const shake = fx.find((e) => e.kind === 'shake' && e.player === p.id);
    if (shake) x += shakeOffset(effectAge(shake, now));
    const dazed = p.dazedTicks > 0;
    if (dazed) {
      x += Math.sin(now / 70) * 2.5;
      y += Math.cos(now / 90) * 1.5;
    }
    const R = s.config.tuning.playerRadius * T;
    const color = TEAM_COLORS[p.team];

    // Dash trail.
    if (p.dashTicks > 0) {
      for (let k = 3; k >= 1; k--) {
        circle(ctx, x - p.dashDir.x * R * 0.8 * k, y - p.dashDir.y * R * 0.8 * k, R * (1 - k * 0.15), withAlpha(color, 0.12 * (4 - k)));
      }
    }
    // Shadow.
    ctx.fillStyle = '#00000055';
    ctx.beginPath();
    ctx.ellipse(x, y + R * 0.85, R * 0.9, R * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    // Body.
    circle(ctx, x, y, R, dazed ? withAlpha(color, 0.6) : color);
    ctx.lineWidth = 2;
    ctx.strokeStyle = p.knockImmuneTicks > 0 && Math.floor(now / 120) % 2 === 0 ? '#ffe14a' : '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, R, 0, Math.PI * 2);
    ctx.stroke();
    // Facing nose.
    const fl = Math.hypot(p.facing.x, p.facing.y) || 1;
    const fx0 = p.facing.x / fl;
    const fy0 = p.facing.y / fl;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(x + fx0 * (R + 7), y + fy0 * (R + 7));
    ctx.lineTo(x + fx0 * R - fy0 * 6, y + fy0 * R + fx0 * 6);
    ctx.lineTo(x + fx0 * R + fy0 * 6, y + fy0 * R - fx0 * 6);
    ctx.closePath();
    ctx.fill();
    // Number.
    text(ctx, String(p.id + 1), x, y + 1, TEAM_DARK[p.team], Math.round(R * 1.1), 'center', 800);
    // Dash cooldown: arc around the body that empties as the dash recharges.
    const cd = dashCooldownFraction(s, p.dashCooldown);
    if (cd > 0) {
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#ffffffaa';
      ctx.beginPath();
      ctx.arc(x, y, R + 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * cd);
      ctx.stroke();
    }
    // Working indicator.
    if (p.working) outlinedText(ctx, '...', x + R + 6, y - R, '#ffffff', 12, 'left');
    // Dazed stars.
    if (dazed) {
      for (let k = 0; k < 3; k++) {
        const a = now / 180 + (k * Math.PI * 2) / 3;
        outlinedText(ctx, '★', x + Math.cos(a) * R * 0.9, y - R - 4 + Math.sin(a) * 4, '#ffe14a', 13);
      }
    }
    // Held item above the head.
    if (p.holding) drawItem(ctx, p.holding, x, y - R - (dazed ? 18 : 12), T * 0.18);
    // Serve refused: red cross.
    if (shake) outlinedText(ctx, '✕', x, y - R - 14, '#ff4040', 18);
  }

  private drawWorldEffects(fx: readonly Effect[], now: number) {
    const { ctx, layout } = this;
    for (const e of fx) {
      if (!e.pos) continue;
      const age = effectAge(e, now);
      const p = worldToScreen(layout, e.pos);
      switch (e.kind) {
        case 'flash':
          ctx.fillStyle = withAlpha(e.color, 0.7 * (1 - age));
          ctx.beginPath();
          ctx.arc(p.x, p.y, layout.tile * (0.3 + age * 0.9), 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'ring':
          ctx.strokeStyle = withAlpha(e.color, 1 - age);
          ctx.lineWidth = 4 * (1 - age) + 1;
          ctx.beginPath();
          ctx.arc(p.x, p.y, layout.tile * (0.3 + age * 0.4), 0, Math.PI * 2);
          ctx.stroke();
          break;
        case 'smoke':
          for (let k = 0; k < 3; k++) {
            circle(ctx, p.x + (k - 1) * 8, p.y - age * layout.tile * 0.8 - k * 4, layout.tile * (0.15 + age * 0.15), withAlpha(e.color, 0.5 * (1 - age)));
          }
          break;
        case 'popup': {
          ctx.globalAlpha = 1 - age * age;
          outlinedText(ctx, e.text ?? '', p.x, p.y - layout.tile * (0.4 + age * 0.9), e.color, e.text?.startsWith('+') ? 24 : 14);
          ctx.globalAlpha = 1;
          break;
        }
        default:
          break;
      }
    }
  }

  // ---------- HUD ----------

  private drawTopBar(s: MatchState, fx: readonly Effect[], now: number) {
    const { ctx, layout } = this;
    const bar0 = layout.topBar;
    ctx.fillStyle = PANEL;
    ctx.fillRect(bar0.x, bar0.y, bar0.w, bar0.h);
    ctx.fillStyle = PANEL_EDGE;
    ctx.fillRect(bar0.x, bar0.y + bar0.h - 2, bar0.w, 2);
    const cx = bar0.w / 2;
    const mid = bar0.y + bar0.h / 2;

    for (const team of [0, 1] as TeamId[]) {
      const side = team === 0 ? 1 : -1;
      const edge = team === 0 ? 16 : bar0.w - 16;
      const align: CanvasTextAlign = team === 0 ? 'left' : 'right';
      const ts = s.teams[team];
      ctx.fillStyle = withAlpha(TEAM_COLORS[team], 0.18);
      ctx.fillRect(team === 0 ? 0 : bar0.w - 420, bar0.y, 420, bar0.h - 2);
      text(ctx, TEAM_NAMES[team], edge, mid - 16, TEAM_COLORS[team], 13, align, 800);
      text(ctx, String(Math.round(ts.score)), edge, mid + 10, INK, 30, align, 800);
      // Rounds won pips.
      const need = roundsToWin(s);
      for (let k = 0; k < need; k++) {
        const px = edge + side * (100 + k * 18);
        circle(ctx, px, mid - 16, 6, k < ts.roundsWon ? '#ffd54a' : '#00000066');
        ctx.strokeStyle = '#ffd54a88';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(px, mid - 16, 6, 0, Math.PI * 2);
        ctx.stroke();
      }
      // Heat meter: three segments + multiplier.
      const flash = fx.find((e) => e.kind === 'heatFlash' && e.team === team);
      const hx = edge + side * 100;
      text(ctx, 'HEAT', hx, mid + 8, MUTED, 10, align, 700);
      for (let k = 0; k < 3; k++) {
        const segX = team === 0 ? hx + 34 + k * 30 : hx - 34 - (k + 1) * 30 + 4;
        const lit = k < ts.heat;
        ctx.fillStyle = lit ? ['#ffb347', '#ff7a1a', '#ff3b1a'][k]! : '#00000066';
        roundRect(ctx, segX, mid + 2, 26, 12, 3);
        ctx.fill();
      }
      const mult = s.config.tuning.heatMultipliers[ts.heat] ?? 1;
      const multX = team === 0 ? hx + 34 + 3 * 30 + 4 : hx - 34 - 3 * 30 - 4 + 4;
      text(ctx, `x${mult}`, multX, mid + 8, ts.heat > 0 ? '#ffb347' : MUTED, 13, align, 800);
      if (flash) {
        const a = 1 - effectAge(flash, now);
        ctx.strokeStyle = withAlpha('#ffffff', a);
        ctx.lineWidth = 2;
        const x0 = team === 0 ? hx + 30 : hx - 30 - 3 * 30 - 4;
        ctx.strokeRect(x0, mid - 2, 3 * 30 + 8, 20);
      }
    }

    // Centre: clock, round, phase.
    const left = roundSecondsLeft(s);
    const urgent = s.round.phase === 'lastCall';
    text(ctx, formatClock(left), cx, mid + 4, urgent && Math.floor(now / 300) % 2 === 0 ? '#ff6b5e' : INK, 32, 'center', 800);
    text(ctx, `ROUND ${s.round.index + 1} / BEST OF ${s.config.bestOf}`, cx, bar0.y + 11, MUTED, 10, 'center', 700);
    const phase = phaseLabel(s.round.phase);
    const pillColor =
      s.round.phase === 'rush' ? '#ffb347' : s.round.phase === 'lastCall' ? '#ff6b5e' : s.round.phase === 'prep' ? '#9ad0ff' : '#6fdc6f';
    ctx.fillStyle = withAlpha(pillColor, 0.25);
    roundRect(ctx, cx + 62, mid - 9, 104, 20, 10);
    ctx.fill();
    text(ctx, phase, cx + 114, mid + 1, pillColor, 11, 'center', 800);
  }

  private drawTickets(s: MatchState, fx: readonly Effect[], now: number) {
    const { ctx, layout } = this;
    const area = layout.ticketBar;
    ctx.fillStyle = '#15171d';
    ctx.fillRect(area.x, area.y, area.w, area.h);
    const tickets = sortTickets(s.tickets);
    const slots = ticketSlots(area, s.config.tuning.maxTickets + 1, tickets.length);
    if (tickets.length === 0) {
      const prep = s.round.phase === 'prep' ? phaseBanner(s, TEAM_NAMES) : null;
      if (prep) {
        // Prep lasts the whole countdown, so it lives on the empty ticket board, not over the kitchens.
        const cy = area.y + area.h / 2;
        outlinedText(ctx, prep.title, area.x + area.w / 2, cy - 12, prep.color, 34);
        text(ctx, `${prep.subtitle} · tickets arrive then`, area.x + area.w / 2, cy + 22, INK, 14, 'center', 700);
      } else {
        text(ctx, 'No tickets', area.w / 2, area.y + area.h / 2, MUTED, 13, 'center', 600);
      }
      return;
    }
    tickets.forEach((t, i) => this.drawTicket(s, t, slots[i]!, fx, now));
  }

  private drawTicket(s: MatchState, t: Ticket, r: Rect, fx: readonly Effect[], now: number) {
    const { ctx } = this;
    const recipe = s.recipes.find((x) => x.id === t.recipe);
    const exclusive = t.visibleTo;
    const border = exclusive !== null ? TEAM_COLORS[exclusive] : t.isCritic ? '#ffd54a' : PANEL_EDGE;
    ctx.fillStyle = t.isCritic ? '#3a3115' : PANEL;
    roundRect(ctx, r.x, r.y, r.w, r.h, 6);
    ctx.fill();
    ctx.lineWidth = t.isCritic ? 3 : 1.5;
    ctx.strokeStyle = border;
    ctx.stroke();

    const pad = 8;
    // Header: name + value.
    const name = recipe?.name ?? t.recipe;
    text(ctx, name.length > 14 ? `${name.slice(0, 13)}.` : name, r.x + pad, r.y + 13, INK, 13, 'left', 700);
    text(ctx, String(ticketValue(s, t)), r.x + r.w - pad, r.y + 13, '#ffd54a', 14, 'right', 800);

    // Ingredient icons in their required state.
    const foods = recipe?.ingredients ?? [];
    const iconR = 9;
    const totalW = foods.length * (iconR * 2 + 8) - 8;
    foods.forEach((f, k) => {
      const ix = r.x + r.w / 2 - totalW / 2 + iconR + k * (iconR * 2 + 8);
      drawFood(ctx, f, ix, r.y + 40, iconR);
    });
    const legend = foods.map((f) => `${INGREDIENT_STYLE[f.kind].letter}${f.state === 'chopped' ? '/' : f.state === 'cooked' ? '*' : ''}`).join(' ');
    text(ctx, legend, r.x + r.w / 2, r.y + 58, MUTED, 9, 'center', 600);

    // Critic tag / visibility.
    if (t.isCritic) {
      const secs = criticExclusiveSeconds(s, t);
      const tag = exclusive !== null ? `CRITIC: ${TEAM_NAMES[exclusive]} ONLY${secs !== null && Number.isFinite(secs) ? ` ${Math.ceil(secs)}s` : ''}` : 'CRITIC';
      ctx.fillStyle = exclusive !== null ? TEAM_COLORS[exclusive] : '#ffd54a';
      roundRect(ctx, r.x + 4, r.y + r.h - 34, r.w - 8, 14, 4);
      ctx.fill();
      text(ctx, tag, r.x + r.w / 2, r.y + r.h - 27, '#111', 9, 'center', 800);
    }

    // Time-left bar.
    const left = ticketTimeLeft(s, t);
    const color = left > 0.5 ? '#6fdc6f' : left > 0.25 ? '#ffd54a' : '#ff5a4a';
    bar(ctx, r.x + 6, r.y + r.h - 14, r.w - 40, 7, left, color);
    const secsLeft = Math.max(0, (t.expireTick - s.tick) / s.config.tuning.tickRate);
    text(ctx, `${Math.ceil(secsLeft)}s`, r.x + r.w - 7, r.y + r.h - 10, left > 0.25 ? MUTED : '#ff5a4a', 11, 'right', 700);

    const flash = fx.find((e) => e.kind === 'ticketFlash' && e.ticketId === t.id);
    if (flash) {
      ctx.fillStyle = withAlpha('#ffffff', 0.4 * (1 - effectAge(flash, now)));
      roundRect(ctx, r.x, r.y, r.w, r.h, 6);
      ctx.fill();
    }
  }

  private drawBanner(s: MatchState) {
    const banner = phaseBanner(s, TEAM_NAMES);
    if (!banner || s.round.phase === 'prep') return; // prep is shown on the ticket board
    const { ctx, layout } = this;
    const w = layout.world;
    if (banner.overlay) {
      ctx.fillStyle = '#000000aa';
      ctx.fillRect(w.x, w.y, w.w, w.h);
    }
    const cy = w.y + w.h / 2;
    const bh = banner.overlay ? 130 : 88;
    ctx.fillStyle = banner.overlay ? '#000000cc' : '#00000088';
    ctx.fillRect(w.x, cy - bh / 2, w.w, bh);
    outlinedText(ctx, banner.title, w.x + w.w / 2, cy - (banner.overlay ? 22 : 12), banner.color, banner.overlay ? 52 : 40);
    text(ctx, banner.subtitle, w.x + w.w / 2, cy + (banner.overlay ? 30 : 24), INK, banner.overlay ? 20 : 15, 'center', 700);
  }
}
