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
import { browserStorage } from './settings/store';
import { App, type MatchSession, type StartSession } from './ui/app';
import { addUnlocks, humanTeams, loadCollection, saveCollection, unlocksFromEvents } from './collection/store';

/** One InputSource per player slot, built from settings. */
function createInputSources(settings: Settings, keyboard: KeyboardState, getState: () => MatchState): InputSource[] {
  // All bots of a match are created together so crewmates can share a plan.
  const bots = createBots(settings.slots.map((s) => (s.kind === 'bot' ? { difficulty: s.difficulty } : null)));
  return settings.slots.map((slot, i): InputSource => {
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
        charms: level.charms, charmsPerRound: level.charmsPerRound,
        config: makeConfig({ ...settings.match, seed: (Math.random() * 2 ** 31) | 0 }),
      });
  const keyboard = new KeyboardState();
  let sources = createInputSources(settings, keyboard, () => state);
  let paused = false;
  let overNotified = false;

  // Stage layout: the DOM HUD band on top, the world canvas filling the rest (.lw-world has a definite size).
  host.replaceChildren();
  const motion = typeof window.matchMedia === 'function' ? window.matchMedia(REDUCED_MOTION) : null;
  const reducedMotion = () => motion?.matches ?? false;
  const storage = browserStorage();
  const coach = !DEMO && Coach.wanted(storage) ? coachFor(settings) : null;
  const audio = new AudioDirector({ localTeam: localTeamFor(settings.slots), volumes: settings.audio });
  audio.resume(); // startSession runs from a menu gesture, so this usually unlocks at once
  // The world canvas is built first so the HUD can map world positions (score tokens, coach pointer).
  let worldRenderer: GreyboxRenderer | null = null;
  // Charm collection: banks by a crew with a local human unlock that variant on this machine.
  const newCharms: string[] = [];
  const display = loadCollection(storage).display;
  const hud = new HudRenderer(host, {
    locate: (pos) => worldRenderer?.toClient(pos) ?? null,
    coach: coach ? { ...coach, storage } : undefined,
    onScoreLand: (team) => audio.scoreLand(team),
    displayCharms: display ? Object.fromEntries([...humanTeams(settings.slots)].map((t) => [t, display])) : undefined,
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
  if (import.meta.env.DEV) (window as unknown as { __lw?: unknown }).__lw = { state, newCharms, locate: (pos: { x: number; y: number }) => worldRenderer?.toClient(pos) ?? null };

  const unlockAudio = () => audio.resume();
  window.addEventListener('pointerdown', unlockAudio, { once: true });
  window.addEventListener('keydown', unlockAudio, { once: true });

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
    setPaused(p) {
      if (p === paused) return;
      paused = p;
      audio.setPaused(p);
      if (!p) primeHumans();
      applyDisplay(current);
    },
    applySettings(s) {
      current = s;
      for (const src of sources) src.dispose?.();
      sources = createInputSources(s, keyboard, () => state);
      primeHumans();
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
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      audio.dispose();
      host.replaceChildren();
    },
  };
};

new App({ root: document.getElementById('app')!, startSession });
