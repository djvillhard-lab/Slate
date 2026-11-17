# Two panes on the unfolded Duo

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
  restores them; folding lands on the slate (unchanged rule).
- The grip on the fold (`.pn-grip`, 44x88): drag either way or tap = the two sides swap (3.81.4, DJ: no picker).
  Frames swap by grid column (no reload). The "Pick a page" screen from 3.80.0 was removed at DJ's request.
- One menu (3.81.2, DJ after trying 3.80.0 on the Duo): the app's menu and Back (and the strip's buttons) always go to
  the right side. The right pane gets `data-float` when the app draws its own menu, so it hides its menu button and
  Back (like the folded phone with the app's floating menu); in a browser it keeps its own. The left pane
  (`html.pn-left`) has no menu or Back. A game, Live feed or team opened from a list on the left opens on the right
  (`slatePaneOpen`); inside a matchup or Live feed that was slid over to the left, switching games stays left.
- Lock (3.81.5, DJ): hold the grip 550 ms to toggle `PN.lock` (kept in `slate-panes`). Locked, the left pane loses
  `pn-left`, so it has its own menu and Back and opens games, feeds and teams on its own side; a small accent lock
  shows on the grip and a tip says which mode. Tapping still swaps. The app's menu and Back still go to the right.
- Inside a matchup, Live feed or team page on the left, switching games always stays on the left, locked or not.
- iPhone app: panes talk to it through the host (`slateHostPost`; "state"/"ready" are dropped). The strip's buttons
  (`go`, `back`, `today`, `day`, `toggleMenu`, `openGame`, `watch`) go to the right side, and the app is told the
  right side's state (its Back and lit menu button). No iOS change.
- Settings: when one side saves settings or notifications, the other side and the host take the same values
  (`slatePaneSaved`, `PN_SET_KEYS`), so neither side later saves an old copy over the change.
- New versions: a pane reloads itself on its own page; the host never auto-reloads while the panes are up.
- `?panes=off` in the URL gives the old fixed layout (slate left, pages right), which still runs before sign-in.
- `scripts/shots.py --sizes open` now goes into the right pane (`--pane left` for the left one).

## Open
- A pane is about 365 points wide, a little narrower than the folded cover screen (about 382). The Live feed's score
  bar crowds at that width for NBA (a record sits under the score); that page belongs to the Live feed thread.
- Not tried on the real iPhone Duo yet: scrolling inside the frames and the grip on the crease need DJ's thumb.
- Ideas if DJ wants them: a Settings switch back to the old layout; swap both sides in one move.
