// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { AudioDirector } from '../../src/audio';
import { CATEGORY_PRIORITY, CUES } from '../../src/audio/cues';
import { HIT_STOP_DIP_HZ, IMPACT_OPEN_HZ, SCORE_LAND_RIVAL_PITCH, SIGN_PAN } from '../../src/audio/mix';
import { HudRenderer } from '../../src/hud/hud';
import { fakeAudioContext, type FakeNode } from './fakeAudio';
import { match } from './helpers';

type Param = { value: number; events: { fn: string; args: number[] }[] };

function withFake(localTeam: 0 | 1 | null = 0) {
  const fake = fakeAudioContext();
  const d = new AudioDirector({ createContext: () => fake.ctx, realtime: false, localTeam });
  d.resume();
  return { d, fake };
}

const impactFilter = (nodes: FakeNode[]) => nodes.find((n) => n.kind === 'biquad' && n.connections.some((c) => c.kind === 'compressor'))!;

describe('feel cues: mix budget', () => {
  it('the thud cuts through as an alert, the score tick sits under it as feedback', () => {
    expect(CUES.knockThud.category).toBe('alert');
    expect(CUES.knockThud.maxConcurrent).toBe(1);
    expect(CUES.scoreLand.category).toBe('feedback');
    expect(CATEGORY_PRIORITY[CUES.knockThud.category]).toBeGreaterThan(CATEGORY_PRIORITY[CUES.scoreLand.category]);
    expect(CUES.scoreLand.gainDb).toBeLessThan(CUES.deliver.gainDb);
    expect(CUES.scoreLand.minGap).toBeGreaterThan(0);
  });
});

describe('hit-stop audio', () => {
  it('plays a thud and dips the whole mix behind a low-pass for the freeze, then reopens', () => {
    const { d, fake } = withFake();
    const filter = impactFilter(fake.nodes);
    expect(filter).toBeDefined();
    const freq = filter.frequency as Param;
    expect(freq.value).toBe(IMPACT_OPEN_HZ);
    const before = fake.nodes.length;
    d.hitStop(-0.3, 0.085);
    expect(fake.nodes.length).toBeGreaterThan(before); // the thud voice was synthesised
    const targets = freq.events.filter((e) => e.fn === 'setTargetAtTime');
    expect(targets[0]!.args[0]).toBe(HIT_STOP_DIP_HZ);
    expect(targets[1]!.args[0]).toBe(IMPACT_OPEN_HZ);
    expect(targets[1]!.args[1]! - targets[0]!.args[1]!).toBeCloseTo(0.085);
    const pan = fake.nodes.slice(before).find((n) => n.kind === 'panner');
    expect((pan!.pan as Param).value).toBeCloseTo(-0.3);
  });

  it('stays silent while paused', () => {
    const { d, fake } = withFake();
    d.setPaused(true);
    const before = fake.nodes.length;
    d.hitStop(0, 0.085);
    expect(fake.nodes.length).toBe(before);
  });
});

describe('score landing audio', () => {
  it('ticks from the sign side, a fourth lower for the rival crew', () => {
    const { d, fake } = withFake(0);
    const pans = (from: number) => fake.nodes.slice(from).filter((n) => n.kind === 'panner').map((n) => (n.pan as Param).value);
    const oscFreqs = (from: number) => fake.nodes.slice(from).filter((n) => n.kind === 'oscillator').map((n) => (n.frequency as Param).events[0]?.args[0] ?? (n.frequency as Param).value);
    let mark = fake.nodes.length;
    d.scoreLand(0);
    expect(pans(mark)).toEqual([-SIGN_PAN]);
    const own = Math.max(...oscFreqs(mark));
    fake.raw.currentTime = 1; // past the retrigger guard
    mark = fake.nodes.length;
    d.scoreLand(1);
    expect(pans(mark)).toEqual([SIGN_PAN]);
    const rival = Math.max(...oscFreqs(mark));
    expect(rival / own).toBeCloseTo(Math.pow(2, SCORE_LAND_RIVAL_PITCH / 12), 2);
  });

  it('the HUD reports a token landing so audio can tick', () => {
    const s = match();
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
    const landed: number[] = [];
    try {
      const hud = new HudRenderer(host, { now: () => 0, reducedMotion: false, locate: (p) => ({ x: p.x, y: p.y }), onScoreLand: (t) => landed.push(t) });
      hud.render(s);
      s.events = [{ type: 'delivered', team: 1, ticketId: 1, recipe: 'burger', points: 60 }];
      hud.onTick(s);
      expect(landed).toEqual([]);
      anims[0]!.onfinish!();
      expect(landed).toEqual([1]);
      hud.dispose();
    } finally {
      proto.animate = had;
    }
  });
});
