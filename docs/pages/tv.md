# On TV
Last updated: Nov 26, 2026, 3.135.0
Code: `src/app/210-tv.js` (its new styles are injected from the file as `#tv-css`); TV watch setups in `src/app/215-tv-setups.js` (`#tvs-css`). Filter tabs (All, National TV, Streaming, My TVs) are in `070-navigation.js` and `240-chrome.js`.

## Done
- 3.102.1 (DJ, from the Nov 18 competitor review): My channels. `TV.edit` swaps the page for a list of today's channels (and any hidden ones) with a switch each; hidden names are kept in `localStorage` `slate-tv-hide` (`TV_HIDE`), on this phone only.
- 3.102.1: a channel with more than six games shows five (`TV_MAX`) and "Show all N" (`TV.all`, until the app reloads). Within a channel: live, then upcoming, then finished.

- 3.130.10 (DJ, Nov 25): Prime Video links open the Prime Video app. Its web home page isn't claimed by the app (it stayed in Safari), so `APPS.prime` carries a third entry, the app address `aiv://aiv/home`. Inside the iPhone app (`inApp()` in `010-core.js`) a tap tries that first; if the page is still showing 1.5 s later (app not installed) the web address opens. Safari on the web keeps the web link. Works with every build out (no `ios/` change: the app already hands any non-web address to iOS). Any other app whose home page stays in Safari can get the same third entry.
- 3.134.4 (DJ, Nov 26): every channel button (`watchLink`: game cards, matchup, On TV "Watch", Live feed score bar) opens the Watch sheet, even with one app (one solid "Open X" button). The Lock Screen Watch button (`SlateApp.watch` in `280-ios-bridge.js`) still opens a single app directly, since it's tapped from outside the app.
- 3.134.7 (DJ, Nov 26): channel button tap areas. Measured with elementFromPoint: slate/All games card channel (`.g-side .net`) was 53x45 drawn but only ~25 px tall to a finger on live cards, because the Feed button's 44-point `::after` covered its lower half. Fix in `050-ux-review.css`: on `.has-feed` cards the channel button sits above Feed (z-index 2) and its box stops where Feed starts. On TV Watch (89x44) and the Live feed's `.fd-mw` (44-point `::after`) were already fine. DJ: don't make them bigger, he hits them by accident (that's why the popup exists).
- 3.135.0 (DJ, Nov 25): **TV watch setups** on On TV's own My TVs tab (`state.tvFilter` "setups", last in `TV_TABS`; DJ picked its own tab over the top of All) (concept: https://claude.ai/artifact/Dha6DYzZmsqbEN67My2Qa8). A setup is up to 5 TVs on a 24 x 14 grid wall (`TVW`, `TVH`; x, y, w, h in grid units), each with a name, `main` (your teams first) and `split` (1, 2 or 4 games: YouTube TV Multiview and the like). Layout presets in `TV_PRESETS`. Editor: drag a TV to move, its corner (`.rz`) to resize; only that box moves while the finger is down and the wall/panel redraw 0.42 s after lift. `renderTV` doesn't redraw the editor once drawn (`TVS.drawn`), so live updates don't wipe a drag or the name being typed.
  - Saved per person in `data/users/<uid>/tv-setups` `{v, list, cur}` (own file, like thumbs; no shared persistence change), copied to `localStorage` `slate-tv-setups`. "Just tonight" is `TVS.once`, never saved.
  - Times (`tvsSlots`): "Live now" when anything is live, then each upcoming start time (15-minute buckets). Live pool = live games plus ones starting within 20 min; a later time = games on at that time. Ranking `tvsRank`: your team, then on your slate, then the rule score, national TV a little, no listed channel last. `tvsFill`: main TV takes your team's game first, then TVs by size.
  - DJ (Nov 25): no app or service per TV. It's about the matchup, with the channel big (`tvsChan`: a national channel first, then one with an app). Watch opens the Watch popup (`watchLink`).
  - Swap pins a game to a TV spot for today (`TVS.pins`, `localStorage` `slate-tv-pins`, cleared next day).

## Open
- Second release (DJ's pick pending on the decision cards): learning from swaps (which leagues/teams land on which TV), and a red "Close game: put it on the main TV?" note.
- Hidden channels are per phone. Saving them with the profile needs `260-persistence.js` (shared file).
- Hidden channels still appear on game cards and in the slate; only the On TV page leaves them out.

## Decisions
- My channels is a button on the page, not a fourth filter tab: the tabs live in a shared file and swipe between each other.
