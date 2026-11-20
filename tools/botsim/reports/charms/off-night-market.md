# Botsim balance report

## Pass bars

From the design doc, validation step 4.

| Check | Target | Value | Result |
| --- | --- | --- | --- |
| Bots never get stuck | 0 stuck events (all scenarios) | 0 | ✅ PASS |
| Knocks per round | 2–6 (even-2v2) | 0.78 | ❌ FAIL |
| No recipe skipped twice as often as another | lowest served rate ≥ 0.5 × highest (even-2v2) | salad 85.8%, burger 93.3%, soup 66.7%, steak 89.4%, fish 90.9% | ✅ PASS |
| A 10% faster crew wins 65–80% of rounds | 65–80% (gap-2v2, crew A) | 66.8% [62.5%, 70.8%] | ✅ PASS |

## Side bias

Even scenarios: crew A should win about 50% of decisive rounds.

| Check | Target | Value | Result |
| --- | --- | --- | --- |
| Side bias, even-2v2 | 50% inside the 95% CI | 49.5% [45.1%, 53.9%] (493 decisive) | ✅ PASS |
| Side bias, even-1v1 | 50% inside the 95% CI | 52.8% [48.4%, 57.1%] (508 decisive) | ✅ PASS |
| Side bias, mixed | 50% inside the 95% CI | 53.3% [48.9%, 57.6%] (501 decisive) | ✅ PASS |

## Details

### Scenarios

| Scenario | Matches / rounds | A round win % [95% CI] | Draws | Pts/round A / B | Served/round A / B | Knocks/round | Steal % | Contested % | Wasted/round | Close % | Comeback % | Lead changes/round | Burns/round | Stuck | Runaway |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 200 / 493 | 49.5% [45.1%, 53.9%] | 0 | 1945.7 / 1952.4 | 17.42 / 17.55 | 0.78 | 92.0% | 43.1% | 4.95 | 27.6% | 15.2% (75/493) | 6.99 | 0.90 | 0 | 0 |
| gap-2v2 | 200 / 491 | 66.8% [62.5%, 70.8%] | 0 | 2176.3 / 1920.7 | 19.03 / 17.07 | 1.22 | 92.8% | 42.8% | 4.79 | 25.3% | 15.5% (76/490) | 7.08 | 0.77 | 0 | 0 |
| even-1v1 | 200 / 508 | 52.8% [48.4%, 57.1%] | 0 | 1095.0 / 1077.3 | 9.93 / 9.94 | 0.27 | 89.1% | 39.5% | 2.95 | 21.7% | 16.1% (82/508) | 5.28 | 0.19 | 0 | 0 |
| easy-vs-hard | 200 / 436 | 9.6% [7.2%, 12.8%] | 0 | 1602.2 / 2268.3 | 14.91 / 19.78 | 0.37 | 88.1% | 42.0% | 4.72 | 14.4% | 10.3% (45/436) | 3.56 | 1.05 | 0 | 0 |
| mixed | 200 / 501 | 53.3% [48.9%, 57.6%] | 0 | 1084.0 / 1064.7 | 9.96 / 9.82 | 0.36 | 90.6% | 39.6% | 2.95 | 19.0% | 11.2% (56/501) | 5.34 | 0.21 | 0 | 0 |

### Recipes

| Recipe served rate (served / spawned) | even-2v2 | gap-2v2 | even-1v1 | easy-vs-hard | mixed |
| --- | --- | --- | --- | --- | --- |
| salad | 85.8% (4664/5437) | 87.0% (4660/5355) | 29.0% (1249/4301) | 83.9% (3863/4605) | 30.3% (1292/4270) |
| burger | 93.3% (4992/5348) | 94.1% (5135/5455) | 84.9% (3843/4529) | 94.0% (4474/4759) | 86.9% (3757/4324) |
| soup | 66.7% (2342/3512) | 69.3% (2595/3743) | 29.2% (848/2907) | 66.9% (2163/3232) | 27.9% (818/2936) |
| steak | 89.4% (2387/2670) | 89.9% (2380/2648) | 82.7% (1827/2208) | 89.4% (2152/2406) | 81.4% (1817/2231) |
| fish | 90.9% (2375/2613) | 91.3% (2473/2709) | 82.5% (1833/2222) | 90.8% (2045/2253) | 80.9% (1741/2151) |

### Context: tickets, waste, Critic, Heat

| Scenario | Tickets/round spawned · served · expired · left | Wasted/round cold · trashed · left | Critic A · B · unserved | Trailing crew wins Critic | Heat A t0/t1/t2/t3 | Heat B t0/t1/t2/t3 | Fires/round |
| --- | --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 39.7 · 34.0 · 2.2 · 3.6 | 3.81 · 0.00 · 1.14 | 249 · 232 · 12 | 55.8% (275/493) | 14/11/21/54 | 13/12/20/55 | 0.47 |
| gap-2v2 | 40.5 · 35.1 · 2.0 · 3.4 | 3.78 · 0.00 · 1.01 | 248 · 236 · 7 | 56.3% (276/490) | 12/10/18/59 | 14/12/21/53 | 0.33 |
| even-1v1 | 31.8 · 18.9 · 8.8 · 4.1 | 2.23 · 0.00 · 0.72 | 256 · 236 · 16 | 59.4% (302/508) | 19/18/31/32 | 17/19/31/32 | 0.04 |
| easy-vs-hard | 39.6 · 33.7 · 2.3 · 3.5 | 3.69 · 0.00 · 1.03 | 221 · 206 · 9 | 53.0% (231/436) | 18/15/25/41 | 10/9/18/63 | 0.65 |
| mixed | 31.8 · 18.8 · 8.9 · 4.0 | 2.26 · 0.00 · 0.70 | 251 · 234 · 16 | 56.0% (280/500) | 19/18/31/32 | 18/19/32/31 | 0.02 |

### Charms

| Scenario | Charms/round spawned | Banked/round A / B | Faded/round | Knocks on charm carriers/round |
| --- | --- | --- | --- | --- |
| even-2v2 | 0.00 | 0.00 / 0.00 | 0.00 | 0.00 |
| gap-2v2 | 0.00 | 0.00 / 0.00 | 0.00 | 0.00 |
| even-1v1 | 0.00 | 0.00 / 0.00 | 0.00 | 0.00 |
| easy-vs-hard | 0.00 | 0.00 / 0.00 | 0.00 | 0.00 |
| mixed | 0.00 | 0.00 / 0.00 | 0.00 | 0.00 |

### gap-2v2 calibration

Crew throughput: two normal bots at the given skill vs an empty kitchen, points per round. Baseline (normal, no skill override): **2215.1**.

| Skill | Points/round | vs baseline |
| --- | --- | --- |
| 0.50 | 2051.6 | 0.926× |
| 0.55 | 2127.2 | 0.960× |
| 0.60 | 2215.1 | 1.000× |
| 0.65 | 2154.5 | 0.973× |
| 0.70 | 2292.6 | 1.035× |
| 0.75 | 2308.3 | 1.042× |
| 0.80 | 2409.3 | 1.088× |
| 0.85 | 2480.9 | 1.120× |
| 0.90 | 2513.4 | 1.135× |
| 0.95 | 2573.2 | 1.162× |
| 1.00 | 2585.0 | 1.167× |

Chosen crew-A skill: **0.819** (≈1.100×). interpolated between skill 0.8 and 0.85.

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
| Overrides | config.charmsEnabled=false |
| Sweep | none |
| Stuck threshold | 10 s |
| Max ticks | 1.5 × longest possible match |
| Calibration | 40 crew-vs-empty matches × 12 skills, target 1.1× |
| Workers | 7 |
| Matches run | 1480 in 407.6 s (3.6 matches/s) |
| Commit | `321a9c4` |

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
- **Heat**: share of service/rush/last-call time at each Heat tier.
