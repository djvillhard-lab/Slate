# Page swiping (days, leagues, tabs, Back)

Code: the swipe handler in `src/app/280-ios-bridge.js` (touchstart/touchmove/touchend), the redraw hold `agBusy` in `src/app/160-all-games.js`.

## Done
- 3.121.13 (DJ, Nov 22: "swiping pages has a slight delay, it's causing issues swiping quickly to a day or league"). Cause: the swipe's page change ran 0.11s after lift, which is inside the 0.4s after-lift hold that protects taps (renderHeld / agBusy), so render() waited ~0.5s and the old page slid back in first. Fixes: the swipe's own change runs with `agTapping` set (`swRun`); a lift that ends a swipe (`agSwipeAt`) doesn't start the 0.4s tap hold; a new touch flushes the previous swipe's pending slide-out (`swFlush`) so rapid swipes each count and the next drag moves the new page.

## Decisions
- The tap hold stays for real taps and for live score redraws while a finger is down. Don't remove it (DJ's lost taps, 3.96.x).

## Open
- Check on DJ's phone that four or five quick swipes land on the right day/league.
