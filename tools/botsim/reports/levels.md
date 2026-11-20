# Botsim pass bars, all levels

Generated on `main` at `17a6a74` with
`pnpm --filter @line-war/botsim sim -- --matches 200 --scenario all --workers 6 --quiet --arena <level>`
(200 matches per scenario, 5 scenarios). Full Night Market report: [`latest.md`](latest.md).

> **Rooftop Garden is being tuned in a separate PR.** Its numbers below are the current `main` baseline, not the
> tuned result.

| Check | Target | Night Market | Harbor Pier | Rooftop Garden |
| --- | --- | --- | --- | --- |
| Bots never get stuck | 0 stuck events | ✅ 0 | ✅ 0 | ✅ 0 |
| Knocks per round (even-2v2) | 2–6 | ✅ 3.86 | ✅ 5.53 | ❌ 6.39 |
| No recipe skipped twice as often as another (even-2v2) | lowest served ≥ 0.5 × highest | ✅ soup 65.5% vs burger 93.3% | ✅ soup 61.0% vs steak 90.4% | ✅ salad 78.7% vs burger 89.4% |
| A 10% faster crew wins (gap-2v2) | 65–80% of rounds | ✅ 68.8% [64.5, 72.7] | ❌ 63.4% [59.1, 67.6] | ❌ 63.1% [58.8, 67.2] |
| Side bias, even-2v2 | 50% in 95% CI | ✅ 50.9% | ✅ 51.9% | ✅ 52.4% |
| Side bias, even-1v1 | 50% in 95% CI | ✅ 51.4% | ✅ 53.4% | ✅ 50.3% |
| Side bias, mixed | 50% in 95% CI | ✅ 47.4% | ✅ 50.2% | ✅ 48.3% |

Notes
- Night Market passes every bar.
- Harbor Pier's skill-gap bar sits just under 65% (its CI reaches 67.6%, so it overlaps the band): rounds there are
  a little more contested, which flattens a 10% speed edge. Everything else passes.
- Rooftop Garden runs one knock per round over the band and has the same skill-gap shortfall; both are what the
  separate Rooftop tuning PR addresses.
