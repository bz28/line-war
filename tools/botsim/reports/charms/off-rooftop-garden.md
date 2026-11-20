# Botsim balance report

## Pass bars

From the design doc, validation step 4.

| Check | Target | Value | Result |
| --- | --- | --- | --- |
| Bots never get stuck | 0 stuck events (all scenarios) | 0 | ✅ PASS |
| Knocks per round | 2–6 (even-2v2) | 5.36 | ✅ PASS |
| No recipe skipped twice as often as another | lowest served rate ≥ 0.5 × highest (even-2v2) | salad 78.0%, burger 88.9%, steak 87.9%, fish 82.0% | ✅ PASS |
| A 10% faster crew wins 65–80% of rounds | 65–80% (gap-2v2, crew A) | 62.9% [58.5%, 67.1%] | ❌ FAIL |

## Side bias

Even scenarios: crew A should win about 50% of decisive rounds.

| Check | Target | Value | Result |
| --- | --- | --- | --- |
| Side bias, even-2v2 | 50% inside the 95% CI | 48.2% [43.8%, 52.6%] (496 decisive) | ✅ PASS |
| Side bias, even-1v1 | 50% inside the 95% CI | 49.5% [45.1%, 53.9%] (499 decisive) | ✅ PASS |
| Side bias, mixed | 50% inside the 95% CI | 48.7% [44.4%, 53.1%] (507 decisive) | ✅ PASS |

## Details

### Scenarios

| Scenario | Matches / rounds | A round win % [95% CI] | Draws | Pts/round A / B | Served/round A / B | Knocks/round | Steal % | Contested % | Wasted/round | Close % | Comeback % | Lead changes/round | Burns/round | Stuck | Runaway |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 200 / 496 | 48.2% [43.8%, 52.6%] | 0 | 1628.8 / 1642.2 | 16.23 / 16.34 | 5.36 | 87.9% | 44.6% | 5.36 | 29.4% | 22.4% (111/496) | 7.05 | 2.93 | 0 | 0 |
| gap-2v2 | 200 / 490 | 62.9% [58.5%, 67.1%] | 2 | 1787.6 / 1645.6 | 17.09 / 16.12 | 6.16 | 88.6% | 44.6% | 5.75 | 32.4% | 21.9% (107/489) | 7.36 | 2.62 | 0 | 0 |
| even-1v1 | 200 / 499 | 49.5% [45.1%, 53.9%] | 0 | 897.1 / 908.4 | 8.95 / 9.01 | 2.11 | 89.9% | 39.4% | 4.30 | 27.1% | 24.3% (121/498) | 6.72 | 1.45 | 0 | 0 |
| easy-vs-hard | 200 / 421 | 5.2% [3.5%, 7.8%] | 0 | 1307.7 / 2068.6 | 14.17 / 18.63 | 2.19 | 79.1% | 43.9% | 5.22 | 6.7% | 8.8% (37/421) | 4.07 | 2.74 | 0 | 0 |
| mixed | 200 / 507 | 48.7% [44.4%, 53.1%] | 0 | 897.5 / 911.9 | 8.93 / 8.98 | 2.58 | 89.8% | 39.9% | 4.33 | 25.6% | 25.1% (127/506) | 6.75 | 1.35 | 0 | 0 |

### Recipes

| Recipe served rate (served / spawned) | even-2v2 | gap-2v2 | even-1v1 | easy-vs-hard | mixed |
| --- | --- | --- | --- | --- | --- |
| salad | 78.0% (4431/5684) | 77.3% (4297/5560) | 22.9% (1028/4487) | 76.2% (3583/4705) | 23.2% (1056/4556) |
| burger | 88.9% (4976/5599) | 90.5% (5096/5631) | 70.5% (3238/4593) | 89.6% (4311/4814) | 68.9% (3213/4665) |
| steak | 87.9% (3322/3778) | 88.9% (3405/3828) | 75.7% (2335/3086) | 90.0% (2944/3272) | 76.0% (2378/3131) |
| fish | 82.0% (2984/3638) | 81.8% (3025/3700) | 65.1% (1984/3048) | 83.6% (2604/3116) | 67.4% (2063/3060) |

### Context: tickets, waste, Critic, Heat

| Scenario | Tickets/round spawned · served · expired · left | Wasted/round cold · trashed · left | Critic A · B · unserved | Trailing crew wins Critic | Heat A t0/t1/t2/t3 | Heat B t0/t1/t2/t3 | Fires/round |
| --- | --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 37.7 · 31.7 · 2.1 · 3.9 | 4.26 · 0.01 · 1.08 | 219 · 226 · 51 | 51.7% (256/495) | 18/17/29/36 | 17/17/28/38 | 1.85 |
| gap-2v2 | 38.2 · 32.3 · 2.1 · 3.8 | 4.71 · 0.01 · 1.03 | 227 · 224 · 39 | 51.0% (249/488) | 16/15/26/43 | 19/17/28/37 | 1.56 |
| even-1v1 | 30.5 · 17.2 · 9.1 · 4.2 | 3.41 · 0.00 · 0.89 | 187 · 190 · 122 | 43.0% (214/498) | 28/23/29/20 | 27/23/29/21 | 1.21 |
| easy-vs-hard | 37.8 · 31.9 · 2.1 · 3.8 | 4.09 · 0.06 · 1.07 | 165 · 204 · 52 | 39.7% (166/418) | 25/23/31/21 | 13/11/19/57 | 2.04 |
| mixed | 30.4 · 17.2 · 9.1 · 4.1 | 3.51 · 0.00 · 0.82 | 170 · 201 · 136 | 44.4% (224/505) | 27/23/29/21 | 26/23/30/21 | 1.27 |

### Charms

| Scenario | Charms/round spawned | Banked/round A / B | Faded/round | Knocks on charm carriers/round |
| --- | --- | --- | --- | --- |
| even-2v2 | 0.00 | 0.00 / 0.00 | 0.00 | 0.00 |
| gap-2v2 | 0.00 | 0.00 / 0.00 | 0.00 | 0.00 |
| even-1v1 | 0.00 | 0.00 / 0.00 | 0.00 | 0.00 |
| easy-vs-hard | 0.00 | 0.00 / 0.00 | 0.00 | 0.00 |
| mixed | 0.00 | 0.00 / 0.00 | 0.00 | 0.00 |

### gap-2v2 calibration

Crew throughput: two normal bots at the given skill vs an empty kitchen, points per round. Baseline (normal, no skill override): **1694.4**.

| Skill | Points/round | vs baseline |
| --- | --- | --- |
| 0.50 | 1597.2 | 0.943× |
| 0.55 | 1641.9 | 0.969× |
| 0.60 | 1694.4 | 1.000× |
| 0.65 | 1738.3 | 1.026× |
| 0.70 | 1828.3 | 1.079× |
| 0.75 | 1919.3 | 1.133× |
| 0.80 | 1923.0 | 1.135× |
| 0.85 | 2077.8 | 1.226× |
| 0.90 | 2117.3 | 1.250× |
| 0.95 | 2178.6 | 1.286× |
| 1.00 | 2218.0 | 1.309× |

Chosen crew-A skill: **0.720** (≈1.100×). interpolated between skill 0.7 and 0.75.

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
| Matches run | 1480 in 495.7 s (3.0 matches/s) |
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
