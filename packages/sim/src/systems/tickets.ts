/**
 * OWNER: rules track (PR "sim-rules").
 * Ticket spawning (weighted recipes, max on board, rush rate, critic), expiry, and delivery.
 * Spec: docs/RULES.md §7 (and §8 for the points).
 */
import { tileOwner } from '../grid';
import { isPlaying, newId } from '../match';
import { matchesRecipe } from '../recipes';
import { weightedIndex } from '../rng';
import { secondsToTicks, timerTicks } from '../tuning';
import type { MatchState, PlateItem, PlayerId, RecipeDef, TeamId, Ticket } from '../types';
import { roundTimes } from './rules/timing';
import { isPlateCold } from './kitchen/plate';
import { interactTarget } from './kitchen/world';
import { registerCleanDelivery, scoreDelivery } from './scoring';

export const isVisibleTo = (ticket: Ticket, team: TeamId): boolean => ticket.visibleTo === null || ticket.visibleTo === team;

function spawnTicket(state: MatchState, recipe: RecipeDef, critic: boolean): Ticket {
  const { config } = state;
  const t = config.tuning;
  let visibleTo: TeamId | null = null;
  let revealAllAtTick: number | null = null;
  if (critic) {
    const [a, b] = state.teams;
    visibleTo = a.score < b.score ? 0 : b.score < a.score ? 1 : null;
    revealAllAtTick = state.tick + secondsToTicks(config, t.criticEarlySeconds);
  }
  const ticket: Ticket = {
    id: newId(state),
    recipe: recipe.id,
    spawnTick: state.tick,
    expireTick: state.tick + secondsToTicks(config, t.ticketLifetimeSeconds),
    baseValue: critic ? recipe.baseValue * t.criticMultiplier : recipe.baseValue,
    isCritic: critic,
    visibleTo,
    revealAllAtTick,
  };
  state.tickets.push(ticket);
  state.events.push({ type: 'ticketSpawn', ticketId: ticket.id, recipe: ticket.recipe, isCritic: critic });
  return ticket;
}

function pickRecipe(state: MatchState, pool: RecipeDef[]): RecipeDef | null {
  const i = weightedIndex(
    state,
    pool.map((r) => r.weight),
  );
  return i < 0 ? null : (pool[i] ?? null);
}

export function updateTickets(state: MatchState): void {
  const { config } = state;
  const t = config.tuning;
  const phase = state.round.phase;

  // Expiry.
  const kept: Ticket[] = [];
  for (const ticket of state.tickets) {
    if (state.tick >= ticket.expireTick) state.events.push({ type: 'ticketExpired', ticketId: ticket.id });
    else kept.push(ticket);
  }
  state.tickets = kept;

  // Critic early-visibility window ends.
  for (const ticket of state.tickets) {
    if (ticket.visibleTo !== null && ticket.revealAllAtTick !== null && state.tick >= ticket.revealAllAtTick) {
      ticket.visibleTo = null;
    }
  }

  const spawning = phase === 'service' || phase === 'rush';
  if (!spawning) return;

  // Regular tickets: one per interval; a full board skips this interval.
  if (state.tick >= state.nextTicketTick) {
    const onBoard = state.tickets.filter((x) => !x.isCritic).length;
    if (onBoard < t.maxTickets) {
      const recipe = pickRecipe(state, state.recipes);
      if (recipe) spawnTicket(state, recipe, false);
    }
    const interval = phase === 'rush' ? t.rushTicketSpawnSeconds : t.ticketSpawnSeconds;
    state.nextTicketTick = state.tick + timerTicks(config, interval);
  }

  // Critic: once per round, when its time has come (waits for prep to end, skipped in Last Call).
  if (config.criticEnabled && !state.round.criticSpawned && state.round.tick >= roundTimes(config).criticAt) {
    state.round.criticSpawned = true;
    const recipe = pickRecipe(
      state,
      state.recipes.filter((r) => r.premium),
    );
    if (recipe) spawnTicket(state, recipe, true);
  }
}

export type DeliveryResult =
  | { ok: true; ticketId: number; points: number }
  | { ok: false; reason: 'notPlaying' | 'notOwnPass' | 'noMatchingTicket' | 'dirtyOrEmpty' | 'cold' };

function refuse(state: MatchState, player: PlayerId, reason: Extract<DeliveryResult, { ok: false }>['reason']): DeliveryResult {
  state.events.push({ type: 'serveRefused', player });
  return { ok: false, reason };
}

/** True if the player's interaction target (RULES §1) is a pass their team owns this round. */
export function facesOwnPass(state: MatchState, player: PlayerId): boolean {
  const p = state.players[player];
  const { tile: target } = interactTarget(state, p);
  if (target === null) return false;
  return state.arena.tiles[target]?.kind === 'pass' && tileOwner(state, target) === p.team;
}

/** Oldest ticket visible to the team whose recipe the plate matches, or null. */
export function findTicketFor(state: MatchState, team: TeamId, plate: PlateItem): Ticket | null {
  let best: Ticket | null = null;
  for (const ticket of state.tickets) {
    if (!isVisibleTo(ticket, team) || state.tick >= ticket.expireTick) continue;
    const recipe = state.recipes.find((r) => r.id === ticket.recipe);
    if (!recipe || !matchesRecipe(plate.contents, recipe)) continue;
    if (best === null || ticket.spawnTick < best.spawnTick || (ticket.spawnTick === best.spawnTick && ticket.id < best.id)) {
      best = ticket;
    }
  }
  return best;
}

/**
 * Called by interact.ts when a player places a plate on their own pass.
 * On success the caller removes the plate from the player's hands; this function
 * scores it, removes the ticket, queues the dirty plate return and emits events.
 * On failure the plate stays in the player's hands and a 'serveRefused' event is emitted.
 * There is no penalty for a refused serve. A matching plate wins the OLDEST matching ticket.
 */
export function deliverPlate(state: MatchState, player: PlayerId, plate: PlateItem): DeliveryResult {
  if (!isPlaying(state) || state.round.phase === 'prep') return refuse(state, player, 'notPlaying');
  if (!facesOwnPass(state, player)) return refuse(state, player, 'notOwnPass');
  if (plate.dirty || plate.contents.length === 0) return refuse(state, player, 'dirtyOrEmpty');
  if (isPlateCold(state, plate)) return refuse(state, player, 'cold');
  const team = state.players[player].team;
  const ticket = findTicketFor(state, team, plate);
  if (!ticket) return refuse(state, player, 'noMatchingTicket');

  const points = scoreDelivery(state, team, ticket, plate);
  state.tickets = state.tickets.filter((x) => x.id !== ticket.id);
  state.teams[team].score += points;
  registerCleanDelivery(state, team);
  state.dirtyPlateReturns.push({
    team,
    atTick: state.tick + secondsToTicks(state.config, state.config.tuning.dirtyPlateReturnSeconds),
  });
  state.events.push({ type: 'delivered', team, ticketId: ticket.id, recipe: ticket.recipe, points });
  return { ok: true, ticketId: ticket.id, points };
}
