# UX review (Nov 16, 2026)
Last updated: Nov 16, 2026, 3.48.0
The review: https://claude.ai/artifact/24encSLC7RvVkNCUCDoDfA (20 numbered items, releases A to D). DJ said build all of them and keep them easy to undo.
Code: `src/styles/070-ux-review-3.css` (one block per release, loaded last) plus the small JS changes named below.

## Done
- Release A, 3.48.0 (items 1, 2, 3, 4, 19): full team names on upcoming games, Watch button, 44-point touch areas, readable light team chips (`badgeFor` in 040-live.js), Hit tag, day picker labels.

## Open
- Releases B, C and D (see the review's hand-off list).

## How to undo
- One release: `git revert` its commit (each release is one commit named `X.Y.Z: UX review, release …`), then renumber and rebuild.
- All of it: the `pre-ux-review-3` branch is main from just before 3.48.0.

## Decisions
- Sizes in the new CSS divide by `--z` (`calc(44px / var(--z, 1))`), so a touch area is 44 real points at every Text size. DJ tests at S on the Duo.
- Buttons that are small on purpose (Time/League, Live, ×, the check mark) keep their look; only an invisible `::after` area grows.
- Team chips: dark letters only when they beat white on that color; mid-tone colors (reds, blues) keep white.
