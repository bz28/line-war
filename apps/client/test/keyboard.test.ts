import { describe, expect, it } from 'vitest';
import { KeyboardInput, KeyboardState } from '../src/input/keyboard';
import { P1_KEYS } from '../src/settings/types';

function key(target: EventTarget, type: 'keydown' | 'keyup', code: string) {
  const e = Object.assign(new Event(type, { cancelable: true }), { code });
  target.dispatchEvent(e);
  return e;
}

describe('KeyboardInput', () => {
  it('maps held keys to movement and work', () => {
    const t = new EventTarget();
    const input = new KeyboardInput(new KeyboardState(t), P1_KEYS);
    key(t, 'keydown', 'KeyD');
    key(t, 'keydown', 'KeyW');
    key(t, 'keydown', 'KeyE');
    expect(input.poll()).toEqual({ move: { x: 1, y: -1 }, grab: false, work: true, dash: false, throw: false });
    key(t, 'keydown', 'KeyA');
    expect(input.poll().move.x).toBe(0);
  });

  it('edge-triggers grab, dash and throw', () => {
    const t = new EventTarget();
    const input = new KeyboardInput(new KeyboardState(t), P1_KEYS);
    key(t, 'keydown', 'Space');
    key(t, 'keydown', 'ShiftLeft');
    key(t, 'keydown', 'KeyQ');
    expect(input.poll()).toMatchObject({ grab: true, dash: true, throw: true });
    expect(input.poll()).toMatchObject({ grab: false, dash: false, throw: false });
    key(t, 'keyup', 'Space');
    input.poll();
    key(t, 'keydown', 'Space');
    expect(input.poll().grab).toBe(true);
  });

  it('releases everything on blur', () => {
    const t = new EventTarget();
    const state = new KeyboardState(t);
    key(t, 'keydown', 'KeyW');
    t.dispatchEvent(new Event('blur'));
    expect(state.isDown('KeyW')).toBe(false);
  });

  it('suppresses browser defaults only for captured keys', () => {
    const t = new EventTarget();
    const state = new KeyboardState(t);
    state.setCaptured(['Slash']);
    expect(key(t, 'keydown', 'Slash').defaultPrevented).toBe(true);
    expect(key(t, 'keydown', 'KeyZ').defaultPrevented).toBe(false);
    state.setCaptured([]);
    expect(key(t, 'keydown', 'Slash').defaultPrevented).toBe(false);
  });

  it('stops listening after dispose', () => {
    const t = new EventTarget();
    const state = new KeyboardState(t);
    state.dispose();
    key(t, 'keydown', 'KeyW');
    expect(state.isDown('KeyW')).toBe(false);
  });
});
