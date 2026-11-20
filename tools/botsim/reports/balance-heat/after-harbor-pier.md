# Botsim balance report

## Pass bars

From the design doc, validation step 4.

| Check | Target | Value | Result |
| --- | --- | --- | --- |
| Bots never get stuck | 0 stuck events (all scenarios) | 0 | ✅ PASS |
| Knocks per round | 2–6 (even-2v2) | 4.22 | ✅ PASS |
| No recipe skipped twice as often as another | lowest served rate ≥ 0.5 × highest (even-2v2) | salad 87.2%, burger 84.7%, soup 60.9%, steak 90.6%, fish 79.8% | ✅ PASS |
| A 10% faster crew wins 65–80% of rounds | 65–80% (gap-2v2, crew A) | 70.9% [66.7%, 74.8%] | ✅ PASS |

## Side bias

Even scenarios: crew A should win about 50% of decisive rounds.

| Check | Target | Value | Result |
| --- | --- | --- | --- |
| Side bias, even-2v2 | 50% inside the 95% CI | 45.9% [41.6%, 50.3%] (499 decisive) | ✅ PASS |
| Side bias, even-1v1 | 50% inside the 95% CI | 46.0% [41.7%, 50.4%] (500 decisive) | ✅ PASS |
| Side bias, mixed | 50% inside the 95% CI | 48.5% [44.1%, 52.9%] (491 decisive) | ✅ PASS |

## Details

### Scenarios

| Scenario | Matches / rounds | A round win % [95% CI] | Draws | Pts/round A / B | Served/round A / B | Knocks/round | Steal % | Contested % | Wasted/round | Close % | Comeback % | Lead changes/round | Burns/round | Stuck | Runaway |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 200 / 499 | 45.9% [41.6%, 50.3%] | 0 | 1764.8 / 1814.1 | 15.36 / 15.59 | 4.22 | 93.3% | 41.3% | 4.32 | 27.3% | 19.6% (98/499) | 6.81 | 0.95 | 0 | 0 |
| gap-2v2 | 200 / 478 | 70.9% [66.7%, 74.8%] | 0 | 2018.7 / 1713.1 | 16.72 / 15.09 | 5.36 | 93.8% | 41.2% | 4.26 | 26.4% | 17.4% (83/478) | 6.37 | 0.84 | 0 | 0 |
| even-1v1 | 200 / 500 | 46.0% [41.7%, 50.4%] | 0 | 973.0 / 985.8 | 8.74 / 8.85 | 2.96 | 94.3% | 33.0% | 2.18 | 21.2% | 20.8% (104/500) | 5.53 | 0.33 | 0 | 0 |
| easy-vs-hard | 200 / 415 | 3.6% [2.2%, 5.9%] | 0 | 1306.2 / 2289.2 | 12.75 / 18.33 | 1.56 | 90.9% | 40.2% | 4.22 | 5.8% | 5.5% (23/415) | 2.57 | 1.16 | 0 | 0 |
| mixed | 200 / 492 | 48.5% [44.1%, 52.9%] | 1 | 955.1 / 962.7 | 8.67 / 8.69 | 3.04 | 94.3% | 32.6% | 2.13 | 22.0% | 18.1% (89/491) | 5.38 | 0.33 | 0 | 0 |

### Recipes

| Recipe served rate (served / spawned) | even-2v2 | gap-2v2 | even-1v1 | easy-vs-hard | mixed |
| --- | --- | --- | --- | --- | --- |
| salad | 87.2% (3172/3639) | 88.1% (2978/3382) | 32.8% (938/2857) | 86.8% (2463/2839) | 34.4% (959/2785) |
| burger | 84.7% (3690/4359) | 85.3% (3647/4278) | 63.7% (2296/3602) | 84.6% (3192/3773) | 62.8% (2217/3532) |
| soup | 60.9% (1622/2665) | 62.1% (1573/2531) | 20.9% (446/2129) | 59.1% (1296/2192) | 19.7% (418/2121) |
| steak | 90.6% (2399/2649) | 91.1% (2430/2666) | 83.8% (1861/2221) | 91.6% (2082/2274) | 82.1% (1757/2141) |
| fish | 79.8% (4105/5147) | 81.5% (4131/5069) | 64.7% (2830/4377) | 80.6% (3481/4321) | 64.9% (2774/4274) |

### Context: tickets, waste, Critic, Heat

| Scenario | Tickets/round spawned · served · expired · left | Wasted/round cold · trashed · left | Critic A · B · unserved | Trailing crew wins Critic | Heat A t0/t1/t2/t3 | Heat B t0/t1/t2/t3 | Fires/round |
| --- | --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 37.0 · 30.0 · 3.2 · 3.8 | 3.28 · 0.00 · 1.04 | 237 · 220 · 42 | 51.8% (258/498) | 27/20/24/29 | 26/19/24/31 | 0.72 |
| gap-2v2 | 37.5 · 30.9 · 3.0 · 3.7 | 3.28 · 0.00 · 0.99 | 233 · 214 · 31 | 49.7% (237/477) | 24/17/23/36 | 30/21/24/25 | 0.58 |
| even-1v1 | 30.4 · 16.7 · 9.5 · 4.1 | 1.51 · 0.00 · 0.67 | 201 · 221 · 78 | 49.1% (244/497) | 36/29/26/9 | 34/30/27/8 | 0.26 |
| easy-vs-hard | 37.1 · 30.2 · 3.2 · 3.7 | 3.25 · 0.00 · 0.97 | 178 · 206 · 31 | 44.3% (183/413) | 40/26/22/12 | 20/13/22/45 | 1.19 |
| mixed | 30.2 · 16.5 · 9.6 · 4.1 | 1.50 · 0.00 · 0.63 | 218 · 197 · 77 | 53.2% (261/491) | 36/30/25/9 | 36/29/26/9 | 0.28 |

### Charms

| Scenario | Charms/round spawned | Banked/round A / B | Faded/round | Knocks on charm carriers/round |
| --- | --- | --- | --- | --- |
| even-2v2 | 3.00 | 1.43 / 1.56 | 0.01 | 1.41 |
| gap-2v2 | 3.00 | 1.72 / 1.28 | 0.00 | 1.69 |
| even-1v1 | 3.00 | 1.45 / 1.43 | 0.13 | 1.38 |
| easy-vs-hard | 3.00 | 0.89 / 2.09 | 0.01 | 0.34 |
| mixed | 3.00 | 1.39 / 1.47 | 0.14 | 1.32 |

### Scoring economy: Heat, lead swings, points by source, waste by cause

| Scenario | Top-Heat share | Heat drops/crew/round | Lead changes/round | Comeback % | Points: base · Critic · Heat · rush · charm | Waste/round: cold sniped · cold slow · cold partial (no ticket) · cold partial (ticket) · trashed · left · burns · expired tickets |
| --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 29.8% | 0.33 | 6.81 | 19.6% | 49.5% · 3.6% · 24.6% · 18.2% · 4.2% | 1.32 · 0.58 · 0.52 · 0.86 · 0.00 · 1.04 · 0.95 · 3.19 |
| gap-2v2 | 30.9% | 0.29 | 6.37 | 17.4% | 49.4% · 3.5% · 25.0% · 18.1% · 4.0% | 1.32 · 0.59 · 0.55 · 0.82 · 0.00 · 0.99 · 0.84 · 2.96 |
| even-1v1 | 8.6% | 0.13 | 5.53 | 20.8% | 53.9% · 5.9% · 16.5% · 16.3% · 7.3% | 0.66 · 0.18 · 0.42 · 0.26 · 0.00 · 0.67 · 0.33 · 9.51 |
| easy-vs-hard | 28.2% | 0.36 | 2.57 | 5.5% | 50.0% · 3.6% · 24.7% · 17.6% · 4.2% | 1.22 · 0.61 · 0.46 · 0.96 · 0.00 · 0.97 · 1.16 · 3.21 |
| mixed | 8.9% | 0.11 | 5.38 | 18.1% | 53.8% · 6.0% · 16.3% · 16.4% · 7.5% | 0.66 · 0.19 · 0.36 · 0.29 · 0.00 · 0.63 · 0.33 · 9.56 |

### gap-2v2 calibration

Crew throughput: two normal bots at the given skill vs an empty kitchen, points per round. Baseline (normal, no skill override): **2011.9**.

| Skill | Points/round | vs baseline |
| --- | --- | --- |
| 0.50 | 2003.5 | 0.996× |
| 0.55 | 2049.1 | 1.019× |
| 0.60 | 2011.9 | 1.000× |
| 0.65 | 2125.3 | 1.056× |
| 0.70 | 2199.2 | 1.093× |
| 0.75 | 2195.3 | 1.091× |
| 0.80 | 2310.9 | 1.149× |
| 0.85 | 2392.7 | 1.189× |
| 0.90 | 2394.7 | 1.190× |
| 0.95 | 2443.2 | 1.214× |
| 1.00 | 2476.7 | 1.231× |

Chosen crew-A skill: **0.758** (≈1.100×). interpolated between skill 0.75 and 0.8.

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
| Matches run | 1480 in 155.3 s (9.5 matches/s) |
| Commit | `17837f2` |

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
