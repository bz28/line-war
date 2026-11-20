import type { Food, FoodState, IngredientKind, Item, PlateItem } from '@line-war/sim';
import { PALETTE, WORLD } from '../../art/tokens';
import { mix, withAlpha } from '../palette';
import type { Ctx, SpriteCache } from '../sprites';
import { drawCharm } from './charm';

/** A charm's body radius relative to the item radius r. */
export const CHARM_SCALE = 1.45;

/**
 * Illustrated food and plates, painted centred on (0,0) at reference radius r (logical px).
 * Every ingredient has its own silhouette (lettuce = ruffled head, tomato = round + star stem,
 * bun = sesame dome, meat = thick patty, steak = marbled cut with bone, fish = whole fish), so
 * identity never depends on colour alone. State changes the drawing: chopped = pieces, cooked =
 * browned with grill marks, burnt = charcoal silhouette with ember cracks.
 */

const TAU = Math.PI * 2;

function ellipse(ctx: Ctx, x: number, y: number, rx: number, ry: number, rot = 0): void {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU);
}

function fillStroke(ctx: Ctx, fill: string, stroke: string, lw: number): void {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = lw;
  ctx.strokeStyle = stroke;
  ctx.stroke();
}

/** Lumpy circle used for lettuce heads and leaves. */
function ruffle(ctx: Ctx, x: number, y: number, r: number, lobes: number, depth: number, phase = 0): void {
  ctx.beginPath();
  const n = 40;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * TAU;
    const rr = r * (1 - depth + depth * Math.abs(Math.sin((a * lobes) / 2 + phase)));
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr * 0.92;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function star(ctx: Ctx, x: number, y: number, outer: number, inner: number, points: number, rot = -Math.PI / 2): void {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const a = rot + (i * Math.PI) / points;
    const rr = i % 2 === 0 ? outer : inner;
    if (i === 0) ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    else ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}

/** Soft white gloss in the upper-left (light comes from the upper left). */
function gloss(ctx: Ctx, x: number, y: number, rx: number, ry: number, alpha = 0.55): void {
  ellipse(ctx, x, y, rx, ry, -0.6);
  ctx.fillStyle = withAlpha(PALETTE.paper, alpha);
  ctx.fill();
}

/** Grill marks clipped to the current path. */
function grill(ctx: Ctx, r: number, color: string, cross = false): void {
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = color;
  ctx.lineWidth = r * 0.13;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let k = -1; k <= 1; k++) {
    ctx.moveTo(-r + k * r * 0.55, -r * 0.9);
    ctx.lineTo(r * 0.2 + k * r * 0.55, r * 0.9);
    if (cross) {
      ctx.moveTo(r * 0.9, -r * 0.6 + k * r * 0.55);
      ctx.lineTo(-r * 0.9, r * 0.05 + k * r * 0.55);
    }
  }
  ctx.stroke();
  ctx.restore();
}

// ---------- silhouettes (also used, filled with char, for burnt food) ----------

function steakPath(ctx: Ctx, r: number, s = 1): void {
  const k = r * s;
  ctx.beginPath();
  ctx.moveTo(-0.95 * k, 0);
  ctx.bezierCurveTo(-0.95 * k, -0.78 * k, 0.1 * k, -0.88 * k, 0.55 * k, -0.62 * k);
  ctx.bezierCurveTo(1.02 * k, -0.36 * k, 1.0 * k, 0.45 * k, 0.5 * k, 0.7 * k);
  ctx.bezierCurveTo(0.15 * k, 0.86 * k, -0.15 * k, 0.48 * k, -0.45 * k, 0.62 * k);
  ctx.bezierCurveTo(-0.82 * k, 0.78 * k, -0.95 * k, 0.4 * k, -0.95 * k, 0);
  ctx.closePath();
}

function fishPath(ctx: Ctx, r: number): void {
  ctx.beginPath();
  ctx.moveTo(-0.95 * r, 0);
  ctx.bezierCurveTo(-0.85 * r, -0.55 * r, 0.25 * r, -0.62 * r, 0.55 * r, -0.08 * r);
  ctx.lineTo(1.0 * r, -0.5 * r);
  ctx.quadraticCurveTo(0.86 * r, 0, 1.0 * r, 0.5 * r);
  ctx.lineTo(0.55 * r, 0.08 * r);
  ctx.bezierCurveTo(0.25 * r, 0.62 * r, -0.85 * r, 0.55 * r, -0.95 * r, 0);
  ctx.closePath();
}

function stewPath(ctx: Ctx, r: number): void {
  ruffle(ctx, 0, 0.05 * r, r * 0.88, 5, 0.12, 0.4);
}

function pattyPath(ctx: Ctx, r: number): void {
  ellipse(ctx, 0, 0, r * 0.95, r * 0.78);
}

function domePath(ctx: Ctx, r: number): void {
  ellipse(ctx, 0, 0, r * 1.0, r * 0.8);
}

/** Each chopped piece's centre, size and angle, so burnt chopped food keeps its shape. */
const PIECES: [number, number, number, number][] = [
  [-0.4, 0.18, 0.52, -0.4],
  [0.38, 0.22, 0.5, 0.5],
  [0, -0.3, 0.5, 0.1],
];

// ---------- per-ingredient painters ----------

function lettuce(ctx: Ctx, state: FoodState, r: number): void {
  const lw = r * 0.11;
  if (state === 'chopped') {
    PIECES.forEach(([x, y, s, rot], i) => {
      ctx.save();
      ctx.translate(x * r, y * r);
      ctx.rotate(rot);
      ruffle(ctx, 0, 0, r * s, 4, 0.18, i);
      fillStroke(ctx, i === 1 ? WORLD.lettuceLight : WORLD.lettuce, WORLD.lettuceDark, lw);
      ctx.strokeStyle = withAlpha(WORLD.lettuceDark, 0.6);
      ctx.lineWidth = r * 0.06;
      ctx.beginPath();
      ctx.moveTo(-r * s * 0.6, 0);
      ctx.lineTo(r * s * 0.6, 0);
      ctx.stroke();
      ctx.restore();
    });
    return;
  }
  ruffle(ctx, 0, 0, r, 7, 0.14);
  fillStroke(ctx, state === 'cooked' ? WORLD.lettuceDark : WORLD.lettuce, WORLD.lettuceDark, lw);
  ruffle(ctx, -r * 0.12, -r * 0.14, r * 0.6, 5, 0.18, 1);
  ctx.fillStyle = withAlpha(WORLD.lettuceLight, 0.75);
  ctx.fill();
  ctx.strokeStyle = withAlpha(WORLD.lettuceDark, 0.55);
  ctx.lineWidth = r * 0.07;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (const a of [0.3, 1.5, 2.7, 3.9, 5.1]) {
    ctx.moveTo(Math.cos(a) * r * 0.18, Math.sin(a) * r * 0.18);
    ctx.quadraticCurveTo(Math.cos(a + 0.3) * r * 0.5, Math.sin(a + 0.3) * r * 0.5, Math.cos(a) * r * 0.82, Math.sin(a) * r * 0.78);
  }
  ctx.stroke();
}

function tomato(ctx: Ctx, state: FoodState, r: number): void {
  const lw = r * 0.11;
  if (state === 'chopped') {
    for (const [x, y] of [
      [-0.36, 0.08],
      [0.36, -0.06],
    ] as const) {
      ellipse(ctx, x * r, y * r, r * 0.56, r * 0.52);
      fillStroke(ctx, WORLD.tomato, WORLD.tomatoDark, lw);
      ellipse(ctx, x * r, y * r, r * 0.4, r * 0.37);
      ctx.fillStyle = WORLD.tomatoLight;
      ctx.fill();
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * TAU + 0.5;
        ellipse(ctx, x * r + Math.cos(a) * r * 0.2, y * r + Math.sin(a) * r * 0.19, r * 0.11, r * 0.07, a);
        ctx.fillStyle = WORLD.bunLight;
        ctx.fill();
      }
    }
    return;
  }
  if (state === 'cooked') {
    stewPath(ctx, r);
    fillStroke(ctx, mix(WORLD.tomato, WORLD.tomatoDark, 0.35), WORLD.tomatoDark, lw);
    ellipse(ctx, r * 0.1, r * 0.15, r * 0.5, r * 0.36);
    ctx.fillStyle = withAlpha(WORLD.tomatoDark, 0.45);
    ctx.fill();
    gloss(ctx, -r * 0.3, -r * 0.3, r * 0.26, r * 0.14, 0.6);
    return;
  }
  ellipse(ctx, 0, 0.04 * r, r * 0.95, r * 0.88);
  fillStroke(ctx, WORLD.tomato, WORLD.tomatoDark, lw);
  ellipse(ctx, r * 0.18, r * 0.24, r * 0.62, r * 0.5);
  ctx.fillStyle = withAlpha(WORLD.tomatoDark, 0.3);
  ctx.fill();
  gloss(ctx, -r * 0.38, -r * 0.22, r * 0.26, r * 0.15, 0.7);
  star(ctx, 0, -r * 0.5, r * 0.4, r * 0.14, 5);
  fillStroke(ctx, WORLD.leaf, WORLD.lettuceDark, r * 0.06);
  ellipse(ctx, 0, -r * 0.55, r * 0.07, r * 0.07);
  ctx.fillStyle = WORLD.lettuceDark;
  ctx.fill();
}

const SEEDS: [number, number, number][] = [
  [-0.45, -0.2, 0.4],
  [-0.1, -0.42, -0.3],
  [0.3, -0.3, 0.8],
  [0.5, 0.05, -0.6],
  [-0.2, 0.08, 1.2],
  [0.12, -0.05, 0.1],
];

function bun(ctx: Ctx, state: FoodState, r: number): void {
  const lw = r * 0.1;
  const cooked = state === 'cooked';
  const main = cooked ? WORLD.bunDark : WORLD.bun;
  const edge = cooked ? WORLD.meatCooked : WORLD.bunDark;
  if (state === 'chopped') {
    for (const sx of [-1, 1]) {
      ctx.save();
      ctx.translate(sx * r * 0.4, 0);
      ellipse(ctx, 0, r * 0.12, r * 0.5, r * 0.62);
      fillStroke(ctx, edge, edge, lw);
      ellipse(ctx, 0, 0, r * 0.5, r * 0.62);
      fillStroke(ctx, sx < 0 ? WORLD.bunLight : main, edge, lw);
      ctx.restore();
    }
    return;
  }
  ellipse(ctx, 0, r * 0.2, r, r * 0.74);
  fillStroke(ctx, edge, edge, lw);
  domePath(ctx, r);
  fillStroke(ctx, main, edge, lw);
  gloss(ctx, -r * 0.3, -r * 0.3, r * 0.42, r * 0.22, cooked ? 0.25 : 0.45);
  for (const [x, y, a] of SEEDS) {
    ellipse(ctx, x * r, y * r, r * 0.11, r * 0.06, a);
    ctx.fillStyle = WORLD.sesame;
    ctx.fill();
  }
}

const SPECKS: [number, number][] = [
  [-0.5, -0.2],
  [-0.1, -0.45],
  [0.35, -0.25],
  [0.55, 0.15],
  [0.05, 0.1],
  [-0.4, 0.3],
  [0.25, 0.4],
];

function meat(ctx: Ctx, state: FoodState, r: number): void {
  const lw = r * 0.1;
  if (state === 'chopped') {
    // Minced: a heap of crumbles.
    for (const [x, y, k] of [
      [-0.35, 0.2, 0.42],
      [0.32, 0.22, 0.4],
      [0, -0.05, 0.46],
      [-0.25, -0.35, 0.32],
      [0.28, -0.3, 0.34],
    ] as const) {
      ruffle(ctx, x * r, y * r, k * r, 5, 0.25, x * 7);
      fillStroke(ctx, WORLD.meatRaw, WORLD.meatRawDark, lw * 0.8);
    }
    return;
  }
  const cooked = state === 'cooked';
  const main = cooked ? WORLD.meatCooked : WORLD.meatRaw;
  const dark = cooked ? WORLD.meatCookedDark : WORLD.meatRawDark;
  ellipse(ctx, 0, r * 0.2, r * 0.95, r * 0.75);
  fillStroke(ctx, dark, dark, lw);
  pattyPath(ctx, r);
  fillStroke(ctx, main, dark, lw);
  if (cooked) {
    pattyPath(ctx, r);
    grill(ctx, r, WORLD.meatCookedDark);
    gloss(ctx, -r * 0.35, -r * 0.3, r * 0.28, r * 0.12, 0.25);
  } else {
    for (const [x, y] of SPECKS) {
      ellipse(ctx, x * r, y * r, r * 0.09, r * 0.07);
      ctx.fillStyle = withAlpha(WORLD.fat, 0.85);
      ctx.fill();
    }
    gloss(ctx, -r * 0.4, -r * 0.3, r * 0.22, r * 0.1, 0.4);
  }
}

function steak(ctx: Ctx, state: FoodState, r: number): void {
  if (state === 'chopped') {
    // Sliced: three strips with a fat edge.
    for (const k of [-1, 0, 1]) {
      ctx.save();
      ctx.translate(k * r * 0.48, k * r * 0.08);
      ctx.rotate(0.25);
      ctx.beginPath();
      ctx.roundRect(-r * 0.2, -r * 0.62, r * 0.4, r * 1.24, r * 0.14);
      fillStroke(ctx, WORLD.steakRaw, WORLD.steakRawDark, r * 0.09);
      ctx.fillStyle = WORLD.fat;
      ctx.fillRect(-r * 0.2, -r * 0.6, r * 0.4, r * 0.18);
      ctx.restore();
    }
    return;
  }
  const cooked = state === 'cooked';
  const fat = cooked ? WORLD.bunLight : WORLD.fat;
  const main = cooked ? WORLD.meatCooked : WORLD.steakRaw;
  const dark = cooked ? WORLD.meatCookedDark : WORLD.steakRawDark;
  steakPath(ctx, r);
  fillStroke(ctx, fat, dark, r * 0.1);
  ctx.save();
  ctx.translate(r * 0.06, r * 0.04);
  steakPath(ctx, r, 0.8);
  ctx.fillStyle = main;
  ctx.fill();
  ctx.restore();
  if (cooked) {
    steakPath(ctx, r, 0.85);
    grill(ctx, r, WORLD.meatCookedDark, true);
  } else {
    ctx.strokeStyle = withAlpha(WORLD.fat, 0.75);
    ctx.lineWidth = r * 0.06;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-0.5 * r, -0.3 * r);
    ctx.quadraticCurveTo(-0.1 * r, -0.1 * r, 0.1 * r, -0.4 * r);
    ctx.moveTo(0.1 * r, 0.1 * r);
    ctx.quadraticCurveTo(0.4 * r, 0.0, 0.6 * r, 0.25 * r);
    ctx.moveTo(-0.45 * r, 0.25 * r);
    ctx.quadraticCurveTo(-0.25 * r, 0.1 * r, -0.05 * r, 0.3 * r);
    ctx.stroke();
  }
  // The bone.
  ellipse(ctx, -0.38 * r, -0.02 * r, r * 0.17, r * 0.15);
  fillStroke(ctx, PALETTE.paper, mix(PALETTE.paper, PALETTE.steel, 0.6), r * 0.06);
  gloss(ctx, -0.25 * r, -0.4 * r, r * 0.2, r * 0.08, cooked ? 0.2 : 0.35);
}

function fish(ctx: Ctx, state: FoodState, r: number): void {
  const lw = r * 0.09;
  const cooked = state === 'cooked';
  if (state === 'chopped') {
    for (const [x, y, a] of [
      [-0.32, 0.1, -0.35],
      [0.34, -0.08, -0.35],
    ] as const) {
      ctx.save();
      ctx.translate(x * r, y * r);
      ctx.rotate(a);
      ctx.beginPath();
      ctx.roundRect(-r * 0.36, -r * 0.48, r * 0.72, r * 0.96, r * 0.2);
      fillStroke(ctx, mix(WORLD.fish, WORLD.fishBelly, 0.55), WORLD.fishDark, lw);
      ctx.strokeStyle = withAlpha(PALETTE.paper, 0.8);
      ctx.lineWidth = r * 0.06;
      ctx.beginPath();
      for (let k = -1; k <= 1; k++) {
        ctx.moveTo(-r * 0.3, k * r * 0.28 - r * 0.08);
        ctx.lineTo(r * 0.3, k * r * 0.28 + r * 0.08);
      }
      ctx.stroke();
      ctx.restore();
    }
    return;
  }
  const main = cooked ? WORLD.fishCooked : WORLD.fish;
  const dark = cooked ? WORLD.bunDark : WORLD.fishDark;
  fishPath(ctx, r);
  fillStroke(ctx, main, dark, lw);
  ctx.save();
  fishPath(ctx, r);
  ctx.clip();
  ellipse(ctx, -0.15 * r, 0.38 * r, r * 0.85, r * 0.34);
  ctx.fillStyle = cooked ? WORLD.bunLight : WORLD.fishBelly;
  ctx.fill();
  if (cooked) {
    fishPath(ctx, r);
    grill(ctx, r, withAlpha(WORLD.meatCooked, 0.8));
  }
  ctx.restore();
  // Dorsal fin, gill and eye.
  ctx.beginPath();
  ctx.moveTo(-0.25 * r, -0.48 * r);
  ctx.quadraticCurveTo(0.05 * r, -0.8 * r, 0.25 * r, -0.42 * r);
  ctx.closePath();
  fillStroke(ctx, dark, dark, lw * 0.6);
  ctx.strokeStyle = dark;
  ctx.lineWidth = lw * 0.8;
  ctx.beginPath();
  ctx.arc(-0.42 * r, 0, r * 0.3, -0.9, 0.9);
  ctx.stroke();
  ellipse(ctx, -0.66 * r, -0.1 * r, r * 0.12, r * 0.12);
  ctx.fillStyle = PALETTE.paper;
  ctx.fill();
  ellipse(ctx, -0.68 * r, -0.1 * r, r * 0.06, r * 0.06);
  ctx.fillStyle = cooked ? withAlpha(PALETTE.ink, 0.5) : PALETTE.ink;
  ctx.fill();
  gloss(ctx, -0.3 * r, -0.25 * r, r * 0.25, r * 0.08, 0.35);
}

/** Path of a food's silhouette (for burnt food, which keeps its shape). */
function silhouette(ctx: Ctx, kind: IngredientKind, r: number, wasChopped: boolean): void {
  switch (kind) {
    case 'lettuce':
      if (wasChopped) {
        ctx.beginPath();
        for (const [x, y, s] of PIECES) ctx.ellipse(x * r, y * r, s * r, s * r * 0.9, 0, 0, TAU);
      } else ruffle(ctx, 0, 0, r, 7, 0.14);
      return;
    case 'tomato':
      stewPath(ctx, r);
      return;
    case 'bun':
      domePath(ctx, r);
      return;
    case 'meat':
      pattyPath(ctx, r);
      return;
    case 'steak':
      steakPath(ctx, r);
      return;
    case 'fish':
      fishPath(ctx, r);
      return;
  }
}

function burnt(ctx: Ctx, kind: IngredientKind, r: number): void {
  ctx.save();
  ctx.translate(0, r * 0.12);
  silhouette(ctx, kind, r, false);
  ctx.fillStyle = PALETTE.nightDeep;
  ctx.fill();
  ctx.restore();
  silhouette(ctx, kind, r, false);
  fillStroke(ctx, WORLD.char, WORLD.charEdge, r * 0.1);
  ctx.save();
  silhouette(ctx, kind, r, false);
  ctx.clip();
  ctx.strokeStyle = withAlpha(PALETTE.lanternHot, 0.85);
  ctx.lineWidth = r * 0.07;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-0.5 * r, -0.1 * r);
  ctx.lineTo(-0.2 * r, 0.05 * r);
  ctx.lineTo(-0.05 * r, -0.2 * r);
  ctx.moveTo(0.15 * r, 0.3 * r);
  ctx.lineTo(0.4 * r, 0.15 * r);
  ctx.stroke();
  ctx.restore();
  gloss(ctx, -0.3 * r, -0.3 * r, r * 0.25, r * 0.1, 0.12);
}

/** Paint one piece of food centred on (0,0). */
export function paintFood(ctx: Ctx, food: Food, r: number): void {
  if (food.state === 'burnt') {
    burnt(ctx, food.kind, r);
    return;
  }
  switch (food.kind) {
    case 'lettuce':
      return lettuce(ctx, food.state, r);
    case 'tomato':
      return tomato(ctx, food.state, r);
    case 'bun':
      return bun(ctx, food.state, r);
    case 'meat':
      return meat(ctx, food.state, r);
    case 'steak':
      return steak(ctx, food.state, r);
    case 'fish':
      return fish(ctx, food.state, r);
  }
}

// ---------- plates ----------

export const PLATE_RX = 1.38;
export const PLATE_RY = 1.18;

const plateRim = mix(PALETTE.paper, PALETTE.steel, 0.5);
const plateWell = mix(PALETTE.paper, PALETTE.steel, 0.14);

/** Where each food sits on a plate (fractions of r) and how big it is. */
function plateLayout(contents: readonly Food[]): { food: Food; x: number; y: number; s: number }[] {
  const n = contents.length;
  const bunIdx = contents.findIndex((f) => f.kind === 'bun');
  const meatIdx = contents.findIndex((f) => f.kind === 'meat');
  if (n === 2 && bunIdx >= 0 && meatIdx >= 0) {
    // A burger: patty under the bun, both still visible.
    return [
      { food: contents[meatIdx]!, x: 0.05, y: 0.18, s: 0.66 },
      { food: contents[bunIdx]!, x: -0.05, y: -0.2, s: 0.6 },
    ];
  }
  if (n === 1) return [{ food: contents[0]!, x: 0, y: -0.04, s: 0.74 }];
  if (n === 2)
    return [
      { food: contents[0]!, x: -0.42, y: 0.04, s: 0.58 },
      { food: contents[1]!, x: 0.42, y: -0.04, s: 0.58 },
    ];
  return contents.map((food, i) => {
    const a = -Math.PI / 2 + (i / n) * TAU;
    return { food, x: Math.cos(a) * 0.46, y: Math.sin(a) * 0.4 + 0.06, s: 0.52 };
  });
}

function snowflake(ctx: Ctx, x: number, y: number, s: number): void {
  ctx.beginPath();
  for (let k = 0; k < 3; k++) {
    const a = (k * Math.PI) / 3;
    ctx.moveTo(x - Math.cos(a) * s, y - Math.sin(a) * s);
    ctx.lineTo(x + Math.cos(a) * s, y + Math.sin(a) * s);
  }
  ctx.stroke();
}

/** Paint a plate (with its contents, grime or frost) centred on (0,0). */
export function paintPlate(ctx: Ctx, plate: Pick<PlateItem, 'dirty' | 'cold' | 'contents'>, r: number): void {
  const rx = r * PLATE_RX;
  const ry = r * PLATE_RY;
  ellipse(ctx, 0, r * 0.16, rx, ry);
  ctx.fillStyle = mix(PALETTE.paper, PALETTE.steel, 0.7);
  ctx.fill();
  ellipse(ctx, 0, 0, rx, ry);
  fillStroke(ctx, PALETTE.paper, plateRim, r * 0.07);
  ellipse(ctx, 0, r * 0.03, rx * 0.7, ry * 0.68);
  ctx.fillStyle = plateWell;
  ctx.fill();
  ctx.strokeStyle = withAlpha(PALETTE.steel, 0.35);
  ctx.lineWidth = r * 0.05;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, 0, rx * 0.88, ry * 0.86, 0, Math.PI * 1.05, Math.PI * 1.45);
  ctx.strokeStyle = withAlpha(PALETTE.paper, 0.95);
  ctx.lineWidth = r * 0.08;
  ctx.lineCap = 'round';
  ctx.stroke();
  if (plate.dirty) {
    ctx.strokeStyle = withAlpha(WORLD.grime, 0.8);
    ctx.lineWidth = r * 0.16;
    ctx.beginPath();
    ctx.arc(-r * 0.15, r * 0.05, r * 0.5, 0.4, 1.9);
    ctx.moveTo(r * 0.45, -r * 0.35);
    ctx.quadraticCurveTo(r * 0.1, -r * 0.2, r * 0.25, r * 0.1);
    ctx.stroke();
    for (const [x, y] of [
      [-0.5, -0.3],
      [0.5, 0.3],
      [0.05, -0.45],
      [-0.2, 0.5],
    ] as const) {
      ellipse(ctx, x * r, y * r, r * 0.08, r * 0.07);
      ctx.fillStyle = PALETTE.bambooDark;
      ctx.fill();
    }
  }
  for (const p of plateLayout(plate.contents)) {
    ctx.save();
    ctx.translate(p.x * r, p.y * r);
    paintFood(ctx, p.food, r * p.s);
    ctx.restore();
  }
  if (plate.cold) {
    ellipse(ctx, 0, 0, rx, ry);
    ctx.fillStyle = withAlpha(WORLD.frost, 0.42);
    ctx.fill();
    ctx.strokeStyle = WORLD.frost;
    ctx.lineWidth = r * 0.14;
    ctx.stroke();
    // A snowflake badge: the cold cue that is not colour.
    ellipse(ctx, rx * 0.72, -ry * 0.7, r * 0.36, r * 0.36);
    fillStroke(ctx, WORLD.fishDark, WORLD.frost, r * 0.07);
    ctx.strokeStyle = PALETTE.paper;
    ctx.lineWidth = r * 0.07;
    ctx.lineCap = 'round';
    snowflake(ctx, rx * 0.72, -ry * 0.7, r * 0.22);
  }
}

/** Half-size of the square a food or plate sprite needs at reference radius r. */
export const itemHalf = (r: number): number => r * 1.65;

function itemKey(item: Exclude<Item, { type: 'charm' }> | Food, r: number): string {
  if ('type' in item && item.type === 'plate') {
    return `p${item.dirty ? 'd' : ''}${item.cold ? 'c' : ''}:${item.contents.map((f) => f.kind + f.state[0]).join(',')}:${r.toFixed(1)}`;
  }
  return `f:${item.kind}:${item.state}:${r.toFixed(1)}`;
}

/** Draw an item or a piece of food (cached sprite) centred at x,y. */
export function drawItem(ctx: Ctx, sprites: SpriteCache, item: Item | Food, x: number, y: number, r: number): void {
  // Charms (RULES §10): the mascot figure, a little larger than food so it stands out.
  if ('type' in item && item.type === 'charm') return drawCharm(ctx, sprites, item.variant, x, y, r * CHARM_SCALE);
  sprites.draw(ctx, itemKey(item, r), itemHalf(r), x, y, (c) => {
    if ('type' in item && item.type === 'plate') paintPlate(c, item, r);
    else paintFood(c, item, r);
  });
}

/** Soft contact shadow under an item resting on a surface. */
export function itemShadow(ctx: Ctx, x: number, y: number, r: number, plate: boolean): void {
  ellipse(ctx, x + r * 0.12, y + r * (plate ? 0.42 : 0.5), r * (plate ? 1.4 : 0.9), r * (plate ? 1.0 : 0.55));
  ctx.fillStyle = withAlpha(PALETTE.nightDeep, 0.3);
  ctx.fill();
}
