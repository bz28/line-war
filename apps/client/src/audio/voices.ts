/**
 * OWNER: audio track. One-shot voice budget (pure, no Web Audio).
 *
 * Rules, in order: a cue retriggered inside its minGap is dropped; a cue already at its
 * maxConcurrent is dropped; when the global budget is full the oldest voice of the lowest
 * priority is stolen, but only by a cue of strictly higher priority (otherwise the newcomer
 * is dropped). So a busy tick can never stack 30 grabs, and a Critic gong always plays.
 */

export interface VoiceRequest<K extends string> {
  key: K;
  priority: number;
  maxConcurrent: number;
  minGap: number;
  /** Seconds the voice will sound. */
  duration: number;
}

export interface Voice<K extends string> {
  id: number;
  key: K;
  priority: number;
  start: number;
  end: number;
}

export type Admission<K extends string> =
  | { ok: true; voice: Voice<K>; stolen: Voice<K> | null }
  | { ok: false; reason: 'gap' | 'concurrent' | 'budget' };

export class VoiceLimiter<K extends string> {
  private voices: Voice<K>[] = [];
  private lastStart = new Map<K, number>();
  private nextId = 1;

  constructor(readonly maxVoices: number) {}

  /** Voices still sounding at `now`. */
  active(now: number): readonly Voice<K>[] {
    this.voices = this.voices.filter((v) => v.end > now);
    return this.voices;
  }

  admit(req: VoiceRequest<K>, now: number): Admission<K> {
    const voices = this.active(now);
    const last = this.lastStart.get(req.key);
    if (last !== undefined && now - last < req.minGap) return { ok: false, reason: 'gap' };
    if (voices.filter((v) => v.key === req.key).length >= req.maxConcurrent) return { ok: false, reason: 'concurrent' };

    let stolen: Voice<K> | null = null;
    if (voices.length >= this.maxVoices) {
      let victim: Voice<K> | null = null;
      for (const v of voices) {
        if (!victim || v.priority < victim.priority || (v.priority === victim.priority && v.start < victim.start)) victim = v;
      }
      if (!victim || victim.priority >= req.priority) return { ok: false, reason: 'budget' };
      stolen = victim;
      this.voices = voices.filter((v) => v !== victim);
    }
    const voice: Voice<K> = { id: this.nextId++, key: req.key, priority: req.priority, start: now, end: now + req.duration };
    this.voices.push(voice);
    this.lastStart.set(req.key, now);
    return { ok: true, voice, stolen };
  }

  clear(): void {
    this.voices = [];
    this.lastStart.clear();
  }
}
