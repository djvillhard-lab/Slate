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
- The grip on the fold (`.pn-grip`, 44x88): drag left or tap = the right frame slides left; drag right = the other way.
  Frames swap by grid column (no reload), then the side that was left shows the picker (`SlateApp.panePick`): live games
  first (Live feed where `feedOk`, else the matchup), then the menu's pages (icons cloned from `#nav-*`), then "Keep ...".
- iPhone app: panes talk to it through the host (`slateHostPost`; "state"/"ready" are dropped). The strip's buttons
  (`go`, `back`, `today`, `day`, `toggleMenu`, `openGame`, `watch`) go to the side touched last (`slatePaneTouch`), and
  the strip is told that side's state. Panes draw their own menu and Back (no strip inside a pane). No iOS change.
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
