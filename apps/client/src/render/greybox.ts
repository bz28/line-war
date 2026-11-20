import type { Item, MatchState, TileKind } from '@line-war/sim';
import type { Renderer } from './types';

/**
 * Greybox renderer: plain shapes on a Canvas2D. Enough to debug the sim and to run the
 * step-5 human playtest. The render track may replace or extend it.
 */
const TILE = 40;
const HUD = 72;
const TILE_COLORS: Record<TileKind, string> = {
  floor: '#2a2d35', wall: '#15171c', counter: '#5b5f6b', pantry: '#4f7a4a', crate: '#a8742f', board: '#8a7350',
  stove: '#7a3b3b', sink: '#3b5f7a', plates: '#9aa0ad', pass: '#c9a227', trash: '#3a3a3a',
};
const TEAM_COLORS = ['#4ea1ff', '#ff6b5e'];
const FOOD_COLORS: Record<string, string> = { lettuce: '#5cc75c', tomato: '#e5483b', bun: '#d9a35b', meat: '#b5534d', steak: '#8f2f2f', fish: '#8fc4e0' };

export class GreyboxRenderer implements Renderer {
  private ctx: CanvasRenderingContext2D;
  constructor(private canvas: HTMLCanvasElement, state: MatchState) {
    canvas.width = state.arena.width * TILE;
    canvas.height = state.arena.height * TILE + HUD;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas not supported');
    this.ctx = ctx;
  }

  render(s: MatchState): void {
    const { ctx } = this;
    ctx.fillStyle = '#111318';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.hud(s);
    ctx.save();
    ctx.translate(0, HUD);
    s.arena.tiles.forEach((t, i) => {
      const x = (i % s.arena.width) * TILE;
      const y = Math.floor(i / s.arena.width) * TILE;
      ctx.fillStyle = s.arena.zones[i] === 'market' && t.kind === 'floor' ? '#33302a' : TILE_COLORS[t.kind];
      ctx.fillRect(x + 1, y + 1, TILE - 2, TILE - 2);
      if (t.ingredient) this.dot(x + TILE / 2, y + TILE / 2, 8, FOOD_COLORS[t.ingredient] ?? '#fff');
      const st = s.stations[String(i)];
      if (st?.item) this.item(st.item, x + TILE / 2, y + TILE / 2);
      if (st?.vessel && st.vessel.contents.length) this.dot(x + TILE / 2, y + TILE / 2, 10, st.vessel.status === 'burnt' || st.vessel.status === 'fire' ? '#222' : '#ddd');
      if (t.kind === 'crate' && st) this.text(String(st.stock), x + 4, y + 14, '#fff', 11);
    });
    for (const f of s.fires) {
      const x = (f.tile % s.arena.width) * TILE;
      const y = Math.floor(f.tile / s.arena.width) * TILE;
      ctx.fillStyle = 'rgba(255,120,0,0.6)';
      ctx.fillRect(x, y, TILE, TILE);
    }
    for (const fi of s.floorItems) this.item(fi.item, fi.pos.x * TILE, fi.pos.y * TILE);
    for (const p of s.players) {
      const px = p.pos.x * TILE;
      const py = p.pos.y * TILE;
      this.dot(px, py, TILE * 0.35, TEAM_COLORS[p.team]!);
      ctx.strokeStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + p.facing.x * TILE * 0.45, py + p.facing.y * TILE * 0.45);
      ctx.stroke();
      if (p.dazedTicks > 0) this.text('*', px - 4, py - 16, '#ff0', 16);
      if (p.holding) this.item(p.holding, px, py - TILE * 0.4);
      this.text(`P${p.id + 1}`, px - 8, py + 4, '#000', 11);
    }
    ctx.restore();
  }

  private hud(s: MatchState) {
    const tr = s.config.tuning.tickRate;
    const left = Math.max(0, s.config.roundSeconds - s.round.tick / tr);
    const mm = Math.floor(left / 60);
    const ss = String(Math.floor(left % 60)).padStart(2, '0');
    this.text(`Crew A ${Math.round(s.teams[0].score)}  heat ${s.teams[0].heat}`, 12, 24, TEAM_COLORS[0]!, 16);
    this.text(`${mm}:${ss}  ${s.round.phase}  round ${s.round.index + 1}`, this.canvas.width / 2 - 90, 24, '#fff', 16);
    this.text(`Crew B ${Math.round(s.teams[1].score)}  heat ${s.teams[1].heat}`, this.canvas.width - 200, 24, TEAM_COLORS[1]!, 16);
    s.tickets.forEach((t, i) => {
      const age = (s.tick - t.spawnTick) / (t.expireTick - t.spawnTick);
      const x = 12 + i * 120;
      this.ctx.fillStyle = t.isCritic ? '#c9a227' : '#2f333d';
      this.ctx.fillRect(x, 36, 112, 28);
      this.ctx.fillStyle = '#4ea36b';
      this.ctx.fillRect(x, 60, 112 * (1 - age), 4);
      this.text(t.recipe, x + 6, 55, '#fff', 13);
    });
  }

  private item(it: Item, x: number, y: number) {
    if (it.type === 'plate') {
      this.dot(x, y, 11, it.dirty ? '#776' : it.cold ? '#9cc4ff' : '#eee');
      it.contents.forEach((f, i) => this.dot(x - 6 + i * 6, y, 4, FOOD_COLORS[f.kind] ?? '#fff'));
    } else {
      this.dot(x, y, it.state === 'chopped' ? 6 : 8, it.state === 'burnt' ? '#222' : FOOD_COLORS[it.kind] ?? '#fff');
      if (it.state === 'cooked') this.text('c', x - 3, y + 4, '#000', 10);
    }
  }
  private dot(x: number, y: number, r: number, color: string) {
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(x, y, r, 0, Math.PI * 2);
    this.ctx.fill();
  }
  private text(t: string, x: number, y: number, color: string, size: number) {
    this.ctx.fillStyle = color;
    this.ctx.font = `${size}px system-ui, sans-serif`;
    this.ctx.fillText(t, x, y);
  }
}
