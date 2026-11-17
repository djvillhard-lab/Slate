# Today's Slate
Last updated: Nov 17, 2026, 3.68.3

## Done
- Game cards line up one score column for the whole slate (fitScores in 240-chrome.js sets --tmw on #lineup-body):
  just past the longest team name, rank and record, the same spot on every card.
- 3.68.2: cards inside a folded time group (or a hidden slate) are skipped when measuring. They have no width,
  and measuring them set the column to 0px, so names vanished and scores printed over the records.

- 3.68.3: the Worth a look card no longer sets the column (it's narrower: its box and the +), so long names
  aren't cut on a regular iPhone; it gets its own --tmw sized to its width.

## Open
- Open Duo's left pane is under 330px, so records hide there (050-ux-review.css container rule), by design.
- All games (right pane, open Duo) still cuts names short ("The C…"): that's 160-all-games.js, not this page.

## Decisions
- Keep one shared score column (3.31.0) rather than per-card positions, so scores line up down the page.
