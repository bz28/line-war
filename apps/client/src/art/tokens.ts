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
