# Botsim balance report

## Pass bars

From the design doc, validation step 4.

| Check | Target | Value | Result |
| --- | --- | --- | --- |
| Bots never get stuck | 0 stuck events (all scenarios) | 0 | ✅ PASS |
| Knocks per round | 2–6 (even-2v2) | 2.72 | ✅ PASS |
| No recipe skipped twice as often as another | lowest served rate ≥ 0.5 × highest (even-2v2) | salad 88.5%, burger 85.9%, soup 62.5%, steak 91.7%, fish 82.0% | ✅ PASS |
| A 10% faster crew wins 65–80% of rounds | 65–80% (gap-2v2, crew A) | 61.5% [57.1%, 65.7%] | ❌ FAIL |

## Side bias

Even scenarios: crew A should win about 50% of decisive rounds.

| Check | Target | Value | Result |
| --- | --- | --- | --- |
| Side bias, even-2v2 | 50% inside the 95% CI | 49.8% [45.4%, 54.2%] (500 decisive) | ✅ PASS |
| Side bias, even-1v1 | 50% inside the 95% CI | 46.4% [42.1%, 50.7%] (507 decisive) | ✅ PASS |
| Side bias, mixed | 50% inside the 95% CI | 49.9% [45.6%, 54.2%] (505 decisive) | ✅ PASS |

## Details

### Scenarios

| Scenario | Matches / rounds | A round win % [95% CI] | Draws | Pts/round A / B | Served/round A / B | Knocks/round | Steal % | Contested % | Wasted/round | Close % | Comeback % | Lead changes/round | Burns/round | Stuck | Runaway |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 200 / 502 | 49.8% [45.4%, 54.2%] | 2 | 1872.1 / 1884.0 | 16.02 / 16.08 | 2.72 | 93.7% | 41.7% | 4.35 | 31.1% | 19.7% (99/502) | 6.88 | 0.93 | 0 | 0 |
| gap-2v2 | 200 / 486 | 61.5% [57.1%, 65.7%] | 0 | 2045.0 / 1867.8 | 17.04 / 15.67 | 3.93 | 93.6% | 42.1% | 4.54 | 26.3% | 15.6% (76/486) | 6.29 | 0.70 | 0 | 0 |
| even-1v1 | 200 / 507 | 46.4% [42.1%, 50.7%] | 0 | 1025.0 / 1056.7 | 9.30 / 9.51 | 1.65 | 95.9% | 32.5% | 2.16 | 20.7% | 14.0% (71/506) | 5.94 | 0.27 | 0 | 0 |
| easy-vs-hard | 200 / 419 | 4.5% [2.9%, 7.0%] | 0 | 1460.7 / 2285.0 | 13.35 / 18.65 | 1.25 | 90.8% | 41.4% | 4.33 | 7.6% | 7.4% (31/419) | 3.26 | 1.20 | 0 | 0 |
| mixed | 200 / 505 | 49.9% [45.6%, 54.2%] | 0 | 1016.7 / 1007.1 | 9.22 / 9.17 | 1.51 | 93.1% | 33.7% | 2.20 | 23.4% | 17.0% (85/501) | 5.87 | 0.30 | 0 | 0 |

### Recipes

| Recipe served rate (served / spawned) | even-2v2 | gap-2v2 | even-1v1 | easy-vs-hard | mixed |
| --- | --- | --- | --- | --- | --- |
| salad | 88.5% (3267/3691) | 87.8% (3027/3449) | 37.5% (1091/2911) | 87.6% (2554/2915) | 36.0% (1047/2910) |
| burger | 85.9% (3814/4441) | 86.8% (3850/4437) | 65.9% (2491/3782) | 85.7% (3242/3781) | 64.9% (2373/3659) |
| soup | 62.5% (1710/2734) | 63.2% (1667/2636) | 20.8% (464/2236) | 61.6% (1377/2236) | 21.5% (478/2221) |
| steak | 91.7% (2455/2677) | 92.5% (2567/2776) | 86.5% (1973/2282) | 90.8% (2151/2369) | 86.0% (1933/2247) |
| fish | 82.0% (4395/5362) | 82.7% (4332/5237) | 68.0% (3072/4520) | 82.3% (3695/4489) | 67.4% (3010/4463) |

### Context: tickets, waste, Critic, Heat

| Scenario | Tickets/round spawned · served · expired · left | Wasted/round cold · trashed · left | Critic A · B · unserved | Trailing crew wins Critic | Heat A t0/t1/t2/t3 | Heat B t0/t1/t2/t3 | Fires/round |
| --- | --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 37.7 · 31.2 · 2.8 · 3.7 | 3.32 · 0.00 · 1.02 | 245 · 228 · 29 | 53.6% (268/500) | 15/13/22/50 | 15/13/21/51 | 0.71 |
| gap-2v2 | 38.1 · 31.8 · 2.7 · 3.7 | 3.53 · 0.00 · 1.01 | 217 · 238 · 31 | 53.7% (261/486) | 13/11/19/57 | 16/13/21/50 | 0.45 |
| even-1v1 | 31.0 · 17.9 · 8.9 · 4.2 | 1.51 · 0.00 · 0.64 | 217 · 225 · 65 | 47.7% (241/505) | 20/20/33/27 | 19/19/33/29 | 0.23 |
| easy-vs-hard | 37.7 · 31.1 · 2.9 · 3.8 | 3.35 · 0.00 · 0.98 | 166 · 223 · 30 | 42.2% (177/419) | 21/18/26/35 | 11/10/17/62 | 1.11 |
| mixed | 30.7 · 17.5 · 9.0 · 4.2 | 1.53 · 0.00 · 0.67 | 228 · 218 · 59 | 52.5% (264/503) | 20/20/33/26 | 20/21/33/26 | 0.25 |

### Charms

| Scenario | Charms/round spawned | Banked/round A / B | Faded/round | Knocks on charm carriers/round |
| --- | --- | --- | --- | --- |
| even-2v2 | 0.00 | 0.00 / 0.00 | 0.00 | 0.00 |
| gap-2v2 | 0.00 | 0.00 / 0.00 | 0.00 | 0.00 |
| even-1v1 | 0.00 | 0.00 / 0.00 | 0.00 | 0.00 |
| easy-vs-hard | 0.00 | 0.00 / 0.00 | 0.00 | 0.00 |
| mixed | 0.00 | 0.00 / 0.00 | 0.00 | 0.00 |

### gap-2v2 calibration

Crew throughput: two normal bots at the given skill vs an empty kitchen, points per round. Baseline (normal, no skill override): **2047.9**.

| Skill | Points/round | vs baseline |
| --- | --- | --- |
| 0.50 | 1908.9 | 0.932× |
| 0.55 | 1971.3 | 0.963× |
| 0.60 | 2047.9 | 1.000× |
| 0.65 | 2150.4 | 1.050× |
| 0.70 | 2198.9 | 1.074× |
| 0.75 | 2248.3 | 1.098× |
| 0.80 | 2320.4 | 1.133× |
| 0.85 | 2391.8 | 1.168× |
| 0.90 | 2360.7 | 1.153× |
| 0.95 | 2391.3 | 1.168× |
| 1.00 | 2442.7 | 1.193× |

Chosen crew-A skill: **0.753** (≈1.100×). interpolated between skill 0.75 and 0.8.

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
| Overrides | config.charmsEnabled=false |
| Sweep | none |
| Stuck threshold | 10 s |
| Max ticks | 1.5 × longest possible match |
| Calibration | 40 crew-vs-empty matches × 12 skills, target 1.1× |
| Workers | 7 |
| Matches run | 1480 in 141.2 s (10.5 matches/s) |
| Commit | `425d425` |

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
