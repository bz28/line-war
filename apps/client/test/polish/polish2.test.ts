// @vitest-environment jsdom
import { INGREDIENTS, NIGHT_MARKET, RECIPES } from '@line-war/content';
import { createMatch, makeConfig, secondsToTicks } from '@line-war/sim';
import type { MatchState, Phase, Ticket } from '@line-war/sim';
import { afterEach, describe, expect, it } from 'vitest';
import { HudRenderer } from '../../src/hud/hud';
import { coachKeysFor } from '../../src/hud/coach';
import { OUT_MS } from '../../src/hud/moments';
import { EXIT_MS, FOLD_STAGGER_MS, ghostSeconds, lineClosed } from '../../src/hud/slips';
import { riderY } from '../../src/render/art/chef';
import { PAD, PAD_ACTIONS, padActionLabel, padButtonLabel } from '../../src/input/gamepad';
import { P1_KEYS } from '../../src/settings/types';

let hud: HudRenderer | null = null;
afterEach(() => {
  hud?.dispose();
  hud = null;
  document.body.replaceChildren();
});

const match = (): MatchState => createMatch({ arena: NIGHT_MARKET, recipes: RECIPES, ingredients: INGREDIENTS, config: makeConfig({ seed: 5 }) });

function at(s: MatchState, seconds: number, phase: Phase): MatchState {
  s.round.tick = secondsToTicks(s.config, seconds);
  s.tick = s.round.tick;
  s.round.phase = phase;
  return s;
}

let nextId = 5000;
function ticket(s: MatchState, recipe: string): Ticket {
  const t: Ticket = {
    id: nextId++,
    recipe,
    spawnTick: s.tick,
    expireTick: s.tick + secondsToTicks(s.config, 60),
    baseValue: 50,
    isCritic: false,
    visibleTo: null,
    revealAllAtTick: null,
  };
  s.tickets.push(t);
  return t;
}

function setup(s: MatchState, coach = false) {
  const clock = { ms: 0 };
  const host = document.createElement('div');
  document.body.append(host);
  const store = new Map<string, string>();
  hud = new HudRenderer(host, {
    now: () => clock.ms,
    reducedMotion: false,
    coach: coach ? { player: 0, keys: { grab: 'Space', work: 'E', dash: 'L Shift' }, storage: { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => void store.set(k, v) } } : undefined,
  });
  const frame = (ms = 16) => {
    clock.ms += ms;
    hud!.render(s);
  };
  return { host, frame };
}

describe('ticket line at round end', () => {
  it('folds every slip away when the round or match is over, staggered from the clock out', () => {
    const s = at(match(), 50, 'lastCall');
    const ids = [ticket(s, 'burger').id, ticket(s, 'salad').id, ticket(s, 'soup').id];
    const { host, frame } = setup(s);
    frame();
    expect(host.querySelectorAll('.lw-slip[data-state="live"]')).toHaveLength(3);
    s.round.phase = 'roundOver'; // the sim keeps its tickets until the next round
    expect(lineClosed(s)).toBe(true);
    frame();
    const slips = ids.map((id) => host.querySelector<HTMLElement>(`.lw-slip[data-ticket="${id}"]`)!);
    for (const el of slips) expect(el.dataset.state).toBe('cleared');
    // Slot 0 is the far left: furthest from the clock, so it folds last.
    const delays = slips.map((el) => parseInt(el.style.getPropertyValue('--fold-delay'), 10));
    expect(delays[0]).toBe(3 * FOLD_STAGGER_MS);
    expect(delays[2]).toBe(1 * FOLD_STAGGER_MS);
    frame(EXIT_MS.cleared + 1);
    expect(host.querySelectorAll('.lw-slip')).toHaveLength(0);
  });

  it('shows a ghost slip counting down to the next ticket only while the line is empty', () => {
    const s = at(match(), 4, 'prep');
    expect(ghostSeconds(s, 0)).toBe(s.config.prepSeconds - 4);
    expect(ghostSeconds(s, 1)).toBeNull();
    const { host, frame } = setup(s);
    frame();
    const ghost = host.querySelector<HTMLElement>('.lw-slip-ghost')!;
    expect(ghost.hidden).toBe(false);
    expect(ghost.textContent).toContain(`${s.config.prepSeconds - 4}s`);
    ticket(s, 'burger');
    frame();
    expect(ghost.hidden).toBe(true);
    s.round.phase = 'matchOver';
    s.tickets = [];
    frame(EXIT_MS.cleared + 1);
    expect(ghostSeconds(s, 0)).toBeNull();
    expect(ghost.hidden).toBe(true);
  });
});

describe('result cards', () => {
  it('never puts two cards on stage: match over waits for the round card to leave', () => {
    const s = at(match(), 240, 'roundOver');
    s.teams[0].score = 300;
    s.teams[0].roundsWon = 2;
    const { host, frame } = setup(s);
    frame();
    const live = () => [...host.querySelectorAll('.lw-moment:not(.lw-moment--out)')].map((e) => (e as HTMLElement).dataset.moment);
    expect(live()).toEqual(['roundOver']);
    s.round.phase = 'matchOver';
    s.winner = 0;
    frame();
    expect(live()).toEqual([]); // the round card is leaving; match over waits off-stage
    expect(host.querySelectorAll('.lw-moment')).toHaveLength(1);
    frame(OUT_MS + 1);
    expect(live()).toEqual(['matchOver']);
    expect(host.querySelectorAll('.lw-moment')).toHaveLength(1);
  });

  it('lets brief stamps replace each other without waiting', () => {
    const s = at(match(), match().config.prepSeconds - 2.5, 'prep');
    const { host, frame } = setup(s);
    frame();
    expect(host.querySelector('.lw-moment:not(.lw-moment--out)')!.textContent).toBe('3');
    at(s, s.config.prepSeconds - 1.5, 'prep');
    frame();
    expect(host.querySelector('.lw-moment:not(.lw-moment--out)')!.textContent).toBe('2');
  });
});

describe('coach and countdown', () => {
  it('keeps the coach note up during the 3-2-1 and flags the HUD so the count sits below it', () => {
    const s = at(match(), match().config.prepSeconds - 2.5, 'prep');
    const { host, frame } = setup(s, true);
    frame();
    expect(host.querySelector('.lw-moment--count')).not.toBeNull();
    expect(host.querySelector('.lw-coach-note')!.classList.contains('lw-coach-note--away')).toBe(false);
    expect(hud!.root.classList.contains('lw-hud--coaching')).toBe(true);
  });

  it('still steps aside for a phase banner', () => {
    const s = at(match(), 0.5, 'prep');
    const { host, frame } = setup(s, true);
    frame();
    expect(host.querySelector('.lw-moment--prep')).not.toBeNull();
    expect(host.querySelector('.lw-coach-note')!.classList.contains('lw-coach-note--away')).toBe(true);
    expect(hud!.root.classList.contains('lw-hud--coaching')).toBe(false);
  });
});

describe('overlays ride the serve hop', () => {
  it('lifts with the hop and follows the squash about the feet', () => {
    expect(riderY(50, 100, 0, 0)).toBe(50);
    expect(riderY(50, 100, 12, 0)).toBe(38);
    // Squashed 20 %: a point 50 px above the feet sits 40 px above them.
    expect(riderY(50, 100, 0, 0.2)).toBeCloseTo(60);
    // Stretched: it rises further.
    expect(riderY(50, 100, 0, -0.1)).toBeCloseTo(45);
  });
});

describe('gamepad prompts', () => {
  it('derive from the gamepad mapping, not hardcoded letters', () => {
    expect(padButtonLabel(PAD.A)).toBe('A');
    expect(padButtonLabel(PAD.START)).toBe('Start');
    expect(padButtonLabel(17)).toBe('Button 18');
    for (const a of ['grab', 'work', 'dash', 'throw'] as const) expect(padActionLabel(a)).toBe(padButtonLabel(PAD_ACTIONS[a]));
    expect(coachKeysFor({ kind: 'gamepad', index: 0 })).toEqual({ grab: padActionLabel('grab'), work: padActionLabel('work'), dash: padActionLabel('dash') });
    expect(coachKeysFor({ kind: 'keyboard', bindings: P1_KEYS })).toEqual({ grab: 'Space', work: 'E', dash: 'L Shift' });
    expect(coachKeysFor({ kind: 'bot', difficulty: 'easy' })).toBeNull();
  });
});
