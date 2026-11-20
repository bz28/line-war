// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { INGREDIENTS, NIGHT_MARKET, RECIPES } from '@line-war/content';
import { createMatch, makeConfig, tileCenter, tileOwner } from '@line-war/sim';
import type { MatchState, SimEvent } from '@line-war/sim';
import { Coach, COACH_STORAGE_KEY, coachStep, coachTarget, coachText, newProgress, OUTRO_MS, trackProgress } from '../../src/hud/coach';

const match = (): MatchState => createMatch({ arena: NIGHT_MARKET, recipes: RECIPES, ingredients: INGREDIENTS, config: makeConfig({ seed: 9 }) });
const keys = { grab: 'Space', work: 'E', dash: 'L Shift' };

function memStore(init: Record<string, string> = {}) {
  const m = new Map(Object.entries(init));
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m };
}

const kindAt = (s: MatchState, i: number | null) => (i === null ? null : s.arena.tiles[i]!.kind);

describe('coach progress', () => {
  it('walks grab -> prep -> serve -> done from what the player does', () => {
    const s = match();
    const prog = newProgress();
    expect(coachStep(prog)).toBe('grab');
    s.players[0].holding = { id: 1, type: 'ingredient', kind: 'steak', state: 'raw' };
    trackProgress(s, 0, prog);
    expect(coachStep(prog)).toBe('prep');
    const stove = s.arena.tiles.findIndex((t, i) => t.kind === 'stove' && tileOwner(s, i) === 0);
    s.players[0].holding = null;
    s.events = [{ type: 'drop', player: 0, itemId: 1, tile: stove }];
    trackProgress(s, 0, prog);
    expect(coachStep(prog)).toBe('serve');
    s.events = [{ type: 'delivered', team: 1, ticketId: 1, recipe: 'steak', points: 10 }];
    trackProgress(s, 0, prog);
    expect(coachStep(prog)).toBe('serve'); // the rival serving doesn't count
    s.events = [{ type: 'delivered', team: 0, ticketId: 1, recipe: 'steak', points: 10 }];
    trackProgress(s, 0, prog);
    expect(coachStep(prog)).toBe('done');
  });

  it("a crewmate's chopping does not count as the player's prep", () => {
    const s = match();
    const prog = newProgress();
    prog.grabbed = true;
    const board = s.arena.tiles.findIndex((t, i) => t.kind === 'board' && tileOwner(s, i) === 0);
    s.events = [{ type: 'chopDone', tile: board }] as SimEvent[];
    s.players[0].working = false;
    trackProgress(s, 0, prog);
    expect(coachStep(prog)).toBe('prep');
    s.players[0].working = true;
    trackProgress(s, 0, prog);
    expect(coachStep(prog)).toBe('serve');
  });

  it('names the player’s own keys', () => {
    expect(coachText('grab', keys).body).toContain('Space');
    expect(coachText('prep', keys).body).toContain('E');
    expect(coachText('done', keys).body).toContain('L Shift');
  });
});

describe('coachTarget', () => {
  it('points at the market in prep, then at what the oldest ticket needs', () => {
    const s = match();
    expect(kindAt(s, coachTarget(s, 0, 'grab'))).toBe('crate');
    s.tickets.push({ id: 1, recipe: 'salad', spawnTick: 0, expireTick: 9999, baseValue: 40, isCritic: false, visibleTo: null, revealAllAtTick: null });
    const t = coachTarget(s, 0, 'grab')!;
    expect(kindAt(s, t)).toBe('pantry');
    expect(tileOwner(s, t)).toBe(0);
    expect(['lettuce', 'tomato']).toContain(s.arena.tiles[t]!.ingredient);
  });

  it('points a raw choppable at the crew’s board, raw meat at its pan, and a full plate at its pass', () => {
    const s = match();
    s.players[0].holding = { id: 1, type: 'ingredient', kind: 'lettuce', state: 'raw' };
    let t = coachTarget(s, 0, 'prep')!;
    expect(kindAt(s, t)).toBe('board');
    expect(tileOwner(s, t)).toBe(0);
    s.players[0].holding = { id: 1, type: 'ingredient', kind: 'meat', state: 'raw' };
    t = coachTarget(s, 0, 'prep')!;
    expect(kindAt(s, t)).toBe('stove');
    expect(s.arena.tiles[t]!.vessel).toBe('pan');
    s.players[0].holding = { id: 2, type: 'plate', dirty: false, cold: false, platedAtTick: 0, contents: [{ kind: 'lettuce', state: 'chopped' }] };
    t = coachTarget(s, 0, 'serve')!;
    expect(kindAt(s, t)).toBe('pass');
    expect(tileOwner(s, t)).toBe(0);
    expect(coachTarget(s, 0, 'done')).toBeNull();
  });
});

describe('Coach', () => {
  it('runs once: done is remembered and the note leaves after the outro', () => {
    const store = memStore();
    expect(Coach.wanted(store)).toBe(true);
    const clock = { ms: 0 };
    const s = match();
    const coach = new Coach(0, keys, () => clock.ms, (p) => ({ x: p.x * 10, y: p.y * 10 }), store);
    document.body.append(coach.root);
    coach.render(s);
    expect(coach.root.querySelector('.lw-coach-title')!.textContent).toBeTruthy();
    const pointer = coach.root.querySelector<HTMLElement>('.lw-coach-pointer')!;
    expect(pointer.hidden).toBe(false);
    const crate = coachTarget(s, 0, 'grab')!;
    const c = tileCenter(s.arena, crate);
    expect(pointer.style.transform).toBe(`translate(${Math.round(c.x * 10)}px, ${Math.round(c.y * 10)}px)`);
    s.events = [{ type: 'delivered', team: 0, ticketId: 1, recipe: 'salad', points: 40 }];
    coach.onTick(s);
    coach.render(s);
    expect(coach.currentStep).toBe('done');
    expect(store.m.get(COACH_STORAGE_KEY)).toBe('done');
    expect(Coach.wanted(store)).toBe(false);
    clock.ms += OUTRO_MS + 1;
    coach.render(s);
    expect(coach.root.hidden).toBe(true);
    expect(coach.currentStep).toBeNull();
  });

  it('can be skipped, which is remembered too', () => {
    const store = memStore();
    const coach = new Coach(0, keys, () => 0, null, store);
    coach.root.querySelector<HTMLButtonElement>('.lw-coach-skip')!.click();
    expect(coach.root.hidden).toBe(true);
    expect(Coach.wanted(store)).toBe(false);
  });

  it('steps aside while a phase banner is up', () => {
    const coach = new Coach(0, keys, () => 0, null, memStore());
    coach.render(match(), true);
    expect(coach.root.querySelector('.lw-coach-note')!.classList.contains('lw-coach-note--away')).toBe(true);
  });

  it('is not wanted when storage throws', () => {
    expect(Coach.wanted({ getItem: () => { throw new Error('blocked'); }, setItem: () => undefined })).toBe(false);
  });
});
