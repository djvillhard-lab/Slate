# On TV
Last updated: Nov 18, 2026, 3.102.1
Code: `src/app/210-tv.js` (its new styles are injected from the file as `#tv-css`). Filter tabs (All, National TV, Streaming) are in `070-navigation.js`.

## Done
- 3.102.1 (DJ, from the Nov 18 competitor review): My channels. `TV.edit` swaps the page for a list of today's channels (and any hidden ones) with a switch each; hidden names are kept in `localStorage` `slate-tv-hide` (`TV_HIDE`), on this phone only.
- 3.102.1: a channel with more than six games shows five (`TV_MAX`) and "Show all N" (`TV.all`, until the app reloads). Within a channel: live, then upcoming, then finished.

- 3.130.10 (DJ, Nov 25): Prime Video links open the Prime Video app. Its web home page isn't claimed by the app (it stayed in Safari), so `APPS.prime` carries a third entry, the app address `aiv://aiv/home`. Inside the iPhone app (`inApp()` in `010-core.js`) a tap tries that first; if the page is still showing 1.5 s later (app not installed) the web address opens. Safari on the web keeps the web link. Works with every build out (no `ios/` change: the app already hands any non-web address to iOS). Any other app whose home page stays in Safari can get the same third entry.

## Open
- Hidden channels are per phone. Saving them with the profile needs `260-persistence.js` (shared file).
- Hidden channels still appear on game cards and in the slate; only the On TV page leaves them out.

## Decisions
- My channels is a button on the page, not a fourth filter tab: the tabs live in a shared file and swipe between each other.
