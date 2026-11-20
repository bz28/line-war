# Botsim balance report

## Pass bars

From the design doc, validation step 4.

| Check | Target | Value | Result |
| --- | --- | --- | --- |
| Bots never get stuck | 0 stuck events (all scenarios) | 0 | ✅ PASS |
| Knocks per round | 2–6 (even-2v2) | 3.96 | ✅ PASS |
| No recipe skipped twice as often as another | lowest served rate ≥ 0.5 × highest (even-2v2) | salad 79.2%, burger 88.8%, steak 89.6%, fish 84.3% | ✅ PASS |
| A 10% faster crew wins 65–80% of rounds | 65–80% (gap-2v2, crew A) | 65.9% [63.5%, 68.3%] | ✅ PASS |

## Side bias

Even scenarios: crew A should win about 50% of decisive rounds.

| Check | Target | Value | Result |
| --- | --- | --- | --- |
| Side bias, even-2v2 | 50% inside the 95% CI | 52.0% [49.4%, 54.5%] (1505 decisive) | ✅ PASS |

## Details

### Scenarios

| Scenario | Matches / rounds | A round win % [95% CI] | Draws | Pts/round A / B | Served/round A / B | Knocks/round | Steal % | Contested % | Wasted/round | Close % | Comeback % | Lead changes/round | Burns/round | Stuck | Runaway |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 600 / 1507 | 52.0% [49.4%, 54.5%] | 2 | 1550.9 / 1533.0 | 16.86 / 16.80 | 3.96 | 85.0% | 43.4% | 4.95 | 25.3% | 22.1% (333/1505) | 7.18 | 3.31 | 0 | 0 |
| gap-2v2 | 600 / 1478 | 65.9% [63.5%, 68.3%] | 1 | 1721.7 / 1518.9 | 17.72 / 16.65 | 4.70 | 87.6% | 43.4% | 5.10 | 21.1% | 18.6% (275/1476) | 6.99 | 3.00 | 0 | 0 |

### Recipes

| Recipe served rate (served / spawned) | even-2v2 | gap-2v2 |
| --- | --- | --- |
| salad | 79.2% (13795/17418) | 79.8% (13840/17342) |
| burger | 88.8% (15397/17338) | 89.0% (15408/17309) |
| steak | 89.6% (10336/11541) | 89.9% (10272/11426) |
| fish | 84.3% (9842/11680) | 85.5% (9933/11621) |

### Context: tickets, waste, Critic, Heat

| Scenario | Tickets/round spawned · served · expired · left | Wasted/round cold · trashed · left | Critic A · B · unserved | Trailing crew wins Critic | Heat A t0/t1/t2/t3 | Heat B t0/t1/t2/t3 | Fires/round |
| --- | --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 38.5 · 32.8 · 2.0 · 3.8 | 3.97 · 0.01 · 0.97 | 693 · 662 · 152 | 46.7% (703/1504) | 38/28/21/13 | 40/29/20/12 | 2.61 |
| gap-2v2 | 39.0 · 33.5 · 1.8 · 3.7 | 4.05 · 0.01 · 1.05 | 700 · 649 · 129 | 48.6% (718/1477) | 33/27/22/17 | 40/29/20/11 | 2.25 |

### Charms

| Scenario | Charms/round spawned | Banked/round A / B | Faded/round | Knocks on charm carriers/round |
| --- | --- | --- | --- | --- |
| even-2v2 | 1.00 | 0.49 / 0.51 | 0.00 | 0.38 |
| gap-2v2 | 1.00 | 0.54 / 0.46 | 0.00 | 0.36 |

### Scoring economy: Heat, lead swings, points by source, waste by cause

| Scenario | Top-Heat share | Heat drops/crew/round | Lead changes/round | Comeback % | Points: base · Critic · Heat · rush · charm | Waste/round: cold sniped · cold slow · cold partial (no ticket) · cold partial (ticket) · trashed · left · burns · expired tickets |
| --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 12.1% | 1.10 | 7.18 | 22.1% | 59.0% · 3.1% · 17.8% · 18.5% · 1.6% | 0.52 · 0.30 · 1.01 · 2.14 · 0.01 · 0.97 · 3.31 · 1.95 |
| gap-2v2 | 14.3% | 1.02 | 6.99 | 18.6% | 57.8% · 3.1% · 18.9% · 18.6% · 1.5% | 0.49 · 0.37 · 1.09 · 2.09 · 0.01 · 1.05 · 3.00 · 1.85 |

### gap-2v2 calibration

Crew throughput: two normal bots at the given skill vs an empty kitchen, points per round. Baseline (normal, no skill override): **1653.2**.

| Skill | Points/round | vs baseline |
| --- | --- | --- |
| 0.50 | 1554.7 | 0.940× |
| 0.55 | 1611.4 | 0.975× |
| 0.60 | 1653.2 | 1.000× |
| 0.65 | 1818.1 | 1.100× |
| 0.70 | 1754.9 | 1.062× |
| 0.75 | 1960.7 | 1.186× |
| 0.80 | 2015.9 | 1.219× |
| 0.85 | 2052.0 | 1.241× |
| 0.90 | 2209.0 | 1.336× |
| 0.95 | 2286.9 | 1.383× |
| 1.00 | 2352.7 | 1.423× |

Chosen crew-A skill: **0.715** (≈1.100×). interpolated between skill 0.7 and 0.75.

### Stuck events

No stuck events.

## Run settings

| Setting | Value |
| --- | --- |
| Bots | `@line-war/bots` |
| Arena | rooftop-garden |
| Matches per scenario | 600 |
| Scenarios | `even-2v2`, `gap-2v2` |
| Base seed | 31 |
| Overrides | none (defaults from tuning.ts) |
| Sweep | none |
| Stuck threshold | 10 s |
| Max ticks | 1.5 × longest possible match |
| Calibration | 40 crew-vs-empty matches × 12 skills, target 1.1× |
| Workers | 7 |
| Matches run | 1680 in 169.7 s (9.9 matches/s) |
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
