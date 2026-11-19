#!/usr/bin/env python3
"""Builds src/data/logos.js: every team's ESPN logo file, built into the app.

    python3 scripts/logos.py        (then python3 build.py)

The app used to download these lists from ESPN on each phone, and a failed download left a whole league showing
lettered boxes. Now the lists ship with the app; the phone's download is only a top-up for teams added later.
Run it again when a league changes its teams (promotion and relegation each summer, expansion teams).
window.TEAM_LOGOS = { "<folder>": { "<team name, lowercase letters and digits only>": "<file without .png>" } }
The logo is https://a.espncdn.com/i/teamlogos/<folder>/500/<file>.png.
"""
import json, os, re, urllib.request

FEEDS = ["football/nfl", "basketball/nba", "basketball/wnba", "hockey/nhl", "baseball/mlb",
         "football/college-football", "basketball/mens-college-basketball", "basketball/womens-college-basketball",
         "soccer/usa.1", "soccer/eng.1", "soccer/esp.1", "soccer/ita.1", "soccer/ger.1", "soccer/fra.1",
         "soccer/uefa.champions", "soccer/uefa.europa", "soccer/eng.fa", "soccer/fifa.friendly"]
SEG = re.compile(r"/i/teamlogos/([a-z0-9]+)/500(?:-dark)?/(?:scoreboard/)?([\w-]+)\.png", re.I)

def norm(n):  # the same as logoNorm() in src/app/045-team-logos.js
    n = re.sub(r"\s*\((men's basketball|women's basketball|football)\)$", "", (n or "").lower())
    return re.sub(r"[^a-z0-9]", "", n)

def main():
    out, total = {}, 0
    for f in FEEDS:
        with urllib.request.urlopen(f"https://site.api.espn.com/apis/site/v2/sports/{f}/teams?limit=1000", timeout=60) as r:
            teams = json.load(r)["sports"][0]["leagues"][0]["teams"]
        n = 0
        for x in teams:
            tm = x.get("team") or {}
            m = SEG.search(((tm.get("logos") or [{}])[0]).get("href") or "")
            k = norm(tm.get("displayName"))
            if not m or not k: continue
            out.setdefault(m.group(1).lower(), {}).setdefault(k, m.group(2).lower()); n += 1
        print(f"{f}: {n} of {len(teams)} teams with a logo"); total += n
        if not n: raise SystemExit(f"{f} came back empty; nothing written")
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "src", "data", "logos.js")
    with open(path, "w") as fh:
        fh.write("window.TEAM_LOGOS = " + json.dumps(out, separators=(",", ":"), sort_keys=True) + ";\n")
    print(f"wrote src/data/logos.js: {sum(len(v) for v in out.values())} teams, {os.path.getsize(path) // 1024} KB")

if __name__ == "__main__": main()
