/**
 * OWNER: audio track. Mixing constants and volume math (pure, no Web Audio).
 *
 * Every cue has a category and a level in dB relative to full scale on the effects bus.
 * Frequent sounds sit low; sounds that announce something you must react to sit high.
 * A master compressor + limiter catches whatever stacks up on a busy tick.
 */

export interface Volumes {
  master: number;
  music: number;
  effects: number;
}

export const dbToGain = (db: number): number => Math.pow(10, db / 20);
export const gainToDb = (g: number): number => (g <= 0 ? -Infinity : 20 * Math.log10(g));
const clamp01 = (v: number): number => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0);

/**
 * Settings slider (0..1) to linear gain. Squared so the slider feels even to the ear:
 * 0.5 is about -12 dB, 0.8 about -4 dB, 0 is silent. Non-finite input is treated as 0.
 */
export const sliderToGain = (v: number): number => clamp01(v) ** 2;

/** Final linear gains of the two buses after the master slider. */
export function busGains(v: Volumes): { music: number; effects: number } {
  const master = sliderToGain(v.master);
  return { music: master * sliderToGain(v.music) * MUSIC_BUS_GAIN, effects: master * sliderToGain(v.effects) };
}

/** Music sits under the effects so gameplay sounds always read. */
export const MUSIC_BUS_GAIN = dbToGain(-19);
/** Music ducks this far under important stingers (Critic, phase changes, rival serves). */
export const MUSIC_DUCK_DB = -7;

/** Pan range used for world-x panning: never hard-left/right, which sounds unnatural on speakers. */
export const PAN_WIDTH = 0.7;

/** World x (tiles) to stereo pan in [-PAN_WIDTH, PAN_WIDTH]; arena centre is 0. */
export function panForX(x: number, arenaWidth: number): number {
  if (!(arenaWidth > 0) || !Number.isFinite(x)) return 0;
  const p = (x / arenaWidth) * 2 - 1;
  return Math.max(-1, Math.min(1, p)) * PAN_WIDTH;
}

/** Voice budget: at most this many one-shots sound at once. */
export const MAX_VOICES = 16;

/** Master compressor (glue) then a brick-wall-ish limiter. */
export const COMPRESSOR = { threshold: -18, knee: 8, ratio: 3, attack: 0.004, release: 0.2 } as const;
export const LIMITER = { threshold: -3, knee: 0, ratio: 20, attack: 0.001, release: 0.08 } as const;
/** Drive into the compressor (the mix is built quiet; this brings it up to game loudness). */
export const INPUT_TRIM = dbToGain(5);
/** Post-limiter output trim. */
export const OUTPUT_GAIN = dbToGain(-1);

/** Hit-stop: the whole mix ducks behind a low-pass while the match is frozen, then opens back up. */
export const HIT_STOP_DIP_HZ = 520;
/** Open (no filtering) frequency of the impact filter. */
export const IMPACT_OPEN_HZ = 20000;
/**
 * The rest of the mix also drops this far for the freeze. A low-pass alone is nearly inaudible
 * under the Dinner Rush music, whose loudness sits below 520 Hz (pad, bass, drum): measured
 * -0.5 LU. The impact cues (IMPACT_CUES) skip both, so the hit lands in a hush.
 */
export const HIT_STOP_DUCK_DB = -10;
/** Time constants (s) of the dip closing and reopening. */
export const HIT_STOP_CLOSE = 0.006;
export const HIT_STOP_OPEN = 0.07;
/** Score tokens: the local crew's sign ticks bright, the rival's a fourth lower. */
export const SCORE_LAND_RIVAL_PITCH = -5;
/** Pan of the crew signs (HUD band: Jade left, Ember right). */
export const SIGN_PAN = 0.55;
