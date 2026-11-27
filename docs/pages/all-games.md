# All games
Last updated: Nov 25, 2026, 3.132.0
Code: `src/app/160-all-games.js`, the card in `150-game-row.js`, styles in `src/styles/040-components.css`.

## Done
- Standings (3.174.0, DJ): a Standings button in the Live row flips the page to the league's standings; code in
  `132-standings.js` (`sdgBtn`, `sdgGames`, `sdgShowing`), notes in docs/pages/teams.md.
- Two columns, simpler small cards (3.151.1, DJ: "Trying to fit too much ... removing things on the card outside of the one
  liner"). A small card is the two teams with scores and ONE bottom line: live = the clock in red, upcoming = the start
  time, finished = the best-player line with an "F" at its end ("F/OT" after overtime; plain "Final" when there is no line).
  No channel, divider or start time. The CSS hides every direct child of the card except `.g-main`, `.g-side` and `.ag2s`,
  so a new row added to the full card (3.148.0's `p.wwb` had leaked in) never shows on the small one. The line drops "yds"
  and its second number (`.ag2b`) only shows when it fits (it wraps out of sight). Open: a line for live small cards.
- Two columns: a finished game's small card has a very short best-player line (3.134.5, DJ), e.g. "Tatum 41 pts, 8 ast",
  "Connelly 2 G, 1 A", "Mahomes 312 pass yds, 3 TD". Upcoming and live small cards have no line (DJ: not for upcoming; live
  is open, see below). `agShort` in `160-all-games.js`: from the box score when the phone has it (`agShortBox`: best line of
  every player), else the scoreboard's leaders (`agShortLd`), saved per game in `localStorage["slate-ags"]`. A final with
  neither reads its box score once per game after 300 ms on screen (`agsTried`, so never a redraw loop), two columns only.
  The line is on every finished card as `p.ag2s` and only shown by `103-all-games-compact.css`. Soccer only gets a line when
  the scoreboard names a goal scorer. A finished small card hides its start time.
- Tapping Live no longer moves the scores (3.134.3, DJ). The slate's score column (`--tmw`, `fitScores`) and both pages' right
  column (`--side-w`, `alignSides`) were sized from the cards showing, so fewer cards meant a different column. `colKeep` in
  `240-chrome.js` keeps the widest value for the same day, tab, filter and page width. In two columns there is no right
  column: `--side-w` is cleared and `agWiden` does nothing, and switching back to one column measures again.
- Live button on = solid live red, white words, every theme (3.134.1, DJ). The glass fill in `100-glass.css` had painted over
  `.lo-btn.on`; the fix sits right under that rule and leaves the 2 columns and Board buttons alone.
- Two columns of small cards (3.132.0, DJ: "option to show multiple game matchups at once (two columns, condensed matchup
  cards)"). The "2 columns" button (`.ag2-btn`) sits on the left of the Live row, which is now drawn on every day (Live itself
  still only today). `agTwo()` / `agSetTwo()` keep the choice in `localStorage["slate-ag-two"]`; `renderGames` puts `.ag2` on
  `#games-body`. Everything else is CSS in `src/styles/103-all-games-compact.css`: `.glist` becomes two columns, and a card
  without an open quick look hides its league line, record, one-liner, Feed button, corner tag and plus, with time and channel
  in a row under the teams. A card with its quick look open (`:has(> .tray)`) spans both columns and is the full card. The
  same cards are drawn, so the 16 / 10 page limit, `agBusy` and `agFitNames` (abbreviations when a name doesn't fit) are unchanged.
- The second filter row (conferences, Top-10 team; also On TV's channel filters and Box Office's Ranked teams, all `.cf-tab` in a
  `.substrip`) looks like the league tabs, only smaller (3.65.7, DJ asked): 13px wide bold type (`font-stretch: 112%`), muted until
  picked, ink when picked, a 3px accent bar as wide as the word on the hairline. Styles in `src/styles/090-filter-rows.css`
  (040-components.css was claimed at the time); the 44-point touch area is a `::before`, so "All" keeps a short bar.
- Live button on the right, in line with the cards (3.38.2, 3.38.4).
- Secondary filters read left to right on every phone, All first (3.52.10, DJ asked; 3.38.5 to 3.52.9 ran them right to
  left on the Duo with All at the far right).
- Folded Duo: the Live button stops left of the side column (3.52.10): the clock and Wi-Fi reach that row since 3.44.0.
- 3.52.9: on the folded Duo both filter rows stop short of the side column again (padding + a fade mask, `--strip-w`), because
  after the compact header (3.44.0) the clock and Wi-Fi covered the right end, All included. A redraw keeps the second row's
  scroll and scrolls the picked filter into view (240-chrome.js). shots.py can now tap a league and a filter:
  `--league WCBB --filter "Both ranked"`.
- One-liners on every card, the slate's own lines: pre-game note, live standout in red, top performer after the final
  (3.39.0, `agLine`). A missing line is fetched only once its card has been on screen for 300 ms (`agSeen`).
- Worth a look reuses this card and replaces the card's line with its own, so only one line shows (3.39.2).
- Finished games are the same size as other cards (3.38.3).

## Open
- Live and finished one-liners have no fetch limit (only pre-game notes are capped at 3 at a time). Fine so far.

## Decisions
- No gutter or top spacing for the folded Duo's clock and Wi-Fi anywhere (DJ rejected both in 3.36.1 to 3.36.3).
- Box scores list everyone who played, no "top 6" and no fold behind a button (3.40.1, DJ asked).
- Headers: one compact header on every page (3.44.0); see docs/DESIGN.md. On the open Duo the slate pane's header is
  taller than a one-line page beside it; DJ hasn't objected.

## 3.68.7: no cut-off team names (open Duo right pane showed "Char…")
- `agFitNames()` at the end of 160-all-games.js runs after every `renderGames` (wrapped there, with `alignSides` first) and on resize.
  Per card: if any name is clipped, hide both records; if still clipped, both rows show the badge's abbreviation (full name kept in `title`).
- The card's main column is narrow there (about 160px at the Duo's zoom), so the record was what cost the room.

## 3.71.2: live one-liners in the team color
- `agLine` calls the slate's `hlTeamInk` (150-game-row.js, 3.71.0) on live lines, both the highlight and the standout-so-far line. Same contrast rule on both themes; lines about both teams stay red.

## 3.71.4: a game past its start that ESPN still has pre-game
- `livePoll` remembers ESPN pre-game sightings (`LIVE_PRE` in 040-live.js); `status()` returns upcoming with `late: true` for a game past its start but seen pre-game in the last 6 minutes. Cards say "Starting soon" (060-cards.js). Before, the clock fallback said Live with no score (Long Beach State at UCLA, late tip).
- `agLine` re-requests a preview older than 30 min on a "live" card, so stale ranks get redone.

## 3.81.1: watch links
- `statusSide` in 060-cards.js now gives All games the slate's channel block (watchLink, up to two, linkable first, ▶ marker). The old plain "ESPN / ABC" span is gone.
- `agFitNames` re-runs 120 ms after each draw and after fonts load, and treats any scrollWidth > clientWidth as cut (Chargers was off by 1px).

3.91.4 (DJ, Nov 17): live game cards on All games carry the same quick "Feed" button as the slate (`g-feed` in `150-game-row.js`, now for mode "games" as well as "lineup"). Live games only, every sport with a feed.

## 3.93.1: header counts line up
- On a league tab, the My teams header (it folds, so it has a chevron) put "1 game" toward the middle: the Live tag and the chevron both had auto margins and split the space. Now the count takes the auto margin, and plain headers on a page that has a folding one keep 26px on the right for the missing chevron, so every count ends at the same spot (measured equal on folded and iPhone).

## 3.95.1: speed (DJ: pages freezing with lots of games live)
- Profiled with `scripts/shots.py ... --profile 60` (new). With 20 live games, each 10-second score update rebuilt all 14 pages, hidden ones included (All games alone is 143 cards), and All games measured each card one at a time.
- `render()` (240-chrome.js) now redraws only pages that are on screen after `renderTop()`; a hidden page draws when it's opened (every way of opening a page calls render). A page renderer that touches something outside its own `#view-*` must be called when that other page shows too (renderNotify also runs on Settings).
- Score updates wait while a finger is on the screen or the page is moving (`liveRender` in 040-live.js), at most 20s.
- `agFitNames` resets, measures and changes all cards in batches. Date formatters are made once (030-helpers.js).
- Result on a fast computer: long stalls went from 23 in 90s (3.3s, up to 0.38s) to 10 (1.8s, about 0.18s each). Open: All games still rebuilds every card on each score update; next step would be swapping only the cards that changed.

## 3.95.3: draw in batches, keep unchanged cards (DJ: ALL tab still froze)
- Only ALL froze because it's the biggest list (about 150 cards on a busy night); each 10s score update rebuilt all of it in one task, so on the phone the page was busy most of the time: taps were lost while scrolling (which doesn't wait for the page) still worked.
- `section()` now queues cards (`agQ`); the `renderGames` wrapper draws the ones down to where you've scrolled right away, then 12 at a time with 24ms gaps. Each card's freshly built HTML is kept on the node (`_agHtml`); if the new card's HTML matches, the old node is put back (its preview watcher moves over) so only changed cards are laid out. Cards with a tray are always rebuilt.
- The right column only widens between fresh pages (`agWiden` measures just the new cards); a page with no reused cards sizes it from scratch with `alignSides`.
- Measured: long stalls in 90s went from 10 (about 0.18s each) to 1 (76ms).

## 3.96.0: Show more, and no redraw under a finger (DJ: still froze on ALL and College Hoops)
- Each section shows a few cards: ALL 6 per league (My teams 12), a league tab 12 (3.96.2; was 20). Live games first, then games on your slate, then the rest, kept in the usual order. "Show N more games" under a section adds 10 (20 on a league tab); the counts start over for a new day, tab, filter or Live. A search shows every match. Tonight: ALL 34 cards instead of 150, College Hoops 21 instead of 69.
- Likely the real cause of lost taps: a redraw replaces the Live button, the headers and changed cards; if it lands between touching and letting go, the tap is lost. Redraws come every 10s from scores and every time a card's line or box score arrives (agRedraw, many on a big list). `renderGames` now waits while a finger is down and runs 60ms after it lifts.
- Measured while scrolling for 60s: ALL 4 short stalls (longest 71ms), College Hoops 1 (51ms).

## 3.96.1: tap check on DJ's phone (temporary)
- Taps worked in every simulated check but not on DJ's phone, so `src/app/297-diag.js` logs, for the admin only (or localStorage `slate-diag` = 1): the running version and build, each touch (what it landed on, what `elementFromPoint` says is on top, whether a tap followed within 0.9s, cancels), freezes over 250ms, errors, and All games redraw counts. Sent with `/api/usage` `{pass, diag}` every 30s; worker/usage.js keeps the last ~300 entries per person in `stats/diag/<id>`, encrypted. Read: `POST /api/usage/marks {key: <reader key>, diag: true}`. Remove the file and the two worker branches once fixed. **Removed in 3.179.3** (code review; DJ: "I want everything implemented"): the file and the server's `diag` branches are gone.

## 3.96.3: no page changes around a tap (from DJ's phone log)
- The tap check showed five taps landing on the Live button (elementFromPoint = the button) with no click, no freeze and no cancel, while All games redrew about 2.5 times a second (106 redraws in ~40s on DJ's account; 6 in our test account). iPhone WebKit drops a tap when the page changes during it.
- `agBusy()`: from touch until 0.4s after lifting, redraws and batch drawing wait (then run once). A redraw the tap itself asks for (click handler) still runs at once (`agTapping`).
- Open: what redraws DJ's All games 2.5 times a second. The tap check now sends `why` (redraw callers, counted) with each log.

## 3.97.0: page limit (DJ: "not more than 10 live games ... no more than about 15 or 20")
- Replaces 3.96's per-section Show more. `section()` queues every game of an open section (live, then on your slate, then the rest); `agWindow()` keeps at most `AG_PAGE` = 16 cards and `AG_LIVE` = 10 live ones on the page, drops sections with nothing on this page (folded ones stay), and adds "‹ Previous" / "Next games (N more) ›" (right side, 96px clear of the date and menu buttons). The page starts over for a new day, tab, filter, Live or search (`agPageKey`). Headers still show each league's full count.
- If DJ still sees freezes, the next lever is removing sub-filters, which DJ offered; not needed so far.

## 3.97.2: tabs and taps (DJ's phone log on 3.96.3)
- Taps on the league tabs were lost (downs, no click) while `render()` ran about every 1.5s; renderTop rebuilt the tab row and the filter row on every render. The tab row now rebuilds only when its options or the picked league change (`sp._sig`), and the filter row is built aside and swapped in only when its HTML differs.
- `render()` (240-chrome.js) is held while a finger is down and until 0.4s after it lifts (`renderHeld`, using `agBusy`/`agTapping` from this file), unless the click itself asked for it. This covers every page.

## 3.100.1: leagues start folded on ALL (DJ)
- On the ALL tab every league section starts folded; My teams starts open. `COLLAPSED[title]` now stores 1 (folded) or 0 (opened) per phone, and a title with nothing stored uses the default. Folded sections queue no cards.

## 3.100.3: finished games last (DJ)
- Section order is live, then upcoming (slate games first), then final, everywhere (`rank` in `section()`), so with 16-game pages the finals land on the last pages.
- Tap check: each touch now records page changes inside the touched card or header while the finger was down (MutationObserver), whether the touched element was gone, and the redraw callers with index.html line numbers. DJ's 3.100.1 log: header and filter taps all landed; card taps (names, lines, badges) got no click, and render() was called about twice a second from an unnamed caller.

## 3.101.2 (Nov 18, 2026)
- DJ: no "My teams" section at the top of any tab (ALL, league tabs, Live). Favorites have their own ★ tab, and the star next to a favorite team on each card stays. The ALL tab's league sections all start folded.

## 3.121.11 (Nov 21, 2026)
- Soccer cards show the table place after the record ("7-0-3 · 3rd", from the slate's `<side>Standing`, set by slates.py; not on playoff games). ESPN's soccer record is already W-D-L. When a card is too tight, agFitNames drops the place (`.rec .tp`) first, then the records.
- Soccer one-liners (100-highlights.js): rank-only lines replaced by points facts from ESPN's table (clear at the top, behind the leaders, from safety / above the drop zone for epl/laliga/seriea bottom 3 and bundesliga/ligue1 bottom 2, points between them). Top scorer line fixed for soccer ("Matches: 10, Goals: 9"). Winless-in-five added. Head-to-head lines rank low for soccer.

## 3.121.12 (Nov 21, 2026) (undone in 3.130.5: soccer is home first again, docs/pages/soccer-order.md)
- DJ thought Fulham was home at Man City: soccer now uses the same order as every sport (away on top, home below, "@"; "vs" only for neutral grounds). sideOrder/sep in 040-live.js, the Board, and the soccer team-stats swap in 110-box-score.js all follow it.

## 3.121.14 (Nov 22, 2026)
- DJ: favorites (and slate games) are no longer pulled to the top of a league section; order is live, then by start time, then finished. The star and "Your team" tag mark them.
