/**
 * OWNER: audio track. Continuous beds: pan sizzle, pot bubbling, fire crackle.
 * Each is a procedurally generated buffer, looped, with its level and pan eased toward
 * a target every tick (derive.ts loopTargets).
 */
import { dbToGain } from './mix';
import { mulberry } from './synth';

export type LoopId = 'sizzle' | 'bubble' | 'fire';

/** Peak-ish level at full target (one source = 0.6 of this), dBFS on the effects bus. */
export const LOOP_LEVEL_DB: Record<LoopId, number> = { sizzle: -26, bubble: -36, fire: -25 };

type Fill = (d: Float32Array, rate: number, rand: () => number) => void;

/** Normalize to peak 1 and fade the first/last 10 ms toward each other so the loop is seamless. */
function finish(d: Float32Array, rate: number): void {
  const fade = Math.round(rate * 0.01);
  for (let i = 0; i < fade; i++) {
    const k = i / fade;
    const a = d[i]!;
    const b = d[d.length - fade + i]!;
    d[d.length - fade + i] = b * (1 - k) + a * k;
  }
  let peak = 0;
  for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]!));
  if (peak > 0) for (let i = 0; i < d.length; i++) d[i] = d[i]! / peak;
}

/** Add a decaying impulse (a pop/crackle) of `ms` length at sample i. */
function pop(d: Float32Array, i: number, amp: number, len: number, rand: () => number): void {
  for (let k = 0; k < len && i + k < d.length; k++) d[i + k]! += amp * (rand() * 2 - 1) * Math.exp((-5 * k) / len);
}

const FILLS: Record<LoopId, Fill> = {
  // Hiss with a slowly wandering level plus a spray of tiny fat pops.
  sizzle: (d, rate, rand) => {
    let level = 0.5;
    for (let i = 0; i < d.length; i++) {
      if (i % 256 === 0) level = Math.min(1, Math.max(0.3, level + (rand() - 0.5) * 0.15));
      d[i] = (rand() * 2 - 1) * 0.25 * level;
    }
    const pops = Math.round((d.length / rate) * 70);
    for (let n = 0; n < pops; n++) pop(d, Math.floor(rand() * d.length), 0.3 + rand() * 0.7, Math.round(rate * (0.002 + rand() * 0.004)), rand);
  },
  // Bubbles: short sine blips that rise in pitch as they "pop", at random times.
  bubble: (d, rate, rand) => {
    const count = Math.round((d.length / rate) * 7);
    for (let n = 0; n < count; n++) {
      const start = Math.floor(rand() * d.length);
      const f0 = 160 + rand() * 260;
      const len = Math.round(rate * (0.03 + rand() * 0.05));
      const amp = 0.4 + rand() * 0.6;
      let phase = 0;
      for (let k = 0; k < len && start + k < d.length; k++) {
        const x = k / len;
        phase += (2 * Math.PI * f0 * (1 + 0.8 * x)) / rate;
        d[start + k]! += amp * Math.sin(phase) * Math.sin(Math.PI * x) * (1 - x);
      }
    }
  },
  // Low rumbling roar (integrated noise) with sharp crackles on top.
  fire: (d, rate, rand) => {
    let brown = 0;
    for (let i = 0; i < d.length; i++) {
      brown = (brown + (rand() * 2 - 1) * 0.04) * 0.995;
      d[i] = brown * 3;
    }
    const crackles = Math.round((d.length / rate) * 28);
    for (let n = 0; n < crackles; n++) pop(d, Math.floor(rand() * d.length), 0.4 + rand() * 0.6, Math.round(rate * (0.001 + rand() * 0.002)), rand);
  },
};

/** Tone-shaping filter per loop. */
const SHAPE: Record<LoopId, { type: BiquadFilterType; f: number; q: number }> = {
  sizzle: { type: 'highpass', f: 2200, q: 0.5 },
  bubble: { type: 'lowpass', f: 1400, q: 0.5 },
  fire: { type: 'lowpass', f: 5000, q: 0.5 },
};

export function loopBuffer(ctx: BaseAudioContext, id: LoopId, seconds = 3): AudioBuffer {
  const buf = ctx.createBuffer(1, Math.round(ctx.sampleRate * seconds), ctx.sampleRate);
  const d = buf.getChannelData(0);
  FILLS[id](d, ctx.sampleRate, mulberry(id.length * 101 + 3));
  finish(d, ctx.sampleRate);
  return buf;
}

/** One looping bed. Silent and idle until it first gets a non-zero target. */
export class LoopChannel {
  private src: AudioBufferSourceNode | null = null;
  private gain: GainNode | null = null;
  private panner: StereoPannerNode | null = null;
  private level = 0;

  constructor(
    private readonly ctx: BaseAudioContext,
    private readonly dest: AudioNode,
    readonly id: LoopId,
  ) {}

  /** Ease toward `level` (0..1) and `pan`. */
  set(level: number, pan: number): void {
    if (level <= 0 && !this.src) return;
    if (!this.src) this.start();
    const t = this.ctx.currentTime;
    const target = level * dbToGain(LOOP_LEVEL_DB[this.id]);
    if (target !== this.level) {
      // Fades in a little slower than out so a pan coming off the heat stops promptly.
      this.gain!.gain.setTargetAtTime(target, t, target > this.level ? 0.12 : 0.08);
      this.level = target;
    }
    this.panner?.pan.setTargetAtTime(pan, t, 0.2);
  }

  private start(): void {
    const { ctx } = this;
    const src = ctx.createBufferSource();
    src.buffer = loopBuffer(ctx, this.id);
    src.loop = true;
    const shape = ctx.createBiquadFilter();
    shape.type = SHAPE[this.id].type;
    shape.frequency.value = SHAPE[this.id].f;
    shape.Q.value = SHAPE[this.id].q;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    src.connect(shape);
    shape.connect(gain);
    let tail: AudioNode = gain;
    if (typeof ctx.createStereoPanner === 'function') {
      this.panner = ctx.createStereoPanner();
      gain.connect(this.panner);
      tail = this.panner;
    }
    tail.connect(this.dest);
    src.start();
    this.src = src;
    this.gain = gain;
  }

  dispose(): void {
    try {
      this.src?.stop();
    } catch {
      // already stopped
    }
    this.src?.disconnect();
    this.src = null;
  }
}
