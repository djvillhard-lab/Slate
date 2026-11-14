"""Rank last night's individual performances by league from ESPN box scores.
Usage: python3 standouts.py YYYY-MM-DD [out.json]
Writes {"date","updatedAt","leagues":{lg:[...top 15...]},"games":n}. Night = the Central-time date of the start."""
import json, re, sys, datetime, urllib.request, concurrent.futures as cf
from zoneinfo import ZoneInfo
CT = ZoneInfo("America/Chicago")
LEAGUES = {  # key: (path, extra query, kind)
    "nba": ("basketball/nba", "", "bball"), "wnba": ("basketball/wnba", "", "bball"),
    "ncaam": ("basketball/mens-college-basketball", "&groups=50&limit=500", "bball"),
    "ncaaw": ("basketball/womens-college-basketball", "&groups=50&limit=500", "bball"),
    "nhl": ("hockey/nhl", "", "hockey"), "nfl": ("football/nfl", "", "football"),
    "ncaaf": ("football/college-football", "&groups=80&limit=500", "football"),
    "mlb": ("baseball/mlb", "", "baseball"),
}
TOP = 25

def get(url):
    for _ in range(3):
        try: return json.load(urllib.request.urlopen(url, timeout=30))
        except Exception: pass
    return {}

def num(x):
    try: return float(str(x).replace("+", ""))
    except Exception: return 0.0

def made(x):
    try: m, a = str(x).split("-"); return float(m), float(a)
    except Exception: return 0.0, 0.0

def fmt(n): return str(int(n)) if float(n).is_integer() else f"{n:.1f}"

def events(path, extra, day):
    d = datetime.date.fromisoformat(day); out = {}
    for dd in (d, d + datetime.timedelta(days=1)):
        for e in get(f"https://site.api.espn.com/apis/site/v2/sports/{path}/scoreboard?dates={dd:%Y%m%d}{extra}").get("events", []):
            start = datetime.datetime.fromisoformat(e["date"].replace("Z", "+00:00")).astimezone(CT).date().isoformat()
            if start == day and e["status"]["type"].get("state") in ("post", "in"): out[e["id"]] = e
    return list(out.values())

def bball(g):
    L = g["labels"]; s = dict(zip(L, g["stats"]))
    pts, reb, ast, stl, blk, to, pf = (num(s.get(k)) for k in ("PTS", "REB", "AST", "STL", "BLK", "TO", "PF"))
    fgm, fga = made(s.get("FG")); ftm, fta = made(s.get("FT")); tpm, _ = made(s.get("3PT"))
    oreb, dreb = num(s.get("OREB")), num(s.get("DREB"))
    score = pts + 0.4 * fgm - 0.7 * fga - 0.4 * (fta - ftm) + 0.7 * oreb + 0.3 * dreb + stl + 0.7 * ast + 0.7 * blk - 0.4 * pf - to
    parts = [f"{fmt(pts)} PTS", f"{fmt(reb)} REB", f"{fmt(ast)} AST"]
    ex = []   # 4th and 5th: what stood out most, with field goals as the fallback (same as the page)
    if fga: ex.append((0.6 + (1 if fga >= 10 and fgm / fga >= 0.6 else 0), f"{fmt(fgm)}-{fmt(fga)} FG"))
    if tpm: ex.append((tpm / 3, f"{fmt(tpm)} 3PM"))
    if stl: ex.append((stl / 2, f"{fmt(stl)} STL"))
    if blk: ex.append((blk / 2, f"{fmt(blk)} BLK"))
    parts += [x[1] for x in sorted(ex, key=lambda x: -x[0])[:2]]
    return score, " · ".join(parts), s.get("FG", "") and f"{s.get('FG')} FG"

def hockey(group, g, final=True):
    s = dict(zip(g["labels"], g["stats"]))
    if group == "goalies":
        sv, ga = num(s.get("SV")), num(s.get("GA"))
        if sv + ga < 10: return None
        score = 2 + 0.2 * sv - 1.5 * ga + (3 if ga == 0 and final else 0)
        pct = s.get("SV%") or (f"{sv / (sv + ga):.3f}" if sv + ga else "")
        line = f"{fmt(sv)} SV · {fmt(ga)} GA" + (f" · {pct.lstrip('0')} SV%" if pct else "") + (" · Shutout" if ga == 0 and final else "")
        return score, line, ""
    gl, a, pm, sog = num(s.get("G")), num(s.get("A")), num(s.get("+/-")), num(s.get("S"))   # ESPN: S = shots, SOG = shootout goals
    score = 3 * gl + 2 * a + 0.5 * pm + 0.3 * sog + 0.1 * (num(s.get("HT")) + num(s.get("BS")))
    parts = [f"{fmt(gl)} G", f"{fmt(a)} A", f"{fmt(sog)} SOG", ("+" if pm > 0 else "") + fmt(pm) + " +/-"]
    ht, bs, fw, fl = (num(s.get(x)) for x in ("HT", "BS", "FW", "FL")); ex = []
    if ht >= 4: ex.append((ht / 4, f"{fmt(ht)} HIT"))
    if bs >= 3: ex.append((bs / 3, f"{fmt(bs)} BLK"))
    if fw + fl >= 10 and fw / (fw + fl) >= 0.6: ex.append((1.1, f"{fmt(fw)}-{fmt(fl)} FO"))
    if s.get("TOI"): ex.append((0.9, f"{s.get('TOI')} TOI"))
    if ex: parts.append(max(ex, key=lambda x: x[0])[1])
    return score, " · ".join(parts), s.get("TOI", "") and f"{s.get('TOI')} TOI"

def football(groups):
    """groups: {group name: stats dict} for one player"""
    sc, parts = 0.0, []
    p = groups.get("passing")
    if p:
        c, a = (p.get("C/ATT", "0/0").split("/") + ["0"])[:2]
        y, td, it = num(p.get("YDS")), num(p.get("TD")), num(p.get("INT"))
        sc += 0.04 * y + 4 * td - 2 * it
        if y >= 100 or td: parts.append(f"{fmt(y)} pass yds · {fmt(td)} TD" + (f" · {fmt(it)} INT" if it else "") + f" · {c}/{a} cmp" + (f" · {p.get('RTG')} RTG" if num(p.get("RTG")) else ""))
    r = groups.get("rushing")
    if r:
        y, td, car = num(r.get("YDS")), num(r.get("TD")), num(r.get("CAR")); sc += 0.1 * y + 6 * td
        if y >= 40 or td: parts.append(f"{fmt(y)} rush yds" + (f" · {fmt(td)} TD" if td else "") + (f" · {fmt(car)} car" if car else "") + (f" · {y / car:.1f} ypc" if car >= 5 else ""))
    w = groups.get("receiving")
    if w:
        n, y, td, tg, lo = (num(w.get(x)) for x in ("REC", "YDS", "TD", "TGTS", "LONG")); sc += 0.5 * n + 0.1 * y + 6 * td
        if y >= 40 or td: parts.append(f"{fmt(n)} rec · {fmt(y)} yds" + (f" · {fmt(td)} TD" if td else "") + (f" · {fmt(tg)} tgt" if tg else "") + (f" · {fmt(lo)} long" if lo else ""))
    d = groups.get("defensive")
    if d:
        tk, sk, tfl, qh, pd = (num(d.get(x)) for x in ("TOT", "SACKS", "TFL", "QB HTS", "PD")); sc += 0.3 * tk + 2 * sk
        if sk or tk >= 8: parts.append(f"{fmt(tk)} TKL" + (f" · {fmt(sk)} sacks" if sk else "") + (f" · {fmt(tfl)} TFL" if tfl else "") + (f" · {fmt(qh)} QB hits" if qh else "") + (f" · {fmt(pd)} PD" if pd else ""))
    it = groups.get("interceptions")
    if it:
        n = num(it.get("INT")); sc += 3 * n
        if n: parts.append(f"{fmt(n)} INT")
    return sc, " · ".join(parts), ""

def baseball(group, g):
    s = dict(zip(g["labels"], g["stats"]))
    if group == "pitching":
        ip = num(s.get("IP")); k, er, h, bb = (num(s.get(x)) for x in ("K", "ER", "H", "BB"))
        if ip < 3: return None
        return 1.5 * ip + k - 2 * er - 0.5 * (h + bb), f"{s.get('IP')} IP · {fmt(k)} K · {fmt(er)} ER · {fmt(h)} H · {fmt(bb)} BB", ""
    h, hr, rbi, r, sb, bb = (num(s.get(x)) for x in ("H", "HR", "RBI", "R", "SB", "BB"))
    if not (h or bb): return None
    parts = [f"{fmt(h)}-{s.get('AB', '0')}"] + ([f"{fmt(hr)} HR"] if hr else []) + ([f"{fmt(rbi)} RBI"] if rbi else []) + ([f"{fmt(r)} R"] if r else []) + ([f"{fmt(bb)} BB"] if bb else []) + ([f"{fmt(sb)} SB"] if sb else [])
    return h + 3 * hr + rbi + r + 1.5 * sb + 0.5 * bb, " · ".join(parts), ""

def game_rows(lg, path, kind, ev):
    s = get(f"https://site.api.espn.com/apis/site/v2/sports/{path}/summary?event={ev['id']}")
    comp = ev["competitions"][0]
    teams = {c["team"]["id"]: c for c in comp["competitors"]}
    st = ev["status"]["type"]; live = st.get("state") == "in"
    # ESPN can leave a decided game at "End of 4th" (in progress) for a long while: count it as final
    cs = comp.get("competitors", [])
    if live and len(cs) == 2 and num(cs[0].get("score")) != num(cs[1].get("score")) and re.match(r"End of (4th|Regulation|2nd Half|3rd Period)", st.get("shortDetail") or st.get("detail") or "", re.I): live = False
    def result(tid):
        me = teams.get(tid); opp = next((c for k, c in teams.items() if k != tid), None)
        if not me or not opp: return "", ""
        a, b = num(me.get("score")), num(opp.get("score"))
        if live: return (opp["team"].get("abbreviation", ""), f"{fmt(a)}-{fmt(b)}")
        return (opp["team"].get("abbreviation", ""), ("W" if a > b else "L" if a < b else "T") + f" {fmt(a)}-{fmt(b)}")
    rows = []
    for team in s.get("boxscore", {}).get("players", []):
        t = team.get("team", {}); tid = t.get("id"); opp, res = result(tid)
        if lg.startswith("ncaa") and not teams.get(tid, {}).get("team", {}).get("conferenceId"): continue   # non-Division I opponent
        base = {"team": t.get("abbreviation", ""), "teamName": t.get("displayName", ""), "color": "#" + t["color"] if t.get("color") else "", "opp": opp, "result": res, "home": teams.get(tid, {}).get("homeAway") == "home", "ev": ev["id"]}
        if live: base["live"] = True; base["detail"] = st.get("shortDetail", "")
        if kind == "football":
            per = {}
            for grp in team.get("statistics", []):
                labels = grp.get("labels", [])
                for a in grp.get("athletes", []):
                    nm = a["athlete"]["displayName"]; per.setdefault(nm, {"pos": a["athlete"].get("position", {}).get("abbreviation", ""), "id": a["athlete"].get("id", "")})
                    per[nm][grp.get("name")] = dict(zip(labels, a.get("stats", [])))
            for nm, groups in per.items():
                pos = groups.pop("pos", ""); aid = groups.pop("id", "")
                sc, line, extra = football(groups)
                if line: rows.append({**base, "name": nm, "id": aid, "pos": pos, "score": round(sc, 1), "line": line, "extra": extra})
            continue
        seen = set()
        for grp in team.get("statistics", []):
            labels = grp.get("labels", [])
            for a in grp.get("athletes", []):
                if not a.get("stats") or a.get("didNotPlay"): continue
                key = (a["athlete"].get("id"), grp.get("name") == "goalies")
                if key in seen: continue   # hockey lists skaters twice (by position, then all skaters)
                seen.add(key)
                g = {"labels": labels, "stats": a["stats"]}
                try:
                    r = bball(g) if kind == "bball" else hockey(grp.get("name"), g, not live) if kind == "hockey" else baseball(grp.get("name"), g)
                except Exception:
                    r = None
                if not r: continue
                sc, line, extra = r
                rows.append({**base, "name": a["athlete"]["displayName"], "id": a["athlete"].get("id", ""), "pos": a["athlete"].get("position", {}).get("abbreviation", ""), "score": round(sc, 1), "line": line, "extra": extra})
    return rows

def run(day):
    out = {"date": day, "updatedAt": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"), "leagues": {}, "games": {}, "events": {}, "live": {}}
    with cf.ThreadPoolExecutor(12) as ex:
        evs = {lg: ex.submit(events, p, x, day) for lg, (p, x, k) in LEAGUES.items()}
        evs = {lg: f.result() for lg, f in evs.items()}
        for lg, lst in evs.items():
            if not lst: continue
            p, x, k = LEAGUES[lg]
            rows = [r for f in [ex.submit(game_rows, lg, p, k, e) for e in lst] for r in f.result()]
            rows.sort(key=lambda r: -r["score"])
            top = rows[:TOP]
            for i, r in enumerate(top): r["rank"] = i + 1
            out["leagues"][lg] = [{k: r[k] for k in ("rank", "name", "id", "pos", "team", "teamName", "color", "opp", "home", "result", "line", "score", "ev", "live", "detail") if r.get(k) not in (None, "", False)} for r in top]
            out["games"][lg] = len(lst)
            out["events"][lg] = [e["id"] for e in lst if e["status"]["type"].get("state") == "post"]
            n_live = sum(1 for e in lst if e["status"]["type"].get("state") == "in")
            if n_live: out["live"][lg] = n_live
    out["final"] = not out["live"]
    return out

if __name__ == "__main__":
    day = sys.argv[1]
    o = run(day)
    path = sys.argv[2] if len(sys.argv) > 2 else None
    s = json.dumps(o, separators=(",", ":"))
    if path: open(path, "w").write(s)
    else: print(s)
