import { tileCenter, tileOwner } from '@line-war/sim';
import type { MatchState, PlayerId, SimEvent, TeamId, Vec2 } from '@line-war/sim';
import { TEAM_COLORS } from './palette';

/**
 * Short-lived visual effects derived from SimEvents. Pure: reads state, never mutates it.
 * Positions are in tiles (world space); times are in milliseconds of renderer clock.
 */
export type EffectKind =
  | 'flash' // expanding burst (knock, fire start)
  | 'popup' // floating text (+points, DONE, COLD)
  | 'ring' // quick ring pop on a tile (chop/wash/cook done)
  | 'smoke' // grey puff (burnt, fire out)
  | 'shake' // shake a player + red cross (serve refused)
  | 'ticketFlash' // highlight a ticket card
  | 'heatFlash'; // highlight a team's heat meter

export interface Effect {
  kind: EffectKind;
  start: number;
  duration: number;
  color: string;
  pos?: Vec2;
  text?: string;
  player?: PlayerId;
  team?: TeamId;
  ticketId?: number;
}

export const EFFECT_MS: Record<EffectKind, number> = {
  flash: 450,
  popup: 1200,
  ring: 400,
  smoke: 700,
  shake: 400,
  ticketFlash: 700,
  heatFlash: 800,
};

/** Centre of the first pass tile the team owns this round (where +points pops up). */
export function passCenter(s: MatchState, team: TeamId): Vec2 | null {
  for (let i = 0; i < s.arena.tiles.length; i++) {
    if (s.arena.tiles[i]?.kind === 'pass' && tileOwner(s, i) === team) return tileCenter(s.arena, i);
  }
  return null;
}

/** Where an item currently is (held, on a station, on the floor), in tiles. */
export function findItemPos(s: MatchState, itemId: number): Vec2 | null {
  for (const p of s.players) if (p.holding?.id === itemId) return { x: p.pos.x, y: p.pos.y };
  for (const st of Object.values(s.stations)) if (st.item?.id === itemId) return tileCenter(s.arena, st.tile);
  for (const f of s.floorItems) if (f.item.id === itemId) return { x: f.pos.x, y: f.pos.y };
  return null;
}

/** Translate one tick's events into effects starting at `now`. */
export function eventsToEffects(s: MatchState, events: readonly SimEvent[], now: number): Effect[] {
  const out: Effect[] = [];
  const add = (e: Omit<Effect, 'start' | 'duration'>) => out.push({ ...e, start: now, duration: EFFECT_MS[e.kind] });
  const at = (tile: number) => tileCenter(s.arena, tile);
  for (const ev of events) {
    switch (ev.type) {
      case 'knock': {
        const v = s.players[ev.victim].pos;
        add({ kind: 'flash', pos: { x: v.x, y: v.y }, color: '#ffe14a', player: ev.victim });
        add({ kind: 'popup', pos: { x: v.x, y: v.y - 0.6 }, text: 'KNOCK!', color: '#ffe14a' });
        break;
      }
      case 'delivered': {
        const pos = passCenter(s, ev.team);
        if (pos) add({ kind: 'popup', pos, text: `+${ev.points}`, color: TEAM_COLORS[ev.team], team: ev.team });
        break;
      }
      case 'chopDone':
        add({ kind: 'ring', pos: at(ev.tile), color: '#9be89b' });
        break;
      case 'washDone':
        add({ kind: 'ring', pos: at(ev.tile), color: '#9ad0ff' });
        break;
      case 'cookDone':
        add({ kind: 'ring', pos: at(ev.tile), color: '#ffb347' });
        add({ kind: 'popup', pos: at(ev.tile), text: 'DONE', color: '#ffb347' });
        break;
      case 'burnt':
        add({ kind: 'smoke', pos: at(ev.tile), color: '#777777' });
        add({ kind: 'popup', pos: at(ev.tile), text: 'BURNT', color: '#bbbbbb' });
        break;
      case 'fireStart':
        add({ kind: 'flash', pos: at(ev.tile), color: '#ff7a1a' });
        break;
      case 'fireOut':
        add({ kind: 'smoke', pos: at(ev.tile), color: '#cccccc' });
        break;
      case 'serveRefused':
        add({ kind: 'shake', player: ev.player, color: '#ff4040' });
        break;
      case 'plateCold': {
        const pos = findItemPos(s, ev.itemId);
        if (pos) add({ kind: 'popup', pos, text: 'COLD', color: '#9cc4ff' });
        break;
      }
      case 'ticketSpawn':
        add({ kind: 'ticketFlash', ticketId: ev.ticketId, color: ev.isCritic ? '#ffd54a' : '#ffffff' });
        break;
      case 'heatChange':
        add({ kind: 'heatFlash', team: ev.team, color: TEAM_COLORS[ev.team] });
        break;
      default:
        break;
    }
  }
  return out;
}

/** 0..1 progress of an effect at time `now`. */
export const effectAge = (e: Effect, now: number): number => Math.max(0, Math.min(1, (now - e.start) / e.duration));

/** Holds live effects; drops them once finished. */
export class EffectQueue {
  private items: Effect[] = [];

  push(effects: readonly Effect[]): void {
    this.items.push(...effects);
  }

  /** Live effects at `now` (finished ones are removed). */
  active(now: number): readonly Effect[] {
    this.items = this.items.filter((e) => now - e.start < e.duration);
    return this.items;
  }

  clear(): void {
    this.items = [];
  }
}

/** Horizontal shake offset in px for a shake effect (decays to 0). */
export function shakeOffset(age: number, amplitude = 6): number {
  return Math.sin(age * Math.PI * 8) * amplitude * (1 - age);
}
