# Matchup page (game detail)
Last updated: Nov 16, 2026, 3.52.8

## Done
- Header: league, teams (tap for team page), status, standings, location, Add to slate, Live feed button.
- Betting line strip under the header, then Claude's button (write preview / write recap / Regenerate) right under it, in every sport.
- Upcoming: Preview, Player stats (this season, not soccer), Team stats (this season). Live: Top performers and players, Team stats, Preview. Final: Recap and players, Team stats.
- Quick look (tray, `trayBlock` in `110-box-score.js`), before the start: location, betting line, Claude's preview or button, then the rest. Soccer shows lineups once announced, no season player stats.
- Code: `src/app/140-game.js` (`renderGame`, `previewSections`); Claude's button is `gameClaudeCtl` in `080-claude.js`.

## Open
- Nothing asked for yet.

## Decisions
- No Player stats section before the start for soccer (DJ, 3.52.5). 3.52.5 hid it for every sport; DJ wanted it back for the others (3.52.7).
- Claude's button lives at the top of the page only, not inside the sections (DJ, 3.52.5). The quick look keeps its own button, ordered the same way (under location and line, 3.52.8).

## Soccer live one-liners (3.60.2)
- Own goals are written as "an own goal by <player>" (ESPN's keyEvent participant is the player who put it in his own net). They're never the subject of "has scored" and never a team's standout: liveLeadLine drops any leader named "own goal".
- A goal with no scorer name from ESPN is left out of the scorer list, not called an own goal.
- 3.62.1: a missed or saved penalty with no name from ESPN names the team instead.
- Not checked on a live game yet (no soccer on when it shipped); worth a look next time an own goal happens.
