import { afterEach, describe, expect, it, vi } from 'vitest';
import { NO_INPUT, step, type MatchInputs, type MatchState } from '@line-war/sim';
import { AudioDirector, localTeamFor } from '../../src/audio';
import { P1_KEYS } from '../../src/settings/types';
import { busGains } from '../../src/audio/mix';
import { fakeAudioContext } from './fakeAudio';
import { match, nearlyBurnt, station } from './helpers';

const idle = [NO_INPUT, NO_INPUT, NO_INPUT, NO_INPUT] as MatchInputs;

function withFake(opts: { localTeam?: 0 | 1 | null } = {}) {
  const fake = fakeAudioContext();
  const d = new AudioDirector({ createContext: () => fake.ctx, realtime: false, ...opts });
  d.resume();
  return { d, fake };
}

/** Nodes created while running fn. */
function created(fake: ReturnType<typeof fakeAudioContext>, fn: () => void) {
  const before = fake.nodes.length;
  fn();
  return fake.nodes.slice(before);
}

afterEach(() => vi.unstubAllGlobals());

describe('localTeamFor', () => {
  const kb = { kind: 'keyboard', bindings: P1_KEYS } as const;
  const bot = { kind: 'bot', difficulty: 'normal' } as const;
  it('is the crew of the local humans, or null when both or neither crew has one', () => {
    expect(localTeamFor([kb, bot, bot, bot])).toBe(0);
    expect(localTeamFor([bot, bot, { kind: 'gamepad', index: 0 }, bot])).toBe(1);
    expect(localTeamFor([kb, bot, kb, bot])).toBeNull();
    expect(localTeamFor([bot, bot, bot, bot])).toBeNull();
  });
});

describe('AudioDirector without Web Audio', () => {
  it('does nothing and never throws when there is no AudioContext', () => {
    vi.stubGlobal('AudioContext', undefined);
    vi.stubGlobal('webkitAudioContext', undefined);
    const d = new AudioDirector();
    const s = match();
    expect(() => {
      d.onTick(s);
      d.resume();
      d.setVolumes({ master: 0.5, music: 0.2, effects: 1 });
      d.setPaused(true);
      for (let i = 0; i < 30; i++) {
        step(s, idle);
        d.onTick(s);
      }
      d.render();
      d.dispose();
      d.onTick(s);
    }).not.toThrow();
    expect(d.active).toBe(false);
  });

  it('survives a context constructor that throws', () => {
    const d = new AudioDirector({ createContext: () => { throw new Error('blocked'); } });
    expect(() => d.resume()).not.toThrow();
    expect(() => d.onTick(match())).not.toThrow();
    expect(d.active).toBe(false);
  });

  it('stays silent until resume() (autoplay policy)', () => {
    const fake = fakeAudioContext();
    let made = 0;
    const d = new AudioDirector({ createContext: () => (made++, fake.ctx), realtime: false });
    d.onTick(match());
    expect(made).toBe(0);
    d.resume();
    d.resume();
    expect(made).toBe(1);
  });
});

describe('AudioDirector with a fake AudioContext', () => {
  it('a delivered event schedules oscillators into the effects chain', () => {
    const { d, fake } = withFake();
    const s = match();
    s.events = [{ type: 'delivered', team: 0, ticketId: 1, recipe: 'salad', points: 40 }];
    const nodes = created(fake, () => d.onTick(s));
    const oscs = nodes.filter((n) => n.kind === 'oscillator');
    expect(oscs.length).toBeGreaterThan(4);
    expect(oscs.every((o) => o.started !== null && o.started >= 0)).toBe(true);
    // The voice is panned toward crew A's (left) kitchen.
    const panner = nodes.find((n) => n.kind === 'panner') as unknown as { pan: { value: number } };
    expect(panner.pan.value).toBeLessThan(0);
  });

  it('a busy tick cannot stack 30 sounds', () => {
    const { d, fake } = withFake();
    const s = match();
    s.events = Array.from({ length: 30 }, (_, i) => ({ type: 'grab' as const, player: 0 as const, itemId: i }));
    const nodes = created(fake, () => d.onTick(s));
    // One collapsed grab: two sources (a tone and a click).
    expect(nodes.filter((n) => n.kind === 'oscillator' || n.kind === 'bufferSource')).toHaveLength(2);
  });

  it('applies volumes to the buses', () => {
    const { d, fake } = withFake();
    d.setVolumes({ master: 0.5, music: 0.25, effects: 1 });
    const want = busGains({ master: 0.5, music: 0.25, effects: 1 });
    const targets = fake.nodes
      .filter((n) => n.kind === 'gain')
      .map((n) => (n as unknown as { gain: { events: { fn: string; args: number[] }[] } }).gain.events.at(-1))
      .filter((e) => e?.fn === 'setTargetAtTime')
      .map((e) => e!.args[0]);
    expect(targets).toContain(want.music);
    expect(targets).toContain(want.effects);
  });

  it('beeps for a pan about to burn, and starts the sizzle loop while it cooks', () => {
    const { d, fake } = withFake();
    const s = match();
    s.events = [];
    const pan = station(s, 'stove', { vessel: 'pan' });
    nearlyBurnt(s, pan, 20);
    const nodes = created(fake, () => d.onTick(s));
    expect(nodes.filter((n) => n.kind === 'bufferSource' && n.loop === true)).toHaveLength(1);
    expect(nodes.filter((n) => n.kind === 'oscillator').length).toBeGreaterThanOrEqual(2);
    // Next tick is inside the beep interval: no new beep.
    s.tick++;
    expect(created(fake, () => d.onTick(s)).filter((n) => n.kind === 'oscillator')).toHaveLength(0);
  });

  it('gongs for the Critic, and music plays with the phase', () => {
    const { d, fake } = withFake();
    const s: MatchState = match();
    s.round.phase = 'service';
    s.tickets.push({ id: 9, recipe: 'x', spawnTick: 0, expireTick: 999, baseValue: 1, isCritic: true, visibleTo: null, revealAllAtTick: null });
    s.events = [{ type: 'ticketSpawn', ticketId: 9, recipe: 'x', isCritic: true }];
    const gong = created(fake, () => d.onTick(s));
    expect(gong.filter((n) => n.kind === 'oscillator').length).toBeGreaterThanOrEqual(7);
    expect(created(fake, () => d.scheduleMusic(4)).some((n) => n.kind === 'oscillator')).toBe(true);
  });

  it('runs a real match tick by tick without errors and closes on dispose', () => {
    const { d, fake } = withFake();
    const s = match();
    const close = vi.spyOn(fake.raw, 'close');
    for (let i = 0; i < 30 * 30; i++) {
      step(s, idle);
      d.onTick(s);
    }
    d.dispose();
    expect(close).toHaveBeenCalled();
    expect(d.active).toBe(false);
  });
});
