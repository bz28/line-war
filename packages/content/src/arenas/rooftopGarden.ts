import type { ArenaDef } from '@line-war/sim';
import { BASE_LEGEND } from './legend';

/**
 * Rooftop Garden. The produce war: lettuce and tomatoes grow only in the shared garden, so most dishes need a raid. Two doors per kitchen, so watch your flank.
 * Two tomato beds, one either side of a centre planter, split the garden's busiest crate.
 * Must stay left-right mirrored. Kitchens are columns 1-7 and 17-23, the market 9-15.
 */
export const ROOFTOP_GARDEN: ArenaDef = {
  id: 'rooftop-garden',
  name: 'Rooftop Garden',
  rows: [
    '#########################',
    '#XXCCC.C#.......#C.CCCXX#',
    '#...........L...........#',
    '#K.....................K#',
    '#K.CC..C#.#...#.#C..CC.K#',
    '#C.....W#.......#W.....C#',
    '#b.....D#.#T#T#.#D.....b#',
    '#m.CC..C#.......#C..CC.m#',
    '#s.....C#.#...#.#C.....s#',
    '#f.....................f#',
    '#...........L...........#',
    '#PPUURCC#.......#CCRUUPP#',
    '#########################',
  ],
  legend: { ...BASE_LEGEND,
    L: { kind: 'crate', ingredient: 'lettuce' },
    T: { kind: 'crate', ingredient: 'tomato' },
    s: { kind: 'pantry', ingredient: 'steak' },
    f: { kind: 'pantry', ingredient: 'fish' } },
  zones: { kitchen0: [0, 7], market: [9, 15], kitchen1: [17, 24] },
  spawns: [
    { x: 3.5, y: 9.5 },
    { x: 5.5, y: 9.5 },
    { x: 21.5, y: 9.5 },
    { x: 19.5, y: 9.5 },
  ],
};
