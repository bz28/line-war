/**
 * Skill levers. Every lever is a smooth, monotonic function of skill in [0, 1] so botsim can
 * model "a crew that is ~10% better" by nudging skill. Discrete choices (e.g. how many dishes a
 * crew juggles) are randomised with a probability that is itself smooth in skill.
 */
export type BotDifficultyName = 'easy' | 'normal' | 'hard';

export const DIFFICULTY_SKILL: Record<BotDifficultyName, number> = { easy: 0.3, normal: 0.6, hard: 0.9 };

export interface SkillParams {
  skill: number;
  /** Mean ticks between seeing a new decision and acting on it (fractional: dithered). */
  reactionTicks: number;
  /** Chance of an extra pause on a decision, and its length range in ticks. */
  hesitateChance: number;
  hesitateTicks: [number, number];
  /** Fraction of full stick deflection when walking (imprecision; humans rarely path perfectly). */
  moveScale: number;
  /** Relative noise on ticket scores (0 = always the best ticket). */
  ticketNoise: number;
  /** Chance to take a knock opportunity (rival in front, in dash range, holding an item, in the market). */
  knockChance: number;
  /** Chance to go out of the way to hunt a nearby rival carrying a premium item. */
  huntChance: number;
  /** Strength of avoiding rivals while carrying in the market (0 = ignore them). */
  defend: number;
  /** Mean number of dishes a crew juggles beyond one per bot (multitasking). */
  extraOrders: number;
  /** How early (seconds) a bot heads to a stove before the food is done. */
  stoveLeadSeconds: number;
  /** Ticks between glances around the kitchen for something urgent (food done, fire). */
  glanceTicks: number;
}

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export function skillParams(skillIn: number): SkillParams {
  const s = clamp01(skillIn);
  return {
    skill: s,
    // 0.3 → ~10 ticks (330 ms), 0.6 → ~7 (230 ms), 0.9 → ~4.5 (150 ms).
    reactionTicks: lerp(13, 3.5, s),
    hesitateChance: lerp(0.3, 0.02, s),
    hesitateTicks: [4, Math.round(lerp(30, 10, s))],
    moveScale: lerp(0.8, 1, s),
    ticketNoise: lerp(0.8, 0.05, s),
    knockChance: clamp01(lerp(-0.25, 1.1, s)),
    huntChance: clamp01(lerp(-0.4, 1, s)),
    defend: clamp01(lerp(-0.8, 1.2, s)),
    extraOrders: Math.max(0, lerp(-0.3, 2, s)),
    stoveLeadSeconds: lerp(0.3, 2.5, s),
    glanceTicks: lerp(45, 5, s),
  };
}
