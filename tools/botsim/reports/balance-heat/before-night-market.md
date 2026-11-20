# Botsim balance report

## Pass bars

From the design doc, validation step 4.

| Check | Target | Value | Result |
| --- | --- | --- | --- |
| Bots never get stuck | 0 stuck events (all scenarios) | 0 | ✅ PASS |
| Knocks per round | 2–6 (even-2v2) | 3.08 | ✅ PASS |
| No recipe skipped twice as often as another | lowest served rate ≥ 0.5 × highest (even-2v2) | salad 84.8%, burger 92.7%, soup 66.0%, steak 89.2%, fish 89.1% | ✅ PASS |
| A 10% faster crew wins 65–80% of rounds | 65–80% (gap-2v2, crew A) | 72.2% [68.1%, 76.1%] | ✅ PASS |

## Side bias

Even scenarios: crew A should win about 50% of decisive rounds.

| Check | Target | Value | Result |
| --- | --- | --- | --- |
| Side bias, even-2v2 | 50% inside the 95% CI | 48.3% [44.0%, 52.7%] (513 decisive) | ✅ PASS |
| Side bias, even-1v1 | 50% inside the 95% CI | 50.6% [46.3%, 54.9%] (518 decisive) | ✅ PASS |
| Side bias, mixed | 50% inside the 95% CI | 50.8% [46.4%, 55.2%] (494 decisive) | ✅ PASS |

## Details

### Scenarios

| Scenario | Matches / rounds | A round win % [95% CI] | Draws | Pts/round A / B | Served/round A / B | Knocks/round | Steal % | Contested % | Wasted/round | Close % | Comeback % | Lead changes/round | Burns/round | Stuck | Runaway |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 200 / 513 | 48.3% [44.0%, 52.7%] | 0 | 2001.4 / 2021.0 | 17.13 / 17.09 | 3.08 | 96.6% | 43.4% | 4.66 | 29.2% | 15.6% (80/513) | 6.94 | 0.94 | 0 | 0 |
| gap-2v2 | 200 / 479 | 72.2% [68.1%, 76.1%] | 0 | 2236.8 / 1946.3 | 18.64 / 16.66 | 3.24 | 96.0% | 42.7% | 4.82 | 29.4% | 18.6% (89/479) | 6.45 | 0.72 | 0 | 0 |
| even-1v1 | 200 / 518 | 50.6% [46.3%, 54.9%] | 0 | 1145.7 / 1156.4 | 9.42 / 9.38 | 3.74 | 97.6% | 39.2% | 2.88 | 22.0% | 13.9% (72/517) | 4.92 | 0.23 | 0 | 0 |
| easy-vs-hard | 200 / 434 | 9.2% [6.8%, 12.3%] | 0 | 1644.8 / 2357.0 | 14.56 / 19.64 | 0.89 | 95.6% | 42.0% | 4.56 | 16.1% | 12.7% (55/434) | 3.73 | 1.12 | 0 | 0 |
| mixed | 200 / 494 | 50.8% [46.4%, 55.2%] | 0 | 1134.9 / 1146.9 | 9.26 / 9.43 | 3.32 | 97.6% | 38.7% | 2.99 | 19.8% | 12.8% (63/492) | 4.92 | 0.23 | 0 | 0 |

### Recipes

| Recipe served rate (served / spawned) | even-2v2 | gap-2v2 | even-1v1 | easy-vs-hard | mixed |
| --- | --- | --- | --- | --- | --- |
| salad | 84.8% (4673/5513) | 86.5% (4433/5127) | 28.6% (1232/4305) | 84.3% (3863/4581) | 28.4% (1190/4184) |
| burger | 92.7% (5077/5477) | 93.9% (4928/5248) | 83.4% (3710/4449) | 92.9% (4376/4711) | 83.3% (3439/4127) |
| soup | 66.0% (2386/3616) | 67.5% (2411/3574) | 25.4% (745/2934) | 66.6% (2091/3141) | 25.5% (718/2817) |
| steak | 89.2% (2485/2786) | 89.1% (2321/2605) | 77.7% (1729/2226) | 88.4% (2068/2339) | 79.6% (1718/2159) |
| fish | 89.1% (2433/2731) | 90.0% (2351/2611) | 81.0% (1832/2263) | 89.8% (2021/2251) | 81.1% (1708/2105) |

### Context: tickets, waste, Critic, Heat

| Scenario | Tickets/round spawned · served · expired · left | Wasted/round cold · trashed · left | Critic A · B · unserved | Trailing crew wins Critic | Heat A t0/t1/t2/t3 | Heat B t0/t1/t2/t3 | Fires/round |
| --- | --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 39.2 · 33.2 · 2.3 · 3.7 | 3.50 · 0.00 · 1.15 | 240 · 263 · 10 | 55.7% (285/512) | 12/11/16/60 | 13/11/17/59 | 0.39 |
| gap-2v2 | 40.0 · 34.3 · 2.1 · 3.6 | 3.63 · 0.00 · 1.19 | 254 · 213 · 12 | 52.0% (249/479) | 12/10/13/66 | 14/11/17/58 | 0.27 |
| even-1v1 | 31.2 · 17.9 · 9.2 · 4.2 | 2.14 · 0.00 · 0.74 | 238 · 251 · 29 | 55.0% (284/516) | 18/16/22/44 | 18/15/22/44 | 0.04 |
| easy-vs-hard | 39.2 · 33.2 · 2.4 · 3.6 | 3.42 · 0.00 · 1.14 | 231 · 193 · 10 | 53.9% (234/434) | 18/14/23/45 | 10/9/13/68 | 0.67 |
| mixed | 31.2 · 17.8 · 9.2 · 4.2 | 2.24 · 0.00 · 0.75 | 225 · 233 · 36 | 54.0% (266/493) | 18/16/22/44 | 18/15/23/44 | 0.05 |

### Charms

| Scenario | Charms/round spawned | Banked/round A / B | Faded/round | Knocks on charm carriers/round |
| --- | --- | --- | --- | --- |
| even-2v2 | 3.00 | 1.45 / 1.55 | 0.00 | 1.94 |
| gap-2v2 | 3.00 | 1.65 / 1.35 | 0.00 | 2.18 |
| even-1v1 | 3.00 | 1.52 / 1.47 | 0.01 | 2.97 |
| easy-vs-hard | 3.00 | 0.82 / 2.18 | 0.00 | 0.52 |
| mixed | 3.00 | 1.53 / 1.46 | 0.01 | 2.53 |

### Scoring economy: Heat, lead swings, points by source, waste by cause

| Scenario | Top-Heat share | Heat drops/crew/round | Lead changes/round | Comeback % | Points: base · Critic · Heat · rush · charm | Waste/round: cold sniped · cold slow · cold partial · trashed · left · burns · expired tickets |
| --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 59.9% | 0.45 | 6.94 | 15.6% | 45.9% · 3.7% · 35.1% · 11.7% · 3.7% | 1.35 · 0.61 · 1.54 · 0.00 · 1.15 · 0.94 · 2.33 |
| gap-2v2 | 61.6% | 0.34 | 6.45 | 18.6% | 45.7% · 3.5% · 35.5% · 11.7% · 3.6% | 1.32 · 0.68 · 1.62 · 0.00 · 1.19 · 0.72 · 2.09 |
| even-1v1 | 44.2% | 0.10 | 4.92 | 13.9% | 46.3% · 6.0% · 30.1% · 11.2% · 6.5% | 0.73 · 0.24 · 1.17 · 0.00 · 0.74 · 0.23 · 9.19 |
| easy-vs-hard | 56.6% | 0.49 | 3.73 | 12.7% | 46.2% · 3.7% · 34.6% · 11.7% · 3.7% | 1.15 · 0.64 · 1.64 · 0.00 · 1.14 · 1.12 · 2.43 |
| mixed | 44.1% | 0.10 | 4.92 | 12.8% | 46.4% · 5.9% · 29.9% · 11.2% · 6.6% | 0.77 · 0.19 · 1.29 · 0.00 · 0.75 · 0.23 · 9.25 |

### gap-2v2 calibration

Crew throughput: two normal bots at the given skill vs an empty kitchen, points per round. Baseline (normal, no skill override): **2289.4**.

| Skill | Points/round | vs baseline |
| --- | --- | --- |
| 0.50 | 2176.3 | 0.951× |
| 0.55 | 2167.0 | 0.947× |
| 0.60 | 2289.4 | 1.000× |
| 0.65 | 2323.3 | 1.015× |
| 0.70 | 2357.6 | 1.030× |
| 0.75 | 2446.5 | 1.069× |
| 0.80 | 2505.0 | 1.094× |
| 0.85 | 2557.2 | 1.117× |
| 0.90 | 2629.0 | 1.148× |
| 0.95 | 2615.8 | 1.143× |
| 1.00 | 2658.4 | 1.161× |

Chosen crew-A skill: **0.813** (≈1.100×). interpolated between skill 0.8 and 0.85.

### Stuck events

No stuck events.

## Run settings

| Setting | Value |
| --- | --- |
| Bots | `@line-war/bots` |
| Arena | night-market |
| Matches per scenario | 200 |
| Scenarios | `even-2v2`, `gap-2v2`, `even-1v1`, `easy-vs-hard`, `mixed` |
| Base seed | 1 |
| Overrides | none (defaults from tuning.ts) |
| Sweep | none |
| Stuck threshold | 10 s |
| Max ticks | 1.5 × longest possible match |
| Calibration | 40 crew-vs-empty matches × 12 skills, target 1.1× |
| Workers | 7 |
| Matches run | 1480 in 95.6 s (15.5 matches/s) |
| Commit | `49b3055` |

## Definitions

- **Round win %**: crew A share of decisive rounds (draws excluded), 95% Wilson interval.
- **Knocks/round**: successful knocks (both crews). **Steal %**: knocks after which the knocker's crew was the next to pick up the popped item.
- **Contested %**: deliveries where the rival crew had a dish in progress for the same recipe (a warm plate whose food is part of the recipe, or that food cooking on its stove).
- **Wasted/round**: plated food lost — went cold, trashed while warm, or still on a plate at round end.
- **Close %**: rounds with a margin ≤ 10% of the winner's score (rounds where someone scored).
- **Comeback %**: rounds where the crew trailing when Dinner Rush began went on to win (rounds tied at rush start excluded).
- **Lead changes**: times the non-tied leader changed, checked at each delivery.
- **Served rate** (recipe bar): regular tickets of the recipe served, over tickets spawned (the Critic is excluded). The bar passes when the lowest rate is at least half the highest.
- **Stuck**: a bot whose position stayed within 0.25 tiles and who pressed no grab/work/throw for more than 10 s of time with tickets on the board. Idle (non-bot) slots are not checked.
- **Heat**: share of service/rush/last-call time at each Heat tier. **Top-Heat share**: both crews at the top tier. **Heat drops**: tier lost to a burn, per crew per round.
- **Points by source**: each delivery split in formula order — base (baseValue × freshness), Critic premium, Heat bonus, rush bonus — plus charmPoints per banked charm. Heat from charms shows up as Heat bonus.
- **Cold sniped / slow / partial**: a plate went cold holding a finished dish with no ticket left (rival served it or it expired) / a finished dish that still had a ticket / an unfinished dish.
