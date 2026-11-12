"""Game alerts, sent as push notifications straight to the phone (free; replaces the hourly Claude alerts run).

Called by tick.py every 10 minutes with the day's games, scores and each person's slate.
Each person's settings: <prefix>prefs/notify, phones: <prefix>prefs/push, what was sent: <prefix>prefs/sent-D
(prefix is "" for DJ and "u/<id>/" for everyone else).
The VAPID key is derived from SUPABASE_SECRET, so no extra secret is needed; its public half is in the app.
"""
import json, re, hashlib, base64, datetime
from zoneinfo import ZoneInfo

CT = ZoneInfo("America/Chicago"); UTC = datetime.timezone.utc
DEFAULTS = {"enabled": True, "brief": {"on": True, "hour": 9, "myTeams": True, "lineup": True, "topGames": True},
            "reminders": {"lineup": True, "myTeams": True}, "finals": {"myTeams": True, "lineup": False}, "live": {"myTeams": False},
            "upsets": {"on": False}, "quiet": {"on": True, "start": 23, "end": 8}, "days": [0, 1, 2, 3, 4, 5, 6], "spoilerFree": False}
NATIONAL = ["ABC", "CBS", "NBC", "FOX", "ESPN", "ESPN2", "ESPNU", "ESPNEWS", "TNT", "TBS", "truTV", "FS1", "FS2", "CBSSN", "USA", "NBA TV",
            "NHL Network", "MLB Network", "NFL Network", "BTN", "SEC Network", "ACC Network", "CW", "Prime Video", "Peacock", "Netflix"]
BIG_NET = {"ABC", "CBS", "NBC", "FOX", "ESPN", "TNT", "Prime Video", "Netflix"}
COLLEGE = {"ncaaf", "ncaam", "ncaaw"}

def vapid_key(secret):
    n = 0xFFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551
    d = int.from_bytes(hashlib.sha256(("slate-vapid|" + secret).encode()).digest(), "big") % n
    return base64.urlsafe_b64encode(d.to_bytes(32, "big")).rstrip(b"=").decode()

def merged(p):
    out = json.loads(json.dumps(DEFAULTS))
    for k, v in (p or {}).items():
        if isinstance(v, dict) and isinstance(out.get(k), dict): out[k].update(v)
        else: out[k] = v
    return out

def parse(s):
    try: return datetime.datetime.fromisoformat(str(s).replace("Z", "+00:00"))
    except Exception: return None
def clock(t): return t.astimezone(CT).strftime("%I:%M %p").lstrip("0")

def side(g, s):
    r = g.get(s + "Rank"); nm = g.get(s + "Short") or g.get(s) or ""
    return (f"No. {r} " if r and g.get("league") in COLLEGE else "") + nm
def matchup(g):
    tv = g.get("tv") or []
    return f"{side(g, 'away')} @ {side(g, 'home')}" + (f" on {tv[0]}" if tv else "")

def in_quiet(p, hr):
    q = p.get("quiet") or {}
    if not q.get("on"): return False
    a, b = int(q.get("start", 23)), int(q.get("end", 8))
    return (a <= hr < b) if a < b else (hr >= a or hr < b) if a > b else False

def late_trailing(g, s):
    """(ranked team trailing, by) when an upset is brewing late."""
    det = str(s.get("detail") or ""); lg = g["league"]
    try: a, h = float(s.get("a")), float(s.get("h"))
    except Exception: return None
    if lg == "ncaaf": late, need = bool(re.search(r"\b(3rd|4th|OT)\b", det)), 8
    elif lg == "ncaaw": late, need = bool(re.search(r"\b(3rd|4th|Q3|Q4|OT)\b", det)), 7
    else: late, need = bool(re.search(r"\b(2nd|OT)\b", det)), 7
    if not late: return None
    ra, rh = g.get("awayRank") or 99, g.get("homeRank") or 99
    if a < h and ra < rh and h - a >= need: return ("away", "home")
    if h < a and rh < ra and a - h >= need: return ("home", "away")
    return None

def top_games(games, sc, skip, now):
    def score(g):
        tv = set(g.get("tv") or []); s = 0
        if not tv & set(NATIONAL): return -1
        ra, rh = g.get("awayRank"), g.get("homeRank")
        if ra and rh: s += 10 + (50 - ra - rh) / 10
        elif ra or rh: s += 4
        if tv & BIG_NET: s += 3
        if g["league"] in ("nfl", "nba", "epl", "ucl"): s += 2
        t = parse((sc.get(g["id"]) or {}).get("start")) or parse(g.get("start"))
        if t and 18 <= t.astimezone(CT).hour <= 21: s += 2
        return s
    c = [g for g in games if g["id"] not in skip and (parse(g.get("start")) or now) > now]
    c = sorted([g for g in c if score(g) > 0], key=lambda g: -score(g))[:3]
    return c

def due_alerts(p, sent, games, byid, sc, slate, mine, customs, now):
    """[(kind, key, title, body)] for alerts now due, most urgent first."""
    spoil = bool(p.get("spoilerFree")); out = []
    def start_of(i):
        s = sc.get(i) or {}
        return parse(s.get("start")) if s.get("state") == "pre" and s.get("start") else parse((byid.get(i) or {}).get("start"))
    # finals and upsets
    want_f = set(slate if (p.get("finals") or {}).get("lineup") else []) | set(mine if (p.get("finals") or {}).get("myTeams") else [])
    for i in sorted(want_f):
        s, g = sc.get(i) or {}, byid.get(i)
        if not g or s.get("state") != "post" or i in sent["finals"]: continue
        try: a, h = int(float(s["a"])), int(float(s["h"]))
        except Exception: continue
        if spoil: body = f"{g.get('awayShort') or g['away']} @ {g.get('homeShort') or g['home']} has ended"
        elif a == h: body = f"Final: {side(g, 'away')} {a}, {side(g, 'home')} {h} (tied)"
        else:
            w, l = ("away", "home") if a > h else ("home", "away")
            body = f"Final: {side(g, w)} {max(a, h)}, {side(g, l)} {min(a, h)}"
        out.append(("finals", i, "Final", body))
    if (p.get("upsets") or {}).get("on"):
        for g in games:
            i = g["id"]; s = sc.get(i) or {}
            if g["league"] not in COLLEGE or s.get("state") != "in" or i in sent["upsets"]: continue
            tr = late_trailing(g, s)
            if not tr: continue
            lo, hi = tr; a, h = int(float(s["a"])), int(float(s["h"]))
            sc_txt = f"{max(a, h)}-{min(a, h)}"
            body = (f"No. {g[lo + 'Rank']} {g.get(lo + 'Short')} trailing {side(g, hi)} late" if spoil
                    else f"No. {g[lo + 'Rank']} {g.get(lo + 'Short')} trails {side(g, hi)} {sc_txt} · {s.get('detail', '')}")
            out.append(("upsets", i, "Upset watch", body))
    # reminders
    want_r = set(slate if (p.get("reminders") or {}).get("lineup") else []) | set(mine if (p.get("reminders") or {}).get("myTeams") else [])
    for i in sorted(want_r, key=lambda i: start_of(i) or now):
        g, t = byid.get(i), start_of(i)
        if not g or not t or i in sent["reminders"] or (sc.get(i) or {}).get("state") in ("in", "post"): continue
        if now < t <= now + datetime.timedelta(minutes=60):
            orig = parse(g.get("start")); moved = orig and abs((orig - t).total_seconds()) >= 60
            out.append(("reminders", i, "Starting soon", f"{clock(t)}" + (f" (moved from {clock(orig)})" if moved else "") + f": {matchup(g)}"))
    if (p.get("reminders") or {}).get("lineup"):
        for c in customs:
            try: hh, mm = [int(x) for x in str(c.get("time") or "").split(":")[:2]]
            except Exception: continue
            t = now.astimezone(CT).replace(hour=hh, minute=mm, second=0, microsecond=0)
            k = "c:" + str(c.get("id"))
            if k not in sent["reminders"] and now < t <= now + datetime.timedelta(minutes=60):
                out.append(("reminders", k, "Starting soon", f"{clock(t)}: {c.get('title', '')}" + (f" on {c['tv']}" if c.get("tv") else "")))
    # live scores of my teams (at most about once an hour per game)
    if (p.get("live") or {}).get("myTeams") and not spoil:
        for i in mine:
            s, g = sc.get(i) or {}, byid.get(i)
            if not g or s.get("state") != "in": continue
            body = f"{g.get('awayShort')} {s.get('a')}, {g.get('homeShort')} {s.get('h')} · {s.get('detail', '')}"
            last = parse((sent.get("liveAt") or {}).get(i))
            if sent["live"].get(i) != body and (not last or (now - last).total_seconds() >= 55 * 60):
                out.append(("live", i, "Live", body))
    # the daily brief
    b = p.get("brief") or {}; hr = now.astimezone(CT).hour
    if b.get("on") and not sent.get("brief") and int(b.get("hour", 9)) <= hr <= int(b.get("hour", 9)) + 2:
        lines = []
        if b.get("lineup") and slate:
            firsts = sorted([i for i in slate if byid.get(i)], key=lambda i: start_of(i) or now)
            if firsts:
                g0 = byid[firsts[0]]; t0 = start_of(firsts[0])
                lines.append(f"Tonight's slate: {len(firsts)} game{'s' if len(firsts) != 1 else ''}, first at {clock(t0)} ({matchup(g0)})")
        if b.get("myTeams"):
            mt = [byid[i] for i in mine if byid.get(i)]
            lines.append("Your teams: " + " · ".join(f"{side(g, 'away')} @ {side(g, 'home')} {clock(start_of(g['id']) or now)}" + (f" on {(g.get('tv') or [''])[0]}" if g.get("tv") else "") for g in mt)
                         if mt else "None of your teams play today")
        if b.get("topGames"):
            tg = top_games(games, sc, set(slate), now)
            if tg: lines.append("Also on: " + " · ".join(f"{side(g, 'away')} @ {side(g, 'home')} {clock(start_of(g['id']) or now)} on {g['tv'][0]}" for g in tg))
        out.append(("brief", "brief", "Today's games", "\n".join(lines) if lines else ""))
    return out

def run(sb_get, sb_put, secret, now, D, games, sc, people, dry=False):
    """people: [{"prefix": "" or "u/<id>/", "slate": [ids], "mine": [ids], "customs": [...]}]"""
    byid = {g["id"]: g for g in games}
    hr = now.astimezone(CT).hour; wd = (now.astimezone(CT).weekday() + 1) % 7  # 0 = Sunday
    for who in people:
        pre = who["prefix"]
        docs = sb_get([pre + "prefs/notify", pre + "prefs/push", f"{pre}prefs/sent-{D}"])
        subs = ((docs.get(pre + "prefs/push") or {}).get("subs")) or []
        if not subs: continue
        p = merged(docs.get(pre + "prefs/notify"))
        sent0 = docs.get(f"{pre}prefs/sent-{D}") or {}
        sent = {"date": D, "brief": bool(sent0.get("brief")), "reminders": list(sent0.get("reminders") or []), "finals": list(sent0.get("finals") or []),
                "live": dict(sent0.get("live") or {}), "liveAt": dict(sent0.get("liveAt") or {}), "upsets": list(sent0.get("upsets") or [])}
        msgs = []
        welcome = [s for s in subs if not s.get("welcomed")]
        if p.get("enabled", True):
            due = due_alerts(p, sent, games, byid, sc, who["slate"], who["mine"], who.get("customs") or [], now)
            silent = wd not in (p.get("days") or DEFAULTS["days"]) or in_quiet(p, hr)
            for kind, key, title, body in due:
                if kind == "brief": sent["brief"] = True
                elif kind == "live": sent["live"][key] = body; sent["liveAt"][key] = now.astimezone(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
                else: sent[kind].append(key)
                if not silent and body: msgs.append({"title": title, "body": body, "tag": f"{kind}-{key}"})
        msgs = msgs[:8]
        if welcome: msgs.insert(0, {"title": "Slate", "body": "Alerts are on for this phone.", "tag": "welcome"})
        changed = json.dumps(sent, sort_keys=True) != json.dumps({**{"live": {}, "liveAt": {}, "reminders": [], "finals": [], "upsets": [], "brief": False, "date": D}, **sent0}, sort_keys=True, default=str)
        if dry:
            print("alerts", pre or "dj", msgs); continue
        keep, dirty = [], bool(welcome)
        if msgs:
            from pywebpush import webpush, WebPushException
            from py_vapid import Vapid
            vk = Vapid.from_raw(vapid_key(secret).encode())
            for s in subs:
                gone = False
                for m in msgs:
                    if m["tag"] == "welcome" and s.get("welcomed"): continue
                    try:
                        webpush({"endpoint": s["endpoint"], "keys": s["keys"]}, json.dumps(m), vapid_private_key=vk,
                                vapid_claims={"sub": "https://slate.djvillhard.workers.dev"}, ttl=3600)
                    except WebPushException as e:
                        code = getattr(getattr(e, "response", None), "status_code", 0)
                        print("push failed", code, str(e)[:120])
                        if code in (404, 410): gone = True; dirty = True; break
                    except Exception as e: print("push failed", str(e)[:120])
                if not gone: keep.append(dict(s, welcomed=True))
            print("alerts sent", pre or "dj", [m["body"][:60] for m in msgs])
        else: keep = [dict(s, welcomed=True) for s in subs]
        if dirty: sb_put(pre + "prefs/push", {"subs": keep})
        if changed or msgs: sb_put(f"{pre}prefs/sent-{D}", dict(sent, updatedAt=now.astimezone(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")))
