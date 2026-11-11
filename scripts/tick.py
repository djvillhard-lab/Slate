"""Slate tick: the number work, run free on GitHub every 10 minutes.

Reads DJ's slate and settings from Supabase, then:
  1. scores/D       live and final scores plus moved start times for every game of the day
  2. odds           the current line for every slate (and requested) game, into previews/D
  3. recaps         freezes a written recap 50 minutes after it was written
  4. leagues        standings, AP poll and league news for tonight's leagues (every 3 hours)
  5. work/D         the games Claude needs to write (new, line moved, injuries changed, news due,
                    recap due) plus the ESPN facts it needs, so the Claude run skips all fetching
  6. standouts/X    player rankings for yesterday and today
D = the Central date four hours ago, so late games still count for the evening they started.
Needs SUPABASE_SECRET in the environment. Standard library only.
"""
import json, os, sys, re, datetime, urllib.request, urllib.parse, subprocess, concurrent.futures as cf
from zoneinfo import ZoneInfo

CT = ZoneInfo("America/Chicago"); ET = ZoneInfo("America/New_York"); UTC = datetime.timezone.utc
SB = "https://xpkzcdaawaqiqgwkkwst.supabase.co"
KEY = os.environ.get("SUPABASE_SECRET", "")
DRY = "--dry" in sys.argv
HERE = os.path.dirname(os.path.abspath(__file__))

PATHS = {
    "nfl": ["football/nfl"], "ncaaf": ["football/college-football&groups=80&limit=500", "football/college-football&groups=81&limit=500"],
    "nba": ["basketball/nba"], "wnba": ["basketball/wnba"],
    "ncaam": ["basketball/mens-college-basketball&groups=50&limit=500"], "ncaaw": ["basketball/womens-college-basketball&groups=50&limit=500"],
    "nhl": ["hockey/nhl"], "mlb": ["baseball/mlb"], "mls": ["soccer/usa.1"], "epl": ["soccer/eng.1"],
    "ucl": ["soccer/uefa.champions"], "uel": ["soccer/uefa.europa"], "laliga": ["soccer/esp.1"], "seriea": ["soccer/ita.1"],
    "bundesliga": ["soccer/ger.1"], "ligue1": ["soccer/fra.1"], "facup": ["soccer/eng.fa"],
}
def base(lg): return PATHS[lg][0].split("&")[0]
SPORT = {"nba": "bb", "wnba": "bb", "ncaam": "bb", "ncaaw": "bb", "nfl": "fb", "ncaaf": "fb", "nhl": "hk", "mlb": "base"}
COLLEGE = {"ncaaf", "ncaam", "ncaaw"}

# ---------- small helpers ----------
def now_utc(): return datetime.datetime.now(UTC)
def iso(t): return t.astimezone(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
def parse(s):
    if not s: return None
    s = str(s).replace("Z", "+00:00")
    if re.match(r".*T\d\d:\d\d\+", s): s = s.replace("+", ":00+", 1)
    try: return datetime.datetime.fromisoformat(s).astimezone(UTC)
    except Exception: return None

def get(url, tries=3):
    for _ in range(tries):
        try: return json.load(urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "slate-tick"}), timeout=30))
        except Exception: pass
    return {}

def sb_get(paths):
    q = "select=path,data,updated_at&path=in.(" + ",".join(urllib.parse.quote(p, safe="/-") for p in paths) + ")"
    req = urllib.request.Request(SB + "/rest/v1/docs?" + q, headers={"apikey": KEY, "Authorization": "Bearer " + KEY})
    rows = json.load(urllib.request.urlopen(req, timeout=30))
    return {r["path"]: r["data"] for r in rows}

WRITES = []
def sb_put(path, data, merge=False):
    WRITES.append(path + (" (merge)" if merge else ""))
    if DRY:
        os.makedirs("/tmp/tick", exist_ok=True); json.dump(data, open("/tmp/tick/" + path.replace("/", "_") + ".json", "w"), indent=1); return
    body = json.dumps({"p_path": path, "p_data": data, "p_merge": merge}).encode()
    for i in range(2):
        try:
            req = urllib.request.Request(SB + "/rest/v1/rpc/mirror_doc", data=body, method="POST",
                                         headers={"apikey": KEY, "Authorization": "Bearer " + KEY, "Content-Type": "application/json"})
            urllib.request.urlopen(req, timeout=30); return
        except Exception as e:
            if i: print("write failed", path, e)

def ct_hour(t):  # hour in Central; midnight-4 AM counts as late (24-27)
    h = t.astimezone(CT).hour
    return h + 24 if h < 4 else h

# ---------- the slate, same rules as the app ----------
NATIONAL_TV = ["ABC", "CBS", "NBC", "FOX", "ESPN", "ESPN2", "ESPNU", "ESPNEWS", "TNT", "TBS", "truTV", "NBCSN", "FS1", "FS2", "CBSSN", "USA", "NBA TV", "NHL Network", "MLB Network", "NFL Network", "BTN", "SEC Network", "ACC Network", "CW", "Golf Channel", "Tennis Channel", "beIN SPORTS", "Telemundo", "Universo", "Univision", "TUDN", "UniMás", "ESPN Deportes", "Fox Deportes"]
NAT_EXTRA = {"nba": ["prime video", "peacock"], "wnba": ["prime video", "ion"], "mlb": ["apple tv", "netflix", "peacock"], "epl": ["cnbc"], "ncaam": ["peacock"], "ncaaf": ["peacock", "prime video"]}
LG_OPTS = {
    "ncaaf": ["ranked", "national", "all"], "ncaam": ["ranked", "national", "all"], "ncaaw": ["ranked", "national", "all"],
    "nfl": ["prime", "division", "winning", "all"],
    "nba": ["national", "top", "winning", "all"], "nhl": ["national", "top", "winning", "all"], "wnba": ["national", "top", "winning", "all"],
    "mlb": ["national", "winning", "all"],
    "epl": ["bigsix", "top", "national", "all"],
    "ucl": ["bigsix", "national", "all"], "uel": ["bigsix", "national", "all"], "facup": ["bigsix", "national", "all"],
    "mls": ["top", "national", "all"], "laliga": ["top", "national", "all"], "seriea": ["top", "national", "all"], "bundesliga": ["top", "national", "all"], "ligue1": ["top", "national", "all"],
    "intl": ["national", "all"],
}
CHOICES = {"ranked": ["both", "top10", "any"], "bigsix": ["both", "any"]}
TOP_N = {"nba": 4, "nhl": 4, "wnba": 4, "epl": 6, "mls": 4, "laliga": 4, "seriea": 4, "bundesliga": 4, "ligue1": 4}
BIG_SIX = ["arsenal", "chelsea", "liverpool", "manchester city", "manchester united", "tottenham"]
NFL_DIV = {}
for i, d in enumerate([["BUF", "MIA", "NE", "NYJ"], ["BAL", "CIN", "CLE", "PIT"], ["HOU", "IND", "JAX", "JAC", "TEN"], ["DEN", "KC", "LV", "LAC"],
                       ["DAL", "NYG", "PHI", "WSH", "WAS"], ["CHI", "DET", "GB", "MIN"], ["ATL", "CAR", "NO", "TB"], ["ARI", "LAR", "LA", "SF", "SEA"]]):
    for t in d: NFL_DIV[t] = i + 1
EVENT_RX = re.compile(r"(classic|tournament|invitational|showcase|challenge|rivalry|cup|bowl|final|playoff|championship|derby|world series|battle|clash|tip-off|tipoff|opener)", re.I)
RULE_DEFAULT_BY = {"ncaaf": {"ranked": "both"}, "ncaam": {"ranked": "both"}}
COL_SPORT = {"Men's basketball": "ncaam", "Women's basketball": "ncaaw", "Football": "ncaaf"}

def norm_rules(r):
    r = r or {}
    o = {"favorites": True, "events": True, "after": 0, "max": 0, "by": {}}
    if isinstance(r.get("favorites"), bool): o["favorites"] = r["favorites"]
    if isinstance(r.get("events"), bool): o["events"] = r["events"]
    if r.get("after") in (0, 17, 18, 19, 20): o["after"] = r["after"]
    if r.get("max") in (0, 4, 6, 8, 10): o["max"] = r["max"]
    def put(k, key, v):
        if key in LG_OPTS.get(k, []): o["by"].setdefault(k, {})[key] = v
    if r.get("v") == 2:
        for k, b in (r.get("by") or {}).items():
            for key in LG_OPTS.get(k, []):
                v = (b or {}).get(key)
                if key in CHOICES and v in CHOICES[key]: put(k, key, v)
                elif key not in CHOICES and v is True: put(k, key, True)
    elif any(x in r for x in ("ranked", "leagues", "natLeagues", "national")):
        if r.get("ranked") in CHOICES["ranked"]: put("ncaaf", "ranked", r["ranked"]); put("ncaam", "ranked", r["ranked"])
        for k in r.get("natLeagues") or []: put(k, "national", True)
        for k in r.get("leagues") or []: put(k, "all", True)
        if r.get("national") is True:
            for k in LG_OPTS: put(k, "national", True)
    else: o["by"] = json.loads(json.dumps(RULE_DEFAULT_BY))
    return o

def parse_team(t):
    m = re.match(r"^(.*?)\s*\((Men's basketball|Women's basketball|Football)\)$", str(t or "").strip())
    return (m.group(1), COL_SPORT[m.group(2)]) if m else (str(t or "").strip(), "")

def is_fav_name(name, lg, teams):
    n = (name or "").lower()
    for t in teams:
        tn, tl = parse_team(t); tn = tn.lower()
        if tn and (n == tn or tn in n) and not (tl and lg and tl != lg): return True
    return False

def abbr(g, side):
    a = g.get(side + "Abbr")
    if not a: parts = str(g.get("id", "")).split("-"); a = (parts[1] if side == "away" else parts[2]) if len(parts) > 2 else ""
    return (a or "").upper()[:4]

def nat_for(g):
    x = NAT_EXTRA.get(g.get("league"), [])
    for n in g.get("tv") or []:
        if n in NATIONAL_TV: return True
        l = str(n).lower()
        if any(l == e or l.startswith(e + " ") for e in x): return True
    return False

def win_rec(g, s):
    try: p = [int(x) for x in str(g.get(s + "Record") or "").split("-")]
    except ValueError: return False
    if len(p) < 2: return False
    return p[0] > p[1] + (p[2] if len(p) > 2 else 0) if g.get("league") == "nhl" else p[0] > p[1]

def stand_no(g, s):
    m = re.match(r"^(\d+)", str(g.get(s + "Standing") or "")); return int(m.group(1)) if m else 0

def match(key, g, v):
    if key == "ranked":
        ra, rh = int(g.get("awayRank") or 0), int(g.get("homeRank") or 0); both = ra and rh
        ok = both if v == "both" else ((ra and ra <= 10) or (rh and rh <= 10)) if v == "top10" else (ra or rh) if v == "any" else False
        if not ok: return None
        return 80 - (ra + rh) / 4 if both else 62 if v == "top10" else 35
    if key == "bigsix":
        a = any(c in str(g.get("away", "")).lower() for c in BIG_SIX); h = any(c in str(g.get("home", "")).lower() for c in BIG_SIX)
        return 76 if v == "both" and a and h else 46 if v == "any" and (a or h) else None
    if key == "top":
        n = TOP_N.get(g.get("league"), 4); a, h = stand_no(g, "away"), stand_no(g, "home")
        return 70 if a and h and a <= n and h <= n else None
    if key == "prime": t = parse(g.get("start")); return 66 if t and ct_hour(t) >= 19 else None
    if key == "division": a, h = NFL_DIV.get(abbr(g, "away")), NFL_DIV.get(abbr(g, "home")); return 56 if a and a == h else None
    if key == "national": return 55 if nat_for(g) else None
    if key == "winning": return 52 if win_rec(g, "away") and win_rec(g, "home") else None
    if key == "all": return 40
    return None

def compute_slate(games, rules, teams, lineup):
    r = norm_rules(rules); L = lineup or {}
    v2 = L.get("v") == 2
    added = (L.get("added") or []) if v2 else (L.get("ids") or [])
    removed = set(L.get("removed") or []) if v2 else set()
    cands = []
    for g in games:
        fav = r["favorites"] and (is_fav_name(g.get("away"), g.get("league"), teams) or is_fav_name(g.get("home"), g.get("league"), teams))
        hits = [100] if fav else []
        b = r["by"].get(g.get("league"), {})
        for key in LG_OPTS.get(g.get("league"), []):
            if b.get(key):
                m = match(key, g, b[key])
                if m is not None: hits.append(m)
        note = g.get("note") or ""
        if r["events"] and EVENT_RX.search(note) and not re.search(r"group (play|stage)", note, re.I): hits.append(60)
        if not hits or g["id"] in removed: continue
        t = parse(g.get("start"))
        if not fav and r["after"] and t and ct_hour(t) < r["after"]: continue
        cands.append((max(hits), g.get("start") or "", fav, g["id"]))
    cands.sort(key=lambda c: (-c[0], c[1]))
    if r["max"]:
        favs = [c for c in cands if c[2]]; rest = [c for c in cands if not c[2]]
        cands = favs + rest[:max(0, r["max"] - len(favs))]
    ids = [c[3] for c in cands]
    known = {g["id"] for g in games}
    for i in added:
        if i not in ids and i not in removed and i in known: ids.append(i)
    return ids

def my_team_ids(games, teams):
    return [g["id"] for g in games if is_fav_name(g.get("away"), g.get("league"), teams) or is_fav_name(g.get("home"), g.get("league"), teams)]

# ---------- ESPN ----------
def scoreboard_events(lg, day):  # day: Central date; ESPN dates are Eastern, so fetch that date and the next
    out = {}
    d0 = datetime.date.fromisoformat(day)
    for p in PATHS[lg]:
        path, _, extra = p.partition("&")
        for d in (d0, d0 + datetime.timedelta(days=1)):
            url = f"https://site.api.espn.com/apis/site/v2/sports/{path}/scoreboard?dates={d.strftime('%Y%m%d')}" + ("&" + extra if extra else "")
            for ev in get(url).get("events", []): out[ev["id"]] = ev
    return list(out.values())

def norm(s): return re.sub(r"[^a-z0-9]", "", str(s or "").lower())

def find_event(g, events):
    gt = parse(g.get("start")); best = None
    for ev in events:
        comp = (ev.get("competitions") or [{}])[0]; cs = {c.get("homeAway"): c for c in comp.get("competitors", [])}
        if "home" not in cs or "away" not in cs: continue
        def same(side):
            t = cs[side].get("team", {})
            return norm(t.get("displayName")) == norm(g.get(side)) or (abbr(g, side) and t.get("abbreviation", "").upper() == abbr(g, side))
        if not (same("away") and same("home")): continue
        et = parse(ev.get("date"))
        if gt and et and abs((et - gt).total_seconds()) > 3 * 3600: continue
        best = ev; break
    return best

def ev_state(ev):
    st = ev.get("status", {}).get("type", {})
    return st.get("state"), st.get("shortDetail") or st.get("detail") or ""

def ev_scores(ev):
    comp = ev["competitions"][0]; cs = {c["homeAway"]: c for c in comp["competitors"]}
    def n(x):
        try: return int(float(x))
        except Exception: return 0
    return n(cs["away"].get("score")), n(cs["home"].get("score"))

def short_leaders(team_block):
    out = []
    for cat in (team_block or {}).get("leaders", [])[:3]:
        for l in cat.get("leaders", [])[:1]:
            out.append({"cat": cat.get("displayName") or cat.get("name"), "name": l.get("athlete", {}).get("displayName"), "value": l.get("displayValue")})
    return out

def summary_facts(g, ev):
    lg = g["league"]; s = get(f"https://site.api.espn.com/apis/site/v2/sports/{base(lg)}/summary?event={ev['id']}")
    comp = ev["competitions"][0]; cs = {c["homeAway"]: c for c in comp["competitors"]}
    ids = {cs[k]["team"]["id"]: k for k in cs}
    f = {"event": ev["id"], "start": ev.get("date")}
    pc = (s.get("pickcenter") or [None])[0] or ((comp.get("odds") or [None])[0])
    if pc:
        o = {"provider": {"Draft Kings": "DraftKings", "Fan Duel": "FanDuel"}.get((pc.get("provider") or {}).get("name"), (pc.get("provider") or {}).get("name"))}
        det = pc.get("details"); sp = pc.get("spread")
        if SPORT.get(lg) in ("bb", "fb"):
            if det: o["spread"] = det
        elif sp not in (None, "") and det:
            mla, mlh = (pc.get("awayTeamOdds") or {}).get("moneyLine"), (pc.get("homeTeamOdds") or {}).get("moneyLine")
            fav = "home" if (mlh or 0) < (mla or 0) else "away"
            o["spread"] = f"{abbr(g, fav)} -{abs(float(sp)):g}"
        if pc.get("overUnder") is not None: o["total"] = pc["overUnder"]
        ml = {}
        for side in ("away", "home"):
            v = (pc.get(side + "TeamOdds") or {}).get("moneyLine")
            if v is not None: ml[side] = v
        if ml: o["ml"] = ml
        o = {k: v for k, v in o.items() if v not in (None, "", {})}
        if len(o) > 1: f["odds"] = o
    inj = []
    for blk in s.get("injuries", []):
        side = ids.get(blk.get("team", {}).get("id")); a = abbr(g, side) if side else blk.get("team", {}).get("abbreviation", "")
        rows = [(i.get("athlete", {}).get("displayName"), i.get("status")) for i in blk.get("injuries", [])
                if str(i.get("status", "")).lower() in ("out", "doubtful", "questionable", "day-to-day")]
        for nm, stt in rows[:4]: inj.append(f"{a}: {nm} {str(stt).lower()}")
    f["injuries"] = inj
    lead = {}
    for blk in s.get("leaders", []):
        side = ids.get(blk.get("team", {}).get("id"))
        if side: lead[side] = short_leaders(blk)
    if lead: f["leaders"] = lead
    l5 = {}
    for blk in s.get("lastFiveGames", []):
        side = ids.get(blk.get("team", {}).get("id"))
        if side: l5[side] = "".join(e.get("gameResult", "")[:1] for e in reversed(blk.get("events", [])))
    if l5: f["last5"] = l5
    ser = [x for x in s.get("seasonseries", []) if x.get("type") == "season"] or s.get("seasonseries", [])
    if ser:
        x = ser[0]; done = [e for e in x.get("events", []) if e.get("status") == "post"]
        f["series"] = {"summary": x.get("summary") or x.get("seriesScore"), "games": x.get("totalCompetitions"), "played": len(done)}
    pr = s.get("predictor") or {}
    if pr.get("homeTeam"): f["projection"] = {"home": pr["homeTeam"].get("gameProjection"), "away": (pr.get("awayTeam") or {}).get("gameProjection")}
    v = (s.get("gameInfo") or {}).get("venue") or {}
    if v.get("fullName"): f["venue"] = v["fullName"] + (", " + v.get("address", {}).get("city", "") if v.get("address", {}).get("city") else "")
    if lg not in SPORT:  # soccer
        sq = {}
        for tid, side in ids.items():
            top, hurt = squad(lg, tid); sq[side] = top
            for h in hurt: f.setdefault("injuries", []).append(f"{abbr(g, side)}: {h}")
        f["squad"] = sq
    teams_ids = set(ids)
    news = []
    for a in (s.get("news") or {}).get("articles", [])[:8]:
        cats = {str(c.get("teamId")) for c in a.get("categories", []) if c.get("teamId")}
        url = ((a.get("links") or {}).get("web") or {}).get("href", "")
        if cats & teams_ids and url.startswith("https"): news.append({"title": a.get("headline"), "source": "ESPN", "url": url, "at": a.get("published")})
    if news: f["espnNews"] = news[:4]
    return f

# soccer: ESPN's game data is thin, but its squad list carries each player's season numbers and injuries
def squad(lg, tid):
    d = get(f"https://site.api.espn.com/apis/site/v2/sports/{base(lg)}/teams/{tid}/roster")
    top, hurt = [], []
    for a in d.get("athletes", []):
        v = {x.get("name"): x.get("value") or 0 for c in ((a.get("statistics") or {}).get("splits") or {}).get("categories", []) for x in c.get("stats", [])}
        if v.get("appearances"):
            top.append((v.get("totalGoals", 0) * 3 + v.get("goalAssists", 0) * 2, {"name": a.get("displayName"), "pos": (a.get("position") or {}).get("abbreviation"),
                        "apps": int(v.get("appearances", 0)), "goals": int(v.get("totalGoals", 0)), "assists": int(v.get("goalAssists", 0)),
                        "shots": int(v.get("totalShots", 0)), "saves": int(v.get("saves", 0)) or None}))
        for inj in a.get("injuries") or []:
            hurt.append(f"{a.get('displayName')} {str(inj.get('status') or 'injured').lower()}")
    top.sort(key=lambda x: -x[0])
    return [t[1] for t in top[:5]], hurt[:4]

# ---------- change detection ----------
def fnum(x):
    try: return float(str(x).replace("+", ""))
    except Exception: return None

def spread_num(s):
    m = re.search(r"([A-Z0-9]+)\s*([+-]?\d+(\.\d+)?)", str(s or ""))
    return (m.group(1), float(m.group(2))) if m else (None, None)

def basis_of(facts):
    o = facts.get("odds") or {}
    # v: the writing rules the words follow (2 = no betting lines in the text); older words get rewritten once
    return {"v": 2, "spread": o.get("spread"), "total": o.get("total"), "ml": o.get("ml"), "injuries": sorted(facts.get("injuries") or []), "start": facts.get("start")}

def line_moved(lg, old, new):
    sp = SPORT.get(lg) or "soccer"
    ot, ov = spread_num(old.get("spread")); nt, nv = spread_num(new.get("spread"))
    if ot and nt and ot != nt and (ov or 0) != 0 and (nv or 0) != 0: return "favorite flipped"
    if ov is not None and nv is not None:
        d = abs(abs(ov) - abs(nv))
        if sp in ("bb", "fb") and d >= 1: return "spread moved"
        if sp == "fb":
            for k in (3, 7):
                if (abs(ov) < k) != (abs(nv) < k): return "spread crossed %d" % k
    a, b = fnum(old.get("total")), fnum(new.get("total"))
    if a is not None and b is not None:
        lim = 2 if sp == "bb" else 1 if sp == "fb" else 0.5
        if abs(a - b) >= lim: return "total moved"
    if sp in ("hk", "base", "soccer"):
        om, nm = old.get("ml") or {}, new.get("ml") or {}
        for side in ("away", "home"):
            x, y = fnum(om.get(side)), fnum(nm.get(side))
            if x is not None and y is not None and abs(x - y) >= 30: return "moneyline moved"
        x, y = fnum(om.get("home")), fnum(nm.get("home"))
        if x is not None and y is not None and (x < 0) != (y < 0): return "favorite flipped"
    return None

def why_rewrite(g, entry, facts, now, start, state):
    """Reasons Claude should (re)write this preview; empty list = leave the words alone."""
    why = []
    if not entry.get("summary") or not entry.get("long") or not entry.get("watch"): return ["new preview"]
    b = entry.get("basis")
    if b and b.get("v") != 2: return ["new preview"]
    if b:
        nb = basis_of(facts)
        mv = line_moved(g["league"], b, nb)
        if mv: why.append(mv)
        if sorted(b.get("injuries") or []) != nb["injuries"]: why.append("injuries changed")
        bt, nt = parse(b.get("start")), parse(nb.get("start"))
        if bt and nt and abs((bt - nt).total_seconds()) >= 60: why.append("start time moved")
    # news: hourly in the 3 hours before the start, every 4 hours otherwise; not during the game
    if state == "pre":
        na = parse(entry.get("newsAt")); mins = (start - now).total_seconds() / 60 if start else 9999
        gap = 60 if mins <= 180 else 240
        if not na or (now - na).total_seconds() / 60 >= gap - 5: why.append("news check")
    return why

# ---------- league extras ----------
def standings(lg, team_abbrs, conf_names):
    path = base(lg); sp = "nfl" if lg == "nfl" else None
    d = get(f"https://site.api.espn.com/apis/v2/sports/{path}/standings" + ("?level=3" if lg == "nfl" else ""))
    groups = []
    def walk(node):
        if node.get("children"):
            for c in node["children"]: walk(c)
        elif node.get("standings"): groups.append(node)
    walk(d)
    out = []
    for grp in groups:
        rows = []
        for e in grp["standings"].get("entries", []):
            st = {}
            for x in e.get("stats", []): st.setdefault(x.get("name"), x.get("displayValue"))
            t = e.get("team", {})
            if lg in SPORT and lg not in ("nhl",) and SPORT[lg] != "soccer":
                extra = st.get("gamesBehind")
            elif lg == "nhl": extra = (st.get("points") or "") + " pts"
            else: extra = (st.get("points") or "") + " pts"
            seed = st.get("playoffSeed") or st.get("rank") or ""
            rows.append({"seed": float(seed) if str(seed).replace(".", "").isdigit() else 999, "abbr": t.get("abbreviation"),
                         "team": t.get("shortDisplayName") or t.get("displayName"), "record": st.get("overall") or "", "extra": extra or ""})
        rows.sort(key=lambda r: r["seed"])
        for i, r in enumerate(rows): r["rank"] = i + 1; r.pop("seed")
        name = grp.get("abbreviation") if lg in ("nba", "nhl", "wnba") and grp.get("abbreviation") else grp.get("name")
        if lg in COLLEGE or lg == "nfl":
            if not any(r["abbr"] in team_abbrs for r in rows): continue
        out.append({"name": name, "rows": rows})
    return out

def poll(lg):
    d = get(f"https://site.api.espn.com/apis/site/v2/sports/{base(lg)}/rankings")
    rks = d.get("rankings") or []
    pick = None
    if lg == "ncaaf": pick = next((r for r in rks if "playoff" in str(r.get("name", "")).lower()), None)
    pick = pick or next((r for r in rks if "ap" in str(r.get("name", "")).lower()), None) or (rks[0] if rks else None)
    if not pick: return None, None
    rows = [{"rank": r.get("current"), "abbr": r.get("team", {}).get("abbreviation"), "team": r.get("team", {}).get("nickname") or r.get("team", {}).get("location"),
             "record": r.get("recordSummary", "")} for r in pick.get("ranks", [])[:25]]
    return pick.get("name"), rows

def league_news(lg):
    d = get(f"https://site.api.espn.com/apis/site/v2/sports/{base(lg)}/news")
    out = []
    for a in d.get("articles", []):
        url = ((a.get("links") or {}).get("web") or {}).get("href", "")
        if url.startswith("https") and a.get("headline"): out.append({"title": a["headline"], "source": "ESPN", "url": url})
        if len(out) >= 6: break
    return out

# ---------- team pages: Claude's take on DJ's teams (daily and after each game) and on teams he asks about ----------
PRO_ORDER = ["nfl", "nba", "mlb", "nhl", "mls", "epl", "wnba", "laliga", "seriea", "bundesliga", "ligue1", "ucl"]
_TEAMS = {}
def team_index(lg):
    if lg not in _TEAMS:
        d = get(f"https://site.api.espn.com/apis/site/v2/sports/{base(lg)}/teams?limit=1000")
        idx = {}
        for t in ((d.get("sports") or [{}])[0].get("leagues") or [{}])[0].get("teams", []):
            t = t.get("team", {}); idx[norm(t.get("displayName"))] = {"id": t.get("id"), "abbr": t.get("abbreviation", ""), "name": t.get("displayName")}
        _TEAMS[lg] = idx
    return _TEAMS[lg]

def resolve_team(entry):
    name, lg = parse_team(entry)
    for cand in ([lg] if lg else PRO_ORDER + ["ncaam"]):
        t = team_index(cand).get(norm(name))
        if t: return dict(t, league=cand, key=f"{cand}-{t['abbr'].lower()}")
    return None

def team_facts(t):
    lg, tid = t["league"], t["id"]; b = base(lg)
    info = get(f"https://site.api.espn.com/apis/site/v2/sports/{b}/teams/{tid}").get("team", {})
    sch = get(f"https://site.api.espn.com/apis/site/v2/sports/{b}/teams/{tid}/schedule").get("events", [])
    news = get(f"https://site.api.espn.com/apis/site/v2/sports/{b}/news?team={tid}&limit=8").get("articles", [])
    done, nxt = [], []
    for e in sch:
        c = (e.get("competitions") or [{}])[0]; st = (c.get("status") or {}).get("type", {}).get("state")
        me = next((x for x in c.get("competitors", []) if str(x.get("team", {}).get("id")) == str(tid)), None)
        op = next((x for x in c.get("competitors", []) if x is not me), None)
        if not me or not op: continue
        sc = lambda x: (x.get("score") or {}).get("displayValue") if isinstance(x.get("score"), dict) else x.get("score")
        row = {"event": e.get("id"), "date": e.get("date"), "opp": op.get("team", {}).get("displayName"), "home": me.get("homeAway") == "home"}
        if st == "post":
            row.update({"score": f"{sc(me)}-{sc(op)}", "result": "W" if me.get("winner") else "L" if op.get("winner") else "T"}); done.append(row)
        elif st == "pre":
            row["tv"] = [n for bc in c.get("broadcasts", []) for n in ([bc.get("media", {}).get("shortName")] if bc.get("media") else bc.get("names", [])) if n][:2]; nxt.append(row)
    rec = ((info.get("record") or {}).get("items") or [{}])[0].get("summary")
    sq_top, sq_hurt = squad(lg, tid) if lg not in SPORT else ([], [])
    return {"name": t["name"], "league": lg, "abbr": t["abbr"], "record": rec, "standing": info.get("standingSummary"),
            "recent": done[-6:], "upcoming": nxt[:3], **({"squad": sq_top, "injuries": sq_hurt} if lg not in SPORT else {}),
            "news": [{"title": a.get("headline"), "url": ((a.get("links") or {}).get("web") or {}).get("href"), "at": a.get("published")}
                     for a in news if ((a.get("links") or {}).get("web") or {}).get("href", "").startswith("https")][:6]}

def team_work(docs, now, sett, load, todo, out_facts):
    want = {}
    for entry in sett.get("teams") or []:
        t = resolve_team(entry)
        if t: want[t["key"]] = (t, "favorite")
    for key in load.get("teams") or []:
        if key in want: continue
        lg, _, ab = key.partition("-")
        if lg not in PATHS: continue
        t = next((dict(v, league=lg, key=key) for v in team_index(lg).values() if v["abbr"].lower() == ab), None)
        if t: want[key] = (t, "requested")
    if not want: return
    have = sb_get([f"teams/{k}" for k in want])
    for key, (t, kind) in want.items():
        f = team_facts(t)
        doc = have.get(f"teams/{key}") or {}
        last = (f["recent"][-1] or {}).get("event") if f["recent"] else None
        why = []
        if not doc.get("summary"): why.append("new")
        elif kind == "favorite":
            at = parse(doc.get("at"))
            if (doc.get("basis") or {}).get("last") != last: why.append("game since")
            elif not at or (now - at).total_seconds() > 20 * 3600: why.append("daily")
        if kind == "requested" and "new" not in why: why.append("requested")
        if why:
            f["basis"] = {"last": last}
            todo.append({"kind": "team", "key": key, "why": why}); out_facts["team:" + key] = f

# ---------- main ----------
def main():
    if not KEY: sys.exit("SUPABASE_SECRET is not set")
    now = now_utc()
    D = (now.astimezone(CT) - datetime.timedelta(hours=4)).date().isoformat()
    TODAY = now.astimezone(CT).date().isoformat()
    YEST = (now.astimezone(CT).date() - datetime.timedelta(days=1)).isoformat()
    PREV = (datetime.date.fromisoformat(D) - datetime.timedelta(days=1)).isoformat()
    slate_paths = [f"slates/{D}", f"slates/{D}-ncaam", f"slates/{D}-ncaaw", f"slates/{D}-ncaaf"]
    docs = sb_get(slate_paths + [f"scores/{D}", f"previews/{D}", f"previews/{PREV}", f"scores/{PREV}", "prefs/notify", "prefs/load",
                                 f"mine/lineup-{D}", f"mine/user-lineup-{D}", "mine/user-settings", f"work/{D}", f"standouts/{YEST}", f"standouts/{TODAY}", f"standouts/{D}"])
    games, seen = [], set()
    for p in slate_paths:
        for g in (docs.get(p) or {}).get("games") or []:
            if not g or not g.get("id") or not g.get("home"): continue
            k = (g["league"] + "|" + g["away"] + "|" + g["home"] + "|" + str(g.get("start"))[:13]).lower()
            if g["id"] in seen or k in seen: continue
            seen.add(g["id"]); seen.add(k); games.append(g)
    byid = {g["id"]: g for g in games}
    # the app keeps its own copies (mine/user-...): those are what DJ sees, so they win
    sett = docs.get("mine/user-settings") or docs.get("prefs/notify") or {}
    teams = sett.get("teams") or []
    lineup = docs.get(f"mine/user-lineup-{D}") or docs.get(f"mine/lineup-{D}")
    slate = compute_slate(games, sett.get("rules"), teams, lineup)
    load = docs.get("prefs/load") or {}
    requested = [i for i in (load.get("previews") or []) if load.get("previewDate") == D and i in byid and i not in slate]
    mine = my_team_ids(games, teams)
    print(f"D={D} games={len(games)} slate={len(slate)} requested={len(requested)} myteams={len(mine)}")

    # ---- 1. scores for every league with a game today
    leagues = sorted({g["league"] for g in games if g["league"] in PATHS})
    with cf.ThreadPoolExecutor(8) as ex: evmap = dict(zip(leagues, ex.map(lambda lg: scoreboard_events(lg, D), leagues)))
    old_scores = (docs.get(f"scores/{D}") or {}).get("games") or {}
    sc = dict(old_scores); state = {}; evs = {}
    for g in games:
        ev = find_event(g, evmap.get(g["league"], []))
        if not ev: continue
        evs[g["id"]] = ev
        st, det = ev_state(ev); state[g["id"]] = st
        if st in ("in", "post"):
            a, h = ev_scores(ev); sc[g["id"]] = {"a": a, "h": h, "state": st, "detail": det}
        elif st == "pre":
            et, gt = parse(ev.get("date")), parse(g.get("start"))
            if et and gt and abs((et - gt).total_seconds()) >= 60: sc[g["id"]] = {"state": "pre", "start": iso(et)}
            elif g["id"] in sc and sc[g["id"]].get("state") == "pre": sc.pop(g["id"])
    if sc != old_scores or f"scores/{D}" not in docs:
        sb_put(f"scores/{D}", {"date": D, "updatedAt": iso(now), "games": sc})
    for i, s in sc.items(): state.setdefault(i, s.get("state"))

    # ---- 2. facts and odds for the games that get previews
    focus = slate[:12] + requested
    def start_of(i):
        s = sc.get(i, {}); return parse(s.get("start")) if s.get("state") == "pre" and s.get("start") else parse(byid[i].get("start"))
    pre_focus = [i for i in focus if i in evs and state.get(i) != "post"]
    with cf.ThreadPoolExecutor(6) as ex: facts = dict(zip(pre_focus, ex.map(lambda i: summary_facts(byid[i], evs[i]), pre_focus)))
    pv_doc = docs.get(f"previews/{D}") or {}; pv = pv_doc.get("games") or {}
    patch = {}
    for i, f in facts.items():
        e = pv.get(i) or {}
        if f.get("odds") and f["odds"] != e.get("odds") and state.get(i) == "pre": patch.setdefault(i, {})["odds"] = f["odds"]
        if e.get("summary") and not e.get("basis"): patch.setdefault(i, {})["basis"] = basis_of(f)  # first time: treat as current

    # ---- 3. recaps: freeze 50 minutes after writing; flag missing ones
    todo = []
    def recap_pass(day, doc, out_patch, ids, states):
        for i in ids:
            e = (doc.get("games") or {}).get(i) or {}
            if states.get(i) != "post": continue
            r = e.get("recap")
            if r and not r.get("final"):
                ea = parse(r.get("endedAt"))
                if ea and (now - ea).total_seconds() >= 50 * 60: out_patch.setdefault(i, {})["recap"] = {"final": True}
            elif not r: todo.append({"date": day, "id": i, "why": ["recap"]})
    recap_pass(D, pv_doc, patch, focus, state)
    # last night's late finishers (after the run that covered that date stopped)
    prev_doc = docs.get(f"previews/{PREV}") or {}; prev_patch = {}; prev_games = {}
    prev_scores = (docs.get(f"scores/{PREV}") or {}).get("games") or {}
    prev_ids = [i for i, e in (prev_doc.get("games") or {}).items() if not e.get("recap") or not e["recap"].get("final")]
    if prev_ids:
        recap_pass(PREV, prev_doc, prev_patch, prev_ids, {i: (prev_scores.get(i) or {}).get("state") for i in prev_ids})
    if prev_patch: sb_put(f"previews/{PREV}", {"games": prev_patch}, merge=True)

    # ---- 4. what Claude should write
    work_facts = {}
    for i in focus:
        if state.get(i) == "post" or i not in facts: continue
        e = dict(pv.get(i) or {}); e.update(patch.get(i, {}))
        why = why_rewrite(byid[i], e, facts[i], now, start_of(i), state.get(i) or "pre")
        if why: todo.append({"date": D, "id": i, "why": why}); work_facts[i] = facts[i]
    for t in todo:
        if t["why"] == ["recap"]: work_facts.setdefault(t["id"], {"event": (evs.get(t["id"]) or {}).get("id"), "league": byid.get(t["id"], {}).get("league")})
    KEEP = ("league", "start", "away", "home", "awayShort", "homeShort", "awayAbbr", "homeAbbr", "awayRank", "homeRank", "awayRecord", "homeRecord",
            "awayStanding", "homeStanding", "awayConf", "homeConf", "tv", "note", "neutral")
    for i in work_facts:
        if "odds" in work_facts[i] or "injuries" in work_facts[i]: work_facts[i]["basis"] = basis_of(work_facts[i])
        g = byid.get(i) or (prev_games.get(i) if i in prev_games else None)
        if g: work_facts[i]["game"] = {k: g[k] for k in KEEP if g.get(k) not in (None, "", [])}

    # ---- 5. league extras (standings, poll, news) every 3 hours per league
    lg_patch = {}
    focus_leagues = sorted({byid[i]["league"] for i in focus if i in byid})
    old_lg = pv_doc.get("leagues") or {}
    for lg in focus_leagues:
        at = parse((old_lg.get(lg) or {}).get("updatedAt"))
        if at and (now - at).total_seconds() < 3 * 3600: continue
        ab = {abbr(byid[i], s) for i in focus if i in byid and byid[i]["league"] == lg for s in ("away", "home")}
        x = {"updatedAt": iso(now)}
        stn = standings(lg, ab, set()) if lg in PATHS else []
        if stn: x["standings"] = stn
        if lg in COLLEGE:
            nm, rows = poll(lg)
            if rows: x["poll"] = rows; x["pollName"] = nm
        nw = league_news(lg)
        if nw: x["news"] = nw
        lg_patch[lg] = x
    if patch or lg_patch:
        body = {"date": D}
        if patch: body["games"] = patch
        if lg_patch: body["leagues"] = lg_patch
        sb_put(f"previews/{D}", body, merge=True)

    # ESPN team ids for the app's team pages (ESPN's team list can't be read from a web page directly)
    ids_doc = sb_get(["code/teamids"]).get("code/teamids") or {}
    at = parse(ids_doc.get("at"))
    if not at or (now - at).total_seconds() > 3 * 86400:
        allids = {"at": iso(now)}
        for lg in PATHS:
            idx = team_index(lg)
            if idx: allids[lg] = {k: [v["id"], v["abbr"]] for k, v in idx.items()}
        if len(allids) > 5: sb_put("code/teamids", allids)
    # team summaries: checked once an hour (and right away when DJ asks for one)
    old_w = docs.get(f"work/{D}") or {}
    if now.minute < 10 or (load.get("teams") and not any(t.get("kind") == "team" for t in old_w.get("todo", []))):
        team_work(docs, now, sett, load, todo, work_facts)
    else:  # keep the team items from the last hourly check until they're written
        for t in old_w.get("todo", []):
            if t.get("kind") == "team":
                d0 = sb_get([f"teams/{t['key']}"]).get(f"teams/{t['key']}") or {}
                f0 = (old_w.get("facts") or {}).get("team:" + t["key"]) or {}
                if (d0.get("basis") or {}).get("last") != (f0.get("basis") or {}).get("last") or not d0.get("summary") or "requested" in t["why"] and t["key"] in (load.get("teams") or []):
                    todo.append(t); work_facts["team:" + t["key"]] = f0
    work = {"date": D, "updatedAt": iso(now), "slate": slate, "requested": requested, "myTeams": mine,
            "loadDates": load.get("dates") or [], "todo": todo, "facts": work_facts}
    old_work = docs.get(f"work/{D}") or {}
    if {k: v for k, v in old_work.items() if k != "updatedAt"} != {k: v for k, v in work.items() if k != "updatedAt"} or not old_work or \
            (now - (parse(old_work.get("updatedAt")) or now)).total_seconds() > 1800:
        sb_put(f"work/{D}", work)

    # ---- 6. player rankings
    days = []
    if not (docs.get(f"standouts/{YEST}") or {}).get("final"): days.append(YEST)
    for d in sorted({TODAY, D}):
        if d == YEST: continue
        started = any((sc.get(g["id"]) or {}).get("state") in ("in", "post") for g in games if g["league"] in ("nba", "wnba", "ncaam", "ncaaw", "nhl", "nfl", "ncaaf", "mlb")) if d == D else False
        if started and not (docs.get(f"standouts/{d}") or {}).get("final"): days.append(d)
    for d in days:
        out = f"/tmp/standouts-{d}.json"
        r = subprocess.run([sys.executable, os.path.join(HERE, "standouts.py"), d, out], capture_output=True, text=True)
        if r.returncode == 0 and os.path.exists(out):
            data = json.load(open(out))
            if data.get("leagues"): sb_put(f"standouts/{d}", data)
        else: print("standouts failed", d, r.stderr[-300:])

    print("todo:", [(t.get("id") or t.get("key"), t["why"]) for t in todo])
    print("writes:", WRITES or "none")

if __name__ == "__main__":
    main()
