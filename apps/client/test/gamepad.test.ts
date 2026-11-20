import { describe, expect, it } from 'vitest';
import { applyDeadZone, GamepadInput, listGamepads, PAD, type GetGamepads } from '../src/input/gamepad';
import { fakePad } from './fakePad';

/** A pad slot whose state the test sets frame by frame. */
function rig(index = 0) {
  const pads: (Gamepad | null)[] = [null, null, null, null];
  const get: GetGamepads = () => pads;
  return { pads, input: new GamepadInput(index, get), set: (p: Gamepad | null) => (pads[index] = p) };
}

describe('GamepadInput', () => {
  it('maps the standard buttons to actions', () => {
    const r = rig();
    r.set(fakePad({ pressed: [PAD.A, PAD.X, PAD.B, PAD.Y] }));
    expect(r.input.poll()).toEqual({ move: { x: 0, y: 0 }, grab: true, work: true, dash: true, throw: true });
  });

  it('edge-triggers grab, dash and throw but holds work', () => {
    const r = rig();
    r.set(fakePad({ pressed: [PAD.A, PAD.B, PAD.Y, PAD.X] }));
    r.input.poll();
    expect(r.input.poll()).toMatchObject({ grab: false, dash: false, throw: false, work: true });
    r.set(fakePad());
    r.input.poll();
    r.set(fakePad({ pressed: [PAD.A] }));
    expect(r.input.poll().grab).toBe(true);
  });

  it('treats analog buttons past half travel as pressed', () => {
    const r = rig();
    r.set(fakePad({ values: { [PAD.A]: 0.8 } }));
    expect(r.input.poll().grab).toBe(true);
  });

  it('moves with the left stick outside the dead zone', () => {
    const r = rig();
    r.set(fakePad({ axes: [0.1, -0.2] }));
    expect(r.input.poll().move).toEqual({ x: 0, y: 0 });
    r.set(fakePad({ axes: [1, 0] }));
    expect(r.input.poll().move).toEqual({ x: 1, y: 0 });
    r.set(fakePad({ axes: [0, -0.625] }));
    const m = r.input.poll().move;
    expect(m.x).toBeCloseTo(0);
    expect(m.y).toBeCloseTo(-0.5);
  });

  it('prefers the D-pad over the stick', () => {
    const r = rig();
    r.set(fakePad({ pressed: [PAD.LEFT, PAD.DOWN], axes: [1, -1] }));
    expect(r.input.poll().move).toEqual({ x: -1, y: 1 });
  });

  it('returns neutral input while disconnected and re-arms edges on reconnect', () => {
    const r = rig(2);
    r.set(fakePad({ pressed: [PAD.A] }));
    expect(r.input.poll().grab).toBe(true);
    r.set(null);
    expect(r.input.poll()).toEqual({ move: { x: 0, y: 0 }, grab: false, work: false, dash: false, throw: false });
    r.set(fakePad({ pressed: [PAD.A], connected: false }));
    expect(r.input.poll().grab).toBe(false);
    r.set(fakePad({ pressed: [PAD.A] }));
    expect(r.input.poll().grab).toBe(true);
  });

  it('reads only its own pad index', () => {
    const r = rig(1);
    r.pads[0] = fakePad({ pressed: [PAD.A] });
    expect(r.input.poll().grab).toBe(false);
  });
});

describe('gamepad helpers', () => {
  it('rescales the stick so it still reaches full speed', () => {
    expect(applyDeadZone(0.2, 0)).toEqual({ x: 0, y: 0 });
    const v = applyDeadZone(Math.SQRT1_2, Math.SQRT1_2);
    expect(Math.hypot(v.x, v.y)).toBeCloseTo(1);
  });

  it('lists connected pads only', () => {
    const pads = [fakePad({ id: 'A' }), null, fakePad({ id: 'C', connected: false }), fakePad({ id: 'D' })];
    expect(listGamepads(() => pads)).toEqual([
      { index: 0, id: 'A' },
      { index: 3, id: 'D' },
    ]);
  });
});
