/** A recording stand-in for CanvasRenderingContext2D (no DOM needed). */
export interface Call {
  name: string;
  args: unknown[];
}

export function fakeCanvas() {
  const calls: Call[] = [];
  const props: Record<string, unknown> = {};
  const ctx = new Proxy(props, {
    get(target, key: string) {
      if (key in target) return target[key];
      if (key === 'measureText') return (t: string) => ({ width: t.length * 7 });
      return (...args: unknown[]) => {
        calls.push({ name: key, args });
      };
    },
    set(target, key: string, value) {
      target[key] = value;
      calls.push({ name: `set:${key}`, args: [value] });
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  const canvas = {
    width: 0,
    height: 0,
    style: { width: '', height: '' },
    getContext: () => ctx,
  };
  return { canvas, ctx, calls };
}

/** Calls that received a NaN/Infinity numeric argument (a sign of broken layout math). */
export const badNumbers = (calls: Call[]) =>
  calls.filter((c) => c.args.some((a) => typeof a === 'number' && !Number.isFinite(a)));

export const texts = (calls: Call[]) => calls.filter((c) => c.name === 'fillText').map((c) => String(c.args[0]));
