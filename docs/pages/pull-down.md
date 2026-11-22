# Pull-down (iPhone Duo app)
Last updated: Nov 22, 2026, 3.122.1

## Done
- In the iPhone app on the folded Duo, every page can be pulled down at the top to see what's under iOS's clock and Wi-Fi (right column). It springs back on release.
- Every page but the Live feed: iOS's own bounce (`overscroll-behavior-y: auto` on html and body, `040-components.css`). Same as the slate since 3.36.4, so the distance and stiffness match exactly.
- Pages too short to scroll: iOS doesn't bounce them, so `src/app/285-pull-down.js` slides the top bar and `#main-wrap` with UIScrollView's rubber-band curve (no cap), only when the pull is more down than sideways (page swipes still work). The dock stays put.
- Live feed: its own pull in `145-live-feed.js` (also slides the pinned score bar when scrolled down, 3.36.6).
- Duo unfolded, two panes (3.65.5): each pane's pull is done in `285-pull-down.js` (header + body of the pane under the finger, when the pane is at its top, rubber band sized to the pane). iOS's bounce is off on the panes so it never doubles.
- Duo unfolded, one page: iOS's bounce, same as folded (the CSS rule covers any non-split Duo layout, `:not(.iphone)`).
- Not on a regular iPhone or the web; the JS pull respects reduced motion.

## Corner kept clear (3.122.1)
- DJ (Nov 22) asked that nothing sit under the clock and Wi-Fi on the folded Duo (not unfolded, not iPhone; ignore the longer island with live activities). Measured from DJ's screenshot: x 385-438 of 466, top 152 points.
- `src/styles/099-duo-corner.css` moves only the top-right items of each page's first block left of it (`--duo-cut` = strip width - 12): matchup's right column, team page star, Teams' My teams/Standings, News' leagues line, Settings' first row, the first switch or button on every Settings page, Notifications' On/Off, Slate rules summary. The slate, All games, On TV, Box Office and Live feed were already clear (padded rows, faded tab rows, 3.91.4).
- A new page whose first block has something at the top right needs a line in that file. To check: shots.py folded with an --eval that lists elements inside that rectangle.

## Open
- The Live feed's own pull is still capped at 56 points; DJ may want it to match too.

## Decisions
- 3.65.2 used a JS pull capped at 56 points on every page; DJ said it didn't go as far as the slate, so 3.65.4 switched to iOS's bounce.
- No gutters, top gaps or sticky offsets for the status cluster (DJ rejected them in 3.36.1 to 3.36.3). Since 3.122.1 only the corner items move (DJ's Nov 22 ask).
