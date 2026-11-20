# Claude Rules — LINE WAR

## Product context

- LINE WAR is a **competitive 2v2 cooking game** (1v1 and vs-bots too): two crews race to serve orders from one shared ticket board, fighting over a contested central market. Browser game first, online play later.
- **Implementation spec: [`docs/RULES.md`](docs/RULES.md)** — the exact rules every system implements. If a case isn't covered, say so in the PR and pick the simplest behaviour consistent with it; **never invent new mechanics**. Background design, research and simulations: [`docs/GAME_DESIGN.md`](docs/GAME_DESIGN.md) (links the living design doc).
- Load-bearing design principles: **the race is the game** (first crew to serve wins the ticket); **teamwork is a bonus, never required** (1v1 must work); **every mechanic must be readable at a glance** (no hidden information, no cheap talk); **comebacks are possible but earned** (no loser payouts); **one level done well before many**. Held for later (don't build unless asked): dirty tricks, kitchen swap, tips, spoiling, ghost plates, ticket calls.

## Ground truth

- Ground every claim in the actual code. Before stating how something works, read the file and cite `file:line`. When memory or an earlier turn conflicts with what you observe, trust what you observe.
- **Balance claims need numbers.** "This feels unfair / too strong" is a hypothesis until the headless bot sim (`tools/botsim`) or the design sim (`tools/design-sim`) shows it. Report win rates, knocks/round, contested tickets, etc.
- Pre-launch: no backwards-compat shims, no feature flags, no deprecation wrappers. Change the code directly.

## Layout

- `packages/sim` — deterministic rules (pure TS, no DOM, no `Date`, no `Math.random`). `step(state, inputs)` mutates state one 30 Hz tick.
- `packages/content` — arenas (ASCII maps), recipes, ingredients. Data only.
- `packages/bots` — scripted bot players. `tools/botsim` — headless bot matches + balance report. `tools/design-sim` — pre-build Python design simulator.
- `apps/client` — browser client: loop, greybox renderer, input, settings, menus.
- `docs/BUILD_PLAN.md` — PR waves and file ownership for parallel agents.

## Commands

- `pnpm install`, `pnpm check` (typecheck + all tests — **must be green before any PR is opened or merged**), `pnpm build`, `pnpm dev` (client at http://localhost:5173).

## Workflow

- Feature branches → PR → merge to main. **Never push directly to main.** Branches: `track/<name>` for build-plan tracks, `feat|fix|chore/<slug>` otherwise.
- Merge with `gh pr merge --merge` (no squash — keep history). Delete the branch after merge.
- **No CI** (GitHub Actions is disabled on this account and we don't rely on it). The gate is **local**: run `pnpm check && pnpm build` on the PR branch rebased on current `main` right before merging, and paste the result in the PR.
- **Autonomy:** the user has authorized autonomous building — commit, push, open PRs, review and merge without asking, following this file. Still stop and ask for: design/rule changes not in `docs/RULES.md`, anything that costs money (hosting, paid services), making the repo public, or destructive git operations.
- **Every PR description includes a Test Plan with evidence** — each check run (`pnpm check`, `pnpm build`, botsim) with its pass/fail and counts, plus a note on manual verification.
  - **Visual/UI PRs:** attach a real screenshot of the changed surface, committed under `docs/design/` and embedded with `![label](https://github.com/bz28/line-war/blob/<branch>/docs/design/<file>?raw=true)`. Capture it by running `pnpm dev` and driving the browser. If it truly can't be captured, the Test Plan says why and what was verified instead, and you flag the gap to the user. Prose descriptions are not screenshots.
  - **Gameplay/balance PRs:** include the botsim report (before → after when tuning).
- **Verify the blast radius.** A change to a shared contract (`packages/sim/src/types.ts`, `step.ts`, `tuning.ts`, `match.ts`) can break every track. Run the full suite, check every caller, and note the contract change in the PR description. Keep such changes minimal and additive.
- Small, cohesive commits (~150 lines when cohesive). Conventional prefixes with scope: `feat(sim):`, `fix(client):`, `docs:`, `chore:`, `refactor:`, `test:`.

## Development process

- **Plan before coding** non-trivial features (`/plan`): plain English, in the conversation, not persisted to a file.
- **Parallel agents:** split work by file ownership (`docs/BUILD_PLAN.md`), one worktree + branch + PR per agent. Agents stay inside their owned files; shared contracts are changed by the orchestrator first, on main, before agents start.
- **Every rule gets a unit test** in `packages/sim/test/` (use `test/fixtures.ts` or a purpose-built arena). New systems also get a determinism test (same seed + inputs → identical JSON).
- **Tune numbers, don't add rules.** When the game feels off, first try `tuning.ts` and measure with botsim; adding a mechanic is the last resort and needs the user's OK.
- **Root-cause bugs.** Desyncs/nondeterminism, off-by-one ticks, collision edge cases and state not reset between rounds are the usual suspects. No defensive patches that hide the real bug.
- **Review every PR before merging** (`/review`, two passes, confirmed/suspected). For larger or contract-touching PRs also spawn a fresh, context-free review agent; the two are complementary.
- **Shipping summary:** what was done, how, why, how it was tested (with evidence), and how the user can try it (`pnpm dev`, which keys, what to expect).

## Code quality

- All numbers live in `tuning.ts` (seconds), converted with `secondsToTicks` / `timerTicks`. No magic numbers in systems.
- Sim stays deterministic and JSON-serializable. Randomness only via `rng.ts`. Emit `SimEvent`s for anything the renderer, audio or stats may want; renderers never mutate state.
- DRY without premature abstraction: extract a helper only when at least 2 of — duplicated 3+ times, the name conveys real insight, call sites will evolve together, bugs cluster there. Otherwise leave it inline.
- Readability for players beats prettiness: shapes + colour (colour-blind safe), every state visible.

## Skills

- `/plan` — draft an approach in conversation before a non-trivial feature
- `/autopilot` — autonomous multi-commit execution on a well-scoped task, through PR + review + merge
- `/review` — two-pass review with confirmed/suspected labels
- `/debug` — reproduce, root-cause, propose a fix
- `/balance` — run botsim, compare against the pass bars, propose tuning
- `/explain-simple` — plain-English bullet summary for a non-coder, after something ships
