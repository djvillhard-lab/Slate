# On TV
Last updated: Nov 18, 2026, 3.102.1
Code: `src/app/210-tv.js` (its new styles are injected from the file as `#tv-css`). Filter tabs (All, National TV, Streaming) are in `070-navigation.js`.

## Done
- 3.102.1 (DJ, from the Nov 18 competitor review): My channels. `TV.edit` swaps the page for a list of today's channels (and any hidden ones) with a switch each; hidden names are kept in `localStorage` `slate-tv-hide` (`TV_HIDE`), on this phone only.
- 3.102.1: a channel with more than six games shows five (`TV_MAX`) and "Show all N" (`TV.all`, until the app reloads). Within a channel: live, then upcoming, then finished.

- 3.130.10 (DJ, Nov 25): Prime Video links open the Prime Video app. Its web home page isn't claimed by the app (it stayed in Safari), so `APPS.prime` carries a third entry, the app address `aiv://aiv/home`. Inside the iPhone app (`inApp()` in `010-core.js`) a tap tries that first; if the page is still showing 1.5 s later (app not installed) the web address opens. Safari on the web keeps the web link. Works with every build out (no `ios/` change: the app already hands any non-web address to iOS). Any other app whose home page stays in Safari can get the same third entry.
- 3.134.4 (DJ, Nov 26): every channel button (`watchLink`: game cards, matchup, On TV "Watch", Live feed score bar) opens the Watch sheet, even with one app (one solid "Open X" button). The Lock Screen Watch button (`SlateApp.watch` in `280-ios-bridge.js`) still opens a single app directly, since it's tapped from outside the app.
- 3.134.7 (DJ, Nov 26): channel button tap areas. Measured with elementFromPoint: slate/All games card channel (`.g-side .net`) was 53x45 drawn but only ~25 px tall to a finger on live cards, because the Feed button's 44-point `::after` covered its lower half. Fix in `050-ux-review.css`: on `.has-feed` cards the channel button sits above Feed (z-index 2) and its box stops where Feed starts. On TV Watch (89x44) and the Live feed's `.fd-mw` (44-point `::after`) were already fine. DJ: don't make them bigger, he hits them by accident (that's why the popup exists).

## Open
- Hidden channels are per phone. Saving them with the profile needs `260-persistence.js` (shared file).
- Hidden channels still appear on game cards and in the slate; only the On TV page leaves them out.

## Decisions
- My channels is a button on the page, not a fourth filter tab: the tabs live in a shared file and swipe between each other.
