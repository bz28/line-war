/** Layout math for the world renderer. All values are in LOGICAL pixels (before viewport scaling). */

export const TILE = 48;

/** Room around the arena, in tiles: the back wall and awnings rise above row 0; shadows fall below. */
export const MARGIN = { top: 1.15, right: 0.4, bottom: 0.45, left: 0.4 } as const;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Layout {
  tile: number;
  /** Logical size of the whole diorama (arena + margins). */
  width: number;
  height: number;
  /** Where tile (0,0) starts, and the arena's size. */
  world: Rect;
}

export function computeLayout(arenaWidth: number, arenaHeight: number, tile = TILE): Layout {
  const world = { x: MARGIN.left * tile, y: MARGIN.top * tile, w: arenaWidth * tile, h: arenaHeight * tile };
  return {
    tile,
    width: world.w + (MARGIN.left + MARGIN.right) * tile,
    height: world.h + (MARGIN.top + MARGIN.bottom) * tile,
    world,
  };
}

export interface Viewport {
  /** CSS size of the canvas element (= the box it fills). */
  cssWidth: number;
  cssHeight: number;
  /** Backing-store size of the canvas (css * devicePixelRatio). */
  pixelWidth: number;
  pixelHeight: number;
  /** Backing-store pixels per logical pixel. */
  scale: number;
  /** Backing-store offset of the logical origin, centring the diorama in the box. */
  offsetX: number;
  offsetY: number;
}

/**
 * The canvas fills a (boxW x boxH) CSS box; the logical diorama is scaled to fit inside it with its
 * aspect ratio kept and centred (letterboxed by the night backdrop).
 */
export function fitToBox(logicalW: number, logicalH: number, boxW: number, boxH: number, dpr = 1): Viewport {
  const cssWidth = Math.max(1, Math.floor(boxW));
  const cssHeight = Math.max(1, Math.floor(boxH));
  const ratio = dpr > 0 && Number.isFinite(dpr) ? dpr : 1;
  const pixelWidth = Math.round(cssWidth * ratio);
  const pixelHeight = Math.round(cssHeight * ratio);
  const scale = Math.min(pixelWidth / logicalW, pixelHeight / logicalH);
  return {
    cssWidth,
    cssHeight,
    pixelWidth,
    pixelHeight,
    scale,
    offsetX: Math.round((pixelWidth - logicalW * scale) / 2),
    offsetY: Math.round((pixelHeight - logicalH * scale) / 2),
  };
}

/** Logical rect of tile index `i` inside the world area. */
export function tileRect(layout: Layout, arenaWidth: number, i: number): Rect {
  const t = layout.tile;
  return { x: layout.world.x + (i % arenaWidth) * t, y: layout.world.y + Math.floor(i / arenaWidth) * t, w: t, h: t };
}

/** World position (in tiles) -> logical pixel. */
export function worldToScreen(layout: Layout, pos: { x: number; y: number }): { x: number; y: number } {
  return { x: layout.world.x + pos.x * layout.tile, y: layout.world.y + pos.y * layout.tile };
}
