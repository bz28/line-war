/** A recording stand-in for CanvasRenderingContext2D (no DOM needed). */
export interface Call {
  name: string;
  args: unknown[];
}

/**
 * Fake 2D context. Records every call and property set. Like a real context, it throws on a
 * negative arc/ellipse radius (IndexSizeError), so broken geometry fails tests.
 */
export function fakeContext(calls: Call[] = []) {
  const props: Record<string, unknown> = {};
  const gradient = () => ({ addColorStop: (..._a: unknown[]) => undefined });
  const ctx = new Proxy(props, {
    get(target, key: string) {
      if (key in target) return target[key];
      if (key === 'measureText') return (t: string) => ({ width: t.length * 7 });
      if (key === 'createLinearGradient' || key === 'createRadialGradient') {
        return (...args: unknown[]) => {
          calls.push({ name: key, args });
          return gradient();
        };
      }
      return (...args: unknown[]) => {
        if (key === 'arc' && typeof args[2] === 'number' && args[2] < 0) throw new Error('IndexSizeError: negative arc radius');
        if (key === 'ellipse' && ((args[2] as number) < 0 || (args[3] as number) < 0)) throw new Error('IndexSizeError: negative ellipse radius');
        calls.push({ name: key, args });
      };
    },
    set(target, key: string, value) {
      target[key] = value;
      calls.push({ name: `set:${key}`, args: [value] });
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, calls };
}

export interface FakeParent {
  clientWidth: number;
  clientHeight: number;
  style: { position: string };
}

export function fakeCanvas(parent: FakeParent | null = null) {
  const { ctx, calls } = fakeContext();
  const canvas = {
    width: 0,
    height: 0,
    style: { width: '', height: '', position: '', left: '', top: '', display: '' },
    parentElement: parent,
    getContext: () => ctx,
  };
  return { canvas, ctx, calls };
}

/** An offscreen-canvas factory backed by fake contexts; counts how many canvases were made. */
export function fakeFactory() {
  const made: { width: number; height: number; calls: Call[] }[] = [];
  const factory = (width: number, height: number) => {
    const { ctx, calls } = fakeContext();
    const c = { width, height, getContext: () => ctx };
    made.push({ width, height, calls });
    return c;
  };
  return { factory, made };
}

/** Calls that received a NaN/Infinity numeric argument (a sign of broken layout math). */
export const badNumbers = (calls: Call[]) =>
  calls.filter((c) => c.args.some((a) => typeof a === 'number' && !Number.isFinite(a)));

export const texts = (calls: Call[]) => calls.filter((c) => c.name === 'fillText').map((c) => String(c.args[0]));
