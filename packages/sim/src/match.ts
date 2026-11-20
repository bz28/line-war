import { secondsToTicks } from './tuning';
import type {
  ArenaDef,
  ArenaRuntime,
  IngredientDef,
  IngredientKind,
  MatchConfig,
  MatchState,
  PlayerId,
  PlayerState,
  RecipeDef,
  StationState,
  TeamId,
  TeamState,
  TileDef,
  Zone,
} from './types';
import { teamOf } from './types';

/** Flatten an authored ArenaDef into the runtime grid. Throws on malformed input. */
export function buildArena(def: ArenaDef): ArenaRuntime {
  const height = def.rows.length;
  const width = def.rows[0]?.length ?? 0;
  if (height === 0 || width === 0) throw new Error(`arena ${def.id}: empty`);
  const tiles: TileDef[] = [];
  const zones: Zone[] = [];
  const owners: (TeamId | null)[] = [];
  def.rows.forEach((row, y) => {
    if (row.length !== width) throw new Error(`arena ${def.id}: row ${y} has length ${row.length}, expected ${width}`);
    for (let x = 0; x < width; x++) {
      const ch = row[x]!;
      const tile = def.legend[ch];
      if (!tile) throw new Error(`arena ${def.id}: unknown legend char '${ch}' at ${x},${y}`);
      tiles.push(tile);
      const zone: Zone =
        x >= def.zones.kitchen0[0] && x <= def.zones.kitchen0[1]
          ? 'kitchen0'
          : x >= def.zones.kitchen1[0] && x <= def.zones.kitchen1[1]
            ? 'kitchen1'
            : x >= def.zones.market[0] && x <= def.zones.market[1]
              ? 'market'
              : 'none';
      zones.push(zone);
      owners.push(zone === 'kitchen0' ? 0 : zone === 'kitchen1' ? 1 : null);
    }
  });
  return { id: def.id, name: def.name, width, height, tiles, zones, owners, spawns: def.spawns };
}

export interface CreateMatchOptions {
  arena: ArenaDef;
  recipes: RecipeDef[];
  ingredients: Record<IngredientKind, IngredientDef>;
  config: MatchConfig;
}

const freshTeam = (): TeamState => ({ score: 0, roundsWon: 0, heat: 0, cleanStreak: 0 });

/** Stations for every interactive tile, at full stock. */
export function createStations(arena: ArenaRuntime, config: MatchConfig): Record<string, StationState> {
  const stations: Record<string, StationState> = {};
  arena.tiles.forEach((t, i) => {
    if (t.kind === 'floor' || t.kind === 'wall') return;
    stations[String(i)] = {
      tile: i,
      item: null,
      workTicks: 0,
      vessel: t.kind === 'stove' ? { kind: t.vessel ?? 'pan', contents: [], cookTicks: 0, status: 'empty' } : null,
      stock: t.kind === 'crate' ? config.tuning.marketExtraStock : t.kind === 'plates' ? config.tuning.platesPerTeam : 0,
      dirtyPlates: 0,
    };
  });
  return stations;
}

/** Players at their spawns for the given round (swapped = teams trade kitchens). */
export function spawnPlayers(arena: ArenaRuntime, swapped: boolean): MatchState['players'] {
  const make = (id: PlayerId): PlayerState => {
    // When swapped, team 0 uses team 1's spawns and vice versa.
    const spawnIdx = swapped ? ((id + 2) % 4) : id;
    const s = arena.spawns[spawnIdx]!;
    return {
      id,
      team: teamOf(id),
      pos: { x: s.x, y: s.y },
      facing: { x: 0, y: -1 },
      vel: { x: 0, y: 0 },
      holding: null,
      dashCooldown: 0,
      dashTicks: 0,
      knockImmuneTicks: 0,
      dazedTicks: 0,
      working: false,
    };
  };
  return [make(0), make(1), make(2), make(3)];
}

export function createMatch(opts: CreateMatchOptions): MatchState {
  const arena = buildArena(opts.arena);
  const { config } = opts;
  return {
    tick: 0,
    config,
    arena,
    recipes: opts.recipes,
    ingredients: opts.ingredients,
    players: spawnPlayers(arena, false),
    stations: createStations(arena, config),
    floorItems: [],
    fires: [],
    tickets: [],
    nextTicketTick: secondsToTicks(config, config.prepSeconds),
    dirtyPlateReturns: [],
    teams: [freshTeam(), freshTeam()],
    round: {
      index: 0,
      phase: 'prep',
      tick: 0,
      intermissionTicks: 0,
      criticSpawned: false,
      swapped: false,
    },
    rngState: config.seed | 0,
    nextId: 1,
    events: [],
    winner: null,
  };
}

/** Allocate a unique id for an item or ticket. */
export function newId(state: MatchState): number {
  return state.nextId++;
}

/** True while players can act (not between rounds or after the match). */
export function isPlaying(state: MatchState): boolean {
  const p = state.round.phase;
  return p === 'prep' || p === 'service' || p === 'rush' || p === 'lastCall';
}
