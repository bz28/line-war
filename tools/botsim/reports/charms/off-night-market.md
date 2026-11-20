# Botsim balance report

## Pass bars

From the design doc, validation step 4.

| Check | Target | Value | Result |
| --- | --- | --- | --- |
| Bots never get stuck | 0 stuck events (all scenarios) | 0 | ✅ PASS |
| Knocks per round | 2–6 (even-2v2) | 0.97 | ❌ FAIL |
| No recipe skipped twice as often as another | lowest served rate ≥ 0.5 × highest (even-2v2) | salad 85.3%, burger 93.2%, soup 66.7%, steak 90.1%, fish 90.9% | ✅ PASS |
| A 10% faster crew wins 65–80% of rounds | 65–80% (gap-2v2, crew A) | 71.5% [67.3%, 75.4%] | ✅ PASS |

## Side bias

Even scenarios: crew A should win about 50% of decisive rounds.

| Check | Target | Value | Result |
| --- | --- | --- | --- |
| Side bias, even-2v2 | 50% inside the 95% CI | 51.2% [46.8%, 55.6%] (494 decisive) | ✅ PASS |
| Side bias, even-1v1 | 50% inside the 95% CI | 47.4% [43.0%, 51.8%] (492 decisive) | ✅ PASS |
| Side bias, mixed | 50% inside the 95% CI | 52.5% [48.1%, 56.9%] (491 decisive) | ✅ PASS |

## Details

### Scenarios

| Scenario | Matches / rounds | A round win % [95% CI] | Draws | Pts/round A / B | Served/round A / B | Knocks/round | Steal % | Contested % | Wasted/round | Close % | Comeback % | Lead changes/round | Burns/round | Stuck | Runaway |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 200 / 495 | 51.2% [46.8%, 55.6%] | 1 | 1956.6 / 1948.8 | 17.51 / 17.44 | 0.97 | 93.1% | 43.2% | 4.92 | 28.1% | 14.3% (71/495) | 6.91 | 0.91 | 0 | 0 |
| gap-2v2 | 200 / 481 | 71.5% [67.3%, 75.4%] | 0 | 2196.0 / 1892.4 | 19.04 / 16.95 | 1.12 | 88.7% | 43.5% | 5.01 | 29.1% | 16.7% (80/480) | 6.84 | 0.75 | 0 | 0 |
| even-1v1 | 200 / 492 | 47.4% [43.0%, 51.8%] | 0 | 1080.1 / 1099.4 | 9.97 / 10.01 | 0.35 | 83.8% | 40.0% | 2.96 | 21.3% | 13.0% (64/492) | 5.33 | 0.21 | 0 | 0 |
| easy-vs-hard | 200 / 435 | 9.0% [6.6%, 12.0%] | 0 | 1603.4 / 2281.2 | 14.77 / 20.02 | 0.37 | 90.6% | 42.3% | 4.67 | 16.3% | 14.7% (64/435) | 4.12 | 1.09 | 0 | 0 |
| mixed | 200 / 491 | 52.5% [48.1%, 56.9%] | 0 | 1089.8 / 1080.1 | 9.96 / 9.97 | 0.27 | 83.3% | 39.2% | 2.83 | 22.8% | 15.9% (78/491) | 5.39 | 0.22 | 0 | 0 |

### Recipes

| Recipe served rate (served / spawned) | even-2v2 | gap-2v2 | even-1v1 | easy-vs-hard | mixed |
| --- | --- | --- | --- | --- | --- |
| salad | 85.3% (4602/5396) | 86.2% (4539/5265) | 31.1% (1305/4198) | 84.8% (3908/4610) | 31.9% (1334/4180) |
| burger | 93.2% (5028/5397) | 94.6% (5027/5315) | 86.1% (3782/4395) | 93.6% (4408/4707) | 85.2% (3640/4272) |
| soup | 66.7% (2368/3550) | 68.8% (2515/3658) | 26.8% (759/2833) | 66.5% (2172/3264) | 27.3% (779/2853) |
| steak | 90.1% (2422/2688) | 88.8% (2323/2617) | 81.7% (1746/2136) | 88.9% (2134/2401) | 83.6% (1838/2198) |
| fish | 90.9% (2389/2627) | 91.9% (2427/2640) | 82.5% (1760/2133) | 90.8% (2085/2297) | 81.8% (1719/2102) |

### Context: tickets, waste, Critic, Heat

| Scenario | Tickets/round spawned · served · expired · left | Wasted/round cold · trashed · left | Critic A · B · unserved | Trailing crew wins Critic | Heat A t0/t1/t2/t3 | Heat B t0/t1/t2/t3 | Fires/round |
| --- | --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 39.7 · 34.0 · 2.2 · 3.6 | 3.75 · 0.00 · 1.17 | 251 · 239 · 5 | 52.3% (258/493) | 13/12/21/54 | 13/12/21/54 | 0.43 |
| gap-2v2 | 40.5 · 35.0 · 2.0 · 3.5 | 3.90 · 0.00 · 1.11 | 254 · 223 · 4 | 58.6% (282/481) | 11/10/18/61 | 14/13/21/52 | 0.31 |
| even-1v1 | 31.9 · 19.0 · 8.9 · 4.0 | 2.26 · 0.00 · 0.70 | 222 · 255 · 15 | 55.2% (271/491) | 19/18/31/32 | 19/18/31/32 | 0.02 |
| easy-vs-hard | 39.7 · 33.8 · 2.3 · 3.6 | 3.57 · 0.00 · 1.10 | 222 · 206 · 7 | 53.7% (233/434) | 18/16/25/41 | 10/9/17/63 | 0.63 |
| mixed | 31.8 · 19.0 · 8.8 · 4.0 | 2.20 · 0.00 · 0.63 | 238 · 238 · 15 | 57.0% (280/491) | 18/19/31/32 | 18/19/31/32 | 0.04 |

### Charms

| Scenario | Charms/round spawned | Banked/round A / B | Faded/round | Knocks on charm carriers/round |
| --- | --- | --- | --- | --- |
| even-2v2 | 0.00 | 0.00 / 0.00 | 0.00 | 0.00 |
| gap-2v2 | 0.00 | 0.00 / 0.00 | 0.00 | 0.00 |
| even-1v1 | 0.00 | 0.00 / 0.00 | 0.00 | 0.00 |
| easy-vs-hard | 0.00 | 0.00 / 0.00 | 0.00 | 0.00 |
| mixed | 0.00 | 0.00 / 0.00 | 0.00 | 0.00 |

### gap-2v2 calibration

Crew throughput: two normal bots at the given skill vs an empty kitchen, points per round. Baseline (normal, no skill override): **2206.8**.

| Skill | Points/round | vs baseline |
| --- | --- | --- |
| 0.50 | 2101.0 | 0.952× |
| 0.55 | 2096.2 | 0.950× |
| 0.60 | 2206.8 | 1.000× |
| 0.65 | 2116.6 | 0.959× |
| 0.70 | 2318.7 | 1.051× |
| 0.75 | 2295.2 | 1.040× |
| 0.80 | 2379.7 | 1.078× |
| 0.85 | 2448.7 | 1.110× |
| 0.90 | 2484.3 | 1.126× |
| 0.95 | 2521.3 | 1.142× |
| 1.00 | 2605.4 | 1.181× |

Chosen crew-A skill: **0.835** (≈1.100×). interpolated between skill 0.8 and 0.85.

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
| Overrides | config.charmsEnabled=false |
| Sweep | none |
| Stuck threshold | 10 s |
| Max ticks | 1.5 × longest possible match |
| Calibration | 40 crew-vs-empty matches × 12 skills, target 1.1× |
| Workers | 7 |
| Matches run | 1480 in 120.4 s (12.3 matches/s) |
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
