import './art/tokens.css';
import { INGREDIENTS, NIGHT_MARKET, RECIPES } from '@line-war/content';
import { createMatch, makeConfig, NO_INPUT, step, type MatchInputs, type MatchState, type PlayerId } from '@line-war/sim';
import { createBots } from '@line-war/bots';
import { browserGamepads, GamepadInput } from './input/gamepad';
import { KeyboardInput, KeyboardState } from './input/keyboard';
import type { InputSource } from './input/types';
import { startLoop } from './loop';
import { HudRenderer } from './hud/hud';
import { buildDemoState } from './render/demo';
import { GreyboxRenderer } from './render/greybox';
import type { Renderer } from './render/types';
import type { Settings } from './settings/types';
import { App, type MatchSession, type StartSession } from './ui/app';

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

const boundKeys = (settings: Settings) => settings.slots.flatMap((s) => (s.kind === 'keyboard' ? Object.values(s.bindings) : []));

/** Let the match-over stamp play on the HUD before the result menu covers it. */
const MATCH_OVER_DELAY_MS = 2600;

/** Dev only: `?demo` freezes a hand-built mid-round state (every HUD feature at once) for design review. */
const DEMO = import.meta.env.DEV && new URLSearchParams(location.search).has('demo');

const startSession: StartSession = (settings, host, hooks): MatchSession => {
  const state = DEMO
    ? buildDemoState()
    : createMatch({
        arena: NIGHT_MARKET,
        recipes: RECIPES,
        ingredients: INGREDIENTS,
        config: makeConfig({ ...settings.match, seed: (Math.random() * 2 ** 31) | 0 }),
      });
  const keyboard = new KeyboardState();
  let sources = createInputSources(settings, keyboard, () => state);
  let paused = false;
  let overNotified = false;

  // Stage layout: the DOM HUD band on top, the world canvas filling the rest (.lw-world has a definite size).
  host.replaceChildren();
  const hud = new HudRenderer(host);
  const world = document.createElement('div');
  world.className = 'lw-world';
  const canvas = document.createElement('canvas');
  const fps = document.createElement('div');
  fps.className = 'lw-fps';
  world.append(canvas);
  host.append(world, fps);
  const renderers: Renderer[] = [new GreyboxRenderer(canvas, state), hud];
  let overTimer: ReturnType<typeof setTimeout> | undefined;

  const applyDisplay = (s: Settings) => {
    fps.hidden = !s.display.showFps;
    keyboard.setCaptured(paused ? [] : boundKeys(s));
  };
  let current = settings;
  applyDisplay(current);

  /** Poll human sources once and discard, so a button held while leaving a menu is not an edge. */
  const primeHumans = () => {
    for (const s of sources) if (s instanceof KeyboardInput || s instanceof GamepadInput) s.poll();
  };

  let frames = 0;
  let fpsSince = performance.now();
  const stop = startLoop(
    state.config.tuning.tickRate,
    () => {
      if (paused || DEMO) return;
      step(state, sources.map((s) => s.poll()) as MatchInputs);
      for (const r of renderers) r.onTick?.(state);
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
    setPaused(p) {
      if (p === paused) return;
      paused = p;
      if (!p) primeHumans();
      applyDisplay(current);
    },
    applySettings(s) {
      current = s;
      for (const src of sources) src.dispose?.();
      sources = createInputSources(s, keyboard, () => state);
      primeHumans();
      applyDisplay(s);
    },
    dispose() {
      stop();
      clearTimeout(overTimer);
      for (const src of sources) src.dispose?.();
      keyboard.dispose();
      for (const r of renderers) r.dispose?.();
      host.replaceChildren();
    },
  };
};

new App({ root: document.getElementById('app')!, startSession });
