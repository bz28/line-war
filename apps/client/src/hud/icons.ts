import type { FoodState, IngredientKind, TeamId, VesselKind } from '@line-war/sim';
import { PALETTE as P, TEAMS } from '../art/tokens';

/**
 * Hand-authored inline SVG for the HUD and menus. Every colour comes from the art tokens.
 * Icons share a 24-unit grid, an ink outline and a light-from-upper-left highlight, so they
 * read as one illustrated set on paper.
 */

const INK = P.ink;
const OUT = `stroke="${INK}" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round"`;

/** One food drawing per kind. `cooked` swaps to the browned palette. */
function foodBody(kind: IngredientKind, cooked: boolean): string {
  switch (kind) {
    case 'lettuce':
      return `<path d="${ruffle(12, 12.6, 8.2, 9, 1.5)}" fill="${TEAMS[0].main}" ${OUT}/>
<path d="${ruffle(12, 13.2, 4.6, 7, 1)}" fill="${TEAMS[0].light}" stroke="${TEAMS[0].dark}" stroke-width="1"/>
<path d="M12 9.6v7.2M12 12.6l-2 -1.4M12 12.6l2 -1.4" stroke="${TEAMS[0].dark}" stroke-width="1" stroke-linecap="round" fill="none"/>
<path d="M6.6 8.4c1-1.5 2.6-2.4 4.2-2.7" stroke="${P.paper}" stroke-width="1.2" stroke-linecap="round" fill="none" opacity=".75"/>`;
    case 'tomato':
      return cooked
        ? `<path d="M4.5 13.5c0-3.4 3.4-6 7.5-6s7.5 2.6 7.5 6c0 3.5-3.4 6.2-7.5 6.2s-7.5-2.7-7.5-6.2Z" fill="${TEAMS[1].dark}" ${OUT}/>
<path d="M8 12.2c1.6-1.4 6-1.4 8 .2" stroke="${P.danger}" stroke-width="1.6" fill="none" stroke-linecap="round"/>
<path d="M9 5.6c0-1 1-1.3 1-2.2M12.5 5.4c0-1 1-1.3 1-2.2M15.5 6c0-.9.8-1.2.8-2" stroke="${P.steel}" stroke-width="1.1" fill="none" stroke-linecap="round"/>`
        : `<circle cx="12" cy="13.2" r="7.6" fill="${P.danger}" ${OUT}/>
<path d="M8.4 9.6c.9-1 2.1-1.6 3.3-1.8" stroke="${P.paper}" stroke-width="1.4" stroke-linecap="round" fill="none" opacity=".75"/>
<path d="M12 6.4l-2.6-1.8 2.6.4 1-2 .9 2 2.6-.2-2.4 1.6Z" fill="${TEAMS[0].dark}" ${OUT} stroke-width="1"/>`;
    case 'bun':
      return `<path d="M3.8 13.4C3.8 8.6 7.4 5.6 12 5.6s8.2 3 8.2 7.8Z" fill="${P.bamboo}" ${OUT}/>
<rect x="3.8" y="13.4" width="16.4" height="2.4" rx="1" fill="${TEAMS[0].main}" ${OUT}/>
<path d="M4 15.8h16v1.6c0 1.2-1 2.2-2.2 2.2H6.2c-1.2 0-2.2-1-2.2-2.2Z" fill="${P.bamboo}" ${OUT}/>
<path d="M8.5 9.2l.9-.5M12 8l.9.4M15 9.6l.8-.6M10.4 11.2l.8.2" stroke="${P.paper}" stroke-width="1.2" stroke-linecap="round"/>`;
    case 'meat':
      return `<ellipse cx="12" cy="12.6" rx="8.2" ry="6.4" fill="${cooked ? P.bambooDark : TEAMS[1].light}" ${OUT}/>
<path d="M7.5 11c1.4-1.6 3.4-2.4 5.4-2.2" stroke="${cooked ? P.bamboo : P.paper}" stroke-width="1.3" stroke-linecap="round" fill="none" opacity=".8"/>
${cooked ? `<path d="M7.4 14.4l3.4-3.4M10.6 16l4.6-4.6M14.4 16.4l2.6-2.6" stroke="${INK}" stroke-width="1.2" stroke-linecap="round" opacity=".7"/>` : `<circle cx="10" cy="13.8" r=".9" fill="${P.paper}"/><circle cx="14.6" cy="12.4" r=".8" fill="${P.paper}"/>`}`;
    case 'steak':
      return `<path d="M4.4 11.4c0-3.8 3.6-6.2 7.8-6.2 4.6 0 7.8 3 7.4 7.2-.4 4.2-3.6 6.4-7.6 6.4-2.6 0-4-1.4-5.2-2.8-1.4-1.6-2.4-2.6-2.4-4.6Z" fill="${cooked ? P.bambooDark : P.danger}" ${OUT}/>
<path d="M9 9.6c1.6.4 2.4 1.6 4.4 1.4M10.4 14c1.2-.6 2.6-.2 3.8.6" stroke="${cooked ? P.bamboo : P.paper}" stroke-width="1.2" stroke-linecap="round" fill="none"/>
<circle cx="15.2" cy="9.4" r="1.6" fill="${P.paper}" ${OUT} stroke-width="1"/>
${cooked ? `<path d="M6.6 13.4l6-6M9.4 16.4l7-7" stroke="${INK}" stroke-width="1.2" stroke-linecap="round" opacity=".6"/>` : ''}`;
    case 'fish':
      return `<path d="M3.6 12.4c2.6-4 6.4-5.4 9.8-5.2 2.8.2 4.6 2 5.4 3.6l2.6-2.4v8l-2.6-2.4c-.8 1.6-2.6 3.4-5.4 3.6-3.4.2-7.2-1.2-9.8-5.2Z" fill="${cooked ? P.bamboo : P.steel}" ${OUT}/>
<circle cx="7.6" cy="11.4" r="1" fill="${INK}"/>
<path d="M10.6 9.4c.8 1.8.8 4.2 0 6" stroke="${INK}" stroke-width="1.1" fill="none" stroke-linecap="round" opacity=".6"/>
${cooked ? `<path d="M12.6 15.6l3.6-6.4M15.2 15.8l2-3.6" stroke="${P.bambooDark}" stroke-width="1.3" stroke-linecap="round"/>` : `<path d="M12.6 9.6c1.6-.6 3.2-.2 4.2.8" stroke="${P.paper}" stroke-width="1.1" fill="none" stroke-linecap="round" opacity=".8"/>`}`;
  }
}

/** Wavy closed outline (lettuce leaves): n bumps around a circle. */
function ruffle(cx: number, cy: number, r: number, n: number, amp: number): string {
  const pt = (a: number, rr: number) => `${(cx + Math.cos(a) * rr).toFixed(2)} ${(cy + Math.sin(a) * rr).toFixed(2)}`;
  let d = `M${pt(0, r)}`;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2;
    const a1 = ((i + 1) / n) * Math.PI * 2;
    d += `Q${pt((a0 + a1) / 2, r + amp)} ${pt(a1, r)}`;
  }
  return `${d}Z`;
}

/** Chopped food is drawn as pieces, not as the whole thing, so prep state reads by silhouette. */
function choppedBody(kind: IngredientKind): string | null {
  switch (kind) {
    case 'lettuce': {
      const leaf = (x: number, y: number, rot: number) =>
        `<g transform="translate(${x} ${y}) rotate(${rot})"><path d="${ruffle(0, 0, 4.4, 6, 1.2)}" fill="${TEAMS[0].main}" ${OUT} stroke-width="1.2"/><path d="M-2.8 0h5.6" stroke="${TEAMS[0].light}" stroke-width="1" stroke-linecap="round"/></g>`;
      return leaf(7.6, 9, -20) + leaf(16.4, 10, 25) + leaf(11.8, 16.4, 5);
    }
    case 'tomato': {
      const slice = (x: number, y: number) =>
        `<g transform="translate(${x} ${y}) scale(1.25)"><circle r="5" fill="${P.danger}" ${OUT} stroke-width="1.2"/><circle r="3.4" fill="${TEAMS[1].light}"/><path d="M0 -3.4v6.8M-3 -1.6l6 3.2M-3 1.6l6 -3.2" stroke="${P.danger}" stroke-width=".8"/><circle cx="-1.4" cy="-.8" r=".6" fill="${P.paper}"/><circle cx="1.4" cy=".9" r=".6" fill="${P.paper}"/><circle cx=".2" cy="-2.2" r=".55" fill="${P.paper}"/></g>`;
      return slice(8.4, 10) + slice(15.6, 14.6);
    }
    default:
      return null;
  }
}

/** Small badge in the lower right naming the vessel cooked food comes from: pan or pot. */
function badge(kind: VesselKind): string {
  const glyph =
    kind === 'pan'
        ? `<circle cx="-.6" cy=".4" r="2.4" fill="${P.paper}"/><path d="M1.6 -1.4l2.2-1.8" stroke="${P.bamboo}" stroke-width="1.5" stroke-linecap="round"/>`
        : `<path d="M-3 -1h6v2.4c0 1.4-1 2.2-2.2 2.2h-1.6C-2 3.6-3 2.8-3 1.4Z" fill="${P.paper}"/><path d="M-3.8 -1h7.6" stroke="${P.paper}" stroke-width="1.2" stroke-linecap="round"/>`;
  return `<g transform="translate(19.2 19.2)"><circle r="4.6" fill="${INK}"/>${glyph}</g>`;
}

/** Illustrated ingredient icon with its prep state, e.g. chopped lettuce or pan-cooked meat. */
export function foodIcon(kind: IngredientKind, state: FoodState, vessel: VesselKind | null, label: string): string {
  const cooked = state === 'cooked';
  const body = (state === 'chopped' ? choppedBody(kind) : null) ?? foodBody(kind, cooked);
  const mark = cooked && vessel ? badge(vessel) : '';
  return `<svg class="lw-food" viewBox="0 0 24 24" role="img" aria-label="${label}">${body}${mark}</svg>`;
}

/** A single flame for the Heat meter. Lit flames get a hot core; unlit ones are a soft outline. */
export const FLAME = `<svg viewBox="0 0 20 26" aria-hidden="true"><path class="lw-flame-outer" d="M10 1.5c1 4.2 6.8 7.2 6.8 13.4A6.8 6.8 0 0 1 3.2 15c0-3.4 1.8-5 3.2-6.8.4 2 1.4 3 2.4 3.4C8 8.4 8.6 4.6 10 1.5Z"/><path class="lw-flame-inner" d="M10 11.2c.8 2 3.4 3.2 3.4 6.2a3.4 3.4 0 0 1-6.8 0c0-1.6.8-2.6 1.6-3.4.3 1 .8 1.4 1.3 1.6-.3-1.8 0-3.2.5-4.4Z"/></svg>`;

/** Small round paper lantern (rounds won, logo, menus). */
export function lanternIcon(cls = 'lw-mini-lantern'): string {
  return `<svg class="${cls}" viewBox="0 0 20 28" aria-hidden="true"><path d="M10 0v3" stroke="${P.bambooDark}" stroke-width="1.4"/><rect x="6" y="3" width="8" height="3" rx="1" fill="${P.bambooDark}"/><ellipse class="lw-lantern-body" cx="10" cy="14" rx="8" ry="8.4"/><path d="M10 5.8c-3.6 2.4-3.6 14 0 16.4M10 5.8c3.6 2.4 3.6 14 0 16.4M2.4 11.4h15.2M2.4 16.6h15.2" class="lw-lantern-rib" fill="none" stroke-width=".9"/><rect x="6" y="22" width="8" height="2.6" rx="1" fill="${P.bambooDark}"/><path d="M10 24.6v3" stroke="${P.danger}" stroke-width="1.6" stroke-linecap="round"/></svg>`;
}

/** Crew mark: Jade = scallop (rounded awning), Ember = zig-zag (pointed awning). */
export function crewMark(team: TeamId, cls = 'lw-crew-mark'): string {
  const t = TEAMS[team];
  const shape =
    team === 0
      ? `<path d="M2 8a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0V5H2Z" fill="${t.main}" stroke="${t.dark}" stroke-width="1.2"/><path d="M2 5h18" stroke="${t.dark}" stroke-width="1.6"/>`
      : `<path d="M2 5v3l3 4 3-4 3 4 3-4 3 4 3-4V5Z" fill="${t.main}" stroke="${t.dark}" stroke-width="1.2" stroke-linejoin="round"/><path d="M2 5h18" stroke="${t.dark}" stroke-width="1.6"/>`;
  return `<svg class="${cls}" viewBox="0 0 22 14" aria-hidden="true">${shape}</svg>`;
}

/** The big lantern the round clock lives in. Body colour and glow are set from CSS. */
export const CLOCK_LANTERN = `<svg class="lw-clock-svg" viewBox="0 0 120 132" aria-hidden="true">
<path d="M60 0v10" stroke="${P.bambooDark}" stroke-width="3"/>
<rect x="38" y="8" width="44" height="12" rx="4" fill="${P.bambooDark}"/><rect x="38" y="8" width="44" height="4" rx="2" fill="${P.bamboo}"/>
<ellipse class="lw-clock-body" cx="60" cy="66" rx="58" ry="48"/>
<path class="lw-clock-ribs" d="M60 18c-30 10-30 86 0 96M60 18c30 10 30 86 0 96M60 18c-58 14-58 82 0 96M60 18c58 14 58 82 0 96" fill="none" stroke-width="1.6"/>
<rect x="38" y="110" width="44" height="12" rx="4" fill="${P.bambooDark}"/><rect x="38" y="110" width="44" height="4" rx="2" fill="${P.bamboo}"/>
<path d="M60 122v8" stroke="${P.danger}" stroke-width="4" stroke-linecap="round"/>
</svg>`;

/** Padlock for the Critic's one-crew window. Drawn in currentColor so the crew colour comes from CSS. */
export const LOCK = `<svg viewBox="0 0 16 18" aria-hidden="true"><path d="M4.5 8V5.5a3.5 3.5 0 0 1 7 0V8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><rect x="2" y="7.5" width="12" height="9.5" rx="2.2" fill="currentColor"/><circle cx="8" cy="11.6" r="1.5" fill="${P.ink}"/><path d="M8 12.4v2" stroke="${P.ink}" stroke-width="1.4" stroke-linecap="round"/></svg>`;
