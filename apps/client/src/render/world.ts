import { interactTarget, tileOwner } from '@line-war/sim';
import type { FireState, FloorItem, MatchState, PlayerId, PlayerState, TeamId, Vec2 } from '@line-war/sim';
import { PALETTE } from '../art/tokens';
import { drawChef, newChefAnim, type ChefAnim, type ChefCtx, type ChefPass } from './art/chef';
import { ellipse, fill } from './art/draw';
import { drawItem, itemShadow } from './art/food';
import { drawEffect, Particles } from './art/fx';
import { makeScene, rowRuns, topCenter, type Scene } from './art/scene';
import { lightRects, paintBase, paintLights, paintRow } from './art/static';
import { drawFire, drawStation, type FrameCtx } from './art/stations';
import { EffectQueue, effectAge, eventsToEffects, type Effect } from './effects';
import { celebratingTeam, CHEER_PERIOD_MS, hopAt, knockKick, nearestOfTeam, SERVE_HOP_MS, youArrowAlpha, type Hop } from './feel';
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
  /** Colour-blind shapes: crew glyphs on chef tags and ground rings. */
  colorblindShapes?: boolean;
  /** Per PlayerId: true for players controlled on this machine (they get the "you" ring). */
  humans?: readonly boolean[];
  /** The HUD flies serve points to the crew signs, so the world skips its own "+points" text. */
  scoreTokens?: boolean;
}

/** Something depth-sorted within a tile row: a resting floor item or a chef body. */
interface Entity {
  y: number;
  /** Index into s.floorItems, or -1 - playerId for a chef. */
  ref: number;
  x: number;
  sx: number;
  sy: number;
}

const byY = (a: Entity, b: Entity): number => a.y - b.y;

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
  private shapes = false;
  private clientRect: DOMRect | null = null;
  private scoreTokens = false;
  private humans: boolean[] = [false, false, false, false];
  /** Per-frame scratch, reused so a frame allocates as little as possible. */
  private rowBuckets: Entity[][] = [];
  private entityPool: Entity[] = [];
  private fireByTile = new Map<number, FireState>();
  private worked = new Set<number>();
  private shakeOut: Vec2 = { x: 0, y: 0 };
  private hop: Hop = { lift: 0, squash: 0 };
  private playerPos: Vec2[] = [
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
  ];
  private chefCtx: ChefCtx = { T: 0, now: 0, radius: 0, reducedMotion: false, sprites: null as unknown as SpriteCache, cooldown: 0, refusedAge: Infinity };
  private frame: FrameCtx | null = null;
  private cleanup: (() => void)[] = [];

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
    this.clientRect = null;
  }

  /** Current fit (for tests and the HUD: where the arena sits inside the canvas). */
  get viewport(): Readonly<Viewport> {
    return this.vp;
  }

  setDisplay(d: WorldDisplay): void {
    if (d.reducedMotion !== undefined) this.reducedMotion = d.reducedMotion;
    if (d.screenShake !== undefined) this.screenShake = d.screenShake;
    if (d.colorblindShapes !== undefined) this.shapes = d.colorblindShapes;
    if (d.scoreTokens !== undefined) this.scoreTokens = d.scoreTokens;
    if (d.humans) for (let i = 0; i < 4; i++) this.humans[i] = !!d.humans[i];
  }

  /** Where a world position (tiles) currently sits on screen, in client CSS px (for DOM effects). */
  toClient(pos: Vec2): Vec2 | null {
    const el = this.canvas as unknown as { getBoundingClientRect?: () => DOMRect };
    if (typeof el.getBoundingClientRect !== 'function') return null;
    // The canvas only moves on resize: read its rect once, not every frame (no forced layouts).
    const r = (this.clientRect ??= el.getBoundingClientRect());
    const p = worldToScreen(this.layout, pos);
    const k = this.vp.cssWidth / this.vp.pixelWidth;
    return { x: r.left + (this.vp.offsetX + p.x * this.vp.scale) * k, y: r.top + (this.vp.offsetY + p.y * this.vp.scale) * k };
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
      if (e.kind === 'popup' && e.team !== undefined && e.burst === 'serve') {
        this.bellAt[e.team] = now;
        // The chef at the window hops for joy.
        const server = e.pos ? nearestOfTeam(s.players, e.team, e.pos) : null;
        if (server) this.anims[server.id]!.hopAt = now;
      }
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
    this.clearFrame();
    ctx.setTransform(vp.scale, 0, 0, vp.scale, vp.offsetX + shake.x * vp.scale, vp.offsetY + shake.y * vp.scale);

    if (this.base) drawLayer(ctx, this.base);
    else paintBase(ctx, sc);

    const frame = this.frameCtx(s, sc, now);
    const fires = this.fireByTile;
    fires.clear();
    for (const f of s.fires) fires.set(f.tile, f);
    const byRow = this.entitiesByRow(s, sc, alpha, now, dt);
    const celebrating = celebratingTeam(s);

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
      if (ents && ents.length) {
        if (ents.length > 1) ents.sort(byY);
        for (const e of ents) this.drawEntity(s, e, now, celebrating, 'body');
      }
    }

    // Hands, held items, tags and markers go over the whole world.
    for (const row of byRow) for (const e of row) if (e.ref < 0) this.drawEntity(s, e, now, celebrating, 'front');
    for (const fi of s.floorItems) if (fi.vel.x !== 0 || fi.vel.y !== 0) this.drawFlying(s, fi, alpha);

    if (this.lights) for (const l of this.lights) drawLayer(ctx, l);
    else paintLights(ctx, sc);

    this.emitAmbient(s, sc, dt, celebrating);
    this.particles.update(dt);
    this.particles.draw(ctx);

    for (const e of fx) {
      if (!e.pos) continue;
      if (this.scoreTokens && e.burst === 'serve') continue; // the HUD token carries the number
      const p = worldToScreen(layout, e.pos);
      drawEffect(ctx, e, p.x, p.y, T, now);
    }
  }

  /** Clear last frame (the margins are transparent so the stage backdrop shows through). */
  private clearFrame(): void {
    const { ctx, vp } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, vp.pixelWidth, vp.pixelHeight);
  }


  /**
   * Camera shake: a knock kicks the camera along the dash (a hard directional punch that springs
   * back), then rattles out; fires rattle without the kick.
   */
  private cameraShake(fx: readonly Effect[], now: number): Vec2 {
    const out = this.shakeOut;
    out.x = 0;
    out.y = 0;
    if (!this.screenShake || this.reducedMotion) return out;
    let amp = 0;
    for (const e of fx) {
      if (e.kind !== 'flash') continue;
      const age = effectAge(e, now);
      const k = 1 - age;
      amp = Math.max(amp, (e.burst === 'knock' ? 6 : 3.5) * k * k);
      if (e.dir) {
        const kick = knockKick(age) * 9;
        out.x += e.dir.x * kick;
        out.y += e.dir.y * kick;
      }
    }
    if (amp >= 0.05) {
      out.x += Math.sin(now * 0.09) * amp;
      out.y += Math.cos(now * 0.113) * amp * 0.7;
    }
    return out;
  }

  private frameCtx(s: MatchState, sc: Scene, now: number): FrameCtx {
    const worked = this.worked;
    worked.clear();
    for (const p of s.players) {
      if (!p.working) continue;
      const t = interactTarget(s, p).tile;
      if (t !== null) worked.add(t);
    }
    const f = (this.frame ??= { sc, sprites: this.sprites, now, worked, bellAge: { 0: 0, 1: 0 }, reducedMotion: false });
    f.sc = sc;
    f.sprites = this.sprites;
    f.now = now;
    f.bellAge[0] = now - this.bellAt[0];
    f.bellAge[1] = now - this.bellAt[1];
    f.reducedMotion = this.reducedMotion;
    return f;
  }


  private entitiesByRow(s: MatchState, sc: Scene, alpha: number, now: number, dt: number): Entity[][] {
    const rows = this.rowBuckets;
    while (rows.length < sc.H) rows.push([]);
    rows.length = sc.H;
    for (const r of rows) r.length = 0;
    let used = 0;
    const pool = this.entityPool;
    const take = (): Entity => {
      const e = (pool[used] ??= { y: 0, ref: 0, x: 0, sx: 0, sy: 0 });
      used++;
      return e;
    };
    const put = (e: Entity) => rows[Math.max(0, Math.min(sc.H - 1, Math.floor(e.y)))]!.push(e);
    for (let i = 0; i < s.floorItems.length; i++) {
      const fi = s.floorItems[i]!;
      if (fi.vel.x !== 0 || fi.vel.y !== 0) continue;
      const pos = this.floor.get(fi.item.id, alpha, fi.pos);
      const p = worldToScreen(this.layout, pos);
      const e = take();
      e.y = pos.y;
      e.ref = i;
      e.sx = p.x;
      e.sy = p.y;
      put(e);
    }
    for (const pl of s.players) {
      const pos = this.players.get(pl.id, alpha, pl.pos);
      this.animate(pl, pos, now, dt);
      const keep = this.playerPos[pl.id]!;
      keep.x = pos.x;
      keep.y = pos.y;
      const e = take();
      e.y = pos.y;
      e.ref = -1 - pl.id;
      put(e);
    }
    return rows;
  }

  private drawEntity(s: MatchState, e: Entity, now: number, celebrating: TeamId | null, pass: ChefPass): void {
    if (e.ref >= 0) {
      const fi = s.floorItems[e.ref];
      if (!fi) return;
      const T = this.layout.tile;
      itemShadow(this.ctx, e.sx, e.sy, T * 0.22, fi.item.type === 'plate');
      drawItem(this.ctx, this.sprites, fi.item, e.sx, e.sy - 2, T * 0.22);
      return;
    }
    const id = -1 - e.ref;
    const pl = s.players[id as PlayerId];
    this.drawPlayer(s, pl, this.playerPos[id]!, this.anims[id]!, now, pass, celebrating);
  }

  private animate(p: PlayerState, pos: Vec2, now: number, dt: number): void {
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
  }

  private drawPlayer(s: MatchState, p: PlayerState, pos: Vec2, anim: ChefAnim, now: number, pass: ChefPass, celebrating: TeamId | null): void {
    const T = this.layout.tile;
    let { x, y } = worldToScreen(this.layout, pos);
    const refusedAge = now - this.refusedAt[p.id]!;
    if (refusedAge < 400 && !this.reducedMotion) x += Math.sin((refusedAge / 400) * Math.PI * 8) * 5 * (1 - refusedAge / 400);
    if (p.dazedTicks > 0 && !this.reducedMotion) {
      x += Math.sin(now / 70) * 1.8;
      y += Math.cos(now / 90) * 1.2;
    }
    const radius = s.config.tuning.playerRadius * T * CHEF_SCALE;
    // Serve hop, or the winners' victory bounce (staggered per chef).
    const hop = this.hop;
    hop.lift = 0;
    hop.squash = 0;
    if (!this.reducedMotion) {
      if (celebrating !== null && p.team === celebrating) hopAt(((now + p.id * 170) % CHEER_PERIOD_MS) / CHEER_PERIOD_MS, hop, 0.7);
      else hopAt((now - anim.hopAt) / SERVE_HOP_MS, hop);
    }
    const c = this.chefCtx;
    c.T = T;
    c.now = now;
    c.radius = radius;
    c.reducedMotion = this.reducedMotion;
    c.sprites = this.sprites;
    c.cooldown = dashCooldownFraction(s, p.dashCooldown);
    c.refusedAge = refusedAge;
    c.lift = hop.lift * radius;
    c.squash = hop.squash;
    c.you = this.humans[p.id] ?? false;
    c.youArrow = c.you ? youArrowAlpha(s) : 0;
    c.shapes = this.shapes;
    drawChef(this.ctx, c, p, x, y, anim, pass);
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

  private emitAmbient(s: MatchState, sc: Scene, dt: number, celebrating: TeamId | null): void {
    if (dt <= 0) return;
    const T = this.layout.tile;
    const calm = this.reducedMotion ? 0.35 : 1;
    const ps = this.particles;
    if (celebrating !== null) {
      // Confetti in the winners' colours rains over the whole market.
      const w = this.layout.world;
      const rate = (s.round.phase === 'matchOver' ? 70 : 32) * calm;
      ps.emit('celebrate', rate, dt, () => ps.celebrate(w.x, w.y - T, w.w, celebrating));
    }
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

