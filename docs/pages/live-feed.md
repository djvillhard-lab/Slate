# Live feed
Last updated: Nov 16, 2026, 3.43.4 (checked by the basketball feed thread)
Code: `src/app/145-live-feed.js` (shared page, football) and `src/app/146-live-feed-hoops.js` (basketball: `hpFeed` draws everything under the switcher; `feedBox` draws the box score for both sports), styles under "Live feed" in `src/styles/040-components.css`. Football and basketball.

## Done
- Game switcher of live games of the same sport (shows even with one game), swipe sideways to change games (3.34.0, 3.35.1).
- Score bar pinned under the top bar while scrolling; score moves with the play that scored, not before (3.34.0, 3.35.3).
- Football: field graphic (ball, line of scrimmage, line to gain), plays by drive. Basketball: each team's top scorer and
  win probability under the score bar, then one plain list: baskets, blocks, steals, turnovers as cards; misses, rebounds,
  fouls as one gray line each; subs hidden; a trip to the line is one card (3.37.0, 3.38.1).
- Basketball headlines in plain words for every ESPN play type: "Steal by A. Sengun", "Turnover: traveling", "Shot at the rim",
  "Technical foul: flopping", "Coach's challenge: call overturned". ESPN sometimes posts a turnover before labeling it (type "No Turnover"):
  a second player from the other team is the steal (3.40.2).
- Play tags beside the headline: lead change, ties, big play, 3rd/4th down, win-probability swings, runs (3.35.0, 3.35.2).
- Short, plain play text in sentence case; players as "F. Mendoza" with position (3.34.3, 3.36.8).
- Latest plays only (8 football, 12 basketball lines); "Show earlier plays" adds one batch per tap; resets on leaving (3.43.1).
- Box score under the plays (3.40.3). Checks ESPN every 4 seconds while open and on screen, waits until the finger is up (3.36.0, 3.36.5).

## Open
- Hockey and soccer versions (DJ: perfect the format first, then other sports).
- Corners and big numbers don't match the rest of the app yet (see Known drift in docs/DESIGN.md).

## Decisions (tried and undone; don't repeat)
- Basketball: no bonus or timeouts-left indicator. ESPN doesn't give them, and counting fouls ourselves would be a guess.
- Basketball: no folded "minor plays" rows or quarter headers (3.38.1): DJ found them confusing. ESPN's "End of the Nth Quarter" lines mark quarters.
- A fixed-height scroll box for the plays (3.41.1) was removed in 3.42.1: no inner scroll box on this page.
- A basketball shot chart (3.37.0) was removed in 3.38.1: simpler is better.
- Folded Duo spacing changes in 3.36.1–3.36.3 were undone in 3.36.4; only the pull-down at the top was kept.
