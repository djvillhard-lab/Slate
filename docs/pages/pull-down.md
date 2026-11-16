# Pull-down (folded Duo)
Last updated: Nov 16, 2026, 3.65.4

## Done
- In the iPhone app on the folded Duo, every page can be pulled down at the top to see what's under iOS's clock and Wi-Fi (right column). It springs back on release.
- Every page but the Live feed: iOS's own bounce (`overscroll-behavior-y: auto` on html and body, `040-components.css`). Same as the slate since 3.36.4, so the distance and stiffness match exactly.
- Pages too short to scroll: iOS doesn't bounce them, so `src/app/285-pull-down.js` slides the top bar and `#main-wrap` with UIScrollView's rubber-band curve (no cap), only when the pull is more down than sideways (page swipes still work). The dock stays put.
- Live feed: its own pull in `145-live-feed.js` (also slides the pinned score bar when scrolled down, 3.36.6).
- Not on the open Duo, a regular iPhone or the web; the JS pull respects reduced motion.

## Open
- The Live feed's own pull is still capped at 56 points; DJ may want it to match too.

## Decisions
- 3.65.2 used a JS pull capped at 56 points on every page; DJ said it didn't go as far as the slate, so 3.65.4 switched to iOS's bounce.
- No gutters, top gaps or sticky offsets for the status cluster (DJ rejected them in 3.36.1 to 3.36.3). The pull is the only fix.
