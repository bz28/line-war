# Botsim balance report

## Pass bars

From the design doc, validation step 4.

| Check | Target | tuning.heatThresholds=[2,4,7] | tuning.heatThresholds=[3,6,10] | tuning.heatThresholds=[3,7,12] | tuning.heatThresholds=[4,8,13] | tuning.heatThresholds=[4,9,15] |
| --- | --- | --- | --- | --- | --- | --- |
| Bots never get stuck | 0 stuck events (all scenarios) | 0 ✅ PASS | 0 ✅ PASS | 0 ✅ PASS | 0 ✅ PASS | 0 ✅ PASS |
| Knocks per round | 2–6 (even-2v2) | 3.08 ✅ PASS | 3.01 ✅ PASS | 3.05 ✅ PASS | 3.08 ✅ PASS | 3.08 ✅ PASS |
| No recipe skipped twice as often as another | lowest served rate ≥ 0.5 × highest (even-2v2) | salad 84.8%, burger 92.7%, soup 66.0%, steak 89.2%, fish 89.1% ✅ PASS | salad 84.8%, burger 92.9%, soup 66.0%, steak 89.2%, fish 89.0% ✅ PASS | salad 84.9%, burger 92.9%, soup 66.2%, steak 89.0%, fish 89.0% ✅ PASS | salad 84.8%, burger 92.9%, soup 66.3%, steak 89.2%, fish 89.0% ✅ PASS | salad 85.0%, burger 92.9%, soup 66.1%, steak 89.2%, fish 88.8% ✅ PASS |
| A 10% faster crew wins 65–80% of rounds | 65–80% (gap-2v2, crew A) | 72.2% [68.1%, 76.1%] ✅ PASS | 69.5% [65.3%, 73.5%] ✅ PASS | 69.3% [65.1%, 73.2%] ✅ PASS | 72.1% [67.9%, 75.9%] ✅ PASS | 72.9% [68.7%, 76.7%] ✅ PASS |

## Side bias

Even scenarios: crew A should win about 50% of decisive rounds.

| Check | Target | tuning.heatThresholds=[2,4,7] | tuning.heatThresholds=[3,6,10] | tuning.heatThresholds=[3,7,12] | tuning.heatThresholds=[4,8,13] | tuning.heatThresholds=[4,9,15] |
| --- | --- | --- | --- | --- | --- | --- |
| Side bias, even-2v2 | 50% inside the 95% CI | 48.3% [44.0%, 52.7%] (513 decisive) ✅ PASS | 49.1% [44.8%, 53.4%] (515 decisive) ✅ PASS | 50.1% [45.8%, 54.4%] (515 decisive) ✅ PASS | 49.1% [44.8%, 53.4%] (517 decisive) ✅ PASS | 50.1% [45.8%, 54.4%] (507 decisive) ✅ PASS |
| Side bias, even-1v1 | 50% inside the 95% CI | 50.6% [46.3%, 54.9%] (518 decisive) ✅ PASS | 51.0% [46.7%, 55.2%] (520 decisive) ✅ PASS | 51.2% [46.9%, 55.5%] (514 decisive) ✅ PASS | 50.7% [46.4%, 55.0%] (517 decisive) ✅ PASS | 48.4% [44.1%, 52.8%] (512 decisive) ✅ PASS |
| Side bias, mixed | 50% inside the 95% CI | 50.8% [46.4%, 55.2%] (494 decisive) ✅ PASS | 51.6% [47.2%, 55.9%] (502 decisive) ✅ PASS | 51.2% [46.8%, 55.6%] (498 decisive) ✅ PASS | 50.0% [45.6%, 54.4%] (502 decisive) ✅ PASS | 52.2% [47.8%, 56.5%] (500 decisive) ✅ PASS |

## Sweep comparison

### even-2v2

| Point | A win % | Pts/round A / B | Knocks/round | Charms banked A / B | Contested % | Wasted/round | Close % | Comeback % | Top Heat | Heat drops/crew | Lead changes | Heat pts % | Stuck |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| tuning.heatThresholds=[2,4,7] | 48.3% [44.0%, 52.7%] | 2001.4 / 2021.0 | 3.08 | 1.45 / 1.55 | 43.4% | 4.66 | 29.2% | 15.6% | 59.9% | 0.45 | 6.94 | 35.1% | 0 |
| tuning.heatThresholds=[3,6,10] | 49.1% [44.8%, 53.4%] | 1880.6 / 1891.7 | 3.01 | 1.44 / 1.56 | 43.3% | 4.65 | 26.8% | 15.3% | 44.1% | 0.43 | 7.08 | 30.9% | 0 |
| tuning.heatThresholds=[3,7,12] | 50.1% [45.8%, 54.4%] | 1819.5 / 1843.9 | 3.05 | 1.44 / 1.56 | 43.3% | 4.62 | 24.5% | 14.2% | 36.4% | 0.42 | 6.97 | 29.1% | 0 |
| tuning.heatThresholds=[4,8,13] | 49.1% [44.8%, 53.4%] | 1772.6 / 1794.8 | 3.08 | 1.45 / 1.55 | 43.4% | 4.63 | 22.8% | 13.9% | 33.4% | 0.39 | 6.77 | 27.4% | 0 |
| tuning.heatThresholds=[4,9,15] | 50.1% [45.8%, 54.4%] | 1730.0 / 1740.9 | 3.08 | 1.45 / 1.55 | 43.3% | 4.66 | 23.7% | 14.8% | 27.5% | 0.38 | 6.73 | 25.8% | 0 |

### gap-2v2

| Point | A win % | Pts/round A / B | Knocks/round | Charms banked A / B | Contested % | Wasted/round | Close % | Comeback % | Top Heat | Heat drops/crew | Lead changes | Heat pts % | Stuck |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| tuning.heatThresholds=[2,4,7] | 72.2% [68.1%, 76.1%] | 2236.8 / 1946.3 | 3.24 | 1.65 / 1.35 | 42.7% | 4.82 | 29.4% | 18.6% | 61.6% | 0.34 | 6.45 | 35.5% | 0 |
| tuning.heatThresholds=[3,6,10] | 69.5% [65.3%, 73.5%] | 2089.8 / 1832.4 | 3.59 | 1.62 / 1.38 | 42.8% | 4.84 | 30.5% | 16.9% | 46.5% | 0.32 | 6.59 | 31.5% | 0 |
| tuning.heatThresholds=[3,7,12] | 69.3% [65.1%, 73.2%] | 2047.0 / 1769.2 | 3.21 | 1.64 / 1.36 | 43.3% | 4.98 | 25.0% | 14.2% | 38.6% | 0.33 | 6.30 | 29.8% | 0 |
| tuning.heatThresholds=[4,8,13] | 72.1% [67.9%, 75.9%] | 2012.9 / 1731.4 | 3.38 | 1.69 / 1.31 | 43.1% | 4.75 | 24.1% | 18.7% | 36.3% | 0.29 | 6.79 | 28.5% | 0 |
| tuning.heatThresholds=[4,9,15] | 72.9% [68.7%, 76.7%] | 1998.0 / 1679.2 | 3.44 | 1.72 / 1.28 | 42.5% | 4.78 | 22.4% | 16.2% | 30.5% | 0.30 | 6.44 | 27.0% | 0 |

### even-1v1

| Point | A win % | Pts/round A / B | Knocks/round | Charms banked A / B | Contested % | Wasted/round | Close % | Comeback % | Top Heat | Heat drops/crew | Lead changes | Heat pts % | Stuck |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| tuning.heatThresholds=[2,4,7] | 50.6% [46.3%, 54.9%] | 1145.7 / 1156.4 | 3.74 | 1.52 / 1.47 | 39.2% | 2.88 | 22.0% | 13.9% | 44.2% | 0.10 | 4.92 | 30.1% | 0 |
| tuning.heatThresholds=[3,6,10] | 51.0% [46.7%, 55.2%] | 1054.3 / 1058.0 | 3.53 | 1.52 / 1.47 | 39.3% | 2.88 | 20.2% | 17.0% | 26.4% | 0.10 | 4.90 | 24.4% | 0 |
| tuning.heatThresholds=[3,7,12] | 51.2% [46.9%, 55.5%] | 1022.4 / 1023.4 | 3.52 | 1.52 / 1.47 | 39.2% | 2.90 | 20.2% | 17.9% | 19.0% | 0.09 | 4.82 | 22.5% | 0 |
| tuning.heatThresholds=[4,8,13] | 50.7% [46.4%, 55.0%] | 971.9 / 973.6 | 3.56 | 1.51 / 1.48 | 39.2% | 2.88 | 19.9% | 17.4% | 12.3% | 0.09 | 4.84 | 19.2% | 0 |
| tuning.heatThresholds=[4,9,15] | 48.4% [44.1%, 52.8%] | 956.5 / 963.9 | 3.44 | 1.50 / 1.49 | 39.3% | 2.88 | 20.1% | 16.6% | 9.7% | 0.09 | 4.83 | 18.5% | 0 |

### easy-vs-hard

| Point | A win % | Pts/round A / B | Knocks/round | Charms banked A / B | Contested % | Wasted/round | Close % | Comeback % | Top Heat | Heat drops/crew | Lead changes | Heat pts % | Stuck |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| tuning.heatThresholds=[2,4,7] | 9.2% [6.8%, 12.3%] | 1644.8 / 2357.0 | 0.89 | 0.82 / 2.18 | 42.0% | 4.56 | 16.1% | 12.7% | 56.6% | 0.49 | 3.73 | 34.6% | 0 |
| tuning.heatThresholds=[3,6,10] | 10.0% [7.5%, 13.1%] | 1505.1 / 2256.2 | 0.87 | 0.82 / 2.18 | 41.9% | 4.56 | 12.0% | 11.8% | 42.6% | 0.43 | 3.60 | 30.7% | 0 |
| tuning.heatThresholds=[3,7,12] | 8.6% [6.3%, 11.7%] | 1441.4 / 2196.8 | 0.88 | 0.82 / 2.18 | 42.0% | 4.56 | 10.9% | 10.7% | 33.9% | 0.44 | 3.61 | 28.7% | 0 |
| tuning.heatThresholds=[4,8,13] | 7.7% [5.5%, 10.6%] | 1383.0 / 2168.5 | 0.88 | 0.83 / 2.17 | 42.0% | 4.57 | 9.8% | 8.4% | 30.9% | 0.40 | 3.55 | 27.1% | 0 |
| tuning.heatThresholds=[4,9,15] | 6.4% [4.4%, 9.1%] | 1336.2 / 2134.8 | 0.89 | 0.82 / 2.18 | 42.0% | 4.58 | 10.7% | 7.6% | 26.2% | 0.40 | 3.47 | 25.8% | 0 |

### mixed

| Point | A win % | Pts/round A / B | Knocks/round | Charms banked A / B | Contested % | Wasted/round | Close % | Comeback % | Top Heat | Heat drops/crew | Lead changes | Heat pts % | Stuck |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| tuning.heatThresholds=[2,4,7] | 50.8% [46.4%, 55.2%] | 1134.9 / 1146.9 | 3.32 | 1.53 / 1.46 | 38.7% | 2.99 | 19.8% | 12.8% | 44.1% | 0.10 | 4.92 | 29.9% | 0 |
| tuning.heatThresholds=[3,6,10] | 51.6% [47.2%, 55.9%] | 1035.8 / 1049.2 | 3.37 | 1.53 / 1.47 | 38.8% | 2.97 | 21.3% | 16.3% | 25.9% | 0.09 | 4.99 | 24.2% | 0 |
| tuning.heatThresholds=[3,7,12] | 51.2% [46.8%, 55.6%] | 1002.9 / 1016.6 | 3.44 | 1.52 / 1.48 | 38.8% | 2.99 | 21.5% | 16.1% | 19.0% | 0.09 | 4.94 | 22.3% | 0 |
| tuning.heatThresholds=[4,8,13] | 50.0% [45.6%, 54.4%] | 956.6 / 973.2 | 3.53 | 1.53 / 1.47 | 38.8% | 2.97 | 23.1% | 17.3% | 12.6% | 0.08 | 4.88 | 19.1% | 0 |
| tuning.heatThresholds=[4,9,15] | 52.2% [47.8%, 56.5%] | 945.9 / 955.7 | 3.58 | 1.53 / 1.47 | 39.0% | 2.96 | 23.4% | 17.2% | 9.5% | 0.08 | 4.88 | 18.3% | 0 |

## Details: tuning.heatThresholds=[2,4,7]

### Scenarios

| Scenario | Matches / rounds | A round win % [95% CI] | Draws | Pts/round A / B | Served/round A / B | Knocks/round | Steal % | Contested % | Wasted/round | Close % | Comeback % | Lead changes/round | Burns/round | Stuck | Runaway |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 200 / 513 | 48.3% [44.0%, 52.7%] | 0 | 2001.4 / 2021.0 | 17.13 / 17.09 | 3.08 | 96.6% | 43.4% | 4.66 | 29.2% | 15.6% (80/513) | 6.94 | 0.94 | 0 | 0 |
| gap-2v2 | 200 / 479 | 72.2% [68.1%, 76.1%] | 0 | 2236.8 / 1946.3 | 18.64 / 16.66 | 3.24 | 96.0% | 42.7% | 4.82 | 29.4% | 18.6% (89/479) | 6.45 | 0.72 | 0 | 0 |
| even-1v1 | 200 / 518 | 50.6% [46.3%, 54.9%] | 0 | 1145.7 / 1156.4 | 9.42 / 9.38 | 3.74 | 97.6% | 39.2% | 2.88 | 22.0% | 13.9% (72/517) | 4.92 | 0.23 | 0 | 0 |
| easy-vs-hard | 200 / 434 | 9.2% [6.8%, 12.3%] | 0 | 1644.8 / 2357.0 | 14.56 / 19.64 | 0.89 | 95.6% | 42.0% | 4.56 | 16.1% | 12.7% (55/434) | 3.73 | 1.12 | 0 | 0 |
| mixed | 200 / 494 | 50.8% [46.4%, 55.2%] | 0 | 1134.9 / 1146.9 | 9.26 / 9.43 | 3.32 | 97.6% | 38.7% | 2.99 | 19.8% | 12.8% (63/492) | 4.92 | 0.23 | 0 | 0 |

### Recipes

| Recipe served rate (served / spawned) | even-2v2 | gap-2v2 | even-1v1 | easy-vs-hard | mixed |
| --- | --- | --- | --- | --- | --- |
| salad | 84.8% (4673/5513) | 86.5% (4433/5127) | 28.6% (1232/4305) | 84.3% (3863/4581) | 28.4% (1190/4184) |
| burger | 92.7% (5077/5477) | 93.9% (4928/5248) | 83.4% (3710/4449) | 92.9% (4376/4711) | 83.3% (3439/4127) |
| soup | 66.0% (2386/3616) | 67.5% (2411/3574) | 25.4% (745/2934) | 66.6% (2091/3141) | 25.5% (718/2817) |
| steak | 89.2% (2485/2786) | 89.1% (2321/2605) | 77.7% (1729/2226) | 88.4% (2068/2339) | 79.6% (1718/2159) |
| fish | 89.1% (2433/2731) | 90.0% (2351/2611) | 81.0% (1832/2263) | 89.8% (2021/2251) | 81.1% (1708/2105) |

### Context: tickets, waste, Critic, Heat

| Scenario | Tickets/round spawned · served · expired · left | Wasted/round cold · trashed · left | Critic A · B · unserved | Trailing crew wins Critic | Heat A t0/t1/t2/t3 | Heat B t0/t1/t2/t3 | Fires/round |
| --- | --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 39.2 · 33.2 · 2.3 · 3.7 | 3.50 · 0.00 · 1.15 | 240 · 263 · 10 | 55.7% (285/512) | 12/11/16/60 | 13/11/17/59 | 0.39 |
| gap-2v2 | 40.0 · 34.3 · 2.1 · 3.6 | 3.63 · 0.00 · 1.19 | 254 · 213 · 12 | 52.0% (249/479) | 12/10/13/66 | 14/11/17/58 | 0.27 |
| even-1v1 | 31.2 · 17.9 · 9.2 · 4.2 | 2.14 · 0.00 · 0.74 | 238 · 251 · 29 | 55.0% (284/516) | 18/16/22/44 | 18/15/22/44 | 0.04 |
| easy-vs-hard | 39.2 · 33.2 · 2.4 · 3.6 | 3.42 · 0.00 · 1.14 | 231 · 193 · 10 | 53.9% (234/434) | 18/14/23/45 | 10/9/13/68 | 0.67 |
| mixed | 31.2 · 17.8 · 9.2 · 4.2 | 2.24 · 0.00 · 0.75 | 225 · 233 · 36 | 54.0% (266/493) | 18/16/22/44 | 18/15/23/44 | 0.05 |

### Charms

| Scenario | Charms/round spawned | Banked/round A / B | Faded/round | Knocks on charm carriers/round |
| --- | --- | --- | --- | --- |
| even-2v2 | 3.00 | 1.45 / 1.55 | 0.00 | 1.94 |
| gap-2v2 | 3.00 | 1.65 / 1.35 | 0.00 | 2.18 |
| even-1v1 | 3.00 | 1.52 / 1.47 | 0.01 | 2.97 |
| easy-vs-hard | 3.00 | 0.82 / 2.18 | 0.00 | 0.52 |
| mixed | 3.00 | 1.53 / 1.46 | 0.01 | 2.53 |

### Scoring economy: Heat, lead swings, points by source, waste by cause

| Scenario | Top-Heat share | Heat drops/crew/round | Lead changes/round | Comeback % | Points: base · Critic · Heat · rush · charm | Waste/round: cold sniped · cold slow · cold partial (no ticket) · cold partial (ticket) · trashed · left · burns · expired tickets |
| --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 59.9% | 0.45 | 6.94 | 15.6% | 45.9% · 3.7% · 35.1% · 11.7% · 3.7% | 1.35 · 0.61 · 0.97 · 0.58 · 0.00 · 1.15 · 0.94 · 2.33 |
| gap-2v2 | 61.6% | 0.34 | 6.45 | 18.6% | 45.7% · 3.5% · 35.5% · 11.7% · 3.6% | 1.32 · 0.68 · 1.03 · 0.60 · 0.00 · 1.19 · 0.72 · 2.09 |
| even-1v1 | 44.2% | 0.10 | 4.92 | 13.9% | 46.3% · 6.0% · 30.1% · 11.2% · 6.5% | 0.73 · 0.24 · 0.75 · 0.42 · 0.00 · 0.74 · 0.23 · 9.19 |
| easy-vs-hard | 56.6% | 0.49 | 3.73 | 12.7% | 46.2% · 3.7% · 34.6% · 11.7% · 3.7% | 1.15 · 0.64 · 0.99 · 0.65 · 0.00 · 1.14 · 1.12 · 2.43 |
| mixed | 44.1% | 0.10 | 4.92 | 12.8% | 46.4% · 5.9% · 29.9% · 11.2% · 6.6% | 0.77 · 0.19 · 0.79 · 0.50 · 0.00 · 0.75 · 0.23 · 9.25 |

### gap-2v2 calibration

Crew throughput: two normal bots at the given skill vs an empty kitchen, points per round. Baseline (normal, no skill override): **2289.4**.

| Skill | Points/round | vs baseline |
| --- | --- | --- |
| 0.50 | 2176.3 | 0.951× |
| 0.55 | 2167.0 | 0.947× |
| 0.60 | 2289.4 | 1.000× |
| 0.65 | 2323.3 | 1.015× |
| 0.70 | 2357.6 | 1.030× |
| 0.75 | 2446.5 | 1.069× |
| 0.80 | 2505.0 | 1.094× |
| 0.85 | 2557.2 | 1.117× |
| 0.90 | 2629.0 | 1.148× |
| 0.95 | 2615.8 | 1.143× |
| 1.00 | 2658.4 | 1.161× |

Chosen crew-A skill: **0.813** (≈1.100×). interpolated between skill 0.8 and 0.85.

### Stuck events

No stuck events.

## Details: tuning.heatThresholds=[3,6,10]

### Scenarios

| Scenario | Matches / rounds | A round win % [95% CI] | Draws | Pts/round A / B | Served/round A / B | Knocks/round | Steal % | Contested % | Wasted/round | Close % | Comeback % | Lead changes/round | Burns/round | Stuck | Runaway |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 200 / 515 | 49.1% [44.8%, 53.4%] | 0 | 1880.6 / 1891.7 | 17.16 / 17.10 | 3.01 | 96.8% | 43.3% | 4.65 | 26.8% | 15.3% (79/515) | 7.08 | 0.94 | 0 | 0 |
| gap-2v2 | 200 / 479 | 69.5% [65.3%, 73.5%] | 0 | 2089.8 / 1832.4 | 18.53 / 16.63 | 3.59 | 96.5% | 42.8% | 4.84 | 30.5% | 16.9% (81/479) | 6.59 | 0.74 | 0 | 0 |
| even-1v1 | 200 / 520 | 51.0% [46.7%, 55.2%] | 0 | 1054.3 / 1058.0 | 9.43 / 9.38 | 3.53 | 97.7% | 39.3% | 2.88 | 20.2% | 17.0% (88/519) | 4.90 | 0.24 | 0 | 0 |
| easy-vs-hard | 200 / 432 | 10.0% [7.5%, 13.1%] | 0 | 1505.1 / 2256.2 | 14.56 / 19.65 | 0.87 | 95.5% | 41.9% | 4.56 | 12.0% | 11.8% (51/431) | 3.60 | 1.10 | 0 | 0 |
| mixed | 200 / 503 | 51.6% [47.2%, 55.9%] | 1 | 1035.8 / 1049.2 | 9.25 / 9.44 | 3.37 | 97.6% | 38.8% | 2.97 | 21.3% | 16.3% (82/502) | 4.99 | 0.23 | 0 | 0 |

### Recipes

| Recipe served rate (served / spawned) | even-2v2 | gap-2v2 | even-1v1 | easy-vs-hard | mixed |
| --- | --- | --- | --- | --- | --- |
| salad | 84.8% (4700/5540) | 85.9% (4416/5139) | 28.7% (1241/4317) | 84.3% (3841/4555) | 28.6% (1217/4251) |
| burger | 92.9% (5101/5493) | 93.6% (4914/5249) | 83.4% (3725/4464) | 92.9% (4351/4682) | 83.2% (3507/4214) |
| soup | 66.0% (2398/3634) | 67.1% (2385/3553) | 25.4% (751/2951) | 66.7% (2091/3134) | 25.3% (728/2873) |
| steak | 89.2% (2490/2793) | 90.1% (2296/2547) | 77.8% (1732/2227) | 88.6% (2067/2333) | 79.6% (1752/2200) |
| fish | 89.0% (2448/2752) | 89.7% (2361/2631) | 80.9% (1845/2281) | 89.7% (2011/2243) | 80.9% (1730/2138) |

### Context: tickets, waste, Critic, Heat

| Scenario | Tickets/round spawned · served · expired · left | Wasted/round cold · trashed · left | Critic A · B · unserved | Trailing crew wins Critic | Heat A t0/t1/t2/t3 | Heat B t0/t1/t2/t3 | Fires/round |
| --- | --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 39.2 · 33.3 · 2.3 · 3.6 | 3.51 · 0.00 · 1.14 | 245 · 259 · 11 | 55.3% (285/515) | 18/16/22/44 | 19/16/22/44 | 0.40 |
| gap-2v2 | 39.9 · 34.2 · 2.2 · 3.5 | 3.70 · 0.00 · 1.14 | 222 · 249 · 8 | 59.3% (284/479) | 16/14/18/51 | 20/16/22/42 | 0.25 |
| even-1v1 | 31.2 · 17.9 · 9.2 · 4.2 | 2.15 · 0.00 · 0.73 | 236 · 255 · 29 | 56.2% (291/518) | 26/20/26/27 | 26/21/27/26 | 0.04 |
| easy-vs-hard | 39.2 · 33.2 · 2.4 · 3.6 | 3.42 · 0.00 · 1.14 | 230 · 190 · 12 | 54.4% (235/432) | 26/21/25/28 | 15/13/16/57 | 0.66 |
| mixed | 31.2 · 17.8 · 9.2 · 4.2 | 2.23 · 0.00 · 0.74 | 230 · 237 · 36 | 55.1% (277/503) | 26/21/27/26 | 26/21/27/26 | 0.05 |

### Charms

| Scenario | Charms/round spawned | Banked/round A / B | Faded/round | Knocks on charm carriers/round |
| --- | --- | --- | --- | --- |
| even-2v2 | 3.00 | 1.44 / 1.56 | 0.00 | 2.01 |
| gap-2v2 | 3.00 | 1.62 / 1.38 | 0.00 | 2.17 |
| even-1v1 | 3.00 | 1.52 / 1.47 | 0.01 | 2.82 |
| easy-vs-hard | 3.00 | 0.82 / 2.18 | 0.00 | 0.51 |
| mixed | 3.00 | 1.53 / 1.47 | 0.01 | 2.61 |

### Scoring economy: Heat, lead swings, points by source, waste by cause

| Scenario | Top-Heat share | Heat drops/crew/round | Lead changes/round | Comeback % | Points: base · Critic · Heat · rush · charm | Waste/round: cold sniped · cold slow · cold partial (no ticket) · cold partial (ticket) · trashed · left · burns · expired tickets |
| --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 44.1% | 0.43 | 7.08 | 15.3% | 48.9% · 3.9% · 30.9% · 12.3% · 4.0% | 1.34 · 0.62 · 0.98 · 0.57 · 0.00 · 1.14 · 0.94 · 2.34 |
| gap-2v2 | 46.5% | 0.32 | 6.59 | 16.9% | 48.6% · 3.8% · 31.5% · 12.3% · 3.8% | 1.38 · 0.66 · 1.08 · 0.59 · 0.00 · 1.14 · 0.74 · 2.21 |
| even-1v1 | 26.4% | 0.10 | 4.90 | 17.0% | 50.5% · 6.5% · 24.4% · 11.5% · 7.1% | 0.72 · 0.24 · 0.76 · 0.42 · 0.00 · 0.73 · 0.24 · 9.19 |
| easy-vs-hard | 42.6% | 0.43 | 3.60 | 11.8% | 49.1% · 3.9% · 30.7% · 12.3% · 4.0% | 1.13 · 0.63 · 1.00 · 0.65 · 0.00 · 1.14 · 1.10 · 2.43 |
| mixed | 25.9% | 0.09 | 4.99 | 16.3% | 50.8% · 6.4% · 24.2% · 11.5% · 7.2% | 0.78 · 0.18 · 0.78 · 0.50 · 0.00 · 0.74 · 0.23 · 9.24 |

### gap-2v2 calibration

Crew throughput: two normal bots at the given skill vs an empty kitchen, points per round. Baseline (normal, no skill override): **2202.6**.

| Skill | Points/round | vs baseline |
| --- | --- | --- |
| 0.50 | 2085.9 | 0.947× |
| 0.55 | 2082.5 | 0.945× |
| 0.60 | 2202.6 | 1.000× |
| 0.65 | 2240.3 | 1.017× |
| 0.70 | 2275.9 | 1.033× |
| 0.75 | 2366.3 | 1.074× |
| 0.80 | 2429.1 | 1.103× |
| 0.85 | 2480.9 | 1.126× |
| 0.90 | 2549.3 | 1.157× |
| 0.95 | 2543.0 | 1.155× |
| 1.00 | 2585.2 | 1.174× |

Chosen crew-A skill: **0.795** (≈1.100×). interpolated between skill 0.75 and 0.8.

### Stuck events

No stuck events.

## Details: tuning.heatThresholds=[3,7,12]

### Scenarios

| Scenario | Matches / rounds | A round win % [95% CI] | Draws | Pts/round A / B | Served/round A / B | Knocks/round | Steal % | Contested % | Wasted/round | Close % | Comeback % | Lead changes/round | Burns/round | Stuck | Runaway |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 200 / 515 | 50.1% [45.8%, 54.4%] | 0 | 1819.5 / 1843.9 | 17.16 / 17.10 | 3.05 | 96.6% | 43.3% | 4.62 | 24.5% | 14.2% (73/514) | 6.97 | 0.93 | 0 | 0 |
| gap-2v2 | 200 / 492 | 69.3% [65.1%, 73.2%] | 0 | 2047.0 / 1769.2 | 18.44 / 16.63 | 3.21 | 96.5% | 43.3% | 4.98 | 25.0% | 14.2% (70/492) | 6.30 | 0.75 | 0 | 0 |
| even-1v1 | 200 / 514 | 51.2% [46.9%, 55.5%] | 0 | 1022.4 / 1023.4 | 9.44 / 9.38 | 3.52 | 97.6% | 39.2% | 2.90 | 20.2% | 17.9% (92/514) | 4.82 | 0.24 | 0 | 0 |
| easy-vs-hard | 200 / 430 | 8.6% [6.3%, 11.7%] | 1 | 1441.4 / 2196.8 | 14.57 / 19.65 | 0.88 | 95.5% | 42.0% | 4.56 | 10.9% | 10.7% (46/430) | 3.61 | 1.13 | 0 | 0 |
| mixed | 200 / 498 | 51.2% [46.8%, 55.6%] | 0 | 1002.9 / 1016.6 | 9.25 / 9.44 | 3.44 | 97.7% | 38.8% | 2.99 | 21.5% | 16.1% (80/497) | 4.94 | 0.23 | 0 | 0 |

### Recipes

| Recipe served rate (served / spawned) | even-2v2 | gap-2v2 | even-1v1 | easy-vs-hard | mixed |
| --- | --- | --- | --- | --- | --- |
| salad | 84.9% (4699/5534) | 85.0% (4525/5321) | 28.8% (1232/4273) | 84.4% (3831/4541) | 28.8% (1211/4212) |
| burger | 92.9% (5108/5497) | 93.8% (4983/5315) | 83.3% (3679/4419) | 92.9% (4340/4672) | 83.4% (3473/4166) |
| soup | 66.2% (2412/3643) | 67.6% (2483/3674) | 25.5% (739/2899) | 66.5% (2072/3114) | 25.4% (722/2847) |
| steak | 89.0% (2482/2789) | 89.6% (2405/2683) | 77.7% (1708/2198) | 88.5% (2051/2317) | 79.2% (1718/2169) |
| fish | 89.0% (2437/2737) | 90.4% (2376/2628) | 81.0% (1829/2257) | 89.7% (2000/2229) | 80.8% (1718/2126) |

### Context: tickets, waste, Critic, Heat

| Scenario | Tickets/round spawned · served · expired · left | Wasted/round cold · trashed · left | Critic A · B · unserved | Trailing crew wins Critic | Heat A t0/t1/t2/t3 | Heat B t0/t1/t2/t3 | Fires/round |
| --- | --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 39.2 · 33.3 · 2.3 · 3.6 | 3.49 · 0.00 · 1.13 | 241 · 262 · 12 | 55.6% (286/514) | 18/20/26/36 | 19/19/25/37 | 0.40 |
| gap-2v2 | 39.9 · 34.1 · 2.2 · 3.6 | 3.75 · 0.00 · 1.23 | 263 · 220 · 9 | 51.4% (253/492) | 16/17/25/42 | 20/20/25/35 | 0.29 |
| even-1v1 | 31.2 · 17.9 · 9.2 · 4.2 | 2.16 · 0.00 · 0.74 | 233 · 252 · 29 | 55.6% (285/513) | 26/24/30/20 | 26/24/31/18 | 0.04 |
| easy-vs-hard | 39.2 · 33.2 · 2.4 · 3.6 | 3.41 · 0.00 · 1.14 | 232 · 187 · 11 | 54.2% (233/430) | 27/27/26/20 | 15/15/22/48 | 0.67 |
| mixed | 31.2 · 17.8 · 9.3 · 4.2 | 2.24 · 0.00 · 0.74 | 231 · 231 · 36 | 55.2% (275/498) | 26/25/30/19 | 26/25/30/19 | 0.05 |

### Charms

| Scenario | Charms/round spawned | Banked/round A / B | Faded/round | Knocks on charm carriers/round |
| --- | --- | --- | --- | --- |
| even-2v2 | 3.00 | 1.44 / 1.56 | 0.00 | 2.01 |
| gap-2v2 | 3.00 | 1.64 / 1.36 | 0.00 | 1.97 |
| even-1v1 | 3.00 | 1.52 / 1.47 | 0.01 | 2.81 |
| easy-vs-hard | 3.00 | 0.82 / 2.18 | 0.00 | 0.50 |
| mixed | 3.00 | 1.52 / 1.48 | 0.01 | 2.69 |

### Scoring economy: Heat, lead swings, points by source, waste by cause

| Scenario | Top-Heat share | Heat drops/crew/round | Lead changes/round | Comeback % | Points: base · Critic · Heat · rush · charm | Waste/round: cold sniped · cold slow · cold partial (no ticket) · cold partial (ticket) · trashed · left · burns · expired tickets |
| --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 36.4% | 0.42 | 6.97 | 14.2% | 50.4% · 4.0% · 29.1% · 12.4% · 4.1% | 1.35 · 0.61 · 0.96 · 0.57 · 0.00 · 1.13 · 0.93 · 2.33 |
| gap-2v2 | 38.6% | 0.33 | 6.30 | 14.2% | 49.9% · 3.9% · 29.8% · 12.5% · 3.9% | 1.38 · 0.67 · 1.09 · 0.61 · 0.00 · 1.23 · 0.75 · 2.21 |
| even-1v1 | 19.0% | 0.09 | 4.82 | 17.9% | 52.1% · 6.7% · 22.5% · 11.3% · 7.3% | 0.73 · 0.24 · 0.76 · 0.43 · 0.00 · 0.74 · 0.24 · 9.17 |
| easy-vs-hard | 33.9% | 0.44 | 3.61 | 10.7% | 50.8% · 4.1% · 28.7% · 12.3% · 4.1% | 1.15 · 0.63 · 0.99 · 0.65 · 0.00 · 1.14 · 1.13 · 2.43 |
| mixed | 19.0% | 0.09 | 4.94 | 16.1% | 52.4% · 6.6% · 22.3% · 11.3% · 7.4% | 0.77 · 0.18 · 0.79 · 0.51 · 0.00 · 0.74 · 0.23 · 9.26 |

### gap-2v2 calibration

Crew throughput: two normal bots at the given skill vs an empty kitchen, points per round. Baseline (normal, no skill override): **2156.2**.

| Skill | Points/round | vs baseline |
| --- | --- | --- |
| 0.50 | 2046.6 | 0.949× |
| 0.55 | 2030.0 | 0.941× |
| 0.60 | 2156.2 | 1.000× |
| 0.65 | 2195.7 | 1.018× |
| 0.70 | 2225.3 | 1.032× |
| 0.75 | 2322.3 | 1.077× |
| 0.80 | 2371.9 | 1.100× |
| 0.85 | 2427.8 | 1.126× |
| 0.90 | 2491.0 | 1.155× |
| 0.95 | 2489.1 | 1.154× |
| 1.00 | 2529.3 | 1.173× |

Chosen crew-A skill: **0.800** (≈1.100×). interpolated between skill 0.75 and 0.8.

### Stuck events

No stuck events.

## Details: tuning.heatThresholds=[4,8,13]

### Scenarios

| Scenario | Matches / rounds | A round win % [95% CI] | Draws | Pts/round A / B | Served/round A / B | Knocks/round | Steal % | Contested % | Wasted/round | Close % | Comeback % | Lead changes/round | Burns/round | Stuck | Runaway |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 200 / 518 | 49.1% [44.8%, 53.4%] | 1 | 1772.6 / 1794.8 | 17.15 / 17.08 | 3.08 | 96.6% | 43.4% | 4.63 | 22.8% | 13.9% (72/518) | 6.77 | 0.93 | 0 | 0 |
| gap-2v2 | 200 / 474 | 72.1% [67.9%, 75.9%] | 1 | 2012.9 / 1731.4 | 18.54 / 16.66 | 3.38 | 97.6% | 43.1% | 4.75 | 24.1% | 18.7% (88/471) | 6.79 | 0.70 | 0 | 0 |
| even-1v1 | 200 / 517 | 50.7% [46.4%, 55.0%] | 0 | 971.9 / 973.6 | 9.45 / 9.35 | 3.56 | 97.7% | 39.2% | 2.88 | 19.9% | 17.4% (90/517) | 4.84 | 0.24 | 0 | 0 |
| easy-vs-hard | 200 / 428 | 7.7% [5.5%, 10.6%] | 0 | 1383.0 / 2168.5 | 14.55 / 19.65 | 0.88 | 95.5% | 42.0% | 4.57 | 9.8% | 8.4% (36/428) | 3.55 | 1.13 | 0 | 0 |
| mixed | 200 / 503 | 50.0% [45.6%, 54.4%] | 1 | 956.6 / 973.2 | 9.26 / 9.44 | 3.53 | 97.7% | 38.8% | 2.97 | 23.1% | 17.3% (87/503) | 4.88 | 0.23 | 0 | 0 |

### Recipes

| Recipe served rate (served / spawned) | even-2v2 | gap-2v2 | even-1v1 | easy-vs-hard | mixed |
| --- | --- | --- | --- | --- | --- |
| salad | 84.8% (4708/5554) | 85.6% (4361/5093) | 28.7% (1233/4302) | 84.3% (3801/4510) | 28.6% (1211/4236) |
| burger | 92.9% (5137/5529) | 93.9% (4823/5139) | 83.3% (3691/4430) | 92.9% (4326/4657) | 83.1% (3513/4225) |
| soup | 66.3% (2432/3667) | 68.6% (2432/3545) | 25.7% (751/2924) | 66.4% (2056/3098) | 25.2% (723/2868) |
| steak | 89.2% (2496/2799) | 89.1% (2273/2551) | 77.6% (1722/2219) | 88.5% (2042/2308) | 79.5% (1744/2194) |
| fish | 89.0% (2450/2754) | 90.3% (2329/2580) | 81.0% (1839/2269) | 89.6% (1993/2225) | 81.2% (1747/2152) |

### Context: tickets, waste, Critic, Heat

| Scenario | Tickets/round spawned · served · expired · left | Wasted/round cold · trashed · left | Critic A · B · unserved | Trailing crew wins Critic | Heat A t0/t1/t2/t3 | Heat B t0/t1/t2/t3 | Fires/round |
| --- | --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 39.2 · 33.2 · 2.3 · 3.6 | 3.50 · 0.00 · 1.13 | 244 · 263 · 11 | 55.1% (285/517) | 24/18/24/33 | 25/18/24/33 | 0.39 |
| gap-2v2 | 39.9 · 34.2 · 2.1 · 3.6 | 3.59 · 0.00 · 1.16 | 226 · 238 · 10 | 54.9% (260/474) | 21/15/22/41 | 26/19/24/31 | 0.26 |
| even-1v1 | 31.2 · 17.9 · 9.2 · 4.2 | 2.14 · 0.00 · 0.74 | 229 · 257 · 31 | 54.5% (281/516) | 34/26/28/13 | 33/27/28/12 | 0.04 |
| easy-vs-hard | 39.2 · 33.2 · 2.4 · 3.6 | 3.42 · 0.00 · 1.15 | 227 · 190 · 11 | 53.3% (228/428) | 34/25/24/16 | 19/13/22/46 | 0.67 |
| mixed | 31.2 · 17.8 · 9.3 · 4.1 | 2.23 · 0.00 · 0.74 | 228 · 239 · 36 | 53.7% (269/501) | 33/27/27/12 | 33/28/27/13 | 0.05 |

### Charms

| Scenario | Charms/round spawned | Banked/round A / B | Faded/round | Knocks on charm carriers/round |
| --- | --- | --- | --- | --- |
| even-2v2 | 3.00 | 1.45 / 1.55 | 0.00 | 1.98 |
| gap-2v2 | 3.00 | 1.69 / 1.31 | 0.00 | 2.15 |
| even-1v1 | 3.00 | 1.51 / 1.48 | 0.01 | 2.82 |
| easy-vs-hard | 3.00 | 0.83 / 2.17 | 0.00 | 0.50 |
| mixed | 3.00 | 1.53 / 1.47 | 0.01 | 2.78 |

### Scoring economy: Heat, lead swings, points by source, waste by cause

| Scenario | Top-Heat share | Heat drops/crew/round | Lead changes/round | Comeback % | Points: base · Critic · Heat · rush · charm | Waste/round: cold sniped · cold slow · cold partial (no ticket) · cold partial (ticket) · trashed · left · burns · expired tickets |
| --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 33.4% | 0.39 | 6.77 | 13.9% | 51.7% · 4.1% · 27.4% · 12.6% · 4.2% | 1.35 · 0.62 · 0.97 · 0.57 · 0.00 · 1.13 · 0.93 · 2.33 |
| gap-2v2 | 36.3% | 0.29 | 6.79 | 18.7% | 51.0% · 4.0% · 28.5% · 12.6% · 4.0% | 1.30 · 0.70 · 1.01 · 0.59 · 0.00 · 1.16 · 0.70 · 2.10 |
| even-1v1 | 12.3% | 0.09 | 4.84 | 17.4% | 54.7% · 7.1% · 19.2% · 11.3% · 7.7% | 0.73 · 0.24 · 0.75 · 0.42 · 0.00 · 0.74 · 0.24 · 9.18 |
| easy-vs-hard | 30.9% | 0.40 | 3.55 | 8.4% | 52.0% · 4.2% · 27.1% · 12.5% · 4.2% | 1.15 · 0.64 · 0.99 · 0.64 · 0.00 · 1.15 · 1.13 · 2.44 |
| mixed | 12.6% | 0.08 | 4.88 | 17.3% | 55.0% · 6.9% · 19.1% · 11.3% · 7.8% | 0.76 · 0.18 · 0.78 · 0.51 · 0.00 · 0.74 · 0.23 · 9.25 |

### gap-2v2 calibration

Crew throughput: two normal bots at the given skill vs an empty kitchen, points per round. Baseline (normal, no skill override): **2126.0**.

| Skill | Points/round | vs baseline |
| --- | --- | --- |
| 0.50 | 2021.1 | 0.951× |
| 0.55 | 2010.4 | 0.946× |
| 0.60 | 2126.0 | 1.000× |
| 0.65 | 2166.4 | 1.019× |
| 0.70 | 2191.4 | 1.031× |
| 0.75 | 2278.8 | 1.072× |
| 0.80 | 2335.9 | 1.099× |
| 0.85 | 2384.2 | 1.121× |
| 0.90 | 2451.3 | 1.153× |
| 0.95 | 2446.6 | 1.151× |
| 1.00 | 2485.8 | 1.169× |

Chosen crew-A skill: **0.803** (≈1.100×). interpolated between skill 0.8 and 0.85.

### Stuck events

No stuck events.

## Details: tuning.heatThresholds=[4,9,15]

### Scenarios

| Scenario | Matches / rounds | A round win % [95% CI] | Draws | Pts/round A / B | Served/round A / B | Knocks/round | Steal % | Contested % | Wasted/round | Close % | Comeback % | Lead changes/round | Burns/round | Stuck | Runaway |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 200 / 507 | 50.1% [45.8%, 54.4%] | 0 | 1730.0 / 1740.9 | 17.17 / 17.06 | 3.08 | 96.7% | 43.3% | 4.66 | 23.7% | 14.8% (75/506) | 6.73 | 0.92 | 0 | 0 |
| gap-2v2 | 200 / 468 | 72.9% [68.7%, 76.7%] | 0 | 1998.0 / 1679.2 | 18.66 / 16.64 | 3.44 | 96.8% | 42.5% | 4.78 | 22.4% | 16.2% (76/468) | 6.44 | 0.74 | 0 | 0 |
| even-1v1 | 200 / 512 | 48.4% [44.1%, 52.8%] | 0 | 956.5 / 963.9 | 9.44 / 9.37 | 3.44 | 97.6% | 39.3% | 2.88 | 20.1% | 16.6% (85/512) | 4.83 | 0.25 | 0 | 0 |
| easy-vs-hard | 200 / 422 | 6.4% [4.4%, 9.1%] | 0 | 1336.2 / 2134.8 | 14.55 / 19.64 | 0.89 | 95.2% | 42.0% | 4.58 | 10.7% | 7.6% (32/422) | 3.47 | 1.12 | 0 | 0 |
| mixed | 200 / 501 | 52.2% [47.8%, 56.5%] | 1 | 945.9 / 955.7 | 9.26 / 9.44 | 3.58 | 97.7% | 39.0% | 2.96 | 23.4% | 17.2% (86/501) | 4.88 | 0.22 | 0 | 0 |

### Recipes

| Recipe served rate (served / spawned) | even-2v2 | gap-2v2 | even-1v1 | easy-vs-hard | mixed |
| --- | --- | --- | --- | --- | --- |
| salad | 85.0% (4635/5453) | 86.1% (4303/4997) | 28.6% (1221/4276) | 84.3% (3748/4446) | 28.4% (1197/4210) |
| burger | 92.9% (5014/5399) | 94.3% (4809/5097) | 83.4% (3654/4383) | 92.8% (4257/4587) | 83.2% (3506/4213) |
| soup | 66.1% (2374/3589) | 67.7% (2375/3507) | 25.9% (749/2893) | 66.4% (2027/3055) | 25.1% (719/2862) |
| steak | 89.2% (2441/2737) | 88.6% (2231/2519) | 77.6% (1705/2197) | 88.5% (2018/2280) | 79.7% (1740/2183) |
| fish | 88.8% (2390/2690) | 90.3% (2344/2596) | 81.0% (1818/2244) | 89.6% (1962/2189) | 81.2% (1741/2144) |

### Context: tickets, waste, Critic, Heat

| Scenario | Tickets/round spawned · served · expired · left | Wasted/round cold · trashed · left | Critic A · B · unserved | Trailing crew wins Critic | Heat A t0/t1/t2/t3 | Heat B t0/t1/t2/t3 | Fires/round |
| --- | --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 39.2 · 33.2 · 2.3 · 3.6 | 3.52 · 0.00 · 1.14 | 246 · 251 · 10 | 54.5% (276/506) | 25/22/26/28 | 25/21/26/28 | 0.39 |
| gap-2v2 | 40.0 · 34.3 · 2.2 · 3.5 | 3.67 · 0.00 · 1.11 | 220 · 241 · 7 | 54.5% (254/466) | 22/18/24/37 | 26/23/26/24 | 0.30 |
| even-1v1 | 31.2 · 17.9 · 9.2 · 4.2 | 2.14 · 0.00 · 0.74 | 229 · 252 · 31 | 54.4% (278/511) | 34/28/27/10 | 34/30/27/9 | 0.04 |
| easy-vs-hard | 39.2 · 33.2 · 2.4 · 3.6 | 3.43 · 0.00 · 1.15 | 229 · 183 · 10 | 54.3% (229/422) | 35/30/24/10 | 19/15/24/42 | 0.66 |
| mixed | 31.2 · 17.8 · 9.2 · 4.1 | 2.22 · 0.00 · 0.74 | 228 · 236 · 37 | 53.9% (269/499) | 33/30/27/10 | 33/31/27/9 | 0.04 |

### Charms

| Scenario | Charms/round spawned | Banked/round A / B | Faded/round | Knocks on charm carriers/round |
| --- | --- | --- | --- | --- |
| even-2v2 | 3.00 | 1.45 / 1.55 | 0.00 | 1.98 |
| gap-2v2 | 3.00 | 1.72 / 1.28 | 0.00 | 2.08 |
| even-1v1 | 3.00 | 1.50 / 1.49 | 0.01 | 2.71 |
| easy-vs-hard | 3.00 | 0.82 / 2.18 | 0.00 | 0.51 |
| mixed | 3.00 | 1.53 / 1.47 | 0.01 | 2.81 |

### Scoring economy: Heat, lead swings, points by source, waste by cause

| Scenario | Top-Heat share | Heat drops/crew/round | Lead changes/round | Comeback % | Points: base · Critic · Heat · rush · charm | Waste/round: cold sniped · cold slow · cold partial (no ticket) · cold partial (ticket) · trashed · left · burns · expired tickets |
| --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 27.5% | 0.38 | 6.73 | 14.8% | 53.1% · 4.2% · 25.8% · 12.5% · 4.3% | 1.36 · 0.63 · 0.97 · 0.57 · 0.00 · 1.14 · 0.92 · 2.32 |
| gap-2v2 | 30.5% | 0.30 | 6.44 | 16.2% | 52.2% · 4.0% · 27.0% · 12.7% · 4.1% | 1.24 · 0.68 · 1.11 · 0.64 · 0.00 · 1.11 · 0.74 · 2.18 |
| even-1v1 | 9.7% | 0.09 | 4.83 | 16.6% | 55.5% · 7.1% · 18.5% · 11.1% · 7.8% | 0.73 · 0.24 · 0.75 · 0.42 · 0.00 · 0.74 · 0.25 · 9.19 |
| easy-vs-hard | 26.2% | 0.40 | 3.47 | 7.6% | 53.2% · 4.3% · 25.8% · 12.4% · 4.3% | 1.16 · 0.64 · 0.99 · 0.64 · 0.00 · 1.15 · 1.12 · 2.45 |
| mixed | 9.5% | 0.08 | 4.88 | 17.2% | 55.8% · 7.0% · 18.3% · 11.0% · 7.9% | 0.77 · 0.19 · 0.78 · 0.49 · 0.00 · 0.74 · 0.22 · 9.24 |

### gap-2v2 calibration

Crew throughput: two normal bots at the given skill vs an empty kitchen, points per round. Baseline (normal, no skill override): **2116.7**.

| Skill | Points/round | vs baseline |
| --- | --- | --- |
| 0.50 | 2009.0 | 0.949× |
| 0.55 | 1996.5 | 0.943× |
| 0.60 | 2116.7 | 1.000× |
| 0.65 | 2157.8 | 1.019× |
| 0.70 | 2181.1 | 1.030× |
| 0.75 | 2261.7 | 1.069× |
| 0.80 | 2320.2 | 1.096× |
| 0.85 | 2374.9 | 1.122× |
| 0.90 | 2441.3 | 1.153× |
| 0.95 | 2429.3 | 1.148× |
| 1.00 | 2462.3 | 1.163× |

Chosen crew-A skill: **0.807** (≈1.100×). interpolated between skill 0.8 and 0.85.

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
| Sweep | tuning.heatThresholds = [2,4,7], [3,6,10], [3,7,12], [4,8,13], [4,9,15] |
| Stuck threshold | 10 s |
| Max ticks | 1.5 × longest possible match |
| Calibration | 40 crew-vs-empty matches × 12 skills, target 1.1× |
| Workers | 7 |
| Matches run | 7400 in 672.9 s (11.0 matches/s) |
| Commit | `8d85128` |

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
