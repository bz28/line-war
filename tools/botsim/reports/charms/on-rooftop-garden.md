# Botsim balance report

## Pass bars

From the design doc, validation step 4.

| Check | Target | Value | Result |
| --- | --- | --- | --- |
| Bots never get stuck | 0 stuck events (all scenarios) | 0 | ✅ PASS |
| Knocks per round | 2–6 (even-2v2) | 6.79 | ❌ FAIL |
| No recipe skipped twice as often as another | lowest served rate ≥ 0.5 × highest (even-2v2) | salad 76.8%, burger 88.0%, steak 86.8%, fish 81.8% | ✅ PASS |
| A 10% faster crew wins 65–80% of rounds | 65–80% (gap-2v2, crew A) | 65.2% [60.9%, 69.3%] | ✅ PASS |

## Side bias

Even scenarios: crew A should win about 50% of decisive rounds.

| Check | Target | Value | Result |
| --- | --- | --- | --- |
| Side bias, even-2v2 | 50% inside the 95% CI | 47.3% [42.9%, 51.7%] (493 decisive) | ✅ PASS |
| Side bias, even-1v1 | 50% inside the 95% CI | 47.4% [43.1%, 51.8%] (506 decisive) | ✅ PASS |
| Side bias, mixed | 50% inside the 95% CI | 50.1% [45.7%, 54.5%] (499 decisive) | ✅ PASS |

## Details

### Scenarios

| Scenario | Matches / rounds | A round win % [95% CI] | Draws | Pts/round A / B | Served/round A / B | Knocks/round | Steal % | Contested % | Wasted/round | Close % | Comeback % | Lead changes/round | Burns/round | Stuck | Runaway |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 200 / 493 | 47.3% [42.9%, 51.7%] | 0 | 1719.0 / 1738.9 | 15.83 / 15.94 | 6.79 | 90.1% | 44.4% | 5.61 | 31.4% | 19.7% (97/493) | 6.83 | 2.76 | 0 | 0 |
| gap-2v2 | 200 / 491 | 65.2% [60.9%, 69.3%] | 0 | 1861.6 / 1679.1 | 16.62 / 15.65 | 7.32 | 89.6% | 45.2% | 5.62 | 28.7% | 18.8% (92/490) | 6.37 | 2.68 | 0 | 0 |
| even-1v1 | 200 / 506 | 47.4% [43.1%, 51.8%] | 0 | 1000.6 / 1005.4 | 8.53 / 8.62 | 3.97 | 90.8% | 38.4% | 4.28 | 26.5% | 22.6% (114/504) | 5.81 | 1.13 | 0 | 0 |
| easy-vs-hard | 200 / 427 | 6.3% [4.4%, 9.0%] | 0 | 1437.3 / 2151.6 | 14.01 / 18.22 | 2.69 | 81.8% | 43.9% | 5.21 | 11.5% | 8.9% (38/426) | 4.06 | 2.55 | 0 | 0 |
| mixed | 200 / 499 | 50.1% [45.7%, 54.5%] | 0 | 993.6 / 1009.9 | 8.51 / 8.58 | 4.15 | 91.0% | 39.3% | 4.23 | 26.3% | 22.1% (110/498) | 5.89 | 1.22 | 0 | 0 |

### Recipes

| Recipe served rate (served / spawned) | even-2v2 | gap-2v2 | even-1v1 | easy-vs-hard | mixed |
| --- | --- | --- | --- | --- | --- |
| salad | 76.8% (4316/5619) | 76.7% (4229/5515) | 21.4% (969/4527) | 75.5% (3571/4729) | 22.1% (981/4435) |
| burger | 88.0% (4832/5493) | 89.4% (4900/5483) | 70.0% (3176/4539) | 88.5% (4260/4815) | 67.4% (3031/4495) |
| steak | 86.8% (3160/3642) | 87.3% (3271/3745) | 71.8% (2226/3099) | 89.6% (2951/3294) | 74.0% (2264/3061) |
| fish | 81.8% (2904/3551) | 82.5% (2997/3631) | 64.5% (1936/3001) | 82.2% (2601/3164) | 64.0% (1884/2946) |

### Context: tickets, waste, Critic, Heat

| Scenario | Tickets/round spawned · served · expired · left | Wasted/round cold · trashed · left | Critic A · B · unserved | Trailing crew wins Critic | Heat A t0/t1/t2/t3 | Heat B t0/t1/t2/t3 | Fires/round |
| --- | --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 37.1 · 30.9 · 2.4 · 3.9 | 4.53 · 0.01 · 1.08 | 229 · 217 · 47 | 45.0% (221/491) | 17/14/23/45 | 17/14/23/46 | 1.77 |
| gap-2v2 | 37.4 · 31.4 · 2.2 · 3.8 | 4.60 · 0.01 · 1.01 | 233 · 211 · 47 | 46.3% (227/490) | 16/13/20/51 | 18/15/24/43 | 1.75 |
| even-1v1 | 30.0 · 16.4 · 9.4 · 4.1 | 3.36 · 0.00 · 0.92 | 185 · 184 · 137 | 41.3% (209/506) | 24/18/24/34 | 24/17/24/35 | 0.94 |
| easy-vs-hard | 37.5 · 31.3 · 2.3 · 3.8 | 4.20 · 0.04 · 0.97 | 172 · 208 · 47 | 42.6% (182/427) | 23/18/29/30 | 12/10/14/64 | 1.95 |
| mixed | 29.9 · 16.4 · 9.5 · 4.1 | 3.37 · 0.00 · 0.86 | 176 · 190 · 133 | 39.1% (195/499) | 24/19/25/33 | 24/18/25/33 | 1.13 |

### Charms

| Scenario | Charms/round spawned | Banked/round A / B | Faded/round | Knocks on charm carriers/round |
| --- | --- | --- | --- | --- |
| even-2v2 | 3.00 | 1.50 / 1.50 | 0.00 | 1.29 |
| gap-2v2 | 3.00 | 1.60 / 1.40 | 0.00 | 1.35 |
| even-1v1 | 3.00 | 1.48 / 1.46 | 0.06 | 1.63 |
| easy-vs-hard | 3.00 | 1.08 / 1.92 | 0.00 | 0.48 |
| mixed | 3.00 | 1.46 / 1.49 | 0.06 | 1.50 |

### gap-2v2 calibration

Crew throughput: two normal bots at the given skill vs an empty kitchen, points per round. Baseline (normal, no skill override): **1831.9**.

| Skill | Points/round | vs baseline |
| --- | --- | --- |
| 0.50 | 1793.3 | 0.979× |
| 0.55 | 1854.9 | 1.013× |
| 0.60 | 1831.9 | 1.000× |
| 0.65 | 1945.0 | 1.062× |
| 0.70 | 2017.4 | 1.101× |
| 0.75 | 2077.2 | 1.134× |
| 0.80 | 2067.2 | 1.128× |
| 0.85 | 2160.8 | 1.180× |
| 0.90 | 2208.0 | 1.205× |
| 0.95 | 2234.2 | 1.220× |
| 1.00 | 2334.4 | 1.274× |

Chosen crew-A skill: **0.698** (≈1.100×). interpolated between skill 0.65 and 0.7.

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
| Overrides | none (defaults from tuning.ts) |
| Sweep | none |
| Stuck threshold | 10 s |
| Max ticks | 1.5 × longest possible match |
| Calibration | 40 crew-vs-empty matches × 12 skills, target 1.1× |
| Workers | 7 |
| Matches run | 1480 in 192.2 s (7.7 matches/s) |
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
