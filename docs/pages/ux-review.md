# UX review (Nov 16, 2026)
Last updated: Nov 16, 2026, 3.51.0
The review: https://claude.ai/artifact/24encSLC7RvVkNCUCDoDfA (20 numbered items, releases A to D). DJ said build all of them and keep them easy to undo.
Code: `src/styles/070-ux-review-3.css` (one block per release, loaded last) plus the small JS changes named below.

## Done
- Release A, 3.48.0 (items 1, 2, 3, 4, 19): full team names on upcoming games, Watch button, 44-point touch areas, readable light team chips (`badgeFor` in 040-live.js), Hit tag, day picker labels.
- Release B, 3.49.0 (items 5, 6, 15): `html.dock-away` hides the day picker and Back while scrolling down (end of 070-navigation.js); Best bets above Finished, UNDONE in 3.51.2 at DJ's ask: it is back at the bottom (170-slate-page.js); the dock's day picker also shows on the slate when not on the open Duo (`renderDockDay`).
- Release C, 3.50.0 (items 7, 8, 9, 17): 8-point corners; On/Off pairs in Notifications and Scores in Settings draw as the sliding switch (CSS only: still two buttons, the unchosen one covers the switch); "It lists" check boxes; Slate rules icon is sliders (body.html and `rules` in 270-wiring.js); Red zone tag gray, Hit in the accent.
- Release D, 3.51.0 (items 10 to 14, 16, 18, 20): open Duo slate spacing; Box Office rows break after three stats in the open Duo pane and at large text (`.rk-br` from `rkStats`); On TV channel name on its own line; team tiles use the short code and may wrap; the footer sentence and Enter passcode show only in Settings; a live quick look has one big button (Live feed); stray text sizes folded in; shorter Text size note.

## Open
- Item 10 is only partly done: Time/League and Live did not move into the header's date row (they don't fit beside the date in a 380-point pane, less so at large text). The gap under the header was tightened instead (first game about 35 points higher).
- Theme ideas: mockups only, waiting on DJ (Midnight stays). (see the review's hand-off list).

## How to undo
- One release: `git revert` its commit (each release is one commit named `X.Y.Z: UX review, release …`), then renumber and rebuild.
- All of it: the `pre-ux-review-3` branch is main from just before 3.48.0.

## Decisions
- Sizes in the new CSS divide by `--z` (`calc(44px / var(--z, 1))`), so a touch area is 44 real points at every Text size. DJ tests at S on the Duo.
- Buttons that are small on purpose (Time/League, Live, ×, the check mark) keep their look; only an invisible `::after` area grows.
- Team chips: dark letters only when they beat white on that color; mid-tone colors (reds, blues) keep white.
- The dock stays hidden until a scroll up (like Safari's toolbar), not after a pause: coming back on a pause would cover the content again right when DJ stops to read.
- Item 7 changed from the review: the review said to give Slate a new menu icon, which needs a new iPhone build for the strip. Giving Slate rules the new icon fixes the same clash with no build.
- Corner overrides use `:not(#_):not(#_)` to beat the id-based `!important` rules in 050-ux-review.css.

- 3.51.2: the 44-point hit area on `.lg-tab` used `::after`, which is also the selected tab's accent underline, so the line jumped to the top of the tab. The hit area is `::before` now. Before adding a `::before`/`::after` hit area to anything, grep for an existing one.

## Themes
- 3.52.0: Sunday Paper (`paper` in `THEMES`, 010-core.js), the one light theme, with a new Navy accent. DJ picked it from mockups; he found dark tints of Midnight (blue, purple, deeper navy) too close to Midnight, so don't offer those again. Midnight stays the default.
- Check a theme with `scripts/shots.py <pages> --look paper`.
- Open: `ios/Slate/RootView.swift` `slateBackground("light")` is still #F2F4F7, so the native strip is a cooler gray than the cream page. Change it to #F1EBDD with the next iPhone build.
