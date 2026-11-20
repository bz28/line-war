/**
 * Fixed-timestep loop: the sim always advances in whole ticks (deterministic), rendering
 * runs every animation frame with an interpolation alpha.
 */
export function startLoop(tickRate: number, onTick: () => void, onFrame: (alpha: number) => void): () => void {
  const dt = 1000 / tickRate;
  let acc = 0;
  let last = performance.now();
  let raf = 0;
  const frame = (now: number) => {
    acc += Math.min(250, now - last); // avoid a spiral of death after a tab switch
    last = now;
    while (acc >= dt) {
      onTick();
      acc -= dt;
    }
    onFrame(acc / dt);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);
}
