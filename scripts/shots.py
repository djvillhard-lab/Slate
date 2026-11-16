#!/usr/bin/env python3
"""Screenshots of Slate at DJ's three phone shapes, from the index.html you just built (python3 build.py first).

    SLATE_PASS=<test passcode> python3 scripts/shots.py lineup games
    SLATE_PASS=... python3 scripts/shots.py game:Raiders feed:Raiders --sizes folded,iphone
    SLATE_PASS=... python3 scripts/shots.py lineup --scroll .sl-bets       (scroll an element into view first)
    python3 scripts/shots.py lineup tv --text xl --tomorrow --full          (no passcode: read-only, saves are blocked)

Options: --text xs|s|m|l|xl|auto (the Text size setting, for this run only), --tomorrow (the slate's next day:
upcoming games), --full (the whole page, not just the first screen), --wait seconds.

Pages: any view SlateApp.go() opens (lineup, games, tv, teams, moments, best, news, settings, notify, rules),
plus game:<team> (that game's matchup page) and feed:<team> (its Live feed), found on All games by team name.

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
    if not pw: print("No SLATE_PASS: loading without a passcode (the default profile, read-only: every save is blocked).")
    sizes, wait, scroll, pages, text, tomorrow, full = list(SIZES), 6.0, None, [], None, False, False
    i = 0
    while i < len(args):
        a = args[i]
        if a == "--sizes": sizes = [s.strip() for s in args[i + 1].split(",") if s.strip()]; i += 2; continue
        if a == "--wait": wait = float(args[i + 1]); i += 2; continue
        if a == "--scroll": scroll = args[i + 1]; i += 2; continue
        if a == "--text": text = args[i + 1].lower(); i += 2; continue
        if a == "--tomorrow": tomorrow = True; i += 1; continue
        if a == "--full": full = True; i += 1; continue
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
            if not pw:  # read-only: nothing this run does can be saved
                page.route("**/*", lambda r: r.abort() if r.request.method not in ("GET", "HEAD", "OPTIONS") else r.fallback())
            page.goto(SITE + ("#pass=" + pw if pw else ""))
            page.wait_for_timeout(int(wait * 1000))
            if S["inset"]: page.evaluate("SlateApp.setInset(%d)" % S["inset"]); page.wait_for_timeout(400)
            if tomorrow: page.evaluate("document.getElementById('l-day-next').click()"); page.wait_for_timeout(int(wait * 1000))
            mode = page.evaluate("document.documentElement.className")
            for pg in pages or ["lineup"]:
                kind, _, team = pg.partition(":")
                if kind in ("game", "feed"):
                    page.evaluate("SlateApp.go('games')"); page.wait_for_timeout(2500)
                    hit = page.evaluate("""(T => { const r = [...document.querySelectorAll('#games-body .g')].find(x => x.innerText.indexOf(T) !== -1);
                        if (!r) return false; (r.querySelector('.g-main') || r).click(); return true; })(%s)""" % json.dumps(team))
                    if not hit: print(f"  {size}: no game with '{team}' on All games"); continue
                    page.wait_for_timeout(2000)
                    if kind == "feed":
                        if not page.evaluate("(() => { const b = document.querySelector('.feed-go'); if (!b) return false; b.click(); return true; })()"):
                            print(f"  {size}: '{team}' has no Live feed button (not live?)"); continue
                        page.wait_for_timeout(int(wait * 1000))
                    elif page.evaluate("!!document.querySelector('.tray .full-mu')"):
                        page.evaluate("document.querySelector('.tray .full-mu').click()"); page.wait_for_timeout(2000)
                else:
                    page.evaluate("SlateApp.go(%s)" % json.dumps(kind)); page.wait_for_timeout(2500)
                if scroll:
                    page.evaluate("(s => { const e = document.querySelector(s); if (e) e.scrollIntoView({block: 'start'}); })(%s)" % json.dumps(scroll)); page.wait_for_timeout(500)
                wide = page.evaluate("document.scrollingElement.scrollWidth - innerWidth")
                path = os.path.join(OUT, f"{re.sub(r'[^A-Za-z0-9]+', '-', pg).strip('-')}-{size}{'-' + text if text else ''}{'-tomorrow' if tomorrow else ''}.png")
                page.screenshot(path=path, full_page=full)
                print(f"{path}  ({size}: {mode})" + (f"  WIDER THAN THE SCREEN by {wide}px" if wide > 1 else ""))
            for e in errors: print(f"  page error ({size}): {e}")
            try: page.unroute_all(behavior="ignoreErrors")  # quiet close: ESPN calls still in flight are dropped
            except Exception: pass
            ctx.close()
        browser.close()


if __name__ == "__main__":
    main()
