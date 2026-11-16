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

Options: --text xs|s|m|l|xl|auto (the Text size setting, for this run only), --look dark|paper (the theme, with its own accent, for this run only), --tomorrow (the slate's next day:
upcoming games), --full (the whole page, not just the first screen), --wait seconds,
--eval "js" (run in the page just before each screenshot, e.g. to tap something), --name label (added to the file names),
--readonly (with a passcode: log in but block every save), --gate [invite] (no passcode: show the log-in page, or the sign-up page with a pretend invite).

Pages: any view SlateApp.go() opens (lineup, games, tv, teams, moments, best, news, settings, notify, rules),
plus game:<team> (that game's matchup page), look:<team> (its quick look on All games) and feed:<team> (its Live feed), found on All games by team name.

Sizes (--sizes, default all three):
    folded  iPhone Duo folded: 466 x 678, the app's side column on the right (strip mode, 84-point inset)
    open    iPhone Duo unfolded and sideways: 765 x 538, slate on the left, pages on the right
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
    if "--gate" in args: pw = ""
    if not pw: print("No SLATE_PASS: loading without a passcode (the default profile, read-only: every save is blocked).")
    sizes, wait, scroll, pages, text, tomorrow, full, look, league, filt, click = list(SIZES), 6.0, None, [], None, False, False, None, None, None, None
    ev, name, readonly, gate = None, "", False, None
    i = 0
    while i < len(args):
        a = args[i]
        if a == "--sizes": sizes = [s.strip() for s in args[i + 1].split(",") if s.strip()]; i += 2; continue
        if a == "--wait": wait = float(args[i + 1]); i += 2; continue
        if a == "--scroll": scroll = args[i + 1]; i += 2; continue
        if a == "--click": click = args[i + 1]; i += 2; continue
        if a == "--text": text = args[i + 1].lower(); i += 2; continue
        if a == "--look": look = args[i + 1]; i += 2; continue
        if a == "--league": league = args[i + 1]; i += 2; continue
        if a == "--filter": filt = args[i + 1]; i += 2; continue
        if a == "--tomorrow": tomorrow = True; i += 1; continue
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
                rows = d if isinstance(d, list) else [d]
                for row in rows:
                    if isinstance(row, dict) and isinstance(row.get("data"), dict):
                        row["data"]["device"] = device
                        if text: row["data"]["textSize"] = text; row["data"]["textSizeWide"] = text
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
            if not pw or readonly:  # read-only: nothing this run does can be saved (the passcode check itself still goes through)
                page.route("**/*", lambda r: r.abort() if r.request.method not in ("GET", "HEAD", "OPTIONS") and "/api/whoami" not in r.request.url else r.fallback())
            if not pw and not gate:  # no passcode: just looking, without the log-in page on top
                page.add_init_script("try{localStorage.setItem('slate-view-only','1')}catch(e){}")
            if gate == "invite": page.route("**/api/invite-check", lambda r: r.fulfill(body='{"ok":true}', content_type="application/json"))
            page.goto(SITE + ("#pass=" + pw if pw else "#invite=SHOTS2TEST234" if gate == "invite" else ""))
            page.wait_for_timeout(int(wait * 1000))
            if S["inset"]: page.evaluate("SlateApp.setInset(%d)" % S["inset"]); page.wait_for_timeout(400)
            if tomorrow: page.evaluate("document.getElementById('l-day-next').click()"); page.wait_for_timeout(int(wait * 1000))
            mode = page.evaluate("document.documentElement.className")
            for pg in pages or ["lineup"]:
                kind, _, team = pg.partition(":")
                if kind in ("game", "feed", "look"):
                    page.evaluate("SlateApp.go('games')"); page.wait_for_timeout(2500)
                    hit = page.evaluate("""(T => { const r = [...document.querySelectorAll('#games-body .g')].find(x => x.innerText.indexOf(T) !== -1);
                        if (!r) return false; (r.querySelector('.g-main') || r).click(); return true; })(%s)""" % json.dumps(team))
                    if not hit:  # not under the page's current filter (e.g. Your teams): look again under ALL
                        page.evaluate("(() => { const b = [...document.querySelectorAll('#strip button')].find(x => x.innerText.trim() === 'ALL'); if (b) b.click(); })()"); page.wait_for_timeout(1500)
                        hit = page.evaluate("""(T => { const r = [...document.querySelectorAll('#games-body .g')].find(x => x.innerText.indexOf(T) !== -1);
                            if (!r) return false; (r.querySelector('.g-main') || r).click(); return true; })(%s)""" % json.dumps(team))
                    if not hit: print(f"  {size}: no game with '{team}' on All games"); continue
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
                if scroll:
                    page.evaluate("(s => { const e = document.querySelector(s); if (e) e.scrollIntoView({block: 'start'}); })(%s)" % json.dumps(scroll)); page.wait_for_timeout(500)
                if ev: page.evaluate(ev); page.wait_for_timeout(1200)
                wide = page.evaluate("document.scrollingElement.scrollWidth - innerWidth")
                path = os.path.join(OUT, f"{re.sub(r'[^A-Za-z0-9]+', '-', pg).strip('-')}{'-' + name if name else ''}-{size}{'-' + text if text else ''}{'-' + look if look else ''}{'-tomorrow' if tomorrow else ''}.png")
                page.screenshot(path=path, full_page=full)
                print(f"{path}  ({size}: {mode})" + (f"  WIDER THAN THE SCREEN by {wide}px" if wide > 1 else ""))
            for e in errors: print(f"  page error ({size}): {e}")
            try: page.unroute_all(behavior="ignoreErrors")  # quiet close: ESPN calls still in flight are dropped
            except Exception: pass
            ctx.close()
        browser.close()


if __name__ == "__main__":
    main()
