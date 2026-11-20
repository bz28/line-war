import { describe, expect, it } from 'vitest';
import type { SimEvent } from '@line-war/sim';
import {
  addUnlocks,
  CHARM_IDS,
  COLLECTION_KEY,
  emptyCollection,
  humanTeams,
  loadCollection,
  sanitizeCollection,
  saveCollection,
  setDisplay,
  unlocksFromEvents,
} from '../src/collection/store';
import type { StorageLike } from '../src/settings/store';
import { DEFAULT_SETTINGS, P1_KEYS, type Settings } from '../src/settings/types';

class MemoryStorage implements StorageLike {
  data = new Map<string, string>();
  getItem(k: string) {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.data.set(k, v);
  }
}
const throwing: StorageLike = {
  getItem: () => {
    throw new Error('SecurityError');
  },
  setItem: () => {
    throw new Error('QuotaExceededError');
  },
};

const bank = (team: 0 | 1, variant: string): SimEvent => ({ type: 'charmBanked', team, player: team === 0 ? 0 : 2, itemId: 1, variant });
const bot = { kind: 'bot', difficulty: 'normal' } as const;
const kb = { kind: 'keyboard', bindings: P1_KEYS } as const;
const slots = (...s: Settings['slots'][number][]): Settings['slots'] => s as unknown as Settings['slots'];

describe('charm collection store', () => {
  it('knows all 9 charms, in shelf order', () => {
    expect(CHARM_IDS).toHaveLength(9);
    expect(CHARM_IDS.slice(0, 3)).toEqual(['night-lantern', 'night-noodle', 'night-moon']);
  });

  it('sanitizes junk: unknown ids, duplicates, non-strings, wrong order, and a display that is not unlocked', () => {
    const c = sanitizeCollection({ version: 1, unlocked: ['rooftop-tomato', 'nope', 7, 'night-lantern', 'night-lantern', null], display: 'night-moon' });
    expect(c).toEqual({ version: 1, unlocked: ['night-lantern', 'rooftop-tomato'], display: null });
    expect(sanitizeCollection({ unlocked: ['night-moon'], display: 'night-moon' }).display).toBe('night-moon');
    for (const raw of [null, 42, 'x', [], { unlocked: 'night-moon' }, { version: 2, unlocked: ['night-moon'] }]) {
      expect(sanitizeCollection(raw)).toEqual(emptyCollection());
    }
  });

  it('loads and saves without ever throwing; corrupt or missing data is an empty collection', () => {
    const st = new MemoryStorage();
    expect(loadCollection(st)).toEqual(emptyCollection());
    st.setItem(COLLECTION_KEY, '{not json');
    expect(loadCollection(st)).toEqual(emptyCollection());
    const c = setDisplay(addUnlocks(emptyCollection(), ['harbor-fish', 'night-moon']).collection, 'night-moon');
    expect(saveCollection(c, st)).toBe(true);
    expect(loadCollection(st)).toEqual({ version: 1, unlocked: ['night-moon', 'harbor-fish'], display: 'night-moon' });
    expect(loadCollection(throwing)).toEqual(emptyCollection());
    expect(saveCollection(c, throwing)).toBe(false);
    expect(loadCollection(null)).toEqual(emptyCollection());
    expect(saveCollection(c, null)).toBe(false);
  });

  it('reports only first-time unlocks, once each', () => {
    const a = addUnlocks(emptyCollection(), ['night-moon', 'night-moon', 'bogus']);
    expect(a.fresh).toEqual(['night-moon']);
    const b = addUnlocks(a.collection, ['night-moon', 'harbor-sailor']);
    expect(b.fresh).toEqual(['harbor-sailor']);
    expect(b.collection.unlocked).toEqual(['night-moon', 'harbor-sailor']);
    expect(addUnlocks(b.collection, ['night-moon']).collection).toBe(b.collection);
  });

  it('only hangs unlocked charms on the sign; null takes it down', () => {
    const c = addUnlocks(emptyCollection(), ['night-noodle']).collection;
    expect(setDisplay(c, 'night-moon').display).toBeNull();
    expect(setDisplay(c, 'night-noodle').display).toBe('night-noodle');
    expect(setDisplay(setDisplay(c, 'night-noodle'), null).display).toBeNull();
  });
});

describe('charm unlock rules', () => {
  it('finds the crews with a local human', () => {
    expect([...humanTeams(DEFAULT_SETTINGS.slots)]).toEqual([0]);
    expect([...humanTeams(slots(bot, bot, bot, bot))]).toEqual([]);
    expect([...humanTeams(slots(bot, bot, { kind: 'gamepad', index: 0 }, bot))]).toEqual([1]);
    expect([...humanTeams(slots(kb, bot, { kind: 'gamepad', index: 0 }, bot))].sort()).toEqual([0, 1]);
  });

  it('a bank by a crew with a human unlocks; a bots-only crew unlocks nothing', () => {
    const humans = humanTeams(DEFAULT_SETTINGS.slots); // P1 human on Jade, the rest bots
    expect(unlocksFromEvents([bank(0, 'night-moon')], humans)).toEqual(['night-moon']);
    expect(unlocksFromEvents([bank(1, 'night-lantern')], humans)).toEqual([]);
    expect(unlocksFromEvents([{ type: 'charmSpawned', itemId: 1, tile: 3, variant: 'night-moon' }], humans)).toEqual([]);
  });

  it('a bots-only match unlocks nothing at all', () => {
    const humans = humanTeams(slots(bot, bot, bot, bot));
    expect(unlocksFromEvents([bank(0, 'night-moon'), bank(1, 'harbor-fish')], humans)).toEqual([]);
  });

  it('with humans on both crews, either crew unlocks', () => {
    const humans = humanTeams(slots(kb, bot, { kind: 'gamepad', index: 1 }, bot));
    expect(unlocksFromEvents([bank(0, 'night-moon'), bank(1, 'harbor-fish')], humans)).toEqual(['night-moon', 'harbor-fish']);
  });
});
