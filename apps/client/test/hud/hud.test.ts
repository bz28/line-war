// @vitest-environment jsdom
import { INGREDIENTS, NIGHT_MARKET, RECIPES } from '@line-war/content';
import { createMatch, makeConfig, secondsToTicks } from '@line-war/sim';
import type { MatchState, Phase, SimEvent, Ticket } from '@line-war/sim';
import { afterEach, describe, expect, it } from 'vitest';
import { HudRenderer } from '../../src/hud/hud';
import { currentMoment } from '../../src/hud/moments';
import { COUNT_MS } from '../../src/hud/signs';
import { EXIT_MS } from '../../src/hud/slips';

let hud: HudRenderer | null = null;
afterEach(() => {
  hud?.dispose();
  hud = null;
  document.body.replaceChildren();
});

function match(): MatchState {
  const s = createMatch({ arena: NIGHT_MARKET, recipes: RECIPES, ingredients: INGREDIENTS, config: makeConfig({ seed: 3 }) });
  return s;
}

/** Put the round at `seconds` of round time in the given phase. */
function at(s: MatchState, seconds: number, phase: Phase = 'service'): MatchState {
  s.round.tick = secondsToTicks(s.config, seconds);
  s.tick = s.round.tick;
  s.round.phase = phase;
  return s;
}

let nextId = 1000;
function ticket(s: MatchState, recipe: string, extra: Partial<Ticket> = {}): Ticket {
  const life = secondsToTicks(s.config, s.config.tuning.ticketLifetimeSeconds);
  const t: Ticket = {
    id: nextId++,
    recipe,
    spawnTick: s.tick,
    expireTick: s.tick + life,
    baseValue: RECIPES.find((r) => r.id === recipe)!.baseValue,
    isCritic: false,
    visibleTo: null,
    revealAllAtTick: null,
    ...extra,
  };
  s.tickets.push(t);
  return t;
}

function setup(s: MatchState) {
  const clock = { ms: 0 };
  const host = document.createElement('div');
  document.body.append(host);
  hud = new HudRenderer(host, { now: () => clock.ms, reducedMotion: false });
  const frame = (ms = 16) => {
    clock.ms += ms;
    hud!.render(s);
  };
  /** One sim tick that emitted `events`. */
  const tick = (events: SimEvent[] = []) => {
    s.tick++;
    s.round.tick++;
    s.events = events;
    hud!.onTick(s);
    frame();
  };
  const slip = (id: number) => host.querySelector<HTMLElement>(`.lw-slip[data-ticket="${id}"]`);
  return { host, clock, frame, tick, slip };
}

describe('HUD ticket line', () => {
  it('hangs a slip per ticket with name, ingredient icons, value and freshness', () => {
    const s = at(match(), 40);
    const burger = ticket(s, 'burger');
    const soup = ticket(s, 'soup');
    const { host, frame, slip } = setup(s);
    frame();
    expect(host.querySelectorAll('.lw-slip')).toHaveLength(2);
    const b = slip(burger.id)!;
    expect(b.dataset.state).toBe('live');
    expect(b.querySelector('.lw-slip-name')!.textContent).toBe('Burger');
    expect(b.querySelectorAll('.lw-food')).toHaveLength(2);
    expect(b.querySelector('.lw-food')!.getAttribute('aria-label')).toBe('bun');
    expect(b.querySelectorAll('.lw-food')[1]!.getAttribute('aria-label')).toBe('cooked meat');
    expect(b.querySelector('.lw-slip-value')!.textContent).toBe('60');
    expect(b.style.getPropertyValue('--age')).toBe('0');
    expect(slip(soup.id)!.querySelectorAll('.lw-food')).toHaveLength(3);
    // Oldest first, left of the clock.
    expect(b.style.getPropertyValue('--off')).toBe('-4');
    expect(b.style.getPropertyValue('--side')).toBe('-1');
  });

  it('ages a slip: value falls, freshness browns, urgent near expiry', () => {
    const s = at(match(), 40);
    const t = ticket(s, 'burger');
    const { frame, slip } = setup(s);
    frame();
    s.tick = t.spawnTick + Math.round((t.expireTick - t.spawnTick) * 0.9);
    frame();
    const el = slip(t.id)!;
    expect(Number(el.style.getPropertyValue('--age'))).toBeCloseTo(0.9, 2);
    expect(Number(el.querySelector('.lw-slip-value')!.textContent)).toBeLessThan(60);
    expect(el.classList.contains('lw-slip--urgent')).toBe(true);
    expect(el.querySelector('.lw-slip-secs')!.textContent).toBe('6s');
  });

  it('flutters a served slip away in the serving crew colour, then removes it', () => {
    const s = at(match(), 40);
    const t = ticket(s, 'salad');
    const { frame, tick, slip } = setup(s);
    frame();
    s.tickets = [];
    tick([{ type: 'delivered', team: 1, ticketId: t.id, recipe: 'salad', points: 52 }]);
    const el = slip(t.id)!;
    expect(el.dataset.state).toBe('served');
    expect(el.dataset.team).toBe('1');
    expect(el.classList.contains('lw-slip--served')).toBe(true);
    expect(el.querySelector('.lw-slip-stamp')!.textContent).toBe('Ember+52');
    frame(EXIT_MS.served + 1);
    expect(slip(t.id)).toBeNull();
  });

  it('curls and drops an expired slip; a slip that vanishes without an event is cleared', () => {
    const s = at(match(), 40);
    const a = ticket(s, 'salad');
    const b = ticket(s, 'burger');
    const { frame, tick, slip } = setup(s);
    frame();
    s.tickets = [b];
    tick([{ type: 'ticketExpired', ticketId: a.id }]);
    expect(slip(a.id)!.dataset.state).toBe('expired');
    s.tickets = [];
    tick();
    expect(slip(b.id)!.dataset.state).toBe('cleared');
    frame(EXIT_MS.expired + 1);
    expect(slip(a.id)).toBeNull();
    expect(slip(b.id)).toBeNull();
  });

  it('shows a one-crew Critic face-up with a lock tag in that crew colour, then unlocks it', () => {
    const s = at(match(), 120);
    const t = ticket(s, 'steak', { isCritic: true, baseValue: 300, visibleTo: 0, revealAllAtTick: s.tick + secondsToTicks(s.config, 3) });
    const { frame, slip } = setup(s);
    frame();
    const el = slip(t.id)!;
    expect(el.classList.contains('lw-slip--critic')).toBe(true);
    // Face-up for everyone: the recipe is readable during the early window.
    expect(el.querySelector('.lw-slip-name')!.textContent).toBe('Steak');
    expect(el.querySelectorAll('.lw-slip-front .lw-food')).toHaveLength(2);
    expect(el.querySelector('.lw-slip-front .lw-slip-critic')!.textContent).toBe('Critic ×3');
    expect(el.dataset.locked).toBe('true');
    expect(el.dataset.lockTeam).toBe('0');
    expect(el.classList.contains('lw-slip--locked')).toBe(true);
    const lock = el.querySelector('.lw-slip-lock')!;
    expect(lock.querySelector('.lw-slip-lock-name')!.textContent).toBe('Jade only');
    expect(lock.querySelector('.lw-slip-lock-count')!.textContent).toBe('3');
    expect(lock.querySelector('svg')).not.toBeNull();
    s.tick += secondsToTicks(s.config, 1.5);
    frame();
    expect(lock.querySelector('.lw-slip-lock-count')!.textContent).toBe('2');
    t.visibleTo = null;
    t.revealAllAtTick = null;
    frame();
    expect(el.dataset.locked).toBe('false');
    expect(el.dataset.lockTeam).toBeUndefined();
    expect(el.classList.contains('lw-slip--locked')).toBe(false);
    expect(el.querySelector('.lw-slip-front .lw-slip-critic')!.textContent).toBe('Critic ×3');
    expect(slip(t.id)).toBe(el); // unlocked in place, not rebuilt
  });
});

describe('HUD crew signs', () => {
  it('counts the score up after a serve and pops the points', () => {
    const s = at(match(), 40);
    const { host, frame, tick } = setup(s);
    frame();
    const score = host.querySelector('.lw-jade .lw-sign-score')!;
    expect(score.textContent).toBe('0');
    s.teams[0].score = 120;
    tick([{ type: 'delivered', team: 0, ticketId: 1, recipe: 'burger', points: 120 }]);
    expect(host.querySelector('.lw-jade .lw-sign-pop')!.textContent).toBe('+120');
    frame(COUNT_MS / 3);
    const mid = Number(score.textContent);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(120);
    frame(COUNT_MS);
    expect(score.textContent).toBe('120');
    expect(host.querySelector('.lw-ember .lw-sign-score')!.textContent).toBe('0');
  });

  it('shows Heat as lit flames with the multiplier, roaring up and smoking out', () => {
    const s = at(match(), 40);
    const { host, frame } = setup(s);
    frame();
    const sign = host.querySelector<HTMLElement>('.lw-ember')!;
    const flames = () => [...sign.querySelectorAll('.lw-flame')];
    expect(flames().filter((f) => f.classList.contains('lw-lit'))).toHaveLength(0);
    expect(sign.querySelector('.lw-sign-mult')!.textContent).toBe('×1');
    s.teams[1].heat = 2;
    frame();
    expect(sign.dataset.heat).toBe('2');
    expect(flames().map((f) => f.classList.contains('lw-lit'))).toEqual([true, true, false]);
    expect(flames().map((f) => f.classList.contains('lw-roar'))).toEqual([true, true, false]);
    expect(sign.querySelector('.lw-sign-mult')!.textContent).toBe('×1.5');
    s.teams[1].heat = 1;
    frame();
    expect(flames()[1]!.classList.contains('lw-smoke')).toBe(true);
    expect(sign.querySelector('.lw-sign-mult')!.textContent).toBe('×1.25');
    frame(2000);
    expect(flames().some((f) => f.classList.contains('lw-roar') || f.classList.contains('lw-smoke'))).toBe(false);
  });

  it('shows rounds won as lit lanterns', () => {
    const s = at(match(), 40);
    s.teams[0].roundsWon = 1;
    const { host, frame } = setup(s);
    frame();
    const lanterns = host.querySelectorAll('.lw-jade .lw-sign-rounds .lw-mini-lantern');
    expect(lanterns).toHaveLength(2); // best of 3 -> 2 to win
    expect(host.querySelectorAll('.lw-jade .lw-sign-rounds .lw-lit')).toHaveLength(1);
  });
});

describe('HUD clock and phase moments', () => {
  it('counts down prep in the lantern, then the round', () => {
    const s = at(match(), 5, 'prep');
    const { host, frame } = setup(s);
    frame();
    const clock = host.querySelector<HTMLElement>('.lw-clock')!;
    expect(clock.dataset.phase).toBe('prep');
    expect(clock.querySelector('.lw-clock-time')!.textContent).toBe('0:10');
    at(s, 100, 'rush');
    frame();
    expect(clock.dataset.phase).toBe('rush');
    expect(clock.querySelector('.lw-clock-time')!.textContent).toBe('2:20');
    expect(clock.querySelector('.lw-clock-tag')!.textContent).toBe('Dinner Rush ×1.5');
    expect(clock.querySelector('.lw-clock-round')!.textContent).toBe('Round 1 of 3');
  });

  const cases: [string, (s: MatchState) => void, string, string][] = [
    ['prep', (s) => at(s, 0.5, 'prep'), 'prep', 'Prep time'],
    ['prep countdown', (s) => at(s, 13.2, 'prep'), 'count', '2'],
    ['service opens', (s) => at(s, 15.5, 'service'), 'open', 'Open for service'],
    ['Dinner Rush', (s) => at(s, 181, 'rush'), 'rush', 'Dinner Rush'],
    ['Last call', (s) => at(s, 231, 'lastCall'), 'lastCall', 'Last call'],
    [
      'round over',
      (s) => {
        at(s, 240, 'roundOver');
        s.teams[0].score = 300;
        s.teams[1].score = 410;
        s.teams[1].roundsWon = 1;
        s.round.intermissionTicks = secondsToTicks(s.config, 4);
      },
      'roundOver',
      'Ember takes round 1',
    ],
    [
      'match over',
      (s) => {
        at(s, 240, 'matchOver');
        s.winner = 0;
        s.teams[0].roundsWon = 2;
        s.totalScores = [900, 700];
      },
      'matchOver',
      'Jade wins the match',
    ],
  ];
  for (const [name, arrange, kind, title] of cases) {
    it(`shows the ${name} moment`, () => {
      const s = match();
      arrange(s);
      const { host, frame } = setup(s);
      frame();
      const m = host.querySelector<HTMLElement>('.lw-moment')!;
      expect(m.dataset.moment).toBe(kind);
      expect(m.querySelector('.lw-moment-title')!.textContent).toBe(title);
    });
  }

  it('keeps brief banners brief and result cards up', () => {
    const s = match();
    expect(currentMoment(at(s, 4, 'prep'))).toBeNull();
    expect(currentMoment(at(s, 60, 'service'))).toBeNull();
    expect(currentMoment(at(s, 183, 'rush'))).toBeNull(); // rush started at 180
    expect(currentMoment(at(s, 233, 'lastCall'))).toBeNull();
    const round = currentMoment(at(s, 240, 'roundOver'))!;
    expect(round.title).toBe('Round 1 is a tie');
    expect(round.card!.footer).toMatch(/^Next round in/);
  });

  it('round over card shows both scores and updates its countdown in place', () => {
    const s = at(match(), 240, 'roundOver');
    s.teams[0].score = 1234;
    s.teams[1].score = 99;
    s.round.intermissionTicks = secondsToTicks(s.config, 5);
    const { host, frame } = setup(s);
    frame();
    const card = host.querySelector<HTMLElement>('.lw-moment')!;
    expect([...card.querySelectorAll('.lw-result-score')].map((e) => e.textContent)).toEqual(['1,234', '99']);
    expect(card.querySelector('.lw-moment-sub')!.textContent).toBe('Next round in 5');
    s.round.intermissionTicks = secondsToTicks(s.config, 2);
    frame();
    expect(host.querySelector('.lw-moment')).toBe(card);
    expect(card.querySelector('.lw-moment-sub')!.textContent).toBe('Next round in 2');
  });
});

describe('HUD DOM updates', () => {
  it('does not rebuild the DOM per frame: node identity is stable while state ticks on', () => {
    const s = at(match(), 40);
    ticket(s, 'burger');
    ticket(s, 'salad');
    s.teams[0].heat = 1;
    const { host, frame, tick } = setup(s);
    frame();
    frame(400); // let the first-frame score settle
    const before = [...host.querySelectorAll('*')];
    for (let i = 0; i < 90; i++) tick();
    s.teams[0].score = 0; // unchanged
    frame();
    const after = [...host.querySelectorAll('*')];
    expect(after.length).toBe(before.length);
    after.forEach((n, i) => expect(n).toBe(before[i]));
  });

  it('skips DOM writes when nothing changed', () => {
    const s = at(match(), 40);
    ticket(s, 'burger');
    const { host, frame } = setup(s);
    frame();
    frame(1000);
    const observer = new MutationObserver(() => {});
    observer.observe(host, { subtree: true, childList: true, attributes: true, characterData: true });
    frame();
    frame();
    expect(observer.takeRecords()).toEqual([]);
    observer.disconnect();
  });
});

describe('HUD score tokens', () => {
  it('flies serve points from the pass into the sign and holds the count-up until they land', () => {
    const s = at(match(), 40);
    const clock = { ms: 0 };
    const host = document.createElement('div');
    document.body.append(host);
    const anims: { onfinish: (() => void) | null; cancel(): void }[] = [];
    const proto = HTMLElement.prototype as unknown as { animate?: unknown };
    const had = proto.animate;
    proto.animate = function () {
      const a = { onfinish: null as (() => void) | null, cancel() {} };
      anims.push(a);
      return a;
    };
    try {
      hud = new HudRenderer(host, { now: () => clock.ms, reducedMotion: false, locate: (p) => ({ x: p.x * 10, y: p.y * 10 }) });
      hud.render(s);
      s.teams[1].score = 90;
      s.events = [{ type: 'delivered', team: 1, ticketId: 1, recipe: 'burger', points: 90 }];
      hud.onTick(s);
      expect(host.querySelector('.lw-fly.lw-ember')!.textContent).toBe('+90');
      expect(host.querySelector('.lw-ember .lw-sign-pop')).toBeNull();
      clock.ms += COUNT_MS / 2;
      hud.render(s);
      const score = host.querySelector('.lw-ember .lw-sign-score')!;
      expect(score.textContent).toBe('0'); // still in flight
      anims[0]!.onfinish!();
      expect(host.querySelector('.lw-fly')).toBeNull();
      expect(host.querySelector('.lw-ember .lw-sign-pop')!.textContent).toBe('+90');
      clock.ms += 2000;
      hud.render(s);
      expect(score.textContent).toBe('90');
    } finally {
      proto.animate = had;
    }
  });
});
