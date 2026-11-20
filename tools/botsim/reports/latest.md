# Botsim balance report

## Pass bars

From the design doc, validation step 4.

| Check | Target | Value | Result |
| --- | --- | --- | --- |
| Bots never get stuck | 0 stuck events (all scenarios) | 0 | ✅ PASS |
| Knocks per round | 2–6 (even-2v2) | 3.86 | ✅ PASS |
| No recipe skipped twice as often as another | lowest served rate ≥ 0.5 × highest (even-2v2) | salad 84.7%, burger 93.3%, soup 65.5%, steak 88.6%, fish 89.5% | ✅ PASS |
| A 10% faster crew wins 65–80% of rounds | 65–80% (gap-2v2, crew A) | 68.8% [64.5%, 72.7%] | ✅ PASS |

## Side bias

Even scenarios: crew A should win about 50% of decisive rounds.

| Check | Target | Value | Result |
| --- | --- | --- | --- |
| Side bias, even-2v2 | 50% inside the 95% CI | 50.9% [46.5%, 55.2%] (507 decisive) | ✅ PASS |
| Side bias, even-1v1 | 50% inside the 95% CI | 51.4% [47.0%, 55.7%] (508 decisive) | ✅ PASS |
| Side bias, mixed | 50% inside the 95% CI | 47.4% [43.0%, 51.8%] (496 decisive) | ✅ PASS |

## Details

### Scenarios

| Scenario | Matches / rounds | A round win % [95% CI] | Draws | Pts/round A / B | Served/round A / B | Knocks/round | Steal % | Contested % | Wasted/round | Close % | Comeback % | Lead changes/round | Burns/round | Stuck | Runaway |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 200 / 507 | 50.9% [46.5%, 55.2%] | 0 | 1898.2 / 1880.0 | 17.17 / 16.93 | 3.86 | 97.1% | 42.8% | 4.72 | 28.6% | 20.7% (105/507) | 7.23 | 0.92 | 0 | 0 |
| gap-2v2 | 200 / 487 | 68.8% [64.5%, 72.7%] | 0 | 2117.0 / 1876.9 | 18.43 / 16.83 | 3.43 | 97.0% | 43.0% | 4.80 | 26.7% | 18.7% (91/486) | 6.52 | 0.75 | 0 | 0 |
| even-1v1 | 200 / 508 | 51.4% [47.0%, 55.7%] | 0 | 1030.8 / 1025.5 | 9.42 / 9.38 | 3.33 | 97.6% | 38.8% | 2.95 | 18.5% | 18.5% (94/508) | 5.21 | 0.21 | 0 | 0 |
| easy-vs-hard | 200 / 434 | 8.3% [6.1%, 11.3%] | 0 | 1490.0 / 2307.9 | 14.56 / 19.65 | 0.93 | 94.5% | 41.9% | 4.53 | 9.9% | 9.5% (41/433) | 3.41 | 1.08 | 0 | 0 |
| mixed | 200 / 496 | 47.4% [43.0%, 51.8%] | 0 | 999.6 / 1036.0 | 9.25 / 9.47 | 3.47 | 97.9% | 39.4% | 2.97 | 21.4% | 18.3% (91/496) | 5.07 | 0.22 | 0 | 0 |

### Recipes

| Recipe served rate (served / spawned) | even-2v2 | gap-2v2 | even-1v1 | easy-vs-hard | mixed |
| --- | --- | --- | --- | --- | --- |
| salad | 84.7% (4619/5451) | 86.4% (4546/5260) | 28.5% (1207/4231) | 83.5% (3822/4576) | 29.2% (1222/4183) |
| burger | 93.3% (5053/5413) | 94.3% (4960/5261) | 83.2% (3641/4376) | 93.1% (4386/4713) | 83.3% (3473/4170) |
| soup | 65.5% (2331/3560) | 68.2% (2500/3668) | 25.6% (727/2842) | 66.4% (2085/3142) | 25.4% (715/2815) |
| steak | 88.6% (2410/2719) | 88.8% (2319/2612) | 78.6% (1719/2186) | 88.5% (2074/2344) | 79.4% (1704/2147) |
| fish | 89.5% (2379/2657) | 90.1% (2368/2629) | 80.1% (1775/2216) | 90.3% (2056/2277) | 80.1% (1710/2136) |

### Context: tickets, waste, Critic, Heat

| Scenario | Tickets/round spawned · served · expired · left | Wasted/round cold · trashed · left | Critic A · B · unserved | Trailing crew wins Critic | Heat A t0/t1/t2/t3 | Heat B t0/t1/t2/t3 | Fires/round |
| --- | --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 39.1 · 33.1 · 2.3 · 3.6 | 3.62 · 0.00 · 1.10 | 251 · 246 · 10 | 57.5% (291/506) | 25/19/23/33 | 25/18/24/33 | 0.41 |
| gap-2v2 | 39.9 · 34.3 · 2.1 · 3.5 | 3.65 · 0.00 · 1.16 | 228 · 252 · 7 | 57.8% (281/486) | 22/15/23/40 | 26/18/23/32 | 0.25 |
| even-1v1 | 31.2 · 17.9 · 9.2 · 4.1 | 2.23 · 0.00 · 0.72 | 246 · 235 · 27 | 57.4% (290/505) | 34/26/28/12 | 33/27/28/12 | 0.03 |
| easy-vs-hard | 39.3 · 33.2 · 2.4 · 3.6 | 3.39 · 0.00 · 1.14 | 231 · 193 · 10 | 53.5% (232/434) | 34/25/24/17 | 19/13/22/46 | 0.61 |
| mixed | 31.2 · 17.8 · 9.2 · 4.1 | 2.22 · 0.00 · 0.75 | 213 · 248 · 35 | 55.2% (272/493) | 34/27/27/12 | 32/27/28/12 | 0.04 |

### Charms

| Scenario | Charms/round spawned | Banked/round A / B | Faded/round | Knocks on charm carriers/round |
| --- | --- | --- | --- | --- |
| even-2v2 | 3.00 | 1.45 / 1.55 | 0.00 | 2.48 |
| gap-2v2 | 3.00 | 1.67 / 1.33 | 0.00 | 2.21 |
| even-1v1 | 3.00 | 1.50 / 1.49 | 0.00 | 2.75 |
| easy-vs-hard | 3.00 | 0.86 / 2.14 | 0.00 | 0.53 |
| mixed | 3.00 | 1.50 / 1.49 | 0.01 | 2.86 |

### Scoring economy: Heat, lead swings, points by source, waste by cause

| Scenario | Top-Heat share | Heat drops/crew/round | Lead changes/round | Comeback % | Points: base · Critic · Heat · rush · charm | Waste/round: cold sniped · cold slow · cold partial (no ticket) · cold partial (ticket) · trashed · left · burns · expired tickets |
| --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 33.3% | 0.38 | 7.23 | 20.7% | 48.5% · 3.9% · 25.8% · 17.8% · 4.0% | 1.41 · 0.65 · 0.99 · 0.57 · 0.00 · 1.10 · 0.92 · 2.34 |
| gap-2v2 | 36.3% | 0.29 | 6.52 | 18.7% | 47.8% · 3.7% · 26.8% · 18.0% · 3.8% | 1.29 · 0.71 · 1.06 · 0.59 · 0.00 · 1.16 · 0.75 · 2.14 |
| even-1v1 | 12.3% | 0.08 | 5.21 | 18.5% | 51.8% · 6.7% · 18.2% · 16.0% · 7.3% | 0.73 · 0.26 · 0.77 · 0.46 · 0.00 · 0.72 · 0.21 · 9.22 |
| easy-vs-hard | 31.3% | 0.37 | 3.41 | 9.5% | 48.8% · 3.9% · 25.6% · 17.7% · 3.9% | 1.20 · 0.61 · 0.95 · 0.63 · 0.00 · 1.14 · 1.08 · 2.45 |
| mixed | 12.1% | 0.09 | 5.07 | 18.3% | 52.0% · 6.5% · 18.0% · 16.1% · 7.3% | 0.77 · 0.21 · 0.78 · 0.46 · 0.00 · 0.75 · 0.22 · 9.23 |

### gap-2v2 calibration

Crew throughput: two normal bots at the given skill vs an empty kitchen, points per round. Baseline (normal, no skill override): **2247.9**.

| Skill | Points/round | vs baseline |
| --- | --- | --- |
| 0.50 | 2135.4 | 0.950× |
| 0.55 | 2126.7 | 0.946× |
| 0.60 | 2247.9 | 1.000× |
| 0.65 | 2289.3 | 1.018× |
| 0.70 | 2322.2 | 1.033× |
| 0.75 | 2414.6 | 1.074× |
| 0.80 | 2465.9 | 1.097× |
| 0.85 | 2524.5 | 1.123× |
| 0.90 | 2590.8 | 1.153× |
| 0.95 | 2587.8 | 1.151× |
| 1.00 | 2631.9 | 1.171× |

Chosen crew-A skill: **0.806** (≈1.100×). interpolated between skill 0.8 and 0.85.

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
| Overrides | none (defaults from tuning.ts) |
| Sweep | none |
| Stuck threshold | 10 s |
| Max ticks | 1.5 × longest possible match |
| Calibration | 40 crew-vs-empty matches × 12 skills, target 1.1× |
| Workers | 6 |
| Matches run | 1480 in 257.2 s (5.8 matches/s) |
| Commit | `5557ae1` |

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
