import type { PlayerState } from '@line-war/sim';
import { FONTS, PALETTE, TEAMS, WORLD } from '../../art/tokens';
import { withAlpha } from '../palette';
import type { Ctx, SpriteCache } from '../sprites';
import { circle, ellipse, fill, glow, rrect, starPath, stroke, TAU } from './draw';
import { CHARM_SCALE, drawItem } from './food';
import { drawCharm, drawCharmAura } from './charm';

/**
 * Round chefs seen from above in 3/4: crew-coloured body and bandana (Jade dots / Ember stripes),
 * little hands carrying the item in front, eyes that show facing, a soft shadow, walk bob,
 * squash & stretch on dash with a motion trail, dizzy stars when dazed and a small P1-P4 tag.
 */

/** Per-player animation memory kept by the renderer (never in sim state). */
export interface ChefAnim {
  walk: number;
  x: number;
  y: number;
  speed: number;
  /** Renderer time the last dash ended (landing squash). */
  landAt: number;
  dashing: boolean;
  /** Renderer time the player was last knocked (impact squash). */
  hitAt: number;
  dazed: boolean;
  /** Renderer time this chef last served a plate (serve hop). */
  hopAt: number;
}

/**
 * Screen y of a point drawn at body-space `py` once the chef is lifted (hop) and squashed about
 * the feet, so overlays (dizzy stars, refusal badge) ride the hop instead of floating behind.
 */
export function riderY(py: number, feetY: number, lift: number, squash: number): number {
  return feetY + (py - feetY) * (1 - squash) - lift;
}

export const newChefAnim = (): ChefAnim => ({ walk: 0, x: NaN, y: NaN, speed: 0, landAt: -1e9, dashing: false, hitAt: -1e9, dazed: false, hopAt: -1e9 });

export interface ChefCtx {
  T: number;
  now: number;
  radius: number;
  reducedMotion: boolean;
  sprites: SpriteCache;
  /** 0..1 dash cooldown remaining. */
  cooldown: number;
  /** ms since a serve was refused, or Infinity. */
  refusedAge: number;
  /** Hop lift in px (serve hop, victory bounce); the shadow stays on the ground. */
  lift?: number;
  /** Extra squash (+) / stretch (-) about the feet. */
  squash?: number;
  /** A local human player: gets the lantern ring under their feet. */
  you?: boolean;
  /** 0..1 opacity of the bobbing arrow over a local human's head. */
  youArrow?: number;
  /** Colour-blind shapes: crew glyphs (Jade circle, Ember diamond) on the tag and the ring. */
  shapes?: boolean;
}

/** Crew glyph path: Jade = circle, Ember = diamond. Shapes carry crew identity without colour. */
export function crewGlyph(ctx: Ctx, team: number, x: number, y: number, r: number): void {
  ctx.beginPath();
  if (team === 0) ctx.arc(x, y, r, 0, TAU);
  else {
    ctx.moveTo(x, y - r * 1.2);
    ctx.lineTo(x + r * 1.05, y);
    ctx.lineTo(x, y + r * 1.2);
    ctx.lineTo(x - r * 1.05, y);
    ctx.closePath();
  }
}

/** Ground marker path under a chef: an ellipse for Jade, a flat diamond for Ember (with shapes on). */
function groundMark(ctx: Ctx, team: number, shapes: boolean, x: number, y: number, rx: number, ry: number): void {
  ctx.beginPath();
  if (!shapes || team === 0) ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  else {
    ctx.moveTo(x, y - ry * 1.15);
    ctx.lineTo(x + rx * 1.1, y);
    ctx.lineTo(x, y + ry * 1.15);
    ctx.lineTo(x - rx * 1.1, y);
    ctx.closePath();
  }
}

function unit(v: { x: number; y: number }): { x: number; y: number } {
  const l = Math.hypot(v.x, v.y);
  return l > 1e-6 ? { x: v.x / l, y: v.y / l } : { x: 0, y: 1 };
}

function silhouette(ctx: Ctx, x: number, y: number, R: number): void {
  ctx.beginPath();
  ctx.ellipse(x, y - R * 0.15, R * 0.9, R * 0.78, 0, 0, TAU);
  ctx.moveTo(x + R * 0.6, y - R * 0.93);
  ctx.arc(x, y - R * 0.93, R * 0.6, 0, TAU);
}

function hand(ctx: Ctx, x: number, y: number, R: number): void {
  circle(ctx, x, y, R * 0.2);
  fill(ctx, WORLD.skin);
  circle(ctx, x, y, R * 0.2);
  stroke(ctx, withAlpha(PALETTE.ink, 0.55), 1.2);
}

/**
 * 'body' is depth-sorted with the counters (feet tuck behind a counter in front); 'front' holds
 * what must never be hidden (hands + carried item, dizzy stars, refusal badge, P tag) and is drawn
 * after the whole world. 'all' does both.
 */
export type ChefPass = 'all' | 'body' | 'front';

const TAG_TEXT = ['P1', 'P2', 'P3', 'P4'];

export function drawChef(ctx: Ctx, c: ChefCtx, p: PlayerState, x: number, y: number, anim: ChefAnim, pass: ChefPass = 'all'): void {
  const bodyPass = pass !== 'front';
  const frontPass = pass !== 'body';
  const { T, now } = c;
  const R = c.radius;
  const team = TEAMS[p.team];
  const f = unit(p.facing);
  const perp = { x: -f.y, y: f.x };
  const dashing = p.dashTicks > 0;
  const dazed = p.dazedTicks > 0;
  const moving = anim.speed > 0.3;
  const reduced = c.reducedMotion;
  const bob = moving && !reduced ? Math.abs(Math.sin(anim.walk)) * R * 0.16 : 0;
  const feetY = y + R * 0.55;
  const overhead = p.holding?.type === 'charm';

  // Dash trail: fading ghosts back along the dash.
  if (bodyPass && dashing) {
    const d = unit(p.dashDir);
    for (let k = 3; k >= 1; k--) {
      silhouette(ctx, x - d.x * R * 0.75 * k, y - d.y * R * 0.75 * k, R * (1 - k * 0.08));
      fill(ctx, withAlpha(team.light, 0.32 - k * 0.08));
    }
    ctx.strokeStyle = withAlpha(PALETTE.paper, 0.55);
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (const o of [-0.5, 0.1, 0.6]) {
      const sx = x - d.x * R * 1.3 + perp.x * o * R;
      const sy = y - R * 0.3 - d.y * R * 1.3 + perp.y * o * R;
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx - d.x * R * (1.2 + Math.abs(o)), sy - d.y * R * (1.2 + Math.abs(o)));
    }
    ctx.stroke();
    ctx.lineCap = 'butt';
  }

  // "You" marker: a warm lantern pool and ring under a local human's feet.
  if (bodyPass && c.you) {
    const pulse = reduced ? 0.5 : 0.5 + 0.5 * Math.sin(now / 260);
    glow(ctx, x, feetY, R * 1.7, PALETTE.lantern, 0.22 + 0.08 * pulse, 0.45);
    groundMark(ctx, p.team, !!c.shapes, x, feetY, R * (1.22 + 0.05 * pulse), R * (0.54 + 0.02 * pulse));
    stroke(ctx, withAlpha(PALETTE.nightDeep, 0.55), 4.5);
    groundMark(ctx, p.team, !!c.shapes, x, feetY, R * (1.22 + 0.05 * pulse), R * (0.54 + 0.02 * pulse));
    stroke(ctx, PALETTE.lantern, 2.4);
  }

  // Ground shadow + dash cooldown arc traced round it.
  if (bodyPass) {
      ellipse(ctx, x + R * 0.12, feetY, R * 0.95 * (1 - bob / R), R * 0.38);
      fill(ctx, withAlpha(PALETTE.nightDeep, 0.42));
    }
    if (bodyPass && c.cooldown > 0) {
      ctx.beginPath();
      ctx.ellipse(x, feetY, R * 1.05, R * 0.46, 0, -Math.PI / 2, -Math.PI / 2 + TAU * c.cooldown);
      stroke(ctx, withAlpha(team.light, 0.45), 1.6);
    }

    ctx.save();
    const lift = c.lift ?? 0;
    // Squash about the feet (landing, knock impact, serve hop); overlays reuse it via riderY.
    const land = Math.max(0, 1 - (now - anim.landAt) / 160);
    const hit = Math.max(0, 1 - (now - anim.hitAt) / 260);
    const squash = dashing || reduced ? 0 : Math.max(land * 0.16, hit * 0.24) + (c.squash ?? 0);
    if (lift > 0) ctx.translate(0, -lift);
    if (p.knockImmuneTicks > 0 && !dazed) ctx.globalAlpha = reduced ? 0.75 : 0.6 + 0.4 * (Math.floor(now / 90) % 2);
    // Squash & stretch about the feet.
    ctx.translate(x, feetY);
    if (dashing) {
      const d = unit(p.dashDir);
      const a = Math.atan2(d.y, d.x);
      ctx.rotate(a);
      ctx.scale(1.24, 0.82);
      ctx.rotate(-a);
    } else {
      if (squash !== 0) ctx.scale(1 + squash, 1 - squash);
      if (moving && !reduced) ctx.rotate(f.x * 0.07);
    }
    ctx.translate(-x, -feetY);

    const bodyY = y - R * 0.15 - bob;
    const headY = bodyY - R * 0.78;
    const away = f.y < -0.35;

    const drawHands = () => {
      const work = p.working && !reduced ? Math.sin(now / 65) * R * 0.22 : 0;
      if (p.holding?.type === 'charm') {
        // A charm is held high over the head with both hands, glowing, so everyone sees who has it.
        const rc = T * 0.22 * CHARM_SCALE;
        const sway = reduced ? 0 : Math.sin(now / 240 + p.id) * R * 0.08;
        const cx = x + sway;
        const cy = headY - R * 0.95 - rc * 1.35;
        drawCharmAura(ctx, p.holding.variant, cx, cy, rc, { now, reducedMotion: reduced, seed: p.holding.id, strength: 1.15 });
        drawCharm(ctx, c.sprites, p.holding.variant, cx, cy, rc);
        hand(ctx, cx - rc * 1.02, cy + rc * 0.42, R);
        hand(ctx, cx + rc * 1.02, cy + rc * 0.42, R);
        return;
      }
      if (p.holding) {
        const ix = x + f.x * R * 0.95;
        const iy = bodyY + f.y * R * 0.7 - R * 0.22;
        drawItem(ctx, c.sprites, p.holding, ix, iy, T * 0.22);
        hand(ctx, ix + perp.x * R * 0.62, iy + perp.y * R * 0.5 + R * 0.12, R);
        hand(ctx, ix - perp.x * R * 0.62, iy - perp.y * R * 0.5 + R * 0.12, R);
      } else {
        const swing = moving && !reduced ? Math.sin(anim.walk) * R * 0.22 : 0;
        for (const s of [-1, 1]) {
          const reach = p.working ? R * 0.85 + work * s : R * 0.25 + swing * s;
          hand(ctx, x + perp.x * s * R * 0.78 + f.x * reach, bodyY + perp.y * s * R * 0.6 + f.y * reach * 0.7 + R * 0.12, R);
        }
      }
    };

    if (bodyPass) {
    if (away && !overhead) drawHands();

    // Body: crew colour, shaded from the upper left, paper apron with crew trim.
    ellipse(ctx, x, bodyY, R * 0.9, R * 0.78);
    fill(ctx, team.main);
    ctx.save();
    ellipse(ctx, x, bodyY, R * 0.9, R * 0.78);
    ctx.clip();
    ellipse(ctx, x + R * 0.4, bodyY + R * 0.35, R * 0.9, R * 0.7);
    fill(ctx, withAlpha(team.dark, 0.55));
    ellipse(ctx, x - R * 0.32, bodyY - R * 0.38, R * 0.5, R * 0.3);
    fill(ctx, withAlpha(team.light, 0.5));
    if (!away) {
      const ax = x + f.x * R * 0.28;
      const ay = bodyY + R * 0.18;
      rrect(ctx, ax - R * 0.42, ay - R * 0.3, R * 0.84, R * 0.8, R * 0.25);
      fill(ctx, withAlpha(PALETTE.paper, 0.92));
      ctx.fillStyle = team.main;
      if (p.team === 0) {
        for (let k = 0; k < 3; k++) {
          circle(ctx, ax - R * 0.26 + k * R * 0.26, ay + R * 0.4, R * 0.1);
          fill(ctx, team.main);
        }
      } else {
        ctx.beginPath();
        ctx.moveTo(ax - R * 0.42, ay + R * 0.32);
        for (let k = 0; k < 4; k++) {
          ctx.lineTo(ax - R * 0.32 + k * R * 0.21, ay + R * 0.46);
          ctx.lineTo(ax - R * 0.21 + k * R * 0.21, ay + R * 0.32);
        }
        ctx.lineTo(ax + R * 0.42, ay + R * 0.5);
        ctx.lineTo(ax - R * 0.42, ay + R * 0.5);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
    ellipse(ctx, x, bodyY, R * 0.9, R * 0.78);
    stroke(ctx, withAlpha(PALETTE.ink, 0.6), 1.6);

    // Head.
    circle(ctx, x, headY, R * 0.6);
    fill(ctx, WORLD.skin);
    ctx.save();
    circle(ctx, x, headY, R * 0.6);
    ctx.clip();
    circle(ctx, x + R * 0.25, headY + R * 0.25, R * 0.55);
    fill(ctx, withAlpha(WORLD.skinShade, 0.5));
    // Bandana cap: covers the top of the head (all of it seen from behind).
    const capY = away ? headY + R * 0.18 : headY - R * 0.2 - Math.max(0, f.y) * R * 0.06;
    ctx.beginPath();
    ctx.rect(x - R, headY - R, R * 2, capY - (headY - R));
    fill(ctx, team.dark);
    ctx.fillStyle = withAlpha(PALETTE.paper, 0.8);
    if (p.team === 0) {
      for (const [dx, dy] of [
        [-0.3, -0.35],
        [0.1, -0.45],
        [0.35, -0.2],
        [-0.05, -0.15],
      ] as const) {
        if (headY + dy * R < capY - 1) {
          circle(ctx, x + dx * R, headY + dy * R, R * 0.07);
          fill(ctx, withAlpha(PALETTE.paper, 0.8));
        }
      }
    } else {
      ctx.strokeStyle = withAlpha(PALETTE.paper, 0.75);
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(x - R * 0.6, capY - R * 0.18);
      for (let k = 0; k < 6; k++) ctx.lineTo(x - R * 0.5 + k * R * 0.2, capY - R * (k % 2 === 0 ? 0.32 : 0.18));
      ctx.stroke();
    }
    ctx.fillStyle = withAlpha(PALETTE.nightDeep, 0.25);
    ctx.fillRect(x - R, capY - 1.2, R * 2, 1.4);
    ctx.restore();
    circle(ctx, x, headY, R * 0.6);
    stroke(ctx, withAlpha(PALETTE.ink, 0.6), 1.4);
    // Knot tails trail behind the facing direction and flutter when moving.
    const flap = moving && !reduced ? Math.sin(anim.walk * 2) * 0.35 : 0;
    const kx = x - f.x * R * 0.5;
    const ky = headY - f.y * R * 0.35 - R * 0.1;
    for (const s of [-1, 1]) {
      const a = Math.atan2(-f.y, -f.x) + s * 0.45 + flap * s;
      ctx.beginPath();
      ctx.moveTo(kx, ky);
      const len = away ? 0.36 : 0.6;
      ctx.quadraticCurveTo(kx + Math.cos(a) * R * len * 0.6 + perp.x * s * 2, ky + Math.sin(a) * R * len * 0.6, kx + Math.cos(a) * R * len, ky + Math.sin(a) * R * len);
      ctx.lineCap = 'round';
      stroke(ctx, team.dark, R * 0.16);
      ctx.lineCap = 'butt';
    }
    circle(ctx, kx, ky, R * 0.13);
    fill(ctx, team.dark);

    // Face (hidden when facing away).
    if (!away) {
      const ex = x + f.x * R * 0.3;
      const ey = headY + R * 0.14 + Math.max(0, f.y) * R * 0.06;
      const sp = R * 0.2 * (1 - Math.abs(f.x) * 0.4);
      ctx.strokeStyle = PALETTE.ink;
      ctx.fillStyle = PALETTE.ink;
      if (dazed) {
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        for (const s of [-1, 1]) {
          const cx = ex + s * sp;
          ctx.moveTo(cx - 2.2, ey - 2.2);
          ctx.lineTo(cx + 2.2, ey + 2.2);
          ctx.moveTo(cx + 2.2, ey - 2.2);
          ctx.lineTo(cx - 2.2, ey + 2.2);
        }
        ctx.stroke();
      } else {
        const blink = !reduced && (now + p.id * 1300) % 3400 < 110;
        for (const s of [-1, 1]) {
          if (blink) ctx.fillRect(ex + s * sp - 2, ey - 0.6, 4, 1.4);
          else {
            ellipse(ctx, ex + s * sp, ey, R * 0.09, R * 0.13);
            fill(ctx, PALETTE.ink);
            circle(ctx, ex + s * sp - R * 0.03, ey - R * 0.05, R * 0.035);
            fill(ctx, PALETTE.paper);
          }
        }
        if (f.y > -0.1) {
          for (const s of [-1, 1]) {
            ellipse(ctx, ex + s * sp * 1.7, ey + R * 0.16, R * 0.09, R * 0.055);
            fill(ctx, withAlpha(WORLD.tomatoLight, 0.55));
          }
        }
      }
    }

  }
  if (frontPass && (!away || overhead)) drawHands();
  ctx.restore();
  if (!frontPass) return;

  // "You" arrow: a lantern-gold chevron bobbing over a local human's head.
  const arrow = c.youArrow ?? 0;
  if (arrow > 0.01) {
    const bobA = reduced ? 0 : Math.sin(now / 170) * R * 0.18;
    const ay = y - R * (overhead ? 5.3 : 2.55) - lift + bobA;
    const aw = R * 0.5;
    ctx.save();
    ctx.globalAlpha = arrow;
    ctx.beginPath();
    ctx.moveTo(x - aw, ay - aw * 0.75);
    ctx.lineTo(x + aw, ay - aw * 0.75);
    ctx.lineTo(x, ay + aw * 0.55);
    ctx.closePath();
    ctx.lineJoin = 'round';
    stroke(ctx, PALETTE.ink, 5);
    fill(ctx, PALETTE.lantern);
    ctx.lineJoin = 'miter';
    ctx.restore();
  }

  // Dizzy stars.
  if (dazed) {
    for (let k = 0; k < 3; k++) {
      const a = (reduced ? 0 : now / 220) + (k * TAU) / 3;
      const sx = x + Math.cos(a) * R * 0.8;
      const sy = riderY(headY - R * 0.75, feetY, lift, squash) + Math.sin(a) * R * 0.28;
      starPath(ctx, sx, sy, R * 0.24, R * 0.1, a);
      fill(ctx, PALETTE.lantern);
      stroke(ctx, PALETTE.ink, 1);
    }
  }

  // Serve refused: a red cross pops over the head.
  if (c.refusedAge < 600) {
    const k = Math.min(1, c.refusedAge / 90);
    const bx = x;
    const by = riderY(headY - R * 1.05, feetY, lift, squash);
    const r = R * 0.38 * (0.6 + 0.4 * k);
    circle(ctx, bx, by, r);
    fill(ctx, PALETTE.danger);
    circle(ctx, bx, by, r);
    stroke(ctx, PALETTE.paper, 1.6);
    ctx.strokeStyle = PALETTE.paper;
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(bx - r * 0.4, by - r * 0.4);
    ctx.lineTo(bx + r * 0.4, by + r * 0.4);
    ctx.moveTo(bx + r * 0.4, by - r * 0.4);
    ctx.lineTo(bx - r * 0.4, by + r * 0.4);
    ctx.stroke();
    ctx.lineCap = 'butt';
  }

  // Player tag at the feet: Jade = rounded pill, Ember = pointed tag.
  const tx = x;
  const ty = feetY + R * 0.62;
  const glyph = !!c.shapes;
  const tw = R * (glyph ? 1.6 : 1.15);
  const th = R * 0.62;
  ctx.beginPath();
  if (p.team === 0) {
    ctx.roundRect(tx - tw / 2, ty - th / 2, tw, th, th / 2);
  } else {
    ctx.moveTo(tx - tw / 2 - 3, ty);
    ctx.lineTo(tx - tw / 2 + 2, ty - th / 2);
    ctx.lineTo(tx + tw / 2 - 2, ty - th / 2);
    ctx.lineTo(tx + tw / 2 + 3, ty);
    ctx.lineTo(tx + tw / 2 - 2, ty + th / 2);
    ctx.lineTo(tx - tw / 2 + 2, ty + th / 2);
    ctx.closePath();
  }
  fill(ctx, withAlpha(team.dark, 0.88));
  if (c.you) stroke(ctx, PALETTE.lantern, 1.6);
  ctx.font = `800 ${Math.round(R * 0.52)}px ${FONTS.ui}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = c.you ? PALETTE.lantern : PALETTE.paper;
  const textX = glyph ? tx + R * 0.2 : tx;
  ctx.fillText(TAG_TEXT[p.id] ?? '', textX, ty + 0.5);
  if (glyph) {
    crewGlyph(ctx, p.team, tx - tw / 2 + R * 0.34, ty, R * 0.15);
    fill(ctx, PALETTE.paper);
  }
}
