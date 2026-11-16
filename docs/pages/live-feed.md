# Live feed
Last updated: Nov 15, 2026, 3.43.4 (written from the changelog; the thread that next works on it should correct anything off)
Code: `src/app/145-live-feed.js`, styles under "Live feed" in `src/styles/040-components.css`. Football and basketball.

## Done
- Game switcher of live games of the same sport (shows even with one game), swipe sideways to change games (3.34.0, 3.35.1).
- Score bar pinned under the top bar while scrolling; score moves with the play that scored, not before (3.34.0, 3.35.3).
- Football: field graphic (ball, line of scrimmage, line to gain), plays by drive. Basketball: each team's top scorer and
  win probability under the score bar, plays by quarter (3.37.0, 3.38.1).
- Play tags beside the headline: lead change, ties, big play, 3rd/4th down, win-probability swings, runs (3.35.0, 3.35.2).
- Short, plain play text in sentence case; players as "F. Mendoza" with position (3.34.3, 3.36.8).
- Latest plays only (8 football, 12 basketball lines); "Show earlier plays" adds one batch per tap; resets on leaving (3.43.1).
- Box score under the plays (3.40.3). Checks ESPN every 4 seconds while open and on screen, waits until the finger is up (3.36.0, 3.36.5).

## Open
- Hockey and soccer versions (DJ: perfect the format first, then other sports).
- Corners and big numbers don't match the rest of the app yet (see Known drift in docs/DESIGN.md).

## Decisions (tried and undone; don't repeat)
- A fixed-height scroll box for the plays (3.41.1) was removed in 3.42.1: no inner scroll box on this page.
- A basketball shot chart (3.37.0) was removed in 3.38.1: simpler is better.
- Folded Duo spacing changes in 3.36.1–3.36.3 were undone in 3.36.4; only the pull-down at the top was kept.
