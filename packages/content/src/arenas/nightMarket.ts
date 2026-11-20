import type { ArenaDef } from '@line-war/sim';

/**
 * Arena 1: Night Market. Two mirrored kitchens (columns 1-7 and 17-23) joined to a central
 * market (columns 9-15) through 3-tile doorways at column 8 and 16 (rows 5-7).
 * Design doc: "Arena 1: Night Market" floor plan. Must stay left-right mirrored.
 *
 * Legend: # wall . floor C counter K chopping board P pan stove U pot stove
 *         W sink D plate rack X pass R trash  l t b m pantries  S F market crates
 */
export const NIGHT_MARKET: ArenaDef = {
  id: 'night-market',
  name: 'Night Market',
  rows: [
    '#########################',
    '#ltbmCXX#.......#XXCmbtl#',
    '#.......#.......#.......#',
    '#C.KK..C#.......#C..KK.C#',
    '#C......#...S...#......C#',
    '#C.....................C#',
    '#D.CC...............CC.D#',
    '#W.....................W#',
    '#C.....C#...F...#C.....C#',
    '#C......#.......#......C#',
    '#R......#.......#......R#',
    '#PPUUCCC#.......#CCCUUPP#',
    '#########################',
  ],
  legend: {
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
  },
  zones: { kitchen0: [0, 7], market: [9, 15], kitchen1: [17, 24] },
  spawns: [
    { x: 3.5, y: 9.5 },
    { x: 5.5, y: 9.5 },
    { x: 21.5, y: 9.5 },
    { x: 19.5, y: 9.5 },
  ],
};
