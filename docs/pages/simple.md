# Simple mode
Last updated: Nov 26, 2026, 3.140.3
Code: `src/app/287-simple.js` only (its styles are injected from the file as `#sm-css`, and it adds its own switch to
Settings > Look and text size). Check it with `python3 scripts/shots.py lineup --simple [l|xl|xxl]` and tap its buttons with `--eval`.
Concept page with DJ's picks: https://claude.ai/artifact/8LvyNL4aK2bvAYSpuzR6os

## What it is (DJ, Nov 25, 2026)
A second face for the app for older users (DJ's dad): the games, the scores and the channel, nothing to learn.
DJ's picks: one page (not tabs), turned on only by a switch in Settings (no family setup by the admin), News is the
regular News page in bigger type, team logos, player stats, a simple way to make slate rules, and the home page is the slate.

## How it works
- One layer, `#sm` (fixed, z-index 39: under the log-in page, welcome, sheets and toasts), drawn over the app from the
  same data: `lineupGames()`, `status()`, `scoreOf()`, `state.rules`. No page file changed. The app underneath keeps
  running. `render` is wrapped, so every redraw of the app redraws the layer (skipped when nothing on it changed;
  each column's scroll is kept).
- On/off and text size are kept on this phone only: localStorage `slate-simple` `{on, size}`. Turning it on or off
  reloads the page. Sizes are a font size on `#sm` (16, 18, 20 px); everything inside is in em.
- Pages (`SM.page`): `home` (Your slate: On now cards, later games as rows, Finished cards; bar = day before, day
  after, News, Help), `game` (score, sentence, Watch button through `watchLink`, score by quarter and three top
  players per team), `rules` (My slate), `add` and `add2` (Add games), `help`, `leave`.
- Player stats and the score by quarter come from ESPN's game summary (`smSum`: `bxFindEvent` + `bxSummaryUrl`,
  refreshed every 45 s while live). `smStat` writes ESPN's value in words ("27/39, 324 YDS, 3 TD" becomes
  "324 passing yards, 3 touchdowns"; a bare number gets the category, "23 points"). Nothing is shown when ESPN
  gives no leaders. The by-quarter table is left out past five columns (baseball).
- My slate uses the Slate rules page's own parts (`rlGroups`, `rlInfo`, `rlName`, `LG_OPTS`, `optInfo`, `setLg`,
  `setEvRule`), so both pages show the same rules. Remove has its own "Put it back".
- News, Change my teams and anything opened from them are the real pages ("peek", `SM.peek`): the layer hides, the
  page gets the biggest text size that fits (`applyLook` is wrapped), the app's own bar and menu are hidden, swipes
  are blocked, and `#sm-peekbar` holds "Back to my slate" (plus "Back" when a page was opened from there).
- Unfolded Duo: `panesOK` is wrapped so the two panes never start with Simple mode on (that is why the file sorts
  before 288 and 290). The layer draws two halves itself: the slate on the left, the tapped game (or Help, My slate)
  on the right. News in this shape shows the app's old split behind the bar.
- Touches on the layer stop before `document`, so swipe, pull-down and long press never fire.

- Class names inside the layer all start with `sm-` (3.140.3): the app styles bare `.tm`, `.nm` and the like for its own game cards.

## Open
- Not tried on a real phone yet: the top and bottom safe areas, the Dynamic Island on the folded Duo and the right
  half unfolded, and how the folded Duo's native side strip buttons behave (they still drive the app underneath).
- Step 2 from the concept needs an iPhone build and DJ's yes: worded side strip buttons, a Simple Lock Screen widget.
- Scores always show (the "hide scores" setting is ignored here). No per-game alert switches yet.
- The setting is per phone. Saving it with the profile needs `260-persistence.js` (shared file).
- Every redraw rebuilds the logos' `<img>` tags; fine with the browser cache, but reuse them if logos ever flicker.
