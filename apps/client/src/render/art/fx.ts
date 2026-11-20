import type { TeamId } from '@line-war/sim';
import { FONTS, PALETTE, TEAMS, WORLD } from '../../art/tokens';
import { effectAge, type BurstKind, type Effect } from '../effects';
import { withAlpha } from '../palette';
import type { Ctx } from '../sprites';
import { circle, ellipse, fill, glow, outlined, starPath, stroke, TAU } from './draw';

/** Particles (steam, smoke, embers, confetti, fireflies) and world-space effect drawing. */

export type ParticleKind = 'steam' | 'smoke' | 'ember' | 'spark' | 'chip' | 'bubble' | 'confetti' | 'firefly' | 'twinkle';

interface Particle {
  k: ParticleKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  g: number;
  drag: number;
  age: number;
  life: number;
  size: number;
  grow: number;
  color: string;
  rot: number;
  vr: number;
}

const MAX_PARTICLES = 420;

/** Particle pool with its own deterministic random stream (the sim's RNG is never touched). */
export class Particles {
  private list: Particle[] = [];
  private seed = 12345;
  private acc = new Map<string, number>();

  get count(): number {
    return this.list.length;
  }

  rand(): number {
    this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }

  private range(a: number, b: number): number {
    return a + (b - a) * this.rand();
  }

  clear(): void {
    this.list = [];
    this.acc.clear();
  }

  add(p: Partial<Particle> & Pick<Particle, 'k' | 'x' | 'y' | 'life' | 'size' | 'color'>): void {
    if (this.list.length >= MAX_PARTICLES) this.list.shift();
    this.list.push({ vx: 0, vy: 0, g: 0, drag: 0, age: 0, grow: 0, rot: 0, vr: 0, ...p });
  }

  /** Emit `rate` particles per second for a continuous source identified by `key`. */
  emit(key: string, rate: number, dt: number, spawn: () => void): void {
    let a = (this.acc.get(key) ?? this.rand()) + rate * dt;
    while (a >= 1) {
      spawn();
      a -= 1;
    }
    this.acc.set(key, a);
  }

  update(dt: number): void {
    // Compact in place so a frame allocates nothing.
    const list = this.list;
    let n = 0;
    for (const p of list) {
      p.age += dt;
      if (p.age >= p.life) continue;
      const d = Math.max(0, 1 - p.drag * dt);
      p.vx *= d;
      p.vy = p.vy * d + p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      list[n++] = p;
    }
    list.length = n;
  }

  /** Victory confetti raining from the top edge across [x0, x0 + w] in the crew's colours. */
  celebrate(x0: number, y: number, w: number, team: TeamId): void {
    const c = TEAMS[team];
    const r = this.rand();
    const color = r < 0.4 ? c.main : r < 0.65 ? c.light : r < 0.85 ? PALETTE.lantern : PALETTE.paper;
    this.add({ k: 'confetti', x: x0 + this.rand() * w, y, vx: this.range(-30, 30), vy: this.range(20, 70), g: 70, drag: 0.6, life: this.range(2.4, 3.4), size: this.range(3.5, 6), color, rot: this.range(0, TAU), vr: this.range(-9, 9) });
  }

  // ---- emitters (positions in logical px; T = tile size) ----

  steam(x: number, y: number, T: number): void {
    this.add({ k: 'steam', x: x + this.range(-0.2, 0.2) * T, y, vx: this.range(-4, 4), vy: -this.range(14, 24), life: this.range(1.1, 1.7), size: T * 0.08, grow: T * 0.12, color: PALETTE.paper, rot: this.range(0, TAU) });
  }

  smoke(x: number, y: number, T: number, dark = true): void {
    this.add({ k: 'smoke', x: x + this.range(-0.18, 0.18) * T, y, vx: this.range(-6, 6), vy: -this.range(16, 28), life: this.range(1.2, 1.9), size: T * 0.1, grow: T * 0.22, color: dark ? PALETTE.ink : PALETTE.steel, rot: this.range(0, TAU) });
  }

  ember(x: number, y: number, T: number): void {
    this.add({ k: 'ember', x: x + this.range(-0.3, 0.3) * T, y, vx: this.range(-10, 10), vy: -this.range(30, 60), drag: 0.6, life: this.range(0.6, 1.2), size: this.range(1, 2.2), color: this.rand() < 0.5 ? PALETTE.lantern : PALETTE.lanternHot, rot: this.range(0, TAU), vr: this.range(-3, 3) });
  }

  burst(kind: BurstKind, x: number, y: number, T: number, team: TeamId | null): void {
    switch (kind) {
      case 'knock':
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * TAU + this.range(-0.15, 0.15);
          const sp = this.range(140, 240);
          this.add({ k: 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, drag: 6, life: 0.32, size: this.range(5, 9), color: i % 3 === 0 ? PALETTE.paper : PALETTE.lantern, rot: a });
        }
        for (let i = 0; i < 4; i++) {
          const a = this.range(0, TAU);
          this.add({ k: 'twinkle', x, y: y - T * 0.3, vx: Math.cos(a) * 60, vy: Math.sin(a) * 60 - 40, g: 120, drag: 2, life: 0.7, size: this.range(4, 6), color: PALETTE.lantern, rot: a, vr: 6 });
        }
        return;
      case 'serve': {
        const c = team !== null ? TEAMS[team] : null;
        const colors = [c?.main ?? PALETTE.lantern, c?.light ?? PALETTE.paper, PALETTE.lantern, PALETTE.paper];
        for (let i = 0; i < 26; i++) {
          const a = -Math.PI / 2 + this.range(-1.1, 1.1);
          const sp = this.range(90, 220);
          this.add({ k: 'confetti', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 260, drag: 1.8, life: this.range(0.9, 1.4), size: this.range(3, 5.5), color: colors[i % colors.length]!, rot: this.range(0, TAU), vr: this.range(-12, 12) });
        }
        for (let i = 0; i < 5; i++) {
          this.add({ k: 'twinkle', x: x + this.range(-0.6, 0.6) * T, y: y + this.range(-0.5, 0.2) * T, vy: -20, life: this.range(0.5, 0.9), size: this.range(4, 7), color: PALETTE.lantern, vr: 4 });
        }
        return;
      }
      case 'chop':
        for (let i = 0; i < 8; i++) {
          const a = -Math.PI / 2 + this.range(-1.3, 1.3);
          this.add({ k: 'chip', x, y, vx: Math.cos(a) * this.range(40, 90), vy: Math.sin(a) * this.range(60, 110), g: 380, life: 0.55, size: this.range(2, 3.5), color: i % 2 ? WORLD.woodLight : WORLD.lettuceLight, rot: this.range(0, TAU), vr: this.range(-14, 14) });
        }
        return;
      case 'wash':
        for (let i = 0; i < 9; i++) {
          this.add({ k: 'bubble', x: x + this.range(-0.3, 0.3) * T, y: y + this.range(-0.1, 0.2) * T, vx: this.range(-12, 12), vy: -this.range(25, 55), drag: 1, life: this.range(0.5, 0.9), size: this.range(2, 4.5), color: PALETTE.paper });
        }
        return;
      case 'cook':
        for (let i = 0; i < 6; i++) {
          this.add({ k: 'twinkle', x: x + this.range(-0.4, 0.4) * T, y: y + this.range(-0.4, 0.1) * T, vy: -25, life: this.range(0.5, 0.8), size: this.range(3.5, 6), color: PALETTE.lantern, vr: 4 });
        }
        return;
      case 'fire':
        for (let i = 0; i < 14; i++) this.ember(x, y, T);
        return;
      case 'smoke':
        for (let i = 0; i < 6; i++) this.smoke(x, y - T * 0.1, T, false);
        return;
    }
  }

  fireflies(n: number, x0: number, y0: number, w: number, h: number): void {
    let have = 0;
    for (const p of this.list) if (p.k === 'firefly') have++;
    for (let i = have; i < n; i++) {
      this.add({ k: 'firefly', x: x0 + this.rand() * w, y: y0 + this.rand() * h, vx: this.range(-8, 8), vy: this.range(-6, 6), life: this.range(5, 9), size: this.range(1.2, 2), color: PALETTE.lantern, rot: this.range(0, TAU), vr: this.range(-1, 1) });
    }
    // Gentle wander.
    for (const p of this.list) {
      if (p.k !== 'firefly') continue;
      p.vx += Math.cos(p.rot) * 0.3;
      p.vy += Math.sin(p.rot) * 0.3;
      p.vx = Math.max(-10, Math.min(10, p.vx));
      p.vy = Math.max(-8, Math.min(8, p.vy));
    }
  }

  draw(ctx: Ctx): void {
    for (const p of this.list) {
      const t = p.age / p.life;
      const fade = 1 - t;
      const r = p.size + p.grow * t;
      switch (p.k) {
        case 'steam':
          circle(ctx, p.x + Math.sin(p.rot + p.age * 3) * 3, p.y, r);
          fill(ctx, withAlpha(p.color, 0.16 * fade * Math.min(1, t * 6)));
          break;
        case 'smoke':
          circle(ctx, p.x + Math.sin(p.rot + p.age * 2) * 4, p.y, r);
          fill(ctx, withAlpha(p.color, 0.38 * fade * Math.min(1, t * 5)));
          break;
        case 'ember':
          circle(ctx, p.x + Math.sin(p.rot + p.age * 9) * 2, p.y, r * (0.6 + 0.4 * fade));
          fill(ctx, withAlpha(p.color, fade));
          break;
        case 'spark': {
          const len = p.size * fade * 2;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - Math.cos(p.rot) * len, p.y - Math.sin(p.rot) * len);
          ctx.lineCap = 'round';
          stroke(ctx, withAlpha(p.color, fade), 3 * fade + 1);
          ctx.lineCap = 'butt';
          break;
        }
        case 'chip':
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = withAlpha(p.color, Math.min(1, fade * 2));
          ctx.fillRect(-r, -r * 0.5, r * 2, r);
          ctx.restore();
          break;
        case 'bubble':
          circle(ctx, p.x, p.y, r);
          stroke(ctx, withAlpha(p.color, 0.85 * fade), 1.2);
          circle(ctx, p.x - r * 0.35, p.y - r * 0.35, r * 0.25);
          fill(ctx, withAlpha(p.color, fade));
          break;
        case 'confetti':
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.scale(1, Math.abs(Math.cos(p.rot * 1.7)) * 0.8 + 0.2);
          ctx.fillStyle = withAlpha(p.color, Math.min(1, fade * 3));
          ctx.fillRect(-r, -r * 0.6, r * 2, r * 1.2);
          ctx.restore();
          break;
        case 'firefly': {
          const a = Math.min(1, t * 4, fade * 4) * (0.55 + 0.45 * Math.sin(p.age * 2.4 + p.rot * 5));
          glow(ctx, p.x, p.y, p.size * 6, p.color, 0.22 * a);
          circle(ctx, p.x, p.y, p.size);
          fill(ctx, withAlpha(PALETTE.paper, 0.9 * a));
          break;
        }
        case 'twinkle': {
          const s = r * Math.sin(Math.PI * t);
          starPath(ctx, p.x, p.y, s, s * 0.28, p.rot, 4);
          fill(ctx, withAlpha(p.color, 1));
          break;
        }
      }
    }
  }
}

/** Draw one world-space effect (positions in logical px). */
export function drawEffect(ctx: Ctx, e: Effect, x: number, y: number, T: number, now: number): void {
  const age = effectAge(e, now);
  switch (e.kind) {
    case 'flash': {
      if (age < 0.12) {
        // Impact frame: a hard white-gold disc for a couple of frames.
        circle(ctx, x, y - T * 0.2, T * 0.55);
        fill(ctx, withAlpha(PALETTE.paper, 0.9));
      }
      circle(ctx, x, y - T * 0.2, T * (0.35 + age * 0.9));
      stroke(ctx, withAlpha(e.color, 1 - age), 5 * (1 - age) + 1);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, x, y - T * 0.2, T * (0.6 + age), e.color, 0.45 * (1 - age));
      ctx.restore();
      break;
    }
    case 'ring':
      circle(ctx, x, y - T * 0.17, T * (0.3 + age * 0.45));
      stroke(ctx, withAlpha(e.color, 1 - age), 5 * (1 - age) + 1);
      break;
    case 'popup': {
      const score = e.text?.startsWith('+') ?? false;
      // Anticipation -> overshoot -> settle, then rise and fade.
      const pop = age < 0.12 ? 0.4 + (age / 0.12) * 0.9 : age < 0.28 ? 1.3 - ((age - 0.12) / 0.16) * 0.3 : 1;
      const rise = T * (0.45 + age * (score ? 1.1 : 0.7));
      const alpha = age < 0.7 ? 1 : 1 - (age - 0.7) / 0.3;
      ctx.save();
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.translate(x, y - rise);
      ctx.scale(pop, pop);
      if (score) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        glow(ctx, 0, 0, T * 0.9, e.color, 0.35);
        ctx.restore();
        outlined(ctx, e.text ?? '', 0, 0, e.color, Math.round(T * 0.62), FONTS.display, PALETTE.ink);
      } else {
        ctx.font = `800 ${Math.round(T * 0.34)}px ${FONTS.ui}`;
        const w = ctx.measureText(e.text ?? '').width + T * 0.36;
        ctx.beginPath();
        ctx.roundRect(-w / 2, -T * 0.22, w, T * 0.44, T * 0.22);
        fill(ctx, withAlpha(PALETTE.ink, 0.88));
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = e.color;
        ctx.fillText(e.text ?? '', 0, 1);
      }
      ctx.restore();
      break;
    }
    case 'smoke':
      ellipse(ctx, x, y, T * 0.4 * (1 - age), T * 0.2 * (1 - age));
      fill(ctx, withAlpha(e.color, 0.2 * (1 - age)));
      break;
    default:
      break;
  }
}
