import type { CharmVariantDef } from '@line-war/sim';

/**
 * Charm variants per level (RULES §10): little figurines of the LINE WAR mascot, a round
 * paper-lantern bunny, dressed for each level. Ids are stable (the client's collection screen keys
 * on them): never rename one, only add. Each level has one rare variant with a low weight.
 */
export const LEVEL_CHARMS: Record<string, CharmVariantDef[]> = {
  'night-market': [
    { id: 'night-lantern', name: 'Lantern Bunny', weight: 6, rare: false },
    { id: 'night-noodle', name: 'Noodle Bunny', weight: 6, rare: false },
    { id: 'night-moon', name: 'Moon Bunny', weight: 1, rare: true },
  ],
  'harbor-pier': [
    { id: 'harbor-sailor', name: 'Sailor Bunny', weight: 6, rare: false },
    { id: 'harbor-fish', name: 'Fish Bunny', weight: 6, rare: false },
    { id: 'harbor-lighthouse', name: 'Lighthouse Bunny', weight: 1, rare: true },
  ],
  'rooftop-garden': [
    { id: 'rooftop-sprout', name: 'Sprout Bunny', weight: 6, rare: false },
    { id: 'rooftop-tomato', name: 'Tomato Bunny', weight: 6, rare: false },
    { id: 'rooftop-watering-can', name: 'Watering Can Bunny', weight: 1, rare: true },
  ],
};

/** Every charm variant of every level, with the level it belongs to (collection screen order). */
export const ALL_CHARMS: (CharmVariantDef & { level: string })[] = Object.entries(LEVEL_CHARMS).flatMap(([level, list]) =>
  list.map((c) => ({ ...c, level })),
);

/** Look up a charm variant (any level) by its stable id. */
export function charmById(id: string): (CharmVariantDef & { level: string }) | undefined {
  return ALL_CHARMS.find((c) => c.id === id);
}
