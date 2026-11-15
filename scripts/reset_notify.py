"""One-off (Nov 15, 2026): turn every profile's notification settings off, like a new account (decision 8 in
docs/NOTIFICATIONS-PLAN.md). Quiet hours off and every day allowed (decision 9 removes both). Keys that aren't
notification settings (time zone and the like) are kept. Phone tokens (prefs/push, prefs/liveacts) aren't touched.

The old settings are saved first to backup/notify-reset-2026-11-15 (never overwritten on a rerun).
  Ran once on Nov 15 from a dispatch-only workflow (since removed).
  SUPABASE_SECRET=... python3 scripts/reset_notify.py            dry run: prints what would change
  SUPABASE_SECRET=... python3 scripts/reset_notify.py --apply    backs up, then writes
Standard library only."""
import json, os, sys, urllib.request, urllib.parse, datetime

SB = "https://xpkzcdaawaqiqgwkkwst.supabase.co"
KEY = os.environ.get("SUPABASE_SECRET", "") or sys.exit("SUPABASE_SECRET is not set")
H = {"apikey": KEY, "Authorization": "Bearer " + KEY, "Content-Type": "application/json"}
BACKUP = "backup/notify-reset-2026-11-15"

# everything a profile can switch on, switched off (shape matches NOTIFY_DEFAULTS in index.html and DEFAULTS in worker/alerts.js)
OFF = {
    "enabled": True,  # the page's master switch stays on so turning on one alert is one tap; every alert below is off
    "brief": {"on": False, "hour": 9, "myTeams": False, "lineup": False, "topGames": False},
    "reminders": {"lineup": False, "myTeams": False},
    "finals": {"myTeams": False, "lineup": False},
    "live": {"myTeams": False},
    "upsets": {"on": False},
    "quiet": {"on": False, "start": 23, "end": 8},
    "days": [0, 1, 2, 3, 4, 5, 6],
    "close": {"lineup": False, "myTeams": False},
    "ot": {"lineup": False, "myTeams": False},
    "goals": {"myTeams": False},
    "lead": 0,
    "liveAct": {"on": False, "lineup": False, "myTeams": False, "games": {}, "board": {"on": False, "ids": [], "at": 0}},
    "alerts": {"games": {}},
}


def get(paths):
    q = "select=path,data&path=in.(" + ",".join(urllib.parse.quote(p, safe="/-") for p in paths) + ")"
    rows = json.load(urllib.request.urlopen(urllib.request.Request(SB + "/rest/v1/docs?" + q, headers=H), timeout=30))
    return {r["path"]: r["data"] for r in rows}


def put(path, data):
    body = json.dumps({"p_path": path, "p_data": data, "p_merge": False}).encode()
    return urllib.request.urlopen(urllib.request.Request(SB + "/rest/v1/rpc/mirror_doc", data=body, method="POST", headers=H), timeout=30).status


def main():
    apply = "--apply" in sys.argv
    reg = (get(["users/registry"]).get("users/registry") or {}).get("users") or {}
    uids = sorted({u.get("id") for u in reg.values() if u.get("id") and u.get("id") != "dj"})
    paths = ["prefs/notify"] + [f"u/{i}/prefs/notify" for i in uids]
    cur = get(paths + [BACKUP])
    print(f"profiles: dj + {len(uids)} others ({', '.join(uids) or 'none'})")
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    if apply:
        if BACKUP in cur:
            print("backup already exists; keeping it as is")
        else:
            st = put(BACKUP, {"at": now, "docs": {p: cur.get(p) for p in paths}})
            print("backup written", st)
            if st not in (200, 204): sys.exit("backup failed; nothing changed")
    for p in paths:
        old = cur.get(p) or {}
        kept = {k: v for k, v in old.items() if k not in OFF and k != "updatedAt"}
        new = dict(kept, **json.loads(json.dumps(OFF)), updatedAt=now)
        on = [k for k in OFF if old.get(k) != OFF[k]]
        print(f"{p}: {'missing (was app defaults)' if not old else 'changes ' + (', '.join(on) or 'nothing')}; keeps {', '.join(sorted(kept)) or 'nothing else'}")
        if apply: print("  written", put(p, new))
    if not apply: print("dry run: nothing written (add --apply)")


if __name__ == "__main__":
    main()
