import type { ArenaDef } from '@line-war/sim';

/** Tile legend shared by every arena. Arenas add their own crate/pantry letters on top. */
export const BASE_LEGEND: ArenaDef['legend'] = {
  '#': { kind: 'wall' },
  '.': { kind: 'floor' },
  C: { kind: 'counter' },
  K: { kind: 'board' },
  P: { kind: 'stove', vessel: 'pan' },
  U: { kind: 'stove', vessel: 'pot' },
  W: { kind: 'sink' },
  D: { kind: 'plates' },
  X: { kind: 'pass' },
  R: { kind: 'trash' },
  l: { kind: 'pantry', ingredient: 'lettuce' },
  t: { kind: 'pantry', ingredient: 'tomato' },
  b: { kind: 'pantry', ingredient: 'bun' },
  m: { kind: 'pantry', ingredient: 'meat' },
  S: { kind: 'crate', ingredient: 'steak' },
  F: { kind: 'crate', ingredient: 'fish' },
};
