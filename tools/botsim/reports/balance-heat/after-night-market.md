# Botsim balance report

## Pass bars

From the design doc, validation step 4.

| Check | Target | Value | Result |
| --- | --- | --- | --- |
| Bots never get stuck | 0 stuck events (all scenarios) | 0 | ✅ PASS |
| Knocks per round | 2–6 (even-2v2) | 3.06 | ✅ PASS |
| No recipe skipped twice as often as another | lowest served rate ≥ 0.5 × highest (even-2v2) | salad 84.8%, burger 92.9%, soup 66.3%, steak 89.1%, fish 89.0% | ✅ PASS |
| A 10% faster crew wins 65–80% of rounds | 65–80% (gap-2v2, crew A) | 70.1% [65.9%, 74.0%] | ✅ PASS |

## Side bias

Even scenarios: crew A should win about 50% of decisive rounds.

| Check | Target | Value | Result |
| --- | --- | --- | --- |
| Side bias, even-2v2 | 50% inside the 95% CI | 49.3% [45.0%, 53.6%] (515 decisive) | ✅ PASS |
| Side bias, even-1v1 | 50% inside the 95% CI | 50.6% [46.3%, 54.9%] (516 decisive) | ✅ PASS |
| Side bias, mixed | 50% inside the 95% CI | 50.1% [45.7%, 54.5%] (501 decisive) | ✅ PASS |

## Details

### Scenarios

| Scenario | Matches / rounds | A round win % [95% CI] | Draws | Pts/round A / B | Served/round A / B | Knocks/round | Steal % | Contested % | Wasted/round | Close % | Comeback % | Lead changes/round | Burns/round | Stuck | Runaway |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 200 / 515 | 49.3% [45.0%, 53.6%] | 0 | 1886.4 / 1902.7 | 17.14 / 17.06 | 3.06 | 96.6% | 43.4% | 4.65 | 22.3% | 16.1% (83/515) | 6.93 | 0.92 | 0 | 0 |
| gap-2v2 | 200 / 488 | 70.1% [65.9%, 74.0%] | 0 | 2136.4 / 1863.2 | 18.56 / 16.70 | 3.11 | 97.4% | 42.9% | 4.79 | 24.6% | 16.2% (79/487) | 6.56 | 0.78 | 0 | 0 |
| even-1v1 | 200 / 517 | 50.6% [46.3%, 54.9%] | 1 | 1026.5 / 1029.5 | 9.44 / 9.36 | 3.45 | 97.6% | 39.3% | 2.89 | 19.9% | 19.3% (100/517) | 4.97 | 0.24 | 0 | 0 |
| easy-vs-hard | 200 / 431 | 8.6% [6.3%, 11.6%] | 0 | 1469.5 / 2303.6 | 14.55 / 19.64 | 0.90 | 95.6% | 42.0% | 4.57 | 9.3% | 9.5% (41/431) | 3.58 | 1.13 | 0 | 0 |
| mixed | 200 / 501 | 50.1% [45.7%, 54.5%] | 0 | 1009.1 / 1024.1 | 9.26 / 9.42 | 3.56 | 97.6% | 39.0% | 2.99 | 24.2% | 18.8% (94/501) | 4.99 | 0.23 | 0 | 0 |

### Recipes

| Recipe served rate (served / spawned) | even-2v2 | gap-2v2 | even-1v1 | easy-vs-hard | mixed |
| --- | --- | --- | --- | --- | --- |
| salad | 84.8% (4668/5506) | 86.0% (4502/5235) | 28.6% (1234/4315) | 84.3% (3831/4547) | 28.7% (1213/4224) |
| burger | 92.9% (5113/5504) | 94.0% (4993/5311) | 83.2% (3681/4425) | 92.8% (4345/4680) | 83.1% (3491/4201) |
| soup | 66.3% (2418/3648) | 68.4% (2478/3625) | 25.7% (750/2913) | 66.5% (2071/3116) | 25.1% (720/2869) |
| steak | 89.1% (2477/2779) | 88.9% (2358/2651) | 77.6% (1726/2223) | 88.5% (2055/2322) | 79.4% (1735/2184) |
| fish | 89.0% (2433/2735) | 90.0% (2396/2661) | 81.1% (1842/2271) | 89.7% (2014/2246) | 81.2% (1732/2132) |

### Context: tickets, waste, Critic, Heat

| Scenario | Tickets/round spawned · served · expired · left | Wasted/round cold · trashed · left | Critic A · B · unserved | Trailing crew wins Critic | Heat A t0/t1/t2/t3 | Heat B t0/t1/t2/t3 | Fires/round |
| --- | --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 39.2 · 33.2 · 2.3 · 3.6 | 3.52 · 0.00 · 1.13 | 244 · 261 · 10 | 54.9% (282/514) | 24/18/24/33 | 25/18/24/33 | 0.38 |
| gap-2v2 | 39.9 · 34.3 · 2.1 · 3.5 | 3.64 · 0.00 · 1.15 | 241 · 238 · 9 | 55.3% (270/488) | 22/15/23/40 | 26/19/23/32 | 0.26 |
| even-1v1 | 31.2 · 17.9 · 9.2 · 4.2 | 2.15 · 0.00 · 0.74 | 229 · 257 · 31 | 53.9% (278/516) | 34/26/28/13 | 33/27/28/12 | 0.04 |
| easy-vs-hard | 39.2 · 33.2 · 2.4 · 3.6 | 3.42 · 0.00 · 1.15 | 229 · 191 · 11 | 53.4% (230/431) | 34/25/24/16 | 19/13/22/46 | 0.67 |
| mixed | 31.2 · 17.7 · 9.3 · 4.1 | 2.25 · 0.00 · 0.74 | 228 · 236 · 37 | 53.3% (266/499) | 33/27/27/13 | 33/28/27/13 | 0.05 |

### Charms

| Scenario | Charms/round spawned | Banked/round A / B | Faded/round | Knocks on charm carriers/round |
| --- | --- | --- | --- | --- |
| even-2v2 | 3.00 | 1.45 / 1.55 | 0.00 | 1.96 |
| gap-2v2 | 3.00 | 1.65 / 1.35 | 0.00 | 2.06 |
| even-1v1 | 3.00 | 1.51 / 1.48 | 0.01 | 2.74 |
| easy-vs-hard | 3.00 | 0.83 / 2.17 | 0.00 | 0.52 |
| mixed | 3.00 | 1.52 / 1.47 | 0.01 | 2.81 |

### Scoring economy: Heat, lead swings, points by source, waste by cause

| Scenario | Top-Heat share | Heat drops/crew/round | Lead changes/round | Comeback % | Points: base · Critic · Heat · rush · charm | Waste/round: cold sniped · cold slow · cold partial (no ticket) · cold partial (ticket) · trashed · left · burns · expired tickets |
| --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 33.4% | 0.39 | 6.93 | 16.1% | 48.6% · 3.9% · 25.8% · 17.8% · 4.0% | 1.35 · 0.63 · 0.97 · 0.57 · 0.00 · 1.13 · 0.92 · 2.33 |
| gap-2v2 | 36.2% | 0.30 | 6.56 | 16.2% | 47.8% · 3.7% · 26.7% · 18.0% · 3.8% | 1.36 · 0.73 · 0.98 · 0.57 · 0.00 · 1.15 · 0.78 · 2.13 |
| even-1v1 | 12.3% | 0.09 | 4.97 | 19.3% | 51.8% · 6.7% · 18.2% · 16.1% · 7.3% | 0.73 · 0.24 · 0.75 · 0.43 · 0.00 · 0.74 · 0.24 · 9.19 |
| easy-vs-hard | 30.9% | 0.40 | 3.58 | 9.5% | 49.0% · 3.9% · 25.5% · 17.6% · 4.0% | 1.15 · 0.64 · 0.98 · 0.65 · 0.00 · 1.15 · 1.13 · 2.44 |
| mixed | 12.5% | 0.08 | 4.99 | 18.8% | 52.1% · 6.5% · 18.1% · 16.0% · 7.4% | 0.78 · 0.18 · 0.78 · 0.51 · 0.00 · 0.74 · 0.23 · 9.27 |

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
| Workers | 7 |
| Matches run | 1480 in 132.4 s (11.2 matches/s) |
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
