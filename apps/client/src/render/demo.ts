import { INGREDIENTS, NIGHT_MARKET, RECIPES } from '@line-war/content';
import { createMatch, makeConfig, newId, secondsToTicks, tileIndex, timerTicks } from '@line-war/sim';
import type { Food, IngredientItem, IngredientKind, FoodState, MatchState, PlateItem, StationState } from '@line-war/sim';

/**
 * A hand-built mid-round Night Market state that exercises every renderer feature:
 * items on counters, pans/pots at each cooking stage, a fire, a full ticket board with a
 * team-exclusive Critic, a dazed player, a dashing player, a thrown item in flight, a cold
 * plate, a dirty plate, a busy sink, and one tick's worth of events for the effects.
 *
 * To view it, in main.ts replace the `createMatch(...)` state with `buildDemoState()` (or
 * render it once with `new GreyboxRenderer(canvas, demo).render(demo, 0)`).
 */
export function buildDemoState(): MatchState {
  const s = createMatch({ arena: NIGHT_MARKET, recipes: RECIPES, ingredients: INGREDIENTS, config: makeConfig({ seed: 7 }) });
  const c = s.config;
  const tu = c.tuning;
  // Round 2, 130 s in: service phase.
  const roundTick = secondsToTicks(c, 130);
  const now = secondsToTicks(c, c.roundSeconds + tu.intermissionSeconds) + roundTick; // after round 1 + intermission
  const at = (x: number, y: number): StationState => {
    const st = s.stations[String(tileIndex(s.arena, x, y))];
    if (!st) throw new Error(`demo: no station at ${x},${y}`);
    return st;
  };
  const ing = (kind: IngredientKind, state: FoodState = 'raw'): IngredientItem => ({ id: newId(s), type: 'ingredient', kind, state });
  const plate = (contents: Food[], opts: Partial<Pick<PlateItem, 'dirty' | 'cold' | 'platedAtTick'>> = {}): PlateItem => ({
    id: newId(s),
    type: 'plate',
    dirty: opts.dirty ?? false,
    contents,
    platedAtTick: opts.platedAtTick ?? (contents.length ? now - secondsToTicks(c, 4) : null),
    cold: opts.cold ?? false,
  });

  s.tick = now;
  s.round = { index: 1, phase: 'service', tick: roundTick, intermissionTicks: 0, criticSpawned: true, swapped: false };
  s.teams = [
    { score: 420, roundsWon: 1, heat: 2, cleanStreak: 5 },
    { score: 365, roundsWon: 0, heat: 1, cleanStreak: 2 },
  ];

  // ---- Crew A kitchen (left) ----
  const panCook = timerTicks(c, tu.panCookSeconds);
  const panBurn = timerTicks(c, tu.panBurnSeconds);
  const potCook = timerTicks(c, tu.potCookSeconds);
  // Pan cooking meat, about half done.
  Object.assign(at(1, 11).vessel!, { contents: [{ kind: 'meat', state: 'raw' }], cookTicks: Math.round(panCook * 0.5), status: 'cooking' });
  // Pan done steak, burn timer running (warning).
  Object.assign(at(2, 11).vessel!, { contents: [{ kind: 'steak', state: 'cooked' }], cookTicks: panCook + Math.round(panBurn * 0.6), status: 'done' });
  // Pot full of chopped tomatoes, cooking.
  Object.assign(at(3, 11).vessel!, {
    contents: [
      { kind: 'tomato', state: 'chopped' },
      { kind: 'tomato', state: 'chopped' },
      { kind: 'tomato', state: 'chopped' },
    ],
    cookTicks: Math.round(potCook * 0.3),
    status: 'cooking',
  });
  // Pot being filled (2/3), not cooking yet.
  Object.assign(at(4, 11).vessel!, {
    contents: [
      { kind: 'tomato', state: 'chopped' },
      { kind: 'tomato', state: 'chopped' },
    ],
    cookTicks: 0,
    status: 'empty',
  });
  // Boards: lettuce mid-chop, chopped tomato.
  at(3, 3).item = ing('lettuce');
  at(3, 3).workTicks = Math.round(timerTicks(c, tu.chopSeconds) * 0.4);
  at(4, 3).item = ing('tomato', 'chopped');
  // Counters: finished burger plate, cold plate, dirty plate, raw bun, burnt meat.
  at(5, 1).item = plate([
    { kind: 'bun', state: 'raw' },
    { kind: 'meat', state: 'cooked' },
  ]);
  at(7, 3).item = plate(
    [
      { kind: 'steak', state: 'cooked' },
      { kind: 'lettuce', state: 'chopped' },
    ],
    { cold: true, platedAtTick: now - secondsToTicks(c, tu.plateColdSeconds + 2) },
  );
  at(1, 3).item = plate([], { dirty: true });
  at(1, 4).item = ing('bun');
  at(1, 5).item = ing('meat', 'burnt');
  at(3, 6).item = ing('fish', 'raw');
  // Sink with dirty plates, being washed; plate rack running low.
  at(1, 7).dirtyPlates = 2;
  at(1, 7).workTicks = Math.round(timerTicks(c, tu.washSeconds) * 0.5);
  at(1, 6).stock = 1;

  // ---- Crew B kitchen (right) ----
  // Pan on fire with burnt fish; neighbour pan burnt; pot done.
  Object.assign(at(23, 11).vessel!, { contents: [{ kind: 'fish', state: 'burnt' }], cookTicks: panCook + panBurn + timerTicks(c, tu.fireAfterBurnSeconds), status: 'fire' });
  Object.assign(at(22, 11).vessel!, { contents: [{ kind: 'meat', state: 'burnt' }], cookTicks: panCook + panBurn + 30, status: 'burnt' });
  Object.assign(at(20, 11).vessel!, {
    contents: [
      { kind: 'tomato', state: 'cooked' },
      { kind: 'tomato', state: 'cooked' },
      { kind: 'tomato', state: 'cooked' },
    ],
    cookTicks: potCook + 20,
    status: 'done',
  });
  s.fires = [{ tile: tileIndex(s.arena, 23, 11), spreadAtTick: now + secondsToTicks(c, 2), extinguishTicks: 12 }];
  at(20, 3).item = plate([{ kind: 'lettuce', state: 'chopped' }]);
  at(21, 3).item = ing('lettuce', 'chopped');
  at(23, 4).item = ing('tomato');
  at(23, 6).stock = 3;

  // ---- Market crates ----
  at(12, 4).stock = 2; // steak
  at(12, 8).stock = 0; // fish (just emptied)

  // ---- Players ----
  const [p1, p2, p3, p4] = s.players;
  // P1 chopping at the board.
  Object.assign(p1, { pos: { x: 3.5, y: 4.4 }, facing: { x: 0, y: -1 }, working: true });
  // P2 carrying a burger plate to the pass; dash recharging.
  Object.assign(p2, {
    pos: { x: 6.5, y: 2.5 },
    facing: { x: 0, y: -1 },
    holding: plate([
      { kind: 'bun', state: 'raw' },
      { kind: 'meat', state: 'cooked' },
    ]),
    dashCooldown: secondsToTicks(c, tu.dashCooldownSeconds * 0.6),
  });
  // P3 (Crew B) just knocked in the market: dazed and immune.
  Object.assign(p3, {
    pos: { x: 11.4, y: 6.3 },
    facing: { x: -1, y: 0 },
    dazedTicks: secondsToTicks(c, tu.dazeSeconds * 0.7),
    knockImmuneTicks: secondsToTicks(c, tu.knockImmuneSeconds * 0.8),
  });
  // P4 (Crew B) mid-dash, carrying the last fish.
  Object.assign(p4, {
    pos: { x: 13.6, y: 5.6 },
    facing: { x: -1, y: 0 },
    dashTicks: 2,
    dashDir: { x: -1, y: 0 },
    dashHit: true,
    dashCooldown: secondsToTicks(c, tu.dashCooldownSeconds),
    holding: ing('fish'),
  });

  // ---- Floor items: knocked steak resting; tomato thrown by P1 in flight ----
  s.floorItems = [
    { item: ing('steak'), pos: { x: 10.2, y: 6.0 }, vel: { x: 0, y: 0 }, thrownBy: null, thrownAtTick: null, travelled: 0 },
    {
      item: ing('tomato', 'chopped'),
      pos: { x: 5.5, y: 6.8 },
      vel: { x: 0, y: -tu.throwSpeed / tu.tickRate },
      thrownBy: 0,
      thrownAtTick: now - 4,
      travelled: 1.6,
    },
  ];

  // ---- Tickets ----
  const life = secondsToTicks(c, tu.ticketLifetimeSeconds);
  const ticket = (recipe: string, ageSeconds: number, critic = false) => {
    const r = RECIPES.find((x) => x.id === recipe)!;
    const spawnTick = now - secondsToTicks(c, ageSeconds);
    return {
      id: newId(s),
      recipe,
      spawnTick,
      expireTick: spawnTick + life,
      baseValue: critic ? r.baseValue * tu.criticMultiplier : r.baseValue,
      isCritic: critic,
      visibleTo: critic ? (1 as const) : null,
      revealAllAtTick: critic ? now + secondsToTicks(c, 2) : null,
    };
  };
  s.tickets = [
    ticket('salad', 52),
    ticket('burger', 38),
    ticket('soup', 25),
    ticket('steak', 14),
    ticket('burger', 5),
    ticket('fish', 1, true),
  ];
  s.nextTicketTick = now + secondsToTicks(c, 3);
  s.dirtyPlateReturns = [{ team: 0, atTick: now + secondsToTicks(c, 3) }];

  // ---- One tick of events, so effects show on the first frame ----
  s.events = [
    { type: 'knock', by: 3, victim: 2, itemId: s.floorItems[0]!.item.id },
    { type: 'delivered', team: 0, ticketId: 999, recipe: 'salad', points: 72 },
    { type: 'chopDone', tile: tileIndex(s.arena, 4, 3) },
    { type: 'cookDone', tile: tileIndex(s.arena, 20, 11) },
    { type: 'serveRefused', player: 1 },
    { type: 'ticketSpawn', ticketId: s.tickets[5]!.id, recipe: 'fish', isCritic: true },
    { type: 'heatChange', team: 0, heat: 2 },
  ];
  return s;
}
