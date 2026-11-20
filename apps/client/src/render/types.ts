import type { MatchState } from '@line-war/sim';

/** OWNER: render track. Draws a MatchState; never mutates it. */
export interface Renderer {
  /** Called once per animation frame. alpha in [0,1) = progress toward the next sim tick. */
  render(state: MatchState, alpha: number): void;
  /** Called after every sim step, so per-tick events aren't lost when one frame runs several steps. */
  onTick?(state: MatchState): void;
  resize?(width: number, height: number): void;
  dispose?(): void;
}
