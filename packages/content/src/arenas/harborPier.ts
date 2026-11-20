import type { ArenaDef } from '@line-war/sim';
import { BASE_LEGEND } from './legend';

/**
 * Harbor Pier. A pond splits the market. Each kitchen has one narrow door at the top: steak waits between the doors, fish across the water.
 * Must stay left-right mirrored. Kitchens are columns 1-7 and 17-23, the market 9-15.
 */
export const HARBOR_PIER: ArenaDef = {
  id: 'harbor-pier',
  name: 'Harbor Pier',
  rows: [
    '#########################',
    '#XX.KK.C.........C.KK.XX#',
    '#...........S...........#',
    '#C.....C#.......#C.....C#',
    '#l.CC..C#.#####.#C..CC.l#',
    '#t.....W#.#####.#W.....t#',
    '#b.CC..D#.#####.#D..CC.b#',
    '#m.....C#.#####.#C.....m#',
    '#C.....C#.......#C.....C#',
    '#.......#.......#.......#',
    '#.......#...F...#.......#',
    '#PPUU.RC#.......#CR.UUPP#',
    '#########################',
  ],
  legend: { ...BASE_LEGEND },
  zones: { kitchen0: [0, 7], market: [9, 15], kitchen1: [17, 24] },
  spawns: [
    { x: 3.5, y: 9.5 },
    { x: 5.5, y: 9.5 },
    { x: 21.5, y: 9.5 },
    { x: 19.5, y: 9.5 },
  ],
};
