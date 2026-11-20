/** Delivery and interactions must agree on which tile a player faces (one shared helper). */
import { describe, expect, it } from 'vitest';
import { tileOwner } from '../../src';
import { interactTarget } from '../../src/systems/kitchen/world';
import { facesOwnPass } from '../../src/systems/tickets';
import { kitchenMatch, put } from './helpers';

describe('interaction target', () => {
  it('facesOwnPass uses the same target tile as interactTarget for any pose', () => {
    const s = kitchenMatch();
    let checked = 0;
    let passes = 0;
    for (let x = 1.2; x < 8; x += 0.23) {
      for (let y = 2.2; y < 5; y += 0.19) {
        for (let a = 0; a < 16; a++) {
          const facing = { x: Math.cos((a * Math.PI) / 8), y: Math.sin((a * Math.PI) / 8) };
          const p = put(s, 0, x, y, facing);
          const { tile } = interactTarget(s, p);
          const expected = tile !== null && s.arena.tiles[tile]?.kind === 'pass' && tileOwner(s, tile) === 0;
          expect(facesOwnPass(s, 0)).toBe(expected);
          checked++;
          if (expected) passes++;
        }
      }
    }
    expect(checked).toBeGreaterThan(1000);
    expect(passes).toBeGreaterThan(0);
  });
});
