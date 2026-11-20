import { PALETTE } from '../../art/tokens';
import { withAlpha } from '../palette';
import type { Ctx, SpriteCache } from '../sprites';
import { BODY, charmArt, sparkle, type Cmd, type Shape } from './charmShapes';
import { ellipse, fill, glow, TAU } from './draw';

/**
 * The mascot on the world canvas. `drawCharm` blits the cached figure (same shapes as the SVG);
 * `drawCharmAura` adds the live parts: the light it casts, the rare halo and sparkles, and the
 * lighthouse's sweeping beam. Positions are logical px; r is the body radius.
 */

function trace(ctx: Ctx, cmds: readonly Cmd[]): void {
  ctx.beginPath();
  for (const c of cmds) {
    switch (c[0]) {
      case 'M':
        ctx.moveTo(c[1], c[2]);
        break;
      case 'L':
        ctx.lineTo(c[1], c[2]);
        break;
      case 'Q':
        ctx.quadraticCurveTo(c[1], c[2], c[3], c[4]);
        break;
      case 'C':
        ctx.bezierCurveTo(c[1], c[2], c[3], c[4], c[5], c[6]);
        break;
      case 'Z':
        ctx.closePath();
        break;
    }
  }
}

/** Current global alpha (1 when the context doesn't report a number). */
const alphaOf = (ctx: Ctx): number => (typeof ctx.globalAlpha === 'number' ? ctx.globalAlpha : 1);

function shapePath(ctx: Ctx, s: Shape): void {
  if ('ellipse' in s) {
    const [cx, cy, rx, ry, rot] = s.ellipse;
    ellipse(ctx, cx, cy, rx, ry, rot ?? 0);
  } else trace(ctx, s.path);
}

/** Paint the figure in unit space (the caller has scaled the context by r). */
export function paintCharm(ctx: Ctx, variant: string, silhouette = false): void {
  const art = charmArt(variant);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  for (const s of art.shapes) {
    if (silhouette && s.detail) continue;
    ctx.save();
    if (s.clip) {
      ellipse(ctx, 0, 0, BODY.rx, BODY.ry);
      ctx.clip();
    }
    if (s.alpha !== undefined && !silhouette) ctx.globalAlpha = alphaOf(ctx) * s.alpha;
    shapePath(ctx, s);
    if (s.fill !== undefined) {
      if (silhouette) ctx.fillStyle = PALETTE.nightDeep;
      else if (typeof s.fill === 'string') ctx.fillStyle = s.fill;
      else {
        const { cx, cy, r, stops } = s.fill.radial;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        for (const [o, c] of stops) g.addColorStop(o, c);
        ctx.fillStyle = g;
      }
      ctx.fill();
    }
    if (s.stroke) {
      ctx.strokeStyle = silhouette ? PALETTE.nightDeep : s.stroke;
      ctx.lineWidth = s.width ?? 0.05;
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.lineJoin = 'miter';
  ctx.lineCap = 'butt';
}

/** Half-size of the sprite square for body radius r (holds ears, accessories and tassel). */
export const charmHalf = (r: number): number => r * 2.15;

/** Draw the (cached) figure centred on its body at x, y. */
export function drawCharm(ctx: Ctx, sprites: SpriteCache, variant: string, x: number, y: number, r: number): void {
  sprites.draw(ctx, `charm:${variant}:${r.toFixed(1)}`, charmHalf(r), x, y, (c) => {
    c.save();
    c.scale(r, r);
    paintCharm(c, variant);
    c.restore();
  });
}

export interface AuraOpts {
  now: number;
  reducedMotion: boolean;
  /** 0..1 overall strength (blinks and pops scale it). */
  strength?: number;
  /** A per-charm phase so neighbours don't pulse in lockstep. */
  seed?: number;
}

/** Light behind the figure: a warm halo, plus the rare glow pulse, sparkles and beacon sweep. */
export function drawCharmAura(ctx: Ctx, variant: string, x: number, y: number, r: number, o: AuraOpts): void {
  const art = charmArt(variant);
  const k = o.strength ?? 1;
  if (k <= 0) return;
  const t = o.reducedMotion ? 0 : o.now / 1000 + (o.seed ?? 0) * 0.37;
  const pulse = o.reducedMotion ? 0.5 : 0.5 + 0.5 * Math.sin(t * (art.rare ? 4.2 : 2.6));
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, x, y - r * 0.1, r * (art.rare ? 2.6 + pulse * 0.5 : 2.1), art.glow, (art.rare ? 0.34 + pulse * 0.16 : 0.22 + pulse * 0.06) * k);
  if (art.beacon) {
    // The lamp's beam sweeps round: two soft wedges from the lamp room.
    const bx = x + art.beacon.x * r;
    const by = y + art.beacon.y * r;
    const a = o.reducedMotion ? 0 : t * 1.6;
    for (const side of [0, Math.PI]) {
      const dir = a + side;
      const len = r * 4.2;
      const g = ctx.createRadialGradient(bx, by, 0, bx, by, len);
      g.addColorStop(0, withAlpha(PALETTE.lantern, 0.42 * k));
      g.addColorStop(1, withAlpha(PALETTE.lantern, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      // Flattened to the 3/4 view: the beam sweeps across, not up into the sky.
      ctx.lineTo(bx + Math.cos(dir - 0.22) * len, by + Math.sin(dir - 0.22) * len * 0.45);
      ctx.lineTo(bx + Math.cos(dir + 0.22) * len, by + Math.sin(dir + 0.22) * len * 0.45);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.restore();
  if (!art.rare) return;
  // Three sparkles orbit a rare charm, twinkling in turn.
  for (let i = 0; i < 3; i++) {
    const a = (o.reducedMotion ? 0 : t * 1.3) + (i * TAU) / 3;
    const tw = o.reducedMotion ? 0.8 : Math.max(0, Math.sin(t * 3.1 + i * 2.1));
    if (tw <= 0.05) continue;
    const sx = x + Math.cos(a) * r * 1.55;
    const sy = y - r * 0.2 + Math.sin(a) * r * 0.9;
    ctx.save();
    ctx.globalAlpha = alphaOf(ctx) * k * tw;
    trace(ctx, sparkle(sx, sy, r * (0.22 + 0.12 * tw)));
    fill(ctx, i === 1 ? PALETTE.paper : PALETTE.lantern);
    ctx.restore();
  }
}

/** Light a resting charm casts on the cobbles under it (flattened pool). */
export function drawCharmPool(ctx: Ctx, variant: string, x: number, y: number, r: number, strength: number): void {
  if (strength <= 0) return;
  const art = charmArt(variant);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, x, y, r * (art.rare ? 4.8 : 4), art.glow, 0.5 * strength, 0.42);
  glow(ctx, x, y, r * 1.8, PALETTE.paper, 0.22 * strength, 0.42);
  ctx.restore();
}

/**
 * Opacity of a floor charm in its last seconds: it blinks faster and faster as it runs out.
 * `left` is seconds until it fades; `window` is the blink window (5 s). Pure, for tests.
 */
export function charmBlink(left: number, window: number, reducedMotion: boolean): number {
  if (left >= window) return 1;
  const u = Math.max(0, Math.min(1, 1 - left / window)); // 0 -> 1 over the window
  if (reducedMotion) return 0.45 + 0.55 * (left / window); // steady dimming, no flashing
  // Blink rate rises from 2 Hz to 9 Hz; phase is its integral so the speed-up is smooth.
  const f0 = 2;
  const f1 = 9;
  const tau = u * window;
  const phase = f0 * tau + ((f1 - f0) * tau * tau) / (2 * window);
  const on = Math.cos(phase * TAU) > -0.2;
  return on ? 1 : 0.18;
}

/** Spawn pop scale (0..~1.15..1): a springy back-out over `ms` (420 ms). */
export function charmPopScale(ageMs: number, ms = 420): number {
  if (ageMs >= ms) return 1;
  if (ageMs <= 0) return 0;
  const t = ageMs / ms;
  const c = 2.2;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
}
