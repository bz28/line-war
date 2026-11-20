import { LEVELS, type LevelDef } from '@line-war/content';
import type { ArenaDef, TileKind } from '@line-war/sim';
import { PALETTE, TEAMS } from '../art/tokens';
import { h } from './dom';

/** Fill colour per tile kind for the mini-map; floor is tinted by zone instead. */
const KIND_FILL: Partial<Record<TileKind, string>> = {
  wall: PALETTE.slate,
  crate: PALETTE.lantern,
  pantry: PALETTE.bamboo,
  counter: PALETTE.bambooDark,
  board: PALETTE.bamboo,
  stove: PALETTE.steel,
  sink: '#4F7FA6',
  plates: PALETTE.paper,
  pass: PALETTE.paper,
  trash: PALETTE.ink,
};

function zoneFill(arena: ArenaDef, x: number): string {
  const z = arena.zones;
  if (x >= z.kitchen0[0] && x <= z.kitchen0[1]) return TEAMS[0].dark;
  if (x >= z.kitchen1[0] && x <= z.kitchen1[1]) return TEAMS[1].dark;
  if (x >= z.market[0] && x <= z.market[1]) return '#4A3B2E';
  return PALETTE.nightDeep;
}

/** A small SVG plan of the arena: crew kitchens in their colours, the market in warm wood, crates as lanterns. */
export function levelThumb(arena: ArenaDef): string {
  const rects: string[] = [];
  arena.rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const kind = arena.legend[ch]?.kind ?? 'wall';
      const fill = kind === 'floor' ? zoneFill(arena, x) : (KIND_FILL[kind] ?? PALETTE.slate);
      const r = kind === 'crate' ? ' rx="0.35"' : '';
      rects.push(`<rect x="${x}" y="${y}" width="1" height="1"${r} fill="${fill}"/>`);
    });
  });
  const w = arena.rows[0]!.length;
  const hgt = arena.rows.length;
  return `<svg viewBox="0 0 ${w} ${hgt}" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">${rects.join('')}</svg>`;
}

/** Row of level cards. The chosen one is pressed; choosing another calls `onPick`. */
export function levelPicker(current: string, onPick: (id: string) => void, levels: readonly LevelDef[] = LEVELS): HTMLElement {
  return h(
    'div',
    { class: 'lw-levels', role: 'group', 'aria-label': 'Level' },
    levels.map((l) => {
      const chosen = l.id === current;
      const thumb = h('span', { class: 'lw-level-thumb', 'aria-hidden': 'true' });
      thumb.innerHTML = levelThumb(l.arena);
      return h(
        'button',
        {
          type: 'button',
          class: `lw-level${chosen ? ' lw-level-on' : ''}`,
          'aria-pressed': chosen ? 'true' : 'false',
          'data-key': `level-${l.id}`,
          title: l.blurb,
          onclick: () => onPick(l.id),
        },
        thumb,
        h('span', { class: 'lw-level-name' }, l.name),
      );
    }),
  );
}
