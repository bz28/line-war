# Botsim balance report

> Bots from `./test/scriptedBot.ts` (not @line-war/bots).

## Pass bars

From the design doc, validation step 4.

| Check | Target | Value | Result |
| --- | --- | --- | --- |
| Bots never get stuck | 0 stuck events (all scenarios) | 8811 | ❌ FAIL |
| Knocks per round | 2–6 (even-2v2) | 0.00 | ❌ FAIL |
| No recipe skipped 2× as often as another | max skip share ≤ 2 × min (even-2v2) | soup 100.0% vs burger 59.1% | ✅ PASS |
| A 10% faster crew wins 65–80% of rounds | 65–80% (gap-2v2, crew A) | 74.4% [70.3%, 78.1%] | ✅ PASS |

## Side bias

Even scenarios: crew A should win about 50% of decisive rounds.

| Check | Target | Value | Result |
| --- | --- | --- | --- |
| Side bias, even-2v2 | 50% inside the 95% CI | 63.1% [58.7%, 67.2%] (490 decisive) | ❌ FAIL |
| Side bias, even-1v1 | 50% inside the 95% CI | 48.5% [44.1%, 52.9%] (495 decisive) | ✅ PASS |
| Side bias, mixed | 50% inside the 95% CI | 50.3% [45.9%, 54.7%] (495 decisive) | ✅ PASS |

## Details

### Scenarios

| Scenario | Matches / rounds | A round win % [95% CI] | Draws | Pts/round A / B | Served/round A / B | Knocks/round | Steal % | Contested % | Wasted/round | Close % | Comeback % | Lead changes/round | Burns/round | Stuck | Runaway |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 200 / 503 | 63.1% [58.7%, 67.2%] | 13 | 200.7 / 82.0 | 3.67 / 1.59 | 0.00 | 0.0% | 37.3% | 5.88 | 14.6% | 0.0% (0/490) | 0.81 | 0.14 | 2980 | 0 |
| gap-2v2 | 200 / 484 | 74.4% [70.3%, 78.1%] | 7 | 247.3 / 58.1 | 4.28 / 1.13 | 0.00 | 0.0% | 33.4% | 5.85 | 13.8% | 1.3% (6/477) | 0.59 | 0.11 | 2797 | 0 |
| even-1v1 | 200 / 495 | 48.5% [44.1%, 52.9%] | 0 | 369.1 / 390.6 | 6.01 / 6.29 | 0.00 | 0.0% | 22.6% | 1.66 | 1.2% | 2.4% (12/495) | 2.70 | 0.00 | 420 | 0 |
| easy-vs-hard | 200 / 520 | 38.3% [34.0%, 42.8%] | 53 | 68.3 / 124.8 | 1.63 / 2.30 | 0.00 | 0.0% | 37.3% | 4.83 | 4.5% | 1.5% (7/467) | 0.23 | 1.14 | 2300 | 0 |
| mixed | 200 / 495 | 50.3% [45.9%, 54.7%] | 0 | 389.0 / 382.1 | 6.24 / 6.12 | 0.00 | 0.0% | 20.2% | 1.57 | 0.4% | 1.2% (6/495) | 2.39 | 0.00 | 314 | 0 |

### Recipes

| Recipe (skip % = expired or never served) | even-2v2 | gap-2v2 | even-1v1 | easy-vs-hard | mixed |
| --- | --- | --- | --- | --- | --- |
| salad | 69.2% (1149/3725 served) | 68.3% (1093/3445 served) | 21.1% (3056/3873 served) | 77.2% (828/3632 served) | 21.1% (3072/3894 served) |
| burger | 59.1% (1498/3662 served) | 56.8% (1524/3526 served) | 23.9% (3030/3983 served) | 67.2% (1218/3714 served) | 22.3% (3046/3922 served) |
| soup | 100.0% (0/2372 served) | 100.0% (0/2438 served) | 100.0% (0/2623 served) | 100.0% (0/2476 served) | 100.0% (0/2673 served) |
| steak | 100.0% (0/1815 served) | 100.0% (0/1721 served) | 100.0% (0/1994 served) | 100.0% (0/1829 served) | 100.0% (0/2008 served) |
| fish | 100.0% (0/1796 served) | 100.0% (0/1761 served) | 100.0% (0/1952 served) | 100.0% (0/1796 served) | 100.0% (0/1954 served) |

### Context: tickets, waste, Critic, Heat

| Scenario | Tickets/round spawned · served · expired · left | Wasted/round cold · trashed · left | Critic A · B · unserved | Trailing crew wins Critic | Heat A t0/t1/t2/t3 | Heat B t0/t1/t2/t3 | Fires/round |
| --- | --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 26.6 · 5.3 · 16.0 · 5.4 | 3.98 · 1.55 · 0.35 | 0 · 0 · 503 | 0.0% (0/489) | 59/18/15/7 | 78/14/6/2 | 0.18 |
| gap-2v2 | 26.6 · 5.4 · 15.9 · 5.3 | 3.92 · 1.59 · 0.33 | 0 · 0 · 484 | 0.0% (0/476) | 54/21/15/10 | 85/9/5/1 | 0.02 |
| even-1v1 | 29.1 · 12.3 · 12.2 · 4.6 | 0.28 · 0.91 · 0.47 | 0 · 0 · 495 | 0.0% (0/490) | 43/20/18/19 | 41/21/19/19 | 0.10 |
| easy-vs-hard | 25.9 · 3.9 · 16.5 · 5.5 | 3.73 · 0.91 · 0.18 | 0 · 0 · 520 | 0.0% (0/467) | 85/11/3/1 | 64/23/10/3 | 29.81 |
| mixed | 29.2 · 12.4 · 12.2 · 4.6 | 0.01 · 1.11 · 0.45 | 0 · 0 · 495 | 0.0% (0/493) | 39/24/17/20 | 43/19/17/20 | 0.00 |

### gap-2v2 calibration

Solo throughput: one normal bot at the given skill vs an idle crew, points per round. Baseline (normal, no skill override): **631.1**.

| Skill | Points/round | vs baseline |
| --- | --- | --- |
| 0.50 | 29.5 | 0.047× |
| 0.55 | 30.4 | 0.048× |
| 0.60 | 34.8 | 0.055× |
| 0.65 | 437.8 | 0.694× |
| 0.70 | 527.4 | 0.836× |
| 0.75 | 549.9 | 0.871× |
| 0.80 | 631.1 | 1.000× |
| 0.85 | 665.3 | 1.054× |
| 0.90 | 718.7 | 1.139× |
| 0.95 | 761.5 | 1.207× |
| 1.00 | 801.0 | 1.269× |

Chosen crew-A skill: **0.877** (≈1.100×). interpolated between skill 0.85 and 0.9.

### Stuck events

First 50 (up to 10 per scenario). Reproduce with `runMatch({ seed, slots })` for that scenario.

| Scenario | Seed | Round | Tick | Player | Pos | Holding |
| --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 1805334600 | 0 | 979 | P2 | (21.11, 2.35) | — |
| even-2v2 | 1805334600 | 0 | 1011 | P3 | (21.71, 2.65) | lettuce:raw |
| even-2v2 | 1805334600 | 0 | 1261 | P0 | (4.78, 2.35) | — |
| even-2v2 | 1805334600 | 0 | 3829 | P0 | (1.97, 2.35) | — |
| even-2v2 | 1805334600 | 1 | 8850 | P2 | (17.49, 9.99) | plate[] |
| even-2v2 | 1805334600 | 1 | 8855 | P3 | (18, 9.49) | plate[bun:raw,meat:cooked] |
| even-2v2 | 1805334600 | 1 | 9169 | P1 | (5.57, 3) | plate[lettuce:chopped,tomato:chopped] |
| even-2v2 | 1805334600 | 1 | 10208 | P1 | (5.49, 2.98) | plate[lettuce:chopped,tomato:chopped] |
| even-2v2 | 1805334600 | 1 | 11246 | P1 | (5.56, 3.02) | plate[lettuce:chopped,tomato:chopped] |
| even-2v2 | 1805334600 | 1 | 12290 | P1 | (5.53, 2.99) | plate[lettuce:chopped,tomato:chopped] |
| gap-2v2 | 53890470 | 0 | 4675 | P0 | (4.78, 2.35) | — |
| gap-2v2 | 53890470 | 0 | 7058 | P0 | (4.77, 2.35) | — |
| gap-2v2 | 53890470 | 1 | 10639 | P1 | (5.49, 2.98) | plate[lettuce:chopped,tomato:chopped] |
| gap-2v2 | 53890470 | 1 | 11660 | P1 | (5.55, 3.02) | plate[lettuce:chopped,tomato:chopped] |
| gap-2v2 | 177819428 | 0 | 1296 | P0 | (4.77, 2.35) | — |
| gap-2v2 | 177819428 | 0 | 2258 | P1 | (3.18, 2.65) | — |
| gap-2v2 | 177819428 | 0 | 2283 | P0 | (3.82, 2.35) | — |
| gap-2v2 | 177819428 | 0 | 2649 | P2 | (20.18, 2.35) | meat:raw |
| gap-2v2 | 177819428 | 0 | 4832 | P2 | (20.14, 2.35) | meat:raw |
| gap-2v2 | 177819428 | 1 | 8521 | P0 | (4.77, 2.35) | — |
| even-1v1 | 1720368574 | 1 | 10751 | P2 | (21.58, 8.29) | — |
| even-1v1 | 3802355198 | 1 | 8099 | P0 | (3.53, 8.75) | — |
| even-1v1 | 3802355198 | 1 | 8099 | P2 | (21.5, 8.73) | — |
| even-1v1 | 1300329732 | 0 | 2752 | P0 | (3.42, 8.29) | — |
| even-1v1 | 1987326877 | 0 | 2440 | P0 | (3.38, 8.2) | — |
| even-1v1 | 1987326877 | 1 | 9100 | P2 | (20.27, 9.39) | — |
| even-1v1 | 1987326877 | 1 | 10205 | P2 | (20.28, 9.4) | — |
| even-1v1 | 3421008473 | 0 | 5025 | P2 | (17.91, 10.24) | plate[bun:raw,meat:cooked] |
| even-1v1 | 3421008473 | 1 | 13218 | P2 | (20.29, 9.41) | — |
| even-1v1 | 3421008473 | 1 | 14343 | P2 | (20.29, 9.41) | — |
| easy-vs-hard | 4150622496 | 0 | 842 | P2 | (21.13, 2.35) | — |
| easy-vs-hard | 4150622496 | 0 | 876 | P3 | (21.73, 2.65) | lettuce:raw |
| easy-vs-hard | 4150622496 | 0 | 3829 | P0 | (4.78, 2.35) | — |
| easy-vs-hard | 4150622496 | 0 | 6180 | P0 | (4.78, 2.35) | — |
| easy-vs-hard | 4150622496 | 0 | 6864 | P0 | (4.88, 2.35) | meat:raw |
| easy-vs-hard | 4150622496 | 1 | 8192 | P2 | (21.13, 2.35) | — |
| easy-vs-hard | 4150622496 | 1 | 8193 | P3 | (21.77, 2.65) | lettuce:raw |
| easy-vs-hard | 4150622496 | 1 | 8639 | P0 | (4.85, 2.35) | — |
| easy-vs-hard | 1180988400 | 0 | 865 | P2 | (20.18, 2.35) | — |
| easy-vs-hard | 1180988400 | 0 | 866 | P3 | (20.82, 2.65) | — |
| mixed | 473220874 | 2 | 17196 | P1 | (5.39, 8.27) | — |
| mixed | 596488135 | 0 | 2051 | P1 | (5.39, 8.27) | — |
| mixed | 596488135 | 0 | 2054 | P3 | (19.61, 8.27) | — |
| mixed | 596488135 | 1 | 12281 | P3 | (19.5, 8.27) | — |
| mixed | 596488135 | 1 | 13414 | P3 | (19.5, 8.27) | — |
| mixed | 1685052078 | 0 | 750 | P1 | (5.5, 8.75) | — |
| mixed | 1685052078 | 0 | 750 | P3 | (19.5, 8.75) | — |
| mixed | 3446009505 | 0 | 3728 | P1 | (5.39, 8.27) | — |
| mixed | 3446009505 | 0 | 3749 | P3 | (19.61, 8.27) | — |
| mixed | 3559688250 | 0 | 2442 | P3 | (19.61, 8.27) | — |

## Run settings

| Setting | Value |
| --- | --- |
| Bots | `./test/scriptedBot.ts` |
| Arena | night-market |
| Matches per scenario | 200 |
| Scenarios | `even-2v2`, `gap-2v2`, `even-1v1`, `easy-vs-hard`, `mixed` |
| Base seed | 1 |
| Overrides | none (defaults from tuning.ts) |
| Sweep | none |
| Stuck threshold | 10 s |
| Max ticks | 1.5 × longest possible match |
| Calibration | 40 solo matches × 12 skills, target 1.1× |
| Workers | 7 |
| Matches run | 1480 in 33.0 s (44.9 matches/s) |
| Commit | `740f041` |

## Definitions

- **Round win %**: crew A share of decisive rounds (draws excluded), 95% Wilson interval.
- **Knocks/round**: successful knocks (both crews). **Steal %**: knocks after which the knocker's crew was the next to pick up the popped item.
- **Contested %**: deliveries where the rival crew had a dish in progress for the same recipe (a warm plate whose food is part of the recipe, or that food cooking on its stove).
- **Wasted/round**: plated food lost — went cold, trashed while warm, or still on a plate at round end.
- **Close %**: rounds with a margin ≤ 10% of the winner's score (rounds where someone scored).
- **Comeback %**: rounds where the crew trailing when Dinner Rush began went on to win (rounds tied at rush start excluded).
- **Lead changes**: times the non-tied leader changed, checked at each delivery.
- **Skip %** (recipe bar): regular tickets of the recipe that expired or were still on the board at round end, over tickets spawned. The Critic is excluded.
- **Stuck**: a bot whose position stayed within 0.25 tiles and who pressed no grab/work/throw for more than 10 s of time with tickets on the board. Idle (non-bot) slots are not checked.
- **Heat**: share of service/rush/last-call time at each Heat tier.
