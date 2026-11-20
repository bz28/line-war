/**
 * LINE WAR art tokens — "Lantern Night Market". Single source of truth for colour and type,
 * shared by the canvas world renderer and the DOM HUD/menus (tokens.css mirrors these).
 * See docs/ART.md. Change a value here and in tokens.css together.
 */
import type { TeamId } from '@line-war/sim';

export const PALETTE = {
  night: '#1B1F3A', // backdrop, deep indigo night
  nightDeep: '#12152B', // vignette / deepest shadow
  slate: '#2E3456', // market cobblestone
  slateLight: '#3B4370', // cobblestone highlight
  lantern: '#FFC857', // light, timers, highlights, UI accent
  lanternHot: '#FF9F1C', // urgency (expiring, rush)
  bamboo: '#C98E5A', // counter tops
  bambooDark: '#8A5A3B', // counter fronts / wood shadow
  paper: '#FFF3D6', // order slips, plates
  ink: '#2A2238', // text on paper
  danger: '#E5484D', // burning / fire
  steel: '#8C93A8', // stoves, sinks, metal
} as const;

export interface TeamArt {
  name: string; // shown to players
  main: string;
  light: string;
  dark: string;
}

export const TEAMS: Record<TeamId, TeamArt> = {
  0: { name: 'Jade', main: '#2EC4A6', light: '#8EF0DA', dark: '#167A68' },
  1: { name: 'Ember', main: '#FF6B3D', light: '#FFB199', dark: '#B33A14' },
};

export const FONTS = {
  display: "'Dela Gothic One', system-ui, sans-serif",
  ui: "'M PLUS Rounded 1c', system-ui, sans-serif",
} as const;

/** Light comes from the upper left; shadows fall down-right. */
export const LIGHT = { shadowDx: 0.06, shadowDy: 0.1, shadowAlpha: 0.35 } as const;

/**
 * Canvas-only derived shades for the world renderer (render/**). Each one is a named shade
 * of a PALETTE/TEAMS token, or a food colour the bible's "illustrated food" needs. The DOM never
 * uses these, so tokens.css does not mirror them. Keep them muted so the crews and lantern
 * light stay the loudest colours on screen.
 */
export const WORLD = {
  // Wood (from bamboo / bambooDark).
  woodLight: '#E0AE7C', // bamboo, lit edge of counters and boards
  woodGrain: '#B07A4A', // bamboo, grain lines on counter tops
  plankA: '#5A3D33', // bambooDark toward night: kitchen floor plank
  plankB: '#4E3530', // second plank tone
  plankC: '#634438', // third plank tone
  plankSeam: '#2C1F24', // gaps between planks
  // Stall frames (walls).
  frameTop: '#3A2D42', // bambooDark toward night: wall cap
  frameFace: '#251D31', // wall front face
  frameEdge: '#5A4558', // lit edge of a wall cap
  frameGrain: '#31263A', // plank lines on wall caps
  // Market stone (from slate / slateLight / nightDeep).
  grout: '#1E2240',
  stoneDark: '#283050',
  stoneLit: '#4A5384', // slateLight lifted: stone highlight on the lit side
  puddle: '#5A6AA8',
  // Metal (from steel).
  steelLight: '#C3C8D6',
  steelDark: '#565C73',
  iron: '#2B2C3A', // wok, grates, bin
  water: '#5E86A8',
  // People.
  skin: '#F2C29A',
  skinShade: '#D99A73',
  // Food.
  lettuce: '#8BCB4F',
  lettuceDark: '#4F8A2E',
  lettuceLight: '#C7EB8A',
  tomato: '#E5483B',
  tomatoDark: '#9E2A2A',
  tomatoLight: '#FF8A6B',
  leaf: '#4F9A3A', // stems
  bun: '#E7A04F',
  bunDark: '#B86E2E',
  bunLight: '#F8CB86',
  sesame: '#FFF3D6', // paper
  meatRaw: '#E58C8C',
  meatRawDark: '#B85A63',
  meatCooked: '#7A4630',
  meatCookedDark: '#4F2A1E',
  steakRaw: '#C7354A',
  steakRawDark: '#8E1F33',
  fat: '#FFE1D2',
  fish: '#8FB4D6',
  fishDark: '#55789E',
  fishBelly: '#E3EEF6',
  fishCooked: '#D9A05B',
  char: '#2A2430', // burnt food (ink, a touch lighter so silhouettes read on dark stoves)
  charEdge: '#4A3F4A',
  frost: '#BFE3FF', // cold plate tint
  grime: '#8A7F6A', // dirty plate smears
} as const;
