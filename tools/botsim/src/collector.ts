/**
 * Collector: turns the per-tick SimEvent stream plus light state sampling into RoundRecords.
 * Call `observe(state, inputs)` after every `step(state, inputs)`; read `rounds` / `stuck` at the end.
 *
 * Definitions (also printed in the report):
 * - contested: on each delivery, the rival crew had a dish in progress for that recipe — a clean,
 *   warm plate it owns whose food is a non-empty part of the recipe, or a vessel on its stove whose
 *   (cooked) contents are. "Owns" = held by a crew member, on a station in its kitchen, or on the
 *   floor of its kitchen (market floor: the crew that threw it).
 * - wasted: plated food that went cold (plateCold), was trashed while still warm, or was still on
 *   a plate when the round ended.
 * - steal: after a knock, the next pickup of the popped item was by the knocker's crew.
 * - stuck: a bot-controlled player whose position did not change and who pressed no grab/work/throw
 *   for more than `stuckSeconds` of ticks during which tickets were on the board (the last
 *   ENDGAME_GRACE_SECONDS of a round don't count: no new dish can be finished then).
 */
import {
  isPlaying,
  teamOf,
  tileIndexAtPos,
  tileOwner,
  type Food,
  type Item,
  type MatchInputs,
  type MatchState,
  type PlayerId,
  type RecipeDef,
  type RecipeId,
  type SimEvent,
  type TeamId,
} from '@line-war/sim';
import type { CriticRecord, Pair, RoundRecord, StuckEvent, TicketCounts } from './types';

/** Final seconds of a round in which idling is not counted as stuck (shorter than any dish). */
export const ENDGAME_GRACE_SECONDS = 20;

const foodKey = (f: Food): string => `${f.kind}:${f.state}`;

/** True if every food in `part` appears in `whole` at least as many times. */
export function isSubMultiset(part: readonly Food[], whole: readonly Food[]): boolean {
  const counts = new Map<string, number>();
  for (const f of whole) counts.set(foodKey(f), (counts.get(foodKey(f)) ?? 0) + 1);
  for (const f of part) {
    const n = counts.get(foodKey(f)) ?? 0;
    if (n === 0) return false;
    counts.set(foodKey(f), n - 1);
  }
  return true;
}

/** Food in progress for a crew: contents of its warm plates and of its stoves' vessels (as cooked). */
export function dishesInProgress(state: MatchState, team: TeamId): Food[][] {
  const out: Food[][] = [];
  const plate = (item: Item | null): void => {
    if (item && item.type === 'plate' && !item.dirty && !item.cold && item.contents.length > 0) out.push(item.contents);
  };
  for (const p of state.players) if (p.team === team) plate(p.holding);
  for (const st of Object.values(state.stations)) {
    if (tileOwner(state, st.tile) !== team) continue;
    plate(st.item);
    const v = st.vessel;
    if (v && v.contents.length > 0 && v.status !== 'burnt' && v.status !== 'fire') {
      out.push(v.contents.map((f) => ({ kind: f.kind, state: 'cooked' as const })));
    }
  }
  for (const fi of state.floorItems) if (floorTeam(state, fi.pos, fi.thrownBy) === team) plate(fi.item);
  return out;
}

function floorTeam(state: MatchState, pos: { x: number; y: number }, thrownBy: PlayerId | null): TeamId | null {
  const tile = tileIndexAtPos(state.arena, pos);
  const owner = tile === null ? null : tileOwner(state, tile);
  if (owner !== null) return owner;
  return thrownBy === null ? null : teamOf(thrownBy);
}

/** True if the crew has any dish in progress that could become `recipe`. */
export function hasDishFor(state: MatchState, team: TeamId, recipe: RecipeDef): boolean {
  return dishesInProgress(state, team).some((d) => isSubMultiset(d, recipe.ingredients));
}

interface PlateSeen {
  food: number;
  cold: boolean;
  team: TeamId | null;
}

/** Every plate currently in the world, with the crew it belongs to. */
function snapshotPlates(state: MatchState): Map<number, PlateSeen> {
  const out = new Map<number, PlateSeen>();
  const add = (item: Item | null, team: TeamId | null): void => {
    if (item && item.type === 'plate') out.set(item.id, { food: item.contents.length, cold: item.cold, team });
  };
  for (const p of state.players) add(p.holding, p.team);
  for (const st of Object.values(state.stations)) if (st.item) add(st.item, tileOwner(state, st.tile));
  for (const fi of state.floorItems) add(fi.item, floorTeam(state, fi.pos, fi.thrownBy));
  return out;
}

const pair = (): Pair => [0, 0];

/** Tiles a player may drift (pushing against a wall or a player) and still count as not moving. */
export const STILL_RADIUS = 0.25;

class RoundBuilder {
  readonly rec: RoundRecord;
  /** Ticket id -> recipe, for regular tickets. */
  readonly ticketRecipe = new Map<number, RecipeId>();
  criticId: number | null = null;
  /** Popped item id -> knocker's team, until someone picks it up. */
  readonly popped = new Map<number, TeamId>();
  lastLeader: TeamId | null = null;

  constructor(index: number, recipes: readonly RecipeDef[]) {
    const servedByRecipe: Record<RecipeId, Pair> = {};
    const tickets: Record<RecipeId, TicketCounts> = {};
    for (const r of recipes) {
      servedByRecipe[r.id] = pair();
      tickets[r.id] = { spawned: 0, served: 0, expired: 0, leftover: 0 };
    }
    this.rec = {
      index,
      winner: null,
      scores: pair(),
      margin: 0,
      timeline: { a: [], b: [] },
      served: pair(),
      servedByRecipe,
      tickets,
      contested: 0,
      wasted: { cold: pair(), trashed: pair(), leftover: pair() },
      knocks: pair(),
      steals: pair(),
      burns: pair(),
      fires: pair(),
      heatTicks: [[0, 0, 0, 0], [0, 0, 0, 0]],
      critic: null,
      rushStartScores: null,
      leadChanges: 0,
    };
  }
}

export interface CollectorOptions {
  seed: number;
  /** Which player slots are bots (only bots are checked for being stuck). */
  botSlots: readonly boolean[];
  stuckSeconds: number;
}

export class Collector {
  readonly rounds: RoundRecord[] = [];
  readonly stuck: StuckEvent[] = [];
  private cur: RoundBuilder;
  private plates = new Map<number, PlateSeen>();
  private readonly anchors: { x: number; y: number }[];
  private readonly idleTicks = [0, 0, 0, 0];
  private readonly flagged = [false, false, false, false];
  private readonly stuckTicks: number;
  private readonly tickRate: number;

  constructor(
    state: MatchState,
    private readonly opts: CollectorOptions,
  ) {
    this.cur = new RoundBuilder(state.round.index, state.recipes);
    this.anchors = state.players.map((p) => ({ x: p.pos.x, y: p.pos.y }));
    this.tickRate = state.config.tuning.tickRate;
    this.stuckTicks = Math.round(opts.stuckSeconds * this.tickRate);
    this.plates = snapshotPlates(state);
  }

  observe(state: MatchState, inputs: MatchInputs): void {
    for (const ev of state.events) this.onEvent(state, ev);
    if (!isPlaying(state)) return;
    this.sample(state, inputs);
  }

  private onEvent(state: MatchState, ev: SimEvent): void {
    const r = this.cur.rec;
    switch (ev.type) {
      case 'phaseChange':
        if (ev.phase === 'prep' && state.round.index !== r.index) this.startRound(state);
        else if (ev.phase === 'rush') this.cur.rec.rushStartScores = [state.teams[0].score, state.teams[1].score];
        return;
      case 'ticketSpawn':
        if (ev.isCritic) {
          this.cur.criticId = ev.ticketId;
          const t = state.tickets.find((x) => x.id === ev.ticketId);
          r.critic = { recipe: ev.recipe, visibleTo: t?.visibleTo ?? null, winner: null };
        } else {
          this.cur.ticketRecipe.set(ev.ticketId, ev.recipe);
          const c = r.tickets[ev.recipe];
          if (c) c.spawned++;
        }
        return;
      case 'ticketExpired': {
        const recipe = this.cur.ticketRecipe.get(ev.ticketId);
        if (recipe !== undefined) {
          r.tickets[recipe]!.expired++;
          this.cur.ticketRecipe.delete(ev.ticketId);
        }
        return;
      }
      case 'delivered': {
        r.served[ev.team]++;
        const s = r.servedByRecipe[ev.recipe];
        if (s) s[ev.team]++;
        if (ev.ticketId === this.cur.criticId && r.critic) (r.critic as CriticRecord).winner = ev.team;
        const recipe = this.cur.ticketRecipe.get(ev.ticketId);
        if (recipe !== undefined) {
          r.tickets[recipe]!.served++;
          this.cur.ticketRecipe.delete(ev.ticketId);
        }
        const def = state.recipes.find((x) => x.id === ev.recipe);
        if (def && hasDishFor(state, (1 - ev.team) as TeamId, def)) r.contested++;
        const [a, b] = [state.teams[0].score, state.teams[1].score];
        const leader: TeamId | null = a > b ? 0 : b > a ? 1 : null;
        if (leader !== null) {
          if (this.cur.lastLeader !== null && leader !== this.cur.lastLeader) r.leadChanges++;
          this.cur.lastLeader = leader;
        }
        return;
      }
      case 'knock': {
        const team = teamOf(ev.by);
        r.knocks[team]++;
        this.cur.popped.set(ev.itemId, team);
        return;
      }
      case 'grab': {
        const knocker = this.cur.popped.get(ev.itemId);
        if (knocker === undefined) return;
        this.cur.popped.delete(ev.itemId);
        if (teamOf(ev.player) === knocker) r.steals[knocker]++;
        return;
      }
      case 'drop': {
        if (ev.tile === null || state.arena.tiles[ev.tile]?.kind !== 'trash') return;
        const seen = this.plates.get(ev.itemId);
        if (seen && seen.food > 0 && !seen.cold) r.wasted.trashed[teamOf(ev.player)]++;
        return;
      }
      case 'plateCold': {
        const team = snapshotPlates(state).get(ev.itemId)?.team ?? this.plates.get(ev.itemId)?.team ?? null;
        if (team !== null) r.wasted.cold[team]++;
        return;
      }
      case 'burnt': {
        const owner = tileOwner(state, ev.tile);
        if (owner !== null) r.burns[owner]++;
        return;
      }
      case 'fireStart': {
        const owner = tileOwner(state, ev.tile);
        if (owner !== null) r.fires[owner]++;
        return;
      }
      case 'roundEnd':
        this.endRound(state, ev.winner, ev.scores);
        return;
      default:
        return;
    }
  }

  private startRound(state: MatchState): void {
    this.cur = new RoundBuilder(state.round.index, state.recipes);
    this.idleTicks.fill(0);
    this.flagged.fill(false);
    state.players.forEach((p, i) => (this.anchors[i] = { x: p.pos.x, y: p.pos.y }));
  }

  private endRound(state: MatchState, winner: TeamId | null, scores: [number, number]): void {
    const r = this.cur.rec;
    r.winner = winner;
    r.scores = [scores[0], scores[1]];
    const top = Math.max(scores[0], scores[1]);
    r.margin = top > 0 ? Math.abs(scores[0] - scores[1]) / top : 0;
    for (const [, recipe] of this.cur.ticketRecipe) r.tickets[recipe]!.leftover++;
    this.cur.ticketRecipe.clear();
    for (const seen of snapshotPlates(state).values()) {
      if (seen.food > 0 && !seen.cold && seen.team !== null) r.wasted.leftover[seen.team]++;
    }
    this.rounds.push(r);
  }

  private sample(state: MatchState, inputs: MatchInputs): void {
    const r = this.cur.rec;
    const phase = state.round.phase;
    if (state.round.tick % this.tickRate === 0) {
      r.timeline.a.push(state.teams[0].score);
      r.timeline.b.push(state.teams[1].score);
    }
    if (phase !== 'prep') {
      r.heatTicks[0][state.teams[0].heat]!++;
      r.heatTicks[1][state.teams[1].heat]!++;
    }
    this.plates = snapshotPlates(state);

    const ticketsUp = state.tickets.length > 0;
    // Near the end of a round no new dish can be finished, so a bot that stops is choosing well, not stuck.
    const endgame = state.round.tick >= (state.config.roundSeconds - ENDGAME_GRACE_SECONDS) * this.tickRate;
    for (const p of state.players) {
      if (!this.opts.botSlots[p.id]) continue;
      // Anchor = where the current idle spell began. Pushing against a wall or a player jitters the
      // position by tiny amounts, so "no position change" means staying within STILL_RADIUS of it.
      const anchor = this.anchors[p.id]!;
      const moved = Math.abs(p.pos.x - anchor.x) > STILL_RADIUS || Math.abs(p.pos.y - anchor.y) > STILL_RADIUS;
      const input = inputs[p.id];
      if (moved || input.grab || input.work || input.throw) {
        this.anchors[p.id] = { x: p.pos.x, y: p.pos.y };
        this.idleTicks[p.id] = 0;
        this.flagged[p.id] = false;
        continue;
      }
      if (!ticketsUp || endgame) continue;
      this.idleTicks[p.id]!++;
      if (this.idleTicks[p.id]! > this.stuckTicks && !this.flagged[p.id]) {
        this.flagged[p.id] = true;
        const h = p.holding;
        this.stuck.push({
          seed: this.opts.seed,
          tick: state.tick,
          round: state.round.index,
          player: p.id,
          idleSeconds: this.opts.stuckSeconds,
          pos: { x: Math.round(p.pos.x * 100) / 100, y: Math.round(p.pos.y * 100) / 100 },
          holding: h === null ? null : h.type === 'plate' ? `plate[${h.contents.map(foodKey).join(',')}]` : `${h.kind}:${h.state}`,
        });
      }
    }
  }
}
