# Botsim balance report

## Pass bars

From the design doc, validation step 4.

| Check | Target | tuning.panBurnSeconds=4 | tuning.panBurnSeconds=5 |
| --- | --- | --- | --- |
| Bots never get stuck | 0 stuck events (all scenarios) | 0 ✅ PASS | 0 ✅ PASS |
| Knocks per round | 2–6 (even-2v2) | 5.82 ✅ PASS | 6.28 ❌ FAIL |
| No recipe skipped twice as often as another | lowest served rate ≥ 0.5 × highest (even-2v2) | salad 76.4%, burger 88.2%, steak 88.5%, fish 82.0% ✅ PASS | salad 76.7%, burger 89.6%, steak 90.4%, fish 81.5% ✅ PASS |
| A 10% faster crew wins 65–80% of rounds | 65–80% (gap-2v2, crew A) | 65.0% [60.7%, 69.0%] ❌ FAIL | 60.3% [55.9%, 64.5%] ❌ FAIL |

## Side bias

Even scenarios: crew A should win about 50% of decisive rounds.

| Check | Target | tuning.panBurnSeconds=4 | tuning.panBurnSeconds=5 |
| --- | --- | --- | --- |
| Side bias, even-2v2 | 50% inside the 95% CI | 51.1% [46.7%, 55.5%] (499 decisive) ✅ PASS | 47.3% [43.0%, 51.7%] (499 decisive) ✅ PASS |
| Side bias, even-1v1 | 50% inside the 95% CI | 53.5% [49.1%, 57.8%] (501 decisive) ✅ PASS | 52.6% [48.2%, 56.9%] (504 decisive) ✅ PASS |
| Side bias, mixed | 50% inside the 95% CI | 47.8% [43.4%, 52.2%] (496 decisive) ✅ PASS | 54.7% [50.3%, 59.1%] (486 decisive) ❌ FAIL |

## Sweep comparison

### even-2v2

| Point | A win % | Pts/round A / B | Knocks/round | Charms banked A / B | Contested % | Wasted/round | Close % | Comeback % | Top Heat | Heat drops/crew | Lead changes | Heat pts % | Stuck |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| tuning.panBurnSeconds=4 | 51.1% [46.7%, 55.5%] | 1463.4 / 1457.7 | 5.82 | 0.47 / 0.53 | 45.3% | 5.66 | 24.2% | 20.8% | 12.0% | 0.95 | 7.45 | 17.8% | 0 |
| tuning.panBurnSeconds=5 | 47.3% [43.0%, 51.7%] | 1654.3 / 1685.6 | 6.28 | 0.47 / 0.53 | 45.9% | 5.81 | 27.3% | 24.2% | 23.6% | 0.40 | 7.43 | 22.8% | 0 |

### gap-2v2

| Point | A win % | Pts/round A / B | Knocks/round | Charms banked A / B | Contested % | Wasted/round | Close % | Comeback % | Top Heat | Heat drops/crew | Lead changes | Heat pts % | Stuck |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| tuning.panBurnSeconds=4 | 65.0% [60.7%, 69.0%] | 1592.1 / 1445.6 | 6.50 | 0.52 / 0.48 | 44.9% | 5.52 | 24.0% | 19.7% | 14.3% | 0.91 | 6.68 | 18.5% | 0 |
| tuning.panBurnSeconds=5 | 60.3% [55.9%, 64.5%] | 1816.8 / 1686.2 | 6.95 | 0.49 / 0.51 | 45.7% | 5.73 | 27.5% | 23.6% | 26.2% | 0.32 | 7.64 | 23.6% | 0 |

### even-1v1

| Point | A win % | Pts/round A / B | Knocks/round | Charms banked A / B | Contested % | Wasted/round | Close % | Comeback % | Top Heat | Heat drops/crew | Lead changes | Heat pts % | Stuck |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| tuning.panBurnSeconds=4 | 53.5% [49.1%, 57.8%] | 832.3 / 816.9 | 2.97 | 0.55 / 0.44 | 39.6% | 4.23 | 22.8% | 20.8% | 1.0% | 0.19 | 6.15 | 13.0% | 0 |
| tuning.panBurnSeconds=5 | 52.6% [48.2%, 56.9%] | 846.8 / 833.0 | 3.21 | 0.54 / 0.45 | 40.0% | 4.20 | 25.4% | 21.3% | 1.1% | 0.12 | 6.51 | 13.4% | 0 |

### easy-vs-hard

| Point | A win % | Pts/round A / B | Knocks/round | Charms banked A / B | Contested % | Wasted/round | Close % | Comeback % | Top Heat | Heat drops/crew | Lead changes | Heat pts % | Stuck |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| tuning.panBurnSeconds=4 | 4.3% [2.7%, 6.7%] | 1172.2 / 1957.9 | 2.46 | 0.34 / 0.66 | 43.2% | 5.23 | 6.9% | 9.8% | 18.9% | 0.69 | 4.12 | 20.7% | 0 |
| tuning.panBurnSeconds=5 | 7.2% [5.1%, 10.1%] | 1318.2 / 2056.4 | 2.49 | 0.32 / 0.68 | 43.7% | 5.38 | 9.6% | 10.5% | 24.8% | 0.38 | 4.72 | 23.3% | 0 |

### mixed

| Point | A win % | Pts/round A / B | Knocks/round | Charms banked A / B | Contested % | Wasted/round | Close % | Comeback % | Top Heat | Heat drops/crew | Lead changes | Heat pts % | Stuck |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| tuning.panBurnSeconds=4 | 47.8% [43.4%, 52.2%] | 813.7 / 834.3 | 3.04 | 0.44 / 0.54 | 40.0% | 4.18 | 28.4% | 24.0% | 1.0% | 0.19 | 6.57 | 12.8% | 0 |
| tuning.panBurnSeconds=5 | 54.7% [50.3%, 59.1%] | 845.3 / 838.0 | 2.90 | 0.46 / 0.52 | 39.0% | 4.25 | 26.2% | 24.0% | 1.1% | 0.11 | 6.59 | 13.3% | 0 |

## Details: tuning.panBurnSeconds=4

### Scenarios

| Scenario | Matches / rounds | A round win % [95% CI] | Draws | Pts/round A / B | Served/round A / B | Knocks/round | Steal % | Contested % | Wasted/round | Close % | Comeback % | Lead changes/round | Burns/round | Stuck | Runaway |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 200 / 499 | 51.1% [46.7%, 55.5%] | 0 | 1463.4 / 1457.7 | 16.08 / 16.00 | 5.82 | 87.8% | 45.3% | 5.66 | 24.2% | 20.8% (104/499) | 7.45 | 2.93 | 0 | 0 |
| gap-2v2 | 200 / 508 | 65.0% [60.7%, 69.0%] | 0 | 1592.1 / 1445.6 | 16.83 / 15.92 | 6.50 | 89.1% | 44.9% | 5.52 | 24.0% | 19.7% (100/508) | 6.68 | 2.70 | 0 | 0 |
| even-1v1 | 200 / 501 | 53.5% [49.1%, 57.8%] | 0 | 832.3 / 816.9 | 8.81 / 8.84 | 2.97 | 91.2% | 39.6% | 4.23 | 22.8% | 20.8% (104/499) | 6.15 | 1.43 | 0 | 0 |
| easy-vs-hard | 200 / 418 | 4.3% [2.7%, 6.7%] | 0 | 1172.2 / 1957.9 | 14.14 / 18.44 | 2.46 | 79.7% | 43.2% | 5.23 | 6.9% | 9.8% (41/418) | 4.12 | 2.52 | 0 | 0 |
| mixed | 200 / 496 | 47.8% [43.4%, 52.2%] | 0 | 813.7 / 834.3 | 8.80 / 8.89 | 3.04 | 92.6% | 40.0% | 4.18 | 28.4% | 24.0% (119/495) | 6.57 | 1.39 | 0 | 0 |

### Recipes

| Recipe served rate (served / spawned) | even-2v2 | gap-2v2 | even-1v1 | easy-vs-hard | mixed |
| --- | --- | --- | --- | --- | --- |
| salad | 76.4% (4373/5727) | 77.8% (4458/5731) | 23.6% (1086/4604) | 77.1% (3698/4797) | 23.3% (1040/4472) |
| burger | 88.2% (4843/5493) | 89.1% (5173/5806) | 69.4% (3178/4581) | 89.3% (4198/4700) | 69.3% (3110/4486) |
| steak | 88.5% (3317/3749) | 88.2% (3349/3797) | 74.2% (2232/3009) | 89.2% (2814/3155) | 72.9% (2197/3013) |
| fish | 82.0% (3024/3688) | 82.2% (3198/3892) | 65.8% (1964/2987) | 81.2% (2540/3127) | 67.2% (2070/3081) |

### Context: tickets, waste, Critic, Heat

| Scenario | Tickets/round spawned · served · expired · left | Wasted/round cold · trashed · left | Critic A · B · unserved | Trailing crew wins Critic | Heat A t0/t1/t2/t3 | Heat B t0/t1/t2/t3 | Fires/round |
| --- | --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 37.4 · 31.2 · 2.3 · 3.9 | 4.60 · 0.00 · 1.06 | 213 · 235 · 51 | 49.2% (244/496) | 38/29/21/12 | 39/28/20/12 | 1.71 |
| gap-2v2 | 37.8 · 31.8 · 2.1 · 3.9 | 4.49 · 0.00 · 1.03 | 221 · 242 · 45 | 54.5% (274/503) | 36/27/21/17 | 40/28/20/12 | 1.57 |
| even-1v1 | 30.3 · 16.9 · 9.3 · 4.2 | 3.38 · 0.00 · 0.85 | 200 · 185 · 116 | 44.6% (222/498) | 48/28/23/1 | 49/29/21/1 | 1.12 |
| easy-vs-hard | 37.7 · 31.7 · 2.2 · 3.8 | 4.22 · 0.05 · 0.96 | 172 · 199 · 47 | 43.6% (182/417) | 52/29/15/5 | 24/23/20/33 | 1.91 |
| mixed | 30.3 · 17.0 · 9.2 · 4.2 | 3.36 · 0.00 · 0.82 | 174 · 183 · 139 | 38.8% (192/495) | 49/30/20/1 | 47/28/24/1 | 1.23 |

### Charms

| Scenario | Charms/round spawned | Banked/round A / B | Faded/round | Knocks on charm carriers/round |
| --- | --- | --- | --- | --- |
| even-2v2 | 1.00 | 0.47 / 0.53 | 0.00 | 0.37 |
| gap-2v2 | 1.00 | 0.52 / 0.48 | 0.00 | 0.53 |
| even-1v1 | 1.00 | 0.55 / 0.44 | 0.01 | 0.50 |
| easy-vs-hard | 1.00 | 0.34 / 0.66 | 0.00 | 0.16 |
| mixed | 1.00 | 0.44 / 0.54 | 0.02 | 0.63 |

### Scoring economy: Heat, lead swings, points by source, waste by cause

| Scenario | Top-Heat share | Heat drops/crew/round | Lead changes/round | Comeback % | Points: base · Critic · Heat · rush · charm | Waste/round: cold sniped · cold slow · cold partial (no ticket) · cold partial (ticket) · trashed · left · burns · expired tickets |
| --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 12.0% | 0.95 | 7.45 | 20.8% | 58.7% · 3.4% · 17.8% · 18.4% · 1.7% | 0.49 · 0.35 · 0.98 · 2.78 · 0.00 · 1.06 · 2.93 · 2.31 |
| gap-2v2 | 14.3% | 0.91 | 6.68 | 19.7% | 57.8% · 3.2% · 18.5% · 18.7% · 1.6% | 0.51 · 0.31 · 0.96 · 2.71 · 0.00 · 1.03 · 2.70 · 2.11 |
| even-1v1 | 1.0% | 0.19 | 6.15 | 20.8% | 60.2% · 5.0% · 13.0% · 18.8% · 3.0% | 0.37 · 0.15 · 0.67 · 2.20 · 0.00 · 0.85 · 1.43 · 9.26 |
| easy-vs-hard | 18.9% | 0.69 | 4.12 | 9.8% | 55.8% · 3.0% · 20.7% · 18.9% · 1.6% | 0.48 · 0.38 · 0.94 · 2.42 · 0.05 · 0.96 · 2.52 · 2.22 |
| mixed | 1.0% | 0.19 | 6.57 | 24.0% | 60.7% · 4.7% · 12.8% · 18.8% · 3.0% | 0.38 · 0.16 · 0.57 · 2.26 · 0.00 · 0.82 · 1.39 · 9.20 |

### gap-2v2 calibration

Crew throughput: two normal bots at the given skill vs an empty kitchen, points per round. Baseline (normal, no skill override): **1589.3**.

| Skill | Points/round | vs baseline |
| --- | --- | --- |
| 0.50 | 1513.1 | 0.952× |
| 0.55 | 1566.3 | 0.986× |
| 0.60 | 1589.3 | 1.000× |
| 0.65 | 1697.7 | 1.068× |
| 0.70 | 1766.1 | 1.111× |
| 0.75 | 1827.8 | 1.150× |
| 0.80 | 1888.3 | 1.188× |
| 0.85 | 1952.2 | 1.228× |
| 0.90 | 1990.7 | 1.253× |
| 0.95 | 2041.6 | 1.285× |
| 1.00 | 2145.8 | 1.350× |

Chosen crew-A skill: **0.687** (≈1.100×). interpolated between skill 0.65 and 0.7.

### Stuck events

No stuck events.

## Details: tuning.panBurnSeconds=5

### Scenarios

| Scenario | Matches / rounds | A round win % [95% CI] | Draws | Pts/round A / B | Served/round A / B | Knocks/round | Steal % | Contested % | Wasted/round | Close % | Comeback % | Lead changes/round | Burns/round | Stuck | Runaway |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 200 / 499 | 47.3% [43.0%, 51.7%] | 0 | 1654.3 / 1685.6 | 16.49 / 16.52 | 6.28 | 88.2% | 45.9% | 5.81 | 27.3% | 24.2% (121/499) | 7.43 | 1.10 | 0 | 0 |
| gap-2v2 | 200 / 491 | 60.3% [55.9%, 64.5%] | 0 | 1816.8 / 1686.2 | 17.24 / 16.48 | 6.95 | 89.9% | 45.7% | 5.73 | 27.5% | 23.6% (116/491) | 7.64 | 0.85 | 0 | 0 |
| even-1v1 | 200 / 504 | 52.6% [48.2%, 56.9%] | 0 | 846.8 / 833.0 | 8.95 / 8.94 | 3.21 | 90.5% | 40.0% | 4.20 | 25.4% | 21.3% (107/502) | 6.51 | 0.74 | 0 | 0 |
| easy-vs-hard | 200 / 428 | 7.2% [5.1%, 10.1%] | 0 | 1318.2 / 2056.4 | 14.51 / 18.60 | 2.49 | 81.8% | 43.7% | 5.38 | 9.6% | 10.5% (45/427) | 4.72 | 1.32 | 0 | 0 |
| mixed | 200 / 488 | 54.7% [50.3%, 59.1%] | 2 | 845.3 / 838.0 | 9.00 / 8.91 | 2.90 | 91.0% | 39.0% | 4.25 | 26.2% | 24.0% (117/487) | 6.59 | 0.72 | 0 | 0 |

### Recipes

| Recipe served rate (served / spawned) | even-2v2 | gap-2v2 | even-1v1 | easy-vs-hard | mixed |
| --- | --- | --- | --- | --- | --- |
| salad | 76.7% (4417/5756) | 77.3% (4367/5647) | 23.8% (1105/4640) | 76.1% (3770/4957) | 24.0% (1056/4394) |
| burger | 89.6% (5069/5656) | 89.7% (5100/5684) | 69.8% (3210/4597) | 89.6% (4365/4873) | 68.4% (3054/4462) |
| steak | 90.4% (3465/3834) | 89.5% (3434/3835) | 75.3% (2299/3055) | 90.1% (2949/3272) | 74.3% (2176/2929) |
| fish | 81.5% (3072/3770) | 83.7% (3208/3831) | 66.8% (2025/3033) | 84.4% (2709/3211) | 68.6% (2091/3047) |

### Context: tickets, waste, Critic, Heat

| Scenario | Tickets/round spawned · served · expired · left | Wasted/round cold · trashed · left | Critic A · B · unserved | Trailing crew wins Critic | Heat A t0/t1/t2/t3 | Heat B t0/t1/t2/t3 | Fires/round |
| --- | --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 38.1 · 32.1 · 2.1 · 3.9 | 4.75 · 0.01 · 1.06 | 217 · 235 · 47 | 48.4% (241/498) | 30/25/22/23 | 29/25/23/24 | 0.75 |
| gap-2v2 | 38.7 · 32.8 · 2.0 · 3.9 | 4.64 · 0.01 · 1.09 | 234 · 213 · 44 | 48.5% (237/489) | 26/24/21/28 | 29/25/22/24 | 0.58 |
| even-1v1 | 30.4 · 17.1 · 9.1 · 4.2 | 3.38 · 0.00 · 0.82 | 199 · 180 · 125 | 43.6% (218/500) | 46/29/25/1 | 46/30/23/1 | 0.39 |
| easy-vs-hard | 38.1 · 32.2 · 2.1 · 3.8 | 4.36 · 0.06 · 0.97 | 184 · 196 · 48 | 46.9% (200/426) | 42/29/20/9 | 22/21/17/40 | 1.23 |
| mixed | 30.4 · 17.2 · 9.1 · 4.1 | 3.41 · 0.00 · 0.84 | 188 · 173 · 127 | 41.5% (201/484) | 46/30/23/1 | 46/28/25/1 | 0.35 |

### Charms

| Scenario | Charms/round spawned | Banked/round A / B | Faded/round | Knocks on charm carriers/round |
| --- | --- | --- | --- | --- |
| even-2v2 | 1.00 | 0.47 / 0.53 | 0.00 | 0.44 |
| gap-2v2 | 1.00 | 0.49 / 0.51 | 0.00 | 0.48 |
| even-1v1 | 1.00 | 0.54 / 0.45 | 0.01 | 0.41 |
| easy-vs-hard | 1.00 | 0.32 / 0.68 | 0.00 | 0.16 |
| mixed | 1.00 | 0.46 / 0.52 | 0.01 | 0.42 |

### Scoring economy: Heat, lead swings, points by source, waste by cause

| Scenario | Top-Heat share | Heat drops/crew/round | Lead changes/round | Comeback % | Points: base · Critic · Heat · rush · charm | Waste/round: cold sniped · cold slow · cold partial (no ticket) · cold partial (ticket) · trashed · left · burns · expired tickets |
| --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 23.6% | 0.40 | 7.43 | 24.2% | 53.3% · 2.9% · 22.8% · 19.5% · 1.5% | 0.50 · 0.36 · 1.14 · 2.75 · 0.01 · 1.06 · 1.10 · 2.11 |
| gap-2v2 | 26.2% | 0.32 | 7.64 | 23.6% | 52.4% · 2.8% · 23.6% · 19.8% · 1.4% | 0.61 · 0.31 · 1.08 · 2.64 · 0.01 · 1.09 · 0.85 · 1.99 |
| even-1v1 | 1.1% | 0.12 | 6.51 | 21.3% | 60.0% · 4.7% · 13.4% · 19.0% · 2.9% | 0.40 · 0.15 · 0.61 · 2.21 · 0.00 · 0.82 · 0.74 · 9.07 |
| easy-vs-hard | 24.8% | 0.38 | 4.72 | 10.5% | 53.0% · 2.9% · 23.3% · 19.3% · 1.5% | 0.53 · 0.33 · 0.96 · 2.54 · 0.06 · 0.97 · 1.32 · 2.05 |
| mixed | 1.1% | 0.11 | 6.59 | 24.0% | 60.2% · 4.6% · 13.3% · 18.9% · 2.9% | 0.38 · 0.14 · 0.50 · 2.39 · 0.00 · 0.84 · 0.72 · 9.08 |

### gap-2v2 calibration

Crew throughput: two normal bots at the given skill vs an empty kitchen, points per round. Baseline (normal, no skill override): **1825.3**.

| Skill | Points/round | vs baseline |
| --- | --- | --- |
| 0.50 | 1724.0 | 0.945× |
| 0.55 | 1813.7 | 0.994× |
| 0.60 | 1825.3 | 1.000× |
| 0.65 | 1900.8 | 1.041× |
| 0.70 | 2061.5 | 1.129× |
| 0.75 | 2083.1 | 1.141× |
| 0.80 | 2030.6 | 1.112× |
| 0.85 | 2096.6 | 1.149× |
| 0.90 | 2081.4 | 1.140× |
| 0.95 | 2104.8 | 1.153× |
| 1.00 | 2234.1 | 1.224× |

Chosen crew-A skill: **0.683** (≈1.100×). interpolated between skill 0.65 and 0.7.

### Stuck events

No stuck events.

## Run settings

| Setting | Value |
| --- | --- |
| Bots | `@line-war/bots` |
| Arena | rooftop-garden |
| Matches per scenario | 200 |
| Scenarios | `even-2v2`, `gap-2v2`, `even-1v1`, `easy-vs-hard`, `mixed` |
| Base seed | 2 |
| Overrides | none (defaults from tuning.ts) |
| Sweep | tuning.panBurnSeconds = 4, 5 |
| Stuck threshold | 10 s |
| Max ticks | 1.5 × longest possible match |
| Calibration | 40 crew-vs-empty matches × 12 skills, target 1.1× |
| Workers | 7 |
| Matches run | 2960 in 223.4 s (13.2 matches/s) |
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
