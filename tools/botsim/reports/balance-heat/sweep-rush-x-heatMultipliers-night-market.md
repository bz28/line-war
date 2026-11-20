# Botsim balance report

## Pass bars

From the design doc, validation step 4.

| Check | Target | tuning.rushMultiplier=1.5 tuning.heatMultipliers=[1,1.25,1.5,2] | tuning.rushMultiplier=1.5 tuning.heatMultipliers=[1,1.25,1.5,1.75] | tuning.rushMultiplier=1.75 tuning.heatMultipliers=[1,1.25,1.5,2] | tuning.rushMultiplier=1.75 tuning.heatMultipliers=[1,1.25,1.5,1.75] | tuning.rushMultiplier=2 tuning.heatMultipliers=[1,1.25,1.5,2] | tuning.rushMultiplier=2 tuning.heatMultipliers=[1,1.25,1.5,1.75] |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Bots never get stuck | 0 stuck events (all scenarios) | 0 ✅ PASS | 0 ✅ PASS | 0 ✅ PASS | 0 ✅ PASS | 0 ✅ PASS | 0 ✅ PASS |
| Knocks per round | 2–6 (even-2v2) | 3.08 ✅ PASS | 3.08 ✅ PASS | 3.06 ✅ PASS | 3.06 ✅ PASS | 3.06 ✅ PASS | 3.07 ✅ PASS |
| No recipe skipped twice as often as another | lowest served rate ≥ 0.5 × highest (even-2v2) | salad 84.8%, burger 92.9%, soup 66.3%, steak 89.2%, fish 89.0% ✅ PASS | salad 84.9%, burger 92.7%, soup 66.3%, steak 89.3%, fish 88.9% ✅ PASS | salad 84.8%, burger 92.9%, soup 66.3%, steak 89.1%, fish 89.0% ✅ PASS | salad 84.9%, burger 92.7%, soup 66.4%, steak 89.2%, fish 88.9% ✅ PASS | salad 84.8%, burger 92.9%, soup 66.3%, steak 89.1%, fish 88.9% ✅ PASS | salad 84.9%, burger 92.8%, soup 66.3%, steak 89.1%, fish 88.9% ✅ PASS |
| A 10% faster crew wins 65–80% of rounds | 65–80% (gap-2v2, crew A) | 72.1% [67.9%, 75.9%] ✅ PASS | 64.7% [60.4%, 68.9%] ❌ FAIL | 70.1% [65.9%, 74.0%] ✅ PASS | 68.3% [64.0%, 72.3%] ✅ PASS | 72.2% [68.0%, 76.0%] ✅ PASS | 71.5% [67.3%, 75.4%] ✅ PASS |

## Side bias

Even scenarios: crew A should win about 50% of decisive rounds.

| Check | Target | tuning.rushMultiplier=1.5 tuning.heatMultipliers=[1,1.25,1.5,2] | tuning.rushMultiplier=1.5 tuning.heatMultipliers=[1,1.25,1.5,1.75] | tuning.rushMultiplier=1.75 tuning.heatMultipliers=[1,1.25,1.5,2] | tuning.rushMultiplier=1.75 tuning.heatMultipliers=[1,1.25,1.5,1.75] | tuning.rushMultiplier=2 tuning.heatMultipliers=[1,1.25,1.5,2] | tuning.rushMultiplier=2 tuning.heatMultipliers=[1,1.25,1.5,1.75] |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Side bias, even-2v2 | 50% inside the 95% CI | 49.1% [44.8%, 53.4%] (517 decisive) ✅ PASS | 49.4% [45.1%, 53.7%] (516 decisive) ✅ PASS | 49.3% [45.0%, 53.6%] (515 decisive) ✅ PASS | 48.3% [44.1%, 52.7%] (515 decisive) ✅ PASS | 48.5% [44.3%, 52.9%] (517 decisive) ✅ PASS | 49.8% [45.5%, 54.1%] (516 decisive) ✅ PASS |
| Side bias, even-1v1 | 50% inside the 95% CI | 50.7% [46.4%, 55.0%] (517 decisive) ✅ PASS | 49.8% [45.5%, 54.1%] (518 decisive) ✅ PASS | 50.6% [46.3%, 54.9%] (516 decisive) ✅ PASS | 50.1% [45.8%, 54.4%] (517 decisive) ✅ PASS | 50.3% [46.0%, 54.6%] (515 decisive) ✅ PASS | 50.9% [46.6%, 55.1%] (519 decisive) ✅ PASS |
| Side bias, mixed | 50% inside the 95% CI | 50.0% [45.6%, 54.4%] (502 decisive) ✅ PASS | 51.0% [46.6%, 55.3%] (504 decisive) ✅ PASS | 50.1% [45.7%, 54.5%] (501 decisive) ✅ PASS | 51.0% [46.6%, 55.4%] (500 decisive) ✅ PASS | 49.7% [45.3%, 54.1%] (497 decisive) ✅ PASS | 49.6% [45.2%, 54.0%] (498 decisive) ✅ PASS |

## Sweep comparison

### even-2v2

| Point | A win % | Pts/round A / B | Knocks/round | Charms banked A / B | Contested % | Wasted/round | Close % | Comeback % | Top Heat | Heat drops/crew | Lead changes | Heat pts % | Stuck |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| tuning.rushMultiplier=1.5 tuning.heatMultipliers=[1,1.25,1.5,2] | 49.1% [44.8%, 53.4%] | 1772.6 / 1794.8 | 3.08 | 1.45 / 1.55 | 43.4% | 4.63 | 22.8% | 13.9% | 33.4% | 0.39 | 6.77 | 27.4% | 0 |
| tuning.rushMultiplier=1.5 tuning.heatMultipliers=[1,1.25,1.5,1.75] | 49.4% [45.1%, 53.7%] | 1670.2 / 1687.2 | 3.08 | 1.45 / 1.55 | 43.4% | 4.65 | 26.1% | 13.7% | 33.4% | 0.39 | 6.86 | 24.3% | 0 |
| tuning.rushMultiplier=1.75 tuning.heatMultipliers=[1,1.25,1.5,2] | 49.3% [45.0%, 53.6%] | 1886.4 / 1902.7 | 3.06 | 1.45 / 1.55 | 43.4% | 4.65 | 22.3% | 16.1% | 33.4% | 0.39 | 6.93 | 25.8% | 0 |
| tuning.rushMultiplier=1.75 tuning.heatMultipliers=[1,1.25,1.5,1.75] | 48.3% [44.1%, 52.7%] | 1773.0 / 1786.2 | 3.06 | 1.45 / 1.55 | 43.4% | 4.65 | 25.8% | 16.3% | 33.5% | 0.38 | 6.92 | 23.0% | 0 |
| tuning.rushMultiplier=2 tuning.heatMultipliers=[1,1.25,1.5,2] | 48.5% [44.3%, 52.9%] | 1999.4 / 2014.4 | 3.06 | 1.45 / 1.55 | 43.4% | 4.65 | 23.6% | 18.0% | 33.5% | 0.38 | 7.08 | 24.4% | 0 |
| tuning.rushMultiplier=2 tuning.heatMultipliers=[1,1.25,1.5,1.75] | 49.8% [45.5%, 54.1%] | 1874.5 / 1884.4 | 3.07 | 1.46 / 1.54 | 43.4% | 4.66 | 27.1% | 18.4% | 33.5% | 0.38 | 7.02 | 21.7% | 0 |

### gap-2v2

| Point | A win % | Pts/round A / B | Knocks/round | Charms banked A / B | Contested % | Wasted/round | Close % | Comeback % | Top Heat | Heat drops/crew | Lead changes | Heat pts % | Stuck |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| tuning.rushMultiplier=1.5 tuning.heatMultipliers=[1,1.25,1.5,2] | 72.1% [67.9%, 75.9%] | 2012.9 / 1731.4 | 3.38 | 1.69 / 1.31 | 43.1% | 4.75 | 24.1% | 18.7% | 36.3% | 0.29 | 6.79 | 28.5% | 0 |
| tuning.rushMultiplier=1.5 tuning.heatMultipliers=[1,1.25,1.5,1.75] | 64.7% [60.4%, 68.9%] | 1859.1 / 1632.9 | 3.58 | 1.69 / 1.31 | 42.9% | 4.95 | 25.2% | 15.7% | 35.4% | 0.31 | 6.54 | 24.9% | 0 |
| tuning.rushMultiplier=1.75 tuning.heatMultipliers=[1,1.25,1.5,2] | 70.1% [65.9%, 74.0%] | 2136.4 / 1863.2 | 3.11 | 1.65 / 1.35 | 42.9% | 4.79 | 24.6% | 16.2% | 36.2% | 0.30 | 6.56 | 26.7% | 0 |
| tuning.rushMultiplier=1.75 tuning.heatMultipliers=[1,1.25,1.5,1.75] | 68.3% [64.0%, 72.3%] | 1987.6 / 1710.8 | 3.20 | 1.62 / 1.38 | 43.0% | 4.98 | 27.2% | 17.3% | 35.9% | 0.31 | 6.46 | 23.6% | 0 |
| tuning.rushMultiplier=2 tuning.heatMultipliers=[1,1.25,1.5,2] | 72.2% [68.0%, 76.0%] | 2269.7 / 1937.2 | 3.35 | 1.76 / 1.24 | 43.1% | 4.99 | 25.1% | 19.1% | 35.9% | 0.28 | 6.63 | 25.1% | 0 |
| tuning.rushMultiplier=2 tuning.heatMultipliers=[1,1.25,1.5,1.75] | 71.5% [67.3%, 75.4%] | 2123.7 / 1826.6 | 3.27 | 1.71 / 1.29 | 42.9% | 4.93 | 29.1% | 18.3% | 36.2% | 0.28 | 6.56 | 22.4% | 0 |

### even-1v1

| Point | A win % | Pts/round A / B | Knocks/round | Charms banked A / B | Contested % | Wasted/round | Close % | Comeback % | Top Heat | Heat drops/crew | Lead changes | Heat pts % | Stuck |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| tuning.rushMultiplier=1.5 tuning.heatMultipliers=[1,1.25,1.5,2] | 50.7% [46.4%, 55.0%] | 971.9 / 973.6 | 3.56 | 1.51 / 1.48 | 39.2% | 2.88 | 19.9% | 17.4% | 12.3% | 0.09 | 4.84 | 19.2% | 0 |
| tuning.rushMultiplier=1.5 tuning.heatMultipliers=[1,1.25,1.5,1.75] | 49.8% [45.5%, 54.1%] | 950.5 / 952.1 | 3.56 | 1.52 / 1.48 | 39.2% | 2.88 | 20.8% | 15.8% | 12.4% | 0.09 | 4.84 | 18.0% | 0 |
| tuning.rushMultiplier=1.75 tuning.heatMultipliers=[1,1.25,1.5,2] | 50.6% [46.3%, 54.9%] | 1026.5 / 1029.5 | 3.45 | 1.51 / 1.48 | 39.3% | 2.89 | 19.9% | 19.3% | 12.3% | 0.09 | 4.97 | 18.2% | 0 |
| tuning.rushMultiplier=1.75 tuning.heatMultipliers=[1,1.25,1.5,1.75] | 50.1% [45.8%, 54.4%] | 1002.9 / 1004.7 | 3.56 | 1.52 / 1.47 | 39.2% | 2.88 | 21.6% | 17.2% | 12.4% | 0.09 | 4.97 | 17.1% | 0 |
| tuning.rushMultiplier=2 tuning.heatMultipliers=[1,1.25,1.5,2] | 50.3% [46.0%, 54.6%] | 1080.9 / 1084.7 | 3.51 | 1.51 / 1.49 | 39.4% | 2.88 | 20.9% | 21.5% | 12.3% | 0.09 | 5.05 | 17.3% | 0 |
| tuning.rushMultiplier=2 tuning.heatMultipliers=[1,1.25,1.5,1.75] | 50.9% [46.6%, 55.1%] | 1054.6 / 1054.9 | 3.64 | 1.51 / 1.48 | 39.2% | 2.88 | 23.9% | 19.7% | 12.4% | 0.09 | 5.06 | 16.3% | 0 |

### easy-vs-hard

| Point | A win % | Pts/round A / B | Knocks/round | Charms banked A / B | Contested % | Wasted/round | Close % | Comeback % | Top Heat | Heat drops/crew | Lead changes | Heat pts % | Stuck |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| tuning.rushMultiplier=1.5 tuning.heatMultipliers=[1,1.25,1.5,2] | 7.7% [5.5%, 10.6%] | 1383.0 / 2168.5 | 0.88 | 0.83 / 2.17 | 42.0% | 4.57 | 9.8% | 8.4% | 30.9% | 0.40 | 3.55 | 27.1% | 0 |
| tuning.rushMultiplier=1.5 tuning.heatMultipliers=[1,1.25,1.5,1.75] | 7.9% [5.7%, 10.9%] | 1337.3 / 2009.4 | 0.88 | 0.83 / 2.17 | 42.0% | 4.58 | 12.1% | 8.9% | 30.9% | 0.40 | 3.56 | 24.0% | 0 |
| tuning.rushMultiplier=1.75 tuning.heatMultipliers=[1,1.25,1.5,2] | 8.6% [6.3%, 11.6%] | 1469.5 / 2303.6 | 0.90 | 0.83 / 2.17 | 42.0% | 4.57 | 9.3% | 9.5% | 30.9% | 0.40 | 3.58 | 25.5% | 0 |
| tuning.rushMultiplier=1.75 tuning.heatMultipliers=[1,1.25,1.5,1.75] | 8.6% [6.3%, 11.6%] | 1421.2 / 2125.3 | 0.88 | 0.83 / 2.17 | 42.0% | 4.56 | 11.9% | 9.8% | 30.9% | 0.40 | 3.65 | 22.6% | 0 |
| tuning.rushMultiplier=2 tuning.heatMultipliers=[1,1.25,1.5,2] | 8.4% [6.1%, 11.4%] | 1558.5 / 2435.8 | 0.90 | 0.82 / 2.18 | 42.0% | 4.58 | 10.3% | 10.3% | 30.9% | 0.40 | 3.63 | 24.1% | 0 |
| tuning.rushMultiplier=2 tuning.heatMultipliers=[1,1.25,1.5,1.75] | 8.4% [6.1%, 11.4%] | 1503.3 / 2242.3 | 0.88 | 0.83 / 2.17 | 42.0% | 4.57 | 11.4% | 10.0% | 30.9% | 0.40 | 3.74 | 21.4% | 0 |

### mixed

| Point | A win % | Pts/round A / B | Knocks/round | Charms banked A / B | Contested % | Wasted/round | Close % | Comeback % | Top Heat | Heat drops/crew | Lead changes | Heat pts % | Stuck |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| tuning.rushMultiplier=1.5 tuning.heatMultipliers=[1,1.25,1.5,2] | 50.0% [45.6%, 54.4%] | 956.6 / 973.2 | 3.53 | 1.53 / 1.47 | 38.8% | 2.97 | 23.1% | 17.3% | 12.6% | 0.08 | 4.88 | 19.1% | 0 |
| tuning.rushMultiplier=1.5 tuning.heatMultipliers=[1,1.25,1.5,1.75] | 51.0% [46.6%, 55.3%] | 937.5 / 948.9 | 3.36 | 1.53 / 1.47 | 38.8% | 2.96 | 21.6% | 15.3% | 12.6% | 0.08 | 4.89 | 17.9% | 0 |
| tuning.rushMultiplier=1.75 tuning.heatMultipliers=[1,1.25,1.5,2] | 50.1% [45.7%, 54.5%] | 1009.1 / 1024.1 | 3.56 | 1.52 / 1.47 | 39.0% | 2.99 | 24.2% | 18.8% | 12.5% | 0.08 | 4.99 | 18.1% | 0 |
| tuning.rushMultiplier=1.75 tuning.heatMultipliers=[1,1.25,1.5,1.75] | 51.0% [46.6%, 55.4%] | 986.3 / 999.0 | 3.48 | 1.52 / 1.47 | 38.9% | 2.98 | 23.2% | 17.0% | 12.6% | 0.08 | 4.98 | 17.0% | 0 |
| tuning.rushMultiplier=2 tuning.heatMultipliers=[1,1.25,1.5,2] | 49.7% [45.3%, 54.1%] | 1062.2 / 1077.3 | 3.56 | 1.53 / 1.46 | 38.9% | 3.00 | 24.9% | 19.7% | 12.5% | 0.08 | 5.14 | 17.1% | 0 |
| tuning.rushMultiplier=2 tuning.heatMultipliers=[1,1.25,1.5,1.75] | 49.6% [45.2%, 54.0%] | 1035.7 / 1051.6 | 3.51 | 1.52 / 1.47 | 38.8% | 2.99 | 24.4% | 19.6% | 12.5% | 0.08 | 5.09 | 16.1% | 0 |

## Details: tuning.rushMultiplier=1.5 tuning.heatMultipliers=[1,1.25,1.5,2]

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

## Details: tuning.rushMultiplier=1.5 tuning.heatMultipliers=[1,1.25,1.5,1.75]

### Scenarios

| Scenario | Matches / rounds | A round win % [95% CI] | Draws | Pts/round A / B | Served/round A / B | Knocks/round | Steal % | Contested % | Wasted/round | Close % | Comeback % | Lead changes/round | Burns/round | Stuck | Runaway |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 200 / 518 | 49.4% [45.1%, 53.7%] | 2 | 1670.2 / 1687.2 | 17.15 / 17.07 | 3.08 | 96.6% | 43.4% | 4.65 | 26.1% | 13.7% (71/518) | 6.86 | 0.93 | 0 | 0 |
| gap-2v2 | 200 / 485 | 64.7% [60.4%, 68.9%] | 0 | 1859.1 / 1632.9 | 18.49 / 16.62 | 3.58 | 95.9% | 42.9% | 4.95 | 25.2% | 15.7% (76/485) | 6.54 | 0.76 | 0 | 0 |
| even-1v1 | 200 / 518 | 49.8% [45.5%, 54.1%] | 0 | 950.5 / 952.1 | 9.45 / 9.37 | 3.56 | 97.7% | 39.2% | 2.88 | 20.8% | 15.8% (82/518) | 4.84 | 0.23 | 0 | 0 |
| easy-vs-hard | 200 / 429 | 7.9% [5.7%, 10.9%] | 1 | 1337.3 / 2009.4 | 14.54 / 19.65 | 0.88 | 95.5% | 42.0% | 4.58 | 12.1% | 8.9% (38/428) | 3.56 | 1.12 | 0 | 0 |
| mixed | 200 / 504 | 51.0% [46.6%, 55.3%] | 0 | 937.5 / 948.9 | 9.27 / 9.44 | 3.36 | 97.6% | 38.8% | 2.96 | 21.6% | 15.3% (77/504) | 4.89 | 0.23 | 0 | 0 |

### Recipes

| Recipe served rate (served / spawned) | even-2v2 | gap-2v2 | even-1v1 | easy-vs-hard | mixed |
| --- | --- | --- | --- | --- | --- |
| salad | 84.9% (4723/5562) | 86.0% (4492/5224) | 28.7% (1235/4304) | 84.3% (3811/4521) | 28.6% (1215/4249) |
| burger | 92.7% (5117/5520) | 94.3% (4951/5248) | 83.3% (3705/4446) | 92.9% (4324/4656) | 83.3% (3521/4225) |
| soup | 66.3% (2433/3669) | 67.2% (2408/3584) | 25.6% (748/2925) | 66.4% (2064/3107) | 25.2% (726/2878) |
| steak | 89.3% (2498/2798) | 89.0% (2311/2598) | 77.7% (1732/2229) | 88.5% (2048/2314) | 79.6% (1752/2200) |
| fish | 88.9% (2448/2753) | 90.4% (2386/2640) | 80.9% (1839/2273) | 89.6% (2001/2233) | 81.2% (1748/2154) |

### Context: tickets, waste, Critic, Heat

| Scenario | Tickets/round spawned · served · expired · left | Wasted/round cold · trashed · left | Critic A · B · unserved | Trailing crew wins Critic | Heat A t0/t1/t2/t3 | Heat B t0/t1/t2/t3 | Fires/round |
| --- | --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 39.2 · 33.2 · 2.3 · 3.6 | 3.51 · 0.00 · 1.14 | 243 · 264 · 11 | 55.1% (285/517) | 24/18/24/33 | 25/18/24/33 | 0.39 |
| gap-2v2 | 39.8 · 34.1 · 2.2 · 3.5 | 3.78 · 0.01 · 1.16 | 241 · 240 · 4 | 53.9% (260/482) | 22/15/23/40 | 26/19/24/31 | 0.29 |
| even-1v1 | 31.2 · 17.9 · 9.2 · 4.2 | 2.14 · 0.00 · 0.74 | 233 · 255 · 30 | 54.5% (282/517) | 34/26/28/13 | 33/27/28/12 | 0.04 |
| easy-vs-hard | 39.2 · 33.2 · 2.4 · 3.6 | 3.42 · 0.00 · 1.15 | 227 · 191 · 11 | 53.4% (229/429) | 34/25/24/16 | 19/13/22/46 | 0.67 |
| mixed | 31.2 · 17.8 · 9.2 · 4.1 | 2.23 · 0.00 · 0.74 | 229 · 238 · 37 | 53.6% (269/502) | 33/27/27/13 | 33/28/27/13 | 0.05 |

### Charms

| Scenario | Charms/round spawned | Banked/round A / B | Faded/round | Knocks on charm carriers/round |
| --- | --- | --- | --- | --- |
| even-2v2 | 3.00 | 1.45 / 1.55 | 0.00 | 1.98 |
| gap-2v2 | 3.00 | 1.69 / 1.31 | 0.00 | 2.29 |
| even-1v1 | 3.00 | 1.52 / 1.48 | 0.01 | 2.84 |
| easy-vs-hard | 3.00 | 0.83 / 2.17 | 0.00 | 0.51 |
| mixed | 3.00 | 1.53 / 1.47 | 0.01 | 2.59 |

### Scoring economy: Heat, lead swings, points by source, waste by cause

| Scenario | Top-Heat share | Heat drops/crew/round | Lead changes/round | Comeback % | Points: base · Critic · Heat · rush · charm | Waste/round: cold sniped · cold slow · cold partial (no ticket) · cold partial (ticket) · trashed · left · burns · expired tickets |
| --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 33.4% | 0.39 | 6.86 | 13.7% | 54.9% · 4.4% · 24.3% · 12.0% · 4.5% | 1.34 · 0.62 · 0.98 · 0.57 · 0.00 · 1.14 · 0.93 · 2.32 |
| gap-2v2 | 35.4% | 0.31 | 6.54 | 15.7% | 54.5% · 4.3% · 24.9% · 12.1% · 4.3% | 1.31 · 0.75 · 1.11 · 0.61 · 0.01 · 1.16 · 0.76 · 2.21 |
| even-1v1 | 12.4% | 0.09 | 4.84 | 15.8% | 56.0% · 7.2% · 18.0% · 10.9% · 7.9% | 0.73 · 0.24 · 0.75 · 0.42 · 0.00 · 0.74 · 0.23 · 9.18 |
| easy-vs-hard | 30.9% | 0.40 | 3.56 | 8.9% | 55.2% · 4.4% · 24.0% · 11.9% · 4.5% | 1.15 · 0.64 · 0.99 · 0.64 · 0.00 · 1.15 · 1.12 · 2.44 |
| mixed | 12.6% | 0.08 | 4.89 | 15.3% | 56.2% · 7.1% · 17.9% · 10.8% · 7.9% | 0.77 · 0.18 · 0.78 · 0.50 · 0.00 · 0.74 · 0.23 · 9.24 |

### gap-2v2 calibration

Crew throughput: two normal bots at the given skill vs an empty kitchen, points per round. Baseline (normal, no skill override): **1965.8**.

| Skill | Points/round | vs baseline |
| --- | --- | --- |
| 0.50 | 1873.5 | 0.953× |
| 0.55 | 1865.8 | 0.949× |
| 0.60 | 1965.8 | 1.000× |
| 0.65 | 2001.8 | 1.018× |
| 0.70 | 2024.9 | 1.030× |
| 0.75 | 2104.7 | 1.071× |
| 0.80 | 2154.1 | 1.096× |
| 0.85 | 2197.4 | 1.118× |
| 0.90 | 2256.6 | 1.148× |
| 0.95 | 2249.9 | 1.145× |
| 1.00 | 2285.6 | 1.163× |

Chosen crew-A skill: **0.809** (≈1.100×). interpolated between skill 0.8 and 0.85.

### Stuck events

No stuck events.

## Details: tuning.rushMultiplier=1.75 tuning.heatMultipliers=[1,1.25,1.5,2]

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

## Details: tuning.rushMultiplier=1.75 tuning.heatMultipliers=[1,1.25,1.5,1.75]

### Scenarios

| Scenario | Matches / rounds | A round win % [95% CI] | Draws | Pts/round A / B | Served/round A / B | Knocks/round | Steal % | Contested % | Wasted/round | Close % | Comeback % | Lead changes/round | Burns/round | Stuck | Runaway |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 200 / 516 | 48.3% [44.1%, 52.7%] | 1 | 1773.0 / 1786.2 | 17.15 / 17.07 | 3.06 | 96.6% | 43.4% | 4.65 | 25.8% | 16.3% (84/516) | 6.92 | 0.92 | 0 | 0 |
| gap-2v2 | 200 / 486 | 68.3% [64.0%, 72.3%] | 0 | 1987.6 / 1710.8 | 18.51 / 16.64 | 3.20 | 96.0% | 43.0% | 4.98 | 27.2% | 17.3% (84/485) | 6.46 | 0.73 | 0 | 0 |
| even-1v1 | 200 / 518 | 50.1% [45.8%, 54.4%] | 1 | 1002.9 / 1004.7 | 9.44 / 9.37 | 3.56 | 97.7% | 39.2% | 2.88 | 21.6% | 17.2% (89/518) | 4.97 | 0.23 | 0 | 0 |
| easy-vs-hard | 200 / 430 | 8.6% [6.3%, 11.6%] | 0 | 1421.2 / 2125.3 | 14.55 / 19.64 | 0.88 | 95.5% | 42.0% | 4.56 | 11.9% | 9.8% (42/429) | 3.65 | 1.13 | 0 | 0 |
| mixed | 200 / 501 | 51.0% [46.6%, 55.4%] | 1 | 986.3 / 999.0 | 9.27 / 9.43 | 3.48 | 97.7% | 38.9% | 2.98 | 23.2% | 17.0% (85/501) | 4.98 | 0.23 | 0 | 0 |

### Recipes

| Recipe served rate (served / spawned) | even-2v2 | gap-2v2 | even-1v1 | easy-vs-hard | mixed |
| --- | --- | --- | --- | --- | --- |
| salad | 84.9% (4699/5533) | 86.1% (4509/5239) | 28.7% (1236/4306) | 84.3% (3821/4531) | 28.7% (1216/4231) |
| burger | 92.7% (5108/5509) | 93.7% (4968/5303) | 83.3% (3698/4440) | 92.9% (4333/4666) | 83.2% (3499/4206) |
| soup | 66.4% (2427/3654) | 67.8% (2445/3606) | 25.6% (748/2927) | 66.4% (2069/3115) | 25.1% (719/2861) |
| steak | 89.2% (2482/2783) | 89.7% (2322/2588) | 77.6% (1732/2232) | 88.5% (2055/2322) | 79.5% (1741/2189) |
| fish | 88.9% (2438/2743) | 90.0% (2366/2629) | 81.1% (1845/2276) | 89.6% (2005/2237) | 81.1% (1726/2129) |

### Context: tickets, waste, Critic, Heat

| Scenario | Tickets/round spawned · served · expired · left | Wasted/round cold · trashed · left | Critic A · B · unserved | Trailing crew wins Critic | Heat A t0/t1/t2/t3 | Heat B t0/t1/t2/t3 | Fires/round |
| --- | --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 39.2 · 33.2 · 2.3 · 3.6 | 3.52 · 0.00 · 1.13 | 245 · 260 · 11 | 54.6% (281/515) | 24/18/24/34 | 25/18/24/33 | 0.39 |
| gap-2v2 | 39.8 · 34.2 · 2.1 · 3.6 | 3.83 · 0.00 · 1.15 | 260 · 214 · 12 | 46.4% (225/485) | 22/15/23/40 | 26/19/23/32 | 0.21 |
| even-1v1 | 31.2 · 17.9 · 9.2 · 4.2 | 2.14 · 0.00 · 0.74 | 234 · 254 · 30 | 54.4% (281/517) | 34/25/28/13 | 33/27/28/12 | 0.04 |
| easy-vs-hard | 39.2 · 33.2 · 2.4 · 3.6 | 3.42 · 0.00 · 1.14 | 229 · 190 · 11 | 53.5% (230/430) | 34/25/24/16 | 19/13/22/46 | 0.67 |
| mixed | 31.2 · 17.8 · 9.3 · 4.1 | 2.24 · 0.00 · 0.74 | 229 · 235 · 37 | 53.3% (266/499) | 33/27/27/12 | 32/28/27/13 | 0.05 |

### Charms

| Scenario | Charms/round spawned | Banked/round A / B | Faded/round | Knocks on charm carriers/round |
| --- | --- | --- | --- | --- |
| even-2v2 | 3.00 | 1.45 / 1.55 | 0.00 | 1.95 |
| gap-2v2 | 3.00 | 1.62 / 1.38 | 0.00 | 1.91 |
| even-1v1 | 3.00 | 1.52 / 1.47 | 0.01 | 2.84 |
| easy-vs-hard | 3.00 | 0.83 / 2.17 | 0.00 | 0.50 |
| mixed | 3.00 | 1.52 / 1.47 | 0.01 | 2.70 |

### Scoring economy: Heat, lead swings, points by source, waste by cause

| Scenario | Top-Heat share | Heat drops/crew/round | Lead changes/round | Comeback % | Points: base · Critic · Heat · rush · charm | Waste/round: cold sniped · cold slow · cold partial (no ticket) · cold partial (ticket) · trashed · left · burns · expired tickets |
| --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 33.5% | 0.38 | 6.92 | 16.3% | 51.8% · 4.1% · 23.0% · 17.0% · 4.2% | 1.34 · 0.63 · 0.98 · 0.57 · 0.00 · 1.13 · 0.92 · 2.32 |
| gap-2v2 | 35.9% | 0.31 | 6.46 | 17.3% | 51.4% · 4.0% · 23.6% · 16.9% · 4.1% | 1.35 · 0.72 · 1.08 · 0.68 · 0.00 · 1.15 · 0.73 · 2.08 |
| even-1v1 | 12.4% | 0.09 | 4.97 | 17.2% | 53.1% · 6.9% · 17.1% · 15.5% · 7.5% | 0.72 · 0.24 · 0.76 · 0.42 · 0.00 · 0.74 · 0.23 · 9.18 |
| easy-vs-hard | 30.9% | 0.40 | 3.65 | 9.8% | 52.1% · 4.2% · 22.6% · 16.9% · 4.2% | 1.15 · 0.63 · 0.98 · 0.64 · 0.00 · 1.14 · 1.13 · 2.44 |
| mixed | 12.6% | 0.08 | 4.98 | 17.0% | 53.4% · 6.7% · 17.0% · 15.4% · 7.5% | 0.77 · 0.18 · 0.78 · 0.51 · 0.00 · 0.74 · 0.23 · 9.25 |

### gap-2v2 calibration

Crew throughput: two normal bots at the given skill vs an empty kitchen, points per round. Baseline (normal, no skill override): **2072.8**.

| Skill | Points/round | vs baseline |
| --- | --- | --- |
| 0.50 | 1974.2 | 0.952× |
| 0.55 | 1968.2 | 0.950× |
| 0.60 | 2072.8 | 1.000× |
| 0.65 | 2110.2 | 1.018× |
| 0.70 | 2139.9 | 1.032× |
| 0.75 | 2224.2 | 1.073× |
| 0.80 | 2268.5 | 1.094× |
| 0.85 | 2320.5 | 1.119× |
| 0.90 | 2378.9 | 1.148× |
| 0.95 | 2373.8 | 1.145× |
| 1.00 | 2413.8 | 1.165× |

Chosen crew-A skill: **0.811** (≈1.100×). interpolated between skill 0.8 and 0.85.

### Stuck events

No stuck events.

## Details: tuning.rushMultiplier=2 tuning.heatMultipliers=[1,1.25,1.5,2]

### Scenarios

| Scenario | Matches / rounds | A round win % [95% CI] | Draws | Pts/round A / B | Served/round A / B | Knocks/round | Steal % | Contested % | Wasted/round | Close % | Comeback % | Lead changes/round | Burns/round | Stuck | Runaway |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 200 / 517 | 48.5% [44.3%, 52.9%] | 0 | 1999.4 / 2014.4 | 17.14 / 17.06 | 3.06 | 96.6% | 43.4% | 4.65 | 23.6% | 18.0% (93/517) | 7.08 | 0.92 | 0 | 0 |
| gap-2v2 | 200 / 478 | 72.2% [68.0%, 76.0%] | 0 | 2269.7 / 1937.2 | 18.45 / 16.56 | 3.35 | 96.3% | 43.1% | 4.99 | 25.1% | 19.1% (91/477) | 6.63 | 0.73 | 0 | 0 |
| even-1v1 | 200 / 516 | 50.3% [46.0%, 54.6%] | 1 | 1080.9 / 1084.7 | 9.43 / 9.37 | 3.51 | 97.7% | 39.4% | 2.88 | 20.9% | 21.5% (111/516) | 5.05 | 0.24 | 0 | 0 |
| easy-vs-hard | 200 / 429 | 8.4% [6.1%, 11.4%] | 0 | 1558.5 / 2435.8 | 14.55 / 19.63 | 0.90 | 95.6% | 42.0% | 4.58 | 10.3% | 10.3% (44/429) | 3.63 | 1.13 | 0 | 0 |
| mixed | 200 / 497 | 49.7% [45.3%, 54.1%] | 0 | 1062.2 / 1077.3 | 9.25 / 9.41 | 3.56 | 97.6% | 38.9% | 3.00 | 24.9% | 19.7% (98/497) | 5.14 | 0.23 | 0 | 0 |

### Recipes

| Recipe served rate (served / spawned) | even-2v2 | gap-2v2 | even-1v1 | easy-vs-hard | mixed |
| --- | --- | --- | --- | --- | --- |
| salad | 84.8% (4696/5536) | 85.7% (4384/5116) | 28.7% (1236/4304) | 84.3% (3819/4531) | 28.8% (1208/4190) |
| burger | 92.9% (5130/5521) | 93.1% (4782/5138) | 83.3% (3684/4424) | 92.8% (4321/4655) | 83.0% (3459/4167) |
| soup | 66.3% (2429/3666) | 67.9% (2421/3567) | 25.7% (752/2925) | 66.4% (2060/3102) | 25.1% (715/2854) |
| steak | 89.1% (2481/2786) | 90.0% (2332/2590) | 77.6% (1712/2206) | 88.5% (2045/2312) | 79.5% (1720/2164) |
| fish | 88.9% (2442/2747) | 91.1% (2346/2575) | 81.2% (1831/2255) | 89.7% (2004/2234) | 81.3% (1716/2111) |

### Context: tickets, waste, Critic, Heat

| Scenario | Tickets/round spawned · served · expired · left | Wasted/round cold · trashed · left | Critic A · B · unserved | Trailing crew wins Critic | Heat A t0/t1/t2/t3 | Heat B t0/t1/t2/t3 | Fires/round |
| --- | --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 39.2 · 33.2 · 2.3 · 3.6 | 3.52 · 0.00 · 1.13 | 246 · 261 · 10 | 54.8% (283/516) | 24/18/24/33 | 25/18/24/34 | 0.38 |
| gap-2v2 | 39.7 · 34.0 · 2.2 · 3.5 | 3.84 · 0.00 · 1.14 | 233 · 239 · 6 | 58.3% (278/477) | 22/15/22/42 | 27/19/24/30 | 0.26 |
| even-1v1 | 31.2 · 17.9 · 9.2 · 4.2 | 2.14 · 0.00 · 0.74 | 232 · 254 · 30 | 54.2% (279/515) | 34/26/28/13 | 33/27/28/12 | 0.04 |
| easy-vs-hard | 39.2 · 33.2 · 2.4 · 3.6 | 3.43 · 0.00 · 1.15 | 229 · 189 · 11 | 53.6% (230/429) | 34/25/24/16 | 19/13/22/46 | 0.66 |
| mixed | 31.2 · 17.7 · 9.3 · 4.1 | 2.26 · 0.00 · 0.74 | 226 · 234 · 37 | 53.3% (264/495) | 33/27/27/13 | 33/28/27/12 | 0.05 |

### Charms

| Scenario | Charms/round spawned | Banked/round A / B | Faded/round | Knocks on charm carriers/round |
| --- | --- | --- | --- | --- |
| even-2v2 | 3.00 | 1.45 / 1.55 | 0.00 | 1.96 |
| gap-2v2 | 3.00 | 1.76 / 1.24 | 0.00 | 2.14 |
| even-1v1 | 3.00 | 1.51 / 1.49 | 0.01 | 2.80 |
| easy-vs-hard | 3.00 | 0.82 / 2.18 | 0.00 | 0.52 |
| mixed | 3.00 | 1.53 / 1.46 | 0.01 | 2.81 |

### Scoring economy: Heat, lead swings, points by source, waste by cause

| Scenario | Top-Heat share | Heat drops/crew/round | Lead changes/round | Comeback % | Points: base · Critic · Heat · rush · charm | Waste/round: cold sniped · cold slow · cold partial (no ticket) · cold partial (ticket) · trashed · left · burns · expired tickets |
| --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 33.5% | 0.38 | 7.08 | 18.0% | 45.9% · 3.7% · 24.4% · 22.3% · 3.7% | 1.34 · 0.63 · 0.97 · 0.58 · 0.00 · 1.13 · 0.92 · 2.33 |
| gap-2v2 | 35.9% | 0.28 | 6.63 | 19.1% | 45.2% · 3.5% · 25.1% · 22.6% · 3.6% | 1.35 · 0.73 · 1.18 · 0.58 · 0.00 · 1.14 · 0.73 · 2.17 |
| even-1v1 | 12.3% | 0.09 | 5.05 | 21.5% | 49.1% · 6.4% · 17.3% · 20.3% · 6.9% | 0.72 · 0.24 · 0.75 · 0.43 · 0.00 · 0.74 · 0.24 · 9.19 |
| easy-vs-hard | 30.9% | 0.40 | 3.63 | 10.3% | 46.2% · 3.7% · 24.1% · 22.2% · 3.8% | 1.16 · 0.63 · 0.99 · 0.65 · 0.00 · 1.15 · 1.13 · 2.45 |
| mixed | 12.5% | 0.08 | 5.14 | 19.7% | 49.5% · 6.2% · 17.1% · 20.2% · 7.0% | 0.77 · 0.18 · 0.78 · 0.51 · 0.00 · 0.74 · 0.23 · 9.27 |

### gap-2v2 calibration

Crew throughput: two normal bots at the given skill vs an empty kitchen, points per round. Baseline (normal, no skill override): **2369.6**.

| Skill | Points/round | vs baseline |
| --- | --- | --- |
| 0.50 | 2249.5 | 0.949× |
| 0.55 | 2243.2 | 0.947× |
| 0.60 | 2369.6 | 1.000× |
| 0.65 | 2412.0 | 1.018× |
| 0.70 | 2453.1 | 1.035× |
| 0.75 | 2550.8 | 1.076× |
| 0.80 | 2596.2 | 1.096× |
| 0.85 | 2664.4 | 1.124× |
| 0.90 | 2730.4 | 1.152× |
| 0.95 | 2729.0 | 1.152× |
| 1.00 | 2778.0 | 1.172× |

Chosen crew-A skill: **0.808** (≈1.100×). interpolated between skill 0.8 and 0.85.

### Stuck events

No stuck events.

## Details: tuning.rushMultiplier=2 tuning.heatMultipliers=[1,1.25,1.5,1.75]

### Scenarios

| Scenario | Matches / rounds | A round win % [95% CI] | Draws | Pts/round A / B | Served/round A / B | Knocks/round | Steal % | Contested % | Wasted/round | Close % | Comeback % | Lead changes/round | Burns/round | Stuck | Runaway |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 200 / 516 | 49.8% [45.5%, 54.1%] | 0 | 1874.5 / 1884.4 | 17.14 / 17.06 | 3.07 | 96.6% | 43.4% | 4.66 | 27.1% | 18.4% (95/516) | 7.02 | 0.92 | 0 | 0 |
| gap-2v2 | 200 / 477 | 71.5% [67.3%, 75.4%] | 0 | 2123.7 / 1826.6 | 18.51 / 16.68 | 3.27 | 96.6% | 42.9% | 4.93 | 29.1% | 18.3% (87/476) | 6.56 | 0.69 | 0 | 0 |
| even-1v1 | 200 / 519 | 50.9% [46.6%, 55.1%] | 0 | 1054.6 / 1054.9 | 9.45 / 9.37 | 3.64 | 97.7% | 39.2% | 2.88 | 23.9% | 19.7% (102/519) | 5.06 | 0.24 | 0 | 0 |
| easy-vs-hard | 200 / 429 | 8.4% [6.1%, 11.4%] | 0 | 1503.3 / 2242.3 | 14.55 / 19.64 | 0.88 | 95.5% | 42.0% | 4.57 | 11.4% | 10.0% (43/428) | 3.74 | 1.13 | 0 | 0 |
| mixed | 200 / 499 | 49.6% [45.2%, 54.0%] | 1 | 1035.7 / 1051.6 | 9.27 / 9.42 | 3.51 | 97.7% | 38.8% | 2.99 | 24.4% | 19.6% (98/499) | 5.09 | 0.23 | 0 | 0 |

### Recipes

| Recipe served rate (served / spawned) | even-2v2 | gap-2v2 | even-1v1 | easy-vs-hard | mixed |
| --- | --- | --- | --- | --- | --- |
| salad | 84.9% (4696/5531) | 85.2% (4381/5142) | 28.7% (1240/4320) | 84.3% (3816/4525) | 28.7% (1206/4208) |
| burger | 92.8% (5097/5494) | 94.2% (4873/5171) | 83.4% (3711/4451) | 92.9% (4322/4654) | 83.3% (3487/4188) |
| soup | 66.3% (2428/3660) | 67.9% (2426/3575) | 25.5% (749/2933) | 66.4% (2063/3108) | 25.0% (715/2858) |
| steak | 89.1% (2480/2782) | 88.3% (2286/2590) | 77.6% (1730/2230) | 88.5% (2048/2315) | 79.8% (1737/2177) |
| fish | 88.9% (2439/2744) | 90.4% (2354/2605) | 80.9% (1846/2281) | 89.7% (2001/2231) | 81.0% (1718/2120) |

### Context: tickets, waste, Critic, Heat

| Scenario | Tickets/round spawned · served · expired · left | Wasted/round cold · trashed · left | Critic A · B · unserved | Trailing crew wins Critic | Heat A t0/t1/t2/t3 | Heat B t0/t1/t2/t3 | Fires/round |
| --- | --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 39.2 · 33.2 · 2.3 · 3.6 | 3.53 · 0.00 · 1.13 | 246 · 260 · 10 | 54.6% (281/515) | 24/18/24/33 | 25/18/24/33 | 0.38 |
| gap-2v2 | 40.0 · 34.2 · 2.2 · 3.6 | 3.74 · 0.00 · 1.19 | 259 · 209 · 9 | 52.0% (247/475) | 21/15/22/42 | 26/20/23/31 | 0.21 |
| even-1v1 | 31.2 · 17.9 · 9.2 · 4.2 | 2.14 · 0.00 · 0.74 | 236 · 252 · 31 | 53.9% (279/518) | 34/25/28/13 | 33/27/28/12 | 0.04 |
| easy-vs-hard | 39.2 · 33.2 · 2.4 · 3.6 | 3.42 · 0.00 · 1.14 | 229 · 189 · 11 | 53.6% (230/429) | 34/25/24/16 | 19/13/22/46 | 0.67 |
| mixed | 31.2 · 17.8 · 9.3 · 4.1 | 2.25 · 0.00 · 0.74 | 226 · 236 · 37 | 53.5% (266/497) | 33/27/27/12 | 33/28/27/13 | 0.05 |

### Charms

| Scenario | Charms/round spawned | Banked/round A / B | Faded/round | Knocks on charm carriers/round |
| --- | --- | --- | --- | --- |
| even-2v2 | 3.00 | 1.46 / 1.54 | 0.00 | 1.97 |
| gap-2v2 | 3.00 | 1.71 / 1.29 | 0.00 | 1.94 |
| even-1v1 | 3.00 | 1.51 / 1.48 | 0.01 | 2.92 |
| easy-vs-hard | 3.00 | 0.83 / 2.17 | 0.00 | 0.51 |
| mixed | 3.00 | 1.52 / 1.47 | 0.01 | 2.76 |

### Scoring economy: Heat, lead swings, points by source, waste by cause

| Scenario | Top-Heat share | Heat drops/crew/round | Lead changes/round | Comeback % | Points: base · Critic · Heat · rush · charm | Waste/round: cold sniped · cold slow · cold partial (no ticket) · cold partial (ticket) · trashed · left · burns · expired tickets |
| --- | --- | --- | --- | --- | --- | --- |
| even-2v2 | 33.5% | 0.38 | 7.02 | 18.4% | 49.0% · 3.9% · 21.7% · 21.4% · 4.0% | 1.34 · 0.63 · 0.98 · 0.58 · 0.00 · 1.13 · 0.92 · 2.33 |
| gap-2v2 | 36.2% | 0.28 | 6.56 | 18.3% | 48.4% · 3.8% · 22.4% · 21.6% · 3.8% | 1.33 · 0.73 · 1.10 · 0.57 · 0.00 · 1.19 · 0.69 · 2.20 |
| even-1v1 | 12.4% | 0.09 | 5.06 | 19.7% | 50.5% · 6.5% · 16.3% · 19.6% · 7.1% | 0.73 · 0.24 · 0.75 · 0.43 · 0.00 · 0.74 · 0.24 · 9.18 |
| easy-vs-hard | 30.9% | 0.40 | 3.74 | 10.0% | 49.3% · 3.9% · 21.4% · 21.3% · 4.0% | 1.16 · 0.63 · 0.98 · 0.65 · 0.00 · 1.14 · 1.13 · 2.44 |
| mixed | 12.5% | 0.08 | 5.09 | 19.6% | 50.8% · 6.4% · 16.1% · 19.5% · 7.2% | 0.77 · 0.18 · 0.78 · 0.52 · 0.00 · 0.74 · 0.23 · 9.27 |

### gap-2v2 calibration

Crew throughput: two normal bots at the given skill vs an empty kitchen, points per round. Baseline (normal, no skill override): **2180.0**.

| Skill | Points/round | vs baseline |
| --- | --- | --- |
| 0.50 | 2075.0 | 0.952× |
| 0.55 | 2070.7 | 0.950× |
| 0.60 | 2180.0 | 1.000× |
| 0.65 | 2218.4 | 1.018× |
| 0.70 | 2255.3 | 1.035× |
| 0.75 | 2343.8 | 1.075× |
| 0.80 | 2382.9 | 1.093× |
| 0.85 | 2443.8 | 1.121× |
| 0.90 | 2501.3 | 1.147× |
| 0.95 | 2498.0 | 1.146× |
| 1.00 | 2542.0 | 1.166× |

Chosen crew-A skill: **0.812** (≈1.100×). interpolated between skill 0.8 and 0.85.

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
| Overrides | tuning.heatThresholds=[4,8,13] |
| Sweep | tuning.rushMultiplier = 1.5, 1.75, 2; tuning.heatMultipliers = [1,1.25,1.5,2], [1,1.25,1.5,1.75] |
| Stuck threshold | 10 s |
| Max ticks | 1.5 × longest possible match |
| Calibration | 40 crew-vs-empty matches × 12 skills, target 1.1× |
| Workers | 7 |
| Matches run | 8880 in 1131.6 s (7.8 matches/s) |
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
