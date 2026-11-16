# Matchup page (game detail)
Last updated: Nov 16, 2026, 3.52.7

## Done
- Header: league, teams (tap for team page), status, standings, location, Add to slate, Live feed button.
- Betting line strip under the header, then Claude's button (write preview / write recap / Regenerate) right under it, in every sport.
- Upcoming: Preview, Player stats (this season, not soccer), Team stats (this season). Live: Top performers and players, Team stats, Preview. Final: Recap and players, Team stats.
- Code: `src/app/140-game.js` (`renderGame`, `previewSections`); Claude's button is `gameClaudeCtl` in `080-claude.js`.

## Open
- Nothing asked for yet.

## Decisions
- No Player stats section before the start for soccer (DJ, 3.52.5). 3.52.5 hid it for every sport; DJ wanted it back for the others (3.52.7).
- Claude's button lives at the top of the page only, not inside the sections (DJ, 3.52.5). The quick look's tray (`110-box-score.js`) keeps its own.
