# LINE WAR — rules spec (first version, Night Market)

This is the implementation spec. It turns the design doc's **Rules reference** into exact behaviour.
All numbers come from `packages/sim/src/tuning.ts` (names in `code`). If something is not covered here,
stop and ask in the PR; do not invent rules.

Time: the sim runs at `tickRate` (30) ticks/s. Durations below are seconds; convert with
`secondsToTicks` (or `timerTicks` for cook/burn/chop/wash/spawn timers, which Brunch Speed stretches ×1.5).

## 1. Players and movement (kitchen track)
- Speed `playerSpeed` tiles/s; `move` is clamped to length 1. Dazed players move at half speed.
- `facing` = normalized last non-zero move direction (initially up). It does not change while standing still.
- Players are circles of radius `playerRadius`. They collide with every non-floor tile and with each other (push apart, equal split).
  Each tick every player's move is applied together in equal slices of at most `playerRadius / 2`, with walls and
  player separation resolved after each slice, so no move (a dash) can carry one player through another. Separation
  measures every overlapping pair from the same positions and applies the pushes together (independent of player order).
  A dash that meets a rival straight on shoves them along; one that meets them off-centre slides round them.
- **Rival kitchen is solid.** Tiles whose `tileOwner` is the other team are treated as walls for that player.
  Door columns (zone `none`) and the market are open to both.
- **Dash**: on `dash` press, if `dashCooldown == 0` and not dazed: move `dashDistance` along `facing` over
  `dashSeconds` (collisions still apply), set cooldown `dashCooldownSeconds`. Emit `dash`. Holding an item is fine.
  While dashing, the first rival touched (centres within 2 × radius) **ahead of the dash** (dot(dash direction,
  victim − dasher) > 0) triggers `tryKnock(by, victim)` once per dash. A rival beside or behind you doesn't count,
  so a dash stopped by a wall can't knock someone already touching you from the side.
- Target tile for interactions: the tile containing `pos + facing × 0.75`. If that is floor, the target is the floor
  position itself (for drops / picking up floor items).

## 2. Grab button (kitchen track)
Only stations owned by the player's team, plus market crates, can be used. Order of checks:

| Holding | Target | Result |
| --- | --- | --- |
| nothing | floor item within `interactReach` in front (nearest) | pick it up |
| nothing | pantry | new raw ingredient of that kind |
| nothing | crate | `takeFromCrate` (null = nothing happens) |
| nothing | plate rack with stock > 0 | new clean empty plate, stock − 1 |
| nothing | counter / board with an item | pick it up |
| nothing | stove whose vessel is `burnt` | pick up the burnt food (ingredient item, state `burnt`) and reset the vessel |
| ingredient | empty counter / board | place it |
| ingredient | counter/board holding a plate | add to the plate if it **fits** (below) |
| ingredient | stove | add to the vessel if allowed (section 4) |
| ingredient or plate | trash | ingredient: destroyed. plate: contents emptied, `cold` reset |
| plate | own pass | `deliverPlate`; on `ok` the plate leaves the player's hands |
| plate | counter/board holding an ingredient | add that ingredient to the plate if it fits |
| plate | stove with vessel `done` | move all vessel contents onto the plate if they fit; vessel resets to empty |
| plate | empty counter / board | place it |
| anything | floor | drop as a `FloorItem` at `pos + facing × 0.6` |

**Fits**: the plate is clean and not cold, and `plate.contents + new food` is a sub-multiset of at least one recipe.
Adding food sets `platedAtTick = tick`. Dirty plates accept nothing.

## 3. Work button (hold)
- Board with a raw choppable ingredient: `workTicks` += 1 per tick held; at `chopSeconds` it becomes `chopped`,
  `workTicks` = 0, emit `chopDone`. Letting go keeps progress. `player.working` = true while progressing.
- Sink with `dirtyPlates > 0`: at `washSeconds` one plate is washed: `dirtyPlates − 1`, that team's plate rack `stock + 1`, emit `washDone`.
- Fire on the target tile: `extinguishTicks` += 1; at `extinguishSeconds` the fire is removed (and a burning stove's
  vessel resets to empty), emit `fireOut`.

## 4. Cooking (kitchen track)
- Pan accepts one ingredient whose `cook.vessel == 'pan'` and `state == cook.from`, only when empty. Cooking starts immediately.
- Pot accepts ingredients with `cook.vessel == 'pot'` and matching state, up to `potCapacity`; cooking starts when full.
- Status timeline (from cooking start): `done` at cook time (contents become `cooked`, emit `cookDone`);
  `burnt` at cook + burn time (contents become `burnt`, emit `burnt`, call `registerMistake(team)`);
  `fire` at + `fireAfterBurnSeconds` (create `FireState` on that tile, emit `fireStart`).
  Pan: `panCookSeconds` / `panBurnSeconds`. Pot: `potCookSeconds` / `potBurnSeconds`.
- Fire spreads every `fireSpreadSeconds` to one random (rng) orthogonally adjacent interactive tile that isn't burning.
  A burning tile can't be used for anything except extinguishing.

## 5. Items in flight and plates (kitchen track)
- **Throw**: the held item becomes a `FloorItem` moving along `facing` at `throwSpeed`, for at most `throwRange` tiles.
  Each tick it stops at the first of: an empty counter/board it enters (placed there); a player with empty hands whose
  centre is within `playerRadius + 0.3` (caught; the thrower can't catch their own throw for 0.2 s; rivals can catch);
  a wall or a rival-kitchen tile (stops on the last open tile); max range (rests on the floor). Emit `throw`.
- Floor items never move on their own once resting (vel 0).
- **Cold plates**: a plate with food goes `cold = true` when `tick ≥ platedAtTick + plateColdSeconds`, wherever it is. Emit `plateCold` once.
- **Dirty plate returns**: entries in `state.dirtyPlateReturns` whose `atTick` has passed add 1 to that team's sink `dirtyPlates`.
  (Night Market has one sink per kitchen; use the sink the team owns this round.)

## 6. Market (rules track)
- Each tick, every crate's `stock` is raised to at least `marketExtraStock + (number of board tickets whose recipe
  contains that ingredient, counting duplicates)`. Stock never goes down except by takes.
- `takeFromCrate`: if stock > 0, stock − 1 and return a new raw ingredient item.
- `tryKnock(by, victim)` succeeds only if: different teams, the **victim** stands in a `market` zone tile, the victim
  holds an item, and `victim.knockImmuneTicks == 0`. Effect: the item becomes a resting `FloorItem` at
  `victim.pos + dashDir × knockPopDistance` (pulled back to the nearest walkable point inside the market if that is
  blocked); victim `dazedTicks = dazeSeconds`, `knockImmuneTicks = knockImmuneSeconds`; emit `knock`.
  Dazed players can't grab, throw or dash.

## 7. Tickets (rules track)
- No tickets during prep. The first spawns when prep ends, then every `ticketSpawnSeconds`
  (`rushTicketSpawnSeconds` during Dinner Rush). No spawns during Last Call. Skip a spawn if the board already holds
  `maxTickets` non-critic tickets (try again next interval). When the phase becomes rush, the next spawn is
  pulled in to at most `now + rushTicketSpawnSeconds` (so the first rush ticket doesn't wait a full service interval).
- Recipe picked with `weightedIndex` over recipe weights. `expireTick = spawnTick + ticketLifetimeSeconds`. Expired tickets are removed (`ticketExpired`).
- **Critic**: once per round at `criticAtFraction × roundSeconds`, if `criticEnabled`: a premium recipe (weighted among
  premium recipes), `baseValue × criticMultiplier`, `isCritic = true`. `visibleTo` = the team with the lower score
  (null if tied), `revealAllAtTick = now + criticEarlySeconds`. Does not count toward `maxTickets`.
- **Delivery** (`deliverPlate`): refuse (`serveRefused` event, no penalty) unless phase is not prep, the player faces
  their own pass, the plate is clean, not cold, non-empty, and matches a recipe that has a ticket visible to the
  team. The plate wins the **oldest** such ticket.

## 8. Scoring and Heat (rules track)
- Points = `round(ticket.baseValue × freshness × heatMultipliers[heat] × (rush ? rushMultiplier : 1)) + tip`, where
  `freshness = 1 − (1 − freshnessFloor) × age / lifetime` and tip = `tipPoints` if served within `tipWindowSeconds`
  of `platedAtTick` (tipPoints is 0 for now). `rush` is true when `rushEnabled` and the phase is `rush` **or `lastCall`**
  (Last Call is the end of Dinner Rush, see §9).
- After scoring: `cleanStreak + 1`; `heat` = number of `heatThresholds` ≤ cleanStreak. Emit `heatChange` when it changes.
- `registerMistake`: if heat > 0, heat − 1 and `cleanStreak = heatThresholds[heat − 1]` (or 0 when heat becomes 0);
  if heat is 0, cleanStreak = 0. Emit `heatChange` if heat changed.
- Successful delivery: remove the ticket, `score += points`, push `{team, atTick: now + dirtyPlateReturnSeconds}`, emit `delivered`.

## 9. Rounds (rules track)
- Phase from `round.tick` (seconds = tick / tickRate): `prep` < `prepSeconds` ≤ `service` <
  `roundSeconds − rushSeconds` ≤ `rush` < `roundSeconds − lastCallSeconds` ≤ `lastCall` < `roundSeconds`.
  If `rushEnabled` is false there is no rush (service runs until last call) and no rush multiplier. Emit `phaseChange` on every change.
  Dinner Rush is the final `rushSeconds` of the round and **includes Last Call**: when `rushEnabled` is true the
  rush multiplier (§8) applies during both `rush` and `lastCall`.
- At `roundSeconds`: phase `roundOver`; higher score gets `roundsWon + 1` (tie: nobody); add each team's round
  score to `state.totalScores` (match total, reset only by `createMatch`); emit `roundEnd`.
- Wait `intermissionSeconds`, then decide the match (it is capped at `bestOf` rounds):
  1. a team with `roundsWon ≥ ceil(bestOf / 2)` wins;
  2. otherwise, if fewer than `bestOf` rounds have been played, start the next round;
  3. otherwise (`bestOf` rounds played) the team with more `roundsWon` wins; if level, the team with the higher
     `totalScores` wins; if still level the match is a **draw** (`winner = null`).
  When decided: phase `matchOver`, set `state.winner` (null for a draw), emit `matchEnd` with that winner.
- Next round: reset stations (`createStations`), players (`spawnPlayers`), floor items, fires, tickets, dirty returns,
  team score/heat/cleanStreak (keep roundsWon), `round.tick = 0`, `criticSpawned = false`, phase `prep`, index + 1.
  `swapped` stays false (kitchen swap is held for later).
- During `roundOver` and `matchOver` no other system runs (already handled by `step`).

## 10. Charms (rules track)
Charms are small figurines of the LINE WAR mascot (a round paper-lantern bunny) that turn up in the market.
They exist only when `config.charmsEnabled` is true **and** the match was created with a non-empty list of
charm variants (`createMatch({ charms })`, from the level's content). Otherwise nothing in this section runs and
no rng is drawn, so the match plays exactly as without charms.

- **Item**: a charm is an item `{ type: 'charm', variant, floorSinceTick }`. It can be held, dropped, thrown,
  caught and knocked loose exactly like any other item (§1, §2, §5, §6), rivals included. It can never be put on a
  station: Grab while holding a charm and facing any station (counter, board, stove, pass, trash, crate...) does
  nothing; facing floor drops it (§2). A charm can't be trashed. A flying charm treats counters and boards like
  any other non-floor tile: it stops on the last open tile instead of landing on them. Holding a charm fills
  your hands (you can't take food, catch, or grab anything else until it is gone).
- **Spawning**: `charmsPerRound` charms per round. The count is **per level**: each level sets it in content (`LevelDef.charmsPerRound`: Night Market 3, Harbor Pier 3, Rooftop Garden 1) and it is passed to `createMatch({ charmsPerRound })`, which overrides `tuning.charmsPerRound` (the default, 3, used when no count is given). Charm *k* (0-based) is due at round tick
  `prepEnd + floor((k + 1) × (lastCallStart − prepEnd) / (charmsPerRound + 1))` (§9 round times), so spawns
  are spread evenly over service and Dinner Rush and never fall in prep or Last Call. When a charm is due and the
  phase is `service` or `rush`, candidate tiles are the **floor tiles of the market's middle column** (the
  column halfway between the market's leftmost and rightmost columns; if the market is an even number of columns
  wide, both middle columns), skipping any tile that contains a floor item or a player's centre, in tile-index
  order. If none of them is free, the candidates are instead the free market floor tiles nearest the market's
  centre (the middle of its bounding box; straight-line distance between tile centres) whose mirror tile (same row,
  mirrored column) is a free market floor tile too, so they come in mirror-symmetric pairs; again in tile-index
  order. Littering the middle column therefore can't deny a charm. If there is at least one candidate: pick one with `randomInt(candidates)`, then the variant with
  `weightedIndex` over the variant weights, and put a resting charm (thrownBy null) at the tile centre; emit
  `charmSpawned { itemId, tile, variant }`. If there is no candidate the charm stays due and is retried every
  tick; a charm still due when Last Call starts is dropped. Because the arenas are mirrored, the middle column is
  the same distance from both kitchens.
- **Banking**: at the end of every tick, each player (in id order) holding a charm while their centre is on a tile
  of their own kitchen (tileOwner = their team) banks it: the charm is removed, the team gets `charmPoints` points
  (added to the round score) and `charmHeatTiers` Heat tiers (capped at the top tier; each tier raised sets
  `cleanStreak` to that tier's threshold, emit `heatChange`). Emit `charmBanked { team, player, itemId, variant }`.
  Banking is not a delivery: it doesn't touch tickets, freshness or the rush multiplier.
- **Fading**: a charm that rests on the floor (vel 0) for `charmLifetimeSeconds` without being picked up
  disappears; emit `charmFaded { itemId, variant }`. Its `floorSinceTick` is the tick it came to rest; it is
  cleared whenever the charm is held or in flight, so the clock restarts after each pickup, throw or knock.
- **Round end**: when a round ends (§9), every charm still in play (held or on the floor) is removed without an
  event. Charms are not carried over to the next round.
