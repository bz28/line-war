import { describe, expect, it } from 'vitest';
import {
  charmDueTick,
  charmSpawnTiles,
  createMatch,
  makeConfig,
  NO_INPUT,
  step,
  tileIndex,
  type ArenaDef,
  type CharmItem,
  type CharmVariantDef,
  type MatchInputs,
  type MatchState,
  type PlayerId,
  type PlayerInput,
} from '../../src';
import { IDLE, TEST_ARENA, TEST_INGREDIENTS } from '../fixtures';
import { ofType, RULE_RECIPES, stepN, stepToRoundTick, type ConfigOverrides } from './helpers';

const CHARMS: CharmVariantDef[] = [
  { id: 'lantern', name: 'Lantern Bunny', weight: 3, rare: false },
  { id: 'moon', name: 'Moon Bunny', weight: 1, rare: true },
];

/** TEST_ARENA: market is column 4; its floor tiles are (4,1) and (4,2). (4,3) is the steak crate. */
const MID_TOP = 1 * 9 + 4;
const MID_ROW = 2 * 9 + 4;
const BOARD0 = 1 * 9 + 2; // team 0 board at (2,1)
const CRATE = 3 * 9 + 4;

/** Short rounds so the single charm is due quickly: prep 1 s, round 60 s, one charm. */
const FAST: ConfigOverrides = { prepSeconds: 1, roundSeconds: 60, tuning: { charmsPerRound: 1 } };

function newCharmMatch(overrides: ConfigOverrides = FAST, charms: CharmVariantDef[] = CHARMS, arena: ArenaDef = TEST_ARENA): MatchState {
  const config = makeConfig({ ...FAST, ...overrides, tuning: { ...FAST.tuning, ...overrides.tuning } });
  return createMatch({ arena, recipes: RULE_RECIPES, ingredients: TEST_INGREDIENTS, charms, config });
}

const charm = (state: MatchState, variant = 'lantern'): CharmItem => ({ id: state.nextId++, type: 'charm', variant, floorSinceTick: null });

/** Put a resting charm on the floor at a position. */
function dropCharm(state: MatchState, pos: { x: number; y: number }, variant = 'lantern'): CharmItem {
  const item = charm(state, variant);
  state.floorItems.push({ item, pos, vel: { x: 0, y: 0 }, thrownBy: null, thrownAtTick: null, travelled: 0 });
  return item;
}

function inputs(p: PlayerId, input: Partial<PlayerInput>): MatchInputs {
  const out = [NO_INPUT, NO_INPUT, NO_INPUT, NO_INPUT] as MatchInputs;
  out[p] = { ...NO_INPUT, ...input };
  return out;
}

/** Move everyone out of the way (kitchen corners), so they don't bank, catch or block by accident. */
function park(state: MatchState): void {
  state.players[0].pos = { x: 1.5, y: 2.5 };
  state.players[1].pos = { x: 2.5, y: 2.5 };
  state.players[2].pos = { x: 7.5, y: 2.5 };
  state.players[3].pos = { x: 6.5, y: 2.5 };
}

/** Advance to service (past prep) with the charm schedule pushed out of the way. */
function inService(overrides: ConfigOverrides = {}): MatchState {
  const s = newCharmMatch({ ...FAST, ...overrides, tuning: { charmsPerRound: 0, ...overrides.tuning } });
  stepToRoundTick(s, 31);
  park(s);
  return s;
}

describe('charm spawning (RULES §10)', () => {
  it('spawns charmsPerRound charms at the due ticks, never in prep or last call, on the middle column', () => {
    const s = newCharmMatch({ ...FAST, tuning: { charmsPerRound: 3 } });
    const due = [0, 1, 2].map((k) => charmDueTick(s, k));
    // prepEnd 30, lastCallStart 1500: spread evenly.
    expect(due).toEqual([30 + 367, 30 + 735, 30 + 1102]);
    const seen: { tick: number; phase: string; tile: number; variant: string }[] = [];
    while (s.round.phase !== 'roundOver') {
      step(s, IDLE);
      for (const ev of ofType(s.events, 'charmSpawned')) seen.push({ tick: s.round.tick, phase: s.round.phase, tile: ev.tile, variant: ev.variant });
    }
    expect(seen.map((x) => x.tick)).toEqual(due);
    for (const x of seen) {
      expect(['service', 'rush']).toContain(x.phase);
      expect([MID_TOP, MID_ROW]).toContain(x.tile);
      expect(CHARMS.map((c) => c.id)).toContain(x.variant);
    }
  });

  it('puts a resting charm at the tile centre with the event payload matching the item', () => {
    const s = newCharmMatch();
    park(s);
    const events = stepToRoundTick(s, charmDueTick(s, 0));
    const [ev] = ofType(events, 'charmSpawned');
    expect(ev).toBeDefined();
    const fi = s.floorItems.find((f) => f.item.id === ev!.itemId)!;
    expect(fi.item).toMatchObject({ type: 'charm', variant: ev!.variant });
    expect(fi.vel).toEqual({ x: 0, y: 0 });
    expect(fi.thrownBy).toBeNull();
    const x = ev!.tile % 9;
    const y = Math.floor(ev!.tile / 9);
    expect(fi.pos).toEqual({ x: x + 0.5, y: y + 0.5 });
  });

  it('skips tiles holding a floor item or a player centre; waits (retrying each tick) when none is free', () => {
    const s = newCharmMatch();
    park(s);
    stepToRoundTick(s, charmDueTick(s, 0) - 1);
    s.players[0].pos = { x: 4.5, y: 1.5 }; // on MID_TOP
    dropCharm(s, { x: 4.2, y: 2.7 }); // on MID_ROW (a different, earlier charm)
    expect(charmSpawnTiles(s)).toEqual([]);
    const blocked = stepN(s, 10);
    expect(ofType(blocked, 'charmSpawned')).toHaveLength(0);
    s.players[0].pos = { x: 1.5, y: 2.5 };
    const after = stepN(s, 1);
    expect(ofType(after, 'charmSpawned').map((e) => e.tile)).toEqual([MID_TOP]);
  });

  it('drops a charm still due when Last Call starts', () => {
    const s = newCharmMatch();
    park(s);
    stepToRoundTick(s, charmDueTick(s, 0) - 1);
    s.players[0].pos = { x: 4.5, y: 1.5 };
    s.players[2].pos = { x: 4.5, y: 2.5 };
    // Hold both tiles until the round ends: nothing spawns, ever.
    const events: ReturnType<typeof stepN> = [];
    while (s.round.phase !== 'roundOver') {
      s.players[0].pos = { x: 4.5, y: 1.5 };
      s.players[2].pos = { x: 4.5, y: 2.5 };
      events.push(...stepN(s, 1));
    }
    expect(ofType(events, 'charmSpawned')).toHaveLength(0);
    expect(s.charmsSpawned).toBe(1);
  });

  it('uses both middle columns when the market is an even number of columns wide', () => {
    const wide: ArenaDef = {
      ...TEST_ARENA,
      rows: ['##########', '#lK#..#Kl#', '#........#', '#XP#SS#PX#', '##########'],
      zones: { kitchen0: [0, 2], market: [4, 5], kitchen1: [7, 9] },
      spawns: [
        { x: 1.5, y: 2.5 },
        { x: 2.5, y: 2.5 },
        { x: 8.5, y: 2.5 },
        { x: 7.5, y: 2.5 },
      ],
    };
    const s = newCharmMatch(FAST, CHARMS, wide);
    park(s);
    s.players[2].pos = { x: 8.5, y: 2.5 };
    s.players[3].pos = { x: 7.5, y: 2.5 };
    expect(charmSpawnTiles(s)).toEqual([tileIndex(s.arena, 4, 1), tileIndex(s.arena, 5, 1), tileIndex(s.arena, 4, 2), tileIndex(s.arena, 5, 2)]);
  });

  it('picks variants by weight (the rare one is rarer)', () => {
    const counts = new Map<string, number>();
    for (let seed = 1; seed <= 200; seed++) {
      const s = newCharmMatch({ ...FAST, seed });
      park(s);
      for (const ev of ofType(stepToRoundTick(s, charmDueTick(s, 0)), 'charmSpawned')) counts.set(ev.variant, (counts.get(ev.variant) ?? 0) + 1);
    }
    expect((counts.get('lantern') ?? 0) + (counts.get('moon') ?? 0)).toBe(200);
    expect(counts.get('moon') ?? 0).toBeGreaterThan(20);
    expect(counts.get('moon') ?? 0).toBeLessThan(counts.get('lantern') ?? 0);
  });

  it('does nothing (no spawn, no rng) when disabled or when the level has no variants', () => {
    for (const s of [newCharmMatch({ ...FAST, charmsEnabled: false }), newCharmMatch(FAST, [])]) {
      const plain = createMatch({ arena: TEST_ARENA, recipes: RULE_RECIPES, ingredients: TEST_INGREDIENTS, config: s.config });
      const events = stepN(s, 2000);
      stepN(plain, 2000);
      expect(ofType(events, 'charmSpawned')).toHaveLength(0);
      expect(s.rngState).toBe(plain.rngState);
      expect(JSON.stringify({ ...s, charmVariants: [] })).toBe(JSON.stringify(plain));
    }
  });
});

describe('carrying charms (RULES §10)', () => {
  it('is picked up with Grab and fills the hands', () => {
    const s = inService();
    const item = dropCharm(s, { x: 4.5, y: 1.4 });
    const p = s.players[0];
    p.pos = { x: 4.5, y: 2.3 };
    p.facing = { x: 0, y: -1 };
    step(s, inputs(0, { grab: true }));
    expect(p.holding?.id).toBe(item.id);
    expect(ofType(s.events, 'grab')).toEqual([{ type: 'grab', player: 0, itemId: item.id }]);
    // Hands full: Grab facing the crate does nothing (no steak, the charm stays in hand).
    p.facing = { x: 0, y: 1 };
    p.pos = { x: 4.5, y: 2.5 };
    step(s, inputs(0, { grab: true }));
    expect(p.holding?.id).toBe(item.id);
    expect(s.stations[String(CRATE)]!.stock).toBeGreaterThan(0);
  });

  it('never goes on a station: board, stove and pass all refuse it', () => {
    const s = inService();
    const p = s.players[0];
    const item = charm(s);
    // Board (2,1) from (2,2) facing up; pan stove (2,3) facing down; pass (1,3) facing down from (1,2).
    for (const [pos, facing] of [
      [{ x: 2.5, y: 2.5 }, { x: 0, y: -1 }],
      [{ x: 2.5, y: 2.5 }, { x: 0, y: 1 }],
      [{ x: 1.5, y: 2.5 }, { x: 0, y: 1 }],
    ] as const) {
      // Grab is handled before banking (end of tick), so the press really tries the station first.
      p.holding = item;
      p.pos = { ...pos };
      p.facing = { ...facing };
      step(s, inputs(0, { grab: true }));
      expect(s.stations[String(BOARD0)]!.item).toBeNull();
      expect(ofType(s.events, 'drop')).toHaveLength(0);
      // It was banked at the end of the tick (standing in our kitchen), not placed anywhere.
      expect(ofType(s.events, 'charmBanked')).toHaveLength(1);
    }
  });

  it('drops onto the floor when facing floor', () => {
    const s = inService();
    const p = s.players[0];
    const item = charm(s);
    p.holding = item;
    p.pos = { x: 4.5, y: 2.5 };
    p.facing = { x: 0, y: -1 };
    step(s, inputs(0, { grab: true }));
    expect(p.holding).toBeNull();
    const fi = s.floorItems.find((f) => f.item.id === item.id);
    expect(fi?.vel).toEqual({ x: 0, y: 0 });
  });

  it('a thrown charm flies over a free board (stops in front of it) and can be caught by a rival', () => {
    const s = inService();
    // Thrown up from (2,2) at board (2,1): it stops on the floor instead of landing on the board.
    const p1 = s.players[1];
    p1.pos = { x: 2.5, y: 2.5 };
    p1.facing = { x: 0, y: -1 };
    const a = charm(s);
    p1.holding = a;
    step(s, inputs(1, { throw: true }));
    stepN(s, 10);
    expect(s.stations[String(BOARD0)]!.item).toBeNull();
    const fa = s.floorItems.find((f) => f.item.id === a.id);
    expect(fa?.vel).toEqual({ x: 0, y: 0 });
    expect(Math.floor(fa!.pos.y)).toBe(2);

    // Thrown along the corridor by player 0 from the market: rival player 2 in the path catches it.
    s.floorItems = [];
    const p0 = s.players[0];
    p0.pos = { x: 4.5, y: 2.5 };
    p0.facing = { x: 1, y: 0 };
    const b = charm(s);
    p0.holding = b;
    const p2 = s.players[2];
    p2.pos = { x: 5.6, y: 2.5 };
    step(s, inputs(0, { throw: true }));
    stepN(s, 5);
    // Caught at the doorway (not her kitchen yet), so she is still holding it.
    expect(p2.holding?.id).toBe(b.id);
  });

  it('is knocked loose by a dash in the market', () => {
    const s = inService();
    const victim = s.players[2];
    const item = charm(s);
    victim.holding = item;
    victim.pos = { x: 4.5, y: 2.5 };
    const by = s.players[0];
    by.pos = { x: 3.4, y: 2.5 };
    by.facing = { x: 1, y: 0 };
    step(s, inputs(0, { dash: true }));
    stepN(s, 4);
    expect(victim.holding).toBeNull();
    expect(s.floorItems.some((f) => f.item.id === item.id && f.vel.x === 0 && f.vel.y === 0)).toBe(true);
    expect(victim.dazedTicks).toBeGreaterThan(0);
  });
});

describe('banking (RULES §10)', () => {
  it('banks on entering your own kitchen: points, +1 Heat, event; not in the doorway or market', () => {
    const s = inService({ tuning: { charmPoints: 50, charmHeatTiers: 1 } });
    const p = s.players[2];
    const item = charm(s, 'moon');
    p.holding = item;
    p.pos = { x: 5.5, y: 2.5 }; // doorway (zone none)
    stepN(s, 1);
    expect(p.holding?.id).toBe(item.id);
    p.pos = { x: 6.5, y: 2.5 }; // kitchen1
    const events = stepN(s, 1);
    expect(p.holding).toBeNull();
    expect(ofType(events, 'charmBanked')).toEqual([{ type: 'charmBanked', team: 1, player: 2, itemId: item.id, variant: 'moon' }]);
    expect(s.teams[1].score).toBe(50);
    expect(s.teams[1].heat).toBe(1);
    expect(s.teams[1].cleanStreak).toBe(s.config.tuning.heatThresholds[0]);
    expect(ofType(events, 'heatChange')).toEqual([{ type: 'heatChange', team: 1, heat: 1 }]);
    expect(s.teams[0].score).toBe(0);
  });

  it('keeps a streak already past the threshold and caps Heat at the top tier', () => {
    const s = inService();
    const t = s.teams[0];
    t.heat = 1;
    t.cleanStreak = 3; // thresholds [2, 4, 7]
    const p = s.players[0];
    p.holding = charm(s);
    stepN(s, 1);
    expect(t.heat).toBe(2);
    expect(t.cleanStreak).toBe(4);
    t.heat = 3;
    t.cleanStreak = 9;
    p.holding = charm(s);
    const events = stepN(s, 1);
    expect(t.heat).toBe(3);
    expect(t.cleanStreak).toBe(9);
    expect(ofType(events, 'heatChange')).toHaveLength(0);
    expect(ofType(events, 'charmBanked')).toHaveLength(1);
  });
});

describe('fading and round end (RULES §10)', () => {
  it('a charm resting on the floor fades after charmLifetimeSeconds; held or flying it does not', () => {
    const s = inService({ tuning: { charmLifetimeSeconds: 2 } });
    const life = 2 * 30;
    const item = dropCharm(s, { x: 4.5, y: 1.4 });
    stepN(s, life - 10);
    // Pick it up just before it fades and hold it a long time in the market.
    const p = s.players[0];
    p.pos = { x: 4.5, y: 2.3 };
    p.facing = { x: 0, y: -1 };
    step(s, inputs(0, { grab: true }));
    expect(p.holding?.id).toBe(item.id);
    expect(ofType(stepN(s, life * 2), 'charmFaded')).toHaveLength(0);
    expect(item.floorSinceTick).toBeNull();
    // Drop it: the clock restarts from the drop.
    step(s, inputs(0, { grab: true }));
    expect(p.holding).toBeNull();
    const events = stepN(s, life);
    expect(ofType(events, 'charmFaded')).toEqual([{ type: 'charmFaded', itemId: item.id, variant: 'lantern' }]);
    expect(s.floorItems.some((f) => f.item.id === item.id)).toBe(false);
    // The fade came exactly charmLifetimeSeconds after it came to rest.
    let n = 0;
    const s2 = inService({ tuning: { charmLifetimeSeconds: 2 } });
    dropCharm(s2, { x: 4.5, y: 1.4 });
    while (!ofType(stepN(s2, 1), 'charmFaded').length) n++;
    expect(n).toBe(life); // rest starts on the first tick it is seen resting
  });

  it('removes every charm (held and on the floor) when the round ends, without events', () => {
    const s = inService({ bestOf: 3, tuning: { charmLifetimeSeconds: 999 } });
    dropCharm(s, { x: 4.5, y: 1.4 });
    s.players[2].holding = charm(s);
    s.players[2].pos = { x: 4.5, y: 2.5 };
    const events: ReturnType<typeof stepN> = [];
    while (s.round.phase !== 'roundOver') {
      s.players[2].pos = { x: 4.5, y: 2.5 };
      events.push(...stepN(s, 1));
    }
    expect(s.players[2].holding).toBeNull();
    expect(s.floorItems.some((f) => f.item.type === 'charm')).toBe(false);
    expect(ofType(events, 'charmFaded')).toHaveLength(0);
  });

  it('resets the per-round charm count for the next round', () => {
    const s = newCharmMatch({ ...FAST, bestOf: 3 });
    park(s);
    while (s.round.index === 0) stepN(s, 1);
    expect(s.charmsSpawned).toBe(0);
    park(s);
    const events = stepToRoundTick(s, charmDueTick(s, 0));
    expect(ofType(events, 'charmSpawned')).toHaveLength(1);
  });
});

describe('charm determinism', () => {
  /** Scripted inputs that walk players through the market, grabbing, dashing and throwing. */
  const scripted = (tick: number): MatchInputs =>
    [0, 1, 2, 3].map((i) => {
      const phase = (tick + i * 37) % 120;
      const dir = i < 2 ? 1 : -1;
      return {
        move: { x: phase < 60 ? dir : -dir, y: ((tick >> 4) + i) % 3 === 0 ? 0.5 : -0.3 },
        grab: phase % 17 === 0,
        work: false,
        dash: phase % 41 === 0,
        throw: phase % 53 === 0,
      };
    }) as MatchInputs;

  it('same seed + inputs => identical state JSON, with charms spawning, moving and banking', () => {
    const run = (): { json: string; events: string[] } => {
      const s = newCharmMatch({ prepSeconds: 1, roundSeconds: 60, bestOf: 1, seed: 42, tuning: { charmsPerRound: 4, charmLifetimeSeconds: 3 } });
      const events: string[] = [];
      for (let t = 0; t < 60 * 30 + 10; t++) {
        step(s, scripted(t));
        for (const ev of s.events) if (ev.type.startsWith('charm')) events.push(JSON.stringify(ev));
      }
      return { json: JSON.stringify(s), events };
    };
    const a = run();
    const b = run();
    expect(a.events.length).toBeGreaterThanOrEqual(4);
    expect(a.events).toEqual(b.events);
    expect(a.json).toBe(b.json);
    // Survives a JSON round trip mid-match.
    const s = newCharmMatch({ prepSeconds: 1, roundSeconds: 60, bestOf: 1, seed: 42, tuning: { charmsPerRound: 4, charmLifetimeSeconds: 3 } });
    for (let t = 0; t < 900; t++) step(s, scripted(t));
    const copy = JSON.parse(JSON.stringify(s)) as MatchState;
    for (let t = 900; t < 1500; t++) {
      step(s, scripted(t));
      step(copy, scripted(t));
    }
    expect(JSON.stringify(copy)).toBe(JSON.stringify(s));
  });
});
