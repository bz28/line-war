# Botsim balance report

## Pass bars

From the design doc, validation step 4.

| Check | Target | Value | Result |
| --- | --- | --- | --- |
| Bots never get stuck | 0 stuck events (all scenarios) | 0 | ✅ PASS |
| Knocks per round | 2–6 (even-2v2) | 4.70 | ✅ PASS |
| No recipe skipped twice as often as another | lowest served rate ≥ 0.5 × highest (even-2v2) | salad 87.5%, burger 85.5%, soup 62.1%, steak 90.6%, fish 78.9% | ✅ PASS |
| A 10% faster crew wins 65–80% of rounds | 65–80% (gap-2v2, crew A) | 69.2% [65.0%, 73.1%] | ✅ PASS |

## Side bias

Even scenarios: crew A should win about 50% of decisive rounds.

| Check | Target | Value | Result |
| --- | --- | --- | --- |
| Side bias, even-2v2 | 50% inside the 95% CI | 50.2% [45.8%, 54.6%] (496 decisive) | ✅ PASS |
| Side bias, even-1v1 | 50% inside the 95% CI | 47.9% [43.5%, 52.3%] (497 decisive) | ✅ PASS |
| Side bias, mixed | 50% inside the 95% CI | 45.7% [41.3%, 50.1%] (486 decisive) | ✅ PASS |

## Details

### Scenarios

| Scenario | Matches / rounds | A round win % [95% CI] | Draws | Pts/round A / B | Served/round A / B | Knocks/round | Steal % | Contested % | Wasted/round | Close % | Comeback % | Lead changes/round | Burns/round | Stuck | Runaway |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 200 / 496 | 50.2% [45.8%, 54.6%] | 0 | 1881.8 / 1898.0 | 15.36 / 15.56 | 4.70 | 94.0% | 40.5% | 4.38 | 32.9% | 17.9% (89/496) | 6.12 | 0.91 | 0 | 0 |
| gap-2v2 | 200 / 496 | 69.2% [65.0%, 73.1%] | 0 | 2096.8 / 1843.4 | 16.59 / 15.06 | 5.43 | 92.9% | 41.4% | 4.42 | 29.0% | 17.2% (85/494) | 6.09 | 0.73 | 0 | 0 |
| even-1v1 | 200 / 497 | 47.9% [43.5%, 52.3%] | 0 | 1096.8 / 1111.9 | 8.79 / 8.91 | 2.84 | 96.3% | 32.8% | 2.18 | 24.7% | 16.1% (80/496) | 5.29 | 0.37 | 0 | 0 |
| easy-vs-hard | 200 / 425 | 6.6% [4.6%, 9.4%] | 1 | 1493.9 / 2323.2 | 13.00 / 18.13 | 1.63 | 86.0% | 39.8% | 4.14 | 11.8% | 8.5% (36/425) | 3.10 | 1.22 | 0 | 0 |
| mixed | 200 / 486 | 45.7% [41.3%, 50.1%] | 0 | 1057.2 / 1090.9 | 8.58 / 8.84 | 2.96 | 96.0% | 32.5% | 2.16 | 20.0% | 16.3% (79/486) | 5.19 | 0.32 | 0 | 0 |

### Recipes

| Recipe served rate (served / spawned) | even-2v2 | gap-2v2 | even-1v1 | easy-vs-hard | mixed |
| --- | --- | --- | --- | --- | --- |
| salad | 87.5% (3179/3632) | 86.4% (3041/3518) | 32.9% (933/2836) | 85.9% (2503/2913) | 35.0% (961/2747) |
| burger | 85.5% (3656/4275) | 84.4% (3747/4438) | 64.8% (2338/3609) | 84.5% (3249/3843) | 63.1% (2194/3477) |
| soup | 62.1% (1610/2592) | 62.5% (1612/2581) | 19.6% (410/2087) | 60.8% (1355/2229) | 19.3% (408/2109) |
| steak | 90.6% (2346/2590) | 91.0% (2514/2763) | 84.7% (1869/2207) | 91.1% (2143/2353) | 82.9% (1771/2137) |
| fish | 78.9% (4080/5170) | 82.2% (4326/5263) | 65.0% (2826/4346) | 80.7% (3595/4453) | 64.4% (2724/4231) |

### Context: tickets, waste, Critic, Heat

| Scenario | Tickets/round spawned · served · expired · left | Wasted/round cold · trashed · left | Critic A · B · unserved | Trailing crew wins Critic | Heat A t0/t1/t2/t3 | Heat B t0/t1/t2/t3 | Fires/round |
| --- | --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 36.8 · 30.0 · 3.1 · 3.7 | 3.35 · 0.00 · 1.03 | 246 · 219 · 31 | 52.3% (259/495) | 15/12/17/56 | 15/11/17/57 | 0.66 |
| gap-2v2 | 37.4 · 30.7 · 3.0 · 3.7 | 3.42 · 0.01 · 0.99 | 239 · 222 · 35 | 53.9% (267/495) | 13/11/15/62 | 15/12/18/55 | 0.54 |
| even-1v1 | 30.4 · 16.9 · 9.4 · 4.1 | 1.52 · 0.00 · 0.66 | 210 · 212 · 75 | 49.4% (244/494) | 19/17/25/39 | 18/16/25/40 | 0.32 |
| easy-vs-hard | 37.2 · 30.2 · 3.1 · 3.8 | 3.12 · 0.00 · 1.02 | 175 · 211 · 39 | 41.4% (176/425) | 20/16/24/39 | 11/9/13/66 | 1.20 |
| mixed | 30.2 · 16.6 · 9.5 · 4.1 | 1.53 · 0.00 · 0.63 | 199 · 206 · 81 | 49.1% (238/485) | 20/18/25/38 | 19/17/25/39 | 0.27 |

### Charms

| Scenario | Charms/round spawned | Banked/round A / B | Faded/round | Knocks on charm carriers/round |
| --- | --- | --- | --- | --- |
| even-2v2 | 3.00 | 1.52 / 1.47 | 0.00 | 1.78 |
| gap-2v2 | 3.00 | 1.75 / 1.25 | 0.00 | 1.90 |
| even-1v1 | 3.00 | 1.41 / 1.47 | 0.12 | 1.24 |
| easy-vs-hard | 3.00 | 0.98 / 2.01 | 0.01 | 0.45 |
| mixed | 3.00 | 1.45 / 1.42 | 0.13 | 1.49 |

### gap-2v2 calibration

Crew throughput: two normal bots at the given skill vs an empty kitchen, points per round. Baseline (normal, no skill override): **2089.8**.

| Skill | Points/round | vs baseline |
| --- | --- | --- |
| 0.50 | 2011.1 | 0.962× |
| 0.55 | 2077.4 | 0.994× |
| 0.60 | 2089.8 | 1.000× |
| 0.65 | 2192.7 | 1.049× |
| 0.70 | 2237.4 | 1.071× |
| 0.75 | 2249.1 | 1.076× |
| 0.80 | 2362.7 | 1.131× |
| 0.85 | 2429.0 | 1.162× |
| 0.90 | 2425.4 | 1.161× |
| 0.95 | 2473.0 | 1.183× |
| 1.00 | 2524.3 | 1.208× |

Chosen crew-A skill: **0.772** (≈1.100×). interpolated between skill 0.75 and 0.8.

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
| Overrides | none (defaults from tuning.ts) |
| Sweep | none |
| Stuck threshold | 10 s |
| Max ticks | 1.5 × longest possible match |
| Calibration | 40 crew-vs-empty matches × 12 skills, target 1.1× |
| Workers | 7 |
| Matches run | 1480 in 181.0 s (8.2 matches/s) |
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
