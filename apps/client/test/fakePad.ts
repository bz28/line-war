/** Minimal fake of a Gamepad API object (standard mapping, 17 buttons, 4 axes). */
export function fakePad(
  opts: { pressed?: number[]; values?: Record<number, number>; axes?: [number, number]; connected?: boolean; id?: string } = {},
): Gamepad {
  const buttons = Array.from({ length: 17 }, (_, i) => {
    const pressed = opts.pressed?.includes(i) ?? false;
    const value = opts.values?.[i] ?? (pressed ? 1 : 0);
    return { pressed, touched: pressed || value > 0, value };
  });
  return {
    id: opts.id ?? 'Fake pad',
    index: 0,
    connected: opts.connected ?? true,
    mapping: 'standard',
    timestamp: 0,
    axes: [...(opts.axes ?? [0, 0]), 0, 0],
    buttons,
    vibrationActuator: null,
  } as unknown as Gamepad;
}
