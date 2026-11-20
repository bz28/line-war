/** Layout math for the greybox renderer. All values are in LOGICAL pixels (before viewport scaling). */

export const TILE = 48;
export const TOP_BAR = 64;
export const TICKET_BAR = 108;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Layout {
  tile: number;
  width: number;
  height: number;
  topBar: Rect;
  ticketBar: Rect;
  /** Where tile (0,0) starts. */
  world: Rect;
}

export function computeLayout(arenaWidth: number, arenaHeight: number, tile = TILE): Layout {
  const width = arenaWidth * tile;
  const worldTop = TOP_BAR + TICKET_BAR;
  return {
    tile,
    width,
    height: worldTop + arenaHeight * tile,
    topBar: { x: 0, y: 0, w: width, h: TOP_BAR },
    ticketBar: { x: 0, y: TOP_BAR, w: width, h: TICKET_BAR },
    world: { x: 0, y: worldTop, w: width, h: arenaHeight * tile },
  };
}

export interface Viewport {
  /** CSS size of the canvas element. */
  cssWidth: number;
  cssHeight: number;
  /** Backing-store size of the canvas (css * devicePixelRatio). */
  pixelWidth: number;
  pixelHeight: number;
  /** Backing-store pixels per logical pixel. */
  scale: number;
}

/** Largest size that fits (viewW x viewH) while keeping the logical aspect ratio. */
export function fitToViewport(logicalW: number, logicalH: number, viewW: number, viewH: number, dpr = 1): Viewport {
  const safeW = Math.max(1, viewW);
  const safeH = Math.max(1, viewH);
  const cssScale = Math.min(safeW / logicalW, safeH / logicalH);
  const cssWidth = Math.max(1, Math.floor(logicalW * cssScale));
  const cssHeight = Math.max(1, Math.floor(logicalH * cssScale));
  const ratio = dpr > 0 ? dpr : 1;
  return {
    cssWidth,
    cssHeight,
    pixelWidth: Math.round(cssWidth * ratio),
    pixelHeight: Math.round(cssHeight * ratio),
    scale: (cssWidth * ratio) / logicalW,
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

/** Evenly spaced ticket cards across `area`, `slots` wide. Returns the first `count` rects. */
export function ticketSlots(area: Rect, slots: number, count: number, gap = 8): Rect[] {
  const n = Math.max(1, slots);
  const w = (area.w - gap * (n + 1)) / n;
  const out: Rect[] = [];
  for (let i = 0; i < Math.min(count, n); i++) {
    out.push({ x: area.x + gap + i * (w + gap), y: area.y + gap / 2, w, h: area.h - gap });
  }
  return out;
}
