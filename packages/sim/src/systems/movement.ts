/**
 * OWNER: kitchen track (PR "sim-kitchen").
 * Movement (playerSpeed, half speed while dazed), wall/station collision, player-player
 * collision, dash (dashDistance over dashSeconds, cooldown; no dash while dazed).
 * Players can never enter tiles of the RIVAL kitchen zone (use tileOwner); the doorway blocks them.
 * When a dashing player touches a rival, call tryKnock() from market.ts.
 */
import { dist, vecLength } from '../grid';
import { secondsToTicks } from '../tuning';
import type { MatchInputs, MatchState, PlayerState, Vec2 } from '../types';
import { DAZED_SPEED_FACTOR, EPS, PLAYER_STEP_FRACTION, SUBSTEP } from './kitchen/constants';
import { emit, isOpenFor } from './kitchen/world';
import { tryKnock } from './market';

/** Passes of wall resolution / player separation per tick. */
const RESOLVE_PASSES = 4;
/** Wall pushes per resolve (one tile each, deepest first); enough for any corner a circle can touch. */
const WALL_PASSES = 8;

export function updateMovement(state: MatchState, inputs: MatchInputs): void {
  const t = state.config.tuning;
  const before: Vec2[] = state.players.map((p) => ({ x: p.pos.x, y: p.pos.y }));
  const dashedThisTick = [false, false, false, false];
  const deltas: Vec2[] = [];

  for (const p of state.players) {
    if (p.dazedTicks > 0) p.dazedTicks--;
    if (p.knockImmuneTicks > 0) p.knockImmuneTicks--;
    if (p.dashCooldown > 0) p.dashCooldown--;

    const input = inputs[p.id];
    const move = clampLength(input.move);
    const len = vecLength(move.x, move.y);
    if (len > EPS) p.facing = { x: move.x / len, y: move.y / len };

    if (input.dash && p.dashTicks === 0 && p.dashCooldown === 0 && p.dazedTicks === 0) {
      p.dashTicks = secondsToTicks(state.config, t.dashSeconds);
      p.dashCooldown = secondsToTicks(state.config, t.dashCooldownSeconds);
      p.dashDir = { x: p.facing.x, y: p.facing.y };
      p.dashHit = false;
      emit(state, { type: 'dash', player: p.id });
    }

    if (p.dashTicks > 0) {
      // A dash replaces walking: dashDistance spread evenly over its ticks.
      const perTick = t.dashDistance / secondsToTicks(state.config, t.dashSeconds);
      deltas[p.id] = { x: p.dashDir.x * perTick, y: p.dashDir.y * perTick };
      p.dashTicks--;
      dashedThisTick[p.id] = true;
    } else {
      const speed = (t.playerSpeed / t.tickRate) * (p.dazedTicks > 0 ? DAZED_SPEED_FACTOR : 1);
      deltas[p.id] = { x: move.x * speed, y: move.y * speed };
    }
  }

  // Everyone moves together in equal slices, with players separated after each slice, so a fast
  // move (a dash) can't carry one player through another (RULES §1: collisions still apply).
  // Slices are capped at half a radius; ordinary walking fits in one, exactly as before.
  const cap = t.playerRadius * PLAYER_STEP_FRACTION;
  const slices = Math.max(1, ...deltas.map((d) => Math.ceil(vecLength(d.x, d.y) / cap - EPS)));
  for (let k = 0; k < slices; k++) {
    for (const p of state.players) moveWithCollision(state, p, deltas[p.id]!.x / slices, deltas[p.id]!.y / slices);
    dashKnocks(state, dashedThisTick);
    separatePlayers(state);
  }

  for (const p of state.players) {
    const b = before[p.id]!;
    p.vel = { x: (p.pos.x - b.x) * t.tickRate, y: (p.pos.y - b.y) * t.tickRate };
  }
}

/**
 * Dash knocks: first rival touched during a dash, once per dash. Only rivals AHEAD of the
 * dash count (dot(dashDir, victim − pos) > 0), so a dash blocked by a wall can't knock
 * someone already touching you from the side or behind.
 */
function dashKnocks(state: MatchState, dashedThisTick: boolean[]): void {
  const touch = 2 * state.config.tuning.playerRadius + EPS;
  for (const p of state.players) {
    if (!dashedThisTick[p.id] || p.dashHit) continue;
    let victim: PlayerState | null = null;
    let best = Infinity;
    for (const o of state.players) {
      if (o.team === p.team) continue;
      const ahead = p.dashDir.x * (o.pos.x - p.pos.x) + p.dashDir.y * (o.pos.y - p.pos.y);
      if (ahead <= 0) continue;
      const d = dist(p.pos, o.pos);
      if (d <= touch && d < best) {
        best = d;
        victim = o;
      }
    }
    if (victim) {
      p.dashHit = true;
      tryKnock(state, p.id, victim.id);
    }
  }
}

function clampLength(v: Vec2): Vec2 {
  // `+ 0` turns -0 into 0 so state survives a JSON round trip unchanged.
  const x = Number.isFinite(v.x) ? v.x + 0 : 0;
  const y = Number.isFinite(v.y) ? v.y + 0 : 0;
  const len = vecLength(x, y);
  return len > 1 ? { x: x / len, y: y / len } : { x, y };
}

/** Move in small sub-steps, pushing out of solid tiles after each so fast moves can't tunnel. */
function moveWithCollision(state: MatchState, p: PlayerState, dx: number, dy: number): void {
  const len = vecLength(dx, dy);
  if (len <= EPS) {
    resolveWalls(state, p);
    return;
  }
  const steps = Math.ceil(len / SUBSTEP);
  for (let i = 0; i < steps; i++) {
    p.pos.x += dx / steps;
    p.pos.y += dy / steps;
    resolveWalls(state, p);
  }
}

/**
 * Circle vs tile: push the player out of every tile that is solid for their team, deepest
 * overlap first (one push per pass). Resolving in a fixed tile order instead would make a
 * player sliding along a wall seam get nudged differently on the left and right of the map.
 */
export function resolveWalls(state: MatchState, p: PlayerState): void {
  const r = state.config.tuning.playerRadius;
  for (let pass = 0; pass < WALL_PASSES; pass++) {
    const x0 = Math.floor(p.pos.x - r);
    const x1 = Math.floor(p.pos.x + r);
    const y0 = Math.floor(p.pos.y - r);
    const y1 = Math.floor(p.pos.y + r);
    let bestX = 0;
    let bestY = 0;
    let bestDepth = 0;
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (isOpenFor(state, p.team, tx, ty)) continue;
        const cx = Math.min(Math.max(p.pos.x, tx), tx + 1);
        const cy = Math.min(Math.max(p.pos.y, ty), ty + 1);
        const ox = p.pos.x - cx;
        const oy = p.pos.y - cy;
        const d = vecLength(ox, oy);
        if (d >= r - EPS) continue;
        let nx: number;
        let ny: number;
        let depth: number;
        if (d > EPS) {
          depth = r - d;
          nx = ox * (depth / d);
          ny = oy * (depth / d);
        } else {
          // Centre inside the tile: leave through the nearest face.
          const left = p.pos.x - tx;
          const right = tx + 1 - p.pos.x;
          const up = p.pos.y - ty;
          const down = ty + 1 - p.pos.y;
          const m = Math.min(left, right, up, down);
          depth = r + m;
          nx = m === left ? tx - r - p.pos.x : m === right ? tx + 1 + r - p.pos.x : 0;
          ny = m === left || m === right ? 0 : m === up ? ty - r - p.pos.y : ty + 1 + r - p.pos.y;
        }
        if (depth > bestDepth) {
          bestDepth = depth;
          bestX = nx;
          bestY = ny;
        }
      }
    }
    if (bestDepth === 0) return;
    p.pos.x += bestX;
    p.pos.y += bestY;
  }
}

/**
 * Player-player collision: push overlapping pairs apart, equal split, then re-resolve walls.
 * Every pair's push in a pass is measured from the same positions and applied together, so the
 * result doesn't depend on player-id order (which would favour one team in a crowd).
 */
function separatePlayers(state: MatchState): void {
  const min = 2 * state.config.tuning.playerRadius;
  const ps = state.players;
  const push = ps.map(() => ({ x: 0, y: 0 }));
  for (let pass = 0; pass < RESOLVE_PASSES; pass++) {
    let moved = false;
    for (const d of push) d.x = d.y = 0;
    for (let i = 0; i < ps.length; i++) {
      for (let j = i + 1; j < ps.length; j++) {
        const a = ps[i]!;
        const b = ps[j]!;
        const ox = b.pos.x - a.pos.x;
        const oy = b.pos.y - a.pos.y;
        const d = vecLength(ox, oy);
        if (d >= min - EPS) continue;
        // Exactly overlapping: split along x (lower id goes left) so the result is deterministic.
        const nx = d > EPS ? ox / d : 1;
        const ny = d > EPS ? oy / d : 0;
        const half = (min - d) / 2;
        push[i]!.x -= nx * half;
        push[i]!.y -= ny * half;
        push[j]!.x += nx * half;
        push[j]!.y += ny * half;
        moved = true;
      }
    }
    for (const p of ps) {
      p.pos.x += push[p.id]!.x;
      p.pos.y += push[p.id]!.y;
      resolveWalls(state, p);
    }
    if (!moved) return;
  }
}
