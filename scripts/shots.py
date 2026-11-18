#!/usr/bin/env python3
"""Screenshots of Slate at DJ's three phone shapes, from the index.html you just built (python3 build.py first).

    SLATE_PASS=<test passcode> python3 scripts/shots.py lineup games
    SLATE_PASS=... python3 scripts/shots.py game:Raiders feed:Raiders --sizes folded,iphone
    SLATE_PASS=... python3 scripts/shots.py lineup --scroll .sl-bets       (scroll an element into view first)
    SLATE_PASS=... python3 scripts/shots.py settings --click "#set-sfb"    (tap a button first, e.g. to open a sheet)
    python3 scripts/shots.py lineup tv --text xl --tomorrow --full          (no passcode: read-only, saves are blocked)
    SLATE_PASS=... python3 scripts/shots.py games --league WCBB --filter "Both ranked"   (a league tab, then a filter in the row under it)
    python3 scripts/shots.py lineup --gate                                  (the log-in page; --gate invite = the sign-up page)
    SLATE_PASS=... python3 scripts/shots.py settings --readonly --name welcome-2 --eval "document.querySelector('#acct button').click(); document.querySelector('.wl-next').click()"

Options: --text xs|s|m|l|xl|auto (the Text size setting, for this run only), --look dark|paper (the theme, with its own accent, for this run only), --teams "A,B" (favorite teams for this run; add --readonly so they are never saved), --tap "sel" (a real finger tap on the first visible match, after --click), --yesterday (the day before: finished games), --tomorrow (the slate's next day:
upcoming games), --full (the whole page, not just the first screen), --wait seconds,
--eval "js" (run in the page just before each screenshot, e.g. to tap something; what it returns is printed), --name label (added to the file names),
--pane left|right (open Duo: which side the page, game, filters and --click go to; default right; --eval runs on the whole screen),
--readonly (with a passcode: log in but block every save), --gate [invite] (no passcode: show the log-in page, or the sign-up page with a pretend invite).

Pages: any view SlateApp.go() opens (lineup, games, tv, teams, moments, best, news, settings, notify, rules),
plus game:<team> (that game's matchup page), look:<team> (its quick look on All games) and feed:<team> (its Live feed), found on All games by team name.

Sizes (--sizes, default all three):
    folded  iPhone Duo folded: 466 x 678, the app's side column on the right (strip mode, 84-point inset)
    open    iPhone Duo unfolded and sideways: 765 x 538, two panes (3.80.0), each its own page: the slate on the left, pages on the right
    iphone  a regular iPhone: 390 x 844
The page is told which phone it's on, so the test profile's own Phone setting doesn't matter (nothing is saved).

Prints each screenshot's path, any page errors, and pages wider than the screen (sideways scrolling).
Screenshots go to /tmp/slate-shots/ (not the repo). Open them with your image viewer or Read tool and look.

The passcode: use the test profile's (ask DJ). Never write it into the repo: the repo is public.
Needs Playwright: pip install playwright --break-system-packages && python3 -m playwright install chromium
"""
import json, os, re, sys, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://slate.djvillhard.workers.dev/"
SIZES = {
    "folded": {"w": 466, "h": 678, "device": "duo", "strip": True, "inset": 84},
    "open": {"w": 765, "h": 538, "device": "duo", "strip": False, "inset": 0},
    "iphone": {"w": 390, "h": 844, "device": "iphone", "strip": False, "inset": 0},
}
OUT = "/tmp/slate-shots"


def main():
    args = sys.argv[1:]
    if not args or args[0] in ("-h", "--help"):
        print(__doc__); return
    pw = os.environ.get("SLATE_PASS", "").strip()
    if not pw:   # DJ's Claude project keeps the test account's passcode in its project files (never in this repo, which is public)
        try: pw = open("/mnt/project-files/test-account/passcode").read().strip()
        except Exception: pw = ""
    if "--gate" in args: pw = ""
    if not pw: print("No SLATE_PASS: loading without a passcode (the default profile, read-only: every save is blocked).")
    prof = 0  # --profile SECONDS: record the page's CPU use for that long (after --tap) and print where the time went
    tap = None  # --tap "sel": a real touch tap, after --click
    teams = None  # --teams "Notre Dame,Duke": favorite teams for this run only (read-only, never saved)
    sizes, wait, scroll, pages, text, tomorrow, full, look, league, filt, click = list(SIZES), 6.0, None, [], None, False, False, None, None, None, None
    pane = "right"
    ev, name, readonly, gate = None, "", False, None
    i = 0
    while i < len(args):
        a = args[i]
        if a == "--pane": pane = args[i + 1]; i += 2; continue
        if a == "--sizes": sizes = [s.strip() for s in args[i + 1].split(",") if s.strip()]; i += 2; continue
        if a == "--wait": wait = float(args[i + 1]); i += 2; continue
        if a == "--scroll": scroll = args[i + 1]; i += 2; continue
        if a == "--click": click = args[i + 1]; i += 2; continue
        if a == "--text": text = args[i + 1].lower(); i += 2; continue
        if a == "--look": look = args[i + 1]; i += 2; continue
        if a == "--profile": prof = float(args[i + 1]); i += 2; continue
        if a == "--tap": tap = args[i + 1]; i += 2; continue
        if a == "--teams": teams = [t.strip() for t in args[i + 1].split(",") if t.strip()]; i += 2; continue
        if a == "--league": league = args[i + 1]; i += 2; continue
        if a == "--filter": filt = args[i + 1]; i += 2; continue
        if a == "--tomorrow": tomorrow = True; i += 1; continue
        if a == "--yesterday": tomorrow = "prev"; i += 1; continue  # the day before: finished games
        if a == "--full": full = True; i += 1; continue
        if a == "--eval": ev = args[i + 1]; i += 2; continue
        if a == "--name": name = args[i + 1]; i += 2; continue
        if a == "--readonly": readonly = True; i += 1; continue
        if a == "--gate":
            gate = "login"; i += 1
            if i < len(args) and args[i] == "invite": gate = "invite"; i += 1
            continue
        pages.append(a); i += 1
    bad = [s for s in sizes if s not in SIZES]
    if bad: sys.exit("Unknown size: " + ", ".join(bad) + " (folded, open, iphone)")
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        sys.exit("Playwright isn't installed: pip install playwright --break-system-packages && python3 -m playwright install chromium")
    index, ver = os.path.join(ROOT, "index.html"), os.path.join(ROOT, "version.json")
    os.makedirs(OUT, exist_ok=True)

    def espn(route):  # ESPN, fetched from here (the browser's own requests can be blocked in a sandbox)
        try:
            body = urllib.request.urlopen(urllib.request.Request(route.request.url, headers={"User-Agent": "slate-shots"}), timeout=20).read()
            route.fulfill(body=body, content_type="application/json", headers={"Access-Control-Allow-Origin": "*"})
        except Exception:
            route.fulfill(status=502, body=b"{}", headers={"Access-Control-Allow-Origin": "*"})

    def settings_for(device):  # the profile's settings as read, with the Phone setting for this size (read-only: nothing is saved)
        def handle(route):
            try:
                r = route.fetch(); body = r.text()
                d = json.loads(body)
                rows = d if isinstance(d, list) else d.get("rows", [d]) if isinstance(d, dict) else [d]
                for row in rows:
                    if isinstance(row, dict) and isinstance(row.get("data"), dict) and str(row.get("path", "user-settings")).endswith("user-settings"):
                        row["data"]["device"] = device
                        if text: row["data"]["textSize"] = text; row["data"]["textSizeWide"] = text
                        if teams: row["data"]["teams"] = teams
                        if look: row["data"]["look"] = look; row["data"]["accent"] = {"paper": "navy"}.get(look, "green")
                route.fulfill(response=r, body=json.dumps(d))
            except Exception:
                route.continue_()
        return handle

    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=os.environ.get("SLATE_CHROMIUM") or None)  # SLATE_CHROMIUM: a Chromium already on the machine
        for size in sizes:
            S = SIZES[size]
            ctx = browser.new_context(viewport={"width": S["w"], "height": S["h"]}, service_workers="block", device_scale_factor=2, has_touch=True, is_mobile=True, timezone_id="America/Chicago")
            page = ctx.new_page()
            errors = []
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.add_init_script("window.SLATE_NATIVE={platform:'ios',app:'3.0',strip:%s};try{var k='lineup.look',v=JSON.parse(localStorage.getItem(k)||'{}');v.device='%s';localStorage.setItem(k,JSON.stringify(v));}catch(e){}" % ("true" if S["strip"] else "false", S["device"]))
            page.route(re.compile(r"^https://slate\.djvillhard\.workers\.dev/(\?.*)?(#.*)?$"), lambda r: r.fulfill(path=index, content_type="text/html"))
            page.route(re.compile(r".*/version\.json.*"), lambda r: r.fulfill(path=ver, content_type="application/json"))
            page.route(re.compile(r"^https://site\.api\.espn\.com/.*"), espn)
            page.route(re.compile(r".*supabase\.co/rest/v1/docs.*user-settings.*"), settings_for(S["device"]))
            page.route(re.compile(r".*/api/docs$"), settings_for(S["device"]))  # 3.83.1: a person's own documents come from the server
            if not pw or readonly:  # read-only: nothing this run does can be saved (the passcode check itself still goes through)
                page.route("**/*", lambda r: r.abort() if r.request.method not in ("GET", "HEAD", "OPTIONS") and "/api/whoami" not in r.request.url and "/api/docs" not in r.request.url else r.fallback())
            if not pw and not gate:  # no passcode: just looking, without the log-in page on top
                page.add_init_script("try{localStorage.setItem('slate-view-only','1')}catch(e){}")
            if gate == "invite": page.route("**/api/invite-check", lambda r: r.fulfill(body='{"ok":true}', content_type="application/json"))
            page.goto(SITE + ("#pass=" + pw if pw else "#invite=SHOTS2TEST234" if gate == "invite" else ""))
            page.wait_for_timeout(int(wait * 1000))
            # a new test profile opens on the welcome: close it ("Skip for now") unless the welcome is what's being checked
            if pw and "welcome" not in (name or ""):
                try: page.wait_for_selector(".wl-skip", timeout=5000); page.click(".wl-skip"); page.wait_for_timeout(800)
                except Exception: pass
            if S["inset"]: page.evaluate("SlateApp.setInset(%d)" % S["inset"]); page.wait_for_timeout(400)
            if tomorrow: page.evaluate("document.getElementById('l-day-%s').click()" % ("prev" if tomorrow == "prev" else "next")); page.wait_for_timeout(int(wait * 1000))
            mode = page.evaluate("document.documentElement.className")
            # open Duo (3.80.0): two panes, each its own copy of the page in a frame. Pages, games, filters and clicks
            # go to the right side (--pane left for the left one); --eval and the screenshot stay on the whole screen.
            host = page
            def tgt():
                if "panes" not in mode: return host
                side = host.evaluate("(w => { const a = document.getElementById('pn-a'); if (!a) return ''; const l = a.style.gridColumn === '1' ? 'a' : 'b'; return w === 'left' ? l : (l === 'a' ? 'b' : 'a'); })(%s)" % json.dumps(pane))
                for fr in host.frames:
                    if ("pane=" + side) in fr.url: return fr
                return host
            for pg in pages or ["lineup"]:
                page = tgt()
                kind, _, team = pg.partition(":")
                if kind in ("game", "feed", "look"):
                    page.evaluate("SlateApp.go('games')"); page.wait_for_timeout(2500)
                    hit = page.evaluate("""(T => { const r = [...document.querySelectorAll('#games-body .g')].find(x => x.innerText.indexOf(T) !== -1);
                        if (!r) return false; (r.querySelector('.g-main') || r).click(); return true; })(%s)""" % json.dumps(team))
                    if not hit:  # not under the page's current filter (e.g. Your teams): look again under ALL
                        page.evaluate("(() => { const b = [...document.querySelectorAll('#strip button')].find(x => x.innerText.trim() === 'ALL'); if (b) b.click(); })()"); page.wait_for_timeout(1500)
                        hit = page.evaluate("""(T => { const r = [...document.querySelectorAll('#games-body .g')].find(x => x.innerText.indexOf(T) !== -1);
                            if (!r) return false; (r.querySelector('.g-main') || r).click(); return true; })(%s)""" % json.dumps(team))
                    if not hit: print(f"  {size}: no game with '{team}' on All games ({page.evaluate('document.querySelectorAll(\'#games-body .g\').length')} games, {page.url})"); continue
                    page.wait_for_timeout(2000)
                    if kind == "feed":
                        if not page.evaluate("(() => { const b = document.querySelector('.feed-go'); if (!b) return false; b.click(); return true; })()"):
                            print(f"  {size}: '{team}' has no Live feed button (not live?)"); continue
                        page.wait_for_timeout(int(wait * 1000))
                    elif kind == "look":  # the quick look: stay on the card's open tray
                        page.evaluate("(() => { const t = document.querySelector('.tray'); if (t) t.scrollIntoView({block: 'center'}); })()"); page.wait_for_timeout(500)
                    elif page.evaluate("!!document.querySelector('.tray .full-mu')"):
                        page.evaluate("document.querySelector('.tray .full-mu').click()"); page.wait_for_timeout(2000)
                else:
                    page.evaluate("SlateApp.go(%s)" % json.dumps(kind)); page.wait_for_timeout(2500)
                for sel, want in (("#strip button", league), ("#substrip button", filt)):  # tap a league tab and/or a filter, by its text
                    if not want: continue
                    if not page.evaluate("""((S, T) => { const b = [...document.querySelectorAll(S)].find(x => x.innerText.trim().toLowerCase() === T.toLowerCase()); if (!b) return false; b.click(); return true; })(%s, %s)""" % (json.dumps(sel), json.dumps(want))):
                        print(f"  {size}: no '{want}' button in {sel}")
                    page.wait_for_timeout(1500)
                if click:
                    page.evaluate("(s => { const e = document.querySelector(s); if (e) e.click(); })(%s)" % json.dumps(click)); page.wait_for_timeout(700)
                if tap:  # a real finger tap at the middle of the first visible match (catches anything covering it, unlike --click)
                    box = page.evaluate("(s => { const e = [...document.querySelectorAll(s)].find(x => x.offsetWidth); if (!e) return null; e.scrollIntoView({block: 'center'}); const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })(%s)" % json.dumps(tap))
                    if box is None: print(f"  {size}: nothing visible matches --tap {tap}")
                    else:
                        off = [0, 0]
                        if page is not host:
                            fe = page.frame_element(); fb = fe.bounding_box(); off = [fb["x"], fb["y"]]
                        hit = host.evaluate("(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? e.tagName + '.' + (e.className.baseVal !== undefined ? e.className.baseVal : e.className) : 'nothing'; })(%s)" % json.dumps([box[0] + off[0], box[1] + off[1]]))
                        print(f"  {size}: tapping {tap} at {round(box[0] + off[0])},{round(box[1] + off[1])} (top of the screen there: {hit})")
                        host.touchscreen.tap(box[0] + off[0], box[1] + off[1]); page.wait_for_timeout(1200)
                if prof:
                    cdp = host.context.new_cdp_session(host if page is host else page)
                    cdp.send("Profiler.enable"); cdp.send("Profiler.setSamplingInterval", {"interval": 500}); cdp.send("Profiler.start")
                    host.wait_for_timeout(int(prof * 1000))
                    pr = cdp.send("Profiler.stop")["profile"]
                    nodes = {n["id"]: n for n in pr["nodes"]}; parent = {}
                    for n in pr["nodes"]:
                        for c in n.get("children", []): parent[c] = n["id"]
                    dts = pr.get("timeDeltas", []); selfms = {}; totms = {}
                    for sid, dt in zip(pr.get("samples", []), dts[1:] + [0]):
                        cf = nodes[sid]["callFrame"]; key = f"{cf['functionName'] or '(anon)'} :{cf['lineNumber'] + 1}"
                        selfms[key] = selfms.get(key, 0) + dt / 1000
                        seen = set(); nid = sid
                        while nid in nodes:
                            cf = nodes[nid]["callFrame"]; k2 = f"{cf['functionName'] or '(anon)'} :{cf['lineNumber'] + 1}"
                            if k2 not in seen: totms[k2] = totms.get(k2, 0) + dt / 1000; seen.add(k2)
                            nid = parent.get(nid)
                    busy = sum(v for k, v in selfms.items() if not k.startswith("(idle)") and not k.startswith("(program)"))
                    print(f"  {size}: CPU busy {busy:.0f}ms of {prof * 1000:.0f}ms")
                    print("  most time including what they call:")
                    for k, v in sorted(totms.items(), key=lambda x: -x[1])[:30]:
                        if not k.startswith(("(idle)", "(root)", "(program)")): print(f"    {v:7.0f}ms  {k}")
                    print("  most time in the function itself:")
                    for k, v in sorted(selfms.items(), key=lambda x: -x[1])[:15]:
                        if not k.startswith(("(idle)", "(program)")): print(f"    {v:7.0f}ms  {k}")
                if scroll:
                    page.evaluate("(s => { const e = document.querySelector(s); if (e) e.scrollIntoView({block: 'start'}); })(%s)" % json.dumps(scroll)); page.wait_for_timeout(500)
                page = host
                if ev:
                    r = page.evaluate(ev); page.wait_for_timeout(1200)
                    if r is not None: print(r)  # whatever the script returns (e.g. computed styles)
                wide = max([page.evaluate("document.scrollingElement.scrollWidth - innerWidth")] + [fr.evaluate("document.scrollingElement.scrollWidth - innerWidth") for fr in page.frames[1:] if "pane=" in fr.url])
                path = os.path.join(OUT, f"{re.sub(r'[^A-Za-z0-9]+', '-', pg).strip('-')}{'-' + name if name else ''}-{size}{'-' + text if text else ''}{'-' + look if look else ''}{('-yesterday' if tomorrow == 'prev' else '-tomorrow') if tomorrow else ''}.png")
                page.screenshot(path=path, full_page=full)
                print(f"{path}  ({size}: {mode})" + (f"  WIDER THAN THE SCREEN by {wide}px" if wide > 1 else ""))
            for e in errors: print(f"  page error ({size}): {e}")
            try: page.unroute_all(behavior="ignoreErrors")  # quiet close: ESPN calls still in flight are dropped
            except Exception: pass
            ctx.close()
        browser.close()


if __name__ == "__main__":
    main()
