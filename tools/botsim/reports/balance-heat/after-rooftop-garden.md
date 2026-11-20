# Botsim balance report

## Pass bars

From the design doc, validation step 4.

| Check | Target | Value | Result |
| --- | --- | --- | --- |
| Bots never get stuck | 0 stuck events (all scenarios) | 0 | ✅ PASS |
| Knocks per round | 2–6 (even-2v2) | 5.36 | ✅ PASS |
| No recipe skipped twice as often as another | lowest served rate ≥ 0.5 × highest (even-2v2) | salad 77.5%, burger 89.0%, steak 86.7%, fish 82.1% | ✅ PASS |
| A 10% faster crew wins 65–80% of rounds | 65–80% (gap-2v2, crew A) | 60.7% [56.4%, 64.9%] | ❌ FAIL |

## Side bias

Even scenarios: crew A should win about 50% of decisive rounds.

| Check | Target | Value | Result |
| --- | --- | --- | --- |
| Side bias, even-2v2 | 50% inside the 95% CI | 53.0% [48.6%, 57.4%] (496 decisive) | ✅ PASS |
| Side bias, even-1v1 | 50% inside the 95% CI | 45.2% [40.9%, 49.6%] (493 decisive) | ❌ FAIL |
| Side bias, mixed | 50% inside the 95% CI | 46.4% [42.0%, 50.8%] (496 decisive) | ✅ PASS |

## Details

### Scenarios

| Scenario | Matches / rounds | A round win % [95% CI] | Draws | Pts/round A / B | Served/round A / B | Knocks/round | Steal % | Contested % | Wasted/round | Close % | Comeback % | Lead changes/round | Burns/round | Stuck | Runaway |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 200 / 496 | 53.0% [48.6%, 57.4%] | 0 | 1476.9 / 1483.0 | 16.14 / 16.21 | 5.36 | 87.9% | 43.9% | 5.42 | 22.2% | 20.4% (101/495) | 7.18 | 2.88 | 0 | 0 |
| gap-2v2 | 200 / 494 | 60.7% [56.4%, 64.9%] | 0 | 1600.7 / 1465.1 | 16.80 / 15.92 | 6.42 | 89.1% | 45.5% | 5.64 | 24.7% | 22.7% (112/494) | 7.09 | 2.65 | 0 | 0 |
| even-1v1 | 200 / 493 | 45.2% [40.9%, 49.6%] | 0 | 831.1 / 853.8 | 8.92 / 8.98 | 2.49 | 89.7% | 39.1% | 4.07 | 24.3% | 20.5% (101/492) | 6.62 | 1.24 | 0 | 0 |
| easy-vs-hard | 200 / 414 | 3.4% [2.0%, 5.6%] | 1 | 1168.5 / 1977.0 | 14.21 / 18.40 | 2.23 | 79.1% | 44.2% | 5.24 | 6.3% | 5.1% (21/413) | 3.96 | 2.65 | 0 | 0 |
| mixed | 200 / 496 | 46.4% [42.0%, 50.8%] | 0 | 809.8 / 838.3 | 8.77 / 8.92 | 3.21 | 91.1% | 39.2% | 4.22 | 24.0% | 22.7% (112/494) | 6.65 | 1.33 | 0 | 0 |

### Recipes

| Recipe served rate (served / spawned) | even-2v2 | gap-2v2 | even-1v1 | easy-vs-hard | mixed |
| --- | --- | --- | --- | --- | --- |
| salad | 77.5% (4382/5655) | 76.6% (4233/5529) | 22.1% (962/4355) | 76.5% (3518/4600) | 23.2% (1024/4423) |
| burger | 89.0% (5001/5616) | 89.6% (5054/5641) | 69.8% (3203/4590) | 87.6% (4109/4692) | 69.2% (3120/4509) |
| steak | 86.7% (3234/3729) | 87.7% (3361/3832) | 75.0% (2257/3009) | 90.1% (2925/3246) | 74.6% (2306/3092) |
| fish | 82.1% (2986/3636) | 82.9% (3068/3702) | 67.8% (2019/2980) | 84.1% (2578/3067) | 66.0% (1978/2998) |

### Context: tickets, waste, Critic, Heat

| Scenario | Tickets/round spawned · served · expired · left | Wasted/round cold · trashed · left | Critic A · B · unserved | Trailing crew wins Critic | Heat A t0/t1/t2/t3 | Heat B t0/t1/t2/t3 | Fires/round |
| --- | --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 37.6 · 31.5 · 2.2 · 3.9 | 4.32 · 0.01 · 1.09 | 219 · 224 · 53 | 45.7% (226/494) | 39/28/21/12 | 38/28/21/13 | 1.87 |
| gap-2v2 | 37.9 · 31.8 · 2.2 · 3.9 | 4.60 · 0.02 · 1.02 | 231 · 217 · 46 | 44.3% (219/494) | 35/26/22/17 | 40/29/20/11 | 1.60 |
| even-1v1 | 30.3 · 17.1 · 9.1 · 4.1 | 3.28 · 0.00 · 0.79 | 185 · 198 · 110 | 41.7% (205/492) | 47/29/23/1 | 47/29/24/1 | 0.97 |
| easy-vs-hard | 37.7 · 31.7 · 2.1 · 3.8 | 4.17 · 0.04 · 1.02 | 167 · 206 · 41 | 43.8% (181/413) | 54/29/14/3 | 25/22/20/34 | 2.01 |
| mixed | 30.3 · 17.0 · 9.1 · 4.2 | 3.37 · 0.00 · 0.85 | 179 · 169 · 148 | 37.0% (183/495) | 49/30/21/1 | 46/28/24/1 | 1.20 |

### Charms

| Scenario | Charms/round spawned | Banked/round A / B | Faded/round | Knocks on charm carriers/round |
| --- | --- | --- | --- | --- |
| even-2v2 | 1.00 | 0.51 / 0.49 | 0.00 | 0.44 |
| gap-2v2 | 1.00 | 0.54 / 0.46 | 0.00 | 0.56 |
| even-1v1 | 1.00 | 0.49 / 0.49 | 0.02 | 0.45 |
| easy-vs-hard | 1.00 | 0.29 / 0.71 | 0.00 | 0.15 |
| mixed | 1.00 | 0.42 / 0.55 | 0.02 | 0.60 |

### Scoring economy: Heat, lead swings, points by source, waste by cause

| Scenario | Top-Heat share | Heat drops/crew/round | Lead changes/round | Comeback % | Points: base · Critic · Heat · rush · charm | Waste/round: cold sniped · cold slow · cold partial (no ticket) · cold partial (ticket) · trashed · left · burns · expired tickets |
| --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 12.5% | 0.96 | 7.18 | 20.4% | 58.2% · 3.3% · 18.2% · 18.7% · 1.7% | 0.48 · 0.30 · 0.90 · 2.63 · 0.01 · 1.09 · 2.88 · 2.21 |
| gap-2v2 | 14.2% | 0.89 | 7.09 | 22.7% | 57.5% · 3.2% · 18.8% · 18.9% · 1.6% | 0.48 · 0.32 · 1.03 · 2.77 · 0.02 · 1.02 · 2.65 · 2.18 |
| even-1v1 | 1.1% | 0.17 | 6.62 | 20.5% | 60.1% · 5.0% · 13.2% · 18.8% · 2.9% | 0.44 · 0.18 · 0.61 · 2.05 · 0.00 · 0.79 · 1.24 · 9.11 |
| easy-vs-hard | 18.3% | 0.73 | 3.96 | 5.1% | 56.1% · 3.1% · 20.3% · 18.9% · 1.6% | 0.49 · 0.35 · 0.92 · 2.42 · 0.04 · 1.02 · 2.65 · 2.14 |
| mixed | 1.0% | 0.20 | 6.65 | 22.7% | 60.7% · 4.5% · 13.0% · 18.8% · 3.0% | 0.37 · 0.14 · 0.59 · 2.27 · 0.00 · 0.85 · 1.33 · 9.12 |

### gap-2v2 calibration

Crew throughput: two normal bots at the given skill vs an empty kitchen, points per round. Baseline (normal, no skill override): **1550.4**.

| Skill | Points/round | vs baseline |
| --- | --- | --- |
| 0.50 | 1504.0 | 0.970× |
| 0.55 | 1491.9 | 0.962× |
| 0.60 | 1550.4 | 1.000× |
| 0.65 | 1632.3 | 1.053× |
| 0.70 | 1763.3 | 1.137× |
| 0.75 | 1847.9 | 1.192× |
| 0.80 | 1870.2 | 1.206× |
| 0.85 | 1920.1 | 1.238× |
| 0.90 | 2039.7 | 1.316× |
| 0.95 | 2054.2 | 1.325× |
| 1.00 | 2117.3 | 1.366× |

Chosen crew-A skill: **0.678** (≈1.100×). interpolated between skill 0.65 and 0.7.

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
| Matches run | 1480 in 143.9 s (10.3 matches/s) |
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
