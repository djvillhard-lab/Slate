# The unfolded Duo: full-screen pages and two pages

## Full-screen pages (3.141.0, DJ Nov 25, 2026: "B plus the bar button")
DJ: "I liked the idea of two pages at once, but now I'm wanting a full screen news page and other pages. So I want
options and intuitive controls." Concepts: https://claude.ai/artifact/Jq1JSgBNZfibgcuANLqftv (mock files in the project
files under `duo-layout/`). DJ picked B (pages open full, a tap opens things beside them) with A's layout button.
- Still two frames (`?pane=a/b`). **Full** (`PN.full`): the right side's frame spans both halves (`pnPlace`, grid column
  `1 / 4`), the other frame waits under it, hidden, in the right half. The pane gets `html.pn-full`.
- **Opens beside** (`PN.beside`): on a full page, `openMatchup` / `openFeed` / `openTeam` call the host's
  `slatePaneBeside`, which sends the route to the hidden frame's `paneGo`. Every `paneGo` first tells the host
  (`slatePaneWake`): a hidden frame opening a game, feed, team or News story flips the layout, so the page frame becomes
  the left side (same frame, so its scroll and state stay) and the hidden one shows on the right. That also covers the
  News Front Page, which calls the other frame's `paneGo` / `newsStory` itself. The right pane gets `html.pn-beside`.
- **Back closes it**: the pane wraps `goBack`; leaving the last game/feed/team view while `pn-beside` calls
  `slatePaneClose`, and the page on the left goes full again. A story's Close does the same through `slatePaneWake`.
  Swapping with the grip, or the layout button, turns "beside" into plain two pages.
- **Layout button** (`#n3-lay` at the end of the bar, `#n3-lay2` beside Back on pages with no bar; 283-three-pages.js)
  calls `slatePaneLayout(id)`: full <-> two. It shows the layout you are in. Going to two pages, the left side shows its
  last page, never the same page as the right.
- **Each page remembers** (`localStorage["slate-duo-lay"]`, only `"two"` is stored; full is the default): when the bar's
  side moves to another menu page, that page's layout is applied (`slatePaneSync`; not in the first 4 s after unfolding,
  not while something is open beside).
- Unfolding now puts the front screen's page on the RIGHT (the bar's side), full unless that page remembers two pages.
  This replaces 3.90.6's "front page on the left". Folding shows the full page, or the left page when two are up.
- A pane no longer splits or goes "roomy" by its own width (`290-layout.js`: `!PANE &&`), so a full page keeps the
  folded phone's text sizes. Wide layouts live in `097-panes.css` under `html.in-pane.pn-full`: the slate's times in two
  columns, All games "2 columns" three across. The bar sits on the right half (`101-three-pages.css`), never on the fold.
- `scripts/shots.py --sizes open` now shows the full page; `--two` for two pages; `window.slatePaneInfo()` on the host
  says which frame is where.
- 3.144.3 (DJ: "the menu changes size when switching between view modes"): a full page caps its text zoom by HALF its width (`020-look.js`, `pn-full`), and `paneMark` re-runs `applyLook`, so `--z` is the same in both layouts; the day arrows are a fixed 80px in panes. Measured: bar 250x56 and arrows 80 in both. If DJ still sees a size jump, ask for a screenshot of each mode.
### Open
- News has no wide layout of its own yet (the News thread holds its files). Next: lead story left, Five things right.
- Upright (portrait) unfolded is still one stretched page: full page works, "opens below the fold" is not built.
- No slide animation when a page opens beside or closes.
- The hold-for-three-choices on the button was dropped: there are only two layouts.

# Two panes (the "two pages" layout)

Shipped 3.80.0 (DJ, Nov 17, 2026): "split the screen in two, drag the right side to the left, pick a new page for the
right, so I can have two live feeds at once."

## How it works
- `src/app/288-panes.js`, `src/styles/097-panes.css`. Open and sideways (the old split's test in `290-layout.js`
  `applyLayout`), the page becomes a **host**: it hides itself and shows two iframes of the same page, `?pane=a` and
  `?pane=b`, side by side at the fold (same `--fold-shift` and `--hinge` as before). Each pane is a full copy of the app,
  laid out like the folded phone (`isDuo` is false inside), so every page, Back, the menu, scroll and live updates are
  independent per side, and other pages' code needed no change.
- `window.SLATE_PANE` ("a"/"b", set in `shell.html`) and `PANE` (280) mark a pane. `panesOn()` marks the host.
- The host stops drawing (`render` wrapper) and stops polling ESPN (`livePoll`) while the panes are up.
- Pages per side are kept in sessionStorage `slate-panes` ({left, active, routes}) and in each pane's `#go=` hash
  (`lineup`, `games`, `moments`, `tv`, `news`, `teams`, `settings`, `best`, `feed:<id>`, `game:<id>`). Unfolding again
  restores the right one. Since 3.90.6 (DJ): unfolding puts the front screen's page on the left (`pnRouteOf` in
  the host), the right keeps its last page unless that matches the left (then games, or lineup when the left is games),
  and folding opens the left pane's page on the front screen (`exitPanes` → `pnGoTo`). This replaces "folding always
  lands on the slate".
- The grip on the fold (`.pn-grip`, 44x88): tap = the two sides swap (3.81.4, DJ: no picker). No dragging (3.81.6, DJ:
  dragging broke the layout on the phone); a finger that moves 24pt off just cancels. Holding never selects text.
  Frames swap by grid column (no reload). The "Pick a page" screen from 3.80.0 was removed at DJ's request.
- One menu (3.81.2, DJ after trying 3.80.0 on the Duo): the app's menu and Back (and the strip's buttons) always go to
  the right side. The right pane gets `data-float` when the app draws its own menu, so it hides its menu button and
  Back (like the folded phone with the app's floating menu); in a browser it keeps its own. The left pane
  (`html.pn-left`) has no menu or Back. A game, Live feed or team opened from a list on the left opens on the right
  (`slatePaneOpen`); inside a matchup or Live feed that was slid over to the left, switching games stays left.
- Lock (3.81.5, DJ): hold the grip 550 ms to toggle `PN.lock` (kept in `slate-panes`). Locked, the left pane loses
  `pn-fwd`, so it opens games, feeds and teams on its own side; a small accent lock shows on the grip (no tip text,
  DJ). The left pane never shows its own menu or Back (`pn-left`, 3.81.8, DJ); while locked, the app's Back works the
  side touched last (`slatePaneTouch`), and the app is told that side's Back state. Tapping still swaps. The app's menu and Back still go to the right.
- Inside a matchup, Live feed or team page on the left, switching games always stays on the left, locked or not.
- iPhone app: panes talk to it through the host (`slateHostPost`; "state"/"ready" are dropped). The strip's buttons
  (`go`, `back`, `today`, `day`, `toggleMenu`, `openGame`, `watch`) go to the right side, and the app is told the
  right side's state (its Back and lit menu button). No iOS change.
- Settings: when one side saves settings or notifications, the other side and the host take the same values
  (`slatePaneSaved`, `PN_SET_KEYS`), so neither side later saves an old copy over the change.
- New versions: a pane reloads itself on its own page; the host never auto-reloads while the panes are up.
- `?panes=off` in the URL gives the old fixed layout (slate left, pages right), which still runs before sign-in.
- `scripts/shots.py --sizes open` now goes into the right pane (`--pane left` for the left one).

- Headers (3.81.9-3.81.12, DJ): fixed numbers didn't match on the phone, so `pnAlign` (host, every 1.5 s and on page
  changes) asks each pane for its header's natural height and the page name's offset (`SlateApp.paneHead`, divided by
  the header's text-size zoom), then sets the same `--pn-head` (min-height) on both and `--pn-tpad` (extra top padding)
  on the one whose name sits higher (`paneHeadSet`). The dividers and page names then match. A name-only header (3.81.13, DJ) gets no top padding: its name is bigger
  (clamp 22-34px, 8.2vw; fitTitle still shrinks long names) with the full 42px mark, centered in the shared height.
  Panes only; the folded phone keeps its short one-line header (DJ has rejected extra top space there).

- Centering (3.93.3, DJ): no gap column at the fold any more (`.pn` grid hinge column 0); each pane's own 16pt page
  margin is the gap, the same as at the outer edge, so each page is centered in its half. The grip is 32pt wide so it
  covers only those margins.

## Open
- A pane is about 365 points wide, a little narrower than the folded cover screen (about 382). The Live feed's score
  bar crowds at that width for NBA (a record sits under the score); that page belongs to the Live feed thread.
- Not tried on the real iPhone Duo yet: scrolling inside the frames and the grip on the crease need DJ's thumb.
- Ideas if DJ wants them: a Settings switch back to the old layout; swap both sides in one move.
