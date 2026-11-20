# Botsim balance report

## Pass bars

From the design doc, validation step 4.

| Check | Target | Value | Result |
| --- | --- | --- | --- |
| Bots never get stuck | 0 stuck events (all scenarios) | 0 | ✅ PASS |
| Knocks per round | 2–6 (even-2v2) | 2.82 | ✅ PASS |
| No recipe skipped twice as often as another | lowest served rate ≥ 0.5 × highest (even-2v2) | salad 87.5%, burger 85.8%, soup 63.4%, steak 90.5%, fish 82.5% | ✅ PASS |
| A 10% faster crew wins 65–80% of rounds | 65–80% (gap-2v2, crew A) | 62.7% [58.4%, 66.8%] | ❌ FAIL |

## Side bias

Even scenarios: crew A should win about 50% of decisive rounds.

| Check | Target | Value | Result |
| --- | --- | --- | --- |
| Side bias, even-2v2 | 50% inside the 95% CI | 44.9% [40.6%, 49.3%] (497 decisive) | ❌ FAIL |
| Side bias, even-1v1 | 50% inside the 95% CI | 45.2% [40.9%, 49.6%] (502 decisive) | ❌ FAIL |
| Side bias, mixed | 50% inside the 95% CI | 44.4% [40.1%, 48.8%] (500 decisive) | ❌ FAIL |

## Details

### Scenarios

| Scenario | Matches / rounds | A round win % [95% CI] | Draws | Pts/round A / B | Served/round A / B | Knocks/round | Steal % | Contested % | Wasted/round | Close % | Comeback % | Lead changes/round | Burns/round | Stuck | Runaway |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 200 / 497 | 44.9% [40.6%, 49.3%] | 0 | 1830.3 / 1898.7 | 15.73 / 16.15 | 2.82 | 94.9% | 41.4% | 4.39 | 30.8% | 19.7% (98/497) | 6.71 | 0.88 | 0 | 0 |
| gap-2v2 | 200 / 496 | 62.7% [58.4%, 66.8%] | 0 | 2015.4 / 1852.9 | 16.80 / 15.73 | 3.41 | 94.9% | 41.5% | 4.43 | 27.6% | 15.3% (76/496) | 6.66 | 0.75 | 0 | 0 |
| even-1v1 | 200 / 502 | 45.2% [40.9%, 49.6%] | 0 | 1043.3 / 1073.9 | 9.39 / 9.50 | 1.65 | 95.6% | 33.1% | 2.08 | 25.5% | 18.6% (93/500) | 5.97 | 0.32 | 0 | 0 |
| easy-vs-hard | 200 / 413 | 3.1% [1.8%, 5.3%] | 0 | 1437.5 / 2307.1 | 13.15 / 18.81 | 1.10 | 87.7% | 41.3% | 4.35 | 10.7% | 7.7% (32/413) | 3.26 | 1.16 | 0 | 0 |
| mixed | 200 / 500 | 44.4% [40.1%, 48.8%] | 0 | 1009.9 / 1054.0 | 9.12 / 9.42 | 1.74 | 95.0% | 32.8% | 2.14 | 23.6% | 17.6% (88/499) | 5.94 | 0.28 | 0 | 0 |

### Recipes

| Recipe served rate (served / spawned) | even-2v2 | gap-2v2 | even-1v1 | easy-vs-hard | mixed |
| --- | --- | --- | --- | --- | --- |
| salad | 87.5% (3152/3601) | 87.9% (3100/3525) | 35.0% (1005/2872) | 87.5% (2530/2893) | 35.0% (1012/2895) |
| burger | 85.8% (3738/4357) | 85.8% (3914/4562) | 66.0% (2469/3739) | 85.4% (3173/3716) | 65.4% (2362/3611) |
| soup | 63.4% (1712/2700) | 62.2% (1676/2694) | 20.2% (452/2243) | 62.0% (1366/2202) | 20.9% (466/2229) |
| steak | 90.5% (2394/2644) | 91.6% (2571/2807) | 87.3% (1962/2247) | 90.6% (2108/2327) | 85.4% (1923/2252) |
| fish | 82.5% (4380/5312) | 83.3% (4400/5282) | 69.7% (3147/4514) | 82.1% (3645/4439) | 68.6% (3065/4469) |

### Context: tickets, waste, Critic, Heat

| Scenario | Tickets/round spawned · served · expired · left | Wasted/round cold · trashed · left | Critic A · B · unserved | Trailing crew wins Critic | Heat A t0/t1/t2/t3 | Heat B t0/t1/t2/t3 | Fires/round |
| --- | --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 37.5 · 30.9 · 2.8 · 3.7 | 3.40 · 0.00 · 0.99 | 221 · 245 · 31 | 49.6% (246/496) | 15/13/22/51 | 15/12/21/52 | 0.58 |
| gap-2v2 | 38.0 · 31.6 · 2.7 · 3.8 | 3.38 · 0.00 · 1.05 | 247 · 227 · 22 | 49.8% (247/496) | 13/11/20/56 | 16/13/21/50 | 0.53 |
| even-1v1 | 31.1 · 18.0 · 8.9 · 4.2 | 1.49 · 0.00 · 0.60 | 207 · 240 · 55 | 50.7% (254/501) | 20/20/33/27 | 19/20/33/28 | 0.25 |
| easy-vs-hard | 37.7 · 31.0 · 2.9 · 3.8 | 3.35 · 0.00 · 1.01 | 170 · 210 · 33 | 40.7% (168/413) | 22/18/26/34 | 11/10/16/63 | 1.09 |
| mixed | 30.9 · 17.7 · 9.1 · 4.2 | 1.46 · 0.00 · 0.68 | 216 · 230 · 54 | 47.9% (239/499) | 20/21/33/26 | 19/20/32/28 | 0.19 |

### Charms

| Scenario | Charms/round spawned | Banked/round A / B | Faded/round | Knocks on charm carriers/round |
| --- | --- | --- | --- | --- |
| even-2v2 | 0.00 | 0.00 / 0.00 | 0.00 | 0.00 |
| gap-2v2 | 0.00 | 0.00 / 0.00 | 0.00 | 0.00 |
| even-1v1 | 0.00 | 0.00 / 0.00 | 0.00 | 0.00 |
| easy-vs-hard | 0.00 | 0.00 / 0.00 | 0.00 | 0.00 |
| mixed | 0.00 | 0.00 / 0.00 | 0.00 | 0.00 |

### gap-2v2 calibration

Crew throughput: two normal bots at the given skill vs an empty kitchen, points per round. Baseline (normal, no skill override): **2030.2**.

| Skill | Points/round | vs baseline |
| --- | --- | --- |
| 0.50 | 1890.3 | 0.931× |
| 0.55 | 1981.7 | 0.976× |
| 0.60 | 2030.2 | 1.000× |
| 0.65 | 2144.3 | 1.056× |
| 0.70 | 2225.5 | 1.096× |
| 0.75 | 2272.8 | 1.120× |
| 0.80 | 2305.6 | 1.136× |
| 0.85 | 2393.8 | 1.179× |
| 0.90 | 2410.7 | 1.187× |
| 0.95 | 2407.9 | 1.186× |
| 1.00 | 2478.3 | 1.221× |

Chosen crew-A skill: **0.708** (≈1.100×). interpolated between skill 0.7 and 0.75.

### Stuck events

No stuck events.

## Run settings

| Setting | Value |
| --- | --- |
| Bots | `@line-war/bots` |
| Arena | harbor-pier |
| Matches per scenario | 200 |
| Scenarios | `even-2v2`, `gap-2v2`, `even-1v1`, `easy-vs-hard`, `mixed` |
| Base seed | 1 |
| Overrides | config.charmsEnabled=false |
| Sweep | none |
| Stuck threshold | 10 s |
| Max ticks | 1.5 × longest possible match |
| Calibration | 40 crew-vs-empty matches × 12 skills, target 1.1× |
| Workers | 7 |
| Matches run | 1480 in 294.3 s (5.0 matches/s) |
| Commit | `321a9c4` |

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
