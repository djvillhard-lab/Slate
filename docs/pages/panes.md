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
- 3.147.0 (DJ: "review each page full screen and use the space", first batch, all CSS in `097-panes.css` under `html.in-pane.pn-full`): Settings main list two across (`.set-acts`); the slate's Worth a look two across (`.wal-list`); All games single-league tab cards two across, an open quick look takes the full row; All games ALL tab with every league shut = league rows in two columns (`columns: 2`, goes back to one column the moment a league is opened). Still to do, page by page: Teams, Box Office, matchup, team page, Live feed (top-level pieces stable per its thread: `.fd-filt .fd-strip .fd-bug`, top card, `.fd-list`, box, `.fd-at`), On TV / My TVs (list beside the wall; leave `#tvs-ed-root` and Rules), News (grid on `.nl.nf`), Settings sub-pages. Owners agreed: wide rules only in `097-panes.css`, never in their files.
- 3.149.0 (second batch, same file and scope): Teams list two across (`.rows.tb-res` grid), standings groups side by side (`#teams-body:has(> .sdg-grp ~ .sdg-grp)` grid, everything but `.sdg-grp` spans); matchup made full screen (layout button; a tapped game still opens beside): `#game-body` two columns when it has `.gv-oddsbar` or `.gv-cl` (head left spanning two rows, line and Claude button right), open `.gv-sec-in` cards in CSS columns. Box Office needed nothing. To shoot a full-screen matchup: `shots.py game:Heat --league NBA --sizes open --eval "slatePaneLayout(slatePaneInfo().right,'full'); new Promise(r=>setTimeout(r,1500))"`. Left: team pages, Live feed, On TV / My TVs, News, Settings sub-pages.
- 3.150.0 (third batch): Live feed made full screen = `#feed-body:has(> .fd-box)` grid, dense flow: `.fd-field` and `.fd-list` in column 1, `.fd-box` in column 2 spanning both rows, everything else spans (no box score = unchanged); team page = `#team-body` CSS columns, `.tm-head` spans. To shoot a full-screen team page see the eval in git history of this line's commit (Teams > Standings > first row > `slatePaneLayout(right,'full')`). Left: On TV / My TVs, News, Settings sub-pages.
- 3.151.0 (fourth batch): On TV > My TVs = `.tvs-wall` floated left at 57% with the "Turn each TV to" rows flowing beside it (the wall draws from its own width, so it just gets smaller; `#tvs-ed-root` and Rules untouched, per the On TV thread); other On TV tabs = `#tv-body .glist` two across. Left: News, Settings sub-pages.
- 3.152.0 (fifth batch): News Front Page = `.nl.nf` six-part grid: everything spans by default; `.nl-lead.bleed` span 3 (no right bleed) with `.nf-ld` span 3 beside it; `.nf-s` and `.nf-g` span 3; `.nf-lg` span 2; `.nl-nums.nl-2c` four across; an odd last `.nf-s` / `.nf-preview` / `.nf-recap` spans the row (`:nth-child(odd of ...)`). If the News thread changes the Front Page's top-level classes these rules need the same change. Not done: the pages inside a News section and an opened story, Settings sub-pages, Notifications, Slate rules (forms; they read fine but stay one column).
- 3.157.2 (DJ, Nov 26: disliked the stacked times in two columns; picked "A: times down the left side" from three screenshots in /mnt/project-files/duo-layout/slate-options/, then asked for something creative with a leftover game's space): full-screen slate = one `.tgroup` per row, 46px time strip, `.tg-games` two across; an odd last `.g` with one-liners becomes a feature card (three columns: game, side, `.hl` on the right half behind a divider); with a quick look open it is a plain full-width card. Rejected: B (time line across), C (no time headers).
- 3.160.0 (DJ, Nov 26, four notes from the phone): (1) feature cards on the full-screen slate get `zoom: 1.2` on `.g-main`, `.g-side`, `.hl` (1.3 made live cards fall back to short names); (2) `n3SwipeOk` allows page swipes in a pane with `pn-full` (two pages: still no page swipes, the bar picks); (3) the layout button shows the layout a tap GIVES (was: the one you are in); (4) the layout is ONE app-wide choice (`slate-duo-lay` = `{all:"two"}` or `{}`), no longer per page: two pages stays two pages on every page and across fold/unfold with the pre-3.141.0 controls (menu works the right, grip swaps, hold locks); full screen still opens taps beside. A layout change made on a game, feed or team page is not remembered.
- 3.162.1: page owners changed markup after the wide layouts shipped. Live feed (3.162.0): the box score is now `.fd-box` INSIDE `.fd-list`, opened by a button; the wide rule floats it right at half width and caps the plays at half width while it is open (closed = plays full width). News (3.161.0): Home sections are sideways wheels (`.nf-wh` > `.nf-wc`), so the span rules for `.nf-s/.nf-g/.nf-lg/.nl-nums` in `097-panes.css` no longer match on Home and are harmless; only the lead beside `.nf-ld` still applies. Card width when full screen can be set on `html.in-pane.pn-full .nf-wh > .nf-wc` if DJ asks.
- 3.168.0 (DJ, Nov 26: unfolded and UPRIGHT with Picture in Picture on the top half; the app gets a window about 538 x 454): compact Live feed. `289-feed-compact.js` sets `html.fd-cmp` (auto when the window is at most 540 tall, at least 430 wide and wider than tall; never inside a pane) and adds the round `#fdc-btn` beside Back on the feed (choice kept in `slate-feed-compact` as `{short, tall}`: `on`/`off`). `108-feed-compact.css` hides `header.top` and `#feed-body > .fd-strip`, makes `.fd-bug` one 42px line (records and channel hidden, `.fd-sit` at the right) and pins `.fd-field` under it without the win probability. It depends on those Live feed class names. Check it with `shots.py feed:<team> --sizes upright`. This is the only upright work so far; the rest of the app upright is still one stretched page.
- 3.162.4 (DJ): page swipes also work on the RIGHT side in two pages (`n3SwipeOk` checks `pn-right`, which a full-screen page has too). The left side never page-swipes. A swipe can put the same page on both sides, the same as a bar tap can.
- 3.169.1 (DJ, screenshot from the unfolded Duo held upright): (1) The Athletic Newsletters card showed an empty gray bar over the headline and ~150px of empty space under it. Cause: its headline span used class `nl-t`, which the News redesign (`103-news-front.css`) also uses for its tiles (min-height 150, top border). The newsletter headline is now `.nlr-t` (130-teams.js, 040-components.css). Before naming a class on the slate, grep the News CSS: it uses short `nl-*` names. (2) The times' first digit hid under iOS's side-bar tab on the top left edge of the upright unfolded Duo (system UI, ~20pt, no safe-area inset reported). `097-panes.css`: in portrait, `html.corner` without `.iphone/.side-col/.duo/.in-pane` gives `#main-wrap` a 30px left padding. `scripts/shots.py --sizes tall` = upright full screen (538x765); `--newsletters pulse,bounce` shows the newsletter card on the test account.
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
- 3.170.0: compact Live feed (289-feed-compact.js) never auto-applies on the two-page host (`html.panes`), and its button is hidden there. Two-column slate on a full-screen page is four across (109-slate-two.css overrides the 097 slate rules when `#lineup-body.sl2`).
- 3.171.0 Focus view of the Live feed (was "compact", 3.168.0). DJ: "I want to incorporate that for all sports and all orientations... like focusing in on just one game", then "games could actually show in a carousel where the current score is... choose other live games or swipe there". Files: `src/app/289-feed-compact.js` (sets `html.fd-cmp`, builds `#fdc-btn`; now also runs inside each pane, never on the `html.panes` host) and `src/styles/108-feed-compact.css`. Nothing in the Live feed's own files changed, so these rules depend on its class names: `#feed-body > .fd-strip.fd-filt` (pills, hidden), `.fd-strip:not(.fd-filt)` with `.fd-chip`/`.fd-chip.on` (the live games row), `.fd-bug` (+ `.fd-sit`), `.fd-field` (football, pinned) and `.fd-field.hp-top` (other sports' top card, hidden in focus). When the strip has a chip that is not `.on`, `#feed-body` becomes a wrapping flex row so the bug (order -2, accent outline) and the strip (order -1, the chosen chip hidden) share the first line; every other child takes a full line. `.fd-sit` is absolutely placed on top of the field in that mode and under 500px wide.
- Auto-on (Picture in Picture on the top half, unfolded upright): `shortWide()` uses `room()` = window height (or visualViewport if smaller) minus the safe-area insets when they are over 120px, and is re-checked every 2s on the feed. DJ reported 3.168.0 did not auto-switch; the real PiP geometry could not be reproduced in shots.py (`--sizes upright` is a guess at 538x454), so if it still fails ask DJ what the feed looks like there, or add a one-line readout of innerWidth/innerHeight/safe areas.
- 3.171.2: DJ took the 3.171.0 live-games row back ("Never mind on the other live game selection from collapsed view. I like the current version"): the flex-row rules are gone, the focus view is the single score line again (do not re-add a switcher there). Under 500px wide `.fd-sit` still sits on top of the field. `#fdc-btn` now has Back's exact glass (46px, `--glass-clear`, `--glass-edge`) and `place()` in 289 lines it up with `#dock-back` through `--fdc-r`/`--fdc-b`. New `styles/110-header-buttons.css`: `#btn-find` gets the same glass circle and `--head` icon color as `#btn-settings` on every page (an old slate-header rule had left Search unfilled, and the gear was green).
- 3.172.1 (DJ, folded Duo: "This view for collapsed live feed doesn't look good and gets covered by Dynamic Island"): with the header hidden the feed's top sits beside the clock and Wi-Fi (right side, about 50 to 160 points down). Folded only (`html[data-native].side-col:not(.duo).fd-cmp`): `.fd-field` gets `margin-right: --strip-w`, `.fd-list > .fd-bar` gets `padding-right: --strip-w`, no wrap, tighter buttons and a two-line "Last play" label; the score line is above the cluster so `.fd-sit` is inline again (the on-the-field placement is now only under 430px wide). The right pane's island was not changed (its own `fd-isl` rules still pad the score line).
