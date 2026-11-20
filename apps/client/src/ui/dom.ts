/** Tiny DOM builder so menus stay declarative without a UI library. */

type Attrs = Record<string, string | number | boolean | undefined | EventListener>;
export type Child = Node | string | null | undefined | false;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  ...children: (Child | Child[])[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = String(v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, String(v));
  }
  for (const c of children.flat()) if (c !== null && c !== undefined && c !== false) el.append(c);
  return el;
}

export function button(label: string, onClick: () => void, attrs: Attrs = {}): HTMLButtonElement {
  return h('button', { type: 'button', ...attrs, onclick: () => onClick() }, label);
}

/** A <select> over a fixed list of options. */
export function select<T extends string>(
  options: readonly { value: T; label: string; disabled?: boolean }[],
  value: T,
  onChange: (v: T) => void,
  attrs: Attrs = {},
): HTMLSelectElement {
  const el = h(
    'select',
    attrs,
    options.map((o) => h('option', { value: o.value, disabled: o.disabled }, o.label)),
  );
  el.value = value;
  el.addEventListener('change', () => onChange(el.value as T));
  return el;
}

/** A labelled on/off switch (checkbox). */
export function toggle(label: string, value: boolean, onChange: (v: boolean) => void, name?: string): HTMLLabelElement {
  const input = h('input', { type: 'checkbox', name });
  input.checked = value;
  input.addEventListener('change', () => onChange(input.checked));
  return h('label', { class: 'lw-row lw-toggle' }, h('span', {}, label), input);
}

/** A labelled range slider with a live value readout. */
export function slider(
  label: string,
  value: number,
  range: { min: number; max: number; step: number },
  format: (v: number) => string,
  onChange: (v: number) => void,
  name?: string,
): HTMLLabelElement {
  const out = h('output', {}, format(value));
  const input = h('input', { type: 'range', name, min: range.min, max: range.max, step: range.step });
  input.value = String(value);
  input.addEventListener('input', () => {
    out.textContent = format(Number(input.value));
    onChange(Number(input.value));
  });
  return h('label', { class: 'lw-row lw-slider' }, h('span', {}, label), input, out);
}
