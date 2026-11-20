# Botsim pass bars, all levels

Generated on `main` at `17a6a74` with
`pnpm --filter @line-war/botsim sim -- --matches 200 --scenario all --workers 6 --quiet --arena <level>`
(200 matches per scenario, 5 scenarios). Full Night Market report: [`latest.md`](latest.md).

Rooftop Garden is after the twin-tomato-bed layout (Rooftop tuning PR); full reports and
the sweep are in [`balance-rooftop/`](balance-rooftop/).

| Check | Target | Night Market | Harbor Pier | Rooftop Garden |
| --- | --- | --- | --- | --- |
| Bots never get stuck | 0 stuck events | ✅ 0 | ✅ 0 | ✅ 0 |
| Knocks per round (even-2v2) | 2–6 | ✅ 3.86 | ✅ 5.53 | ✅ 3.85 (3.96 at 600) |
| No recipe skipped twice as often as another (even-2v2) | lowest served ≥ 0.5 × highest | ✅ soup 65.5% vs burger 93.3% | ✅ soup 61.0% vs steak 90.4% | ✅ salad 79.9% vs burger 89.3% |
| A 10% faster crew wins (gap-2v2) | 65–80% of rounds | ✅ 68.8% [64.5, 72.7] | ❌ 63.4% [59.1, 67.6] | ❌ 57.3% [52.9, 61.6]; ✅ 65.9% [63.5, 68.3] at 600 |
| Side bias, even-2v2 | 50% in 95% CI | ✅ 50.9% | ✅ 51.9% | ✅ 51.2% |
| Side bias, even-1v1 | 50% in 95% CI | ✅ 51.4% | ✅ 53.4% | ✅ 49.0% |
| Side bias, mixed | 50% in 95% CI | ✅ 47.4% | ✅ 50.2% | ✅ 52.2% |

Notes
- Night Market passes every bar.
- Harbor Pier's skill-gap reading at 200 matches (63.4%) is noise: a 600-match run (seed 31, PR #27) gives
  **77.9% [75.7, 80.0]**, inside the band. Everything else passes.
- Rooftop Garden: knocks are fixed (6.39 → 3.85; 6.86 → 3.96 at 600 matches, seed 31). The skill-gap bar passes
  at 600 matches with seed 31 (65.9%) but fails at 200 with seed 1 (57.3%). The swing is gap-2v2 *calibration* noise
  (40 crew-vs-empty matches per skill point picked skill 0.669 here, 0.715 at seed 31). A 200-match calibration puts
  Rooftop's true skill at ~0.70, which converts to ~62–63% (fixed-skill gap-2v2, 600 matches: 0.68 → 59.9%, 0.72 → 65.7%, 0.76 → 71.4%). No map,
  menu or tuning lever moved that by more than noise; see the PR for the bot/harness recommendations.
