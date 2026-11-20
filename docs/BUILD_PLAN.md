# Build plan

Follows the design doc's validation plan: rules + bots + headless simulation (step 4) come before any art.
Greybox (plain shapes) is allowed because it is needed to debug and for the step-5 human playtest.

## Wave 0 — foundation (done in the initial commit)
Contracts (`packages/sim/src/types.ts`), tuning, step pipeline with system stubs, Night Market content,
greybox client scaffold, CI.

## Wave 1 — parallel (one agent each, separate files)
| Track | Branch | Owns | Delivers |
| --- | --- | --- | --- |
| sim-kitchen | `track/sim-kitchen` | `sim/src/systems/{movement,interact,stations,items}.ts` + their tests | Movement, collisions, rival-kitchen blocking, dash, grab/place/throw/catch, chop, wash, pan/pot cooking, burn, fire spread + extinguish, plates (rack, dirty return, cold) |
| sim-rules | `track/sim-rules` | `sim/src/systems/{round,tickets,scoring,market}.ts` + their tests | Round phases, prep, critic, rush, last call, round/match end + reset + swap flag, tickets (spawn/expire/decay/delivery), scoring + Heat, market stock rule, knocks (pop, daze, immunity) |
| client-render | `track/client-render` | `apps/client/src/render/**`, `index.html` styles | Greybox renderer polish: readable stations, ticket board with timers, Heat meters, phase banners, interpolation, event effects (simple flashes) |
| client-input | `track/client-input` | `apps/client/src/{input,settings,ui}/**`, `main.ts` wiring | Gamepad input, key rebinding UI, settings menu (match rules, slots human/bot, audio/display), localStorage persistence, start/pause/end screens |

Cross-track calls in the sim are fixed by the stub signatures: kitchen calls `takeFromCrate`, `deliverPlate`,
`tryKnock`, `registerMistake`; rules never calls kitchen code.

## Wave 2 — after wave 1 merges
| Track | Delivers |
| --- | --- |
| bots | `packages/bots`: path-finding bot with ticket choice, market runs, knock/steal behaviour, 3 difficulties; wired into client slots |
| botsim | `tools/botsim`: run N headless matches on Night Market, write a balance report (design doc step-4 metrics) |
| deploy | Static deploy of the client (host chosen with the user) |

## Wave 3 — validation
Run botsim, compare with the design doc's step-4 pass bars, tune `tuning.ts`, report. Then greybox human playtest (step 5).
