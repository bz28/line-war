import { ALL_CHARMS } from '@line-war/content';
import { teamOf, type PlayerId, type SimEvent, type TeamId } from '@line-war/sim';
import type { Settings } from '../settings/types';
import { browserStorage, type StorageLike } from '../settings/store';

/**
 * The charm collection (persistent, per browser): which charm variants this machine's players
 * have unlocked, and which one hangs from their crew sign. Stored like settings: versioned,
 * never throws, and any corrupted or partial data is sanitized field by field.
 */

export const COLLECTION_KEY = 'line-war:charms:v1';

export interface Collection {
  version: 1;
  /** Unlocked variant ids, in shelf order (ALL_CHARMS), no duplicates, known ids only. */
  unlocked: string[];
  /** The favourite hung from the crew sign in matches; always an unlocked id, or null. */
  display: string | null;
}

/** Every charm id in shelf order. */
export const CHARM_IDS: readonly string[] = ALL_CHARMS.map((c) => c.id);

export const emptyCollection = (): Collection => ({ version: 1, unlocked: [], display: null });

/** Turn any parsed JSON value into a valid Collection. Unknown ids and bad fields are dropped. */
export function sanitizeCollection(raw: unknown): Collection {
  const o = typeof raw === 'object' && raw !== null && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  if (o.version !== undefined && o.version !== 1) return emptyCollection();
  const list = Array.isArray(o.unlocked) ? o.unlocked : [];
  const have = new Set(list.filter((v): v is string => typeof v === 'string'));
  const unlocked = CHARM_IDS.filter((id) => have.has(id));
  const display = typeof o.display === 'string' && unlocked.includes(o.display) ? o.display : null;
  return { version: 1, unlocked, display };
}

/** Load the collection; never throws. Missing or corrupted data gives an empty collection. */
export function loadCollection(storage: StorageLike | null = browserStorage()): Collection {
  if (!storage) return emptyCollection();
  try {
    const raw = storage.getItem(COLLECTION_KEY);
    return raw === null ? emptyCollection() : sanitizeCollection(JSON.parse(raw));
  } catch {
    return emptyCollection();
  }
}

/** Save; returns false if storage is unavailable or full. Never throws. */
export function saveCollection(c: Collection, storage: StorageLike | null = browserStorage()): boolean {
  if (!storage) return false;
  try {
    storage.setItem(COLLECTION_KEY, JSON.stringify(sanitizeCollection(c)));
    return true;
  } catch {
    return false;
  }
}

/** Add unlocks. Returns the new collection and the ids unlocked for the first time (in order). */
export function addUnlocks(c: Collection, ids: readonly string[]): { collection: Collection; fresh: string[] } {
  const fresh: string[] = [];
  for (const id of ids) if (CHARM_IDS.includes(id) && !c.unlocked.includes(id) && !fresh.includes(id)) fresh.push(id);
  if (!fresh.length) return { collection: c, fresh };
  return { collection: sanitizeCollection({ ...c, unlocked: [...c.unlocked, ...fresh] }), fresh };
}

/** Choose the display charm (null takes it down). Locked or unknown ids are ignored. */
export function setDisplay(c: Collection, id: string | null): Collection {
  if (id !== null && !c.unlocked.includes(id)) return c;
  return { ...c, display: id };
}

/** Crews with at least one player controlled on this machine (keyboard or gamepad). */
export function humanTeams(slots: Settings['slots']): Set<TeamId> {
  const out = new Set<TeamId>();
  slots.forEach((s, i) => {
    if (s.kind === 'keyboard' || s.kind === 'gamepad') out.add(teamOf(i as PlayerId));
  });
  return out;
}

/**
 * The crew whose sign shows the favourite charm: the crew of the first local human in slot
 * order (P1 before P2, P3, P4), the same player the first-match coach follows. The collection
 * is one per browser, so with humans on both crews it hangs once, on that first player's
 * crew, not on both signs. null when nobody on this machine plays.
 */
export function displayTeam(slots: Settings['slots']): TeamId | null {
  const i = slots.findIndex((s) => s.kind === 'keyboard' || s.kind === 'gamepad');
  return i < 0 ? null : teamOf(i as PlayerId);
}

/**
 * Charm variants this tick's events unlock: every charm banked by a crew with a local human.
 * Bots-only crews unlock nothing; when both crews have humans, either crew's bank counts.
 */
export function unlocksFromEvents(events: readonly SimEvent[], humans: ReadonlySet<TeamId>): string[] {
  const out: string[] = [];
  for (const e of events) if (e.type === 'charmBanked' && humans.has(e.team)) out.push(e.variant);
  return out;
}
