/** Offscreen canvases: cached sprites and pre-rendered static layers. */

export type Ctx = CanvasRenderingContext2D;

/** Minimal canvas surface the renderer needs (an HTMLCanvasElement satisfies it; tests pass a fake). */
export interface CanvasLike {
  width: number;
  height: number;
  style?: Partial<Pick<CSSStyleDeclaration, 'width' | 'height' | 'position' | 'left' | 'top' | 'display'>>;
  parentElement?: (HTMLElement | ParentLike) | null;
  getContext(id: '2d'): CanvasRenderingContext2D | null;
}

/** The bits of a parent element the renderer reads (tests pass a fake). */
export interface ParentLike {
  clientWidth: number;
  clientHeight: number;
}

/** Makes an offscreen canvas, or null when the platform has none (tests, workers without canvas). */
export type CanvasFactory = (width: number, height: number) => CanvasLike | null;

export function defaultCanvasFactory(): CanvasFactory | null {
  if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
    return (w, h) => {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      try {
        return c.getContext('2d') ? c : null;
      } catch {
        return null; // jsdom without a canvas backend
      }
    };
  }
  return null;
}

/** An offscreen layer: its canvas plus where it sits, in logical px. */
export interface Layer {
  canvas: CanvasLike;
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Paint `paint` (in logical px, origin at x,y of the layer) into a new offscreen canvas at `scale`
 * device px per logical px. Returns null when no offscreen canvas is available.
 */
export function bakeLayer(
  factory: CanvasFactory | null,
  scale: number,
  x: number,
  y: number,
  w: number,
  h: number,
  paint: (ctx: Ctx) => void,
): Layer | null {
  if (!factory) return null;
  const pw = Math.max(1, Math.ceil(w * scale));
  const ph = Math.max(1, Math.ceil(h * scale));
  const canvas = factory(pw, ph);
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) return null;
  ctx.setTransform(scale, 0, 0, scale, -x * scale, -y * scale);
  paint(ctx);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  return { canvas, x, y, w: pw / scale, h: ph / scale };
}

export function drawLayer(ctx: Ctx, layer: Layer): void {
  ctx.drawImage(layer.canvas as CanvasImageSource, layer.x, layer.y, layer.w, layer.h);
}

const MAX_SPRITES = 500;

/**
 * Small pre-rendered sprites keyed by a string. A sprite is painted once (centred on 0,0 in logical
 * px, inside a square of half-size `half`) and then blitted. Without an offscreen canvas it paints
 * straight onto the target every time, so behaviour is identical in tests.
 */
export class SpriteCache {
  private map = new Map<string, Layer | null>();
  private scale = 1;

  constructor(private factory: CanvasFactory | null) {}

  setScale(scale: number): void {
    if (scale === this.scale) return;
    this.scale = scale;
    this.map.clear();
  }

  get size(): number {
    return this.map.size;
  }

  draw(ctx: Ctx, key: string, half: number, x: number, y: number, paint: (ctx: Ctx) => void): void {
    let sprite = this.map.get(key);
    if (sprite === undefined) {
      if (this.map.size >= MAX_SPRITES) this.map.clear();
      sprite = bakeLayer(this.factory, this.scale, -half, -half, half * 2, half * 2, paint);
      this.map.set(key, sprite);
    }
    if (sprite === null) {
      ctx.save();
      ctx.translate(x, y);
      paint(ctx);
      ctx.restore();
      return;
    }
    ctx.drawImage(sprite.canvas as CanvasImageSource, x - half, y - half, sprite.w, sprite.h);
  }
}
