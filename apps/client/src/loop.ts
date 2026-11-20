/** A running loop: stop it, or hold the sim for a few ms (hit-stop) while frames keep drawing. */
export interface Loop {
  stop(): void;
  /** Freeze sim ticks for `ms` (the longest pending hold wins). Time held is not caught up afterwards. */
  hold(ms: number): void;
}

/**
 * How much simulated time a frame adds to the accumulator: wall time since the last frame,
 * capped (no spiral of death after a tab switch), minus any part spent inside a hit-stop hold.
 */
export function frameAdvance(last: number, now: number, holdUntil: number, cap = 250): number {
  const from = Math.max(last, holdUntil);
  return Math.min(cap, Math.max(0, now - from));
}

/**
 * Fixed-timestep loop: the sim always advances in whole ticks (deterministic), rendering
 * runs every animation frame with an interpolation alpha.
 */
export function startLoop(tickRate: number, onTick: () => void, onFrame: (alpha: number) => void): Loop {
  const dt = 1000 / tickRate;
  let acc = 0;
  let last = performance.now();
  let holdUntil = 0;
  let raf = 0;
  const frame = (now: number) => {
    acc += frameAdvance(last, now, holdUntil);
    last = now;
    while (acc >= dt && now >= holdUntil) {
      onTick();
      acc -= dt;
    }
    onFrame(acc / dt);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return {
    stop: () => cancelAnimationFrame(raf),
    hold: (ms) => {
      holdUntil = Math.max(holdUntil, performance.now() + ms);
    },
  };
}
