from sim import *
N = 400
rows = []
for spawn, rush in ((7, 5), (5, 4), (4, 3)):
    for ru in (0.0, 0.25):
        for label, teams in (("even", EVEN), ("A 10% faster", GAP10)):
            r = Rules(name=f"spawn {spawn}/{rush} runner-up {ru} | {label}", spawn=spawn, rush_spawn=rush, stockpile=False,
                      cold_after=20.0, market_always_enough=True, runner_up=ru, max_tickets=6)
            rows.append(summarize(r, teams, N))
fmt(rows)
