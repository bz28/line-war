# Botsim pass bars, all levels

Generated on `main` at `b4dbe69` with
`pnpm --filter @line-war/botsim sim -- --matches 200 --scenario all --workers 7 --quiet --arena <level>`
(200 matches per scenario, 5 scenarios; gap-2v2 calibrated on 200 crew-vs-empty matches per skill point).
Full Night Market report: [`latest.md`](latest.md). Rooftop tuning sweep: [`balance-rooftop/`](balance-rooftop/).

| Check | Target | Night Market | Harbor Pier | Rooftop Garden |
| --- | --- | --- | --- | --- |
| Bots never get stuck | 0 stuck events | ✅ 0 | ✅ 0 | ✅ 0 |
| Knocks per round (even-2v2) | 2–6 | ✅ 3.86 | ✅ 5.53 | ✅ 3.85 |
| No recipe skipped twice as often as another (even-2v2) | lowest served ≥ 0.5 × highest | ✅ soup 65.5% vs burger 93.3% | ✅ soup 61.0% vs steak 90.4% | ✅ salad 79.9% vs burger 89.3% |
| A 10% faster crew wins (gap-2v2) | 65–80% of rounds | ✅ 68.9% [64.7, 72.8] | ✅ 68.0% [63.8, 72.1] | ⚠️ 61.9% [57.5, 66.1] |
| Side bias, even-2v2 | 50% in 95% CI | ✅ 50.9% | ✅ 51.9% | ✅ 51.2% |
| Side bias, even-1v1 | 50% in 95% CI | ✅ 51.4% | ✅ 53.4% | ✅ 49.0% |
| Side bias, mixed | 50% in 95% CI | ✅ 47.4% | ✅ 50.2% | ✅ 52.2% |

Notes
- Night Market and Harbor Pier pass every bar.
- Calibration was raised from 40 to 200 matches per skill point: at 40 the chosen skill swung by about ±0.03, which moved
  this bar by about ±6 points between runs (e.g. Rooftop 57.3% vs 65.9%, Harbor 63.4% vs 77.9%).
- **Rooftop Garden** (accepted, by design): with a stable calibration a 10% faster crew wins about 62% of rounds
  (CI reaches 66%). 70% of its dishes need a raid on the shared garden, so contests even crews out more than on the
  other levels. Skill still clearly wins, and no map, menu or tuning lever moved it by more than noise
  (PR #29 sweep). Every other bar passes.
