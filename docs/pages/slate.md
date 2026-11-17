# Today's Slate
Last updated: Nov 17, 2026, 3.68.2

## Done
- Game cards line up one score column for the whole slate (fitScores in 240-chrome.js sets --tmw on #lineup-body):
  just past the longest team name, rank and record, the same spot on every card.
- 3.68.2: cards inside a folded time group (or a hidden slate) are skipped when measuring. They have no width,
  and measuring them set the column to 0px, so names vanished and scores printed over the records.

## Open
- The column uses the narrowest card on the page, including the Worth a look card, so on the iPhone long names
  ("The Citadel") get cut a little on the regular cards too. Could measure the main cards only if DJ wants.

## Decisions
- Keep one shared score column (3.31.0) rather than per-card positions, so scores line up down the page.
