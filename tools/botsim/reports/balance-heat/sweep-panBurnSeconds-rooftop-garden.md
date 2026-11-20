# Botsim balance report

## Pass bars

From the design doc, validation step 4.

| Check | Target | tuning.panBurnSeconds=4 | tuning.panBurnSeconds=5 | tuning.panBurnSeconds=6 |
| --- | --- | --- | --- | --- |
| Bots never get stuck | 0 stuck events (all scenarios) | 0 ✅ PASS | 0 ✅ PASS | 0 ✅ PASS |
| Knocks per round | 2–6 (even-2v2) | 5.36 ✅ PASS | 5.86 ✅ PASS | 6.28 ❌ FAIL |
| No recipe skipped twice as often as another | lowest served rate ≥ 0.5 × highest (even-2v2) | salad 77.5%, burger 89.0%, steak 86.7%, fish 82.1% ✅ PASS | salad 77.3%, burger 90.1%, steak 88.6%, fish 83.3% ✅ PASS | salad 76.5%, burger 89.9%, steak 89.3%, fish 84.6% ✅ PASS |
| A 10% faster crew wins 65–80% of rounds | 65–80% (gap-2v2, crew A) | 60.7% [56.4%, 64.9%] ❌ FAIL | 66.9% [62.6%, 70.8%] ✅ PASS | 61.3% [56.9%, 65.5%] ❌ FAIL |

## Side bias

Even scenarios: crew A should win about 50% of decisive rounds.

| Check | Target | tuning.panBurnSeconds=4 | tuning.panBurnSeconds=5 | tuning.panBurnSeconds=6 |
| --- | --- | --- | --- | --- |
| Side bias, even-2v2 | 50% inside the 95% CI | 53.0% [48.6%, 57.4%] (496 decisive) ✅ PASS | 45.1% [40.9%, 49.5%] (505 decisive) ❌ FAIL | 45.1% [40.8%, 49.5%] (501 decisive) ❌ FAIL |
| Side bias, even-1v1 | 50% inside the 95% CI | 45.2% [40.9%, 49.6%] (493 decisive) ❌ FAIL | 50.6% [46.2%, 55.0%] (490 decisive) ✅ PASS | 49.1% [44.7%, 53.5%] (487 decisive) ✅ PASS |
| Side bias, mixed | 50% inside the 95% CI | 46.4% [42.0%, 50.8%] (496 decisive) ✅ PASS | 49.4% [45.0%, 53.8%] (496 decisive) ✅ PASS | 48.3% [43.9%, 52.7%] (499 decisive) ✅ PASS |

## Sweep comparison

### even-2v2

| Point | A win % | Pts/round A / B | Knocks/round | Charms banked A / B | Contested % | Wasted/round | Close % | Comeback % | Top Heat | Heat drops/crew | Lead changes | Heat pts % | Stuck |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| tuning.panBurnSeconds=4 | 53.0% [48.6%, 57.4%] | 1476.9 / 1483.0 | 5.36 | 0.51 / 0.49 | 43.9% | 5.42 | 22.2% | 20.4% | 12.5% | 0.96 | 7.18 | 18.2% | 0 |
| tuning.panBurnSeconds=5 | 45.1% [40.9%, 49.5%] | 1659.6 / 1724.3 | 5.86 | 0.49 / 0.51 | 45.2% | 5.59 | 25.9% | 21.4% | 24.1% | 0.39 | 7.80 | 23.0% | 0 |
| tuning.panBurnSeconds=6 | 45.1% [40.8%, 49.5%] | 1756.4 / 1801.3 | 6.28 | 0.49 / 0.51 | 45.6% | 5.69 | 26.9% | 21.2% | 30.0% | 0.14 | 8.08 | 24.8% | 0 |

### gap-2v2

| Point | A win % | Pts/round A / B | Knocks/round | Charms banked A / B | Contested % | Wasted/round | Close % | Comeback % | Top Heat | Heat drops/crew | Lead changes | Heat pts % | Stuck |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| tuning.panBurnSeconds=4 | 60.7% [56.4%, 64.9%] | 1600.7 / 1465.1 | 6.42 | 0.54 / 0.46 | 45.5% | 5.64 | 24.7% | 22.7% | 14.2% | 0.89 | 7.09 | 18.8% | 0 |
| tuning.panBurnSeconds=5 | 66.9% [62.6%, 70.8%] | 1912.9 / 1669.2 | 6.74 | 0.54 / 0.46 | 46.1% | 5.95 | 22.5% | 22.3% | 27.3% | 0.29 | 7.87 | 24.0% | 0 |
| tuning.panBurnSeconds=6 | 61.3% [56.9%, 65.5%] | 1923.0 / 1774.1 | 6.78 | 0.51 / 0.49 | 46.6% | 6.12 | 29.5% | 24.2% | 31.8% | 0.10 | 8.00 | 25.4% | 0 |

### even-1v1

| Point | A win % | Pts/round A / B | Knocks/round | Charms banked A / B | Contested % | Wasted/round | Close % | Comeback % | Top Heat | Heat drops/crew | Lead changes | Heat pts % | Stuck |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| tuning.panBurnSeconds=4 | 45.2% [40.9%, 49.6%] | 831.1 / 853.8 | 2.49 | 0.49 / 0.49 | 39.1% | 4.07 | 24.3% | 20.5% | 1.1% | 0.17 | 6.62 | 13.2% | 0 |
| tuning.panBurnSeconds=5 | 50.6% [46.2%, 55.0%] | 853.2 / 856.5 | 2.64 | 0.45 / 0.52 | 39.1% | 4.15 | 22.9% | 22.3% | 1.0% | 0.13 | 6.77 | 13.5% | 0 |
| tuning.panBurnSeconds=6 | 49.1% [44.7%, 53.5%] | 873.9 / 872.9 | 2.54 | 0.49 / 0.49 | 39.0% | 4.20 | 29.8% | 22.4% | 1.2% | 0.03 | 7.03 | 14.1% | 0 |

### easy-vs-hard

| Point | A win % | Pts/round A / B | Knocks/round | Charms banked A / B | Contested % | Wasted/round | Close % | Comeback % | Top Heat | Heat drops/crew | Lead changes | Heat pts % | Stuck |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| tuning.panBurnSeconds=4 | 3.4% [2.0%, 5.6%] | 1168.5 / 1977.0 | 2.23 | 0.29 / 0.71 | 44.2% | 5.24 | 6.3% | 5.1% | 18.3% | 0.73 | 3.96 | 20.3% | 0 |
| tuning.panBurnSeconds=5 | 6.6% [4.6%, 9.4%] | 1347.3 / 2068.4 | 2.19 | 0.31 / 0.69 | 45.0% | 5.46 | 11.1% | 11.6% | 25.0% | 0.41 | 4.88 | 23.2% | 0 |
| tuning.panBurnSeconds=6 | 14.9% [12.0%, 18.5%] | 1494.8 / 2075.7 | 2.31 | 0.31 / 0.69 | 44.9% | 5.52 | 15.2% | 13.6% | 28.7% | 0.22 | 5.47 | 24.7% | 0 |

### mixed

| Point | A win % | Pts/round A / B | Knocks/round | Charms banked A / B | Contested % | Wasted/round | Close % | Comeback % | Top Heat | Heat drops/crew | Lead changes | Heat pts % | Stuck |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| tuning.panBurnSeconds=4 | 46.4% [42.0%, 50.8%] | 809.8 / 838.3 | 3.21 | 0.42 / 0.55 | 39.2% | 4.22 | 24.0% | 22.7% | 1.0% | 0.20 | 6.65 | 13.0% | 0 |
| tuning.panBurnSeconds=5 | 49.4% [45.0%, 53.8%] | 850.9 / 836.9 | 3.36 | 0.50 / 0.49 | 39.6% | 4.23 | 27.6% | 25.2% | 1.1% | 0.12 | 6.88 | 13.4% | 0 |
| tuning.panBurnSeconds=6 | 48.3% [43.9%, 52.7%] | 855.1 / 869.3 | 3.31 | 0.46 / 0.52 | 39.5% | 4.36 | 27.7% | 24.7% | 1.1% | 0.03 | 7.21 | 13.9% | 0 |

## Details: tuning.panBurnSeconds=4

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

## Details: tuning.panBurnSeconds=5

### Scenarios

| Scenario | Matches / rounds | A round win % [95% CI] | Draws | Pts/round A / B | Served/round A / B | Knocks/round | Steal % | Contested % | Wasted/round | Close % | Comeback % | Lead changes/round | Burns/round | Stuck | Runaway |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 200 / 505 | 45.1% [40.9%, 49.5%] | 0 | 1659.6 / 1724.3 | 16.55 / 16.70 | 5.86 | 88.2% | 45.2% | 5.59 | 25.9% | 21.4% (108/505) | 7.80 | 1.09 | 0 | 0 |
| gap-2v2 | 200 / 503 | 66.9% [62.6%, 70.8%] | 2 | 1912.9 / 1669.2 | 17.57 / 16.35 | 6.74 | 88.9% | 46.1% | 5.95 | 22.5% | 22.3% (112/503) | 7.87 | 0.83 | 0 | 0 |
| even-1v1 | 200 / 490 | 50.6% [46.2%, 55.0%] | 0 | 853.2 / 856.5 | 9.05 / 9.06 | 2.64 | 90.6% | 39.1% | 4.15 | 22.9% | 22.3% (109/489) | 6.77 | 0.71 | 0 | 0 |
| easy-vs-hard | 200 / 424 | 6.6% [4.6%, 9.4%] | 0 | 1347.3 / 2068.4 | 14.71 / 18.49 | 2.19 | 79.7% | 45.0% | 5.46 | 11.1% | 11.6% (49/424) | 4.88 | 1.34 | 0 | 0 |
| mixed | 200 / 496 | 49.4% [45.0%, 53.8%] | 0 | 850.9 / 836.9 | 8.96 / 8.93 | 3.36 | 92.0% | 39.6% | 4.23 | 27.6% | 25.2% (124/493) | 6.88 | 0.75 | 0 | 0 |

### Recipes

| Recipe served rate (served / spawned) | even-2v2 | gap-2v2 | even-1v1 | easy-vs-hard | mixed |
| --- | --- | --- | --- | --- | --- |
| salad | 77.3% (4511/5839) | 76.6% (4430/5783) | 22.4% (972/4334) | 74.8% (3566/4767) | 22.6% (1001/4436) |
| burger | 90.1% (5248/5824) | 90.4% (5304/5866) | 71.3% (3241/4544) | 89.4% (4397/4920) | 69.5% (3146/4524) |
| steak | 88.6% (3484/3934) | 90.3% (3622/4012) | 74.0% (2239/3027) | 89.9% (3050/3393) | 75.8% (2347/3096) |
| fish | 83.3% (3086/3705) | 83.5% (3243/3884) | 68.3% (2047/2995) | 85.0% (2673/3146) | 67.2% (2025/3013) |

### Context: tickets, waste, Critic, Heat

| Scenario | Tickets/round spawned · served · expired · left | Wasted/round cold · trashed · left | Critic A · B · unserved | Trailing crew wins Critic | Heat A t0/t1/t2/t3 | Heat B t0/t1/t2/t3 | Fires/round |
| --- | --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 38.2 · 32.3 · 2.1 · 3.8 | 4.58 · 0.01 · 1.00 | 226 · 234 · 45 | 49.7% (248/499) | 30/25/22/23 | 29/25/21/25 | 0.79 |
| gap-2v2 | 38.9 · 33.0 · 2.1 · 3.8 | 4.96 · 0.00 · 0.98 | 247 · 219 · 37 | 52.5% (264/503) | 26/22/21/32 | 31/25/22/23 | 0.53 |
| even-1v1 | 30.4 · 17.3 · 9.0 · 4.1 | 3.35 · 0.00 · 0.80 | 201 · 172 · 117 | 43.1% (211/489) | 46/30/24/1 | 45/29/25/1 | 0.53 |
| easy-vs-hard | 38.3 · 32.3 · 2.1 · 3.9 | 4.38 · 0.05 · 1.03 | 193 · 195 · 36 | 48.3% (205/424) | 42/28/21/9 | 22/21/16/41 | 1.34 |
| mixed | 30.4 · 17.2 · 9.1 · 4.1 | 3.37 · 0.00 · 0.86 | 182 · 173 · 141 | 38.3% (189/493) | 45/30/24/1 | 46/29/24/1 | 0.47 |

### Charms

| Scenario | Charms/round spawned | Banked/round A / B | Faded/round | Knocks on charm carriers/round |
| --- | --- | --- | --- | --- |
| even-2v2 | 1.00 | 0.49 / 0.51 | 0.00 | 0.42 |
| gap-2v2 | 1.00 | 0.54 / 0.46 | 0.00 | 0.54 |
| even-1v1 | 1.00 | 0.45 / 0.52 | 0.02 | 0.41 |
| easy-vs-hard | 1.00 | 0.31 / 0.69 | 0.00 | 0.14 |
| mixed | 1.00 | 0.50 / 0.49 | 0.01 | 0.50 |

### Scoring economy: Heat, lead swings, points by source, waste by cause

| Scenario | Top-Heat share | Heat drops/crew/round | Lead changes/round | Comeback % | Points: base · Critic · Heat · rush · charm | Waste/round: cold sniped · cold slow · cold partial (no ticket) · cold partial (ticket) · trashed · left · burns · expired tickets |
| --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 24.1% | 0.39 | 7.80 | 21.4% | 52.9% · 3.0% · 23.0% · 19.7% · 1.5% | 0.55 · 0.35 · 0.99 · 2.70 · 0.01 · 1.00 · 1.09 · 2.10 |
| gap-2v2 | 27.3% | 0.29 | 7.87 | 22.3% | 51.8% · 2.9% · 24.0% · 20.0% · 1.4% | 0.53 · 0.34 · 1.20 · 2.89 · 0.00 · 0.98 · 0.83 · 2.07 |
| even-1v1 | 1.0% | 0.13 | 6.77 | 22.3% | 59.9% · 4.9% · 13.5% · 18.8% · 2.9% | 0.41 · 0.17 · 0.50 · 2.27 · 0.00 · 0.80 · 0.71 · 8.98 |
| easy-vs-hard | 25.0% | 0.41 | 4.88 | 11.6% | 53.1% · 3.0% · 23.2% · 19.2% · 1.5% | 0.51 · 0.31 · 1.08 · 2.48 · 0.05 · 1.03 · 1.34 · 2.14 |
| mixed | 1.1% | 0.12 | 6.88 | 25.2% | 60.2% · 4.6% · 13.4% · 18.8% · 2.9% | 0.39 · 0.16 · 0.53 · 2.29 · 0.00 · 0.86 · 0.75 · 9.06 |

### gap-2v2 calibration

Crew throughput: two normal bots at the given skill vs an empty kitchen, points per round. Baseline (normal, no skill override): **1842.3**.

| Skill | Points/round | vs baseline |
| --- | --- | --- |
| 0.50 | 1704.4 | 0.925× |
| 0.55 | 1778.0 | 0.965× |
| 0.60 | 1842.3 | 1.000× |
| 0.65 | 1928.2 | 1.047× |
| 0.70 | 1967.4 | 1.068× |
| 0.75 | 2078.2 | 1.128× |
| 0.80 | 2034.0 | 1.104× |
| 0.85 | 2113.3 | 1.147× |
| 0.90 | 2129.2 | 1.156× |
| 0.95 | 2127.7 | 1.155× |
| 1.00 | 2225.9 | 1.208× |

Chosen crew-A skill: **0.727** (≈1.100×). interpolated between skill 0.7 and 0.75.

### Stuck events

No stuck events.

## Details: tuning.panBurnSeconds=6

### Scenarios

| Scenario | Matches / rounds | A round win % [95% CI] | Draws | Pts/round A / B | Served/round A / B | Knocks/round | Steal % | Contested % | Wasted/round | Close % | Comeback % | Lead changes/round | Burns/round | Stuck | Runaway |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 200 / 501 | 45.1% [40.8%, 49.5%] | 0 | 1756.4 / 1801.3 | 16.70 / 16.83 | 6.28 | 88.3% | 45.6% | 5.69 | 26.9% | 21.2% (106/499) | 8.08 | 0.38 | 0 | 0 |
| gap-2v2 | 200 / 488 | 61.3% [56.9%, 65.5%] | 0 | 1923.0 / 1774.1 | 17.49 / 16.65 | 6.78 | 88.3% | 46.6% | 6.12 | 29.5% | 24.2% (118/487) | 8.00 | 0.27 | 0 | 0 |
| even-1v1 | 200 / 487 | 49.1% [44.7%, 53.5%] | 0 | 873.9 / 872.9 | 9.11 / 9.13 | 2.54 | 90.3% | 39.0% | 4.20 | 29.8% | 22.4% (109/486) | 7.03 | 0.15 | 0 | 0 |
| easy-vs-hard | 200 / 455 | 14.9% [12.0%, 18.5%] | 0 | 1494.8 / 2075.7 | 15.06 / 18.48 | 2.31 | 78.9% | 44.9% | 5.52 | 15.2% | 13.6% (62/455) | 5.47 | 0.63 | 0 | 0 |
| mixed | 200 / 499 | 48.3% [43.9%, 52.7%] | 0 | 855.1 / 869.3 | 9.01 / 9.10 | 3.31 | 91.9% | 39.5% | 4.36 | 27.7% | 24.7% (123/497) | 7.21 | 0.18 | 0 | 0 |

### Recipes

| Recipe served rate (served / spawned) | even-2v2 | gap-2v2 | even-1v1 | easy-vs-hard | mixed |
| --- | --- | --- | --- | --- | --- |
| salad | 76.5% (4466/5836) | 75.5% (4278/5668) | 21.5% (928/4319) | 75.3% (3882/5153) | 22.8% (1020/4481) |
| burger | 89.9% (5190/5774) | 90.6% (5230/5773) | 71.0% (3192/4498) | 90.0% (4779/5309) | 69.8% (3193/4576) |
| steak | 89.3% (3496/3917) | 90.6% (3506/3871) | 75.4% (2273/3015) | 90.3% (3291/3645) | 76.9% (2396/3115) |
| fish | 84.6% (3206/3790) | 85.6% (3214/3756) | 70.8% (2112/2981) | 85.2% (2895/3399) | 68.3% (2079/3045) |

### Context: tickets, waste, Critic, Heat

| Scenario | Tickets/round spawned · served · expired · left | Wasted/round cold · trashed · left | Critic A · B · unserved | Trailing crew wins Critic | Heat A t0/t1/t2/t3 | Heat B t0/t1/t2/t3 | Fires/round |
| --- | --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 38.6 · 32.7 · 2.0 · 3.9 | 4.67 · 0.01 · 1.01 | 199 · 241 · 61 | 45.0% (224/498) | 27/23/21/29 | 26/23/20/31 | 0.25 |
| gap-2v2 | 39.1 · 33.3 · 2.0 · 3.9 | 5.02 · 0.01 · 1.08 | 224 · 211 · 53 | 47.8% (233/487) | 25/21/20/34 | 26/23/21/29 | 0.13 |
| even-1v1 | 30.4 · 17.5 · 8.8 · 4.1 | 3.38 · 0.00 · 0.82 | 185 · 193 · 109 | 46.1% (224/486) | 43/29/27/1 | 43/29/27/1 | 0.08 |
| easy-vs-hard | 38.5 · 32.6 · 2.1 · 3.8 | 4.51 · 0.04 · 0.97 | 218 · 199 · 38 | 49.0% (223/455) | 33/27/24/16 | 22/21/16/41 | 0.56 |
| mixed | 30.5 · 17.4 · 9.0 · 4.1 | 3.49 · 0.00 · 0.87 | 167 · 181 · 151 | 37.8% (187/495) | 43/31/25/1 | 43/29/28/1 | 0.12 |

### Charms

| Scenario | Charms/round spawned | Banked/round A / B | Faded/round | Knocks on charm carriers/round |
| --- | --- | --- | --- | --- |
| even-2v2 | 1.00 | 0.49 / 0.51 | 0.00 | 0.60 |
| gap-2v2 | 1.00 | 0.51 / 0.49 | 0.00 | 0.46 |
| even-1v1 | 1.00 | 0.49 / 0.49 | 0.02 | 0.47 |
| easy-vs-hard | 1.00 | 0.31 / 0.69 | 0.00 | 0.16 |
| mixed | 1.00 | 0.46 / 0.52 | 0.02 | 0.47 |

### Scoring economy: Heat, lead swings, points by source, waste by cause

| Scenario | Top-Heat share | Heat drops/crew/round | Lead changes/round | Comeback % | Points: base · Critic · Heat · rush · charm | Waste/round: cold sniped · cold slow · cold partial (no ticket) · cold partial (ticket) · trashed · left · burns · expired tickets |
| --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 30.0% | 0.14 | 8.08 | 21.2% | 51.2% · 2.7% · 24.8% · 19.9% · 1.4% | 0.51 · 0.35 · 1.07 · 2.75 · 0.01 · 1.01 · 0.38 · 2.04 |
| gap-2v2 | 31.8% | 0.10 | 8.00 | 24.2% | 50.7% · 2.7% · 25.4% · 19.9% · 1.4% | 0.55 · 0.39 · 1.24 · 2.84 · 0.01 · 1.08 · 0.27 · 1.97 |
| even-1v1 | 1.2% | 0.03 | 7.03 | 22.4% | 59.4% · 4.8% · 14.1% · 18.9% · 2.8% | 0.44 · 0.21 · 0.53 · 2.20 · 0.00 · 0.82 · 0.15 · 8.82 |
| easy-vs-hard | 28.7% | 0.22 | 5.47 | 13.6% | 51.4% · 2.9% · 24.7% · 19.6% · 1.4% | 0.50 · 0.37 · 1.08 · 2.56 · 0.04 · 0.97 · 0.63 · 2.07 |
| mixed | 1.1% | 0.03 | 7.21 | 24.7% | 59.7% · 4.3% · 13.9% · 19.1% · 2.9% | 0.42 · 0.15 · 0.52 · 2.40 · 0.00 · 0.87 · 0.18 · 8.96 |

### gap-2v2 calibration

Crew throughput: two normal bots at the given skill vs an empty kitchen, points per round. Baseline (normal, no skill override): **1945.7**.

| Skill | Points/round | vs baseline |
| --- | --- | --- |
| 0.50 | 1857.7 | 0.955× |
| 0.55 | 1888.9 | 0.971× |
| 0.60 | 1945.7 | 1.000× |
| 0.65 | 1984.8 | 1.020× |
| 0.70 | 2071.9 | 1.065× |
| 0.75 | 2157.8 | 1.109× |
| 0.80 | 2072.8 | 1.065× |
| 0.85 | 2096.4 | 1.077× |
| 0.90 | 2127.1 | 1.093× |
| 0.95 | 2112.2 | 1.086× |
| 1.00 | 2221.5 | 1.142× |

Chosen crew-A skill: **0.740** (≈1.100×). interpolated between skill 0.7 and 0.75.

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
| Sweep | tuning.panBurnSeconds = 4, 5, 6 |
| Stuck threshold | 10 s |
| Max ticks | 1.5 × longest possible match |
| Calibration | 40 crew-vs-empty matches × 12 skills, target 1.1× |
| Workers | 7 |
| Matches run | 4440 in 362.5 s (12.2 matches/s) |
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
