# Pull-down (folded Duo)
Last updated: Nov 16, 2026, 3.65.2

## Done
- In the iPhone app on the folded Duo, every page can be pulled down at the top to see what's under iOS's clock and Wi-Fi (right column). It springs back on release.
- Tonight's Slate: iOS's own bounce (`overscroll-behavior-y: auto`, `040-components.css`, since 3.36.4).
- Live feed: its own pull in `145-live-feed.js` (also slides the pinned score bar when scrolled down, 3.36.6).
- Every other page: `src/app/285-pull-down.js` (3.64.1) slides the top bar and `#main-wrap` together, at most 56 points, only at the top of the page, only when the pull is more down than sideways (so page swipes still work). The dock stays put.
- Not on the open Duo, a regular iPhone or the web; respects reduced motion.

## Open
- If DJ wants the slate to feel identical to the other pages, it could move to the same JS pull instead of iOS's bounce.

## Decisions
- No gutters, top gaps or sticky offsets for the status cluster (DJ rejected them in 3.36.1 to 3.36.3). The pull is the only fix.
