import { PALETTE } from '../../art/tokens';
import { withAlpha } from '../palette';
import type { Ctx } from '../sprites';

/** Small shared Canvas2D helpers for the world art. */

export const TAU = Math.PI * 2;

/** Deterministic hash -> [0, 1). Static textures use it so every rebuild looks the same. */
export function hash(a: number, b = 0, c = 0): number {
  let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(c | 0, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export function ellipse(ctx: Ctx, x: number, y: number, rx: number, ry: number, rot = 0): void {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU);
}

export function circle(ctx: Ctx, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0.01, r), 0, TAU);
}

/** Rounded rect path with per-corner radii [tl, tr, br, bl]. */
export function rrect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number | [number, number, number, number]): void {
  const [tl, tr, br, bl] = (typeof r === 'number' ? [r, r, r, r] : r).map((v) => Math.max(0, Math.min(v, w / 2, h / 2))) as [
    number,
    number,
    number,
    number,
  ];
  ctx.beginPath();
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + w - tr, y);
  ctx.arcTo(x + w, y, x + w, y + tr, tr);
  ctx.lineTo(x + w, y + h - br);
  ctx.arcTo(x + w, y + h, x + w - br, y + h, br);
  ctx.lineTo(x + bl, y + h);
  ctx.arcTo(x, y + h, x, y + h - bl, bl);
  ctx.lineTo(x, y + tl);
  ctx.arcTo(x, y, x + tl, y, tl);
  ctx.closePath();
}

export function fill(ctx: Ctx, color: string | CanvasGradient): void {
  ctx.fillStyle = color;
  ctx.fill();
}

export function stroke(ctx: Ctx, color: string, width: number): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

/** Radial glow (light pool, bloom) of `color` fading to nothing at radius r. */
export function glow(ctx: Ctx, x: number, y: number, r: number, color: string, alpha: number, sy = 1): void {
  if (r <= 0 || alpha <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, sy);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  g.addColorStop(0, withAlpha(color, alpha));
  g.addColorStop(0.45, withAlpha(color, alpha * 0.45));
  g.addColorStop(1, withAlpha(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(-r, -r, r * 2, r * 2);
  ctx.restore();
}

/** Five-point star path (dizzy stars, sparkles). */
export function starPath(ctx: Ctx, x: number, y: number, outer: number, inner: number, rot = -Math.PI / 2, points = 5): void {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const a = rot + (i * Math.PI) / points;
    const rr = i % 2 === 0 ? outer : inner;
    if (i === 0) ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    else ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}

/** Soft drop shadow (light from the upper left), faked with stacked translucent shapes. */
export function softShadow(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, alpha: number): void {
  for (let k = 0; k < 3; k++) {
    const g = k * 1.6;
    rrect(ctx, x - g, y - g, w + g * 2, h + g * 2, r + g);
    fill(ctx, withAlpha(PALETTE.nightDeep, alpha * (0.55 - k * 0.15)));
  }
}

/** Text with a soft dark outline (world-space popups). */
export function outlined(ctx: Ctx, text: string, x: number, y: number, color: string, size: number, font: string, outline: string = PALETTE.nightDeep): void {
  ctx.font = `${size}px ${font}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(2, size * 0.22);
  ctx.strokeStyle = outline;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}
