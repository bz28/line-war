import type { Food, Item } from '@line-war/sim';
import { foodLook, plateColor, type Shape } from './palette';

/** Low-level Canvas2D drawing helpers (no state, no layout). */

type Ctx = CanvasRenderingContext2D;

export function shapePath(ctx: Ctx, shape: Shape, x: number, y: number, r: number): void {
  ctx.beginPath();
  switch (shape) {
    case 'circle':
      ctx.arc(x, y, r, 0, Math.PI * 2);
      break;
    case 'square':
      ctx.rect(x - r * 0.85, y - r * 0.85, r * 1.7, r * 1.7);
      break;
    case 'diamond':
      ctx.moveTo(x, y - r * 1.1);
      ctx.lineTo(x + r * 1.1, y);
      ctx.lineTo(x, y + r * 1.1);
      ctx.lineTo(x - r * 1.1, y);
      ctx.closePath();
      break;
    case 'triangle':
      ctx.moveTo(x, y - r * 1.1);
      ctx.lineTo(x + r * 1.05, y + r * 0.8);
      ctx.lineTo(x - r * 1.05, y + r * 0.8);
      ctx.closePath();
      break;
    case 'hexagon':
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i + Math.PI / 6;
        const px = x + Math.cos(a) * r;
        const py = y + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      break;
    case 'dome':
      ctx.moveTo(x - r, y + r * 0.45);
      ctx.arc(x, y + r * 0.45, r, Math.PI, 0);
      ctx.closePath();
      break;
  }
}

export function circle(ctx: Ctx, x: number, y: number, r: number, fill: string): void {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

export function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.arcTo(x + w, y, x + w, y + rr, rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
  ctx.lineTo(x + rr, y + h);
  ctx.arcTo(x, y + h, x, y + h - rr, rr);
  ctx.lineTo(x, y + rr);
  ctx.arcTo(x, y, x + rr, y, rr);
  ctx.closePath();
}

export function text(
  ctx: Ctx,
  t: string,
  x: number,
  y: number,
  color: string,
  size: number,
  align: CanvasTextAlign = 'center',
  weight = 600,
): void {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px system-ui, -apple-system, Segoe UI, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(t, x, y);
}

/** Text with a dark outline so it reads on any background. */
export function outlinedText(ctx: Ctx, t: string, x: number, y: number, color: string, size: number, align: CanvasTextAlign = 'center'): void {
  ctx.font = `800 ${size}px system-ui, -apple-system, Segoe UI, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.lineWidth = Math.max(2, size / 5);
  ctx.strokeStyle = '#000000cc';
  ctx.strokeText(t, x, y);
  ctx.fillStyle = color;
  ctx.fillText(t, x, y);
}

/** Progress ring (fraction 0..1, clockwise from 12 o'clock). */
export function ring(ctx: Ctx, x: number, y: number, r: number, fraction: number, color: string, width = 3, track = '#00000088'): void {
  ctx.lineWidth = width;
  ctx.strokeStyle = track;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  if (fraction <= 0) return;
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, fraction));
  ctx.stroke();
}

/** Horizontal progress bar. */
export function bar(ctx: Ctx, x: number, y: number, w: number, h: number, fraction: number, color: string, track = '#000000aa'): void {
  ctx.fillStyle = track;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w * Math.max(0, Math.min(1, fraction)), h);
}

/** One piece of food: colour + shape (+ letter when large enough), state encoded in size/outline/slices. */
export function drawFood(ctx: Ctx, food: Food, x: number, y: number, r: number): void {
  const look = foodLook(food.kind, food.state);
  const rr = r * look.scale;
  shapePath(ctx, look.shape, x, y, rr);
  ctx.fillStyle = look.fill;
  ctx.fill();
  ctx.lineWidth = look.outlineWidth * Math.max(0.6, r / 9);
  ctx.strokeStyle = look.outline;
  ctx.stroke();
  if (look.sliced) {
    ctx.strokeStyle = '#ffffffcc';
    ctx.lineWidth = Math.max(1, r / 7);
    ctx.beginPath();
    ctx.moveTo(x - rr * 0.7, y - rr * 0.25);
    ctx.lineTo(x + rr * 0.7, y - rr * 0.25);
    ctx.moveTo(x - rr * 0.7, y + rr * 0.3);
    ctx.lineTo(x + rr * 0.7, y + rr * 0.3);
    ctx.stroke();
  }
  if (r >= 8) text(ctx, look.letter, x, y + rr * 0.05, food.state === 'burnt' ? '#888' : '#000000bb', Math.round(rr * 1.05), 'center', 800);
}

/** An item (ingredient or plate) centred at x,y with radius r. */
export function drawItem(ctx: Ctx, item: Item, x: number, y: number, r: number): void {
  if (item.type === 'ingredient') {
    drawFood(ctx, item, x, y, r);
    return;
  }
  const pr = r * 1.3;
  circle(ctx, x, y, pr, plateColor(item));
  ctx.lineWidth = 2;
  ctx.strokeStyle = item.cold ? '#3d7bd9' : '#00000077';
  ctx.beginPath();
  ctx.arc(x, y, pr, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = '#00000022';
  ctx.beginPath();
  ctx.arc(x, y, pr * 0.72, 0, Math.PI * 2);
  ctx.stroke();
  if (item.dirty) {
    // Grime spots.
    circle(ctx, x - pr * 0.35, y - pr * 0.2, pr * 0.15, '#4d4a3f');
    circle(ctx, x + pr * 0.3, y + pr * 0.25, pr * 0.12, '#4d4a3f');
    circle(ctx, x + pr * 0.1, y - pr * 0.4, pr * 0.1, '#4d4a3f');
  }
  const n = item.contents.length;
  const fr = n <= 1 ? r * 0.75 : r * 0.55;
  item.contents.forEach((f, i) => {
    const a = n <= 1 ? 0 : (Math.PI * 2 * i) / n - Math.PI / 2;
    const off = n <= 1 ? 0 : pr * 0.45;
    drawFood(ctx, f, x + Math.cos(a) * off, y + Math.sin(a) * off, fr);
  });
  if (item.cold) {
    ctx.fillStyle = 'rgba(120,170,255,0.35)';
    ctx.beginPath();
    ctx.arc(x, y, pr, 0, Math.PI * 2);
    ctx.fill();
    outlinedText(ctx, '❄', x + pr * 0.85, y - pr * 0.85, '#cfe3ff', Math.round(pr * 0.9));
  }
}
