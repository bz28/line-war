"""
LINE WAR design simulator (abstract, pre-build).

Models two crews of two cooks racing for tickets on a shared board, using the
design doc's rules and timings measured off the Night Market layout
(4 tiles/s walking). It is NOT the game: it abstracts movement into per-recipe
"hands time" (the cook is busy) and "elapsed time" (until the plate is ready,
including cooking waits). Use it to compare rule variants, not to predict exact scores.

Run:  python3 sim.py            (all scenarios)
      python3 sim.py trace      (one narrated round + score timeline CSV)
"""
import math
import random
import sys
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

# ---------------------------------------------------------------- recipes
# hands = seconds a cook is busy; elapsed = seconds until the plate is served.
# Derived from Night Market distances (see doc "Paper playtest") + tuning timers.
RECIPES = {
    #           hands elapsed value premium cooked
    "salad":   (6.5,  8.0,   40,  False, False),
    "burger":  (5.0,  11.0,  60,  False, True),
    "soup":    (10.0, 22.0,  80,  False, True),
    "steak":   (8.0,  14.0,  100, True,  True),
    "fish":    (8.0,  14.0,  100, True,  True),
}
MARKET_TRIP = 3.0  # extra seconds (hands and elapsed) for a premium run

@dataclass
class Rules:
    name: str = "baseline"
    round_len: float = 240.0
    prep: float = 15.0
    spawn: float = 12.0
    rush_spawn: float = 7.0
    rush_at: float = 180.0
    rush_mult: float = 2.0
    lifetime: float = 60.0
    max_tickets: int = 5
    weights: Tuple[float, ...] = (3, 3, 2, 1.5, 1.5)  # salad burger soup steak fish
    values: Optional[Dict[str, int]] = None  # override recipe values
    freshness_floor: float = 0.5
    heat_thresholds: Tuple[int, int, int] = (2, 4, 7)
    heat_mults: Tuple[float, ...] = (1.0, 1.5, 2.0, 3.0)
    critic: bool = True
    critic_at: float = 120.0
    critic_mult: float = 3.0
    plates: int = 4
    cold_after: Optional[float] = None  # finished dish goes cold (unservable) after N s; None = never
    stockpile: bool = True  # cooks pre-make common dishes when idle
    market_stock: int = 2
    restock: float = 20.0
    market_always_enough: bool = False
    knock_chance: float = 0.25
    runner_up: float = 0.0  # second crew to finish a ticket within 15 s gets this share of its value
    claims: bool = False  # once a crew starts a ticket, the rival cannot take it (a draft, not a race)


@dataclass
class Team:
    skill: float = 1.0  # time multiplier: 0.9 = 10% faster
    burn_rate: float = 0.06
    smart: bool = True  # reads rival ghost plates (avoids races it would lose)


@dataclass
class Ticket:
    id: int
    recipe: str
    spawn: float
    value: float
    critic: bool = False
    visible_to: Optional[int] = None
    reveal_at: float = 0.0
    workers: Dict[int, float] = field(default_factory=dict)  # team -> expected finish


@dataclass
class Job:
    team: int
    recipe: str
    ticket: Optional[int]  # None = speculative
    start: float
    done_at: float
    burnt: bool


def run_round(rules: Rules, teams: Tuple[Team, Team], rng: random.Random, trace: bool = False):
    vals = dict((k, v[2]) for k, v in RECIPES.items())
    if rules.values:
        vals.update(rules.values)
    names = list(RECIPES.keys())
    t = 0.0
    dt = 0.1
    tickets: List[Ticket] = []
    next_id = [1]
    next_spawn = rules.prep
    score = [0.0, 0.0]
    heat = [0, 0]
    streak = [0, 0]
    cook_free = [[0.0, 0.0], [0.0, 0.0]]
    jobs: List[Job] = []
    leftovers: List[List[Tuple[str, float]]] = [[], []]  # (recipe, finished_at)
    plates_out = [0, 0]  # plates held by jobs / leftovers
    plate_returns: List[Tuple[float, int]] = []
    stock = {"steak": rules.market_stock, "fish": rules.market_stock}
    next_restock = rules.restock
    last_market = [-99.0, -99.0]
    critic_done = False
    closed = {}  # ticket id -> (closed_at, ticket, winner)
    timeline = []
    log = []
    stats = dict(delivered=[0, 0], contested=0, expired=0, wasted=[0, 0], idle=[0.0, 0.0],
                 burns=[0, 0], knocks=0, stock_blocked=0, sniped=[0, 0], deliveries=0,
                 by_recipe={k: 0 for k in names}, premium_points=[0.0, 0.0])

    def say(msg):
        if trace:
            log.append(f"{int(t // 60)}:{int(t % 60):02d}  {msg}")

    def heat_tier(team):
        s = streak[team]
        th = rules.heat_thresholds
        return 3 if s >= th[2] else 2 if s >= th[1] else 1 if s >= th[0] else 0

    def spawn_ticket(recipe=None, critic=False):
        r = recipe or rng.choices(names, weights=rules.weights)[0]
        v = vals[r] * (rules.critic_mult if critic else 1)
        tk = Ticket(next_id[0], r, t, v, critic)
        if critic:
            trailing = 0 if score[0] < score[1] else 1 if score[1] < score[0] else None
            tk.visible_to = trailing
            tk.reveal_at = t + 3.0
        next_id[0] += 1
        tickets.append(tk)
        say(f"ticket #{tk.id} {r}{' CRITIC x3' if critic else ''} appears")

    def visible(tk, team):
        return tk.visible_to is None or tk.visible_to == team or t >= tk.reveal_at

    def deliver(team, recipe, tk, made_at):
        age = t - tk.spawn
        fresh = 1.0 - (1.0 - rules.freshness_floor) * min(1.0, age / rules.lifetime)
        mult = rules.heat_mults[heat_tier(team)]
        rush = rules.rush_mult if t >= rules.rush_at else 1.0
        tip = 10 if (t - made_at) < 5 else 0
        pts = tk.value * fresh * mult * rush + tip
        score[team] += pts
        streak[team] += 1
        stats["delivered"][team] += 1
        stats["deliveries"] += 1
        stats["by_recipe"][recipe] += 1
        if RECIPES[recipe][3]:
            stats["premium_points"][team] += pts
        if len(tk.workers) == 2:
            stats["contested"] += 1
        tickets.remove(tk)
        closed[tk.id] = (t, tk, team)
        plate_returns.append((t + 5.0, team))
        say(f"Crew {'AB'[team]} serves #{tk.id} {recipe} for {pts:.0f} (heat x{mult}{', rush x2' if rush > 1 else ''})")

    def est_elapsed(team, recipe):
        return RECIPES[recipe][1] * teams[team].skill + (MARKET_TRIP if RECIPES[recipe][3] else 0)

    def can_take_premium(recipe):
        return rules.market_always_enough or stock[recipe] > 0

    def start_job(team, cook, recipe, tk):
        base_h, base_e, _, prem, cooked = RECIPES[recipe]
        sk = teams[team].skill
        noise = rng.lognormvariate(0, 0.15)
        h = base_h * sk * noise
        e = base_e * sk * noise
        if prem:
            h += MARKET_TRIP
            e += MARKET_TRIP
            if not rules.market_always_enough:
                stock[recipe] -= 1
            other = 1 - team
            if t - last_market[other] < 3.0 and rng.random() < rules.knock_chance:
                # knocked in the market: item lost, run again
                stats["knocks"] += 1
                h += MARKET_TRIP
                e += MARKET_TRIP
                say(f"Crew {'AB'[other]} knocks Crew {'AB'[team]}'s {recipe} loose in the market")
            last_market[team] = t
        burnt = cooked and rng.random() < teams[team].burn_rate * sk
        if burnt:
            e += RECIPES[recipe][1] * 0.6
            h += 2.0
        cook_free[team][cook] = t + h
        plates_out[team] += 1
        jobs.append(Job(team, recipe, tk.id if tk else None, t, t + e, burnt))
        if tk:
            tk.workers[team] = t + e
        say(f"Crew {'AB'[team]} cook {cook + 1} starts {recipe}" + (f" for #{tk.id}" if tk else " (speculative)"))

    while t < rules.round_len:
        # spawns
        rush = t >= rules.rush_at
        if t >= rules.prep and t >= next_spawn:
            if len([x for x in tickets if not x.critic]) < rules.max_tickets:
                spawn_ticket()
            next_spawn = t + (rules.rush_spawn if rush else rules.spawn)
        if rules.critic and not critic_done and t >= rules.critic_at:
            critic_done = True
            spawn_ticket(rng.choice(["steak", "fish"]), critic=True)
        if t >= next_restock:
            next_restock += rules.restock
            stock = {"steak": rules.market_stock, "fish": rules.market_stock}
        # expiry
        for tk in list(tickets):
            if t - tk.spawn >= rules.lifetime:
                tickets.remove(tk)
                stats["expired"] += 1
                say(f"ticket #{tk.id} {tk.recipe} expires")
        # plate returns
        for pr in list(plate_returns):
            if t >= pr[0]:
                plate_returns.remove(pr)
                plates_out[pr[1]] -= 1
        # finished jobs
        for j in list(jobs):
            if t >= j.done_at:
                jobs.remove(j)
                if j.burnt:
                    stats["burns"][j.team] += 1
                    streak[j.team] = rules.heat_thresholds[max(0, heat_tier(j.team) - 2)] if heat_tier(j.team) >= 2 else 0
                    say(f"Crew {'AB'[j.team]} burns a {j.recipe} (heat drops)")
                tk = next((x for x in tickets if x.id == j.ticket), None)
                if tk is None:
                    # look for another matching ticket
                    tk = next((x for x in tickets if x.recipe == j.recipe and visible(x, j.team)), None)
                cl = closed.get(j.ticket) if j.ticket is not None else None
                if tk is not None and tk.id != j.ticket and cl is not None and rules.runner_up > 0 and t - cl[0] <= 15:
                    tk = None
                if tk is not None:
                    deliver(j.team, j.recipe, tk, t)
                elif cl is not None and cl[2] != j.team and rules.runner_up > 0 and t - cl[0] <= 15:
                    pts = cl[1].value * rules.runner_up * rules.heat_mults[heat_tier(j.team)] * (rules.rush_mult if t >= rules.rush_at else 1.0)
                    score[j.team] += pts
                    streak[j.team] += 1
                    stats["deliveries"] += 1
                    plate_returns.append((t + 5.0, j.team))
                    say(f"Crew {'AB'[j.team]} serves #{cl[1].id} second for {pts:.0f} (runner-up)")
                else:
                    if j.ticket is not None:
                        stats["sniped"][j.team] += 1
                        say(f"Crew {'AB'[j.team]} finishes {j.recipe} but lost the race; it becomes a leftover")
                    leftovers[j.team].append((j.recipe, t))
        order = [0, 1]
        rng.shuffle(order)
        # leftovers: serve or go cold
        for team in order:
            for lo in list(leftovers[team]):
                if rules.cold_after is not None and t - lo[1] > rules.cold_after:
                    leftovers[team].remove(lo)
                    plates_out[team] -= 1
                    stats["wasted"][team] += 1
                    continue
                tk = next((x for x in tickets if x.recipe == lo[0] and visible(x, team) and team not in x.workers), None)
                if tk is not None and t - tk.spawn >= 1.5:  # walk the plate to the pass
                    leftovers[team].remove(lo)
                    tk.workers[team] = t
                    deliver(team, lo[0], tk, lo[1])
        # cooks choose work
        for team in order:
            for cook in (0, 1):
                if cook_free[team][cook] > t:
                    continue
                if plates_out[team] >= rules.plates:
                    stats["idle"][team] += dt
                    continue
                best = None
                best_score = 0.0
                for tk in tickets:
                    if not visible(tk, team) or team in tk.workers:
                        continue
                    if RECIPES[tk.recipe][3] and not can_take_premium(tk.recipe):
                        stats["stock_blocked"] += 1
                        continue
                    if any(lo[0] == tk.recipe for lo in leftovers[team]):
                        continue
                    if rules.claims and (1 - team) in tk.workers:
                        continue
                    my_finish = t + est_elapsed(team, tk.recipe)
                    if my_finish - tk.spawn > rules.lifetime:
                        continue
                    p_win = 1.0
                    rival = tk.workers.get(1 - team)
                    if rival is not None:
                        p_win = 1.0 / (1.0 + math.exp((my_finish - rival) / 2.0)) if teams[team].smart else 0.5
                    hands = RECIPES[tk.recipe][0] + (MARKET_TRIP if RECIPES[tk.recipe][3] else 0)
                    s = tk.value * p_win / hands
                    if s > best_score:
                        best, best_score = tk, s
                if best is not None and best_score > 1.0:
                    start_job(team, cook, best.recipe, best)
                elif rules.stockpile and t >= rules.prep - 15 and len(leftovers[team]) + len([j for j in jobs if j.team == team and j.ticket is None]) < 2:
                    r = rng.choices(["salad", "burger"], weights=[1, 1])[0]
                    start_job(team, cook, r, None)
                else:
                    stats["idle"][team] += dt
        timeline.append((round(t, 1), score[0], score[1]))
        t += dt
    for team in (0, 1):
        stats["wasted"][team] += len(leftovers[team])
    return score, timeline, stats, log


def summarize(rules: Rules, teams: Tuple[Team, Team], n: int, seed: int = 7):
    rng = random.Random(seed)
    margins, comebacks, late_changes, wins0 = [], 0, 0, 0
    contested = deliveries = expired = wasted = idle = knocks = 0
    prem_share = []
    burger_share = []
    for i in range(n):
        score, tl, st, _ = run_round(rules, teams, rng)
        w, l = max(score), min(score)
        margins.append((w - l) / w if w > 0 else 0)
        if score[0] > score[1]:
            wins0 += 1
        at180 = next(x for x in tl if x[0] >= rules.rush_at)
        lead180 = (at180[1] > at180[2]) - (at180[1] < at180[2])
        final = (score[0] > score[1]) - (score[0] < score[1])
        if lead180 != 0 and final != 0 and lead180 != final:
            comebacks += 1
        # any change of leader in last 60 s
        leaders = [(x[1] > x[2]) - (x[1] < x[2]) for x in tl if x[0] >= rules.rush_at]
        nz = [x for x in leaders if x != 0]
        if any(nz[k] != nz[k - 1] for k in range(1, len(nz))):
            late_changes += 1
        contested += st["contested"]
        deliveries += st["deliveries"]
        expired += st["expired"]
        wasted += sum(st["wasted"])
        idle += sum(st["idle"])
        knocks += st["knocks"]
        tot = sum(score)
        prem_share.append(sum(st["premium_points"]) / tot if tot else 0)
        burger_share.append(st["by_recipe"]["burger"] / max(1, st["deliveries"]))
    margins.sort()
    return dict(
        scenario=rules.name,
        avg_margin=sum(margins) / n,
        median_margin=margins[n // 2],
        close_rounds=sum(1 for m in margins if m < 0.10) / n,
        late_lead_change=late_changes / n,
        comeback_after_180=comebacks / n,
        team0_win=wins0 / n,
        served_per_round=deliveries / n,
        contested_share=contested / max(1, deliveries),
        expired_per_round=expired / n,
        wasted_per_round=wasted / n,
        idle_pct=idle / n / (4 * rules.round_len),
        knocks_per_round=knocks / n,
        premium_point_share=sum(prem_share) / n,
        burger_share=sum(burger_share) / n,
    )


def fmt(rows):
    keys = ["scenario", "team0_win", "avg_margin", "close_rounds", "late_lead_change", "comeback_after_180",
            "served_per_round", "contested_share", "expired_per_round", "wasted_per_round", "idle_pct",
            "knocks_per_round", "premium_point_share", "burger_share"]
    print("\t".join(keys))
    for r in rows:
        out = []
        for k in keys:
            v = r[k]
            out.append(v if isinstance(v, str) else f"{v:.2f}")
        print("\t".join(out))


EVEN = (Team(1.0), Team(1.0))
GAP10 = (Team(0.9), Team(1.0))   # crew A 10% faster
GAP25 = (Team(0.8), Team(1.0))   # crew A 25% faster

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "trace":
        score, tl, st, log = run_round(Rules(name="trace", stockpile=False, cold_after=20, spawn=7, rush_spawn=5), GAP10, random.Random(3), trace=True)
        print("\n".join(log))
        print("FINAL", score, st["delivered"])
        with open("timeline.csv", "w") as f:
            f.write("t,crewA,crewB\n")
            for x in tl[::50]:
                f.write(f"{x[0]},{x[1]:.0f},{x[2]:.0f}\n")
        sys.exit(0)

    N = 800
    rows = []
    base = Rules()
    def add(name, teams, **kw):
        rows.append(summarize(Rules(**{**base.__dict__, **kw, "name": name}), teams, N))
    add("A baseline | even", EVEN)
    add("A baseline | A 10% faster", GAP10)
    add("A baseline | A 25% faster", GAP25)
    add("B more tickets 7s/5s | even", EVEN, spawn=7, rush_spawn=5)
    add("B more tickets 7s/5s | A 10% faster", GAP10, spawn=7, rush_spawn=5)
    add("B more tickets 5s/4s | even", EVEN, spawn=5, rush_spawn=4)
    tuned = dict(spawn=7, rush_spawn=5, stockpile=False, cold_after=20.0, market_always_enough=True)
    add("C +no stockpile, food cools | even", EVEN, **tuned)
    add("C +no stockpile, food cools | A 10% faster", GAP10, **tuned)
    add("D +runner-up pays 50% | even", EVEN, runner_up=0.5, **tuned)
    add("D +runner-up pays 50% | A 10% faster", GAP10, runner_up=0.5, **tuned)
    add("D +runner-up pays 50% | A 25% faster", GAP25, runner_up=0.5, **tuned)
    add("E claims (draft, no race) | even", EVEN, claims=True, **tuned)
    add("E claims (draft, no race) | A 10% faster", GAP10, claims=True, **tuned)
    add("F D without critic/rush | A 10% faster", GAP10, runner_up=0.5, critic=False, rush_mult=1.0, **tuned)
    add("G D, naive crew B | even", (Team(1.0, smart=True), Team(1.0, smart=False)), runner_up=0.5, **tuned)
    fmt(rows)
