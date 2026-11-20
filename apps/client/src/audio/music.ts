/**
 * OWNER: audio track. A light procedural night-market loop: plucked D-major-pentatonic
 * melody (random walk, chord tones on the downbeats) over a soft saw pad, with a frame
 * drum and shaker. Layers and tempo rise with the phase; a lookahead scheduler keeps
 * timing tight regardless of frame rate.
 */
import type { Phase } from '@line-war/sim';
import { drum, mtof, mulberry, pluck, shaker, type Out } from './synth';

export type MusicMode = 'prep' | 'service' | 'rush' | 'lastCall' | 'interlude' | 'off';

export function musicModeForPhase(phase: Phase): MusicMode {
  switch (phase) {
    case 'prep':
    case 'service':
    case 'rush':
    case 'lastCall':
      return phase;
    case 'roundOver':
      return 'interlude';
    case 'matchOver':
      return 'off';
  }
}

interface Layer {
  bpm: number;
  /** Chance an eighth-note step plays a melody note. */
  notes: number;
  bass: boolean;
  /** 0 none, 1 light, 2 busy, 3 busiest. */
  perc: 0 | 1 | 2 | 3;
  pad: boolean;
}

export const LAYERS: Record<MusicMode, Layer> = {
  prep: { bpm: 80, notes: 0.3, bass: false, perc: 0, pad: true },
  service: { bpm: 84, notes: 0.42, bass: true, perc: 1, pad: true },
  rush: { bpm: 96, notes: 0.55, bass: true, perc: 2, pad: true },
  lastCall: { bpm: 104, notes: 0.6, bass: true, perc: 3, pad: true },
  interlude: { bpm: 72, notes: 0.12, bass: false, perc: 0, pad: true },
  off: { bpm: 80, notes: 0, bass: false, perc: 0, pad: false },
};

/** Chord loop, two bars each: Dadd9, Bm7, Gmaj7, Asus4 (no C#: everything stays pentatonic-friendly). */
const CHORDS: { pad: number[]; root: number; tones: number[] }[] = [
  { pad: [50, 57, 64, 66], root: 50, tones: [2, 6, 9] },
  { pad: [47, 54, 62, 69], root: 47, tones: [11, 2, 6] },
  { pad: [43, 59, 62, 66], root: 43, tones: [7, 11, 2] },
  { pad: [45, 52, 57, 62], root: 45, tones: [9, 4, 2] },
];
/** D major pentatonic, A4..D6. */
const SCALE = [69, 71, 74, 76, 78, 81, 83, 86];

const STEPS_PER_BAR = 8;
const BARS_PER_CHORD = 2;
/** Scheduler tick and how far ahead it books notes (seconds). */
export const SCHEDULE_INTERVAL_MS = 50;
export const LOOKAHEAD = 0.25;

const PAD_PEAK = 0.055;
const PLUCK_PEAK = 0.32;
const BASS_PEAK = 0.4;
const DRUM_PEAK = 0.3;
const SHAKER_PEAK = 0.09;

export class MusicSequencer {
  private mode: MusicMode = 'off';
  private step = 0;
  private nextTime = 0;
  private degree = 3;
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly rand = mulberry(2024);
  private readonly pluckBus: GainNode;

  /**
   * @param onBeat called for each scheduled quarter note with its ctx time (used for the
   *   Last Call clock, which plays on the effects bus).
   */
  constructor(
    private readonly ctx: BaseAudioContext,
    private readonly dest: AudioNode,
    private readonly onBeat?: (time: number, beat: number, mode: MusicMode) => void,
  ) {
    // Plucks get a soft dotted-eighth echo, darkened in the feedback path.
    this.pluckBus = ctx.createGain();
    this.pluckBus.connect(dest);
    const delay = ctx.createDelay(1);
    delay.delayTime.value = 0.55;
    const fb = ctx.createGain();
    fb.gain.value = 0.28;
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 2200;
    const wet = ctx.createGain();
    wet.gain.value = 0.3;
    this.pluckBus.connect(delay);
    delay.connect(tone);
    tone.connect(fb);
    fb.connect(delay);
    tone.connect(wet);
    wet.connect(dest);
  }

  get currentMode(): MusicMode {
    return this.mode;
  }

  setMode(mode: MusicMode): void {
    if (mode === this.mode) return;
    const wasOff = this.mode === 'off';
    this.mode = mode;
    if (wasOff && mode !== 'off') {
      // Start on a fresh phrase.
      this.step = 0;
      this.nextTime = this.ctx.currentTime + 0.05;
    }
  }

  /** Begin the real-time scheduler (browser only). */
  start(): void {
    if (this.timer !== null) return;
    this.timer = setInterval(() => this.schedule(this.ctx.currentTime + LOOKAHEAD), SCHEDULE_INTERVAL_MS);
  }

  /** Book every step that starts before `until`. Returns how many steps were booked. */
  schedule(until: number): number {
    if (this.mode === 'off') return 0;
    // If the tab slept, skip ahead rather than firing a burst of late notes.
    if (this.nextTime < this.ctx.currentTime - 0.1) this.nextTime = this.ctx.currentTime + 0.02;
    let n = 0;
    while (this.nextTime < until && n < 64) {
      this.playStep(this.step, this.nextTime);
      this.nextTime += 60 / LAYERS[this.mode].bpm / 2;
      this.step++;
      n++;
    }
    return n;
  }

  private playStep(step: number, t: number): void {
    const layer = LAYERS[this.mode];
    const beatLen = 60 / layer.bpm;
    const inBar = step % STEPS_PER_BAR;
    const chordStep = STEPS_PER_BAR * BARS_PER_CHORD;
    const chord = CHORDS[Math.floor(step / chordStep) % CHORDS.length]!;
    const o: Out = { ctx: this.ctx, dest: this.dest, t, rand: this.rand };

    if (layer.pad && step % chordStep === 0) this.pad(chord.pad, t, chordStep * (beatLen / 2));

    if (this.rand() < layer.notes || (inBar === 0 && layer.notes > 0)) {
      this.degree = this.nextDegree(inBar === 0 || inBar === 4 ? chord.tones : null);
      const accent = inBar % 2 === 0 ? 1 : 0.75;
      pluck({ ...o, dest: this.pluckBus }, mtof(SCALE[this.degree]!), 0, PLUCK_PEAK * accent, 0.3 + this.rand() * 0.2);
    }

    if (layer.bass && (inBar === 0 || inBar === 4 || (layer.perc >= 2 && inBar === 7))) {
      pluck(o, mtof(chord.root), 0, BASS_PEAK * (inBar === 7 ? 0.6 : 1), 0.5);
    }

    const p = layer.perc;
    if (p >= 1 && (inBar === 0 || (p >= 2 && (inBar === 3 || inBar === 4)) || (p >= 3 && inBar === 6))) drum(o, 0, DRUM_PEAK * (inBar === 0 ? 1 : 0.7));
    if (p >= 1 && (inBar % 2 === 1 || p >= 2)) shaker(o, 0, SHAKER_PEAK * (inBar % 2 === 1 ? 1 : 0.55));
    if (p >= 3) shaker(o, beatLen / 4, SHAKER_PEAK * 0.4);

    if (step % 2 === 0) this.onBeat?.(t, step / 2, this.mode);
  }

  /** Random walk over the scale; on strong beats prefer a nearby chord tone. */
  private nextDegree(chordTones: number[] | null): number {
    if (chordTones) {
      const near = SCALE.map((m, i) => ({ i, d: Math.abs(i - this.degree) })).filter(({ i }) => chordTones.includes(SCALE[i]! % 12));
      near.sort((a, b) => a.d - b.d);
      const pick = near[Math.min(near.length - 1, this.rand() < 0.7 ? 0 : 1)];
      if (pick) return pick.i;
    }
    const steps = [-2, -1, -1, 1, 1, 2];
    const next = this.degree + steps[Math.floor(this.rand() * steps.length)]!;
    return Math.max(0, Math.min(SCALE.length - 1, next));
  }

  private pad(notes: number[], t: number, len: number): void {
    const { ctx } = this;
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    lp.Q.value = 0.5;
    lp.connect(g);
    g.connect(this.dest);
    const attack = 0.8;
    const release = 1.5;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(PAD_PEAK, t + attack);
    g.gain.setValueAtTime(PAD_PEAK, t + len);
    g.gain.linearRampToValueAtTime(0, t + len + release);
    for (const m of notes) {
      for (const detune of [-6, 6]) {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = mtof(m);
        osc.detune.value = detune;
        osc.connect(lp);
        osc.start(t);
        osc.stop(t + len + release + 0.05);
      }
    }
  }

  dispose(): void {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
    this.mode = 'off';
  }
}
