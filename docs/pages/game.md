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
- "On your slate" / "Add to slate" is a small 30px button on the right of the header card, beside the conference and arena lines (DJ, 3.66.5: "too big, should be on the right side"). Done in CSS only (`.gv-head` is a two-column grid; end of `040-components.css`); the tap area stays 44 points. It sits below the score row, so it's clear of the folded Duo's clock.
- No Player stats section before the start for soccer (DJ, 3.52.5). 3.52.5 hid it for every sport; DJ wanted it back for the others (3.52.7).
- Claude's button lives at the top of the page only, not inside the sections (DJ, 3.52.5). The quick look keeps its own button, ordered the same way (under location and line, 3.52.8).

## Soccer live one-liners (3.60.2)
- Own goals are written as "an own goal by <player>" (ESPN's keyEvent participant is the player who put it in his own net). They're never the subject of "has scored" and never a team's standout: liveLeadLine drops any leader named "own goal".
- A goal with no scorer name from ESPN is left out of the scorer list, not called an own goal.
- 3.62.1: a missed or saved penalty with no name from ESPN names the team instead.
- Not checked on a live game yet (no soccer on when it shipped); worth a look next time an own goal happens.
- 3.62.3 (DJ: "I want to know which team missed the penalty, as well as the player"): soccer lines name player and team, as "Arsenal's Saka has missed a penalty", "an own goal by Chelsea's Smith" (the player's own team), "set up two goals for Arsenal", "Arsenal's Raya ... clean sheet". Team alone only when ESPN has no name; lines are rebuilt each refresh, so the player appears once ESPN adds him. Checked against six real games with own goals and a saved penalty (Nov 2026 EPL, Bundesliga, Serie A).

## Players to watch stats (3.66.6)
- DJ: "Pritchard here should show his 3 point percentage or something instead of saying Boston guard." Claude sometimes wrote a role ("Boston guard") as the stat line when ESPN's game summary had no numbers for that player (it only lists each team's leaders).
- Now every Players to watch row (quick look and matchup page) shows ESPN season numbers: `pwFill`/`pwLine`/`pwRow` in `080-claude.js`, fetched once per team per session from ESPN's team season stats (`seasonFetch`), matched by name. The numbers follow Claude's line and note ("Shooting from three" → 3P%, "glass" → rebounds, "creator" → assists); otherwise points plus rebounds or assists of 5+, or 3P% for a 4+ attempt shooter. Hockey: G, A, PTS (goalies SV%, GAA, W). Football: pass yds/TD/INT, rush yds, receiving, tackles. Baseball: AVG/HR/RBI or ERA/W-L/K. Soccer: goals, assists, games.
- If ESPN has no match, Claude's own line shows only when it has a number; a role alone is never shown. Top performers (recap) keep Claude's box lines.
- The preview prompt (`worker/index.js`) now says each line must be numbers, never a role.
- shots.py now closes the welcome screen on the test account before taking pictures.


## Lockdown tag (3.100.5)
DJ (Nov 17, 2026): Top performers tag "🔒 Lockdown" needs STL + BLK >= 5 (was 3; 3 was our own pick, not from a source).

## Recaps: standouts lead (3.100.6)
Recaps are written by Claude (Haiku 5.5, low effort) when someone taps Write/Regenerate on a finished game, from trimEspn facts (score, game leaders, team stats, quick box recap, ESPN article) plus one web search; shared by everyone and locked 12 hours (SHARE_MIN) unless the stored recap.v is older than RECAP_V (worker). tick.py marks it final 50 minutes after writing. recapStandouts(sum) in 080-claude.js lists big box-score games; the recap prompt must lead with them.

## 3.107.0 (Nov 18): Send a game
Code: `src/app/142-share.js` (`shareBtn(g)`, `shareText`, `shareUrl`), one line in `140-game.js` (the `gv-acts` row).
- "Send" opens the phone's share sheet (`navigator.share`) with the matchup, start time, channel and a `?game=<id>` link
  (the link a tapped alert uses). No score, ever, so it can't spoil a game. No share sheet: copies the line (`toast`).
- Like "Add to slate", it isn't shown on past days or custom games.
- Open: not tried inside the iPhone app (the share sheet there depends on the app's web view allowing `navigator.share`;
  if it doesn't, the copy fallback runs). The link opens the game only on the day the game is loaded.
