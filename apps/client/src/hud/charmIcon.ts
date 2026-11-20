import { PALETTE as P } from '../art/tokens';
import './charms.css';
import { CHARM_BOX, charmArt, sparkle, type Cmd, type Fill, type Shape } from '../render/art/charmShapes';

/**
 * The mascot as inline SVG for the HUD and menus (same shapes as the world canvas). Rare
 * variants get a halo and sparkles whose motion lives in CSS (`.lw-charm-rare`), so
 * prefers-reduced-motion turns them still.
 */

const n = (v: number) => (Math.round(v * 1000) / 1000).toString();

function d(cmds: readonly Cmd[]): string {
  return cmds
    .map((c) => {
      switch (c[0]) {
        case 'M':
        case 'L':
          return `${c[0]}${n(c[1])} ${n(c[2])}`;
        case 'Q':
          return `Q${n(c[1])} ${n(c[2])} ${n(c[3])} ${n(c[4])}`;
        case 'C':
          return `C${n(c[1])} ${n(c[2])} ${n(c[3])} ${n(c[4])} ${n(c[5])} ${n(c[6])}`;
        case 'Z':
          return 'Z';
      }
    })
    .join('');
}

let uid = 0;

export interface CharmIconOptions {
  /** Extra classes on the <svg>. */
  cls?: string;
  /** Locked: a flat silhouette in currentColor (no face, no colours). */
  silhouette?: boolean;
  /** Accessible name; omitted = decorative (aria-hidden). */
  label?: string;
  /** Skip the rare halo and sparkles (tiny icons). */
  plain?: boolean;
}

/** SVG markup for one charm variant. */
export function charmIcon(variant: string, opts: CharmIconOptions = {}): string {
  const art = charmArt(variant);
  const id = `lwc${++uid}`;
  const sil = !!opts.silhouette;
  const defs: string[] = [`<clipPath id="${id}b"><ellipse cx="0" cy="0" rx="1" ry="0.84"/></clipPath>`];
  let grads = 0;
  const fillAttr = (f: Fill | undefined): string => {
    if (f === undefined) return 'none';
    if (sil) return 'currentColor';
    if (typeof f === 'string') return f;
    const gid = `${id}g${grads++}`;
    const { cx, cy, r, stops } = f.radial;
    defs.push(
      `<radialGradient id="${gid}" gradientUnits="userSpaceOnUse" cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}">${stops
        .map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`)
        .join('')}</radialGradient>`,
    );
    return `url(#${gid})`;
  };
  const shape = (s: Shape): string => {
    if (sil && s.detail) return '';
    const attrs = [
      `fill="${fillAttr(s.fill)}"`,
      s.stroke ? `stroke="${sil ? 'currentColor' : s.stroke}" stroke-width="${n(s.width ?? 0.05)}" stroke-linecap="round" stroke-linejoin="round"` : '',
      s.alpha !== undefined && !sil ? `opacity="${s.alpha}"` : '',
      s.clip ? `clip-path="url(#${id}b)"` : '',
    ]
      .filter(Boolean)
      .join(' ');
    if ('ellipse' in s) {
      const [cx, cy, rx, ry, rot] = s.ellipse;
      const tr = rot ? ` transform="rotate(${n((rot * 180) / Math.PI)} ${n(cx)} ${n(cy)})"` : '';
      return `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(rx)}" ry="${n(ry)}"${tr} ${attrs}/>`;
    }
    return `<path d="${d(s.path)}" ${attrs}/>`;
  };
  const body = art.shapes.map(shape).join('');
  const rare = art.rare && !sil && !opts.plain;
  const halo = rare
    ? `<g class="lw-charm-halo"><circle cx="0" cy="-0.1" r="1.45" fill="url(#${id}h)"/></g>`
    : '';
  if (rare) {
    defs.push(
      `<radialGradient id="${id}h"><stop offset="0" stop-color="${art.glow}" stop-opacity=".75"/><stop offset=".55" stop-color="${art.glow}" stop-opacity=".25"/><stop offset="1" stop-color="${art.glow}" stop-opacity="0"/></radialGradient>`,
    );
  }
  const beam =
    rare && art.beacon
      ? `<g class="lw-charm-beam" style="transform-origin:${n(art.beacon.x)}px ${n(art.beacon.y)}px"><path d="M${n(art.beacon.x)} ${n(art.beacon.y)}L-1.6 ${n(art.beacon.y - 0.4)}L-1.6 ${n(art.beacon.y + 0.3)}Z" fill="${P.lantern}" opacity=".35"/><path d="M${n(art.beacon.x)} ${n(art.beacon.y)}L1.6 ${n(art.beacon.y - 0.4)}L1.6 ${n(art.beacon.y + 0.3)}Z" fill="${P.lantern}" opacity=".35"/></g>`
      : '';
  const sparkles = rare
    ? `<g class="lw-charm-sparkles">${[
        [-1.18, -1.2, 0.2],
        [1.22, -0.2, 0.16],
        [-1.05, 0.72, 0.13],
      ]
        .map(([x, y, r], i) => `<path class="lw-charm-spark lw-charm-spark--${i}" d="${d(sparkle(x!, y!, r!))}" fill="${i === 1 ? P.paper : P.lantern}"/>`)
        .join('')}</g>`
    : '';
  const a11y = opts.label ? `role="img" aria-label="${opts.label.replace(/"/g, '&quot;')}"` : 'aria-hidden="true"';
  const cls = ['lw-charm', rare ? 'lw-charm-rare' : '', sil ? 'lw-charm-locked' : '', opts.cls ?? ''].filter(Boolean).join(' ');
  const { x, y, w, h } = CHARM_BOX;
  return `<svg class="${cls}" viewBox="${x} ${y} ${w} ${h}" ${a11y} data-charm="${art.id}"><defs>${defs.join('')}</defs>${halo}${beam}${body}${sparkles}</svg>`;
}
