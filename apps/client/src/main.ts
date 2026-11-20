import { INGREDIENTS, NIGHT_MARKET, RECIPES } from '@line-war/content';
import { createMatch, makeConfig, step, type MatchInputs, type PlayerId } from '@line-war/sim';
import { idleBot, type BotBrain } from './bots/types';
import { KeyboardInput, KeyboardState } from './input/keyboard';
import type { InputSource } from './input/types';
import { startLoop } from './loop';
import { GreyboxRenderer } from './render/greybox';
import type { Renderer } from './render/types';
import { DEFAULT_SETTINGS, type Settings } from './settings/types';

/** Wiring only. Menus, settings persistence, gamepads and bots plug in here. */
function startMatch(settings: Settings, root: HTMLElement) {
  const state = createMatch({
    arena: NIGHT_MARKET,
    recipes: RECIPES,
    ingredients: INGREDIENTS,
    config: makeConfig({ ...settings.match, seed: (Math.random() * 2 ** 31) | 0 }),
  });
  const keyboard = new KeyboardState();
  const sources: (InputSource | { bot: BotBrain })[] = settings.slots.map((slot) =>
    slot.kind === 'keyboard' ? new KeyboardInput(keyboard, slot.bindings) : { bot: idleBot },
  );
  const canvas = document.createElement('canvas');
  root.replaceChildren(canvas);
  const renderer: Renderer = new GreyboxRenderer(canvas, state);

  startLoop(
    state.config.tuning.tickRate,
    () => {
      const inputs = sources.map((s, i) => ('bot' in s ? s.bot.decide(state, i as PlayerId) : s.poll())) as MatchInputs;
      step(state, inputs);
    },
    (alpha) => renderer.render(state, alpha),
  );
}

startMatch(DEFAULT_SETTINGS, document.getElementById('app')!);
