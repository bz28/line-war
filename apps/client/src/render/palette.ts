import type { FoodState, IngredientKind, Item, TeamId, TileDef, TileKind } from '@line-war/sim';

/** Colour, shape and label mapping. Pure data/functions so they can be unit-tested. */

export const BG = '#101217';
export const INK = '#f2efe9';
export const MUTED = '#8b909c';
export const PANEL = '#1b1e26';
export const PANEL_EDGE = '#2c313c';

export const TEAM_COLORS: Record<TeamId, string> = { 0: '#4ea1ff', 1: '#ff6b5e' };
export const TEAM_DARK: Record<TeamId, string> = { 0: '#1d3a5c', 1: '#5c231e' };
export const TEAM_NAMES: Record<TeamId, string> = { 0: 'CREW A', 1: 'CREW B' };

export const KITCHEN_FLOOR = '#2a2d35';
export const MARKET_FLOOR = '#3a3326';
export const MARKET_FLOOR_ALT = '#332d22';
export const DOOR_FLOOR = '#4a4434';
export const WALL = '#23262e';

export const TILE_COLORS: Record<TileKind, string> = {
  floor: KITCHEN_FLOOR,
  wall: WALL,
  counter: '#5b5f6b',
  pantry: '#3f5e3b',
  crate: '#8a5f2a',
  board: '#9a8158',
  stove: '#4b4f58',
  sink: '#35607e',
  plates: '#8d93a0',
  pass: '#b8962a',
  trash: '#2f2f2f',
};

export type Shape = 'circle' | 'hexagon' | 'dome' | 'square' | 'diamond' | 'triangle';

export interface IngredientStyle {
  color: string;
  shape: Shape;
  /** One-letter label drawn on larger icons (extra cue for colour-blind players). */
  letter: string;
}

/** Every ingredient has a unique colour AND a unique shape AND a unique letter. */
export const INGREDIENT_STYLE: Record<IngredientKind, IngredientStyle> = {
  lettuce: { color: '#5cc75c', shape: 'hexagon', letter: 'L' },
  tomato: { color: '#e5483b', shape: 'circle', letter: 'T' },
  bun: { color: '#e0b06a', shape: 'dome', letter: 'B' },
  meat: { color: '#c46a6a', shape: 'square', letter: 'M' },
  steak: { color: '#9b2f45', shape: 'diamond', letter: 'S' },
  fish: { color: '#7fc4e8', shape: 'triangle', letter: 'F' },
};

export const BURNT_COLOR = '#111111';
export const COOKED_OUTLINE = '#3a1f0e';

export interface FoodLook {
  fill: string;
  shape: Shape;
  letter: string;
  /** Size multiplier relative to a raw item. */
  scale: number;
  /** Outline colour and width (in px at scale 1). */
  outline: string;
  outlineWidth: number;
  /** Draw slice lines across the icon. */
  sliced: boolean;
}

/** How a piece of food looks in a given state. */
export function foodLook(kind: IngredientKind, state: FoodState): FoodLook {
  const base = INGREDIENT_STYLE[kind];
  switch (state) {
    case 'raw':
      return { fill: base.color, shape: base.shape, letter: base.letter, scale: 1, outline: '#00000066', outlineWidth: 1, sliced: false };
    case 'chopped':
      return { fill: base.color, shape: base.shape, letter: base.letter, scale: 0.75, outline: '#ffffffaa', outlineWidth: 1, sliced: true };
    case 'cooked':
      return { fill: darken(base.color, 0.25), shape: base.shape, letter: base.letter, scale: 1, outline: COOKED_OUTLINE, outlineWidth: 3, sliced: false };
    case 'burnt':
      return { fill: BURNT_COLOR, shape: base.shape, letter: base.letter, scale: 1, outline: '#555555', outlineWidth: 2, sliced: false };
  }
}

export const PLATE_CLEAN = '#eeeeee';
export const PLATE_COLD = '#9cc4ff';
export const PLATE_DIRTY = '#7a7a72';

export function plateColor(item: Extract<Item, { type: 'plate' }>): string {
  if (item.dirty) return PLATE_DIRTY;
  if (item.cold) return PLATE_COLD;
  return PLATE_CLEAN;
}

/** 1-2 letter label for a station (shown in a corner of the tile). */
export function stationLabel(def: TileDef): string {
  switch (def.kind) {
    case 'pantry':
    case 'crate':
      return def.ingredient ? INGREDIENT_STYLE[def.ingredient].letter : '?';
    case 'stove':
      return def.vessel === 'pot' ? 'PT' : 'PN';
    case 'board':
      return 'CH';
    case 'sink':
      return 'SK';
    case 'plates':
      return 'PL';
    case 'pass':
      return 'SV';
    case 'trash':
      return 'TR';
    case 'counter':
    case 'floor':
    case 'wall':
      return '';
  }
}

/** Darken a #rrggbb colour by `amount` (0..1). */
export function darken(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1, 7), 16);
  const f = Math.max(0, Math.min(1, 1 - amount));
  const r = Math.round(((n >> 16) & 255) * f);
  const g = Math.round(((n >> 8) & 255) * f);
  const b = Math.round((n & 255) * f);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

/** #rrggbb + alpha (0..1) -> rgba() string. */
export function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1, 7), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, alpha))})`;
}
