"""ESPN feed check: is each feed Slate reads still shaped the way the app expects?

Slate reads ESPN's public feeds, which can change without notice. Once an hour tick.py runs check(): it asks for one
scoreboard per sport, one game summary and one standings table, and looks for the fields the app depends on.
The result goes to stats/feeds {at, problems, bad, told}. The worker (worker/alerts.js, feedsAlert) pushes DJ a
notification once the same check has failed twice in a row, and again when the feeds are back.

    python3 scripts/feedcheck.py          print what the check finds (writes nothing)
"""
import json, urllib.request

SITE = "https://site.api.espn.com/apis/site/v2/sports/"
BOARDS = [("NBA", "basketball/nba"), ("NFL", "football/nfl"), ("NHL", "hockey/nhl"), ("College hoops", "basketball/mens-college-basketball"), ("Premier League", "soccer/eng.1")]

def fetch(url):
    for _ in range(3):
        try: return json.load(urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "slate-tick"}), timeout=30))
        except Exception: pass
    return None

def check(get=fetch):
    """Returns a list of plain sentences, empty when every feed looks right."""
    bad, ev_for_summary = [], None
    for name, path in BOARDS:
        d = get(SITE + path + "/scoreboard")
        if not isinstance(d, dict): bad.append(f"{name} scores: ESPN didn't answer."); continue
        evs = d.get("events")
        if not isinstance(evs, list): bad.append(f"{name} scores: the list of games is missing."); continue
        for e in evs[:1]:
            c = ((e.get("competitions") or [{}])[0])
            sides = c.get("competitors") or []
            if len(sides) != 2 or not all((s.get("team") or {}).get("displayName") and "score" in s and s.get("homeAway") for s in sides):
                bad.append(f"{name} scores: a game is missing its teams or scores.")
            if not ((e.get("status") or {}).get("type") or {}).get("state"): bad.append(f"{name} scores: a game has no status (live, final).")
            if not e.get("date"): bad.append(f"{name} scores: a game has no start time.")
            if name == "NBA" or ev_for_summary is None: ev_for_summary = (name, path, e)
    if ev_for_summary:
        name, path, e = ev_for_summary
        s = get(SITE + path + "/summary?event=" + str(e.get("id")))
        if not isinstance(s, dict): bad.append(f"{name} game page: ESPN didn't answer.")
        else:
            if not ((s.get("header") or {}).get("competitions")): bad.append(f"{name} game page: the score header is missing.")
            if "boxscore" not in s: bad.append(f"{name} game page: the box score is missing.")
            state = (((e.get("status") or {}).get("type")) or {}).get("state")
            if state in ("in", "post"):
                if not (s.get("boxscore") or {}).get("players"): bad.append(f"{name} game page: player stats are missing from the box score.")
                plays = s.get("plays") or s.get("scoringPlays") or []
                if not plays: bad.append(f"{name} game page: the play-by-play is missing.")
                elif not all(k in plays[-1] for k in ("awayScore", "homeScore", "period")): bad.append(f"{name} game page: plays no longer carry the score and period.")
    st = get("https://site.api.espn.com/apis/v2/sports/basketball/nba/standings")
    if not isinstance(st, dict): bad.append("NBA standings: ESPN didn't answer.")
    else:
        entries = [x for c in (st.get("children") or []) for x in ((c.get("standings") or {}).get("entries") or [])]
        if not entries: bad.append("NBA standings: no teams listed.")
        else:
            names = {x.get("name") for x in entries[0].get("stats") or []}
            miss = [k for k in ("wins", "losses", "playoffSeed", "gamesBehind", "streak") if k not in names]
            if miss: bad.append("NBA standings: missing " + ", ".join(miss) + ".")
    return bad

def run(sb_get, sb_put, now_iso, every_min=55):
    """Called by tick.py. Checks at most once every `every_min` minutes."""
    import datetime
    cur = sb_get(["stats/feeds"]).get("stats/feeds") or {}
    try:
        last = datetime.datetime.fromisoformat(str(cur.get("at", "")).replace("Z", "+00:00"))
        if (datetime.datetime.now(datetime.timezone.utc) - last).total_seconds() < every_min * 60: return
    except Exception: pass
    problems = check()
    doc = {"at": now_iso, "problems": problems, "bad": (int(cur.get("bad") or 0) + 1) if problems else 0}
    if cur.get("told"): doc["told"] = cur["told"]
    sb_put("stats/feeds", doc)
    print("feed check:", problems or "ok")

if __name__ == "__main__":
    r = check()
    print("\n".join(r) if r else "Every feed looks right.")
