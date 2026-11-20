// @vitest-environment jsdom
import { INGREDIENTS, LEVEL_CHARMS, NIGHT_MARKET, RECIPES } from '@line-war/content';
import { createMatch, makeConfig, secondsToTicks, type MatchState, type SimEvent } from '@line-war/sim';
import { afterEach, describe, expect, it } from 'vitest';
import { HudRenderer } from '../../src/hud/hud';
import { CALLOUT_MS, heatRaised } from '../../src/hud/charms';
import { CHARM_ROW_MAX, CHARM_TAG_MS } from '../../src/hud/signs';

let hud: HudRenderer | null = null;
afterEach(() => {
  hud?.dispose();
  hud = null;
  document.body.replaceChildren();
});

function match(): MatchState {
  const s = createMatch({ arena: NIGHT_MARKET, recipes: RECIPES, ingredients: INGREDIENTS, charms: LEVEL_CHARMS['night-market'], config: makeConfig({ seed: 3 }) });
  s.round.phase = 'service';
  s.round.tick = secondsToTicks(s.config, 40);
  s.tick = s.round.tick;
  return s;
}

function tick(s: MatchState, events: SimEvent[]): void {
  s.tick++;
  s.round.tick++;
  s.events = events;
}

describe('charm HUD', () => {
  it('calls out a new charm under the clock, then clears it', () => {
    let now = 0;
    hud = new HudRenderer(document.body, { now: () => now, reducedMotion: true });
    const s = match();
    const callout = () => hud!.root.querySelector<HTMLElement>('.lw-charm-callout')!;
    expect(callout().hidden).toBe(true);
    tick(s, [{ type: 'charmSpawned', itemId: 1, tile: 40, variant: 'night-moon' }]);
    hud.onTick(s);
    hud.render(s);
    expect(callout().hidden).toBe(false);
    expect(callout().textContent).toContain('A rare charm appeared!');
    expect(callout().textContent).toContain('Moon Bunny');
    expect(callout().querySelector('svg.lw-charm')).not.toBeNull();
    now = CALLOUT_MS + 10;
    hud.render(s);
    expect(callout().classList.contains('lw-charm-callout--out')).toBe(true);
    now += 400;
    hud.render(s);
    expect(callout().hidden).toBe(true);
  });

  it('a bank lands on the crew sign: "+50" and "Heat up", and the charm joins the row', () => {
    let now = 0;
    hud = new HudRenderer(document.body, { now: () => now, reducedMotion: true });
    const s = match();
    s.teams[0].heat = 1;
    tick(s, [
      { type: 'heatChange', team: 0, heat: 1 },
      { type: 'charmBanked', team: 0, player: 0, itemId: 2, variant: 'night-noodle' },
    ]);
    hud.onTick(s);
    hud.render(s);
    const sign = hud.root.querySelector('.lw-sign.lw-jade')!;
    const tag = sign.querySelector('.lw-sign-charmtag')!;
    expect(tag.querySelector('.lw-sign-charmtag-pts')!.textContent).toBe('+50');
    expect(tag.querySelector('.lw-sign-charmtag-heat')!.textContent).toBe('Heat up');
    expect(sign.querySelectorAll('.lw-sign-charm')).toHaveLength(1);
    expect(hud.bankedCharms(0)).toEqual(['night-noodle']);
    expect(hud.bankedCharms(1)).toEqual([]);
    now = CHARM_TAG_MS + 10;
    hud.render(s);
    expect(sign.querySelector('.lw-sign-charmtag')).toBeNull();
  });

  it('says only "+50" when Heat was already at the top, and collapses a long row into "+n"', () => {
    hud = new HudRenderer(document.body, { now: () => 0, reducedMotion: true });
    const s = match();
    const n = CHARM_ROW_MAX + 2;
    for (let i = 0; i < n; i++) {
      tick(s, [{ type: 'charmBanked', team: 1, player: 2, itemId: 10 + i, variant: 'harbor-fish' }]);
      hud.onTick(s);
    }
    const sign = hud.root.querySelector('.lw-sign.lw-ember')!;
    expect(sign.querySelector('.lw-sign-charmtag-heat')).toBeNull();
    expect(sign.querySelectorAll('.lw-sign-charm')).toHaveLength(CHARM_ROW_MAX);
    expect(sign.querySelector('.lw-sign-charm-more')!.textContent).toBe('+2');
    expect(sign.querySelector('.lw-sign-charms')!.getAttribute('aria-label')).toBe(`Charms banked: ${n}`);
    expect(heatRaised([{ type: 'heatChange', team: 1, heat: 2 }], 1, 2)).toBe(false);
    expect(heatRaised([{ type: 'heatChange', team: 1, heat: 3 }], 1, 2)).toBe(true);
  });

  it('hangs the display charm only from the local crews\' signs', () => {
    hud = new HudRenderer(document.body, { now: () => 0, reducedMotion: true, displayCharms: { 0: 'harbor-lighthouse' } });
    expect(hud.root.querySelector('.lw-jade .lw-sign-display')!.getAttribute('aria-label')).toBe('Display charm: Lighthouse Bunny');
    expect(hud.root.querySelector('.lw-ember .lw-sign-display')).toBeNull();
  });
});
