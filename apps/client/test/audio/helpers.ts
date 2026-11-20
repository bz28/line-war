import { INGREDIENTS, NIGHT_MARKET, RECIPES } from '@line-war/content';
import { createMatch, makeConfig, vesselTimeline, type MatchState, type StationState, type VesselKind } from '@line-war/sim';

export function match(): MatchState {
  return createMatch({ arena: NIGHT_MARKET, recipes: RECIPES, ingredients: INGREDIENTS, config: makeConfig({ seed: 1 }) });
}

/** First station whose tile is of `kind` (and, for stoves, holds `vessel`), optionally on the left or right half. */
export function station(s: MatchState, kind: string, opts: { vessel?: VesselKind; side?: 'left' | 'right' } = {}): StationState {
  const st = Object.values(s.stations).find((x) => {
    const t = s.arena.tiles[x.tile]!;
    if (t.kind !== kind) return false;
    if (opts.vessel && x.vessel?.kind !== opts.vessel) return false;
    const col = x.tile % s.arena.width;
    if (opts.side === 'left' && col >= s.arena.width / 2) return false;
    if (opts.side === 'right' && col < s.arena.width / 2) return false;
    return true;
  });
  if (!st) throw new Error(`no ${kind} station`);
  return st;
}

/** Put food in a vessel and set it `ticksBefore` ticks before it burns (status done). */
export function nearlyBurnt(s: MatchState, st: StationState, ticksBefore: number): void {
  const v = st.vessel!;
  const tl = vesselTimeline(s, v.kind);
  v.contents = [{ kind: v.kind === 'pan' ? 'meat' : 'tomato', state: v.kind === 'pan' ? 'raw' : 'chopped' }];
  v.status = 'done';
  v.cookTicks = tl.burnt - ticksBefore;
}
