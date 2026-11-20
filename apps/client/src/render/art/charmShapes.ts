import { PALETTE as P, TEAMS, WORLD as W } from '../../art/tokens';

/**
 * The LINE WAR mascot, shared by the world canvas (render/art/charm.ts) and the DOM's SVG
 * (hud/charmIcon.ts): a round paper-lantern bunny. It is the game's own lantern come to life:
 * a squat paper body with meridian ribs, wooden caps top and bottom, a hanging loop, a tassel
 * tail, two short rounded paper ears and a small happy face lit from inside.
 *
 * The figure is a list of flat shapes in unit space (body radius 1, centre 0,0, y down), back
 * to front, so both backends draw exactly the same character. Each of the 9 variants keeps the
 * base silhouette and adds a skin (paper colours) plus one accessory that reads at small size.
 */

export type Cmd =
  | readonly ['M' | 'L', number, number]
  | readonly ['Q', number, number, number, number]
  | readonly ['C', number, number, number, number, number, number]
  | readonly ['Z'];

export interface RadialFill {
  /** Centre and radius in unit space; stops are [offset 0..1, colour]. */
  radial: { cx: number; cy: number; r: number; stops: readonly (readonly [number, string])[] };
}

export type Fill = string | RadialFill;

interface Paint {
  fill?: Fill;
  stroke?: string;
  width?: number;
  alpha?: number;
  /** Faces, ribs, highlights: skipped when the figure is drawn as a locked silhouette. */
  detail?: boolean;
  /** Clipped to the body (stripes, belly patches). */
  clip?: boolean;
}

export type Shape = Paint & ({ ellipse: readonly [number, number, number, number, number?] } | { path: readonly Cmd[] });

export interface CharmArt {
  id: string;
  shapes: Shape[];
  rare: boolean;
  /** Colour of the light it casts (floor pool, halo). */
  glow: string;
  /** Lighthouse: a lamp at the top that sweeps a beam (unit-space centre). */
  beacon?: { x: number; y: number };
}

/** Unit-space box that holds every variant (accessories included): x, y, w, h. */
export const CHARM_BOX = { x: -1.6, y: -2.05, w: 3.2, h: 3.65 } as const;

export const BODY = { rx: 1, ry: 0.84 } as const;

interface Skin {
  body: string;
  core: string;
  edge: string;
  tassel: string;
  earInner: string;
  eyes?: 'dots' | 'sleepy';
  eyeColor?: string;
  blush?: string;
}

const INK = P.ink;
const LW = 0.085;

// ---------- path helpers ----------

const E = (cx: number, cy: number, rx: number, ry: number, rot = 0, p: Paint = {}): Shape => ({ ellipse: [cx, cy, rx, ry, rot], ...p });
const path = (d: Cmd[], p: Paint = {}): Shape => ({ path: d, ...p });

/** Rounded rect as path commands. */
function rr(x: number, y: number, w: number, h: number, r: number): Cmd[] {
  return [
    ['M', x + r, y],
    ['L', x + w - r, y],
    ['Q', x + w, y, x + w, y + r],
    ['L', x + w, y + h - r],
    ['Q', x + w, y + h, x + w - r, y + h],
    ['L', x + r, y + h],
    ['Q', x, y + h, x, y + h - r],
    ['L', x, y + r],
    ['Q', x, y, x + r, y],
    ['Z'],
  ];
}

/** Transform local (lx, ly) by rotation `a` then translation. */
function xf(lx: number, ly: number, a: number, tx: number, ty: number): [number, number] {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [tx + lx * c - ly * s, ty + lx * s + ly * c];
}

/** A rounded teardrop ear: base half-width w at (tx, ty), tip `len` away, tilted by `a` (0 = straight up). */
function ear(tx: number, ty: number, a: number, len: number, w: number): Cmd[] {
  const p = (lx: number, ly: number) => xf(lx, ly, a, tx, ty);
  const [ax, ay] = p(-w, 0);
  const [b1x, b1y] = p(-w * 1.3, -len * 0.55);
  const [b2x, b2y] = p(-w * 1.1, -len * 1.04);
  const [tx2, ty2] = p(0, -len * 1.04);
  const [c1x, c1y] = p(w * 1.1, -len * 1.04);
  const [c2x, c2y] = p(w * 1.3, -len * 0.55);
  const [dx, dy] = p(w, 0);
  return [['M', ax, ay], ['C', b1x, b1y, b2x, b2y, tx2, ty2], ['C', c1x, c1y, c2x, c2y, dx, dy], ['Z']];
}

function star(cx: number, cy: number, outer: number, inner: number, points: number, rot = -Math.PI / 2): Cmd[] {
  const d: Cmd[] = [];
  for (let i = 0; i < points * 2; i++) {
    const a = rot + (i * Math.PI) / points;
    const r = i % 2 === 0 ? outer : inner;
    d.push([i === 0 ? 'M' : 'L', cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  d.push(['Z']);
  return d;
}

/** A soft four-point sparkle (rare charms, the moon's stars). */
export function sparkle(cx: number, cy: number, r: number): Cmd[] {
  const k = r * 0.22;
  return [
    ['M', cx, cy - r],
    ['Q', cx + k, cy - k, cx + r, cy],
    ['Q', cx + k, cy + k, cx, cy + r],
    ['Q', cx - k, cy + k, cx - r, cy],
    ['Q', cx - k, cy - k, cx, cy - r],
    ['Z'],
  ];
}

const outline = (p: Paint = {}): Paint => ({ stroke: INK, width: LW, ...p });

// ---------- the base figure ----------

// The left ear stands; the right one flops out to the side (its signature tilt).
const EAR_L = { x: -0.34, y: -0.68, a: -0.3 };
const EAR_R = { x: 0.36, y: -0.66, a: 0.78 };

function ears(sk: Skin): Shape[] {
  return [
    path(ear(EAR_L.x, EAR_L.y, EAR_L.a, 0.98, 0.23), outline({ fill: sk.body })),
    path(ear(EAR_R.x, EAR_R.y, EAR_R.a, 0.9, 0.23), outline({ fill: sk.body })),
    path(ear(EAR_L.x, EAR_L.y - 0.1, EAR_L.a, 0.72, 0.11), { fill: sk.earInner, detail: true }),
    path(ear(EAR_R.x + 0.06, EAR_R.y - 0.06, EAR_R.a, 0.66, 0.11), { fill: sk.earInner, detail: true }),
  ];
}

function body(sk: Skin): Shape[] {
  const ribs: Cmd[] = [
    ['M', 0, -BODY.ry],
    ['C', -0.95, -0.62, -0.95, 0.62, 0, BODY.ry],
    ['M', 0, -BODY.ry],
    ['C', 0.95, -0.62, 0.95, 0.62, 0, BODY.ry],
  ];
  const rings: Cmd[] = [
    ['M', -1, -0.5],
    ['Q', 0, -0.62, 1, -0.5],
    ['M', -1, 0.56],
    ['Q', 0, 0.68, 1, 0.56],
  ];
  return [
    // Hanging loop (the charm hangs from it on a sign).
    E(0, -1.02, 0.13, 0.13, 0, { stroke: P.bambooDark, width: 0.07, detail: false }),
    E(0, 0, BODY.rx, BODY.ry, 0, {
      fill: { radial: { cx: -0.12, cy: -0.02, r: 1.12, stops: [[0, sk.core], [0.5, sk.body], [1, sk.edge]] } },
      stroke: INK,
      width: LW,
    }),
    path(ribs, { stroke: sk.edge, width: 0.05, alpha: 0.55, detail: true, clip: true }),
    path(rings, { stroke: sk.edge, width: 0.045, alpha: 0.45, detail: true, clip: true }),
    // Paper sheen, upper left.
    E(-0.46, -0.4, 0.28, 0.14, -0.6, { fill: P.paper, alpha: 0.5, detail: true }),
  ];
}

function face(sk: Skin): Shape[] {
  const eye = sk.eyeColor ?? INK;
  const out: Shape[] = [];
  for (const s of [-1, 1]) {
    if (sk.eyes === 'sleepy') {
      out.push(path([['M', s * 0.3 - 0.11, 0.02], ['Q', s * 0.3, 0.13, s * 0.3 + 0.11, 0.02]], { stroke: eye, width: 0.065, detail: true }));
    } else {
      out.push(E(s * 0.3, 0.02, 0.088, 0.122, 0, { fill: eye, detail: true }));
      out.push(E(s * 0.3 - 0.028, -0.025, 0.034, 0.038, 0, { fill: P.paper, detail: true }));
    }
    out.push(E(s * 0.56, 0.21, 0.14, 0.085, 0, { fill: sk.blush ?? W.tomatoLight, alpha: 0.6, detail: true }));
  }
  // A small happy mouth with a tiny open smile (no cross, no line-mouth).
  out.push(path([['M', -0.085, 0.165], ['Q', 0, 0.3, 0.085, 0.165], ['Q', 0, 0.21, -0.085, 0.165], ['Z']], { fill: eye, stroke: eye, width: 0.03, detail: true }));
  return out;
}

function caps(): Shape[] {
  return [
    path(rr(-0.44, -0.93, 0.88, 0.2, 0.07), outline({ fill: P.bambooDark, width: 0.06 })),
    path(rr(-0.4, -0.91, 0.8, 0.06, 0.03), { fill: P.bamboo, detail: true }),
    path(rr(-0.36, 0.74, 0.72, 0.18, 0.06), outline({ fill: P.bambooDark, width: 0.06 })),
    path(rr(-0.32, 0.76, 0.64, 0.05, 0.025), { fill: P.bamboo, detail: true }),
  ];
}

function tassel(sk: Skin): Shape[] {
  return [
    path([['M', 0, 0.92], ['L', 0, 1.1]], { stroke: sk.tassel, width: 0.07 }),
    E(0, 1.11, 0.075, 0.07, 0, outline({ fill: sk.tassel, width: 0.04 })),
    path(
      [['M', -0.09, 1.15], ['L', 0.09, 1.15], ['L', 0.14, 1.44], ['Q', 0, 1.5, -0.14, 1.44], ['Z']],
      outline({ fill: sk.tassel, width: 0.045 }),
    ),
    path([['M', -0.04, 1.2], ['L', -0.06, 1.42], ['M', 0.04, 1.2], ['L', 0.06, 1.42]], { stroke: INK, width: 0.025, alpha: 0.35, detail: true }),
  ];
}

function figure(sk: Skin, back: Shape[], decor: Shape[], front: Shape[]): Shape[] {
  return [...back, ...ears(sk), ...body(sk), ...decor, ...face(sk), ...caps(), ...tassel(sk), ...front];
}

// ---------- the 9 variants ----------

const BASE: Skin = { body: P.lantern, core: P.paper, edge: P.lanternHot, tassel: P.danger, earInner: W.tomatoLight };

function lantern(): CharmArt {
  // The classic: lantern-gold paper with a red tassel and a red bow on the loop.
  const bow: Shape[] = [
    path([['M', 0, -1.0], ['L', -0.3, -1.16], ['Q', -0.36, -1.0, -0.3, -0.84], ['Z']], outline({ fill: P.danger, width: 0.05 })),
    path([['M', 0, -1.0], ['L', 0.3, -1.16], ['Q', 0.36, -1.0, 0.3, -0.84], ['Z']], outline({ fill: P.danger, width: 0.05 })),
    E(0, -1.0, 0.07, 0.07, 0, outline({ fill: P.danger, width: 0.04 })),
  ];
  return { id: 'night-lantern', shapes: figure(BASE, [], [], bow), rare: false, glow: P.lantern };
}

function noodle(): CharmArt {
  const sk: Skin = { body: W.bunLight, core: P.paper, edge: W.bun, tassel: P.lanternHot, earInner: W.tomatoLight };
  const stick = (x0: number, y0: number, x1: number, y1: number): Shape[] => [
    path([['M', x0, y0], ['L', x1, y1]], { stroke: INK, width: 0.15 }),
    path([['M', x0, y0], ['L', x1, y1]], { stroke: P.bamboo, width: 0.075 }),
  ];
  // Chopsticks pinned through the top like a hairpin, with a noodle caught on them.
  const back = [...stick(0.05, -0.55, 0.86, -1.82), ...stick(0.28, -0.5, 1.1, -1.66)];
  const strand: Shape[] = [
    path(
      [['M', 0.9, -1.64], ['C', 1.24, -1.46, 0.82, -1.3, 1.1, -1.12], ['C', 1.34, -0.96, 0.98, -0.84, 1.12, -0.66]],
      { stroke: INK, width: 0.13 },
    ),
    path(
      [['M', 0.9, -1.64], ['C', 1.24, -1.46, 0.82, -1.3, 1.1, -1.12], ['C', 1.34, -0.96, 0.98, -0.84, 1.12, -0.66]],
      { stroke: P.paper, width: 0.06 },
    ),
  ];
  return { id: 'night-noodle', shapes: figure(sk, back, [], strand), rare: false, glow: P.lantern };
}

function moon(): CharmArt {
  const sk: Skin = { body: P.slateLight, core: W.frost, edge: P.night, tassel: P.lantern, earInner: W.puddle, eyes: 'sleepy', eyeColor: P.paper, blush: W.frost };
  // A crescent moon resting between the ears, and two little stars.
  const crescent: Cmd[] = [['M', -0.2, -1.62], ['C', -0.72, -1.38, -0.44, -0.86, 0.08, -0.98], ['C', -0.28, -1.08, -0.42, -1.4, -0.2, -1.62], ['Z']];
  const front: Shape[] = [
    path(crescent, outline({ fill: P.lantern, width: 0.05 })),
    path(sparkle(0.34, -1.5, 0.15), { fill: P.paper }),
    path(sparkle(-0.86, -0.34, 0.1), { fill: P.lantern }),
    path(sparkle(0.72, 0.5, 0.08), { fill: P.paper, detail: true }),
  ];
  return { id: 'night-moon', shapes: figure(sk, [], [], front), rare: true, glow: W.frost };
}

function sailor(): CharmArt {
  const sk: Skin = { body: P.paper, core: P.paper, edge: W.steelLight, tassel: W.fishDark, earInner: W.tomatoLight };
  const navy = W.fishDark;
  // Sailor stripes on the belly and a little white cap with a navy band.
  const decor: Shape[] = [
    path(rr(-1.1, 0.36, 2.2, 0.1, 0), { fill: navy, clip: true }),
    path(rr(-1.1, 0.54, 2.2, 0.1, 0), { fill: navy, clip: true }),
  ];
  const cap: Shape[] = [
    E(0, -1.06, 0.46, 0.2, 0, outline({ fill: P.paper, width: 0.06 })),
    path(rr(-0.46, -1.02, 0.92, 0.13, 0.05), outline({ fill: navy, width: 0.05 })),
    E(0, -1.2, 0.07, 0.05, 0, { fill: navy }),
  ];
  return { id: 'harbor-sailor', shapes: figure(sk, [], decor, cap), rare: false, glow: P.lantern };
}

function fish(): CharmArt {
  const sk: Skin = { body: W.fish, core: W.fishBelly, edge: W.fishDark, tassel: P.lanternHot, earInner: W.fishBelly };
  // A goldfish riding on top, tail flicked up.
  const front: Shape[] = [
    path([['M', -0.36, -1.18], ['L', -0.72, -1.42], ['Q', -0.62, -1.18, -0.72, -0.96], ['Z']], outline({ fill: P.lanternHot, width: 0.05 })),
    E(0.04, -1.16, 0.44, 0.22, -0.06, outline({ fill: W.bun, width: 0.06 })),
    path([['M', -0.12, -1.34], ['Q', 0.02, -1.5, 0.2, -1.36]], { fill: P.lanternHot, stroke: INK, width: 0.04 }),
    E(0.26, -1.2, 0.045, 0.045, 0, { fill: INK, detail: true }),
    path([['M', 0.02, -1.3], ['Q', -0.06, -1.16, 0.02, -1.02]], { stroke: W.bunDark, width: 0.04, detail: true }),
  ];
  const decor: Shape[] = [E(0, 0.62, 0.62, 0.34, 0, { fill: W.fishBelly, alpha: 0.7, clip: true })];
  return { id: 'harbor-fish', shapes: figure(sk, [], decor, front), rare: false, glow: W.frost };
}

function lighthouse(): CharmArt {
  const sk: Skin = { body: P.paper, core: P.paper, edge: W.steelLight, tassel: P.steel, earInner: W.tomatoLight };
  // Red and white bands, and a lamp room on top whose beam sweeps (drawn by the backends).
  const decor: Shape[] = [
    path(rr(-1.1, -0.66, 2.2, 0.28, 0), { fill: P.danger, clip: true }),
    path(rr(-1.1, 0.38, 2.2, 0.28, 0), { fill: P.danger, clip: true }),
  ];
  const lamp: Shape[] = [
    path(rr(-0.26, -1.2, 0.52, 0.3, 0.05), outline({ fill: P.lantern, width: 0.05 })),
    path([['M', -0.08, -1.18], ['L', -0.08, -0.92], ['M', 0.08, -1.18], ['L', 0.08, -0.92]], { stroke: P.bambooDark, width: 0.035, detail: true }),
    path([['M', -0.34, -1.2], ['L', 0, -1.48], ['L', 0.34, -1.2], ['Z']], outline({ fill: P.danger, width: 0.05 })),
    E(0, -1.52, 0.05, 0.05, 0, { fill: INK }),
  ];
  return { id: 'harbor-lighthouse', shapes: figure(sk, [], decor, lamp), rare: true, glow: P.lantern, beacon: { x: 0, y: -1.06 } };
}

function sprout(): CharmArt {
  const sk: Skin = { body: W.lettuceLight, core: P.paper, edge: W.lettuce, tassel: W.lettuceDark, earInner: W.tomatoLight };
  const front: Shape[] = [
    path([['M', 0, -0.92], ['Q', 0.04, -1.16, 0, -1.34]], { stroke: INK, width: 0.12 }),
    path([['M', 0, -0.92], ['Q', 0.04, -1.16, 0, -1.34]], { stroke: W.leaf, width: 0.06 }),
    E(-0.24, -1.4, 0.26, 0.13, -0.5, outline({ fill: W.lettuce, width: 0.05 })),
    E(0.26, -1.48, 0.3, 0.14, 0.45, outline({ fill: W.lettuce, width: 0.05 })),
    path([['M', -0.04, -1.34], ['L', -0.38, -1.48]], { stroke: W.lettuceDark, width: 0.03, detail: true }),
    path([['M', 0.04, -1.36], ['L', 0.44, -1.58]], { stroke: W.lettuceDark, width: 0.03, detail: true }),
  ];
  return { id: 'rooftop-sprout', shapes: figure(sk, [], [], front), rare: false, glow: W.lettuceLight };
}

function tomato(): CharmArt {
  const sk: Skin = { body: W.tomato, core: W.tomatoLight, edge: W.tomatoDark, tassel: W.leaf, earInner: W.tomatoLight, blush: P.paper };
  const front: Shape[] = [
    path(star(0, -0.9, 0.46, 0.17, 5), outline({ fill: W.leaf, width: 0.05 })),
    path([['M', 0, -1.02], ['Q', 0.02, -1.18, 0.12, -1.3]], { stroke: INK, width: 0.12 }),
    path([['M', 0, -1.02], ['Q', 0.02, -1.18, 0.12, -1.3]], { stroke: W.lettuceDark, width: 0.06 }),
  ];
  return { id: 'rooftop-tomato', shapes: figure(sk, [], [], front), rare: false, glow: W.tomatoLight };
}

function wateringCan(): CharmArt {
  const sk: Skin = { body: W.water, core: W.frost, edge: W.fishDark, tassel: P.lantern, earInner: W.frost };
  // A tiny watering can perched on top, sprinkling sparkly drops past the right ear.
  const front: Shape[] = [
    path([['M', -0.36, -1.18], ['Q', -0.22, -1.56, 0.06, -1.18]], { stroke: INK, width: 0.12 }),
    path([['M', -0.36, -1.18], ['Q', -0.22, -1.56, 0.06, -1.18]], { stroke: P.steel, width: 0.06 }),
    path([['M', 0.2, -1.08], ['L', 0.78, -1.42]], { stroke: INK, width: 0.14 }),
    path([['M', 0.2, -1.08], ['L', 0.78, -1.42]], { stroke: W.steelLight, width: 0.07 }),
    path(rr(0.72, -1.56, 0.2, 0.2, 0.06), outline({ fill: W.steelLight, width: 0.05 })),
    path(rr(-0.42, -1.2, 0.68, 0.4, 0.1), outline({ fill: P.steel, width: 0.06 })),
    path(rr(-0.36, -1.16, 0.56, 0.08, 0.04), { fill: W.steelLight, detail: true }),
    path([['M', -0.08, -1.0], ['L', 0.0, -1.0]], { stroke: TEAMS[0].main, width: 0.12, detail: true }),
    path([['M', 1.0, -1.26], ['Q', 1.08, -1.12, 1.0, -1.06], ['Q', 0.92, -1.12, 1.0, -1.26], ['Z']], outline({ fill: W.frost, width: 0.03 })),
    path([['M', 1.14, -1.0], ['Q', 1.22, -0.86, 1.14, -0.8], ['Q', 1.06, -0.86, 1.14, -1.0], ['Z']], outline({ fill: W.frost, width: 0.03 })),
    path(sparkle(0.96, -0.76, 0.1), { fill: P.lantern }),
  ];
  return { id: 'rooftop-watering-can', shapes: figure(sk, [], [], front), rare: true, glow: W.frost };
}

const ART: Record<string, CharmArt> = Object.fromEntries(
  [lantern(), noodle(), moon(), sailor(), fish(), lighthouse(), sprout(), tomato(), wateringCan()].map((a) => [a.id, a]),
);

/** Ids with authored art (the content's 9 variants). */
export const CHARM_ART_IDS: readonly string[] = Object.keys(ART);

/** The art for a variant id; unknown ids get the classic Lantern Bunny so nothing ever draws blank. */
export function charmArt(variant: string): CharmArt {
  return ART[variant] ?? ART['night-lantern']!;
}
