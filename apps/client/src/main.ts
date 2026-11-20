import './art/tokens.css';
import { levelById } from '@line-war/content';
import { createMatch, makeConfig, NO_INPUT, step, type MatchInputs, type MatchState, type PlayerId } from '@line-war/sim';
import { createBots } from '@line-war/bots';
import { browserGamepads, GamepadInput } from './input/gamepad';
import { KeyboardInput, KeyboardState } from './input/keyboard';
import type { InputSource } from './input/types';
import { AudioDirector, localTeamFor } from './audio';
import { panForX } from './audio/mix';
import { startLoop } from './loop';
import { HudRenderer } from './hud/hud';
import { buildDemoState } from './render/demo';
import { GreyboxRenderer } from './render/greybox';
import type { Renderer } from './render/types';
import type { Settings } from './settings/types';
import { Coach, coachKeysFor, type CoachKeys } from './hud/coach';
import { HIT_STOP_MS } from './render/feel';
import { browserStorage, changedSlots } from './settings/store';
import { AudioUnlock } from './audio/unlock';
import { App, type MatchSession, type StartSession } from './ui/app';
import { addUnlocks, displayTeam, humanTeams, loadCollection, saveCollection, unlocksFromEvents } from './collection/store';
import { recordRoundEnds, type RoundResult } from './ui/results';
import { liftSplash, titleFontsReady } from './ui/splash';

/**
 * One InputSource per player slot, built from settings. With `only`, just those slots are built
 * (the rest are left undefined for the caller to keep): a mid-match settings change must not
 * reset the bots and inputs that did not change.
 */
function createInputSources(settings: Settings, keyboard: KeyboardState, getState: () => MatchState, only?: readonly number[]): (InputSource | undefined)[] {
  // All bots of a match are created together so crewmates can share a plan.
  const bots = createBots(settings.slots.map((s, i) => (s.kind === 'bot' && (!only || only.includes(i)) ? { difficulty: s.difficulty } : null)));
  return settings.slots.map((slot, i): InputSource | undefined => {
    if (only && !only.includes(i)) return undefined;
    switch (slot.kind) {
      case 'keyboard':
        return new KeyboardInput(keyboard, slot.bindings);
      case 'gamepad':
        return new GamepadInput(slot.index, browserGamepads);
      case 'bot': {
        const brain = bots[i]!;
        return { poll: () => brain.decide(getState(), i as PlayerId) };
      }
      case 'none':
        return { poll: () => NO_INPUT };
    }
  });
}

/** Which player slots are played on this machine (keyboard or gamepad), per PlayerId. */
const humanSlots = (settings: Settings): boolean[] => settings.slots.map((s) => s.kind === 'keyboard' || s.kind === 'gamepad');

/** The first local human and their control labels, for the first-match coach. */
function coachFor(settings: Settings): { player: PlayerId; keys: CoachKeys } | null {
  const i = settings.slots.findIndex((s) => s.kind === 'keyboard' || s.kind === 'gamepad');
  if (i < 0) return null;
  const keys = coachKeysFor(settings.slots[i]!);
  return keys ? { player: i as PlayerId, keys } : null;
}

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

/** One AudioContext for the app's lifetime, woken by every real gesture (see audio/unlock.ts). */
const audioUnlock = new AudioUnlock(() => {
  const g = globalThis as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
  const Ctor = g.AudioContext ?? g.webkitAudioContext;
  return Ctor ? new Ctor({ latencyHint: 'interactive' }) : null;
});

const boundKeys = (settings: Settings) => settings.slots.flatMap((s) => (s.kind === 'keyboard' ? Object.values(s.bindings) : []));

/** Let the match-over stamp play on the HUD before the result menu covers it. */
const MATCH_OVER_DELAY_MS = 2600;

/** Dev only: `?demo` freezes a hand-built mid-round state (every HUD feature at once) for design review. */
const DEMO = import.meta.env.DEV && new URLSearchParams(location.search).has('demo');

const startSession: StartSession = (settings, host, hooks): MatchSession => {
  const level = levelById(settings.level);
  const state = DEMO
    ? buildDemoState()
    : createMatch({
        arena: level.arena,
        recipes: level.recipes,
        ingredients: level.ingredients,
        charms: level.charms, charmsPerRound: level.charmsPerRound, tuning: level.tuning,
        config: makeConfig({ ...settings.match, seed: (Math.random() * 2 ** 31) | 0 }),
      });
  const keyboard = new KeyboardState();
  let sources = createInputSources(settings, keyboard, () => state) as InputSource[];
  let paused = false;
  let overNotified = false;

  // Stage layout: the DOM HUD band on top, the world canvas filling the rest (.lw-world has a definite size).
  host.replaceChildren();
  const motion = typeof window.matchMedia === 'function' ? window.matchMedia(REDUCED_MOTION) : null;
  const reducedMotion = () => motion?.matches ?? false;
  const storage = browserStorage();
  const coach = !DEMO && Coach.wanted(storage) ? coachFor(settings) : null;
  const audio = new AudioDirector({
    localTeam: localTeamFor(settings.slots),
    volumes: settings.audio,
    createContext: () => audioUnlock.context() as AudioContext | null,
    ownsContext: false,
  });
  audio.resume(); // startSession runs from a menu gesture, so this usually unlocks at once
  audioUnlock.wake();
  // The world canvas is built first so the HUD can map world positions (score tokens, coach pointer).
  let worldRenderer: GreyboxRenderer | null = null;
  // Charm collection: banks by a crew with a local human unlock that variant on this machine.
  const newCharms: string[] = [];
  const rounds: RoundResult[] = [];
  const display = loadCollection(storage).display;
  const displayCrew = displayTeam(settings.slots);
  const hud = new HudRenderer(host, {
    locate: (pos) => worldRenderer?.toClient(pos) ?? null,
    coach: coach ? { ...coach, storage } : undefined,
    onScoreLand: (team) => audio.scoreLand(team),
    rounds: () => rounds,
    displayCharms: display && displayCrew !== null ? { [displayCrew]: display } : undefined,
  });
  const world = document.createElement('div');
  world.className = 'lw-world';
  const canvas = document.createElement('canvas');
  const fps = document.createElement('div');
  fps.className = 'lw-fps';
  world.append(canvas);
  host.append(world, fps);
  worldRenderer = new GreyboxRenderer(canvas, state, { reducedMotion: reducedMotion(), screenShake: settings.display.screenShake });
  const renderers: Renderer[] = [worldRenderer, hud];
  let overTimer: ReturnType<typeof setTimeout> | undefined;
  // Dev only: expose the live state so scripted playtests can steer and inspect.
  if (import.meta.env.DEV) (window as unknown as { __lw?: unknown }).__lw = { state, newCharms, rounds, locate: (pos: { x: number; y: number }) => worldRenderer?.toClient(pos) ?? null };


  const applyDisplay = (s: Settings) => {
    fps.hidden = !s.display.showFps;
    keyboard.setCaptured(paused ? [] : boundKeys(s));
    worldRenderer?.setDisplay({
      screenShake: s.display.screenShake,
      reducedMotion: reducedMotion(),
      colorblindShapes: s.display.colorblindShapes,
      humans: humanSlots(s),
      scoreTokens: !reducedMotion(),
    });
  };
  const onMotionChange = () => applyDisplay(current);
  motion?.addEventListener?.('change', onMotionChange);
  let current = settings;
  applyDisplay(current);

  /** Poll human sources once and discard, so a button held while leaving a menu is not an edge. */
  const primeHumans = () => {
    for (const s of sources) if (s instanceof KeyboardInput || s instanceof GamepadInput) s.poll();
  };

  let frames = 0;
  let fpsSince = performance.now();
  const loop = startLoop(
    state.config.tuning.tickRate,
    () => {
      if (paused || DEMO) return;
      step(state, sources.map((s) => s.poll()) as MatchInputs);
      // Hit-stop: a knock freezes the match for a beat so the impact lands.
      if (!reducedMotion()) {
        const knock = state.events.find((e) => e.type === 'knock');
        if (knock) {
          loop.hold(HIT_STOP_MS);
          audio.hitStop(panForX(state.players[knock.victim]!.pos.x, state.arena.width), HIT_STOP_MS / 1000);
        }
      }
      for (const r of renderers) r.onTick?.(state);
      audio.onTick(state);
      recordRoundEnds(state.events, rounds);
      const unlocked = unlocksFromEvents(state.events, humanTeams(current.slots));
      if (unlocked.length) {
        const { collection, fresh } = addUnlocks(loadCollection(storage), unlocked);
        if (fresh.length) {
          saveCollection(collection, storage);
          newCharms.push(...fresh);
        }
      }
      if (state.round.phase === 'matchOver' && !overNotified) {
        overNotified = true;
        overTimer = setTimeout(() => hooks.onMatchOver(), MATCH_OVER_DELAY_MS);
      }
    },
    (alpha) => {
      for (const r of renderers) r.render(state, alpha);
      frames++;
      const now = performance.now();
      if (now - fpsSince >= 500) {
        fps.textContent = `${Math.round((frames * 1000) / (now - fpsSince))} fps`;
        frames = 0;
        fpsSince = now;
      }
    },
  );

  return {
    state,
    newCharms,
    rounds,
    setPaused(p) {
      if (p === paused) return;
      paused = p;
      audio.setPaused(p);
      if (!p) primeHumans();
      applyDisplay(current);
    },
    applySettings(s) {
      const changed = changedSlots(current.slots, s.slots);
      current = s;
      if (changed.length) {
        const fresh = createInputSources(s, keyboard, () => state, changed);
        sources = sources.map((src, i) => {
          if (!changed.includes(i)) return src;
          src.dispose?.();
          return fresh[i]!;
        });
        primeHumans();
      }
      applyDisplay(s);
      audio.setVolumes(s.audio);
      audio.setLocalTeam(localTeamFor(s.slots));
    },
    dispose() {
      loop.stop();
      motion?.removeEventListener?.('change', onMotionChange);
      clearTimeout(overTimer);
      for (const src of sources) src.dispose?.();
      keyboard.dispose();
      for (const r of renderers) r.dispose?.();
      audio.dispose();
      host.replaceChildren();
    },
  };
};

// The title mounts when its fonts are in (or after a short cap), then the first-paint splash lifts.
void titleFontsReady(document.fonts).then(() => {
  new App({ root: document.getElementById('app')!, startSession, onGesture: audioUnlock.wake });
  liftSplash(document.getElementById('lw-splash'));
});
