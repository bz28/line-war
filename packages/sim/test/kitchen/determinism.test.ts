import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { step, vecLength, type MatchInputs, type MatchState, type PlayerInput } from '../../src';
import { food, kitchenMatch, stationXY, tileAtXY } from './helpers';

/** Scripted, pseudo-random inputs from a tiny LCG (independent of the sim's rng). */
function script(ticks: number, seed: number): MatchInputs[] {
  let x = seed >>> 0;
  const rnd = () => ((x = (Math.imul(x, 1664525) + 1013904223) >>> 0) / 2 ** 32);
  const out: MatchInputs[] = [];
  for (let t = 0; t < ticks; t++) {
    const one = (): PlayerInput => ({
      move: { x: Math.round(rnd() * 2 - 1), y: Math.round(rnd() * 2 - 1) },
      grab: rnd() < 0.15,
      work: rnd() < 0.5,
      dash: rnd() < 0.05,
      throw: rnd() < 0.05,
    });
    out.push([one(), one(), one(), one()]);
  }
  return out;
}

function play(inputs: MatchInputs[]): MatchState {
  const s = kitchenMatch({ seed: 99 }, true);
  // Give the systems something to chew on: cooking pan, a dirty plate, a fire, a return.
  Object.assign(stationXY(s, 7, 1).vessel!, { contents: [food('meat', 'raw')], status: 'cooking', cookTicks: 0 });
  stationXY(s, 2, 5).dirtyPlates = 1;
  s.fires.push({ tile: tileAtXY(s, 5, 1), spreadAtTick: 50, extinguishTicks: 0 });
  s.dirtyPlateReturns.push({ team: 0, atTick: 120 });
  for (const ins of inputs) step(s, ins);
  return s;
}

describe('cross-engine determinism', () => {
  it('sim source never uses Math.hypot (not guaranteed bit-identical across engines)', () => {
    const root = fileURLToPath(new URL('../../src', import.meta.url));
    const files = readdirSync(root, { recursive: true, encoding: 'utf8' }).filter((f) => f.endsWith('.ts'));
    expect(files.length).toBeGreaterThan(10);
    const offenders = files.filter((f) => /Math\.hypot\s*\(/.test(readFileSync(join(root, f), 'utf8')));
    expect(offenders).toEqual([]);
  });

  it('vecLength is the plain sqrt formula', () => {
    expect(vecLength(3, 4)).toBe(5);
    expect(vecLength(0.1, 0.2)).toBe(Math.sqrt(0.1 * 0.1 + 0.2 * 0.2));
  });
});

describe('kitchen determinism', () => {
  it('same scripted inputs twice → identical JSON state', () => {
    const inputs = script(600, 7);
    const a = play(inputs);
    const b = play(inputs);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(JSON.parse(JSON.stringify(a))).toEqual(a);
    // Sanity: the script actually exercised the systems.
    expect(a.players.some((p) => p.pos.x !== 2.5 && p.pos.y !== 3.5)).toBe(true);
    expect(a.fires.length + a.floorItems.length).toBeGreaterThan(0);
  });

  it('players never end up inside a solid tile', () => {
    const s = play(script(600, 3));
    for (const p of s.players) {
      const t = s.arena.tiles[tileAtXY(s, Math.floor(p.pos.x), Math.floor(p.pos.y))]!;
      expect(t.kind).toBe('floor');
      const owner = s.arena.owners[tileAtXY(s, Math.floor(p.pos.x), Math.floor(p.pos.y))];
      expect(owner === null || owner === p.team).toBe(true);
    }
  });
});
