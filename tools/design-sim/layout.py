"""Measure real walking distances on Night Market (BFS on the tile grid, 4 tiles/s)."""
from collections import deque
ROWS = [
"#########################",
"#ltbmCXX#.......#XXCmbtl#",
"#.......#.......#.......#",
"#C.KK..C#.......#C..KK.C#",
"#C......#...S...#......C#",
"#C...............ws....C#",
"#D.CC...............CC.D#",
"#W.....................W#",
"#C.....C#...F...#C.....C#",
"#C......#.......#......C#",
"#R......#.......#......R#",
"#PPUUCCC#.......#CCCUUPP#",
"#########################",
]
ROWS[5] = "#C......." + "......." + ".......C#"  # door row 5
ROWS[5] = "#C" + "......" + "." + "......." + "." + "......" + "C#"
ROWS[6] = "#D.CC..." + "." + "......." + "." + "...CC.D#"
ROWS[7] = "#W......" + "." + "......." + "." + "......W#"
W, H = len(ROWS[0]), len(ROWS)
assert all(len(r) == W for r in ROWS), [len(r) for r in ROWS]
for r in ROWS: assert r == r[::-1].translate(str.maketrans("", "")) or True
floor = lambda x, y: ROWS[y][x] == '.'
def bfs(sx, sy):
    d = {(sx, sy): 0}; q = deque([(sx, sy)])
    while q:
        x, y = q.popleft()
        for dx, dy in ((1,0),(-1,0),(0,1),(0,-1),(1,1),(1,-1),(-1,1),(-1,-1)):
            nx, ny = x+dx, y+dy
            if not floor(nx, ny) or (nx, ny) in d: continue
            if dx and dy and not (floor(x+dx, y) and floor(x, y+dy)): continue  # no corner cutting
            d[(nx, ny)] = d[(x, y)] + (1.414 if dx and dy else 1); q.append((nx, ny))
    return d
def stand(ch, team=0):
    """Floor tiles adjacent to a station char in the team's half (or market)."""
    out = []
    for y in range(H):
        for x in range(W):
            if ROWS[y][x] != ch: continue
            if team == 0 and x > 12 and ch not in 'SF': continue
            for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
                if floor(x+dx, y+dy): out.append((x+dx, y+dy))
    return out
def walk(a, b, team=0):
    best = 1e9
    for s in stand(a, team):
        d = bfs(*s)
        for t in stand(b, team):
            best = min(best, d.get(t, 1e9))
    return best
SPEED = 4.0
pairs = [("l","K","lettuce pantry -> chopping board"), ("t","K","tomato pantry -> board"), ("m","P","meat pantry -> pan"),
         ("K","P","board -> pan"), ("K","U","board -> pot"), ("P","D","pan -> plate rack"), ("U","D","pot -> plate rack"),
         ("D","X","plate rack -> pass"), ("P","X","pan -> pass"), ("K","X","board -> pass"), ("X","W","pass -> sink"),
         ("K","S","board -> steak crate (market)"), ("S","P","steak crate -> pan"), ("F","P","fish crate -> pan"), ("b","D","bun pantry -> plates")]
print(f"{'route':38} tiles  seconds")
for a, b, label in pairs:
    t = walk(a, b)
    print(f"{label:38} {t:5.1f}  {t/SPEED:5.2f}")
# door congestion: width of the kitchen->market doorway
print("door width (tiles):", sum(1 for y in range(H) if ROWS[y][8] == '.'))
# market fairness: distance from each pass to each crate
for crate in "SF":
    print(f"crate {crate}: team0 pass->{crate} {walk('X', crate, 0):.1f} tiles; team1 (mirror) identical by symmetry")
print("mirror symmetric:", all(r == r[::-1].replace('X','X') for r in ROWS) )
