# Botsim balance report

## Pass bars

From the design doc, validation step 4.

| Check | Target | Value | Result |
| --- | --- | --- | --- |
| Bots never get stuck | 0 stuck events (all scenarios) | 0 | ✅ PASS |
| Knocks per round | 2–6 (even-2v2) | 5.39 | ✅ PASS |
| No recipe skipped twice as often as another | lowest served rate ≥ 0.5 × highest (even-2v2) | salad 77.3%, burger 89.1%, steak 86.8%, fish 82.3% | ✅ PASS |
| A 10% faster crew wins 65–80% of rounds | 65–80% (gap-2v2, crew A) | 61.8% [57.5%, 66.0%] | ❌ FAIL |

## Side bias

Even scenarios: crew A should win about 50% of decisive rounds.

| Check | Target | Value | Result |
| --- | --- | --- | --- |
| Side bias, even-2v2 | 50% inside the 95% CI | 51.1% [46.7%, 55.5%] (501 decisive) | ✅ PASS |
| Side bias, even-1v1 | 50% inside the 95% CI | 43.0% [38.7%, 47.4%] (493 decisive) | ❌ FAIL |
| Side bias, mixed | 50% inside the 95% CI | 46.5% [42.1%, 51.0%] (488 decisive) | ✅ PASS |

## Details

### Scenarios

| Scenario | Matches / rounds | A round win % [95% CI] | Draws | Pts/round A / B | Served/round A / B | Knocks/round | Steal % | Contested % | Wasted/round | Close % | Comeback % | Lead changes/round | Burns/round | Stuck | Runaway |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 200 / 501 | 51.1% [46.7%, 55.5%] | 0 | 1668.1 / 1679.9 | 16.16 / 16.21 | 5.39 | 88.0% | 43.9% | 5.41 | 26.5% | 22.4% (112/500) | 7.15 | 2.86 | 0 | 0 |
| gap-2v2 | 200 / 500 | 61.8% [57.5%, 66.0%] | 0 | 1796.0 / 1690.8 | 16.78 / 16.20 | 5.98 | 87.1% | 45.6% | 5.52 | 27.4% | 23.8% (119/500) | 7.26 | 2.57 | 0 | 0 |
| even-1v1 | 200 / 493 | 43.0% [38.7%, 47.4%] | 0 | 956.9 / 993.1 | 8.91 / 8.98 | 2.60 | 90.1% | 39.1% | 4.08 | 24.3% | 19.3% (95/491) | 6.58 | 1.24 | 0 | 0 |
| easy-vs-hard | 200 / 418 | 4.8% [3.1%, 7.3%] | 0 | 1367.9 / 2082.2 | 14.22 / 18.39 | 2.23 | 79.2% | 44.2% | 5.24 | 7.7% | 5.0% (21/418) | 3.92 | 2.65 | 0 | 0 |
| mixed | 200 / 489 | 46.5% [42.1%, 51.0%] | 1 | 932.4 / 968.5 | 8.77 / 8.90 | 3.19 | 91.0% | 39.0% | 4.24 | 22.5% | 21.5% (105/489) | 6.57 | 1.35 | 0 | 0 |

### Recipes

| Recipe served rate (served / spawned) | even-2v2 | gap-2v2 | even-1v1 | easy-vs-hard | mixed |
| --- | --- | --- | --- | --- | --- |
| salad | 77.3% (4422/5717) | 76.5% (4337/5670) | 22.0% (955/4343) | 76.6% (3555/4644) | 23.1% (1008/4361) |
| burger | 89.1% (5050/5667) | 89.3% (5132/5745) | 69.5% (3205/4609) | 87.5% (4148/4738) | 69.2% (3061/4425) |
| steak | 86.8% (3255/3749) | 89.8% (3478/3875) | 74.9% (2251/3006) | 90.1% (2951/3274) | 74.3% (2282/3070) |
| fish | 82.3% (3049/3703) | 82.9% (3093/3732) | 68.1% (2027/2977) | 84.0% (2602/3096) | 65.9% (1949/2958) |

### Context: tickets, waste, Critic, Heat

| Scenario | Tickets/round spawned · served · expired · left | Wasted/round cold · trashed · left | Critic A · B · unserved | Trailing crew wins Critic | Heat A t0/t1/t2/t3 | Heat B t0/t1/t2/t3 | Fires/round |
| --- | --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 37.6 · 31.5 · 2.2 · 3.9 | 4.31 · 0.01 · 1.09 | 217 · 227 · 57 | 45.8% (229/500) | 18/17/26/39 | 17/16/26/41 | 1.84 |
| gap-2v2 | 38.0 · 32.1 · 2.1 · 3.9 | 4.50 · 0.01 · 1.02 | 230 · 221 · 49 | 46.8% (234/500) | 16/15/25/44 | 17/16/26/41 | 1.51 |
| even-1v1 | 30.3 · 17.1 · 9.1 · 4.1 | 3.29 · 0.00 · 0.78 | 183 · 199 · 111 | 40.9% (201/491) | 26/21/24/28 | 25/21/24/29 | 0.97 |
| easy-vs-hard | 37.7 · 31.7 · 2.1 · 3.8 | 4.17 · 0.05 · 1.02 | 171 · 205 · 42 | 43.3% (181/418) | 24/22/30/25 | 13/11/19/57 | 2.00 |
| mixed | 30.3 · 17.0 · 9.1 · 4.2 | 3.39 · 0.00 · 0.85 | 173 · 169 · 147 | 37.2% (181/486) | 27/22/25/27 | 25/21/24/30 | 1.23 |

### Charms

| Scenario | Charms/round spawned | Banked/round A / B | Faded/round | Knocks on charm carriers/round |
| --- | --- | --- | --- | --- |
| even-2v2 | 1.00 | 0.51 / 0.49 | 0.00 | 0.46 |
| gap-2v2 | 1.00 | 0.54 / 0.46 | 0.00 | 0.42 |
| even-1v1 | 1.00 | 0.49 / 0.49 | 0.02 | 0.51 |
| easy-vs-hard | 1.00 | 0.29 / 0.71 | 0.00 | 0.15 |
| mixed | 1.00 | 0.43 / 0.55 | 0.02 | 0.58 |

### Scoring economy: Heat, lead swings, points by source, waste by cause

| Scenario | Top-Heat share | Heat drops/crew/round | Lead changes/round | Comeback % | Points: base · Critic · Heat · rush · charm | Waste/round: cold sniped · cold slow · cold partial · trashed · left · burns · expired tickets |
| --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 40.1% | 1.24 | 7.15 | 22.4% | 51.5% · 2.9% · 30.9% · 13.2% · 1.5% | 0.49 · 0.30 · 3.53 · 0.01 · 1.09 · 2.86 · 2.21 |
| gap-2v2 | 42.1% | 1.16 | 7.26 | 23.8% | 51.1% · 2.8% · 31.5% · 13.2% · 1.4% | 0.52 · 0.32 · 3.66 · 0.01 · 1.02 · 2.57 · 2.07 |
| even-1v1 | 28.8% | 0.26 | 6.58 | 19.3% | 52.0% · 4.3% · 26.8% · 14.4% · 2.5% | 0.43 · 0.18 · 2.68 · 0.00 · 0.78 · 1.24 · 9.12 |
| easy-vs-hard | 41.1% | 1.09 | 3.92 | 5.0% | 51.2% · 2.9% · 31.5% · 13.0% · 1.4% | 0.50 · 0.35 · 3.33 · 0.05 · 1.02 · 2.65 · 2.14 |
| mixed | 28.1% | 0.33 | 6.57 | 21.5% | 52.7% · 3.9% · 26.5% · 14.3% · 2.6% | 0.36 · 0.14 · 2.89 · 0.00 · 0.85 · 1.35 · 9.14 |

### gap-2v2 calibration

Crew throughput: two normal bots at the given skill vs an empty kitchen, points per round. Baseline (normal, no skill override): **1689.8**.

| Skill | Points/round | vs baseline |
| --- | --- | --- |
| 0.50 | 1662.9 | 0.984× |
| 0.55 | 1663.6 | 0.985× |
| 0.60 | 1689.8 | 1.000× |
| 0.65 | 1779.3 | 1.053× |
| 0.70 | 1897.7 | 1.123× |
| 0.75 | 1979.8 | 1.172× |
| 0.80 | 1970.6 | 1.166× |
| 0.85 | 2011.2 | 1.190× |
| 0.90 | 2111.7 | 1.250× |
| 0.95 | 2116.2 | 1.252× |
| 1.00 | 2164.3 | 1.281× |

Chosen crew-A skill: **0.684** (≈1.100×). interpolated between skill 0.65 and 0.7.

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
| Matches run | 1480 in 186.1 s (8.0 matches/s) |
| Commit | `49b3055` |

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
- **Cold sniped / slow / partial**: a plate went cold holding a finished dish with no ticket left (rival served it or it expired) / a finished dish that still had a ticket / an unfinished dish.
