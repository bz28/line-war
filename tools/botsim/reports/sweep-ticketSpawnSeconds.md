# Botsim balance report

> Bots from `./test/scriptedBot.ts` (not @line-war/bots).

## Pass bars

From the design doc, validation step 4.

| Check | Target | tuning.ticketSpawnSeconds=3 | tuning.ticketSpawnSeconds=4 | tuning.ticketSpawnSeconds=5 |
| --- | --- | --- | --- | --- |
| Bots never get stuck | 0 stuck events (all scenarios) | 1679 ❌ FAIL | 1625 ❌ FAIL | 1824 ❌ FAIL |
| Knocks per round | 2–6 (even-2v2) | 0.00 ❌ FAIL | 0.00 ❌ FAIL | 0.00 ❌ FAIL |
| No recipe skipped 2× as often as another | max skip share ≤ 2 × min (even-2v2) | soup 100.0% vs burger 57.1% ✅ PASS | soup 100.0% vs burger 58.9% ✅ PASS | soup 100.0% vs burger 61.7% ✅ PASS |
| A 10% faster crew wins 65–80% of rounds | 65–80% (gap-2v2) | not run ➖ N/A | not run ➖ N/A | not run ➖ N/A |

## Side bias

Even scenarios: crew A should win about 50% of decisive rounds.

| Check | Target | tuning.ticketSpawnSeconds=3 | tuning.ticketSpawnSeconds=4 | tuning.ticketSpawnSeconds=5 |
| --- | --- | --- | --- | --- |
| Side bias, even-2v2 | 50% inside the 95% CI | 67.3% [61.2%, 72.9%] (245 decisive) ❌ FAIL | 65.7% [59.5%, 71.4%] (239 decisive) ❌ FAIL | 69.1% [63.1%, 74.6%] (243 decisive) ❌ FAIL |
| Side bias, even-1v1 | 50% inside the 95% CI | 49.2% [43.0%, 55.4%] (244 decisive) ✅ PASS | 50.2% [43.9%, 56.5%] (239 decisive) ✅ PASS | 50.2% [43.9%, 56.5%] (237 decisive) ✅ PASS |

## Sweep comparison

### even-2v2

| Point | A win % | Pts/round A / B | Knocks/round | Contested % | Wasted/round | Close % | Comeback % | Stuck |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| tuning.ticketSpawnSeconds=3 | 67.3% [61.2%, 72.9%] | 227.3 / 90.8 | 0.00 | 34.3% | 6.03 | 18.3% | 1.2% | 1502 |
| tuning.ticketSpawnSeconds=4 | 65.7% [59.5%, 71.4%] | 209.9 / 93.4 | 0.00 | 36.5% | 5.70 | 15.4% | 0.0% | 1433 |
| tuning.ticketSpawnSeconds=5 | 69.1% [63.1%, 74.6%] | 176.2 / 72.6 | 0.00 | 37.1% | 5.98 | 16.0% | 0.4% | 1615 |

### even-1v1

| Point | A win % | Pts/round A / B | Knocks/round | Contested % | Wasted/round | Close % | Comeback % | Stuck |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| tuning.ticketSpawnSeconds=3 | 49.2% [43.0%, 55.4%] | 386.9 / 385.2 | 0.00 | 23.3% | 1.66 | 1.2% | 4.1% | 177 |
| tuning.ticketSpawnSeconds=4 | 50.2% [43.9%, 56.5%] | 377.0 / 368.9 | 0.00 | 22.2% | 1.68 | 0.8% | 2.9% | 192 |
| tuning.ticketSpawnSeconds=5 | 50.2% [43.9%, 56.5%] | 368.8 / 363.8 | 0.00 | 20.5% | 1.64 | 1.7% | 3.0% | 209 |

## Details: tuning.ticketSpawnSeconds=3

### Scenarios

| Scenario | Matches / rounds | A round win % [95% CI] | Draws | Pts/round A / B | Served/round A / B | Knocks/round | Steal % | Contested % | Wasted/round | Close % | Comeback % | Lead changes/round | Burns/round | Stuck | Runaway |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 100 / 252 | 67.3% [61.2%, 72.9%] | 7 | 227.3 / 90.8 | 4.06 / 1.73 | 0.00 | 0.0% | 34.3% | 6.03 | 18.3% | 1.2% (3/245) | 0.75 | 0.15 | 1502 | 0 |
| even-1v1 | 100 / 244 | 49.2% [43.0%, 55.4%] | 0 | 386.9 / 385.2 | 6.36 / 6.26 | 0.00 | 0.0% | 23.3% | 1.66 | 1.2% | 4.1% (10/244) | 3.23 | 0.00 | 177 | 0 |

### Recipes

| Recipe (skip % = expired or never served) | even-2v2 | even-1v1 |
| --- | --- | --- |
| salad | 66.3% (650/1928 served) | 21.8% (1571/2008 served) |
| burger | 57.1% (808/1883 served) | 25.0% (1508/2012 served) |
| soup | 100.0% (0/1177 served) | 100.0% (0/1267 served) |
| steak | 100.0% (0/892 served) | 100.0% (0/999 served) |
| fish | 100.0% (0/916 served) | 100.0% (0/975 served) |

### Context: tickets, waste, Critic, Heat

| Scenario | Tickets/round spawned · served · expired · left | Wasted/round cold · trashed · left | Critic A · B · unserved | Trailing crew wins Critic | Heat A t0/t1/t2/t3 | Heat B t0/t1/t2/t3 | Fires/round |
| --- | --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 27.0 · 5.8 · 15.7 · 5.5 | 4.21 · 1.36 · 0.46 | 0 · 0 · 252 | 0.0% (0/245) | 58/19/14/9 | 78/11/8/2 | 0.43 |
| even-1v1 | 29.8 · 12.6 · 12.2 · 4.9 | 0.27 · 0.90 · 0.49 | 0 · 0 · 244 | 0.0% (0/244) | 38/23/18/21 | 40/21/20/19 | 0.21 |

### Stuck events

First 20 (up to 10 per scenario). Reproduce with `runMatch({ seed, slots })` for that scenario.

| Scenario | Seed | Round | Tick | Player | Pos | Holding |
| --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 1805334600 | 0 | 949 | P2 | (21.11, 2.35) | — |
| even-2v2 | 1805334600 | 0 | 981 | P3 | (21.71, 2.65) | lettuce:raw |
| even-2v2 | 1805334600 | 0 | 1231 | P0 | (4.78, 2.35) | — |
| even-2v2 | 1805334600 | 0 | 3799 | P0 | (1.97, 2.35) | — |
| even-2v2 | 1805334600 | 1 | 8819 | P2 | (17.47, 9.97) | plate[] |
| even-2v2 | 1805334600 | 1 | 8824 | P3 | (17.98, 9.48) | plate[bun:raw,meat:cooked] |
| even-2v2 | 1805334600 | 1 | 9139 | P1 | (5.54, 3) | plate[lettuce:chopped,tomato:chopped] |
| even-2v2 | 1805334600 | 1 | 10177 | P1 | (5.58, 3.03) | plate[lettuce:chopped,tomato:chopped] |
| even-2v2 | 1805334600 | 1 | 11216 | P1 | (5.49, 2.97) | plate[lettuce:chopped,tomato:chopped] |
| even-2v2 | 1805334600 | 1 | 12260 | P1 | (5.51, 3) | plate[lettuce:chopped,tomato:chopped] |
| even-1v1 | 2755016057 | 2 | 19926 | P0 | (3.39, 8.24) | — |
| even-1v1 | 1720368574 | 1 | 9806 | P0 | (4.72, 9.4) | — |
| even-1v1 | 1720368574 | 1 | 9970 | P2 | (21.58, 8.29) | — |
| even-1v1 | 1720368574 | 1 | 10914 | P0 | (4.71, 9.41) | — |
| even-1v1 | 1720368574 | 1 | 12456 | P0 | (4.71, 9.41) | — |
| even-1v1 | 1720368574 | 1 | 13545 | P0 | (4.71, 9.41) | — |
| even-1v1 | 1300329732 | 0 | 2722 | P0 | (3.42, 8.29) | — |
| even-1v1 | 1987326877 | 0 | 2236 | P0 | (3.42, 8.29) | — |
| even-1v1 | 1987326877 | 1 | 8979 | P2 | (20.27, 9.39) | — |
| even-1v1 | 1987326877 | 1 | 10092 | P2 | (20.28, 9.4) | — |

## Details: tuning.ticketSpawnSeconds=4

### Scenarios

| Scenario | Matches / rounds | A round win % [95% CI] | Draws | Pts/round A / B | Served/round A / B | Knocks/round | Steal % | Contested % | Wasted/round | Close % | Comeback % | Lead changes/round | Burns/round | Stuck | Runaway |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 100 / 246 | 65.7% [59.5%, 71.4%] | 7 | 209.9 / 93.4 | 3.88 / 1.78 | 0.00 | 0.0% | 36.5% | 5.70 | 15.4% | 0.0% (0/239) | 0.84 | 0.15 | 1433 | 0 |
| even-1v1 | 100 / 239 | 50.2% [43.9%, 56.5%] | 0 | 377.0 / 368.9 | 6.15 / 6.05 | 0.00 | 0.0% | 22.2% | 1.68 | 0.8% | 2.9% (7/239) | 2.75 | 0.00 | 192 | 0 |

### Recipes

| Recipe (skip % = expired or never served) | even-2v2 | even-1v1 |
| --- | --- | --- |
| salad | 66.2% (633/1874 served) | 22.3% (1485/1912 served) |
| burger | 58.9% (758/1844 served) | 25.3% (1432/1918 served) |
| soup | 100.0% (0/1121 served) | 100.0% (0/1223 served) |
| steak | 100.0% (0/860 served) | 100.0% (0/962 served) |
| fish | 100.0% (0/871 served) | 100.0% (0/933 served) |

### Context: tickets, waste, Critic, Heat

| Scenario | Tickets/round spawned · served · expired · left | Wasted/round cold · trashed · left | Critic A · B · unserved | Trailing crew wins Critic | Heat A t0/t1/t2/t3 | Heat B t0/t1/t2/t3 | Fires/round |
| --- | --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 26.7 · 5.7 · 15.8 · 5.3 | 3.88 · 1.46 · 0.36 | 0 · 0 · 246 | 0.0% (0/239) | 56/19/17/8 | 77/13/7/3 | 0.07 |
| even-1v1 | 29.1 · 12.2 · 12.2 · 4.7 | 0.26 · 0.92 · 0.49 | 0 · 0 · 239 | 0.0% (0/237) | 42/21/17/20 | 41/21/19/18 | 0.00 |

### Stuck events

First 20 (up to 10 per scenario). Reproduce with `runMatch({ seed, slots })` for that scenario.

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

## Details: tuning.ticketSpawnSeconds=5

### Scenarios

| Scenario | Matches / rounds | A round win % [95% CI] | Draws | Pts/round A / B | Served/round A / B | Knocks/round | Steal % | Contested % | Wasted/round | Close % | Comeback % | Lead changes/round | Burns/round | Stuck | Runaway |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 100 / 251 | 69.1% [63.1%, 74.6%] | 8 | 176.2 / 72.6 | 3.35 / 1.45 | 0.00 | 0.0% | 37.1% | 5.98 | 16.0% | 0.4% (1/243) | 0.57 | 0.10 | 1615 | 0 |
| even-1v1 | 100 / 237 | 50.2% [43.9%, 56.5%] | 0 | 368.8 / 363.8 | 6.01 / 5.89 | 0.00 | 0.0% | 20.5% | 1.64 | 1.7% | 3.0% (7/237) | 2.35 | 0.03 | 209 | 0 |

### Recipes

| Recipe (skip % = expired or never served) | even-2v2 | even-1v1 |
| --- | --- | --- |
| salad | 71.8% (524/1855 served) | 21.7% (1436/1835 served) |
| burger | 61.7% (680/1777 served) | 25.2% (1383/1850 served) |
| soup | 100.0% (0/1100 served) | 100.0% (0/1179 served) |
| steak | 100.0% (0/854 served) | 100.0% (0/919 served) |
| fish | 100.0% (0/877 served) | 100.0% (0/901 served) |

### Context: tickets, waste, Critic, Heat

| Scenario | Tickets/round spawned · served · expired · left | Wasted/round cold · trashed · left | Critic A · B · unserved | Trailing crew wins Critic | Heat A t0/t1/t2/t3 | Heat B t0/t1/t2/t3 | Fires/round |
| --- | --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 25.7 · 4.8 · 15.8 · 5.2 | 4.04 · 1.59 · 0.34 | 0 · 0 · 251 | 0.0% (0/243) | 63/14/16/6 | 79/14/6/1 | 0.14 |
| even-1v1 | 28.2 · 11.9 · 11.6 · 4.7 | 0.21 · 0.96 · 0.47 | 0 · 0 · 237 | 0.0% (0/237) | 44/20/17/19 | 45/19/17/18 | 0.18 |

### Stuck events

First 20 (up to 10 per scenario). Reproduce with `runMatch({ seed, slots })` for that scenario.

| Scenario | Seed | Round | Tick | Player | Pos | Holding |
| --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 1805334600 | 0 | 1009 | P2 | (21.11, 2.35) | — |
| even-2v2 | 1805334600 | 0 | 1041 | P3 | (21.71, 2.65) | lettuce:raw |
| even-2v2 | 1805334600 | 0 | 1291 | P0 | (4.78, 2.35) | — |
| even-2v2 | 1805334600 | 0 | 3859 | P0 | (1.97, 2.35) | — |
| even-2v2 | 1805334600 | 1 | 9199 | P1 | (5.53, 3) | plate[lettuce:chopped,tomato:chopped] |
| even-2v2 | 1805334600 | 1 | 10238 | P1 | (5.53, 3.02) | plate[lettuce:chopped,tomato:chopped] |
| even-2v2 | 1805334600 | 1 | 11275 | P1 | (5.59, 3.02) | plate[lettuce:chopped,tomato:chopped] |
| even-2v2 | 1805334600 | 1 | 12322 | P1 | (5.51, 2.99) | plate[lettuce:chopped,tomato:chopped] |
| even-2v2 | 1805334600 | 1 | 13361 | P1 | (5.63, 3.04) | plate[lettuce:chopped,tomato:chopped] |
| even-2v2 | 1805334600 | 1 | 14404 | P1 | (5.56, 3.02) | plate[lettuce:chopped,tomato:chopped] |
| even-1v1 | 2755016057 | 0 | 4076 | P0 | (1.97, 10.35) | plate[bun:raw] |
| even-1v1 | 2755016057 | 1 | 8099 | P0 | (3.49, 8.76) | — |
| even-1v1 | 2755016057 | 1 | 8099 | P2 | (21.5, 8.73) | — |
| even-1v1 | 1720368574 | 1 | 8099 | P0 | (3.5, 8.73) | — |
| even-1v1 | 1720368574 | 1 | 8099 | P2 | (21.5, 8.78) | — |
| even-1v1 | 1720368574 | 1 | 11077 | P2 | (21.58, 8.29) | — |
| even-1v1 | 3802355198 | 1 | 8099 | P0 | (3.5, 8.75) | — |
| even-1v1 | 3802355198 | 1 | 8099 | P2 | (21.5, 8.73) | — |
| even-1v1 | 1300329732 | 0 | 3438 | P0 | (3.42, 8.29) | — |
| even-1v1 | 1300329732 | 1 | 9495 | P2 | (21.61, 8.24) | — |

## Run settings

| Setting | Value |
| --- | --- |
| Bots | `./test/scriptedBot.ts` |
| Arena | night-market |
| Matches per scenario | 100 |
| Scenarios | `even-2v2`, `even-1v1` |
| Base seed | 1 |
| Overrides | none (defaults from tuning.ts) |
| Sweep | tuning.ticketSpawnSeconds = 3, 4, 5 |
| Stuck threshold | 10 s |
| Max ticks | 1.5 × longest possible match |
| Calibration | 40 solo matches × 12 skills, target 1.1× |
| Workers | 7 |
| Matches run | 600 in 15.7 s (38.2 matches/s) |
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
