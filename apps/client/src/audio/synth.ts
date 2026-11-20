/**
 * OWNER: audio track. Procedural synthesis: a few Web Audio primitives (enveloped
 * oscillators, filtered noise, bells) and one recipe per cue. No audio files.
 *
 * Every recipe writes into `o.dest` (the voice's gain node) and peaks near 0 dBFS at unit
 * gain; the cue's mix level (cues.ts) sets how loud it actually is. Recipes keep energy
 * between ~80 Hz and ~4 kHz and use soft attacks on anything bright, so nothing is shrill.
 */
import type { CueId } from './cues';

export interface Out {
  ctx: BaseAudioContext;
  dest: AudioNode;
  /** Start time (ctx seconds). */
  t: number;
  /** Uniform random in [0, 1) for small variations. */
  rand: () => number;
}

/** Semitones to frequency ratio. */
export const st = (n: number): number => Math.pow(2, n / 12);
/** MIDI note to Hz. */
export const mtof = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);

const SILENT = 0.0001;

/** Deterministic PRNG (mulberry32) so procedural buffers and variations are reproducible. */
export function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const noiseCache = new WeakMap<BaseAudioContext, AudioBuffer>();
/** 2 s of white noise, shared per context. */
export function noiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  let buf = noiseCache.get(ctx);
  if (!buf) {
    buf = ctx.createBuffer(1, Math.round(ctx.sampleRate * 2), ctx.sampleRate);
    const d = buf.getChannelData(0);
    const r = mulberry(7);
    for (let i = 0; i < d.length; i++) d[i] = r() * 2 - 1;
    noiseCache.set(ctx, buf);
  }
  return buf;
}

/** Attack to `peak`, then exponential decay to silence. Returns the end time. */
export function envelope(p: AudioParam, t: number, peak: number, attack: number, decay: number, hold = 0): number {
  p.setValueAtTime(SILENT, t);
  p.linearRampToValueAtTime(peak, t + attack);
  if (hold > 0) p.setValueAtTime(peak, t + attack + hold);
  const end = t + attack + hold + decay;
  p.exponentialRampToValueAtTime(SILENT, end);
  return end;
}

export interface FilterSpec {
  type: BiquadFilterType;
  f0: number;
  /** Sweep target, reached at the end of the envelope. */
  f1?: number;
  q?: number;
}

function filter(ctx: BaseAudioContext, f: FilterSpec, t: number, end: number): BiquadFilterNode {
  const n = ctx.createBiquadFilter();
  n.type = f.type;
  n.Q.value = f.q ?? 0.7;
  n.frequency.setValueAtTime(f.f0, t);
  if (f.f1 !== undefined) n.frequency.exponentialRampToValueAtTime(f.f1, end);
  return n;
}

export interface ToneSpec {
  type?: OscillatorType;
  f: number;
  /** Glide target frequency, reached after `glide` seconds (default: over the whole envelope). */
  f1?: number;
  glide?: number;
  at?: number;
  peak: number;
  a: number;
  d: number;
  hold?: number;
  detune?: number;
  filter?: FilterSpec;
}

/** One enveloped oscillator. Returns its end time relative to o.t. */
export function tone(o: Out, s: ToneSpec): number {
  const { ctx } = o;
  const t = o.t + (s.at ?? 0);
  const osc = ctx.createOscillator();
  osc.type = s.type ?? 'sine';
  osc.frequency.setValueAtTime(s.f, t);
  if (s.detune) osc.detune.value = s.detune;
  const g = ctx.createGain();
  const end = envelope(g.gain, t, s.peak, s.a, s.d, s.hold);
  if (s.f1 !== undefined) osc.frequency.exponentialRampToValueAtTime(s.f1, t + (s.glide ?? s.a + (s.hold ?? 0) + s.d));
  let head: AudioNode = osc;
  if (s.filter) {
    const f = filter(ctx, s.filter, t, end);
    osc.connect(f);
    head = f;
  }
  head.connect(g);
  g.connect(o.dest);
  osc.start(t);
  osc.stop(end + 0.02);
  return end - o.t;
}

export interface NoiseSpec {
  at?: number;
  peak: number;
  a: number;
  d: number;
  hold?: number;
  filter: FilterSpec;
}

/** One enveloped burst of filtered noise. Returns its end time relative to o.t. */
export function noise(o: Out, s: NoiseSpec): number {
  const { ctx } = o;
  const t = o.t + (s.at ?? 0);
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  const g = ctx.createGain();
  const end = envelope(g.gain, t, s.peak, s.a, s.d, s.hold);
  const f = filter(ctx, s.filter, t, end);
  src.connect(f);
  f.connect(g);
  g.connect(o.dest);
  // Random offset into the buffer so repeated bursts don't sound identical.
  src.start(t, o.rand() * 1.5);
  src.stop(end + 0.02);
  return end - o.t;
}

/** A struck bell: sine partials [ratio, gain, decay seconds]. Returns its end time relative to o.t. */
export function bell(o: Out, f: number, at: number, peak: number, partials: readonly (readonly [number, number, number])[]): number {
  let end = 0;
  for (const [ratio, gain, decay] of partials) {
    end = Math.max(end, tone(o, { f: f * ratio, at, peak: peak * gain, a: 0.004, d: decay }));
  }
  return end;
}

const CHIME: readonly (readonly [number, number, number])[] = [
  [1, 0.6, 0.9],
  [2, 0.22, 0.5],
  [3, 0.08, 0.3],
];
const HANDBELL: readonly (readonly [number, number, number])[] = [
  [1, 0.55, 1.3],
  [2, 0.2, 0.8],
  [2.76, 0.16, 0.5],
  [5.4, 0.04, 0.25],
];

/** Plucked string-ish note (triangle + octave sine through a closing lowpass). */
export function pluck(o: Out, f: number, at: number, peak: number, decay = 0.35): number {
  tone(o, { type: 'triangle', f: f * 1.006, f1: f, glide: 0.03, at, peak, a: 0.003, d: decay, filter: { type: 'lowpass', f0: 3200, f1: 700 } });
  return tone(o, { f: f * 2, at, peak: peak * 0.25, a: 0.002, d: decay * 0.5 });
}

/** Warm brass-ish stab for the fanfare: two detuned saws through an enveloped lowpass. */
function brass(o: Out, f: number, at: number, peak: number, len: number): number {
  for (const detune of [-7, 7]) {
    tone(o, { type: 'sawtooth', f, detune, at, peak: peak * 0.5, a: 0.03, hold: len, d: 0.25, filter: { type: 'lowpass', f0: 2200, f1: 700, q: 1 } });
  }
  return at + 0.03 + len + 0.25;
}

/** Soft frame-drum hit. */
export function drum(o: Out, at: number, peak: number): number {
  tone(o, { f: 120, f1: 55, glide: 0.12, at, peak, a: 0.002, d: 0.3 });
  return noise(o, { at, peak: peak * 0.3, a: 0.001, d: 0.05, filter: { type: 'lowpass', f0: 600 } });
}

/** Shaker tick (high, very short). */
export function shaker(o: Out, at: number, peak: number): number {
  return noise(o, { at, peak, a: 0.006, d: 0.045, filter: { type: 'bandpass', f0: 5500, q: 0.9 } });
}

/** Woodblock tick (Last Call clock); `pitch` -5 makes the tock. */
function woodblock(o: Out, pitch: number): number {
  tone(o, { f: 1250 * st(pitch), at: 0, peak: 0.8, a: 0.001, d: 0.04 });
  return noise(o, { peak: 0.3, a: 0.001, d: 0.012, filter: { type: 'bandpass', f0: 2500, q: 5 } });
}

/** Many short filtered-noise grains at random times (paper, crumple, scatter). */
function grains(o: Out, count: number, span: number, lo: number, hi: number, peak: number, q: number, start = 0): number {
  let end = 0;
  for (let i = 0; i < count; i++) {
    const at = start + (count === 1 ? 0 : (i / (count - 1)) * span * (0.75 + o.rand() * 0.5));
    const f0 = lo + o.rand() * (hi - lo);
    end = Math.max(end, noise(o, { at, peak: peak * (0.6 + o.rand() * 0.4), a: 0.002, d: 0.012 + o.rand() * 0.02, filter: { type: 'bandpass', f0, q } }));
  }
  return end;
}

type Recipe = (o: Out, pitch: number) => number;

/**
 * Cue recipes. `pitch` is in semitones (Heat tier, urgency, beat) and returns the length
 * in seconds (used for voice accounting).
 */
export const RECIPES: Record<CueId, Recipe> = {
  grab: (o) => {
    tone(o, { f: 560, f1: 780, glide: 0.035, peak: 0.8, a: 0.003, d: 0.06 });
    return noise(o, { peak: 0.25, a: 0.001, d: 0.015, filter: { type: 'bandpass', f0: 2500, q: 1 } }) + 0.02;
  },
  drop: (o) => {
    tone(o, { f: 240, f1: 120, glide: 0.08, peak: 0.9, a: 0.002, d: 0.11 });
    return noise(o, { peak: 0.45, a: 0.001, d: 0.05, filter: { type: 'lowpass', f0: 900 } });
  },
  catch: (o) => {
    tone(o, { f: 330, f1: 520, glide: 0.05, peak: 0.75, a: 0.002, d: 0.09 });
    tone(o, { type: 'triangle', f: 660, peak: 0.2, a: 0.002, d: 0.04 });
    return noise(o, { peak: 0.3, a: 0.001, d: 0.02, filter: { type: 'bandpass', f0: 1800, q: 1.5 } });
  },
  throw: (o) => {
    tone(o, { f: 380, f1: 560, peak: 0.15, a: 0.005, d: 0.09 });
    return noise(o, { peak: 1, a: 0.04, d: 0.15, filter: { type: 'bandpass', f0: 700, f1: 2000, q: 1.2 } });
  },
  dash: (o) => {
    noise(o, { peak: 0.4, a: 0.02, d: 0.15, filter: { type: 'lowpass', f0: 400 } });
    return noise(o, { peak: 1, a: 0.03, d: 0.17, filter: { type: 'bandpass', f0: 500, f1: 2600, q: 1.4 } });
  },
  knock: (o) => {
    // Cartoon bonk (fast pitch drop) + woody click, then the dropped item scattering.
    tone(o, { f: 700, f1: 170, glide: 0.12, peak: 0.9, a: 0.001, d: 0.22 });
    tone(o, { type: 'triangle', f: 1050, peak: 0.25, a: 0.001, d: 0.05 });
    grains(o, 4, 0.13, 2500, 4000, 0.35, 4, 0.06);
    let end = 0.4;
    for (let i = 0; i < 3; i++) end = Math.max(end, tone(o, { f: 1200 + o.rand() * 800, at: 0.07 + o.rand() * 0.12, peak: 0.1, a: 0.002, d: 0.04 }));
    return end;
  },
  knockThud: (o) => {
    // Body blow under the freeze: a sub drop, a chesty mid thump and a short muffled crunch.
    tone(o, { f: 96, f1: 40, glide: 0.2, peak: 1, a: 0.002, d: 0.38 });
    tone(o, { type: 'triangle', f: 170, f1: 75, glide: 0.09, peak: 0.45, a: 0.001, d: 0.14 });
    return noise(o, { peak: 0.55, a: 0.001, d: 0.07, filter: { type: 'lowpass', f0: 420, f1: 160 } }) + 0.04;
  },
  scoreLand: (o, pitch) => {
    // Coin onto the sign: a wooden tick and a small bright chime.
    const r = st(pitch);
    tone(o, { type: 'triangle', f: 1400 * r, peak: 0.45, a: 0.001, d: 0.025 });
    return Math.max(0.3, bell(o, 1568 * r, 0.012, 0.42, [[1, 0.6, 0.28], [2.4, 0.14, 0.12], [4.1, 0.04, 0.06]]));
  },
  chopKnock: (o, pitch) => {
    const f = 300 * st(pitch - 1.5 + o.rand() * 1.5);
    tone(o, { type: 'triangle', f, f1: f * 0.9, glide: 0.03, peak: 0.85, a: 0.001, d: 0.07 });
    return noise(o, { peak: 0.5, a: 0.001, d: 0.025, filter: { type: 'bandpass', f0: 1600, q: 3 } }) + 0.02;
  },
  washSwish: (o) => {
    tone(o, { f: 600, f1: 900, peak: 0.12, a: 0.01, d: 0.06, at: 0.05 });
    return noise(o, { peak: 0.9, a: 0.05, d: 0.18, filter: { type: 'bandpass', f0: 900, f1: 1500, q: 0.8 } });
  },
  extinguish: (o) => noise(o, { peak: 0.8, a: 0.02, d: 0.2, filter: { type: 'highpass', f0: 2500 } }),
  chopDone: (o) => {
    tone(o, { f: 1318.5, peak: 0.6, a: 0.002, d: 0.14 });
    return tone(o, { f: 1975.5, peak: 0.2, a: 0.002, d: 0.09, at: 0.015 }) + 0.05;
  },
  washDone: (o) => {
    tone(o, { f: 1046.5, peak: 0.5, a: 0.003, d: 0.1 });
    return tone(o, { f: 1318.5, peak: 0.5, a: 0.003, d: 0.14, at: 0.06 });
  },
  plateCold: (o) => {
    bell(o, 1760, 0, 0.5, [[1, 0.6, 0.3], [1.5, 0.25, 0.2]]);
    return noise(o, { peak: 0.15, a: 0.05, d: 0.25, filter: { type: 'highpass', f0: 4000 } });
  },
  cookDone: (o) => {
    bell(o, 659.25, 0, 0.75, CHIME);
    return bell(o, 880, 0.09, 0.75, CHIME);
  },
  burnWarn: (o, pitch) => {
    // pitch = 0..12: the beep climbs an octave as the burn gets closer.
    const f = 740 * st(pitch);
    tone(o, { type: 'triangle', f, peak: 0.8, a: 0.002, d: 0.07, filter: { type: 'lowpass', f0: 3000 } });
    return tone(o, { f: f * 2, peak: 0.15, a: 0.002, d: 0.04 }) + 0.03;
  },
  burnt: (o) => {
    tone(o, { f: 130, f1: 55, glide: 0.25, peak: 0.9, a: 0.002, d: 0.3 });
    // A minor second: sour on purpose.
    for (const f of [233.1, 246.9]) tone(o, { type: 'triangle', f, f1: f * 0.94, peak: 0.25, a: 0.005, d: 0.25, filter: { type: 'lowpass', f0: 1200, f1: 400 } });
    noise(o, { peak: 0.45, a: 0.001, d: 0.12, filter: { type: 'lowpass', f0: 400 } });
    return 0.45;
  },
  fireStart: (o) => {
    tone(o, { f: 70, f1: 50, peak: 0.35, a: 0.05, d: 0.5 });
    noise(o, { peak: 0.6, a: 0.05, d: 0.6, filter: { type: 'lowpass', f0: 300 } });
    return noise(o, { peak: 1, a: 0.15, d: 0.45, filter: { type: 'bandpass', f0: 250, f1: 1800, q: 0.9 } });
  },
  fireOut: (o) => {
    noise(o, { peak: 0.3, a: 0.005, d: 0.2, filter: { type: 'lowpass', f0: 800 } });
    return noise(o, { peak: 0.85, a: 0.01, d: 0.7, filter: { type: 'bandpass', f0: 5000, f1: 2200, q: 0.7 } });
  },
  ticketSpawn: (o) => {
    noise(o, { peak: 0.25, a: 0.01, d: 0.12, filter: { type: 'bandpass', f0: 700, q: 1 } });
    return grains(o, 6, 0.12, 2200, 3600, 0.75, 2.5) + 0.02;
  },
  ticketExpired: (o) => {
    noise(o, { peak: 0.35, a: 0.03, d: 0.3, filter: { type: 'bandpass', f0: 500, q: 1 } });
    return grains(o, 12, 0.35, 1200, 3500, 0.85, 3) + 0.02;
  },
  critic: (o) => {
    // Low gong: inharmonic partials with long decays, a slight pitch settle, and a mallet thump.
    const f = 98;
    const partials: [number, number, number][] = [
      [1, 0.55, 3.2], [1.006, 0.3, 3.0], [1.52, 0.4, 2.4], [2.0, 0.25, 2.6], [2.61, 0.3, 1.8], [3.2, 0.15, 1.2], [4.17, 0.1, 0.9],
    ];
    let end = 0;
    for (const [r, g, d] of partials) end = Math.max(end, tone(o, { f: f * r * 1.012, f1: f * r, glide: 0.15, peak: g, a: 0.006, d }));
    noise(o, { peak: 0.5, a: 0.002, d: 0.08, filter: { type: 'lowpass', f0: 500 } });
    return end;
  },
  deliver: (o, pitch) => {
    // Cash-register "ka-ching": drawer thunk, then a bright pentatonic arpeggio and a little sparkle.
    const r = st(pitch);
    noise(o, { peak: 0.45, a: 0.001, d: 0.03, filter: { type: 'bandpass', f0: 1800, q: 2 } });
    tone(o, { type: 'triangle', f: 523, peak: 0.3, a: 0.001, d: 0.05 });
    let end = 0;
    [587.3, 740, 880, 1174.7].forEach((f, i) => {
      end = Math.max(end, bell(o, f * r, 0.04 + i * 0.05, 0.5, [[1, 0.6, 0.5 + i * 0.12], [2, 0.22, 0.3], [3, 0.06, 0.15]]));
    });
    for (let i = 0; i < 5; i++) tone(o, { f: (2500 + o.rand() * 2000) * r, at: 0.2 + o.rand() * 0.3, peak: 0.06, a: 0.003, d: 0.08 });
    return Math.max(end, 0.6);
  },
  deliverRival: (o) => {
    // Duller, descending: the other crew got there first.
    for (const [f, at] of [[440, 0], [329.6, 0.13]] as const) {
      tone(o, { type: 'triangle', f, at, peak: 0.6, a: 0.008, d: 0.4, filter: { type: 'lowpass', f0: 1100 } });
      tone(o, { f: f / 2, at, peak: 0.35, a: 0.008, d: 0.35 });
    }
    grains(o, 2, 0.04, 900, 1400, 0.25, 2, 0.02);
    return 0.6;
  },
  serveRefused: (o) => {
    tone(o, { type: 'triangle', f: 392, peak: 0.7, a: 0.005, d: 0.09, filter: { type: 'lowpass', f0: 1500 } });
    return tone(o, { type: 'triangle', f: 311.1, f1: 293.7, at: 0.11, peak: 0.7, a: 0.005, d: 0.16, filter: { type: 'lowpass', f0: 1500 } });
  },
  heatUp: (o, pitch) => {
    const r = st(pitch);
    noise(o, { peak: 1, a: 0.25, d: 0.35, filter: { type: 'lowpass', f0: 300, f1: 2200, q: 1 } });
    tone(o, { f: 220 * r, f1: 440 * r, peak: 0.25, a: 0.2, d: 0.3 });
    return bell(o, 880 * r, 0.42, 0.25, CHIME);
  },
  heatDown: (o) => {
    tone(o, { f: 330, f1: 160, peak: 0.3, a: 0.01, d: 0.4 });
    return noise(o, { peak: 0.85, a: 0.02, d: 0.5, filter: { type: 'bandpass', f0: 1600, f1: 300, q: 1.2 } });
  },
  prepBell: (o) => {
    bell(o, 784, 0, 0.7, HANDBELL);
    return bell(o, 784, 0.28, 0.7, HANDBELL);
  },
  serviceBell: (o) => {
    bell(o, 659.25, 0, 0.5, HANDBELL);
    return bell(o, 987.8, 0.02, 0.4, HANDBELL);
  },
  rushFanfare: (o) => {
    // "da-da-da-DAAA" over a drum: D4 D4 F#4 A4, with A3/D4 harmony on the long note.
    const notes: [number, number, number][] = [[293.7, 0, 0.07], [293.7, 0.12, 0.07], [370, 0.24, 0.07], [440, 0.36, 0.55]];
    for (const [f, at, len] of notes) brass(o, f, at, 0.55, len);
    brass(o, 220, 0.36, 0.35, 0.55);
    brass(o, 293.7, 0.36, 0.3, 0.55);
    drum(o, 0, 0.6);
    drum(o, 0.36, 0.8);
    return 1.3;
  },
  lastCallBell: (o) => {
    let end = 0;
    for (const at of [0, 0.14, 0.28]) end = bell(o, 880, at, 0.55, CHIME);
    tone(o, { f: 220, peak: 0.4, a: 0.003, d: 0.3 });
    return end;
  },
  roundWhistle: (o) => {
    // Two toots of a soft trilled whistle (pure tone around 1.6 kHz with a fast warble).
    const toot = (at: number, len: number) => {
      const t = o.t + at;
      const osc = o.ctx.createOscillator();
      osc.frequency.value = 1600;
      const lfo = o.ctx.createOscillator();
      lfo.frequency.value = 28;
      const depth = o.ctx.createGain();
      depth.gain.value = 70;
      lfo.connect(depth);
      depth.connect(osc.frequency);
      const g = o.ctx.createGain();
      const end = envelope(g.gain, t, 0.7, 0.015, 0.06, len);
      osc.connect(g);
      g.connect(o.dest);
      for (const n of [osc, lfo]) {
        n.start(t);
        n.stop(end + 0.02);
      }
      noise(o, { at, peak: 0.12, a: 0.015, hold: len, d: 0.06, filter: { type: 'bandpass', f0: 1600, q: 4 } });
      return end - o.t;
    };
    toot(0, 0.12);
    return toot(0.26, 0.5);
  },
  matchWin: (o) => {
    [74, 76, 78, 81, 83, 86].forEach((m, i) => pluck(o, mtof(m), i * 0.1, 0.55));
    let end = 0;
    for (const m of [74, 78, 81]) end = bell(o, mtof(m), 0.62, 0.35, CHIME);
    drum(o, 0.62, 0.5);
    return Math.max(end, 1.6);
  },
  matchEnd: (o) => {
    let end = 0;
    [69, 66, 64, 62].forEach((m, i) => (end = pluck(o, mtof(m), i * 0.16, 0.6, i === 3 ? 0.9 : 0.35)));
    return end;
  },
  clockTick: (o, pitch) => woodblock(o, pitch) + 0.02,
};
