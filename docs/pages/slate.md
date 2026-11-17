# Today's Slate
Last updated: Nov 17, 2026, 3.72.0

## Done
- Game cards line up one score column for the whole slate (fitScores in 240-chrome.js sets --tmw on #lineup-body):
  just past the longest team name, rank and record, the same spot on every card.
- 3.68.2: cards inside a folded time group (or a hidden slate) are skipped when measuring. They have no width,
  and measuring them set the column to 0px, so names vanished and scores printed over the records.

- 3.68.3: the Worth a look card no longer sets the column (it's narrower: its box and the +), so long names
  aren't cut on a regular iPhone; it gets its own --tmw sized to its width.

- 3.68.8: names never cut short. After fitScores, slateFitNames (170-slate-page.js) hides a cut card's records,
  then swaps both names for the badge abbreviations (STMN, LIU), like All games 3.68.7. fitScores calls
  slateUnfitNames first so the column is always measured from the full names.

- 3.71.0: a live game's one-liner is in the color of the team it's about (hlLine marks data-side; hlTeamInk in
  150-game-row.js uses pairColors, then lightens/darkens to 4.5:1 against --card). No side (both teams) = live red.
  Slate cards only; All games and Worth a look keep red.
- 3.71.0: preview lines take the card's ranks (pvCompute's 4th arg g), since ESPN's summary can lag a new poll.
- 3.72.0: football Scoring (quick look and matchup) is the live feed's own play box: fdPlayCard in 145-live-feed.js
  (pulled out of the feed loop), listed by fdScoringList from the summary the quick look already has. Oldest first.
  Checked team text colors: all 1,287 team colors (660 teams) reach 4.5:1 on Midnight and Sunday Paper after hlInk.

## Open
- Live feed's own colors don't use hlInk: 36 teams' edge colors (white/yellow, e.g. Nets, Columbus Crew) barely show
  on Sunday Paper (fdTint only guards dark backgrounds), and 17 jerseys' numbers are under 3:1 (e.g. Marlins).
- Scoring boxes for other sports wait until DJ likes football's.
- The morning email's copy of pvCompute (worker/slate-kit.js) still uses the summary's ranks.
- If DJ likes team-colored lines, All games and Worth a look could follow.
- Open Duo's left pane is under 330px, so records hide there (050-ux-review.css container rule), by design.

## Decisions
- Keep one shared score column (3.31.0) rather than per-card positions, so scores line up down the page.
