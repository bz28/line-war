import { interactTarget, tileOwner } from '@line-war/sim';
import type { FireState, FloorItem, MatchState, PlayerState, TeamId, Vec2 } from '@line-war/sim';
import { PALETTE } from '../art/tokens';
import { drawChef, newChefAnim, type ChefAnim, type ChefPass } from './art/chef';
import { ellipse, fill } from './art/draw';
import { drawItem, itemShadow } from './art/food';
import { drawEffect, Particles } from './art/fx';
import { makeScene, rowRuns, topCenter, type Scene } from './art/scene';
import { lightRects, paintBase, paintLights, paintRow } from './art/static';
import { drawFire, drawStation, type FrameCtx } from './art/stations';
import { EffectQueue, effectAge, eventsToEffects, type Effect } from './effects';
import { dashCooldownFraction } from './format';
import { PositionTracker } from './interp';
import { computeLayout, fitToBox, worldToScreen, type Layout, type Viewport } from './layout';
import { withAlpha } from './palette';
import { bakeLayer, defaultCanvasFactory, drawLayer, SpriteCache, type CanvasFactory, type CanvasLike, type Ctx, type Layer } from './sprites';
import type { Renderer } from './types';

export type { CanvasLike } from './sprites';

export interface WorldOptions {
  /** Millisecond clock for effects and animation (default performance.now). */
  now?: () => number;
  /**
   * Fill the canvas's parent element and follow its size with a ResizeObserver (default true when
   * `window` exists). Without a sized parent it falls back to the window.
   */
  autoResize?: boolean;
  /** Offscreen canvas maker for cached layers and sprites; null paints everything live (tests). */
  createCanvas?: CanvasFactory | null;
  /** Tone down ambient particles, pulses and shake (default: the prefers-reduced-motion query). */
  reducedMotion?: boolean;
  /** Camera shake on knocks and fires (default true; the settings toggle). */
  screenShake?: boolean;
}

/** Display preferences that can change mid-match. */
export interface WorldDisplay {
  reducedMotion?: boolean;
  screenShake?: boolean;
}

interface Entity {
  y: number;
  draw: () => void;
}

const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';

/** Chefs are drawn a little larger than their collision circle so they read at a glance. */
const CHEF_SCALE = 1.2;

/**
 * The Lantern Night Market world: a 3/4 diorama drawn on Canvas2D. Static floors, walls and
 * station bodies are baked into offscreen layers (one per tile row, so chefs tuck correctly
 * behind and in front of counters); food, chefs, fire and effects are drawn live on top.
 * The canvas shows the world only: scores, tickets and phase banners belong to the DOM HUD.
 * Never mutates the MatchState it draws.
 */
export class WorldRenderer implements Renderer {
  private ctx: CanvasRenderingContext2D;
  private layout: Layout;
  private vp: Viewport;
  private now: () => number;
  private factory: CanvasFactory | null;
  private sprites: SpriteCache;
  private particles = new Particles();
  private lastTick: number | null = null;
  private lastFrame: number | null = null;
  private players = new PositionTracker<number>();
  private floor = new PositionTracker<number>();
  private effects = new EffectQueue();
  private anims: ChefAnim[] = [newChefAnim(), newChefAnim(), newChefAnim(), newChefAnim()];
  private bellAt: Record<TeamId, number> = { 0: -1e9, 1: -1e9 };
  private refusedAt = [-1e9, -1e9, -1e9, -1e9];
  private staticKey = '';
  private base: Layer | null = null;
  /** Baked block runs per row; null when there is no offscreen canvas (paint live instead). */
  private rows: Layer[][] | null = null;
  private lights: Layer[] | null = null;
  private stationRows: number[][] = [];
  private reducedMotion: boolean;
  private screenShake: boolean;
  private cleanup: (() => void)[] = [];
  /** Chef parts drawn after the whole world (held items, tags), filled per frame. */
  private front: (() => void)[] = [];

  constructor(
    private canvas: CanvasLike,
    state: MatchState,
    opts: WorldOptions = {},
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas not supported');
    this.ctx = ctx;
    this.now = opts.now ?? (() => (typeof performance !== 'undefined' ? performance.now() : 0));
    this.factory = opts.createCanvas === undefined ? defaultCanvasFactory() : opts.createCanvas;
    this.sprites = new SpriteCache(this.factory);
    this.layout = computeLayout(state.arena.width, state.arena.height);
    this.vp = fitToBox(this.layout.width, this.layout.height, this.layout.width, this.layout.height);
    this.screenShake = opts.screenShake ?? true;
    this.reducedMotion = opts.reducedMotion ?? this.watchReducedMotion(opts.reducedMotion === undefined);
    const hasWindow = typeof window !== 'undefined' && typeof window.addEventListener === 'function';
    if ((opts.autoResize ?? true) && hasWindow) this.followParent();
    else this.resize(this.layout.width, this.layout.height);
  }

  // ---------- sizing ----------

  /** Fill a width x height (CSS px) box: crisp backing store at devicePixelRatio, diorama centred. */
  resize(width: number, height: number): void {
    const dpr = typeof window !== 'undefined' && window.devicePixelRatio ? window.devicePixelRatio : 1;
    this.vp = fitToBox(this.layout.width, this.layout.height, width, height, dpr);
    this.canvas.width = this.vp.pixelWidth;
    this.canvas.height = this.vp.pixelHeight;
    if (this.canvas.style) {
      this.canvas.style.width = `${this.vp.cssWidth}px`;
      this.canvas.style.height = `${this.vp.cssHeight}px`;
    }
    this.sprites.setScale(this.vp.scale);
    this.staticKey = '';
  }

  /** Current fit (for tests and the HUD: where the arena sits inside the canvas). */
  get viewport(): Readonly<Viewport> {
    return this.vp;
  }

  setDisplay(d: WorldDisplay): void {
    if (d.reducedMotion !== undefined) this.reducedMotion = d.reducedMotion;
    if (d.screenShake !== undefined) this.screenShake = d.screenShake;
  }

  private watchReducedMotion(listen: boolean): boolean {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    const mql = window.matchMedia(REDUCED_QUERY);
    if (listen && typeof mql.addEventListener === 'function') {
      const onChange = (e: MediaQueryListEvent) => (this.reducedMotion = e.matches);
      mql.addEventListener('change', onChange);
      this.cleanup.push(() => mql.removeEventListener('change', onChange));
    }
    return mql.matches;
  }

  private followParent(): void {
    const parent = this.canvas.parentElement ?? null;
    const style = this.canvas.style;
    const measure = () => {
      const w = parent?.clientWidth ?? 0;
      const h = parent?.clientHeight ?? 0;
      if (parent && w > 0 && h > 0) {
        if (style) {
          style.position = 'absolute';
          style.left = '0px';
          style.top = '0px';
          style.display = 'block';
        }
        const ps = (parent as { style?: { position?: string } }).style;
        const computed = typeof getComputedStyle === 'function' && parent instanceof Element ? getComputedStyle(parent).position : ps?.position;
        if (ps && (!computed || computed === 'static')) ps.position = 'relative';
        this.resize(w, h);
      } else {
        // No sized parent yet: cover the window so the game is still playable.
        if (style) {
          style.position = 'fixed';
          style.left = '0px';
          style.top = '0px';
          style.display = 'block';
        }
        this.resize(window.innerWidth, window.innerHeight);
      }
    };
    if (parent && typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => measure());
      ro.observe(parent as Element);
      this.cleanup.push(() => ro.disconnect());
    }
    window.addEventListener('resize', measure);
    this.cleanup.push(() => window.removeEventListener('resize', measure));
    measure();
  }

  dispose(): void {
    for (const f of this.cleanup) f();
    this.cleanup = [];
    this.effects.clear();
    this.particles.clear();
    this.base = null;
    this.rows = null;
    this.lights = null;
  }

  // ---------- state tracking ----------

  onTick(s: MatchState): void {
    this.ingest(s, this.now());
  }

  /** Once per new sim tick: remember positions and turn this tick's events into effects. */
  private ingest(s: MatchState, now: number): void {
    if (s.tick === this.lastTick) return;
    if (this.lastTick !== null && s.tick < this.lastTick) {
      this.effects.clear(); // new match
      this.particles.clear();
    }
    this.players.update(
      s.tick,
      s.players.map((p) => [p.id, p.pos] as [number, Vec2]),
    );
    this.floor.update(
      s.tick,
      s.floorItems.map((f) => [f.item.id, f.pos] as [number, Vec2]),
    );
    const fresh = eventsToEffects(s, s.events, now);
    this.effects.push(fresh);
    const T = this.layout.tile;
    for (const e of fresh) {
      if (e.kind === 'popup' && e.team !== undefined && e.burst === 'serve') this.bellAt[e.team] = now;
      if (e.kind === 'shake' && e.player !== undefined) this.refusedAt[e.player] = now;
      if (e.burst && e.pos) {
        const p = worldToScreen(this.layout, e.pos);
        const lift = e.burst === 'knock' ? 0.3 : 0.2;
        this.particles.burst(e.burst, p.x, p.y - T * lift, T, e.team ?? null);
      }
    }
    this.lastTick = s.tick;
  }

  // ---------- static layers ----------

  private ensureStatic(s: MatchState): Scene {
    const sc = makeScene(s, this.layout);
    const key = `${s.arena.id}:${this.vp.pixelWidth}x${this.vp.pixelHeight}:${s.round.swapped}`;
    if (key === this.staticKey) return sc;
    this.staticKey = key;
    const { layout } = this;
    const scale = this.vp.scale;
    this.base = bakeLayer(this.factory, scale, 0, 0, layout.width, layout.height, (c) => paintBase(c, sc));
    const bakeAll = (rects: { x: number; y: number; w: number; h: number }[], paint: (c: Ctx) => void): Layer[] | null => {
      const out: Layer[] = [];
      for (const b of rects) {
        const l = bakeLayer(this.factory, scale, b.x, b.y, b.w, b.h, paint);
        if (!l) return null;
        out.push(l);
      }
      return out;
    };
    this.rows = [];
    for (let r = 0; r < sc.H && this.rows; r++) {
      const runs = bakeAll(rowRuns(sc, r), (c) => paintRow(c, sc, r));
      if (runs) this.rows.push(runs);
      else this.rows = null;
    }
    this.lights = bakeAll(lightRects(sc), (c) => paintLights(c, sc));
    this.stationRows = Array.from({ length: sc.H }, () => []);
    s.arena.tiles.forEach((t, i) => {
      if (t.kind !== 'floor' && t.kind !== 'wall') this.stationRows[Math.floor(i / sc.W)]!.push(i);
    });
    return sc;
  }

  // ---------- frame ----------

  render(s: MatchState, alpha = 0): void {
    const now = this.now();
    const dt = this.lastFrame === null ? 0 : Math.max(0, Math.min(0.05, (now - this.lastFrame) / 1000));
    this.lastFrame = now;
    this.ingest(s, now);
    const sc = this.ensureStatic(s);
    const { ctx, layout, vp } = this;
    const T = layout.tile;
    const fx = this.effects.active(now);

    const shake = this.cameraShake(fx, now);
    this.fillLetterbox(shake.x !== 0 || shake.y !== 0);
    ctx.setTransform(vp.scale, 0, 0, vp.scale, vp.offsetX + shake.x * vp.scale, vp.offsetY + shake.y * vp.scale);

    if (this.base) drawLayer(ctx, this.base);
    else paintBase(ctx, sc);

    const frame: FrameCtx = {
      sc,
      sprites: this.sprites,
      now,
      worked: this.workedTiles(s),
      bellAge: { 0: now - this.bellAt[0], 1: now - this.bellAt[1] },
      reducedMotion: this.reducedMotion,
    };
    const fires = new Map<number, FireState>(s.fires.map((f) => [f.tile, f]));
    const byRow = this.entitiesByRow(s, sc, alpha, now, dt);

    for (let r = 0; r < sc.H; r++) {
      if (this.rows) for (const l of this.rows[r] ?? []) drawLayer(ctx, l);
      else paintRow(ctx, sc, r);
      for (const i of this.stationRows[r] ?? []) {
        const def = s.arena.tiles[i]!;
        drawStation(ctx, frame, s, i, def, s.stations[String(i)], tileOwner(s, i));
        const fire = fires.get(i);
        if (fire) drawFire(ctx, frame, s, fire);
      }
      const ents = byRow[r];
      if (ents) {
        ents.sort((a, b) => a.y - b.y);
        for (const e of ents) e.draw();
      }
    }

    for (const f of this.front) f();
    this.front = [];
    for (const fi of s.floorItems) if (fi.vel.x !== 0 || fi.vel.y !== 0) this.drawFlying(s, fi, alpha);

    if (this.lights) for (const l of this.lights) drawLayer(ctx, l);
    else paintLights(ctx, sc);

    this.emitAmbient(s, sc, dt);
    this.particles.update(dt);
    this.particles.draw(ctx);

    for (const e of fx) {
      if (!e.pos) continue;
      const p = worldToScreen(layout, e.pos);
      drawEffect(ctx, e, p.x, p.y, T, now);
    }
  }

  /** Night backdrop around the diorama (only the strips the base layer does not cover). */
  private fillLetterbox(all: boolean): void {
    const { ctx, vp } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PALETTE.nightDeep;
    if (all) {
      ctx.fillRect(0, 0, vp.pixelWidth, vp.pixelHeight);
      return;
    }
    const w = Math.ceil(this.layout.width * vp.scale);
    const h = Math.ceil(this.layout.height * vp.scale);
    if (vp.offsetX > 0) {
      ctx.fillRect(0, 0, vp.offsetX, vp.pixelHeight);
      ctx.fillRect(vp.offsetX + w - 1, 0, vp.pixelWidth - vp.offsetX - w + 1, vp.pixelHeight);
    }
    if (vp.offsetY > 0) {
      ctx.fillRect(0, 0, vp.pixelWidth, vp.offsetY);
      ctx.fillRect(0, vp.offsetY + h - 1, vp.pixelWidth, vp.pixelHeight - vp.offsetY - h + 1);
    }
  }

  private cameraShake(fx: readonly Effect[], now: number): Vec2 {
    if (!this.screenShake || this.reducedMotion) return { x: 0, y: 0 };
    let amp = 0;
    for (const e of fx) {
      if (e.kind !== 'flash') continue;
      const k = 1 - effectAge(e, now);
      amp = Math.max(amp, (e.burst === 'knock' ? 5 : 3.5) * k * k);
    }
    if (amp < 0.05) return { x: 0, y: 0 };
    return { x: Math.sin(now * 0.09) * amp, y: Math.cos(now * 0.113) * amp * 0.7 };
  }

  private workedTiles(s: MatchState): Set<number> {
    const out = new Set<number>();
    for (const p of s.players) {
      if (!p.working) continue;
      const t = interactTarget(s, p).tile;
      if (t !== null) out.add(t);
    }
    return out;
  }

  private entitiesByRow(s: MatchState, sc: Scene, alpha: number, now: number, dt: number): Entity[][] {
    const rows: Entity[][] = Array.from({ length: sc.H }, () => []);
    const put = (yTiles: number, e: Entity) => rows[Math.max(0, Math.min(sc.H - 1, Math.floor(yTiles)))]!.push(e);
    const T = this.layout.tile;
    for (const fi of s.floorItems) {
      if (fi.vel.x !== 0 || fi.vel.y !== 0) continue;
      const pos = this.floor.get(fi.item.id, alpha, fi.pos);
      const p = worldToScreen(this.layout, pos);
      put(pos.y, {
        y: pos.y,
        draw: () => {
          itemShadow(this.ctx, p.x, p.y, T * 0.22, fi.item.type === 'plate');
          drawItem(this.ctx, this.sprites, fi.item, p.x, p.y - 2, T * 0.22);
        },
      });
    }
    for (const pl of s.players) {
      const pos = this.players.get(pl.id, alpha, pl.pos);
      const anim = this.animate(pl, pos, now, dt);
      put(pos.y, { y: pos.y, draw: () => this.drawPlayer(s, pl, pos, anim, now, 'body') });
      this.front.push(() => this.drawPlayer(s, pl, pos, anim, now, 'front'));
    }
    return rows;
  }

  private animate(p: PlayerState, pos: Vec2, now: number, dt: number): ChefAnim {
    const a = this.anims[p.id]!;
    const T = this.layout.tile;
    if (Number.isFinite(a.x)) {
      const d = Math.hypot(pos.x - a.x, pos.y - a.y);
      if (d < 2) {
        a.walk += (d * T) / (T * 0.2);
        const sp = dt > 0 ? d / dt : 0;
        a.speed = a.speed * 0.7 + sp * 0.3;
      }
    }
    a.x = pos.x;
    a.y = pos.y;
    const dashing = p.dashTicks > 0;
    if (a.dashing && !dashing) a.landAt = now;
    a.dashing = dashing;
    const dazed = p.dazedTicks > 0;
    if (dazed && !a.dazed) a.hitAt = now;
    a.dazed = dazed;
    return a;
  }

  private drawPlayer(s: MatchState, p: PlayerState, pos: Vec2, anim: ChefAnim, now: number, pass: ChefPass): void {
    const T = this.layout.tile;
    let { x, y } = worldToScreen(this.layout, pos);
    const refusedAge = now - this.refusedAt[p.id]!;
    if (refusedAge < 400 && !this.reducedMotion) x += Math.sin((refusedAge / 400) * Math.PI * 8) * 5 * (1 - refusedAge / 400);
    if (p.dazedTicks > 0 && !this.reducedMotion) {
      x += Math.sin(now / 70) * 1.8;
      y += Math.cos(now / 90) * 1.2;
    }
    drawChef(
      this.ctx,
      {
        T,
        now,
        radius: s.config.tuning.playerRadius * T * CHEF_SCALE,
        reducedMotion: this.reducedMotion,
        sprites: this.sprites,
        cooldown: dashCooldownFraction(s, p.dashCooldown),
        refusedAge,
      },
      p,
      x,
      y,
      anim,
      pass,
    );
  }

  /** A thrown item: parabolic arc above its ground shadow, spinning, with a speed streak. */
  private drawFlying(s: MatchState, fi: FloorItem, alpha: number): void {
    const { ctx, layout } = this;
    const T = layout.tile;
    const pos = this.floor.get(fi.item.id, alpha, fi.pos);
    const g = worldToScreen(layout, pos);
    const step = Math.hypot(fi.vel.x, fi.vel.y);
    const range = Math.max(0.1, s.config.tuning.throwRange);
    const p = Math.max(0, Math.min(1, (fi.travelled + alpha * step) / range));
    const h = T * (0.4 * (1 - p) + 2.4 * p * (1 - p));
    const k = 1 - h / (T * 1.4);
    ellipse(ctx, g.x + 2, g.y + T * 0.12, T * 0.24 * k, T * 0.1 * k);
    fill(ctx, withAlpha(PALETTE.nightDeep, 0.45 * k));
    const ux = step > 0 ? fi.vel.x / step : 0;
    const uy = step > 0 ? fi.vel.y / step : 0;
    const top = { x: g.x, y: g.y - h };
    const grad = ctx.createLinearGradient(top.x, top.y, top.x - ux * T * 1.1, top.y - uy * T * 1.1 + T * 0.15);
    grad.addColorStop(0, withAlpha(PALETTE.paper, 0.55));
    grad.addColorStop(1, withAlpha(PALETTE.paper, 0));
    ctx.strokeStyle = grad;
    ctx.lineWidth = T * 0.16;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(top.x - ux * T * 1.1, top.y - uy * T * 1.1 + T * 0.15);
    ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.save();
    ctx.translate(top.x, top.y);
    ctx.rotate(this.reducedMotion ? 0 : (fi.travelled + alpha * step) * 3.2);
    drawItem(ctx, this.sprites, fi.item, 0, 0, T * 0.22);
    ctx.restore();
  }

  private emitAmbient(s: MatchState, sc: Scene, dt: number): void {
    if (dt <= 0) return;
    const T = this.layout.tile;
    const calm = this.reducedMotion ? 0.35 : 1;
    const ps = this.particles;
    for (const st of Object.values(s.stations)) {
      const v = st.vessel;
      if (!v) continue;
      const c = topCenter(sc, st.tile);
      if (v.status === 'cooking' || v.status === 'done') {
        const rate = (v.kind === 'pot' ? 3.5 : 2) * calm;
        ps.emit(`steam${st.tile}`, rate, dt, () => ps.steam(c.x, c.y - T * 0.2, T));
      } else if (v.status === 'burnt') {
        ps.emit(`smoke${st.tile}`, 4 * calm, dt, () => ps.smoke(c.x, c.y - T * 0.2, T));
      }
    }
    for (const f of s.fires) {
      const c = topCenter(sc, f.tile);
      ps.emit(`ember${f.tile}`, 9 * calm, dt, () => ps.ember(c.x, c.y - T * 0.3, T));
      ps.emit(`fsmoke${f.tile}`, 4 * calm, dt, () => ps.smoke(c.x, c.y - T * 0.75, T));
    }
    if (!this.reducedMotion) {
      const w = this.layout.world;
      const x0 = w.x + w.w * 0.36;
      ps.fireflies(7, x0, w.y + T, w.w * 0.28, w.h - T * 2);
    }
  }
}

/** The world renderer under its original name, so main.ts keeps working until the HUD rewires it. */
export const GreyboxRenderer = WorldRenderer;
export type GreyboxRenderer = WorldRenderer;
export type GreyboxOptions = WorldOptions;

