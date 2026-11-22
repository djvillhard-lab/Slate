# Navigation: Three pages (3.128.0, DJ Nov 22 2026)

Code: `src/app/283-three-pages.js`, `src/styles/101-three-pages.css`, the `"page"` swipe mode in `280-ios-bridge.js`. The Classic menu (`070-navigation.js`, `240-chrome.js`, docs/pages/menu.md) is untouched and still the fallback.

## What it is
- News | Slate | All games, the slate in the middle. A swipe on the page body on those three only changes page (`n3SwipeOk`, `n3Page`). Day, league and News tab swipes are off there; days use the header arrows (`#title-d`, shown on every dated page, with Today), tabs are tap-only.
- Glass capsule `#n3-bar` (196x56, 46pt round buttons), centered on the screen (folded Duo: the whole screen including the side column). Tapping the lit hammer opens `#n3-row`: Box Office, On TV, Teams, Settings.
- The bar shows on the three pages plus On TV, Teams, Box Office/Moments and Settings' main page. Anything you open (game, team, Settings sub-page, article) shows Back alone, bottom right. Bar and Back are never on screen together.
- All games on the iPhone Duo (`deviceMode() === "duo"`): `#strip` is hidden, `#n3-fb` (bottom right) opens `#n3-rail` over the page: every league from `filterOpts`, ALL at the bottom, leagues with no games gray and disabled (DJ), plus the day control `#n3-day`. The button wears the picked league's name. Regular iPhone keeps the top league row.
- The slate (3.128.3, DJ: "no easy date picker from the slate page"): the same button `#n3-fb` in day mode (`data-m="day"`, `n3DayOn`), every phone, opens only `#n3-day` above it; wears the date when off today.
- Unfolded Duo (two panes): bar only in the right pane, controls only that pane. No bar on the left. Swipes in panes are unchanged.
- html attributes: `data-nav3` (layout on), `data-n3bar` (bar showing), `data-n3f` (filter button mode).

## Classic menu
- Settings > Look and text size > Navigation: Three pages / Classic menu. Stored in `localStorage["slate-nav"]` ("classic", anything else = three).
- The iPhone app draws its own menu button natively, so Three pages only runs in the app when the build says it can (`SLATE_NATIVE.webNav`). Builds up to 3.121.9 (54) don't, so they stay on Classic by themselves and the switch explains why.

## Open
- iPhone app half shipped in 3.128.1 (DJ said yes Nov 22): boot flag `webNav: true`, message `{t:"nav", web:true|false}`, RootView hides its FloatMenu while the page draws the bar. It is TestFlight 3.128.1 (56), on DJ's phone Nov 22.
- `scripts/shots.py` pretends to be a new build by default; `--old-app` shows what today's build gets.
- Not decided: whether swipes in the unfolded panes should also become page-only.
