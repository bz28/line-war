Run the headless bot simulation and judge the game's balance.

1. Run `tools/botsim` for enough matches to be meaningful (≥200 rounds per configuration; equal-skill and 10%-faster-crew pairings, 2v2 and 1v1).
2. Compare against the pass bars (design doc, validation step 4):
   - bots never get stuck (no idle crew > 10 s with work available)
   - 2–6 knocks per round
   - no recipe skipped twice as often as another
   - a 10% faster crew wins 65–80%
   - also report: contested tickets %, wasted dishes, close rounds (within 10%), late comebacks
3. For each failing bar, propose the smallest `tuning.ts` change, rerun, and show before → after. Don't add rules.
4. Report as a table plus 3–5 plain-English bullets on what it means for how the game will feel.
