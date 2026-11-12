"""Slate day documents: every game for a date, built straight from ESPN. Free (runs on GitHub).

Replaces the Claude "morning slate" run. Writes, per date:
  slates/<date>            pro, soccer and international games
  slates/<date>-ncaam|ncaaw|ncaaf   every D-I basketball and FBS + FCS football game
For dates beyond the next two days, only slates/<date> is written, with the college games that are on
national TV, have a ranked team, or involve one of DJ's teams.

  python3 slates.py                    today and the next three days (Central)
  python3 slates.py 2026-11-14 ...     exactly those dates, all four documents, plus scores for past dates
  add --dry to print instead of writing
Needs SUPABASE_SECRET. Standard library only.
"""
import json, os, sys, re, datetime, urllib.request, concurrent.futures as cf
from zoneinfo import ZoneInfo

CT = ZoneInfo("America/Chicago"); UTC = datetime.timezone.utc
SB = "https://xpkzcdaawaqiqgwkkwst.supabase.co"
KEY = os.environ.get("SUPABASE_SECRET", "")
DRY = "--dry" in sys.argv

FEEDS = {
    "nfl": ["football/nfl"], "nba": ["basketball/nba"], "wnba": ["basketball/wnba"], "nhl": ["hockey/nhl"], "mlb": ["baseball/mlb"],
    "mls": ["soccer/usa.1"], "epl": ["soccer/eng.1"], "ucl": ["soccer/uefa.champions"], "uel": ["soccer/uefa.europa"],
    "laliga": ["soccer/esp.1"], "seriea": ["soccer/ita.1"], "bundesliga": ["soccer/ger.1"], "ligue1": ["soccer/fra.1"], "facup": ["soccer/eng.fa"],
    "intl": ["soccer/fifa.friendly", "soccer/uefa.nations", "soccer/concacaf.nations.league", "soccer/uefa.euroq", "soccer/fifa.worldq.uefa",
             "soccer/fifa.worldq.conmebol", "soccer/fifa.worldq.concacaf", "soccer/concacaf.gold", "soccer/conmebol.america", "soccer/fifa.world"],
    "ncaaf": ["football/college-football&groups=80&limit=500", "football/college-football&groups=81&limit=500"],
    "ncaam": ["basketball/mens-college-basketball&groups=50&limit=500"],
    "ncaaw": ["basketball/womens-college-basketball&groups=50&limit=500"],
}
PROS = {"nfl", "nba", "wnba", "nhl", "mlb"}
COLLEGE = {"ncaaf", "ncaam", "ncaaw"}
SOCCER = {"mls", "epl", "ucl", "uel", "laliga", "seriea", "bundesliga", "ligue1", "facup", "intl"}
NATIONS = ["united states", "usa", "argentina", "brazil", "france", "england", "spain", "germany", "portugal", "netherlands", "italy",
           "belgium", "croatia", "uruguay", "mexico", "colombia", "morocco", "japan", "switzerland", "denmark", "canada", "senegal",
           "south korea", "korea republic"]
NATIONAL_TV = {"ESPN", "ESPN2", "ESPNU", "ABC", "FOX", "FS1", "FS2", "CBS", "CBSSN", "NBC", "USA", "TNT", "truTV", "TBS", "BTN",
               "SEC Network", "ACC Network", "CW", "Peacock"}
RENAME = {"CBS Sports Network": "CBSSN", "CBS Sports Net": "CBSSN", "USA Net": "USA", "USA Network": "USA", "SECN": "SEC Network",
          "ACCN": "ACC Network", "Big Ten Network": "BTN", "B1G Network": "BTN", "Fox": "FOX", "NHL Net": "NHL Network", "NBA TV": "NBA TV",
          "truTV": "truTV", "TRUTV": "truTV", "Tru TV": "truTV", "HBO Max": "HBO Max", "Max": "HBO Max", "Prime Video": "Prime Video",
          "Amazon Prime Video": "Prime Video", "Apple TV+": "Apple TV", "Paramount+": "Paramount+", "ESPN Unlimited": "ESPN+",
          "The CW": "CW", "CW Network": "CW", "MLB Net": "MLB Network", "NFL Net": "NFL Network"}
LINEAR = ["ABC", "CBS", "NBC", "FOX", "ESPN", "ESPN2", "ESPNU", "ESPNEWS", "TNT", "TBS", "truTV", "FS1", "FS2", "CBSSN", "USA", "NBA TV",
          "NHL Network", "MLB Network", "NFL Network", "BTN", "SEC Network", "ACC Network", "CW", "Universo", "Telemundo"]
CONF = {"America East Conference": "America East", "American Conference": "AAC", "Atlantic 10 Conference": "A-10", "Atlantic Coast Conference": "ACC",
        "Atlantic Sun Conference": "ASUN", "Big 12 Conference": "Big 12", "Big East Conference": "Big East", "Big Sky Conference": "Big Sky",
        "Big South Conference": "Big South", "Big Ten Conference": "Big Ten", "Big West Conference": "Big West", "Coastal Athletic Association": "CAA",
        "Conference USA": "CUSA", "FBS Independents": "Independent", "FCS Independents": "Independent", "Horizon League": "Horizon", "Ivy League": "Ivy",
        "Metro Atlantic Athletic Conference": "MAAC", "Metro Conference": "MAAC", "Mid-American Conference": "MAC", "Mid-Eastern Athletic Conference": "MEAC",
        "Missouri Valley Conference": "MVC", "Missouri Valley Football Conference": "MVFC", "Mountain West Conference": "MWC", "Northeast Conference": "NEC",
        "Ohio Valley Conference": "OVC", "Pac-12 Conference": "Pac-12", "Patriot League": "Patriot", "Pioneer Football League": "Pioneer",
        "Southeastern Conference": "SEC", "Southern Conference": "SoCon", "Southland Conference": "Southland", "Southwestern Athletic Conference": "SWAC",
        "Summit League": "Summit", "Sun Belt Conference": "Sun Belt", "United Athletic Conference": "UAC", "West Coast Conference": "WCC",
        "Western Athletic Conference": "WAC"}

def get(url, tries=2):
    for _ in range(tries):
        try: return json.load(urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "slate"}), timeout=30))
        except Exception: pass
    return {}

def sb_get(paths):
    q = ",".join(paths)
    r = urllib.request.Request(f"{SB}/rest/v1/docs?select=path,data&path=in.({q})", headers={"apikey": KEY, "Authorization": "Bearer " + KEY})
    return {x["path"]: x["data"] for x in json.load(urllib.request.urlopen(r, timeout=30))}

def sb_put(path, data):
    if DRY: print("would write", path, len(json.dumps(data)), "bytes"); return
    b = json.dumps({"p_path": path, "p_data": data, "p_merge": False}).encode()
    r = urllib.request.Request(f"{SB}/rest/v1/rpc/mirror_doc", data=b, method="POST",
                               headers={"apikey": KEY, "Authorization": "Bearer " + KEY, "Content-Type": "application/json"})
    urllib.request.urlopen(r, timeout=30)

def iso(t): return t.astimezone(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
def parse(s):
    try: return datetime.datetime.fromisoformat(str(s).replace("Z", "+00:00"))
    except Exception: return None
def ordinal(n): return f"{n}{'th' if 10 <= n % 100 <= 20 else {1: 'st', 2: 'nd', 3: 'rd'}.get(n % 10, 'th')}"

def events(lg, day):
    """Every event that starts on this Central date (ESPN dates are Eastern: fetch the day and the next)."""
    d = datetime.date.fromisoformat(day); out = {}
    urls = []
    for feed in FEEDS[lg]:
        path, _, extra = feed.partition("&")
        for dd in (d, d + datetime.timedelta(days=1)):
            urls.append((feed, f"https://site.api.espn.com/apis/site/v2/sports/{path}/scoreboard?dates={dd:%Y%m%d}" + ("&" + extra if extra else "")))
    with cf.ThreadPoolExecutor(6) as ex:
        res = list(ex.map(lambda u: (u[0], get(u[1])), urls))
    for feed, j in res:
        lname = ((j.get("leagues") or [{}])[0] or {}).get("name", "")
        for e in j.get("events") or []:
            t = parse(e.get("date"))
            if not t or t.astimezone(CT).date().isoformat() != day: continue
            if (((e.get("status") or {}).get("type") or {}).get("name")) in ("STATUS_CANCELED", "STATUS_CANCELLED"): continue
            e["_league_name"] = lname
            out[e.get("id")] = e
    return list(out.values())

_stand = {}
def standings(lg):
    """team abbreviation -> (conference, position text) from ESPN's standings feed."""
    if lg in _stand: return _stand[lg]
    m = {}
    paths = {"ncaaf": ["football/college-football", "football/college-football?group=81"]}.get(lg) or [p.split("&")[0] for p in FEEDS[lg]]
    for p in paths:
        u = "https://site.api.espn.com/apis/v2/sports/" + (p.replace("?", "/standings?") if "?" in p else p + "/standings")
        j = get(u)
        for c in j.get("children") or []:
            name, ab = c.get("name") or "", c.get("abbreviation") or ""
            for e in ((c.get("standings") or {}).get("entries") or []):
                tm = (e.get("team") or {}).get("id")
                if not tm: continue
                st = {s.get("name"): s.get("value") for s in e.get("stats") or []}
                pos = st.get("playoffSeed") or st.get("rank")
                label = ""
                if lg in ("nba", "nhl", "wnba"): label = ab if ab in ("East", "West") else ab
                elif lg == "nfl": label = ab
                elif lg == "mlb": label = ab
                elif lg in SOCCER: label = name.replace("Group ", "") if name.startswith("Group ") else ""
                text = ""
                try:
                    if pos and int(pos) > 0: text = (ordinal(int(pos)) + (" " + label if label else "")).strip()
                except Exception: pass
                m[tm] = (CONF.get(name, ab), text)
    _stand[lg] = m
    return m

def fix_tv(name):
    n = str(name or "").strip()
    return RENAME.get(n, n)

def tv_for(lg, comp, mine_side):
    names = []
    for b in comp.get("broadcasts") or []:
        mk = str(b.get("market") or "national").lower()
        if mk != "national" and mk != mine_side: continue
        for n in b.get("names") or []: names.append(fix_tv(n))
    for gb in comp.get("geoBroadcasts") or []:
        med = (gb.get("media") or {}).get("shortName"); typ = ((gb.get("type") or {}).get("shortName") or "").lower()
        mkt = ((gb.get("market") or {}).get("type") or "").lower()
        if typ == "radio" or not med: continue
        if mkt == "national": names.append(fix_tv(med))
        elif mine_side and mkt == mine_side: names.append(fix_tv(med))  # a regional channel, only for DJ's St. Louis teams
    seen, out = set(), []
    for n in names:
        if not n or n in seen or re.search(r"radio|\bAM\b|\bFM\b", n, re.I): continue
        seen.add(n); out.append(n)
    out.sort(key=lambda n: (0, LINEAR.index(n)) if n in LINEAR else (1, 0))
    if not any(n in LINEAR or n in ("ESPN+", "Peacock", "Prime Video", "Apple TV", "Netflix", "Paramount+", "HBO Max") for n in out):
        if lg == "nba": out = out or ["NBA League Pass"]
        elif lg == "nhl": out = out or ["ESPN+"]
        elif lg == "mlb": out = out or ["MLB.TV"]
    return out

def parse_team(t):
    m = re.match(r"^(.*?)\s*\(([^)]*)\)\s*$", t or "")
    return (m.group(1), m.group(2).lower()) if m else (t, "")
SPORTWORD = {"ncaam": "men's basketball", "ncaaw": "women's basketball", "ncaaf": "football", "nfl": "football", "nba": "basketball", "nhl": "hockey", "mlb": "baseball"}
def is_mine(name, lg, teams):
    for t in teams:
        nm, sp = parse_team(t)
        if nm and nm.lower() == str(name or "").lower():
            if not sp or (SPORTWORD.get(lg, "") and sp.startswith(SPORTWORD.get(lg, "")) and not (sp.startswith("men") and lg == "ncaaw")): return True
            if sp == "football" and lg == "ncaaf": return True
    return False

def build(lg, day, teams, old_ids):
    st = standings(lg)
    games = []
    for e in sorted(events(lg, day), key=lambda e: (e.get("date") or "", e.get("id") or "")):
        c = (e.get("competitions") or [{}])[0]
        sides = {x.get("homeAway"): x for x in c.get("competitors") or []}
        if "home" not in sides or "away" not in sides: continue
        if lg == "intl":
            names = [((sides[s].get("team") or {}).get("displayName") or "").lower() for s in ("away", "home")]
            if not any(any(n == x or n.startswith(x) for x in NATIONS) for n in names): continue
            if any(re.search(r"\b(women|u-?\d\d)\b", n) for n in names): continue
        g = {"league": lg, "start": iso(parse(e["date"]))}
        mine = False
        for s in ("away", "home"):
            t = sides[s]; tm = t.get("team") or {}
            ab = (tm.get("abbreviation") or "").upper()
            g[s] = tm.get("displayName") or tm.get("name") or ""
            loc = tm.get("location") or ""
            g[s + "Short"] = ((loc if loc and len(loc) <= 18 else tm.get("shortDisplayName")) if lg in COLLEGE else tm.get("shortDisplayName") if lg in SOCCER else tm.get("name")) or tm.get("shortDisplayName") or g[s]
            g[s + "Abbr"] = ab
            rec = ((t.get("records") or [{}])[0] or {}).get("summary")
            if rec: g[s + "Record"] = rec
            if lg in COLLEGE:
                rk = ((t.get("curatedRank") or {}).get("current")) or 99
                if rk and rk < 26: g[s + "Rank"] = rk
                conf = (st.get(tm.get("id")) or ("", ""))[0]
                if conf: g[s + "Conf"] = conf
            else:
                if lg in PROS or lg in SOCCER:
                    if tm.get("color"): g[s + "Color"] = "#" + tm["color"].lower()
                    if tm.get("alternateColor"): g[s + "Alt"] = "#" + tm["alternateColor"].lower()
                pos = (st.get(tm.get("id")) or ("", ""))[1]
                if pos: g[s + "Standing"] = pos
            if is_mine(g[s], lg, teams): mine = True
        stl = next((s for s in ("away", "home") if "st. louis" in str(g[s]).lower() and is_mine(g[s], lg, teams)), None)
        g["tv"] = tv_for(lg, c, stl)
        if c.get("neutralSite"): g["neutral"] = True
        note = "; ".join(n.get("headline") for n in c.get("notes") or [] if n.get("headline"))
        if lg in SOCCER:
            g["stage"] = (e.get("season") or {}).get("slug") or ""
            if lg == "intl":
                g["comp"] = e.get("_league_name") or ""
                cn = "Friendly" if "friendly" in g["comp"].lower() else g["comp"]
                note = (cn + " · " + note) if note and cn and cn not in note else (note or cn)
        if note: g["note"] = note[:120]
        g["_mine"] = mine; g["_ev"] = e
        games.append(g)
    # ids: league-away-home, kept stable against what's already saved
    used = set()
    for g in games:
        key = (g["league"], g["away"].lower(), g["home"].lower(), g["start"][:10])
        gid = old_ids.get(key) or old_ids.get(key[:3]) or old_ids.get((key[0], key[2], key[1]))
        if not gid or gid in used:
            gid = re.sub(r"[^a-z0-9-]", "", f'{lg}-{g["awayAbbr"]}-{g["homeAbbr"]}'.lower())
            n, base = 2, gid
            while gid in used: gid = f"{base}-{n}"; n += 1
        used.add(gid); g["id"] = gid
    return games

def big(g):
    return g.get("_mine") or g.get("awayRank") or g.get("homeRank") or any(t in NATIONAL_TV for t in g.get("tv") or [])

def clean(gs): return [{k: v for k, v in g.items() if not k.startswith("_")} for g in gs]

def run(dates, on_demand):
    now = datetime.datetime.now(UTC)
    today = now.astimezone(CT).date()
    paths = []
    for d in dates: paths += [f"slates/{d}", f"slates/{d}-ncaam", f"slates/{d}-ncaaw", f"slates/{d}-ncaaf"]
    old = sb_get(paths + ["mine/user-settings", "prefs/notify"])
    teams = (old.get("mine/user-settings") or {}).get("teams") or (old.get("prefs/notify") or {}).get("teams") or []
    summary = []
    for d in dates:
        full = on_demand or (datetime.date.fromisoformat(d) - today).days <= 1
        old_ids = {}
        for p in [f"slates/{d}", f"slates/{d}-ncaam", f"slates/{d}-ncaaw", f"slates/{d}-ncaaf"]:
            for g in (old.get(p) or {}).get("games") or []:
                if g.get("id") and g.get("away") and g.get("home"):
                    k = (g.get("league"), g["away"].lower(), g["home"].lower())
                    old_ids[k + (str(g.get("start", ""))[:10],)] = g["id"]; old_ids.setdefault(k, g["id"])
        pro = []
        for lg in [l for l in FEEDS if l not in COLLEGE]:
            pro += build(lg, d, teams, old_ids)
        col = {lg: build(lg, d, teams, old_ids) for lg in ("ncaam", "ncaaw", "ncaaf")}
        stamp = iso(datetime.datetime.now(UTC))
        if full:
            sb_put(f"slates/{d}", {"date": d, "updatedAt": stamp, "source": "ESPN scoreboard and standings feeds", "games": clean(sorted(pro, key=lambda g: g["start"]))})
            for lg, gs in col.items():
                sb_put(f"slates/{d}-{lg}", {"date": d, "updatedAt": stamp, "source": "ESPN scoreboard and standings feeds", "games": clean(gs)})
            summary.append(f"{d}: {len(pro)} pro/soccer, " + ", ".join(f"{len(v)} {k}" for k, v in col.items()))
        else:
            extra = [g for gs in col.values() for g in gs if big(g)]
            allg = sorted(pro + extra, key=lambda g: g["start"])
            sb_put(f"slates/{d}", {"date": d, "updatedAt": stamp, "source": "ESPN feeds; college: national TV, ranked or DJ's teams", "games": clean(allg)})
            summary.append(f"{d}: {len(pro)} pro/soccer + {len(extra)} college")
        if on_demand and datetime.date.fromisoformat(d) < today:
            sc = {}
            for g in pro + [x for gs in col.values() for x in gs]:
                c = (g["_ev"].get("competitions") or [{}])[0]; stt = ((c.get("status") or g["_ev"].get("status") or {}).get("type") or {})
                if stt.get("state") not in ("in", "post"): continue
                sd = {x.get("homeAway"): x for x in c.get("competitors") or []}
                try: sc[g["id"]] = {"a": int(float(sd["away"].get("score"))), "h": int(float(sd["home"].get("score"))), "state": stt["state"], "detail": stt.get("shortDetail", "")}
                except Exception: pass
            sb_put(f"scores/{d}", {"date": d, "updatedAt": stamp, "games": sc})
    print("; ".join(summary))
    return summary

if __name__ == "__main__":
    if not KEY: sys.exit("SUPABASE_SECRET is not set")
    args = [a for a in sys.argv[1:] if re.match(r"^\d{4}-\d{2}-\d{2}$", a)]
    if args: run(args, True)
    else:
        t = datetime.datetime.now(UTC).astimezone(CT).date()
        run([(t + datetime.timedelta(days=k)).isoformat() for k in range(4)], False)
