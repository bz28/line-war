# Botsim balance report

## Pass bars

From the design doc, validation step 4.

| Check | Target | Value | Result |
| --- | --- | --- | --- |
| Bots never get stuck | 0 stuck events (all scenarios) | 0 | ✅ PASS |
| Knocks per round | 2–6 (even-2v2) | 3.85 | ✅ PASS |
| No recipe skipped twice as often as another | lowest served rate ≥ 0.5 × highest (even-2v2) | salad 79.9%, burger 89.3%, steak 89.1%, fish 84.1% | ✅ PASS |
| A 10% faster crew wins 65–80% of rounds | 65–80% (gap-2v2, crew A) | 57.3% [52.9%, 61.6%] | ❌ FAIL |

## Side bias

Even scenarios: crew A should win about 50% of decisive rounds.

| Check | Target | Value | Result |
| --- | --- | --- | --- |
| Side bias, even-2v2 | 50% inside the 95% CI | 51.2% [46.8%, 55.5%] (502 decisive) | ✅ PASS |
| Side bias, even-1v1 | 50% inside the 95% CI | 49.0% [44.8%, 53.3%] (520 decisive) | ✅ PASS |
| Side bias, mixed | 50% inside the 95% CI | 52.2% [47.8%, 56.5%] (500 decisive) | ✅ PASS |

## Details

### Scenarios

| Scenario | Matches / rounds | A round win % [95% CI] | Draws | Pts/round A / B | Served/round A / B | Knocks/round | Steal % | Contested % | Wasted/round | Close % | Comeback % | Lead changes/round | Burns/round | Stuck | Runaway |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 200 / 502 | 51.2% [46.8%, 55.5%] | 0 | 1538.1 / 1522.6 | 16.86 / 16.84 | 3.85 | 84.2% | 42.9% | 4.85 | 25.3% | 23.9% (120/502) | 7.34 | 3.36 | 0 | 0 |
| gap-2v2 | 200 / 486 | 57.3% [52.9%, 61.6%] | 1 | 1631.7 / 1548.0 | 17.35 / 16.79 | 4.28 | 86.6% | 43.7% | 5.12 | 24.5% | 21.2% (103/486) | 7.32 | 3.11 | 0 | 0 |
| even-1v1 | 200 / 521 | 49.0% [44.8%, 53.3%] | 1 | 841.7 / 840.6 | 8.98 / 8.96 | 1.48 | 80.8% | 39.1% | 4.52 | 25.3% | 20.3% (106/521) | 6.55 | 1.52 | 0 | 0 |
| easy-vs-hard | 200 / 414 | 3.9% [2.4%, 6.2%] | 0 | 1225.7 / 2106.4 | 14.63 / 19.23 | 1.59 | 76.2% | 42.8% | 4.94 | 5.6% | 6.3% (26/413) | 3.81 | 2.84 | 0 | 0 |
| mixed | 200 / 500 | 52.2% [47.8%, 56.5%] | 0 | 858.7 / 853.6 | 9.09 / 9.18 | 1.61 | 78.9% | 37.8% | 4.16 | 27.4% | 22.6% (113/499) | 6.90 | 1.40 | 0 | 0 |

### Recipes

| Recipe served rate (served / spawned) | even-2v2 | gap-2v2 | even-1v1 | easy-vs-hard | mixed |
| --- | --- | --- | --- | --- | --- |
| salad | 79.9% (4666/5843) | 79.1% (4450/5625) | 21.7% (1013/4662) | 77.6% (3680/4741) | 22.2% (997/4490) |
| burger | 89.3% (5201/5825) | 89.3% (5086/5694) | 69.3% (3336/4813) | 89.4% (4336/4851) | 71.0% (3274/4614) |
| steak | 89.1% (3401/3815) | 89.3% (3412/3821) | 76.2% (2459/3225) | 90.7% (3032/3343) | 76.5% (2416/3158) |
| fish | 84.1% (3183/3786) | 84.8% (3197/3769) | 68.5% (2154/3145) | 84.8% (2599/3065) | 67.7% (2078/3068) |

### Context: tickets, waste, Critic, Heat

| Scenario | Tickets/round spawned · served · expired · left | Wasted/round cold · trashed · left | Critic A · B · unserved | Trailing crew wins Critic | Heat A t0/t1/t2/t3 | Heat B t0/t1/t2/t3 | Fires/round |
| --- | --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 38.4 · 32.8 · 1.9 · 3.8 | 3.89 · 0.01 · 0.95 | 233 · 233 · 36 | 49.3% (246/499) | 39/29/20/12 | 39/30/21/11 | 2.74 |
| gap-2v2 | 38.9 · 33.2 · 1.9 · 3.8 | 4.08 · 0.00 · 1.03 | 206 · 243 · 37 | 48.4% (235/486) | 36/27/22/15 | 39/28/20/12 | 2.42 |
| even-1v1 | 30.4 · 17.2 · 9.1 · 4.1 | 3.58 · 0.00 · 0.94 | 189 · 195 · 137 | 40.5% (209/516) | 49/29/21/1 | 48/29/21/1 | 1.46 |
| easy-vs-hard | 38.6 · 33.0 · 2.0 · 3.7 | 3.85 · 0.07 · 1.03 | 185 · 189 · 40 | 46.7% (193/413) | 54/28/14/5 | 22/22/20/36 | 2.69 |
| mixed | 30.7 · 17.5 · 8.9 · 4.2 | 3.23 · 0.00 · 0.93 | 205 · 169 · 126 | 38.1% (189/496) | 46/29/23/1 | 47/29/23/1 | 1.45 |

### Charms

| Scenario | Charms/round spawned | Banked/round A / B | Faded/round | Knocks on charm carriers/round |
| --- | --- | --- | --- | --- |
| even-2v2 | 1.00 | 0.50 / 0.50 | 0.00 | 0.42 |
| gap-2v2 | 1.00 | 0.54 / 0.46 | 0.00 | 0.44 |
| even-1v1 | 1.00 | 0.48 / 0.50 | 0.02 | 0.45 |
| easy-vs-hard | 1.00 | 0.33 / 0.67 | 0.00 | 0.13 |
| mixed | 1.00 | 0.54 / 0.46 | 0.01 | 0.25 |

### Scoring economy: Heat, lead swings, points by source, waste by cause

| Scenario | Top-Heat share | Heat drops/crew/round | Lead changes/round | Comeback % | Points: base · Critic · Heat · rush · charm | Waste/round: cold sniped · cold slow · cold partial (no ticket) · cold partial (ticket) · trashed · left · burns · expired tickets |
| --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 11.6% | 1.13 | 7.34 | 23.9% | 59.1% · 3.3% · 17.5% · 18.5% · 1.6% | 0.51 · 0.33 · 0.94 · 2.12 · 0.01 · 0.95 · 3.36 · 1.85 |
| gap-2v2 | 13.8% | 1.06 | 7.32 | 21.2% | 58.3% · 3.0% · 18.5% · 18.6% · 1.6% | 0.52 · 0.35 · 0.97 · 2.24 · 0.00 · 1.03 · 3.11 · 1.91 |
| even-1v1 | 1.0% | 0.25 | 6.55 | 20.3% | 60.9% · 4.9% · 12.8% · 18.5% · 2.9% | 0.39 · 0.17 · 0.65 · 2.37 · 0.00 · 0.94 · 1.52 · 9.07 |
| easy-vs-hard | 20.1% | 0.76 | 3.81 | 6.3% | 55.5% · 3.1% · 21.2% · 18.8% · 1.5% | 0.47 · 0.31 · 1.07 · 2.00 · 0.07 · 1.03 · 2.84 · 1.96 |
| mixed | 1.1% | 0.25 | 6.90 | 22.6% | 60.9% · 4.6% · 13.2% · 18.5% · 2.9% | 0.35 · 0.13 · 0.64 · 2.12 · 0.00 · 0.93 · 1.40 · 8.90 |

### gap-2v2 calibration

Crew throughput: two normal bots at the given skill vs an empty kitchen, points per round. Baseline (normal, no skill override): **1636.3**.

| Skill | Points/round | vs baseline |
| --- | --- | --- |
| 0.50 | 1540.3 | 0.941× |
| 0.55 | 1539.6 | 0.941× |
| 0.60 | 1636.3 | 1.000× |
| 0.65 | 1734.9 | 1.060× |
| 0.70 | 1905.5 | 1.165× |
| 0.75 | 1963.7 | 1.200× |
| 0.80 | 2000.9 | 1.223× |
| 0.85 | 2156.7 | 1.318× |
| 0.90 | 2224.1 | 1.359× |
| 0.95 | 2326.9 | 1.422× |
| 1.00 | 2320.7 | 1.418× |

Chosen crew-A skill: **0.669** (≈1.100×). interpolated between skill 0.65 and 0.7.

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
| Matches run | 1480 in 105.7 s (14.0 matches/s) |
| Commit | `7bb74a5` |

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
- **Heat**: share of service/rush/last-call time at each Heat tier. **Top-Heat share**: both crews at the top tier. **Heat drops**: tier lost to a burn, per crew per round.
- **Points by source**: each delivery split in formula order — base (baseValue × freshness), Critic premium, Heat bonus, rush bonus — plus charmPoints per banked charm. Heat from charms shows up as Heat bonus.
- **Cold sniped / slow / partial**: a plate went cold holding a finished dish with no ticket left (rival served it or it expired) / a finished dish that still had a ticket / an unfinished dish, split by whether a ticket it could still fill was open.
