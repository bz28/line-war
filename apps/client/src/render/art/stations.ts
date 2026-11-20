import type { FireState, MatchState, StationState, TeamId, TileDef, VesselState } from '@line-war/sim';
import { PALETTE, WORLD } from '../../art/tokens';
import { chopProgress, extinguishProgress, vesselProgress, washProgress } from '../format';
import { mix, withAlpha } from '../palette';
import type { Ctx, SpriteCache } from '../sprites';
import { circle, ellipse, fill, glow, rrect, stroke, TAU } from './draw';
import { drawItem, itemShadow, paintPlate } from './food';
import { kindAt, px, py, topCenter, type Scene } from './scene';

/** Per-frame drawing of what changes on stations: items, vessels, stock, progress, fire. */

export interface FrameCtx {
  sc: Scene;
  sprites: SpriteCache;
  /** Renderer clock, ms. */
  now: number;
  /** Tiles someone is working on this tick (chopping / washing / extinguishing). */
  worked: ReadonlySet<number>;
  /** ms since each team's last delivery (bell ring), or Infinity. */
  bellAge: Record<TeamId, number>;
  reducedMotion: boolean;
}

/** Item radius on a station top (items are drawn larger than life on purpose). */
export const itemR = (T: number): number => T * 0.25;

/** Lantern-gold progress ring with a dark track. */
export function progressRing(ctx: Ctx, x: number, y: number, r: number, f: number, color: string = PALETTE.lantern, width = 4): void {
  circle(ctx, x, y, r);
  stroke(ctx, withAlpha(PALETTE.nightDeep, 0.6), width + 2.5);
  if (f <= 0) return;
  ctx.beginPath();
  ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, f));
  ctx.lineCap = 'round';
  stroke(ctx, color, width);
  ctx.lineCap = 'butt';
}

/** Round badge above a station: check mark (ready) or exclamation (danger). */
function badge(ctx: Ctx, x: number, y: number, r: number, kind: 'ready' | 'danger', pulse: number): void {
  const rr = r * (1 + pulse * 0.18);
  circle(ctx, x + 1, y + 2, rr);
  fill(ctx, withAlpha(PALETTE.nightDeep, 0.45));
  circle(ctx, x, y, rr);
  fill(ctx, kind === 'ready' ? PALETTE.lantern : PALETTE.danger);
  circle(ctx, x, y, rr);
  stroke(ctx, PALETTE.paper, 1.6);
  ctx.strokeStyle = kind === 'ready' ? PALETTE.ink : PALETTE.paper;
  ctx.lineWidth = rr * 0.32;
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (kind === 'ready') {
    ctx.moveTo(x - rr * 0.42, y);
    ctx.lineTo(x - rr * 0.1, y + rr * 0.35);
    ctx.lineTo(x + rr * 0.45, y - rr * 0.35);
  } else {
    ctx.moveTo(x, y - rr * 0.5);
    ctx.lineTo(x, y + rr * 0.1);
    ctx.moveTo(x, y + rr * 0.48);
    ctx.lineTo(x, y + rr * 0.5);
  }
  ctx.stroke();
  ctx.lineCap = 'butt';
}

/** 0..1 pulse; faster as `urgency` (0..1) rises. Steady in reduced motion. */
function pulse(now: number, urgency: number, reduced: boolean): number {
  if (reduced) return 0.5;
  const hz = 1.5 + urgency * 4.5;
  return 0.5 + 0.5 * Math.sin((now / 1000) * hz * TAU);
}

function flameTongue(ctx: Ctx, x: number, base: number, w: number, h: number, lean: number): void {
  ctx.beginPath();
  ctx.moveTo(x - w, base);
  ctx.bezierCurveTo(x - w, base - h * 0.45, x - w * 0.2 + lean * 0.5, base - h * 0.6, x + lean, base - h);
  ctx.bezierCurveTo(x + w * 0.3 + lean * 0.5, base - h * 0.6, x + w, base - h * 0.4, x + w, base);
  ctx.closePath();
}

/** Burner flames licking out round a vessel's base. */
function burner(ctx: Ctx, cx: number, cy: number, T: number, now: number, intensity: number): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, cx, cy + T * 0.05, T * 0.6, PALETTE.lanternHot, 0.35 * intensity);
  ctx.restore();
  const n = 7;
  for (let k = 0; k < n; k++) {
    const a = Math.PI * 0.12 + (k / (n - 1)) * Math.PI * 0.76;
    const fx = cx + Math.cos(a) * T * 0.36;
    const fy = cy + Math.sin(a) * T * 0.3 + 2;
    const flick = 0.75 + 0.25 * Math.sin(now / 70 + k * 1.7);
    const h = T * 0.16 * flick * intensity;
    ctx.fillStyle = PALETTE.lanternHot;
    flameTongue(ctx, fx, fy + 1, T * 0.05, h, Math.sin(now / 90 + k) * 1.5);
    ctx.fill();
    ctx.fillStyle = PALETTE.lantern;
    flameTongue(ctx, fx, fy + 1, T * 0.025, h * 0.55, 0);
    ctx.fill();
  }
}

function wok(ctx: Ctx, cx: number, cy: number, T: number, burnt: boolean): void {
  // Handle first (behind on the right).
  ctx.save();
  ctx.translate(cx + T * 0.3, cy + T * 0.04);
  ctx.rotate(0.35);
  rrect(ctx, 0, -2.5, T * 0.26, 5, 2.5);
  fill(ctx, PALETTE.bambooDark);
  ctx.restore();
  ellipse(ctx, cx + 1, cy + 3, T * 0.37, T * 0.32);
  fill(ctx, withAlpha(PALETTE.nightDeep, 0.5));
  ellipse(ctx, cx, cy, T * 0.37, T * 0.32);
  fill(ctx, WORLD.iron);
  const g = ctx.createRadialGradient(cx - T * 0.08, cy - T * 0.08, 2, cx, cy, T * 0.31);
  g.addColorStop(0, burnt ? WORLD.char : WORLD.steelDark);
  g.addColorStop(1, WORLD.iron);
  ellipse(ctx, cx, cy, T * 0.31, T * 0.26);
  fill(ctx, g);
  ctx.beginPath();
  ctx.ellipse(cx, cy, T * 0.35, T * 0.3, 0, Math.PI * 1.05, Math.PI * 1.5);
  stroke(ctx, withAlpha(WORLD.steelLight, 0.7), 1.6);
}

function pot(ctx: Ctx, cx: number, cy: number, T: number, v: VesselState, cap: number): void {
  const w = T * 0.7;
  const top = cy - T * 0.12;
  const bottom = cy + T * 0.22;
  // Handles.
  for (const s of [-1, 1]) {
    rrect(ctx, cx + s * (w / 2 + 2) - 4, top + 2, 8, 5, 2.5);
    fill(ctx, WORLD.steelDark);
  }
  // Body.
  ctx.beginPath();
  ctx.moveTo(cx - w / 2, top);
  ctx.lineTo(cx - w / 2, bottom);
  ctx.ellipse(cx, bottom, w / 2, T * 0.12, 0, Math.PI, 0, true);
  ctx.lineTo(cx + w / 2, top);
  ctx.closePath();
  const g = ctx.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0);
  g.addColorStop(0, WORLD.steelLight);
  g.addColorStop(0.35, PALETTE.steel);
  g.addColorStop(1, WORLD.steelDark);
  fill(ctx, g);
  // Rim + inside.
  ellipse(ctx, cx, top, w / 2, T * 0.17);
  fill(ctx, WORLD.steelLight);
  ellipse(ctx, cx, top + 1, w / 2 - 3, T * 0.17 - 3);
  const n = v.contents.length;
  const burnt = v.status === 'burnt' || v.status === 'fire';
  const cooked = v.status === 'done';
  let liquid: string = WORLD.iron;
  if (n > 0) {
    const base = v.contents[0]!.kind === 'tomato' ? WORLD.tomato : WORLD.bun;
    liquid = burnt ? WORLD.char : cooked ? mix(base, WORLD.tomatoDark, 0.3) : mix(base, PALETTE.paper, 0.25 * (1 - n / Math.max(1, cap)));
  }
  fill(ctx, liquid);
  if (n > 0 && !burnt) {
    ellipse(ctx, cx - w * 0.12, top - 1, w * 0.14, T * 0.03);
    fill(ctx, withAlpha(PALETTE.paper, 0.4));
  }
  // Fill pips on the front: how many of `cap` are in (2/3 reads without numbers).
  for (let k = 0; k < cap; k++) {
    const x = cx + (k - (cap - 1) / 2) * 9;
    circle(ctx, x, bottom - 2, 3);
    fill(ctx, k < n ? PALETTE.lantern : withAlpha(PALETTE.nightDeep, 0.55));
    circle(ctx, x, bottom - 2, 3);
    stroke(ctx, withAlpha(PALETTE.nightDeep, 0.6), 1);
  }
}

function drawVessel(ctx: Ctx, f: FrameCtx, s: MatchState, st: StationState, i: number): void {
  const v = st.vessel!;
  const { T } = f.sc;
  const c = topCenter(f.sc, i);
  const active = v.status === 'cooking' || v.status === 'done';
  if (active || v.status === 'burnt') burner(ctx, c.x, c.y, T, f.now, v.status === 'burnt' ? 1.2 : 1);
  const n = v.contents.length;
  const sizzle = !f.reducedMotion && v.status === 'cooking' ? Math.sin(f.now / 45) * 0.8 : 0;
  if (v.kind === 'pan') {
    wok(ctx, c.x, c.y, T, v.status === 'burnt' || v.status === 'fire');
    v.contents.forEach((food, k) => {
      const ox = n <= 1 ? 0 : (k - (n - 1) / 2) * T * 0.2;
      drawItem(ctx, f.sprites, food, c.x + ox + sizzle, c.y - 1, T * 0.21);
    });
  } else {
    pot(ctx, c.x, c.y, T, v, s.config.tuning.potCapacity);
    v.contents.forEach((food, k) => {
      const a = (k / Math.max(1, n)) * TAU + 0.6;
      drawItem(ctx, f.sprites, food, c.x + Math.cos(a) * T * 0.12 + sizzle, c.y - T * 0.13 + Math.sin(a) * T * 0.04, T * 0.12);
    });
  }
  const p = vesselProgress(s, v);
  if (!p) return;
  const R = T * 0.46;
  const bx = c.x + T * 0.34;
  const by = c.y - T * 0.38;
  if (p.kind === 'cook') {
    progressRing(ctx, c.x, c.y, R, p.fraction);
  } else if (p.kind === 'burn') {
    const pl = pulse(f.now, p.fraction, f.reducedMotion);
    progressRing(ctx, c.x, c.y, R, p.fraction, mix(PALETTE.lanternHot, PALETTE.danger, p.fraction), 4 + pl * p.fraction * 2);
    badge(ctx, bx, by, T * 0.15, p.fraction > 0.6 ? 'danger' : 'ready', p.fraction > 0.6 ? pl : 0);
  } else if (v.status === 'burnt') {
    const pl = pulse(f.now, 1, f.reducedMotion);
    progressRing(ctx, c.x, c.y, R, p.fraction, PALETTE.danger, 4 + pl * 2);
    badge(ctx, bx, by, T * 0.15, 'danger', pl);
  }
}

function knife(ctx: Ctx, x: number, y: number, T: number, a: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  rrect(ctx, -T * 0.05, -2.5, T * 0.16, 5, 2);
  fill(ctx, WORLD.iron);
  ctx.beginPath();
  ctx.moveTo(T * 0.1, -3);
  ctx.lineTo(T * 0.38, -3.5);
  ctx.quadraticCurveTo(T * 0.42, 0, T * 0.36, 3);
  ctx.lineTo(T * 0.1, 3);
  ctx.closePath();
  fill(ctx, WORLD.steelLight);
  ctx.fillStyle = withAlpha(PALETTE.paper, 0.8);
  ctx.fillRect(T * 0.12, -3, T * 0.24, 1.2);
  ctx.restore();
}

function crateStock(ctx: Ctx, f: FrameCtx, def: TileDef, st: StationState, i: number): void {
  if (!def.ingredient) return;
  const { T } = f.sc;
  const c = topCenter(f.sc, i);
  const shown = Math.min(st.stock, 6);
  const spots: [number, number][] = [
    [-0.17, 0.12],
    [0.17, 0.12],
    [0, 0.0],
    [-0.17, -0.12],
    [0.17, -0.12],
    [0, -0.2],
  ];
  for (let k = 0; k < shown; k++) {
    const [ox, oy] = spots[k]!;
    drawItem(ctx, f.sprites, { kind: def.ingredient, state: 'raw' }, c.x + ox * T, c.y + oy * T - k * 0.6, T * 0.17);
  }
  if (st.stock > shown) {
    ctx.font = `800 ${Math.round(T * 0.22)}px 'M PLUS Rounded 1c', system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    rrect(ctx, c.x + T * 0.16, c.y + T * 0.22, T * 0.34, T * 0.24, 6);
    fill(ctx, PALETTE.paper);
    ctx.fillStyle = PALETTE.ink;
    ctx.fillText(`${st.stock}`, c.x + T * 0.33, c.y + T * 0.345);
  }
}

function sinkContents(ctx: Ctx, f: FrameCtx, s: MatchState, st: StationState, i: number): void {
  const { T } = f.sc;
  const c = topCenter(f.sc, i);
  const n = Math.min(st.dirtyPlates, 3);
  for (let k = 0; k < n; k++) {
    drawItem(ctx, f.sprites, { id: -1, type: 'plate', dirty: true, contents: [], platedAtTick: null, cold: false }, c.x - 2 + k, c.y + 3 - k * 3, T * 0.19);
  }
  const working = f.worked.has(i) && st.dirtyPlates > 0;
  if (n > 0 || working) {
    // Suds.
    const bob = working && !f.reducedMotion ? f.now / 160 : 0;
    const spots: [number, number, number][] = [
      [-0.26, 0.12, 0.09],
      [-0.16, 0.2, 0.07],
      [0.22, 0.16, 0.08],
      [0.28, 0.05, 0.06],
      [-0.28, -0.04, 0.06],
      [0.05, 0.22, 0.06],
    ];
    spots.forEach(([x, y, r], k) => {
      const rr = T * r * (1 + 0.12 * Math.sin(bob + k * 1.3));
      circle(ctx, c.x + x * T, c.y + y * T, rr);
      fill(ctx, withAlpha(PALETTE.paper, 0.88));
      circle(ctx, c.x + x * T - rr * 0.3, c.y + y * T - rr * 0.3, rr * 0.3);
      fill(ctx, PALETTE.paper);
    });
  }
  if (st.workTicks > 0) progressRing(ctx, c.x, c.y, T * 0.44, washProgress(s, st.workTicks), WORLD.frost);
  if (st.dirtyPlates > 3) countTag(ctx, c.x + T * 0.3, c.y - T * 0.28, T, st.dirtyPlates);
}

function countTag(ctx: Ctx, x: number, y: number, T: number, n: number): void {
  ctx.font = `800 ${Math.round(T * 0.22)}px 'M PLUS Rounded 1c', system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  circle(ctx, x, y, T * 0.15);
  fill(ctx, PALETTE.paper);
  circle(ctx, x, y, T * 0.15);
  stroke(ctx, PALETTE.ink, 1.2);
  ctx.fillStyle = PALETTE.ink;
  ctx.fillText(String(n), x, y + 0.5);
}

function plateStack(ctx: Ctx, f: FrameCtx, st: StationState, i: number): void {
  const { T } = f.sc;
  const c = topCenter(f.sc, i);
  const n = Math.min(st.stock, 6);
  const r = T * 0.22;
  for (let k = 0; k < n; k++) {
    f.sprites.draw(ctx, `stack:${r.toFixed(1)}`, r * 1.65, c.x, c.y + 3 - k * 3.4, (cx) => paintPlate(cx, { dirty: false, cold: false, contents: [] }, r));
  }
}

function bell(ctx: Ctx, x: number, y: number, T: number, age: number, reduced: boolean): void {
  const ringing = age < 700 && !reduced;
  const wob = ringing ? Math.sin(age / 28) * 0.35 * (1 - age / 700) : 0;
  ctx.save();
  ctx.translate(x, y);
  ellipse(ctx, 1, 2, T * 0.17, T * 0.06);
  fill(ctx, withAlpha(PALETTE.nightDeep, 0.35));
  ctx.rotate(wob);
  ellipse(ctx, 0, 0, T * 0.15, T * 0.05);
  fill(ctx, PALETTE.bambooDark);
  ctx.beginPath();
  ctx.moveTo(-T * 0.12, 0);
  ctx.bezierCurveTo(-T * 0.12, -T * 0.2, T * 0.12, -T * 0.2, T * 0.12, 0);
  ctx.closePath();
  const g = ctx.createLinearGradient(-T * 0.12, 0, T * 0.12, 0);
  g.addColorStop(0, PALETTE.paper);
  g.addColorStop(0.35, PALETTE.lantern);
  g.addColorStop(1, PALETTE.lanternHot);
  fill(ctx, g);
  circle(ctx, 0, -T * 0.16, 2);
  fill(ctx, PALETTE.lanternHot);
  ctx.restore();
  if (ringing) {
    ctx.strokeStyle = withAlpha(PALETTE.lantern, 1 - age / 700);
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (const s of [-1, 1]) {
      ctx.moveTo(x + s * T * 0.2, y - T * 0.2);
      ctx.lineTo(x + s * T * 0.28, y - T * 0.28);
      ctx.moveTo(x + s * T * 0.22, y - T * 0.08);
      ctx.lineTo(x + s * T * 0.32, y - T * 0.1);
    }
    ctx.stroke();
    ctx.lineCap = 'butt';
  }
}

/** Everything dynamic on one station tile. */
export function drawStation(ctx: Ctx, f: FrameCtx, s: MatchState, i: number, def: TileDef, st: StationState | undefined, owner: TeamId | null): void {
  const { sc } = f;
  const { T } = sc;
  const c = topCenter(sc, i);
  const x = i % sc.W;
  const y = Math.floor(i / sc.W);
  switch (def.kind) {
    case 'crate':
      if (st) crateStock(ctx, f, def, st, i);
      return;
    case 'plates':
      if (st) plateStack(ctx, f, st, i);
      break;
    case 'sink':
      if (st) sinkContents(ctx, f, s, st, i);
      break;
    case 'pass':
      if (owner !== null && kindAt(sc, x - 1, y) !== 'pass') bell(ctx, px(sc, x) + T * 0.24, py(sc, y) + T * 0.66 - T * 0.17, T, f.bellAge[owner], f.reducedMotion);
      break;
    case 'stove':
      if (st?.vessel) drawVessel(ctx, f, s, st, i);
      break;
    default:
      break;
  }
  if (!st?.item) {
    if (def.kind === 'board') knife(ctx, c.x + T * 0.04, c.y + T * 0.2, T, -0.25);
    return;
  }
  const r = itemR(T);
  const lift = def.kind === 'board' ? 1 : 2;
  itemShadow(ctx, c.x, c.y - lift, r, st.item.type === 'plate');
  drawItem(ctx, f.sprites, st.item, c.x, c.y - lift - (st.item.type === 'plate' ? 0 : 2), r);
  if (def.kind === 'board') {
    const chopping = f.worked.has(i) && !f.reducedMotion;
    const phase = chopping ? Math.abs(Math.sin(f.now / 70)) : 0;
    knife(ctx, c.x + T * 0.08 - phase * T * 0.1, c.y + T * 0.16 - phase * T * 0.22, T, -0.25 - phase * 0.6);
    if (st.workTicks > 0) progressRing(ctx, c.x, c.y, T * 0.44, chopProgress(s, st.workTicks));
  }
}

/** Layered animated flames + glow on a burning tile, with the extinguish ring. */
export function drawFire(ctx: Ctx, f: FrameCtx, s: MatchState, fire: FireState): void {
  const { sc } = f;
  const { T } = sc;
  const c = topCenter(sc, fire.tile);
  const now = f.reducedMotion ? 0 : f.now;
  const base = c.y + T * 0.24;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, c.x, c.y, T * 1.3, PALETTE.danger, 0.4 + 0.08 * Math.sin(now / 110));
  glow(ctx, c.x, c.y, T * 0.7, PALETTE.lanternHot, 0.35);
  ctx.restore();
  const layers: [string, number, number][] = [
    [PALETTE.danger, 1, 0.26],
    [PALETTE.lanternHot, 0.75, 0.2],
    [PALETTE.lantern, 0.48, 0.13],
    [PALETTE.paper, 0.22, 0.07],
  ];
  layers.forEach(([color, hs, ws], li) => {
    ctx.fillStyle = color;
    const tongues = li === 0 ? 4 : 3;
    for (let k = 0; k < tongues; k++) {
      const off = (k - (tongues - 1) / 2) * T * 0.2 * (1 - li * 0.2);
      const flick = 0.78 + 0.22 * Math.sin(now / (55 + k * 13 + li * 7) + k * 2.1 + fire.tile);
      const h = T * 0.95 * hs * flick * (k === Math.floor(tongues / 2) ? 1.12 : 0.88);
      flameTongue(ctx, c.x + off, base, T * ws, h, Math.sin(now / 120 + k + li) * T * 0.06);
      ctx.fill();
    }
  });
  if (fire.extinguishTicks > 0) progressRing(ctx, c.x, c.y, T * 0.46, extinguishProgress(s, fire.extinguishTicks), WORLD.frost);
}
