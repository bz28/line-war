# Botsim balance report

## Pass bars

From the design doc, validation step 4.

| Check | Target | Value | Result |
| --- | --- | --- | --- |
| Bots never get stuck | 0 stuck events (all scenarios) | 0 | ✅ PASS |
| Knocks per round | 2–6 (even-2v2) | 4.16 | ✅ PASS |
| No recipe skipped twice as often as another | lowest served rate ≥ 0.5 × highest (even-2v2) | salad 87.3%, burger 84.6%, soup 61.2%, steak 90.6%, fish 79.5% | ✅ PASS |
| A 10% faster crew wins 65–80% of rounds | 65–80% (gap-2v2, crew A) | 67.1% [62.8%, 71.1%] | ✅ PASS |

## Side bias

Even scenarios: crew A should win about 50% of decisive rounds.

| Check | Target | Value | Result |
| --- | --- | --- | --- |
| Side bias, even-2v2 | 50% inside the 95% CI | 47.6% [43.3%, 52.0%] (500 decisive) | ✅ PASS |
| Side bias, even-1v1 | 50% inside the 95% CI | 46.1% [41.8%, 50.5%] (490 decisive) | ✅ PASS |
| Side bias, mixed | 50% inside the 95% CI | 51.7% [47.3%, 56.1%] (495 decisive) | ✅ PASS |

## Details

### Scenarios

| Scenario | Matches / rounds | A round win % [95% CI] | Draws | Pts/round A / B | Served/round A / B | Knocks/round | Steal % | Contested % | Wasted/round | Close % | Comeback % | Lead changes/round | Burns/round | Stuck | Runaway |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 200 / 500 | 47.6% [43.3%, 52.0%] | 0 | 1877.5 / 1918.4 | 15.34 / 15.60 | 4.16 | 93.1% | 41.1% | 4.32 | 30.2% | 15.4% (77/500) | 6.58 | 0.93 | 0 | 0 |
| gap-2v2 | 200 / 489 | 67.1% [62.8%, 71.1%] | 0 | 2080.6 / 1850.3 | 16.48 / 14.97 | 5.55 | 94.0% | 41.6% | 4.45 | 24.5% | 18.6% (91/488) | 5.90 | 0.78 | 0 | 0 |
| even-1v1 | 200 / 490 | 46.1% [41.8%, 50.5%] | 0 | 1085.8 / 1107.8 | 8.73 / 8.83 | 3.12 | 94.9% | 33.1% | 2.21 | 23.3% | 17.8% (87/490) | 5.62 | 0.34 | 0 | 0 |
| easy-vs-hard | 200 / 414 | 3.9% [2.4%, 6.2%] | 0 | 1469.2 / 2349.0 | 12.75 / 18.33 | 1.55 | 90.6% | 40.2% | 4.22 | 8.9% | 6.5% (27/414) | 2.72 | 1.16 | 0 | 0 |
| mixed | 200 / 495 | 51.7% [47.3%, 56.1%] | 0 | 1079.4 / 1076.5 | 8.70 / 8.71 | 3.11 | 94.5% | 32.5% | 2.11 | 23.2% | 14.3% (71/495) | 5.29 | 0.33 | 0 | 0 |

### Recipes

| Recipe served rate (served / spawned) | even-2v2 | gap-2v2 | even-1v1 | easy-vs-hard | mixed |
| --- | --- | --- | --- | --- | --- |
| salad | 87.3% (3179/3642) | 87.1% (2933/3367) | 32.7% (910/2780) | 86.7% (2451/2828) | 35.0% (988/2826) |
| burger | 84.6% (3696/4370) | 84.1% (3668/4359) | 63.9% (2266/3544) | 84.6% (3186/3767) | 63.1% (2247/3562) |
| soup | 61.2% (1628/2658) | 62.0% (1595/2571) | 21.0% (437/2078) | 59.1% (1289/2180) | 19.7% (417/2116) |
| steak | 90.6% (2402/2651) | 91.9% (2510/2732) | 83.8% (1829/2182) | 91.6% (2075/2265) | 82.2% (1769/2153) |
| fish | 79.5% (4107/5169) | 81.5% (4217/5176) | 64.3% (2755/4283) | 80.6% (3482/4322) | 64.5% (2775/4302) |

### Context: tickets, waste, Critic, Heat

| Scenario | Tickets/round spawned · served · expired · left | Wasted/round cold · trashed · left | Critic A · B · unserved | Trailing crew wins Critic | Heat A t0/t1/t2/t3 | Heat B t0/t1/t2/t3 | Fires/round |
| --- | --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 37.0 · 30.0 · 3.2 · 3.8 | 3.27 · 0.00 · 1.05 | 240 · 217 · 43 | 51.3% (256/499) | 15/12/19/55 | 15/11/17/57 | 0.71 |
| gap-2v2 | 37.2 · 30.5 · 3.1 · 3.6 | 3.41 · 0.00 · 1.03 | 230 · 228 · 31 | 52.0% (253/487) | 13/10/15/61 | 15/13/18/54 | 0.61 |
| even-1v1 | 30.3 · 16.7 · 9.5 · 4.1 | 1.53 · 0.00 · 0.68 | 196 · 215 · 79 | 48.8% (239/490) | 20/17/25/38 | 19/16/26/39 | 0.27 |
| easy-vs-hard | 37.1 · 30.2 · 3.2 · 3.7 | 3.25 · 0.00 · 0.97 | 178 · 205 · 31 | 44.4% (184/414) | 21/17/24/38 | 11/9/12/67 | 1.19 |
| mixed | 30.2 · 16.6 · 9.5 · 4.1 | 1.49 · 0.00 · 0.62 | 220 · 201 · 74 | 52.3% (259/495) | 20/17/25/39 | 19/17/25/39 | 0.27 |

### Charms

| Scenario | Charms/round spawned | Banked/round A / B | Faded/round | Knocks on charm carriers/round |
| --- | --- | --- | --- | --- |
| even-2v2 | 3.00 | 1.44 / 1.55 | 0.01 | 1.40 |
| gap-2v2 | 3.00 | 1.63 / 1.37 | 0.00 | 1.76 |
| even-1v1 | 3.00 | 1.46 / 1.42 | 0.12 | 1.41 |
| easy-vs-hard | 3.00 | 0.90 / 2.09 | 0.01 | 0.34 |
| mixed | 3.00 | 1.40 / 1.46 | 0.14 | 1.41 |

### gap-2v2 calibration

Crew throughput: two normal bots at the given skill vs an empty kitchen, points per round. Baseline (normal, no skill override): **2055.5**.

| Skill | Points/round | vs baseline |
| --- | --- | --- |
| 0.50 | 2043.7 | 0.994× |
| 0.55 | 2087.7 | 1.016× |
| 0.60 | 2055.5 | 1.000× |
| 0.65 | 2166.9 | 1.054× |
| 0.70 | 2236.5 | 1.088× |
| 0.75 | 2245.7 | 1.093× |
| 0.80 | 2355.7 | 1.146× |
| 0.85 | 2424.6 | 1.180× |
| 0.90 | 2436.4 | 1.185× |
| 0.95 | 2477.0 | 1.205× |
| 1.00 | 2507.8 | 1.220× |

Chosen crew-A skill: **0.757** (≈1.100×). interpolated between skill 0.75 and 0.8.

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
| Matches run | 1480 in 118.3 s (12.5 matches/s) |
| Commit | `425d425` |

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
