import type { PlayerInput } from '@line-war/sim';

/** Produces one tick of input for one player slot. Must do its own edge detection. */
export interface InputSource {
  poll(): PlayerInput;
  dispose?(): void;
}
