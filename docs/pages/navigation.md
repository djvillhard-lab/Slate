# Navigation: Three pages (3.128.0, DJ Nov 22 2026)

Code: `src/app/283-three-pages.js`, `src/styles/101-three-pages.css`, the `"page"` swipe mode in `280-ios-bridge.js`. The Classic menu (`070-navigation.js`, `240-chrome.js`, docs/pages/menu.md) is untouched and still the fallback.

## What it is
- News | Slate | All games, the slate in the middle. A swipe on the page body on those three only changes page (`n3SwipeOk`, `n3Page`). Day, league and News tab swipes are off there; days use the header arrows (`#title-d`, shown on every dated page, with Today), tabs are tap-only.
- Glass capsule `#n3-bar` (196x56, 46pt round buttons), centered on the screen (folded Duo: the whole screen including the side column). Tapping the lit hammer opens `#n3-row`: Box Office, On TV, Teams, Settings.
- The bar shows on the three pages plus On TV, Teams, Box Office/Moments and Settings' main page. Anything you open (game, team, Settings sub-page, article) shows Back alone, bottom right. Bar and Back are never on screen together.
- All games on the iPhone Duo (`deviceMode() === "duo"`): `#strip` is hidden, `#n3-fb` (bottom right) opens `#n3-rail` over the page: every league from `filterOpts`, ALL at the bottom, leagues with no games gray and disabled (DJ), plus the day control `#n3-day`. The button wears the picked league's name. Regular iPhone keeps the top league row.
- The slate (3.129.1): `#n3-dr`, a glass pair of day arrows bottom right, always showing, plus `#n3-dt` (Today, with the date) above them when off today. DJ rejected a date button that opened the day control (3.128.3): "Don't want to have two clicks before switching days." 3.129.2 (DJ): the arrows are on All games too (every phone); there the filter button sits above them (`html[data-n3f]` rules at the end of the CSS) and the filter no longer has a day control (DJ didn't like it beside the rail). Off today: Today (`#n3-dt`) is a button of its own and the shown date a separate plain label (`#n3-dd`); the header Today button is hidden on these two pages (News, On TV and Box Office keep it). The rail is capped at 100dvh - 310px so it stays under the folded Duo's clock and Wi-Fi.
- Unfolded Duo (two panes): bar only in the right pane, controls only that pane. No bar on the left. Swipes in panes are unchanged.
- html attributes: `data-nav3` (layout on), `data-n3bar` (bar showing), `data-n3f` (filter button mode).

- 3.129.3 (DJ): Settings is a permanent round button beside Search in every page header (`n3Gear` un-hides the existing `#btn-settings` / `#l-btn-settings`); the hammer row is Box Office, On TV, Teams. The day arrows, Today button and date label are on every dated page (slate, All games, News, On TV, Box Office) through `n3SetDay` / `n3DayOf`; no Today button in any header.

## Hint at the hammer row (3.130.8)
- DJ (Nov 23): people couldn't tell Box Office, On TV and Teams live above the hammer. Cue must be subtle and take no page space.
- Built: a small up chevron at the top of the lit hammer disc (CSS only, `::before` on `.n3-b[data-p=lineup][aria-current=page][aria-expanded=false]` in 101-three-pages.css), the hammer drops 2px to make room; it nudges up twice each time the slate lights (none with Reduce Motion). Hidden while the row is open (the X shows).
- Not built (options if DJ wants more): a one-time peek of the row on first launch; a tiny label "More" under the hammer.

## Classic menu
- Settings > Look and text size > Navigation: Three pages / Classic menu. Stored in `localStorage["slate-nav"]` ("classic", anything else = three).
- The iPhone app draws its own menu button natively, so Three pages only runs in the app when the build says it can (`SLATE_NATIVE.webNav`). Builds up to 3.121.9 (54) don't, so they stay on Classic by themselves and the switch explains why.

## Open
- iPhone app half shipped in 3.128.1 (DJ said yes Nov 22): boot flag `webNav: true`, message `{t:"nav", web:true|false}`, RootView hides its FloatMenu while the page draws the bar. It is TestFlight 3.128.1 (56), on DJ's phone Nov 22.
- `scripts/shots.py` pretends to be a new build by default; `--old-app` shows what today's build gets.
- Not decided: whether swipes in the unfolded panes should also become page-only.

## Short messages (toast), 3.130.9 (Nov 24, 2026)
- With Three pages on, the toast sits 142px from the bottom, above the glass bar (`101-three-pages.css`). It must also set `top: auto !important`: `050-ux-review.css` pins toasts to the top with `!important`, and with both set the toast stretched into a tall capsule covering the page (3.128.0 to 3.130.8). Checked folded, open (both panes) and iPhone.

## No live dot on the bar (3.140.4, DJ Nov 25, 2026)
- DJ: "Remove red dot on all games menu." The All games button in the bar no longer gets a red dot when a game is live. The league rail's dots (`.n3-lg .n3-live`) stay.
