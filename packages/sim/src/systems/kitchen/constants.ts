/**
 * Fixed geometry/timing constants written into docs/RULES.md (sections 1, 2 and 5) rather than
 * tuning.ts. Kept in one place so systems never carry magic numbers.
 */

/** §1: interaction target is the tile containing pos + facing × this. */
export const TARGET_OFFSET = 0.75;
/** §2: items dropped on the floor land at pos + facing × this. */
export const DROP_OFFSET = 0.6;
/** §1: dazed players move at this fraction of playerSpeed. */
export const DAZED_SPEED_FACTOR = 0.5;
/** §5: an empty-handed player catches a flying item whose centre is within playerRadius + this. */
export const CATCH_MARGIN = 0.3;
/** §5: the thrower cannot catch their own throw for this many seconds. */
export const SELF_CATCH_SECONDS = 0.2;

/** Implementation detail: max distance (tiles) moved per collision sub-step, so nothing tunnels. */
export const SUBSTEP = 0.1;
/** Implementation detail: float tolerance. */
export const EPS = 1e-9;
