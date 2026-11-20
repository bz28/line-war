# LINE WAR — agent guide

Competitive 2v2 cooking game. **Implementation spec: `docs/RULES.md`.** If a case isn't covered there, say so in your PR and pick the simplest
behaviour consistent with it; never invent new mechanics. Background design: `docs/GAME_DESIGN.md`.

## Layout
- `packages/sim` — deterministic rules (pure TS, no DOM, no Date, no Math.random). `step(state, inputs)` mutates state one tick.
- `packages/content` — arenas (ASCII maps), recipes, ingredients. Data only.
- `packages/bots` — scripted bot players (wave 2).
- `apps/client` — browser client: loop, greybox renderer, input, settings, menus.
- `tools/botsim` — headless bot matches + balance report (wave 2). `tools/design-sim` — pre-build Python design simulator.
- `docs/BUILD_PLAN.md` — PR waves and file ownership.

## Commands
- `pnpm install`, `pnpm check` (typecheck + tests, must be green before a PR), `pnpm dev` (client), `pnpm build`.

## Rules for every change
- Stay inside the files your track owns (see `docs/BUILD_PLAN.md`). Changing a shared contract (`packages/sim/src/types.ts`, `step.ts`, `tuning.ts`) needs a note in the PR description explaining why; keep such changes minimal and additive.
- All numbers live in `tuning.ts` (seconds), converted with `secondsToTicks`/`timerTicks`. No magic numbers in systems.
- Sim must stay deterministic and JSON-serializable. Randomness only via `rng.ts`.
- Every rule gets a unit test in `packages/sim/test/` using `test/fixtures.ts` (tiny arena) or a purpose-built arena.
- Emit `SimEvent`s for anything the renderer/audio/stats may want.
- One PR per track, branch `track/<name>`, conventional title (`feat(sim): ...`). PR body: what, how tested, contract changes, open questions.
