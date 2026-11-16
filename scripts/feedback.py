#!/usr/bin/env python3
"""Read the feedback people sent from the app (Settings → Send feedback) and print a report.

    python3 scripts/feedback.py                 # new items, grouped by type, as Markdown
    python3 scripts/feedback.py --mark          # ...and mark them reported, so the next run skips them
    python3 scripts/feedback.py --all           # the last 100, reported or not
    python3 scripts/feedback.py --shots DIR     # also save attached screenshots into DIR
    python3 scripts/feedback.py --json          # raw items

The reader key is never in this repo (it's public). It comes from $SLATE_FEEDBACK_KEY, or a file named by
$SLATE_FEEDBACK_KEY_FILE (DJ's Claude project keeps it in its project files, in feedback/.reader-key).
The daily report in DJ's Claude project runs this; see docs/pages/feedback.md.
"""
import argparse, base64, json, os, sys, urllib.request
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

SITE = os.environ.get("SLATE_SITE", "https://slate.djvillhard.workers.dev")
KINDS = [("bug", "Problems"), ("idea", "Ideas"), ("other", "Other")]


def key():
    k = os.environ.get("SLATE_FEEDBACK_KEY", "").strip()
    if not k:
        f = os.environ.get("SLATE_FEEDBACK_KEY_FILE", "/mnt/project-files/feedback/.reader-key")
        try:
            k = open(f).read().strip()
        except OSError:
            pass
    if not k:
        sys.exit("feedback.py: no reader key (set SLATE_FEEDBACK_KEY or SLATE_FEEDBACK_KEY_FILE)")
    return k


def post(path, body):
    req = urllib.request.Request(SITE + path, data=json.dumps(body).encode(), method="POST",
                                 headers={"content-type": "application/json", "user-agent": "slate-feedback-report"})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        sys.exit("feedback.py: %s answered %s %s" % (path, e.code, e.read()[:200].decode("utf-8", "replace")))


def when(at):
    try:
        t = datetime.fromisoformat(at.replace("Z", "+00:00")).astimezone(ZoneInfo("America/Chicago"))
        return t.strftime("%a %b %-d, %-I:%M %p CT")
    except Exception:
        return at


def report(items, shots):
    if not items:
        return ""
    out = ["**%d new feedback item%s**" % (len(items), "" if len(items) == 1 else "s")]
    for k, title in KINDS:
        group = [i for i in items if (i.get("kind") or "other") == k]
        if not group:
            continue
        out.append("\n**%s (%d)**" % (title, len(group)))
        for i in group:
            if i.get("error"):
                out.append("- %s: couldn't be read (%s)" % (when(i.get("at", "")), i["error"]))
                continue
            page = i.get("page") or "unknown page"
            if i.get("detail"):
                page += " (%s)" % i["detail"]
            text = " ".join(str(i.get("text", "")).split())
            out.append("- **%s**, from %s, %s: %s" % (i.get("name") or i.get("who"), page, when(i.get("at", "")), text))
            bits = ["Web " + i["version"] if i.get("version") else "", i.get("app", ""), i.get("device", ""), i.get("screen", "")]
            extra = " · ".join(b for b in bits if b)
            if i.get("shot"):
                extra += " · screenshot attached" + (" (%s)" % shots.get(i["id"]) if shots.get(i["id"]) else "")
            out.append("  %s" % extra)
    return "\n".join(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--mark", action="store_true")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--shots")
    a = ap.parse_args()
    k = key()
    items = post("/api/feedback/inbox", {"key": k, "all": a.all}).get("items", [])
    shots = {}
    if a.shots:
        os.makedirs(a.shots, exist_ok=True)
        for i in items:
            if i.get("shot"):
                d = post("/api/feedback/shot", {"key": k, "id": i["id"]}).get("shot", "")
                if "," in d:
                    ext = "png" if d.startswith("data:image/png") else "jpg"
                    p = os.path.join(a.shots, "%s.%s" % (i["id"], ext))
                    open(p, "wb").write(base64.b64decode(d.split(",", 1)[1]))
                    shots[i["id"]] = p
    if a.json:
        print(json.dumps(items, indent=2))
    else:
        print(report(items, shots) or "No new feedback.")
    if a.mark:
        ids = [i["id"] for i in items if i.get("id") and not i.get("reported")]
        if ids:
            r = post("/api/feedback/mark", {"key": k, "ids": ids})
            print("\n(marked %d reported)" % len(r.get("marked", [])), file=sys.stderr)


if __name__ == "__main__":
    main()
