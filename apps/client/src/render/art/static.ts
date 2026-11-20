import type { IngredientKind, TeamId, Zone } from '@line-war/sim';
import { LIGHT, PALETTE, TEAMS, WORLD } from '../../art/tokens';
import { mix, withAlpha } from '../palette';
import type { Rect } from '../layout';
import type { Ctx } from '../sprites';
import { circle, ellipse, fill, glow, hash, rrect, softShadow, stroke, TAU } from './draw';
import { paintFood } from './food';
import { isCounterFamily, kindAt, liftAt, ownerAt, px, py, tileAtXY, wallLook, zoneAt, type Scene } from './scene';

/**
 * Static diorama layers, painted once per resize / kitchen swap into offscreen canvases:
 *  - base: night backdrop, wooden kitchen floors, market cobbles, light pools, door mats, shadows;
 *  - one layer per row: the raised blocks of that row (walls, counters, station bodies), so the
 *    renderer can interleave them with players for correct 3/4 overlap;
 *  - lights: string lights and their bulbs (drawn over everything, they hang overhead).
 */

const isKitchen = (z: Zone) => z === 'kitchen0' || z === 'kitchen1';

/** Bottom edge trim in a crew's pattern: Jade = scallops, Ember = zig-zag (team shape cue). */
export function trimPath(ctx: Ctx, team: TeamId, x0: number, x1: number, y: number, depth: number, step: number): void {
  ctx.beginPath();
  ctx.moveTo(x0, y - depth);
  ctx.lineTo(x0, y);
  const n = Math.max(1, Math.round((x1 - x0) / step));
  const w = (x1 - x0) / n;
  for (let i = 0; i < n; i++) {
    const a = x0 + i * w;
    if (team === 0) ctx.arc(a + w / 2, y, w / 2, Math.PI, 0, true);
    else {
      ctx.lineTo(a + w / 2, y + depth);
      ctx.lineTo(a + w, y);
    }
  }
  ctx.lineTo(x1, y - depth);
  ctx.closePath();
}

// ---------------------------------------------------------------- base layer

function sky(ctx: Ctx, sc: Scene): void {
  const { layout, T } = sc;
  // The margins stay transparent (the stage backdrop shows through); only soft distant bokeh.
  const colors = [PALETTE.lantern, PALETTE.lanternHot, PALETTE.lantern, TEAMS[0].light, PALETTE.paper];
  for (let i = 0; i < 26; i++) {
    const x = hash(i, 11) * layout.width;
    const y = (0.15 + hash(i, 12) * 0.75) * layout.world.y;
    const r = T * (0.12 + hash(i, 13) * 0.35);
    glow(ctx, x, y, r, colors[i % colors.length]!, 0.18 + hash(i, 14) * 0.2);
  }
}

/** Clip to the union of non-wall tiles matching `pick`, run `paint`, restore. */
function clipTiles(ctx: Ctx, sc: Scene, pick: (x: number, y: number) => boolean, paint: () => void): void {
  ctx.save();
  ctx.beginPath();
  let any = false;
  for (let y = 0; y < sc.H; y++)
    for (let x = 0; x < sc.W; x++) {
      if ((kindAt(sc, x, y) === 'wall' && wallLook(sc, x, y) !== 'planter') || !pick(x, y)) continue;
      ctx.rect(px(sc, x), py(sc, y), sc.T, sc.T);
      any = true;
    }
  if (any) {
    ctx.clip();
    paint();
  }
  ctx.restore();
}

function planks(ctx: Ctx, sc: Scene, seed: number): void {
  const { layout, T } = sc;
  const ph = T / 3;
  const tones = [WORLD.plankA, WORLD.plankB, WORLD.plankC];
  const x0 = layout.world.x;
  const x1 = x0 + layout.world.w;
  for (let row = 0, y = layout.world.y; y < layout.world.y + layout.world.h; row++, y += ph) {
    let x = x0 - hash(row, seed, 1) * T * 2;
    for (let k = 0; x < x1; k++) {
      const len = T * (1.6 + hash(row, k, seed) * 1.8);
      const tone = tones[Math.floor(hash(row, k, seed + 7) * 3)]!;
      ctx.fillStyle = tone;
      ctx.fillRect(x, y, len, ph);
      // Grain.
      ctx.strokeStyle = withAlpha(WORLD.plankSeam, 0.2);
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      for (let g = 0; g < 2; g++) {
        const gy = y + ph * (0.3 + g * 0.4) + (hash(row, k, g) - 0.5) * 2;
        ctx.moveTo(x + 4, gy);
        ctx.bezierCurveTo(x + len * 0.3, gy - 1.5, x + len * 0.6, gy + 1.5, x + len - 4, gy);
      }
      ctx.stroke();
      // Lit top edge, dark seam, nail heads.
      ctx.fillStyle = withAlpha(PALETTE.bamboo, 0.1);
      ctx.fillRect(x, y, len, 1.2);
      ctx.fillStyle = WORLD.plankSeam;
      ctx.fillRect(x, y + ph - 1.2, len, 1.2);
      ctx.fillRect(x + len - 1, y, 1.4, ph);
      x += len;
    }
  }
}

function cobbles(ctx: Ctx, sc: Scene): void {
  const { layout, T } = sc;
  ctx.fillStyle = mix(WORLD.grout, WORLD.stoneDark, 0.35);
  ctx.fillRect(layout.world.x, layout.world.y, layout.world.w, layout.world.h);
  const sh = T / 2.3;
  for (let row = 0, y = layout.world.y; y < layout.world.y + layout.world.h; row++, y += sh) {
    let x = layout.world.x - (row % 2) * T * 0.25 - hash(row, 3) * T * 0.3;
    for (let k = 0; x < layout.world.x + layout.world.w; k++) {
      const w = T * (0.38 + hash(row, k, 5) * 0.3);
      const t = hash(row, k, 9);
      const inset = 1.6;
      const sx = x + inset;
      const sy = y + inset + (hash(row, k, 2) - 0.5) * 1.5;
      const sw = w - inset * 2;
      const shh = sh - inset * 2;
      rrect(ctx, sx, sy, sw, shh, shh * 0.42);
      fill(ctx, mix(PALETTE.slate, WORLD.stoneDark, t * 0.6));
      // Lit upper-left rim (light from the upper left).
      ctx.beginPath();
      ctx.moveTo(sx + 2, sy + shh * 0.6);
      ctx.quadraticCurveTo(sx + 2, sy + 2, sx + sw * 0.5, sy + 1.5);
      stroke(ctx, withAlpha(WORLD.stoneLit, 0.35 + t * 0.15), 1.3);
      x += w;
    }
  }
}

function puddles(ctx: Ctx, sc: Scene, marketCols: [number, number]): void {
  const { T } = sc;
  const spots: [number, number, number][] = [
    [0.18, 0.2, 0.9],
    [0.82, 0.62, 0.7],
    [0.3, 0.86, 0.6],
  ];
  for (const [fx, fy, s] of spots) {
    const x = px(sc, marketCols[0] + fx * (marketCols[1] - marketCols[0] + 1));
    const y = py(sc, 1 + fy * (sc.H - 2));
    ellipse(ctx, x, y, T * 0.6 * s, T * 0.24 * s);
    fill(ctx, withAlpha(WORLD.puddle, 0.22));
    ellipse(ctx, x + T * 0.04 * s, y + T * 0.02 * s, T * 0.48 * s, T * 0.17 * s);
    fill(ctx, withAlpha(WORLD.puddle, 0.18));
    // Reflected string lights: a few warm glints.
    for (let k = 0; k < 3; k++) {
      ellipse(ctx, x - T * 0.25 * s + k * T * 0.22 * s, y - T * 0.05 * s + (k % 2) * 2, T * 0.06 * s, T * 0.025 * s);
      fill(ctx, withAlpha(PALETTE.lantern, 0.55));
    }
  }
}

function zoneCols(sc: Scene, zone: Zone): [number, number] | null {
  let a = -1;
  let b = -1;
  for (let x = 0; x < sc.W; x++)
    if (zoneAt(sc, x, Math.floor(sc.H / 2)) === zone) {
      if (a < 0) a = x;
      b = x;
    }
  return a < 0 ? null : [a, b];
}

function doorMats(ctx: Ctx, sc: Scene): void {
  const { T } = sc;
  for (let x = 0; x < sc.W; x++) {
    let y0 = -1;
    for (let y = 0; y <= sc.H; y++) {
      const isDoor = y < sc.H && kindAt(sc, x, y) === 'floor' && zoneAt(sc, x, y) === 'none';
      if (isDoor && y0 < 0) y0 = y;
      if (!isDoor && y0 >= 0) {
        const team = ownerAt(sc, x - 1, y0) ?? ownerAt(sc, x + 1, y0) ?? 0;
        const left = ownerAt(sc, x - 1, y0) !== null;
        const X = px(sc, x);
        const Y = py(sc, y0);
        const h = (y - y0) * T;
        // Wooden threshold sill on the kitchen side.
        ctx.fillStyle = PALETTE.bambooDark;
        ctx.fillRect(left ? X : X + T - T * 0.16, Y, T * 0.16, h);
        ctx.fillStyle = withAlpha(WORLD.woodLight, 0.35);
        ctx.fillRect(left ? X : X + T - T * 0.16, Y, T * 0.16, 1.5);
        // Woven runner in the crew's colours, with fringed ends.
        const mx = X + T * 0.2;
        const mw = T * 0.6;
        const my = Y + T * 0.22;
        const mh = h - T * 0.44;
        rrect(ctx, mx, my, mw, mh, 4);
        fill(ctx, mix(TEAMS[team].dark, PALETTE.night, 0.35));
        ctx.save();
        rrect(ctx, mx, my, mw, mh, 4);
        ctx.clip();
        ctx.fillStyle = withAlpha(TEAMS[team].main, 0.32);
        for (let k = 0, yy = my + T * 0.1; yy < my + mh; k++, yy += T * 0.22) ctx.fillRect(mx, yy, mw, T * 0.07);
        ctx.restore();
        rrect(ctx, mx + 3, my + 3, mw - 6, mh - 6, 3);
        stroke(ctx, withAlpha(PALETTE.paper, 0.18), 1);
        ctx.strokeStyle = withAlpha(PALETTE.paper, 0.35);
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let k = 0; k < 6; k++) {
          const fx = mx + 3 + (k * (mw - 6)) / 5;
          ctx.moveTo(fx, my);
          ctx.lineTo(fx, my - 4);
          ctx.moveTo(fx, my + mh);
          ctx.lineTo(fx, my + mh + 4);
        }
        ctx.stroke();
        y0 = -1;
      }
    }
  }
}

/** Shadow each raised block casts down-right onto the floor, plus contact darkening under walls. */
function blockShadows(ctx: Ctx, sc: Scene): void {
  const { T } = sc;
  const dx = LIGHT.shadowDx * T;
  const dy = LIGHT.shadowDy * T;
  for (let y = 0; y < sc.H; y++)
    for (let x = 0; x < sc.W; x++) {
      const k = kindAt(sc, x, y);
      if (k === null || k === 'floor') continue;
      if (k === 'wall' && wallLook(sc, x, y) === 'pond') continue;
      const L = liftAt(sc, x, y);
      if (k === 'trash' || (k === 'wall' && wallLook(sc, x, y) === 'planter')) {
        ellipse(ctx, px(sc, x) + T / 2 + dx, py(sc, y) + T * 0.72 + dy * 0.6, T * 0.36, T * 0.16);
        fill(ctx, withAlpha(PALETTE.nightDeep, LIGHT.shadowAlpha));
        continue;
      }
      const inset = k === 'crate' ? T * 0.03 : 1;
      softShadow(ctx, px(sc, x) + inset + dx, py(sc, y) + inset + dy - L * 0.4, T - inset * 2, T - inset * 2, 6, LIGHT.shadowAlpha);
    }
  // Contact shadow along the foot of every wall that faces down onto floor.
  for (let y = 1; y < sc.H; y++)
    for (let x = 0; x < sc.W; x++) {
      if (kindAt(sc, x, y - 1) !== 'wall' || kindAt(sc, x, y) === 'wall' || wallLook(sc, x, y - 1) === 'pond' || wallLook(sc, x, y - 1) === 'planter') continue;
      const g = ctx.createLinearGradient(0, py(sc, y), 0, py(sc, y) + T * 0.45);
      g.addColorStop(0, withAlpha(PALETTE.nightDeep, 0.55));
      g.addColorStop(1, withAlpha(PALETTE.nightDeep, 0));
      ctx.fillStyle = g;
      ctx.fillRect(px(sc, x), py(sc, y), T, T * 0.45);
    }
}

function lightPools(ctx: Ctx, sc: Scene, market: [number, number] | null): void {
  const { T } = sc;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  if (market) {
    const cx = (px(sc, market[0]) + px(sc, market[1] + 1)) / 2;
    const span = (market[1] - market[0] + 1) * T;
    // Under the string lights along the top, the door line, and around each crate.
    glow(ctx, cx, py(sc, 1.3), span * 0.62, PALETTE.lantern, 0.17, 0.42);
    glow(ctx, cx, py(sc, 6.5), span * 0.62, PALETTE.lantern, 0.1, 0.6);
    // Pools under the doorway lanterns.
    for (const [x, y] of doorLanterns(sc)) glow(ctx, x, y + T * 0.9, T * 1.6, PALETTE.lantern, 0.16, 0.7);
    for (let y = 0; y < sc.H; y++)
      for (let x = market[0]; x <= market[1]; x++)
        if (kindAt(sc, x, y) === 'crate') glow(ctx, px(sc, x) + T / 2, py(sc, y) + T * 0.6, T * 2.1, PALETTE.lantern, 0.26, 0.75);
  }
  // A warm work lamp over each kitchen.
  for (const zone of ['kitchen0', 'kitchen1'] as const) {
    const cols = zoneCols(sc, zone);
    if (!cols) continue;
    const cx = (px(sc, cols[0]) + px(sc, cols[1] + 1)) / 2;
    glow(ctx, cx, py(sc, sc.H * 0.5), T * 3.6, PALETTE.lantern, 0.09, 1.2);
  }
  ctx.restore();
}

export function paintBase(ctx: Ctx, sc: Scene): void {
  sky(ctx, sc);
  const kitchenTint = (zone: 'kitchen0' | 'kitchen1', seed: number) =>
    clipTiles(
      ctx,
      sc,
      (x, y) => zoneAt(sc, x, y) === zone,
      () => {
        planks(ctx, sc, seed);
        const cols = zoneCols(sc, zone);
        const owner = cols ? ownerAt(sc, cols[0], 1) : null;
        if (owner !== null) {
          ctx.fillStyle = withAlpha(TEAMS[owner].main, 0.06);
          ctx.fillRect(sc.layout.world.x, sc.layout.world.y, sc.layout.world.w, sc.layout.world.h);
        }
      },
    );
  kitchenTint('kitchen0', 1);
  kitchenTint('kitchen1', 2);
  const market = zoneCols(sc, 'market');
  clipTiles(
    ctx,
    sc,
    (x, y) => !isKitchen(zoneAt(sc, x, y)),
    () => {
      cobbles(ctx, sc);
      if (market) puddles(ctx, sc, market);
    },
  );
  lightPools(ctx, sc, market);
  doorMats(ctx, sc);
  blockShadows(ctx, sc);
  // Vignette over the arena floor, baked in so chefs and food stay at full contrast at the edges.
  const { layout } = sc;
  ctx.save();
  ctx.beginPath();
  ctx.rect(layout.world.x, layout.world.y, layout.world.w, layout.world.h);
  ctx.clip();
  const g = ctx.createRadialGradient(layout.width / 2, layout.height / 2, layout.height * 0.42, layout.width / 2, layout.height / 2, Math.hypot(layout.width, layout.height) * 0.58);
  g.addColorStop(0, withAlpha(PALETTE.nightDeep, 0));
  g.addColorStop(1, withAlpha(PALETTE.nightDeep, 0.55));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, layout.width, layout.height);
  ctx.restore();
}

// ---------------------------------------------------------------- row layers

interface BlockStyle {
  top: string;
  face: string;
  edge: string;
}

const WOOD: BlockStyle = { top: PALETTE.bamboo, face: PALETTE.bambooDark, edge: WORLD.woodLight };
const STEEL: BlockStyle = { top: PALETTE.steel, face: WORLD.steelDark, edge: WORLD.steelLight };
const FRAME: BlockStyle = { top: WORLD.frameTop, face: WORLD.frameFace, edge: WORLD.frameEdge };
const STONE: BlockStyle = { top: WORLD.stoneDark, face: WORLD.grout, edge: WORLD.stoneLit };

/** A raised block: lit top face + darker front face. Sides that join a neighbour stay square. */
function block(ctx: Ctx, x: number, y: number, w: number, h: number, L: number, st: BlockStyle, joinL: boolean, joinR: boolean, joinT = false): void {
  const r = 5;
  const rt = joinT ? 0 : r;
  const x0 = x + (joinL ? 0 : 1);
  const x1 = x + w - (joinR ? 0 : 1);
  const bw = x1 - x0;
  // Front face.
  rrect(ctx, x0, y + h - L - r, bw, L + r, [0, 0, joinR ? 0 : r, joinL ? 0 : r]);
  fill(ctx, st.face);
  ctx.fillStyle = withAlpha(PALETTE.nightDeep, 0.35);
  ctx.fillRect(x0, y + h - 2, bw, 2);
  // Top face.
  const ty = y - L + (joinT ? -2 : 1);
  const th = h - (joinT ? -2 : 1);
  rrect(ctx, x0, ty, bw, th, [joinL ? 0 : rt, joinR ? 0 : rt, joinR ? 0 : r, joinL ? 0 : r]);
  fill(ctx, st.top);
  // Lit top and left edges.
  ctx.fillStyle = withAlpha(st.edge, 0.85);
  if (!joinT) ctx.fillRect(x0 + (joinL ? 0 : r), ty, bw - (joinL ? 0 : r) - (joinR ? 0 : r), 1.6);
  if (!joinL) ctx.fillRect(x0, ty + rt, 1.6, th - rt - r);
  // Darker lip where top meets front.
  ctx.fillStyle = withAlpha(PALETTE.nightDeep, 0.25);
  ctx.fillRect(x0, y + h - L - 1, bw, 1.4);
}

function counterGrain(ctx: Ctx, x: number, y: number, w: number, h: number, seed: number): void {
  ctx.strokeStyle = withAlpha(WORLD.woodGrain, 0.6);
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let g = 0; g < 3; g++) {
    const gy = y + h * (0.25 + g * 0.25) + (hash(seed, g) - 0.5) * 3;
    ctx.moveTo(x + 2, gy);
    ctx.bezierCurveTo(x + w * 0.35, gy - 2, x + w * 0.65, gy + 2, x + w - 2, gy + (hash(seed, g, 1) - 0.5) * 2);
  }
  ctx.stroke();
}

function basket(ctx: Ctx, cx: number, cy: number, T: number, kind: IngredientKind): void {
  const rx = T * 0.4;
  const ry = T * 0.3;
  // Rim + inside.
  ellipse(ctx, cx, cy, rx, ry);
  fill(ctx, PALETTE.bambooDark);
  ellipse(ctx, cx, cy - 1, rx * 0.84, ry * 0.78);
  fill(ctx, mix(PALETTE.bambooDark, PALETTE.nightDeep, 0.5));
  // Produce piled in it.
  const r = T * 0.16;
  const spots: [number, number][] =
    kind === 'meat' || kind === 'steak' || kind === 'fish'
      ? [
          [-0.13, -0.02],
          [0.14, 0.03],
        ]
      : [
          [-0.15, 0.02],
          [0.15, 0.03],
          [0, -0.08],
        ];
  for (const [ox, oy] of spots) {
    ctx.save();
    ctx.translate(cx + ox * T, cy + oy * T);
    paintFood(ctx, { kind, state: 'raw' }, r);
    ctx.restore();
  }
  // Woven front band.
  ctx.save();
  ellipse(ctx, cx, cy, rx, ry);
  ctx.clip();
  ctx.beginPath();
  ctx.rect(cx - rx, cy + ry * 0.35, rx * 2, ry);
  fill(ctx, PALETTE.bamboo);
  ctx.strokeStyle = PALETTE.bambooDark;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let k = -5; k <= 5; k++) {
    const x = cx + k * rx * 0.2;
    ctx.moveTo(x, cy + ry * 0.35);
    ctx.lineTo(x + (k % 2 === 0 ? 2 : -2), cy + ry);
  }
  ctx.moveTo(cx - rx, cy + ry * 0.68);
  ctx.lineTo(cx + rx, cy + ry * 0.68);
  ctx.stroke();
  ctx.restore();
  ellipse(ctx, cx, cy, rx, ry);
  stroke(ctx, mix(PALETTE.bambooDark, PALETTE.nightDeep, 0.3), 1.4);
}

function choppingBoard(ctx: Ctx, cx: number, cy: number, T: number): void {
  const w = T * 0.76;
  const h = T * 0.6;
  rrect(ctx, cx - w / 2, cy - h / 2 + 3, w, h, 7);
  fill(ctx, PALETTE.bambooDark);
  rrect(ctx, cx - w / 2, cy - h / 2, w, h, 7);
  fill(ctx, mix(PALETTE.bamboo, PALETTE.paper, 0.38));
  rrect(ctx, cx - w / 2, cy - h / 2, w, h, 7);
  stroke(ctx, mix(PALETTE.bamboo, PALETTE.bambooDark, 0.4), 1.2);
  ctx.strokeStyle = withAlpha(PALETTE.bamboo, 0.7);
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let k = 0; k < 3; k++) {
    ctx.moveTo(cx - w * 0.38, cy - h * 0.22 + k * h * 0.22);
    ctx.lineTo(cx + w * 0.38, cy - h * 0.22 + k * h * 0.22 + 1);
  }
  ctx.stroke();
  // Hang hole.
  circle(ctx, cx + w * 0.36, cy - h * 0.3, 2);
  fill(ctx, PALETTE.bambooDark);
}

function stoveTop(ctx: Ctx, cx: number, cy: number, T: number, x: number, y: number, L: number): void {
  // Brushed steel sheen.
  const g = ctx.createLinearGradient(x, y - L, x + T, y + T - L);
  g.addColorStop(0, withAlpha(WORLD.steelLight, 0.5));
  g.addColorStop(1, withAlpha(WORLD.steelDark, 0.4));
  ctx.fillStyle = g;
  ctx.fillRect(x + 2, y - L + 3, T - 4, T - 6);
  circle(ctx, cx, cy, T * 0.36);
  fill(ctx, WORLD.iron);
  circle(ctx, cx, cy, T * 0.25);
  stroke(ctx, WORLD.steelDark, 2.5);
  ctx.beginPath();
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k * Math.PI) / 2;
    ctx.moveTo(cx + Math.cos(a) * T * 0.12, cy + Math.sin(a) * T * 0.12);
    ctx.lineTo(cx + Math.cos(a) * T * 0.35, cy + Math.sin(a) * T * 0.35);
  }
  stroke(ctx, WORLD.steelDark, 2.2);
  // Knobs on the front face.
  for (const k of [-1, 1]) {
    circle(ctx, cx + k * T * 0.22, y + T - L / 2 - 0.5, L * 0.3);
    fill(ctx, WORLD.iron);
    circle(ctx, cx + k * T * 0.22 - 0.6, y + T - L / 2 - 1, L * 0.12);
    fill(ctx, PALETTE.paper);
  }
}

/** Wooden dish rack: a base tray with two rows of pegs, readable even when empty. */
function dishRack(ctx: Ctx, cx: number, cy: number, T: number): void {
  rrect(ctx, cx - T * 0.38, cy - T * 0.3, T * 0.76, T * 0.62, 6);
  fill(ctx, PALETTE.bambooDark);
  rrect(ctx, cx - T * 0.34, cy - T * 0.27, T * 0.68, T * 0.54, 5);
  fill(ctx, mix(PALETTE.bambooDark, PALETTE.nightDeep, 0.35));
  for (const row of [-0.24, 0.22])
    for (let k = 0; k < 5; k++) {
      const x = cx - T * 0.26 + k * T * 0.13;
      rrect(ctx, x - 1.6, cy + row * T - 3, 3.2, 7, 1.6);
      fill(ctx, WORLD.woodLight);
    }
}

function sinkBasin(ctx: Ctx, cx: number, cy: number, T: number): void {
  const w = T * 0.74;
  const h = T * 0.62;
  rrect(ctx, cx - w / 2, cy - h / 2 + 2, w, h, 8);
  fill(ctx, WORLD.steelLight);
  rrect(ctx, cx - w / 2 + 3, cy - h / 2 + 4, w - 6, h - 6, 6);
  const g = ctx.createLinearGradient(0, cy - h / 2, 0, cy + h / 2);
  g.addColorStop(0, WORLD.steelDark);
  g.addColorStop(1, WORLD.water);
  fill(ctx, g);
  // Faucet on the back rim.
  ctx.beginPath();
  ctx.moveTo(cx + w * 0.22, cy - h / 2 + 3);
  ctx.quadraticCurveTo(cx + w * 0.22, cy - h / 2 - 7, cx + w * 0.05, cy - h / 2 - 4);
  ctx.lineCap = 'round';
  stroke(ctx, WORLD.steelLight, 3.2);
  circle(ctx, cx + w * 0.05, cy - h / 2 - 3.5, 2);
  fill(ctx, WORLD.steelDark);
}

function trashBin(ctx: Ctx, cx: number, base: number, T: number): void {
  const w = T * 0.62;
  const top = base - T * 0.72;
  // Body (tapered cylinder).
  ctx.beginPath();
  ctx.moveTo(cx - w / 2, top + T * 0.12);
  ctx.lineTo(cx - w * 0.42, base - 3);
  ctx.quadraticCurveTo(cx, base + 3, cx + w * 0.42, base - 3);
  ctx.lineTo(cx + w / 2, top + T * 0.12);
  ctx.closePath();
  const g = ctx.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0);
  g.addColorStop(0, WORLD.steelDark);
  g.addColorStop(0.3, PALETTE.steel);
  g.addColorStop(1, WORLD.iron);
  fill(ctx, g);
  ctx.strokeStyle = withAlpha(PALETTE.nightDeep, 0.5);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (const f of [0.45, 0.75]) {
    ctx.moveTo(cx - w * 0.46, top + T * 0.12 + (base - top) * f);
    ctx.quadraticCurveTo(cx, top + T * 0.16 + (base - top) * f, cx + w * 0.46, top + T * 0.12 + (base - top) * f);
  }
  ctx.stroke();
  // Lid with a dark mouth.
  ellipse(ctx, cx, top + T * 0.12, w * 0.54, T * 0.16);
  fill(ctx, WORLD.steelLight);
  ellipse(ctx, cx, top + T * 0.13, w * 0.42, T * 0.11);
  fill(ctx, WORLD.iron);
  ellipse(ctx, cx - w * 0.1, top + T * 0.1, w * 0.18, T * 0.03);
  fill(ctx, withAlpha(PALETTE.paper, 0.25));
}

function crate(ctx: Ctx, x: number, y: number, T: number, L: number): void {
  const i = T * 0.03;
  const x0 = x + i;
  const w = T - i * 2;
  const topY = y + i - L;
  const h = T - i * 2;
  // Front face: planks + rope.
  rrect(ctx, x0, topY + h - 4, w, L + 4, [0, 0, 4, 4]);
  fill(ctx, PALETTE.bambooDark);
  ctx.fillStyle = withAlpha(PALETTE.nightDeep, 0.3);
  ctx.fillRect(x0, topY + h + L * 0.45, w, 1.2);
  // Rim (top of the crate walls) + dark open inside.
  rrect(ctx, x0, topY, w, h, 4);
  fill(ctx, PALETTE.bamboo);
  rrect(ctx, x0 + 4, topY + 4, w - 8, h - 8, 3);
  fill(ctx, mix(PALETTE.bambooDark, PALETTE.nightDeep, 0.55));
  // Straw in the bottom.
  ctx.strokeStyle = withAlpha(PALETTE.lantern, 0.35);
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let k = 0; k < 9; k++) {
    const sx = x0 + 6 + hash(k, 1) * (w - 12);
    const sy = topY + 7 + hash(k, 2) * (h - 14);
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + (hash(k, 3) - 0.5) * 8, sy + (hash(k, 4) - 0.5) * 6);
  }
  ctx.stroke();
  ctx.fillStyle = withAlpha(WORLD.woodLight, 0.9);
  ctx.fillRect(x0 + 3, topY, w - 6, 1.6);
  ctx.fillRect(x0, topY + 3, 1.6, h - 6);
  // Plank seams on the rim and front.
  ctx.fillStyle = withAlpha(PALETTE.bambooDark, 0.8);
  ctx.fillRect(x0 + w / 2 - 0.6, topY, 1.2, 4);
  ctx.fillRect(x0 + w / 2 - 0.6, topY + h - 4, 1.2, 4);
  ctx.fillStyle = withAlpha(PALETTE.nightDeep, 0.25);
  ctx.fillRect(x0, topY + h + L * 0.2, w, 1);
  // Rope tied round the crate: wraps over the front face, knot on the side.
  ctx.strokeStyle = PALETTE.paper;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(x0 + w * 0.3, topY + h - 4);
  ctx.lineTo(x0 + w * 0.3, topY + h + L);
  ctx.moveTo(x0 + w * 0.7, topY + h - 4);
  ctx.lineTo(x0 + w * 0.7, topY + h + L);
  ctx.stroke();
  ctx.strokeStyle = mix(PALETTE.paper, PALETTE.bamboo, 0.5);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(x0, topY + h + L * 0.5);
  ctx.lineTo(x0 + w, topY + h + L * 0.5);
  ctx.stroke();
  circle(ctx, x0 + w * 0.7, topY + h + L * 0.5, 2.6);
  fill(ctx, PALETTE.paper);
}

function passCounter(ctx: Ctx, x: number, y: number, T: number, L: number, team: TeamId, joinL: boolean, joinR: boolean): void {
  const t = TEAMS[team];
  block(ctx, x, y, T, T, L, { top: t.main, face: t.dark, edge: t.light }, joinL, joinR);
  // Paper serving shelf.
  rrect(ctx, x + (joinL ? 0 : 5), y - L + 6, T - (joinL ? 0 : 5) - (joinR ? 0 : 5), T * 0.5, 4);
  fill(ctx, mix(PALETTE.paper, t.light, 0.25));
  ctx.fillStyle = withAlpha(t.dark, 0.35);
  ctx.fillRect(x + (joinL ? 0 : 5), y - L + 6 + T * 0.5 - 2, T - (joinL ? 0 : 5) - (joinR ? 0 : 5), 2);
  // Crew trim on the front face.
  ctx.fillStyle = withAlpha(PALETTE.paper, 0.85);
  trimPath(ctx, team, x + (joinL ? 0 : 2), x + T - (joinR ? 0 : 2), y + T - L + 1, 1, T / 4);
  ctx.fill();
}

/** Tall back wall of a kitchen stall: plank face, cap, corner posts, crew awning, pass window. */
function stallBackWall(ctx: Ctx, sc: Scene, c0: number, c1: number): void {
  const { T } = sc;
  const x0 = px(sc, c0);
  const x1 = px(sc, c1 + 1);
  const yTop = py(sc, 0) - T * 0.62;
  const yBot = py(sc, 1);
  // Plank face.
  ctx.fillStyle = WORLD.frameFace;
  ctx.fillRect(x0, yTop, x1 - x0, yBot - yTop);
  for (let k = 0, x = x0; x < x1; k++, x += T / 2) {
    ctx.fillStyle = mix(WORLD.frameFace, WORLD.frameTop, hash(k, c0) * 0.5);
    ctx.fillRect(x + 1, yTop, T / 2 - 2, yBot - yTop);
  }
  // Pass windows: warm light spilling out of the stall's serving hatch.
  for (let c = c0; c <= c1; c++) {
    if (kindAt(sc, c, 1) !== 'pass' || kindAt(sc, c - 1, 1) === 'pass') continue;
    let e = c;
    while (kindAt(sc, e + 1, 1) === 'pass') e++;
    const team = ownerAt(sc, c, 1) ?? 0;
    const wx = px(sc, c) + 4;
    const ww = (e - c + 1) * T - 8;
    const wy = py(sc, 0) + T * 0.12;
    const wh = yBot - wy;
    rrect(ctx, wx - 3, wy - 3, ww + 6, wh + 3, [6, 6, 0, 0]);
    fill(ctx, TEAMS[team].dark);
    const g = ctx.createLinearGradient(0, wy, 0, wy + wh);
    g.addColorStop(0, mix(PALETTE.lanternHot, PALETTE.night, 0.35));
    g.addColorStop(1, PALETTE.lantern);
    rrect(ctx, wx, wy, ww, wh, [4, 4, 0, 0]);
    fill(ctx, g);
    // Hanging order rail inside the hatch.
    ctx.fillStyle = withAlpha(PALETTE.nightDeep, 0.5);
    ctx.fillRect(wx + 3, wy + 5, ww - 6, 1.5);
    for (let k = 0; k < 3; k++) {
      ctx.fillStyle = withAlpha(PALETTE.paper, 0.9);
      ctx.fillRect(wx + 8 + k * (ww - 16) * 0.42, wy + 6, 6, 8);
    }
  }
  // Cap.
  rrect(ctx, x0 - 2, yTop - T * 0.2, x1 - x0 + 4, T * 0.22, 3);
  fill(ctx, WORLD.frameTop);
  ctx.fillStyle = WORLD.frameEdge;
  ctx.fillRect(x0, yTop - T * 0.2, x1 - x0, 1.6);
  // Awning across the kitchen, in the owning crew's colours and trim.
  const kc = zoneCols(sc, zoneAt(sc, c0, 1) === 'kitchen0' || zoneAt(sc, c1, 1) === 'kitchen0' ? 'kitchen0' : 'kitchen1');
  const team = ownerAt(sc, kc ? kc[0] : c0, 1) ?? 0;
  const t = TEAMS[team];
  const ax0 = x0 + T * 0.25;
  const ax1 = x1 - T * 0.25;
  const ay0 = yTop - T * 0.05;
  const ay1 = py(sc, 0) - T * 0.05;
  const stripe = T / 2;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(ax0 + 4, ay0);
  ctx.lineTo(ax1 - 4, ay0);
  ctx.lineTo(ax1 + 3, ay1);
  ctx.lineTo(ax0 - 3, ay1);
  ctx.closePath();
  ctx.clip();
  for (let k = 0, x = ax0 - 3; x < ax1 + 3; k++, x += stripe) {
    ctx.fillStyle = k % 2 === 0 ? t.main : PALETTE.paper;
    ctx.fillRect(x, ay0, stripe, ay1 - ay0);
  }
  const shade = ctx.createLinearGradient(0, ay0, 0, ay1);
  shade.addColorStop(0, withAlpha(PALETTE.nightDeep, 0.35));
  shade.addColorStop(0.4, withAlpha(PALETTE.nightDeep, 0));
  shade.addColorStop(1, withAlpha(PALETTE.paper, 0.12));
  ctx.fillStyle = shade;
  ctx.fillRect(ax0 - 4, ay0, ax1 - ax0 + 8, ay1 - ay0);
  ctx.restore();
  // Valance with the crew trim, and its shadow on the wall.
  const vy = ay1 + T * 0.14;
  ctx.fillStyle = withAlpha(PALETTE.nightDeep, 0.45);
  trimPath(ctx, team, ax0 - 3, ax1 + 3, vy + 4, T * 0.14, T / 2);
  ctx.fill();
  ctx.save();
  trimPath(ctx, team, ax0 - 3, ax1 + 3, vy, T * 0.14, T / 2);
  ctx.clip();
  for (let k = 0, x = ax0 - 3; x < ax1 + 3; k++, x += stripe) {
    ctx.fillStyle = k % 2 === 0 ? t.dark : mix(PALETTE.paper, t.light, 0.3);
    ctx.fillRect(x, ay1 - 2, stripe, T * 0.4);
  }
  ctx.restore();
  // Corner posts.
  for (const x of [x0, x1 - T * 0.24]) {
    rrect(ctx, x, yTop - T * 0.3, T * 0.24, yBot - yTop + T * 0.3, 3);
    fill(ctx, WORLD.frameTop);
    ctx.fillStyle = WORLD.frameEdge;
    ctx.fillRect(x + 1, yTop - T * 0.28, 1.6, yBot - yTop + T * 0.2);
  }
}

/** Low stone wall at the back of the market, with the night sky above it. */
function marketBackWall(ctx: Ctx, sc: Scene, c0: number, c1: number): void {
  const { T } = sc;
  const x0 = px(sc, c0);
  const x1 = px(sc, c1 + 1);
  const yTop = py(sc, 0) + T * 0.28;
  const yBot = py(sc, 1);
  ctx.fillStyle = WORLD.grout;
  ctx.fillRect(x0, yTop, x1 - x0, yBot - yTop);
  const bh = (yBot - yTop) / 3;
  for (let r = 0; r < 3; r++) {
    for (let k = 0, x = x0 - (r % 2) * T * 0.3; x < x1; k++) {
      const w = T * (0.55 + hash(r, k, 77) * 0.35);
      rrect(ctx, Math.max(x0, x + 1), yTop + r * bh + 1, Math.min(w - 2, x1 - Math.max(x0, x + 1)), bh - 2, 2);
      fill(ctx, mix(WORLD.stoneDark, PALETTE.slate, hash(r, k, 78)));
      x += w;
    }
  }
  rrect(ctx, x0 - 1, yTop - T * 0.2, x1 - x0 + 2, T * 0.22, 3);
  fill(ctx, PALETTE.slateLight);
  ctx.fillStyle = withAlpha(WORLD.stoneLit, 0.9);
  ctx.fillRect(x0, yTop - T * 0.2, x1 - x0, 1.6);
}

/** Harbor: a sunken pond tile with a stone rim where it meets dry ground, and lantern glints. */
function pondTile(ctx: Ctx, sc: Scene, x: number, y: number): void {
  const { T } = sc;
  const X = px(sc, x);
  const Y = py(sc, y);
  const isPond = (cx: number, cy: number) => kindAt(sc, cx, cy) === 'wall' && wallLook(sc, cx, cy) === 'pond';
  ctx.fillStyle = mix(WORLD.water, PALETTE.night, 0.45);
  ctx.fillRect(X - 0.5, Y - 0.5, T + 1, T + 1);
  // Ripples and reflected lantern light.
  ctx.strokeStyle = withAlpha(WORLD.steelLight, 0.25);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let k = 0; k < 2; k++) {
    const rx = X + T * (0.25 + hash(x, y, k) * 0.5);
    const ry = Y + T * (0.3 + k * 0.35);
    ctx.moveTo(rx - T * 0.14, ry);
    ctx.quadraticCurveTo(rx, ry - 2.5, rx + T * 0.14, ry);
  }
  ctx.stroke();
  if (hash(x, y, 9) < 0.45) {
    ellipse(ctx, X + T * 0.5, Y + T * 0.55, T * 0.12, T * 0.03);
    fill(ctx, withAlpha(PALETTE.lantern, 0.55));
  }
  if (hash(x, y, 4) < 0.3) {
    // A lily pad.
    ctx.beginPath();
    ctx.ellipse(X + T * 0.3, Y + T * 0.35, T * 0.13, T * 0.09, 0, 0.35, TAU - 0.05);
    ctx.lineTo(X + T * 0.3, Y + T * 0.35);
    ctx.closePath();
    fill(ctx, WORLD.lettuceDark);
  }
  // Stone rim on dry sides; the far (north) edge casts shade on the water.
  const rim = T * 0.12;
  if (!isPond(x, y - 1)) {
    ctx.fillStyle = withAlpha(PALETTE.nightDeep, 0.4);
    ctx.fillRect(X, Y + rim, T, T * 0.14);
    ctx.fillStyle = PALETTE.slateLight;
    ctx.fillRect(X, Y, T, rim);
    ctx.fillStyle = withAlpha(WORLD.stoneLit, 0.8);
    ctx.fillRect(X, Y, T, 1.4);
  }
  ctx.fillStyle = PALETTE.slateLight;
  if (!isPond(x, y + 1)) ctx.fillRect(X, Y + T - rim * 0.7, T, rim * 0.7);
  if (!isPond(x - 1, y)) ctx.fillRect(X, Y, rim, T);
  if (!isPond(x + 1, y)) ctx.fillRect(X + T - rim, Y, rim, T);
}

/** Rooftop: a round terracotta pot with a bush (round, so it never reads as a square crate). */
function planter(ctx: Ctx, sc: Scene, x: number, y: number): void {
  const { T } = sc;
  const cx = px(sc, x) + T / 2;
  const base = py(sc, y) + T * 0.82;
  const clay = mix(WORLD.tomatoDark, PALETTE.bamboo, 0.45);
  // Pot body (tapered) and rim.
  ctx.beginPath();
  ctx.moveTo(cx - T * 0.34, base - T * 0.36);
  ctx.lineTo(cx - T * 0.26, base);
  ctx.quadraticCurveTo(cx, base + T * 0.06, cx + T * 0.26, base);
  ctx.lineTo(cx + T * 0.34, base - T * 0.36);
  ctx.closePath();
  fill(ctx, clay);
  ctx.fillStyle = withAlpha(PALETTE.nightDeep, 0.25);
  ctx.fillRect(cx + T * 0.08, base - T * 0.36, T * 0.24, T * 0.34);
  ellipse(ctx, cx, base - T * 0.37, T * 0.39, T * 0.12);
  fill(ctx, mix(clay, PALETTE.paper, 0.2));
  // Bush.
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * TAU + hash(x, y, k);
    ellipse(ctx, cx + Math.cos(a) * T * 0.2, base - T * 0.55 + Math.sin(a) * T * 0.14, T * 0.17, T * 0.15);
    fill(ctx, k % 2 ? WORLD.lettuceDark : WORLD.leaf);
  }
  ellipse(ctx, cx - T * 0.06, base - T * 0.62, T * 0.18, T * 0.14);
  fill(ctx, mix(WORLD.leaf, WORLD.lettuce, 0.5));
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * TAU + hash(x, y, k + 9) * 2;
    circle(ctx, cx + Math.cos(a) * T * 0.2, base - T * 0.56 + Math.sin(a) * T * 0.12, T * 0.045);
    fill(ctx, k % 2 ? PALETTE.paper : PALETTE.lantern);
  }
}

function wallBlock(ctx: Ctx, sc: Scene, x: number, y: number): void {
  const { T } = sc;
  const look = wallLook(sc, x, y);
  if (look === 'pond') return pondTile(ctx, sc, x, y);
  if (look === 'planter') return planter(ctx, sc, x, y);
  const style = look === 'stone' ? STONE : FRAME;
  const L = liftAt(sc, x, y);
  const same = (cx: number, cy: number) => kindAt(sc, cx, cy) === 'wall' && wallLook(sc, cx, cy) === look;
  const joinL = same(x - 1, y);
  const joinR = same(x + 1, y);
  const joinT = y > 0 && same(x, y - 1) && y !== sc.H - 1;
  block(ctx, px(sc, x), py(sc, y), T, T, L, style, joinL, joinR, joinT);
  // Plank grain on wooden caps, running along the wall.
  if (style === FRAME) {
    const vertical = !joinL && !joinR;
    ctx.strokeStyle = WORLD.frameGrain;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let k = 1; k < 3; k++) {
      if (vertical) {
        ctx.moveTo(px(sc, x) + (T * k) / 3, py(sc, y) - L + (joinT ? 0 : 4));
        ctx.lineTo(px(sc, x) + (T * k) / 3, py(sc, y) + T - L - 1);
      } else {
        ctx.moveTo(px(sc, x) + 1, py(sc, y) - L + (T * k) / 3);
        ctx.lineTo(px(sc, x) + T - 1, py(sc, y) - L + (T * k) / 3);
      }
    }
    ctx.stroke();
  }
  if (y === sc.H - 1) {
    // Plinth: the front edge of the whole diorama.
    const X = px(sc, x);
    const Y = py(sc, sc.H);
    ctx.fillStyle = WORLD.frameFace;
    ctx.fillRect(X, Y, T, T * 0.28);
    ctx.fillStyle = withAlpha(WORLD.frameEdge, 0.7);
    ctx.fillRect(X, Y, T, 1.4);
  }
}

export function paintRow(ctx: Ctx, sc: Scene, row: number): void {
  const { T } = sc;
  if (row === 0) {
    // Back wall runs, split into kitchen stalls (wood) and the market (stone).
    let c = 0;
    while (c < sc.W) {
      if (kindAt(sc, c, 0) !== 'wall') {
        c++;
        continue;
      }
      const market = zoneAt(sc, c, 0) === 'market';
      let e = c;
      while (e + 1 < sc.W && kindAt(sc, e + 1, 0) === 'wall' && (zoneAt(sc, e + 1, 0) === 'market') === market) e++;
      if (market) marketBackWall(ctx, sc, c, e);
      else stallBackWall(ctx, sc, c, e);
      c = e + 1;
    }
  }
  for (let x = 0; x < sc.W; x++) {
    const def = tileAtXY(sc, x, row);
    if (!def || def.kind === 'floor' || (row === 0 && def.kind === 'wall')) continue;
    const X = px(sc, x);
    const Y = py(sc, row);
    const L = liftAt(sc, x, row);
    const cx = X + T / 2;
    const cy = Y + T / 2 - L;
    if (def.kind === 'wall') {
      wallBlock(ctx, sc, x, row);
      continue;
    }
    if (def.kind === 'trash') {
      trashBin(ctx, cx, Y + T * 0.86, T);
      continue;
    }
    if (def.kind === 'crate') {
      crate(ctx, X, Y, T, L);
      continue;
    }
    const joinL = isCounterFamily(kindAt(sc, x - 1, row));
    const joinR = isCounterFamily(kindAt(sc, x + 1, row));
    if (def.kind === 'pass') {
      passCounter(ctx, X, Y, T, L, ownerAt(sc, x, row) ?? 0, kindAt(sc, x - 1, row) === 'pass', kindAt(sc, x + 1, row) === 'pass');
      continue;
    }
    block(ctx, X, Y, T, T, L, def.kind === 'stove' ? STEEL : WOOD, joinL && kindAt(sc, x - 1, row) !== 'pass', joinR && kindAt(sc, x + 1, row) !== 'pass');
    switch (def.kind) {
      case 'counter':
      case 'plates':
        counterGrain(ctx, X, Y - L, T, T, x * 31 + row);
        if (def.kind === 'plates') dishRack(ctx, cx, cy, T);
        break;
      case 'pantry':
        counterGrain(ctx, X, Y - L, T, T, x * 31 + row);
        if (def.ingredient) basket(ctx, cx, cy + 1, T, def.ingredient);
        break;
      case 'board':
        counterGrain(ctx, X, Y - L, T, T, x * 31 + row);
        choppingBoard(ctx, cx, cy, T);
        break;
      case 'stove':
        stoveTop(ctx, cx, cy, T, X, Y, L);
        break;
      case 'sink':
        counterGrain(ctx, X, Y - L, T, T, x * 31 + row);
        sinkBasin(ctx, cx, cy, T);
        break;
      default:
        break;
    }
  }
}

// ---------------------------------------------------------------- lights (overhead)

function catenary(sc: Scene, x0: number, x1: number, y: number, sag: number, t: number): { x: number; y: number } {
  return { x: x0 + (x1 - x0) * t, y: y + sag * 4 * t * (1 - t) };
}

function stringLights(ctx: Ctx, sc: Scene, x0: number, x1: number, y: number, sag: number, seed: number): void {
  const { T } = sc;
  ctx.beginPath();
  for (let i = 0; i <= 24; i++) {
    const p = catenary(sc, x0, x1, y, sag, i / 24);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  stroke(ctx, withAlpha(PALETTE.nightDeep, 0.9), 1.4);
  const n = Math.max(3, Math.round((x1 - x0) / (T * 0.62)));
  for (let i = 1; i < n; i++) {
    const p = catenary(sc, x0, x1, y, sag, i / n);
    const warm = (i + seed) % 4 === 0 ? PALETTE.lanternHot : PALETTE.lantern;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, p.x, p.y + 3, T * 0.42, warm, 0.22);
    ctx.restore();
    ellipse(ctx, p.x, p.y + 3.2, 2.6, 3.2);
    fill(ctx, warm);
    circle(ctx, p.x - 0.8, p.y + 2.4, 1);
    fill(ctx, PALETTE.paper);
    ctx.fillStyle = WORLD.iron;
    ctx.fillRect(p.x - 1.2, p.y - 0.5, 2.4, 1.6);
  }
}

/** A round paper lantern hanging from a post (decor at the market corners). */
function paperLantern(ctx: Ctx, x: number, y: number, T: number): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, x, y, T * 0.9, PALETTE.lanternHot, 0.25);
  ctx.restore();
  ctx.fillStyle = WORLD.iron;
  ctx.fillRect(x - 0.6, y - T * 0.3, 1.2, T * 0.12);
  ellipse(ctx, x, y, T * 0.17, T * 0.2);
  const g = ctx.createRadialGradient(x - 2, y - 2, 1, x, y, T * 0.2);
  g.addColorStop(0, PALETTE.paper);
  g.addColorStop(0.5, PALETTE.lantern);
  g.addColorStop(1, PALETTE.lanternHot);
  fill(ctx, g);
  ctx.strokeStyle = withAlpha(PALETTE.danger, 0.55);
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  for (const f of [-0.5, 0, 0.5]) {
    ctx.moveTo(x + f * T * 0.17, y - T * 0.19);
    ctx.quadraticCurveTo(x + f * T * 0.3, y, x + f * T * 0.17, y + T * 0.19);
  }
  ctx.stroke();
  ctx.fillStyle = WORLD.iron;
  ctx.fillRect(x - T * 0.07, y - T * 0.22, T * 0.14, 2.4);
  ctx.fillRect(x - T * 0.07, y + T * 0.19, T * 0.14, 2.4);
}

/** Lantern spots on the posts either side of every doorway (where a wall ends next to a door). */
function doorLanterns(sc: Scene): [number, number][] {
  const out: [number, number][] = [];
  for (let y = 1; y < sc.H - 1; y++)
    for (let x = 0; x < sc.W; x++) {
      if (kindAt(sc, x, y) !== 'wall' || zoneAt(sc, x, y) !== 'none') continue;
      const below = kindAt(sc, x, y + 1) === 'floor' && zoneAt(sc, x, y + 1) === 'none';
      const above = kindAt(sc, x, y - 1) === 'floor' && zoneAt(sc, x, y - 1) === 'none';
      if (below || above) out.push([px(sc, x) + sc.T / 2, py(sc, y) + (below ? sc.T * 0.55 : sc.T * 0.1)]);
    }
  return out;
}

/** Rects that hold everything paintLights draws (baked separately so blits stay small). */
export function lightRects(sc: Scene): Rect[] {
  const { T, layout } = sc;
  const out: Rect[] = [{ x: 0, y: 0, w: layout.width, h: py(sc, 0) + T * 1.9 }];
  for (const [x, y] of doorLanterns(sc)) out.push({ x: x - T, y: y - T * 1.2, w: T * 2, h: T * 2 });
  return out;
}

export function paintLights(ctx: Ctx, sc: Scene): void {
  const { T } = sc;
  const market = zoneCols(sc, 'market');
  if (!market) return;
  const x0 = px(sc, market[0]) - T * 0.4;
  const x1 = px(sc, market[1] + 1) + T * 0.4;
  stringLights(ctx, sc, x0, x1, py(sc, 0) - T * 0.7, T * 1.6, 0);
  stringLights(ctx, sc, x0, x1, py(sc, 0) - T * 0.75, T * 0.75, 2);
  paperLantern(ctx, x0 + T * 0.05, py(sc, 0) - T * 0.25, T);
  paperLantern(ctx, x1 - T * 0.05, py(sc, 0) - T * 0.25, T);
  for (const [x, y] of doorLanterns(sc)) paperLantern(ctx, x, y - sc.T * 0.25, T * 0.85);
}
