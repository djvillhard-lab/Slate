# UX review (Nov 16, 2026)
Last updated: Nov 16, 2026, 3.50.0
The review: https://claude.ai/artifact/24encSLC7RvVkNCUCDoDfA (20 numbered items, releases A to D). DJ said build all of them and keep them easy to undo.
Code: `src/styles/070-ux-review-3.css` (one block per release, loaded last) plus the small JS changes named below.

## Done
- Release A, 3.48.0 (items 1, 2, 3, 4, 19): full team names on upcoming games, Watch button, 44-point touch areas, readable light team chips (`badgeFor` in 040-live.js), Hit tag, day picker labels.
- Release B, 3.49.0 (items 5, 6, 15): `html.dock-away` hides the day picker and Back while scrolling down (end of 070-navigation.js); Best bets above Finished (170-slate-page.js); the dock's day picker also shows on the slate when not on the open Duo (`renderDockDay`).
- Release C, 3.50.0 (items 7, 8, 9, 17): 8-point corners; On/Off pairs in Notifications and Scores in Settings draw as the sliding switch (CSS only: still two buttons, the unchosen one covers the switch); "It lists" check boxes; Slate rules icon is sliders (body.html and `rules` in 270-wiring.js); Red zone tag gray, Hit in the accent.

## Open
- Release D (see the review's hand-off list).

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
