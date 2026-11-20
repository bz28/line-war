import { describe, expect, it } from 'vitest';
import { tileIndex } from '@line-war/sim';
import { buildDemoState } from '../../src/render/demo';
import { EffectQueue, effectAge, eventsToEffects, findItemPos, passCenter, shakeOffset } from '../../src/render/effects';

describe('eventsToEffects', () => {
  it('maps the showcased events to effects without mutating state', () => {
    const s = buildDemoState();
    const before = JSON.stringify(s);
    const fx = eventsToEffects(s, s.events, 1000);
    expect(JSON.stringify(s)).toBe(before);
    const kinds = fx.map((e) => e.kind);
    expect(kinds).toContain('flash'); // knock
    expect(kinds).toContain('ring'); // chop / cook done
    expect(kinds).toContain('shake'); // serve refused
    expect(kinds).toContain('ticketFlash');
    expect(kinds).toContain('heatFlash');
    const plus = fx.find((e) => e.kind === 'popup' && e.text === '+72');
    expect(plus?.pos).toEqual(passCenter(s, 0));
    expect(fx.every((e) => e.start === 1000 && e.duration > 0)).toBe(true);
  });

  it('places plateCold popups on the item and skips unknown items', () => {
    const s = buildDemoState();
    const cold = s.stations[String(tileIndex(s.arena, 7, 3))]!.item!;
    expect(eventsToEffects(s, [{ type: 'plateCold', itemId: cold.id }], 0)[0]?.pos).toEqual({ x: 7.5, y: 3.5 });
    expect(eventsToEffects(s, [{ type: 'plateCold', itemId: 123456 }], 0)).toEqual([]);
  });
});

describe('helpers', () => {
  it('passCenter finds each team pass on its own side', () => {
    const s = buildDemoState();
    expect(passCenter(s, 0)!.x).toBeLessThan(s.arena.width / 2);
    expect(passCenter(s, 1)!.x).toBeGreaterThan(s.arena.width / 2);
    s.round.swapped = true;
    expect(passCenter(s, 0)!.x).toBeGreaterThan(s.arena.width / 2);
  });

  it('findItemPos looks in hands, stations and the floor', () => {
    const s = buildDemoState();
    expect(findItemPos(s, s.players[1].holding!.id)).toEqual(s.players[1].pos);
    expect(findItemPos(s, s.floorItems[0]!.item.id)).toEqual(s.floorItems[0]!.pos);
  });

  it('EffectQueue expires effects and effectAge is clamped', () => {
    const q = new EffectQueue();
    q.push([{ kind: 'ring', start: 0, duration: 100, color: '#fff' }]);
    expect(q.active(50)).toHaveLength(1);
    expect(effectAge(q.active(50)[0]!, 50)).toBe(0.5);
    expect(effectAge({ kind: 'ring', start: 0, duration: 100, color: '' }, 500)).toBe(1);
    expect(q.active(150)).toHaveLength(0);
  });

  it('shake decays to zero', () => {
    expect(shakeOffset(1)).toBeCloseTo(0);
    expect(Math.abs(shakeOffset(0.05))).toBeGreaterThan(0);
  });
});
