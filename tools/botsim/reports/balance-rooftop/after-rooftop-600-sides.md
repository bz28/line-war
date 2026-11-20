# Botsim balance report

## Pass bars

From the design doc, validation step 4.

| Check | Target | Value | Result |
| --- | --- | --- | --- |
| Bots never get stuck | 0 stuck events (all scenarios) | 0 | ✅ PASS |
| Knocks per round | 2–6 (even-2v2) | not run | ➖ N/A |
| No recipe skipped twice as often as another | lowest served rate ≥ 0.5 × highest (even-2v2) | not run | ➖ N/A |
| A 10% faster crew wins 65–80% of rounds | 65–80% (gap-2v2) | not run | ➖ N/A |

## Side bias

Even scenarios: crew A should win about 50% of decisive rounds.

| Check | Target | Value | Result |
| --- | --- | --- | --- |
| Side bias, even-1v1 | 50% inside the 95% CI | 49.0% [46.5%, 51.6%] (1493 decisive) | ✅ PASS |
| Side bias, mixed | 50% inside the 95% CI | 50.4% [47.9%, 53.0%] (1499 decisive) | ✅ PASS |

## Details

### Scenarios

| Scenario | Matches / rounds | A round win % [95% CI] | Draws | Pts/round A / B | Served/round A / B | Knocks/round | Steal % | Contested % | Wasted/round | Close % | Comeback % | Lead changes/round | Burns/round | Stuck | Runaway |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| even-1v1 | 600 / 1497 | 49.0% [46.5%, 51.6%] | 4 | 845.0 / 847.7 | 9.04 / 9.01 | 1.79 | 80.9% | 38.6% | 4.38 | 27.3% | 22.1% (330/1495) | 6.66 | 1.52 | 0 | 0 |
| mixed | 600 / 1503 | 50.4% [47.9%, 53.0%] | 4 | 849.0 / 852.7 | 9.09 / 9.11 | 1.88 | 80.9% | 38.4% | 4.24 | 25.8% | 21.5% (323/1500) | 6.75 | 1.44 | 0 | 0 |

### Recipes

| Recipe served rate (served / spawned) | even-1v1 | mixed |
| --- | --- | --- |
| salad | 21.9% (2988/13624) | 22.8% (3142/13786) |
| burger | 70.1% (9735/13890) | 71.5% (9951/13912) |
| steak | 76.3% (6996/9173) | 76.2% (6980/9158) |
| fish | 68.3% (6213/9103) | 68.0% (6167/9073) |

### Context: tickets, waste, Critic, Heat

| Scenario | Tickets/round spawned · served · expired · left | Wasted/round cold · trashed · left | Critic A · B · unserved | Trailing crew wins Critic | Heat A t0/t1/t2/t3 | Heat B t0/t1/t2/t3 | Fires/round |
| --- | --- | --- | --- | --- | --- | --- | --- |
| even-1v1 | 30.6 · 17.3 · 9.1 · 4.1 | 3.45 · 0.00 · 0.94 | 515 · 570 · 412 | 38.8% (580/1494) | 48/29/22/1 | 48/30/21/1 | 1.41 |
| mixed | 30.6 · 17.5 · 9.0 · 4.1 | 3.30 · 0.00 · 0.94 | 551 · 562 · 390 | 42.2% (630/1493) | 48/29/22/1 | 47/29/23/1 | 1.53 |

### Charms

| Scenario | Charms/round spawned | Banked/round A / B | Faded/round | Knocks on charm carriers/round |
| --- | --- | --- | --- | --- |
| even-1v1 | 1.00 | 0.49 / 0.50 | 0.01 | 0.46 |
| mixed | 1.00 | 0.48 / 0.51 | 0.01 | 0.46 |

### Scoring economy: Heat, lead swings, points by source, waste by cause

| Scenario | Top-Heat share | Heat drops/crew/round | Lead changes/round | Comeback % | Points: base · Critic · Heat · rush · charm | Waste/round: cold sniped · cold slow · cold partial (no ticket) · cold partial (ticket) · trashed · left · burns · expired tickets |
| --- | --- | --- | --- | --- | --- | --- |
| even-1v1 | 1.1% | 0.24 | 6.66 | 22.1% | 60.9% · 4.7% · 12.8% · 18.7% · 2.9% | 0.37 · 0.18 · 0.65 · 2.26 · 0.00 · 0.94 · 1.52 · 9.13 |
| mixed | 1.1% | 0.25 | 6.75 | 21.5% | 60.7% · 4.9% · 13.0% · 18.6% · 2.9% | 0.39 · 0.15 · 0.63 · 2.13 · 0.00 · 0.94 · 1.44 · 8.98 |

### Stuck events

No stuck events.

## Run settings

| Setting | Value |
| --- | --- |
| Bots | `@line-war/bots` |
| Arena | rooftop-garden |
| Matches per scenario | 600 |
| Scenarios | `even-1v1`, `mixed` |
| Base seed | 31 |
| Overrides | none (defaults from tuning.ts) |
| Sweep | none |
| Stuck threshold | 10 s |
| Max ticks | 1.5 × longest possible match |
| Calibration | 40 crew-vs-empty matches × 12 skills, target 1.1× |
| Workers | 7 |
| Matches run | 1200 in 75.7 s (15.8 matches/s) |
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
