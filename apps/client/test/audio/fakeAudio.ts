/** Minimal fake BaseAudioContext that records every node created and every param automation. */

export interface FakeNode {
  kind: string;
  connections: FakeNode[];
  started: number | null;
  [k: string]: unknown;
}

class FakeParam {
  value: number;
  events: { fn: string; args: number[] }[] = [];
  constructor(v = 0) {
    this.value = v;
  }
  private log(fn: string, args: number[]) {
    for (const a of args) if (!Number.isFinite(a)) throw new Error(`non-finite ${fn}(${args.join(',')})`);
    this.events.push({ fn, args });
    return this;
  }
  setValueAtTime(v: number, t: number) {
    return this.log('setValueAtTime', [v, t]);
  }
  linearRampToValueAtTime(v: number, t: number) {
    return this.log('linearRampToValueAtTime', [v, t]);
  }
  exponentialRampToValueAtTime(v: number, t: number) {
    if (v <= 0) throw new Error('exponential ramp to <= 0');
    return this.log('exponentialRampToValueAtTime', [v, t]);
  }
  setTargetAtTime(v: number, t: number, c: number) {
    return this.log('setTargetAtTime', [v, t, c]);
  }
  cancelScheduledValues(t: number) {
    return this.log('cancelScheduledValues', [t]);
  }
}

export function fakeAudioContext() {
  const nodes: FakeNode[] = [];
  const node = (kind: string, params: string[] = [], extra: Record<string, unknown> = {}): FakeNode => {
    const n: FakeNode = {
      kind,
      connections: [],
      started: null,
      connect(to: FakeNode) {
        n.connections.push(to);
        return to;
      },
      disconnect() {
        n.connections = [];
      },
      start(t = 0) {
        n.started = t;
      },
      stop() {},
      ...extra,
    };
    for (const p of params) n[p] = new FakeParam(p === 'gain' ? 1 : 0);
    nodes.push(n);
    return n;
  };
  const ctx = {
    currentTime: 0,
    sampleRate: 8000,
    state: 'running',
    destination: node('destination'),
    createGain: () => node('gain', ['gain']),
    createOscillator: () => node('oscillator', ['frequency', 'detune'], { type: 'sine' }),
    createBufferSource: () => node('bufferSource', ['playbackRate'], { buffer: null, loop: false }),
    createBiquadFilter: () => node('biquad', ['frequency', 'Q', 'gain'], { type: 'lowpass' }),
    createStereoPanner: () => node('panner', ['pan']),
    createDelay: () => node('delay', ['delayTime']),
    createDynamicsCompressor: () => node('compressor', ['threshold', 'knee', 'ratio', 'attack', 'release']),
    createBuffer: (channels: number, length: number, sampleRate: number) => {
      const data = [...Array(channels)].map(() => new Float32Array(length));
      return { length, sampleRate, numberOfChannels: channels, getChannelData: (c: number) => data[c]! };
    },
    resume: () => Promise.resolve(),
    close: () => Promise.resolve(),
  };
  const count = (kind: string) => nodes.filter((n) => n.kind === kind).length;
  return { ctx: ctx as unknown as BaseAudioContext, raw: ctx, nodes, count };
}
