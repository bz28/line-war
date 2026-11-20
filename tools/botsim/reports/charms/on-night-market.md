# Botsim balance report

## Pass bars

From the design doc, validation step 4.

| Check | Target | Value | Result |
| --- | --- | --- | --- |
| Bots never get stuck | 0 stuck events (all scenarios) | 0 | ✅ PASS |
| Knocks per round | 2–6 (even-2v2) | 3.32 | ✅ PASS |
| No recipe skipped twice as often as another | lowest served rate ≥ 0.5 × highest (even-2v2) | salad 86.1%, burger 93.0%, soup 65.9%, steak 88.7%, fish 90.2% | ✅ PASS |
| A 10% faster crew wins 65–80% of rounds | 65–80% (gap-2v2, crew A) | 63.8% [59.5%, 67.9%] | ❌ FAIL |

## Side bias

Even scenarios: crew A should win about 50% of decisive rounds.

| Check | Target | Value | Result |
| --- | --- | --- | --- |
| Side bias, even-2v2 | 50% inside the 95% CI | 48.5% [44.2%, 52.9%] (505 decisive) | ✅ PASS |
| Side bias, even-1v1 | 50% inside the 95% CI | 53.0% [48.7%, 57.3%] (513 decisive) | ✅ PASS |
| Side bias, mixed | 50% inside the 95% CI | 53.1% [48.7%, 57.5%] (497 decisive) | ✅ PASS |

## Details

### Scenarios

| Scenario | Matches / rounds | A round win % [95% CI] | Draws | Pts/round A / B | Served/round A / B | Knocks/round | Steal % | Contested % | Wasted/round | Close % | Comeback % | Lead changes/round | Burns/round | Stuck | Runaway |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 200 / 505 | 48.5% [44.2%, 52.9%] | 0 | 2016.5 / 2003.2 | 17.13 / 17.15 | 3.32 | 97.3% | 42.5% | 4.62 | 28.5% | 16.3% (82/504) | 6.63 | 0.80 | 0 | 0 |
| gap-2v2 | 200 / 503 | 63.8% [59.5%, 67.9%] | 0 | 2203.0 / 1997.6 | 18.55 / 16.78 | 3.15 | 95.2% | 42.6% | 4.70 | 29.6% | 14.5% (73/503) | 6.81 | 0.72 | 0 | 0 |
| even-1v1 | 200 / 515 | 53.0% [48.7%, 57.3%] | 2 | 1167.3 / 1144.8 | 9.48 / 9.45 | 2.72 | 97.7% | 39.3% | 2.83 | 21.0% | 12.1% (62/514) | 4.88 | 0.21 | 0 | 0 |
| easy-vs-hard | 200 / 434 | 8.3% [6.1%, 11.3%] | 1 | 1639.5 / 2350.3 | 14.57 / 19.51 | 0.85 | 95.7% | 41.6% | 4.66 | 15.4% | 13.2% (57/433) | 3.48 | 1.03 | 0 | 0 |
| mixed | 200 / 497 | 53.1% [48.7%, 57.5%] | 0 | 1156.8 / 1123.5 | 9.36 / 9.33 | 2.97 | 98.0% | 39.6% | 2.92 | 19.1% | 13.9% (69/496) | 4.85 | 0.17 | 0 | 0 |

### Recipes

| Recipe served rate (served / spawned) | even-2v2 | gap-2v2 | even-1v1 | easy-vs-hard | mixed |
| --- | --- | --- | --- | --- | --- |
| salad | 86.1% (4677/5432) | 86.3% (4662/5404) | 29.0% (1251/4311) | 84.5% (3879/4588) | 28.5% (1189/4178) |
| burger | 93.0% (5011/5388) | 94.3% (5151/5462) | 83.6% (3713/4442) | 92.7% (4330/4673) | 84.3% (3524/4181) |
| soup | 65.9% (2369/3596) | 68.3% (2578/3776) | 26.7% (780/2920) | 65.9% (2055/3118) | 26.9% (766/2844) |
| steak | 88.7% (2377/2680) | 89.7% (2433/2711) | 79.4% (1758/2215) | 88.8% (2072/2334) | 79.5% (1698/2135) |
| fish | 90.2% (2384/2644) | 90.0% (2455/2727) | 79.8% (1761/2206) | 89.4% (2034/2276) | 77.6% (1639/2113) |

### Context: tickets, waste, Critic, Heat

| Scenario | Tickets/round spawned · served · expired · left | Wasted/round cold · trashed · left | Critic A · B · unserved | Trailing crew wins Critic | Heat A t0/t1/t2/t3 | Heat B t0/t1/t2/t3 | Fires/round |
| --- | --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 39.1 · 33.3 · 2.2 · 3.5 | 3.52 · 0.00 · 1.10 | 254 · 240 · 11 | 58.0% (293/505) | 14/10/15/61 | 12/11/16/61 | 0.39 |
| gap-2v2 | 39.9 · 34.4 · 2.1 · 3.5 | 3.68 · 0.00 · 1.02 | 233 · 261 · 9 | 55.9% (281/503) | 12/9/15/64 | 13/11/16/59 | 0.30 |
| even-1v1 | 31.3 · 18.0 · 9.2 · 4.0 | 2.15 · 0.00 · 0.69 | 252 · 236 · 27 | 54.9% (282/514) | 19/15/22/44 | 17/16/22/45 | 0.04 |
| easy-vs-hard | 39.1 · 33.1 · 2.5 · 3.5 | 3.53 · 0.01 · 1.12 | 226 · 194 · 14 | 51.4% (223/434) | 17/14/22/46 | 11/9/13/68 | 0.54 |
| mixed | 31.1 · 17.7 · 9.3 · 4.0 | 2.24 · 0.00 · 0.68 | 251 · 220 · 26 | 55.6% (275/495) | 19/15/22/44 | 18/16/22/44 | 0.03 |

### Charms

| Scenario | Charms/round spawned | Banked/round A / B | Faded/round | Knocks on charm carriers/round |
| --- | --- | --- | --- | --- |
| even-2v2 | 3.00 | 1.51 / 1.49 | 0.00 | 2.40 |
| gap-2v2 | 3.00 | 1.63 / 1.37 | 0.00 | 1.92 |
| even-1v1 | 3.00 | 1.46 / 1.54 | 0.01 | 2.30 |
| easy-vs-hard | 3.00 | 0.83 / 2.17 | 0.00 | 0.50 |
| mixed | 3.00 | 1.52 / 1.47 | 0.01 | 2.54 |

### gap-2v2 calibration

Crew throughput: two normal bots at the given skill vs an empty kitchen, points per round. Baseline (normal, no skill override): **2287.9**.

| Skill | Points/round | vs baseline |
| --- | --- | --- |
| 0.50 | 2180.9 | 0.953× |
| 0.55 | 2197.8 | 0.961× |
| 0.60 | 2287.9 | 1.000× |
| 0.65 | 2314.7 | 1.012× |
| 0.70 | 2363.6 | 1.033× |
| 0.75 | 2412.3 | 1.054× |
| 0.80 | 2495.3 | 1.091× |
| 0.85 | 2564.8 | 1.121× |
| 0.90 | 2591.4 | 1.133× |
| 0.95 | 2642.5 | 1.155× |
| 1.00 | 2669.1 | 1.167× |

Chosen crew-A skill: **0.815** (≈1.100×). interpolated between skill 0.8 and 0.85.

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
| Matches run | 1480 in 267.5 s (5.5 matches/s) |
| Commit | `0befa81` |

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
- **Heat**: share of service/rush/last-call time at each Heat tier.
