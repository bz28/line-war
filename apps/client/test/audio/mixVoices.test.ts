import { describe, expect, it } from 'vitest';
import { CATEGORY_PRIORITY, CUES } from '../../src/audio/cues';
import { busGains, dbToGain, gainToDb, MUSIC_BUS_GAIN, PAN_WIDTH, panForX, sliderToGain } from '../../src/audio/mix';
import { VoiceLimiter } from '../../src/audio/voices';

describe('volume math', () => {
  it('maps sliders through a squared curve, clamped and NaN-safe', () => {
    expect(sliderToGain(0)).toBe(0);
    expect(sliderToGain(1)).toBe(1);
    expect(sliderToGain(0.5)).toBeCloseTo(0.25);
    expect(sliderToGain(2)).toBe(1);
    expect(sliderToGain(-1)).toBe(0);
    expect(sliderToGain(Number.NaN)).toBe(0);
  });

  it('master scales both buses; music and effects are independent', () => {
    expect(busGains({ master: 1, music: 1, effects: 1 })).toEqual({ music: MUSIC_BUS_GAIN, effects: 1 });
    expect(busGains({ master: 0, music: 1, effects: 1 })).toEqual({ music: 0, effects: 0 });
    const g = busGains({ master: 0.5, music: 0, effects: 1 });
    expect(g.music).toBe(0);
    expect(g.effects).toBeCloseTo(0.25);
  });

  it('dB helpers round-trip', () => {
    expect(dbToGain(0)).toBe(1);
    expect(gainToDb(dbToGain(-12))).toBeCloseTo(-12);
    expect(gainToDb(0)).toBe(-Infinity);
  });

  it('pans by world x within the pan width', () => {
    expect(panForX(0, 25)).toBeCloseTo(-PAN_WIDTH);
    expect(panForX(12.5, 25)).toBeCloseTo(0);
    expect(panForX(25, 25)).toBeCloseTo(PAN_WIDTH);
    expect(panForX(99, 25)).toBeCloseTo(PAN_WIDTH);
    expect(panForX(Number.NaN, 25)).toBe(0);
  });

  it('frequent sounds are quiet and low priority; the must-hear ones are loud and high priority', () => {
    // gainDb is a voice gain (recipes differ in density); measured loudness is in the PR level table.
    for (const id of ['grab', 'chopKnock', 'drop'] as const) {
      expect(CUES[id].category).toBe('frequent');
      expect(CUES[id].gainDb).toBeLessThanOrEqual(-24);
    }
    for (const id of ['critic', 'deliverRival', 'burnWarn'] as const) {
      expect(CATEGORY_PRIORITY[CUES[id].category]).toBeGreaterThanOrEqual(CATEGORY_PRIORITY.alert);
      expect(CUES[id].gainDb).toBeGreaterThan(-12);
    }
  });
});

describe('voice limiting', () => {
  const req = (key: string, priority = 0, maxConcurrent = 3, minGap = 0) => ({ key, priority, maxConcurrent, minGap, duration: 1 });

  it('caps concurrent voices of one cue', () => {
    const v = new VoiceLimiter<string>(16);
    const ok = Array.from({ length: 30 }, () => v.admit(req('grab', 0, 3), 0).ok).filter(Boolean);
    expect(ok).toHaveLength(3);
    expect(v.admit(req('grab', 0, 3), 1.01).ok).toBe(true); // earlier ones ended
  });

  it('drops retriggers inside minGap', () => {
    const v = new VoiceLimiter<string>(16);
    expect(v.admit(req('chop', 0, 9, 0.05), 0).ok).toBe(true);
    expect(v.admit(req('chop', 0, 9, 0.05), 0.02)).toEqual({ ok: false, reason: 'gap' });
    expect(v.admit(req('chop', 0, 9, 0.05), 0.06).ok).toBe(true);
  });

  it('when full, a higher-priority cue steals the oldest lowest-priority voice; equal priority is dropped', () => {
    const v = new VoiceLimiter<string>(4);
    for (let i = 0; i < 4; i++) expect(v.admit(req(`low${i}`), i * 0.01).ok).toBe(true);
    expect(v.admit(req('low9'), 0.05)).toEqual({ ok: false, reason: 'budget' });
    const r = v.admit(req('critic', 3), 0.05);
    expect(r.ok && r.stolen?.key).toBe('low0');
    expect(v.active(0.05)).toHaveLength(4);
  });

  it('never exceeds the budget however busy the tick', () => {
    const v = new VoiceLimiter<string>(8);
    for (let i = 0; i < 200; i++) v.admit(req(`c${i % 20}`, i % 4, 2), 0);
    expect(v.active(0).length).toBeLessThanOrEqual(8);
  });
});
