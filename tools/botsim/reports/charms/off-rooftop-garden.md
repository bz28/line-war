# Botsim balance report

## Pass bars

From the design doc, validation step 4.

| Check | Target | Value | Result |
| --- | --- | --- | --- |
| Bots never get stuck | 0 stuck events (all scenarios) | 0 | ✅ PASS |
| Knocks per round | 2–6 (even-2v2) | 5.22 | ✅ PASS |
| No recipe skipped twice as often as another | lowest served rate ≥ 0.5 × highest (even-2v2) | salad 78.0%, burger 88.4%, steak 88.5%, fish 83.3% | ✅ PASS |
| A 10% faster crew wins 65–80% of rounds | 65–80% (gap-2v2, crew A) | 65.1% [60.7%, 69.3%] | ✅ PASS |

## Side bias

Even scenarios: crew A should win about 50% of decisive rounds.

| Check | Target | Value | Result |
| --- | --- | --- | --- |
| Side bias, even-2v2 | 50% inside the 95% CI | 50.2% [45.8%, 54.5%] (504 decisive) | ✅ PASS |
| Side bias, even-1v1 | 50% inside the 95% CI | 50.2% [45.8%, 54.6%] (494 decisive) | ✅ PASS |
| Side bias, mixed | 50% inside the 95% CI | 52.6% [48.3%, 56.9%] (511 decisive) | ✅ PASS |

## Details

### Scenarios

| Scenario | Matches / rounds | A round win % [95% CI] | Draws | Pts/round A / B | Served/round A / B | Knocks/round | Steal % | Contested % | Wasted/round | Close % | Comeback % | Lead changes/round | Burns/round | Stuck | Runaway |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 200 / 506 | 50.2% [45.8%, 54.5%] | 2 | 1633.2 / 1653.2 | 16.31 / 16.33 | 5.22 | 87.1% | 44.6% | 5.29 | 32.4% | 23.9% (121/506) | 7.03 | 2.98 | 0 | 0 |
| gap-2v2 | 200 / 474 | 65.1% [60.7%, 69.3%] | 1 | 1784.4 / 1604.0 | 16.95 / 16.05 | 5.39 | 87.9% | 45.2% | 5.73 | 27.0% | 19.8% (94/474) | 6.93 | 2.78 | 0 | 0 |
| even-1v1 | 200 / 495 | 50.2% [45.8%, 54.6%] | 1 | 910.3 / 922.4 | 9.00 / 9.07 | 2.46 | 89.2% | 40.1% | 4.24 | 27.3% | 21.1% (104/493) | 6.72 | 1.23 | 0 | 0 |
| easy-vs-hard | 200 / 423 | 5.9% [4.0%, 8.6%] | 0 | 1335.2 / 2056.9 | 14.34 / 18.52 | 2.03 | 79.3% | 43.3% | 5.19 | 9.0% | 7.8% (33/423) | 3.93 | 2.61 | 0 | 0 |
| mixed | 200 / 511 | 52.6% [48.3%, 56.9%] | 0 | 912.1 / 908.1 | 8.92 / 9.00 | 2.58 | 89.7% | 39.8% | 4.19 | 26.2% | 21.7% (111/511) | 6.72 | 1.43 | 0 | 0 |

### Recipes

| Recipe served rate (served / spawned) | even-2v2 | gap-2v2 | even-1v1 | easy-vs-hard | mixed |
| --- | --- | --- | --- | --- | --- |
| salad | 78.0% (4481/5743) | 77.2% (4123/5338) | 23.0% (1012/4406) | 77.3% (3634/4703) | 23.3% (1070/4600) |
| burger | 88.4% (5109/5779) | 89.8% (4857/5409) | 70.4% (3229/4584) | 89.0% (4300/4832) | 68.3% (3212/4702) |
| steak | 88.5% (3351/3787) | 87.7% (3265/3722) | 75.5% (2307/3054) | 90.4% (2984/3300) | 75.8% (2397/3163) |
| fish | 83.3% (3114/3740) | 82.3% (2973/3613) | 66.9% (2023/3022) | 82.5% (2596/3147) | 67.4% (2095/3107) |

### Context: tickets, waste, Critic, Heat

| Scenario | Tickets/round spawned · served · expired · left | Wasted/round cold · trashed · left | Critic A · B · unserved | Trailing crew wins Critic | Heat A t0/t1/t2/t3 | Heat B t0/t1/t2/t3 | Fires/round |
| --- | --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 37.6 · 31.7 · 2.0 · 3.9 | 4.27 · 0.01 · 1.01 | 221 · 238 · 47 | 47.2% (239/506) | 18/18/28/37 | 18/16/28/38 | 1.95 |
| gap-2v2 | 38.1 · 32.1 · 2.1 · 3.9 | 4.68 · 0.01 · 1.05 | 233 · 191 · 50 | 47.8% (225/471) | 17/15/26/42 | 18/18/29/36 | 1.70 |
| even-1v1 | 30.4 · 17.3 · 9.0 · 4.1 | 3.38 · 0.00 · 0.86 | 198 · 179 · 118 | 44.9% (222/494) | 26/23/29/21 | 26/23/30/22 | 1.03 |
| easy-vs-hard | 37.8 · 31.9 · 2.0 · 3.8 | 4.12 · 0.05 · 1.02 | 159 · 223 · 41 | 38.8% (164/423) | 24/23/30/23 | 13/11/19/57 | 2.08 |
| mixed | 30.5 · 17.2 · 9.1 · 4.2 | 3.40 · 0.00 · 0.79 | 200 · 180 · 131 | 40.7% (207/508) | 27/23/29/20 | 27/23/29/20 | 1.26 |

### Charms

| Scenario | Charms/round spawned | Banked/round A / B | Faded/round | Knocks on charm carriers/round |
| --- | --- | --- | --- | --- |
| even-2v2 | 0.00 | 0.00 / 0.00 | 0.00 | 0.00 |
| gap-2v2 | 0.00 | 0.00 / 0.00 | 0.00 | 0.00 |
| even-1v1 | 0.00 | 0.00 / 0.00 | 0.00 | 0.00 |
| easy-vs-hard | 0.00 | 0.00 / 0.00 | 0.00 | 0.00 |
| mixed | 0.00 | 0.00 / 0.00 | 0.00 | 0.00 |

### gap-2v2 calibration

Crew throughput: two normal bots at the given skill vs an empty kitchen, points per round. Baseline (normal, no skill override): **1639.1**.

| Skill | Points/round | vs baseline |
| --- | --- | --- |
| 0.50 | 1589.7 | 0.970× |
| 0.55 | 1623.3 | 0.990× |
| 0.60 | 1639.1 | 1.000× |
| 0.65 | 1749.3 | 1.067× |
| 0.70 | 1823.9 | 1.113× |
| 0.75 | 1932.3 | 1.179× |
| 0.80 | 1928.6 | 1.177× |
| 0.85 | 2012.9 | 1.228× |
| 0.90 | 2058.8 | 1.256× |
| 0.95 | 2115.9 | 1.291× |
| 1.00 | 2181.6 | 1.331× |

Chosen crew-A skill: **0.686** (≈1.100×). interpolated between skill 0.65 and 0.7.

### Stuck events

No stuck events.

## Run settings

| Setting | Value |
| --- | --- |
| Bots | `@line-war/bots` |
| Arena | rooftop-garden |
| Matches per scenario | 200 |
| Scenarios | `even-2v2`, `gap-2v2`, `even-1v1`, `easy-vs-hard`, `mixed` |
| Base seed | 1 |
| Overrides | config.charmsEnabled=false |
| Sweep | none |
| Stuck threshold | 10 s |
| Max ticks | 1.5 × longest possible match |
| Calibration | 40 crew-vs-empty matches × 12 skills, target 1.1× |
| Workers | 7 |
| Matches run | 1480 in 115.5 s (12.8 matches/s) |
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
