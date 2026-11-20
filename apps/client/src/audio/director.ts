/**
 * OWNER: audio track. AudioDirector: the game's sound, as a Renderer.
 *
 * Wiring (main.ts): create once per match, call onTick(state) after every step, resume()
 * on the first user gesture, setVolumes() when settings change, dispose() at the end.
 * Without Web Audio (jsdom, old browsers) every method is a silent no-op.
 *
 * Graph:  voices -> effects bus --\
 *         loops  -> effects bus ---> trim -> freeze -> impact low-pass -> compressor -> limiter -> output
 *         music  -> duck -> muffle -> music bus --/                      /
 *         knock + knockThud -> direct bus -> trim ------------------------/  (skip the hit-stop dip)
 */
import { teamOf, type MatchState, type PlayerId, type TeamId } from '@line-war/sim';
import type { Renderer } from '../render/types';
import type { Settings } from '../settings/types';
import { CATEGORY_PRIORITY, CUES, cuesForEvents, DUCKING_CUES, IMPACT_CUES, type Cue, type CueId } from './cues';
import { burnBeepInterval, burnWarnings, criticAnnouncements, inFlightIds, loopTargets, workHits } from './derive';
import { LoopChannel, type LoopId } from './loops';
import {
  busGains,
  COMPRESSOR,
  dbToGain,
  HIT_STOP_CLOSE,
  HIT_STOP_DIP_HZ,
  HIT_STOP_DUCK_DB,
  HIT_STOP_OPEN,
  IMPACT_OPEN_HZ,
  INPUT_TRIM,
  LIMITER,
  MAX_VOICES,
  MUSIC_DUCK_DB,
  OUTPUT_GAIN,
  SCORE_LAND_RIVAL_PITCH,
  SIGN_PAN,
  type Volumes,
} from './mix';
import { MusicSequencer, musicModeForPhase } from './music';
import { mulberry, RECIPES } from './synth';
import { VoiceLimiter, type Voice } from './voices';

export interface AudioDirectorOptions {
  /** Crew the local player(s) belong to; null if both crews have local humans. Default 0. */
  localTeam?: TeamId | null;
  volumes?: Volumes;
  /** Context factory (tests inject a fake). Return null for "no audio". */
  createContext?: () => BaseAudioContext | null;
  /** Run the music's real-time scheduler (off in tests, which call scheduleMusic directly). */
  realtime?: boolean;
  /**
   * False when the context is shared for the app's lifetime (main.ts): dispose() then only
   * unplugs this match's graph instead of closing the context. Default true.
   */
  ownsContext?: boolean;
  /** Errors inside onTick are swallowed so audio can't stop the game; this sees them (tests rethrow). */
  onError?: (err: unknown) => void;
}

interface Graph {
  ctx: BaseAudioContext;
  effects: GainNode;
  music: GainNode;
  duck: GainNode;
  muffle: BiquadFilterNode;
  /** Whole-mix low-pass, closed briefly during a knock hit-stop. */
  impact: BiquadFilterNode;
  /** Whole-mix gain, ducked with the low-pass during a hit-stop. */
  freeze: GainNode;
  /** Final output node (unplugged on dispose when the context is shared). */
  out: GainNode;
  /** Effects bus for IMPACT_CUES, which bypass the freeze and the low-pass. */
  direct: GainNode;
  loops: Record<LoopId, LoopChannel>;
  seq: MusicSequencer;
}

/** Small lead so a cue booked "now" is not already in the past when the audio thread reads it. */
const LEAD = 0.01;
const STEAL_FADE = 0.03;

function defaultContext(): BaseAudioContext | null {
  const g = globalThis as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
  const Ctor = g.AudioContext ?? g.webkitAudioContext;
  return Ctor ? new Ctor({ latencyHint: 'interactive' }) : null;
}

export class AudioDirector implements Renderer {
  private graph: Graph | null = null;
  private failed = false;
  private disposed = false;
  private paused = false;
  private volumes: Volumes;
  private localTeam: TeamId | null;
  private readonly createContext: () => BaseAudioContext | null;
  private readonly realtime: boolean;
  private readonly ownsContext: boolean;
  private readonly onError: (err: unknown) => void;
  private readonly limiter = new VoiceLimiter<CueId>(MAX_VOICES);
  private readonly voiceGains = new Map<number, GainNode>();
  private readonly rand = mulberry(99);

  // Per-tick memory for state-derived sounds.
  private prevHeat: [number, number] = [0, 0];
  private inFlight = new Set<number>();
  private readonly workPrev = new Map<number, number>();
  private readonly announcedCritics = new Set<number>();
  private readonly nextBeep = new Map<number, number>();
  private clockBeat = 0;

  constructor(opts: AudioDirectorOptions = {}) {
    this.localTeam = opts.localTeam === undefined ? 0 : opts.localTeam;
    this.volumes = opts.volumes ?? { master: 0.8, music: 0.8, effects: 0.8 };
    this.createContext = opts.createContext ?? defaultContext;
    this.realtime = opts.realtime ?? true;
    this.ownsContext = opts.ownsContext ?? true;
    this.onError = opts.onError ?? (() => undefined);
  }

  /** True once a working AudioContext exists. */
  get active(): boolean {
    return this.graph !== null;
  }

  /** Unlock audio. Call from a user-gesture handler (keydown/pointerdown); safe to call repeatedly. */
  resume(): void {
    if (this.disposed) return;
    const ctx = this.ensureGraph()?.ctx as Partial<AudioContext> | undefined;
    try {
      // 'suspended' before a gesture, 'interrupted' after a call or audio-session loss (Safari/iOS).
      const state = ctx?.state as string | undefined;
      if (state !== undefined && state !== 'running' && state !== 'closed' && typeof ctx?.resume === 'function') void ctx.resume().catch(() => undefined);
    } catch {
      // ignore: stays silent
    }
  }

  setVolumes(v: Volumes): void {
    this.volumes = { ...v };
    this.applyVolumes();
  }

  setLocalTeam(team: TeamId | null): void {
    this.localTeam = team;
  }

  /** Paused: cooking/fire beds stop and the music drops back and darkens. */
  setPaused(paused: boolean): void {
    this.paused = paused;
    // Unpausing is a gesture and the moment to recover a context the OS interrupted.
    if (!paused) this.resume();
    const g = this.graph;
    if (!g) return;
    const t = g.ctx.currentTime;
    g.muffle.frequency.setTargetAtTime(paused ? 700 : 20000, t, 0.15);
    g.duck.gain.setTargetAtTime(paused ? dbToGain(-8) : 1, t, 0.15);
    if (paused) for (const ch of Object.values(g.loops)) ch.set(0, 0);
  }

  render(): void {
    // Audio is driven by onTick; nothing to draw.
  }

  onTick(state: MatchState): void {
    const g = this.graph;
    if (!g || this.disposed) {
      this.remember(state);
      return;
    }
    try {
      this.tick(g, state);
    } catch (err) {
      // Audio must never take the game down.
      this.onError(err);
    }
    this.remember(state);
  }

  /** Book music up to ctx time `until` (tests; the browser uses the real-time scheduler). */
  scheduleMusic(until: number): number {
    return this.graph?.seq.schedule(until) ?? 0;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    const g = this.graph;
    this.graph = null;
    if (!g) return;
    try {
      g.seq.dispose();
      for (const ch of Object.values(g.loops)) ch.dispose();
      const ctx = g.ctx as Partial<AudioContext>;
      if (!this.ownsContext) g.out.disconnect();
      else if (typeof ctx.close === 'function') void ctx.close().catch(() => undefined);
    } catch {
      // ignore
    }
  }

  // ---------- internals ----------

  private ensureGraph(): Graph | null {
    if (this.graph || this.failed) return this.graph;
    try {
      const ctx = this.createContext();
      if (!ctx) {
        this.failed = true;
        return null;
      }
      this.graph = this.build(ctx);
      this.applyVolumes();
      if (this.realtime) this.graph.seq.start();
    } catch {
      this.failed = true;
      this.graph = null;
    }
    return this.graph;
  }

  private build(ctx: BaseAudioContext): Graph {
    const comp = ctx.createDynamicsCompressor();
    const lim = ctx.createDynamicsCompressor();
    for (const [node, s] of [[comp, COMPRESSOR], [lim, LIMITER]] as const) {
      node.threshold.value = s.threshold;
      node.knee.value = s.knee;
      node.ratio.value = s.ratio;
      node.attack.value = s.attack;
      node.release.value = s.release;
    }
    const out = ctx.createGain();
    out.gain.value = OUTPUT_GAIN;
    comp.connect(lim);
    lim.connect(out);
    out.connect(ctx.destination);

    const effects = ctx.createGain();
    const trim = ctx.createGain();
    trim.gain.value = INPUT_TRIM;
    const impact = ctx.createBiquadFilter();
    impact.type = 'lowpass';
    impact.frequency.value = IMPACT_OPEN_HZ;
    const freeze = ctx.createGain();
    trim.connect(freeze);
    freeze.connect(impact);
    impact.connect(comp);
    effects.connect(trim);
    const direct = ctx.createGain();
    const directTrim = ctx.createGain();
    directTrim.gain.value = INPUT_TRIM;
    direct.connect(directTrim);
    directTrim.connect(comp);
    const music = ctx.createGain();
    music.connect(trim);
    const muffle = ctx.createBiquadFilter();
    muffle.type = 'lowpass';
    muffle.frequency.value = 20000;
    muffle.connect(music);
    const duck = ctx.createGain();
    duck.connect(muffle);

    const loops: Record<LoopId, LoopChannel> = {
      sizzle: new LoopChannel(ctx, effects, 'sizzle'),
      bubble: new LoopChannel(ctx, effects, 'bubble'),
      fire: new LoopChannel(ctx, effects, 'fire'),
    };
    const seq = new MusicSequencer(ctx, duck, (time, _beat, mode) => {
      if (mode !== 'lastCall') return;
      this.play({ id: 'clockTick', pan: 0, pitch: this.clockBeat++ % 2 === 0 ? 0 : -5 }, time);
    });
    return { ctx, effects, music, duck, muffle, impact, freeze, direct, out, loops, seq };
  }

  private applyVolumes(): void {
    const g = this.graph;
    if (!g) return;
    const { music, effects } = busGains(this.volumes);
    const t = g.ctx.currentTime;
    g.music.gain.setTargetAtTime(music, t, 0.05);
    g.effects.gain.setTargetAtTime(effects, t, 0.05);
    g.direct.gain.setTargetAtTime(effects, t, 0.05);
  }

  private tick(g: Graph, state: MatchState): void {
    const now = g.ctx.currentTime + LEAD;

    g.seq.setMode(musicModeForPhase(state.round.phase));

    const cues = cuesForEvents(state.events, state, {
      localTeam: this.localTeam,
      prevHeat: this.prevHeat,
      inFlight: this.inFlight,
    });
    for (const _ of criticAnnouncements(state, this.localTeam, this.announcedCritics)) cues.push({ id: 'critic', pan: 0, pitch: 0 });
    for (const hit of workHits(state, this.workPrev)) {
      const id: CueId = hit.kind === 'chop' ? 'chopKnock' : hit.kind === 'wash' ? 'washSwish' : 'extinguish';
      cues.push({ id, pan: hit.pan, pitch: hit.beat ? -2 : 0 });
    }
    this.burnBeeps(state, cues);
    // Most important first, so the voice budget goes to what matters.
    cues.sort((a, b) => CATEGORY_PRIORITY[CUES[b.id].category] - CATEGORY_PRIORITY[CUES[a.id].category]);
    for (const cue of cues) this.play(cue, now);

    const loops = loopTargets(state);
    for (const id of ['sizzle', 'bubble', 'fire'] as const) {
      const target = loops[id];
      g.loops[id].set(this.paused ? 0 : target.level, target.pan);
    }
  }

  /** Warning beeps for vessels about to burn / catch fire, faster and higher as it gets closer. */
  private burnBeeps(state: MatchState, cues: Cue[]): void {
    const live = new Set<number>();
    for (const w of burnWarnings(state)) {
      live.add(w.tile);
      const due = this.nextBeep.get(w.tile) ?? state.tick;
      if (state.tick < due) continue;
      this.nextBeep.set(w.tile, state.tick + burnBeepInterval(w.urgency, state.config.tuning.tickRate));
      cues.push({ id: 'burnWarn', pan: w.pan, pitch: Math.round(w.urgency * 12) });
    }
    for (const tile of [...this.nextBeep.keys()]) if (!live.has(tile)) this.nextBeep.delete(tile);
  }

  /**
   * A knock's hit-stop: a weighty thud at the victim, and the rest of the mix ducks behind a
   * low-pass for the `seconds` the match is frozen, then opens back up. The knock's own cues
   * (IMPACT_CUES) skip the dip, so they are the one thing heard clearly.
   */
  hitStop(pan: number, seconds: number): void {
    const g = this.graph;
    if (!g || this.disposed || this.paused) return;
    const now = g.ctx.currentTime + LEAD;
    const f = g.impact.frequency;
    f.cancelScheduledValues(now);
    f.setTargetAtTime(HIT_STOP_DIP_HZ, now, HIT_STOP_CLOSE);
    f.setTargetAtTime(IMPACT_OPEN_HZ, now + Math.max(0, seconds), HIT_STOP_OPEN);
    const v = g.freeze.gain;
    v.cancelScheduledValues(now);
    v.setTargetAtTime(dbToGain(HIT_STOP_DUCK_DB), now, HIT_STOP_CLOSE);
    v.setTargetAtTime(1, now + Math.max(0, seconds), HIT_STOP_OPEN);
    // Booked after the dip starts, so the thud's attack is the one thing that cuts through.
    this.play({ id: 'knockThud', pan, pitch: 0 }, now);
  }

  /** A score token landed on a crew sign: a tick-chime from that side of the band. */
  scoreLand(team: TeamId): void {
    if (!this.graph || this.disposed) return;
    const rival = this.localTeam !== null && this.localTeam !== team;
    this.play({ id: 'scoreLand', pan: team === 0 ? -SIGN_PAN : SIGN_PAN, pitch: rival ? SCORE_LAND_RIVAL_PITCH : 0 });
  }

  /** Book one cue at ctx time `at` if the voice budget allows. Returns the voice, or null. */
  play(cue: Cue, at?: number): Voice<CueId> | null {
    const g = this.graph;
    if (!g) return null;
    const spec = CUES[cue.id];
    const when = at ?? g.ctx.currentTime + LEAD;
    // Length is only known after synthesis; book with a generous estimate and correct it.
    const admit = this.limiter.admit(
      { key: cue.id, priority: CATEGORY_PRIORITY[spec.category], maxConcurrent: spec.maxConcurrent, minGap: spec.minGap, duration: 1 },
      when,
    );
    if (!admit.ok) return null;
    if (admit.stolen) {
      const sg = this.voiceGains.get(admit.stolen.id);
      sg?.gain.setTargetAtTime(0, when, STEAL_FADE / 3);
      this.voiceGains.delete(admit.stolen.id);
    }
    const ctx = g.ctx;
    const vg = ctx.createGain();
    vg.gain.value = dbToGain(spec.gainDb);
    let tail: AudioNode = vg;
    if (cue.pan !== 0 && typeof ctx.createStereoPanner === 'function') {
      const p = ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, cue.pan));
      vg.connect(p);
      tail = p;
    }
    tail.connect(IMPACT_CUES.has(cue.id) ? g.direct : g.effects);
    const len = RECIPES[cue.id]({ ctx, dest: vg, t: when, rand: this.rand }, cue.pitch);
    admit.voice.end = when + len;
    this.voiceGains.set(admit.voice.id, vg);
    const live = new Set(this.limiter.active(when).map((v) => v.id));
    for (const id of [...this.voiceGains.keys()]) if (!live.has(id)) this.voiceGains.delete(id);
    if (DUCKING_CUES.has(cue.id) && !this.paused) {
      const d = g.duck.gain;
      d.cancelScheduledValues(when);
      d.setTargetAtTime(dbToGain(MUSIC_DUCK_DB), when, 0.03);
      d.setTargetAtTime(1, when + Math.min(len, 1.2), 0.4);
    }
    return admit.voice;
  }

  private remember(state: MatchState): void {
    this.prevHeat = [state.teams[0].heat, state.teams[1].heat];
    this.inFlight = inFlightIds(state);
  }
}

/**
 * The crew the listener plays for: the team of the local humans (keyboard/gamepad slots).
 * null when both crews have local humans, or nobody does (then no serve counts as the rival's).
 */
export function localTeamFor(slots: Settings['slots']): TeamId | null {
  const teams = new Set<TeamId>();
  slots.forEach((s, i) => {
    if (s.kind === 'keyboard' || s.kind === 'gamepad') teams.add(teamOf(i as PlayerId));
  });
  return teams.size === 1 ? [...teams][0]! : null;
}
