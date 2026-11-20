import json,sys
base=[
'#########################',
'#XXCCC.C#.......#C.CCCXX#',
'#...........L...........#',
'#K.....................K#',
'#K.CC..C#.#...#.#C..CC.K#',
'#C.....W#.......#W.....C#',
'#b.....D#.#.T.#.#D.....b#',
'#m.CC..C#.......#C..CC.m#',
'#s.....C#.#...#.#C.....s#',
'#f.....................f#',
'#...........L...........#',
'#PPUURCC#.......#CCRUUPP#',
'#########################',
]
def setm(rows,y,mid):  # mid = cols 8..16 string (9 chars)
    r=list(rows); s=r[y]; assert len(mid)==9; r[y]=s[:8]+mid+s[17:]; return r
V={}
# twin tomato beds, center becomes planter
V['twinT']=setm(base,6,'#.T.#.T.#')
# twin tomato beds, center open
V['twinTopen']=setm(base,6,'#.T...T.#')
V['twinTdeep']=setm(base,6,'#.#T#T#.#')
# bottom lane sells tomato instead of lettuce; centre bed sells lettuce
_sw=list(setm(base,6,'#.#.L.#.#')); _sw[10]=base[10].replace('L','T'); V['swapLanes']=_sw
for k,v in V.items():
    for row in v: assert row==row[::-1].translate(str.maketrans('',''))[::-1] and len(row)==25
    # mirror check (legend symmetric chars)
    for row in v: assert row==row[::-1], (k,row)
name=sys.argv[1]
print(json.dumps(V[name]))
