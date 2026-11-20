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
import { DAZED_SPEED_FACTOR, EPS, SUBSTEP } from './kitchen/constants';
import { emit, isOpenFor } from './kitchen/world';
import { tryKnock } from './market';

/** Passes of wall resolution / player separation per tick. */
const RESOLVE_PASSES = 4;

export function updateMovement(state: MatchState, inputs: MatchInputs): void {
  const t = state.config.tuning;
  const before: Vec2[] = state.players.map((p) => ({ x: p.pos.x, y: p.pos.y }));
  const dashedThisTick = [false, false, false, false];

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

    let dx: number;
    let dy: number;
    if (p.dashTicks > 0) {
      // A dash replaces walking: dashDistance spread evenly over its ticks.
      const perTick = t.dashDistance / secondsToTicks(state.config, t.dashSeconds);
      dx = p.dashDir.x * perTick;
      dy = p.dashDir.y * perTick;
      p.dashTicks--;
      dashedThisTick[p.id] = true;
    } else {
      const speed = (t.playerSpeed / t.tickRate) * (p.dazedTicks > 0 ? DAZED_SPEED_FACTOR : 1);
      dx = move.x * speed;
      dy = move.y * speed;
    }
    moveWithCollision(state, p, dx, dy);
  }

  // Dash knocks: first rival touched during a dash, once per dash.
  const touch = 2 * t.playerRadius + EPS;
  for (const p of state.players) {
    if (!dashedThisTick[p.id] || p.dashHit) continue;
    let victim: PlayerState | null = null;
    let best = Infinity;
    for (const o of state.players) {
      if (o.team === p.team) continue;
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

  separatePlayers(state);

  for (const p of state.players) {
    const b = before[p.id]!;
    p.vel = { x: (p.pos.x - b.x) * t.tickRate, y: (p.pos.y - b.y) * t.tickRate };
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

/** Circle vs tile: push the player out of every tile that is solid for their team. */
export function resolveWalls(state: MatchState, p: PlayerState): void {
  const r = state.config.tuning.playerRadius;
  for (let pass = 0; pass < RESOLVE_PASSES; pass++) {
    let moved = false;
    const x0 = Math.floor(p.pos.x - r);
    const x1 = Math.floor(p.pos.x + r);
    const y0 = Math.floor(p.pos.y - r);
    const y1 = Math.floor(p.pos.y + r);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (isOpenFor(state, p.team, tx, ty)) continue;
        const cx = Math.min(Math.max(p.pos.x, tx), tx + 1);
        const cy = Math.min(Math.max(p.pos.y, ty), ty + 1);
        const ox = p.pos.x - cx;
        const oy = p.pos.y - cy;
        const d = vecLength(ox, oy);
        if (d >= r - EPS) continue;
        if (d > EPS) {
          const k = (r - d) / d;
          p.pos.x += ox * k;
          p.pos.y += oy * k;
        } else {
          // Centre inside the tile: leave through the nearest face.
          const left = p.pos.x - tx;
          const right = tx + 1 - p.pos.x;
          const up = p.pos.y - ty;
          const down = ty + 1 - p.pos.y;
          const m = Math.min(left, right, up, down);
          if (m === left) p.pos.x = tx - r;
          else if (m === right) p.pos.x = tx + 1 + r;
          else if (m === up) p.pos.y = ty - r;
          else p.pos.y = ty + 1 + r;
        }
        moved = true;
      }
    }
    if (!moved) return;
  }
}

/** Player-player collision: push overlapping pairs apart, equal split, then re-resolve walls. */
function separatePlayers(state: MatchState): void {
  const min = 2 * state.config.tuning.playerRadius;
  const ps = state.players;
  for (let pass = 0; pass < RESOLVE_PASSES; pass++) {
    let moved = false;
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
        a.pos.x -= nx * half;
        a.pos.y -= ny * half;
        b.pos.x += nx * half;
        b.pos.y += ny * half;
        moved = true;
      }
    }
    for (const p of ps) resolveWalls(state, p);
    if (!moved) return;
  }
}
