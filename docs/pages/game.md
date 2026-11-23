# Matchup page (game detail)
Last updated: Nov 16, 2026, 3.52.8

## Done
- Header: league, teams (tap for team page), status, standings, location, Add to slate, Live feed button.
- Betting line strip under the header, then Claude's button (write preview / write recap / Regenerate) right under it, in every sport.
- Upcoming: Preview, Player stats (this season, not soccer), Team stats (this season). Live: Top performers and players, Team stats, Preview. Final: Recap and players, Team stats.
- Quick look (tray, `trayBlock` in `110-box-score.js`), before the start: location, betting line, Claude's preview or button, then the rest. Once a game is live or final, the location moves to the foot of the tray, under the box score (3.123.2: DJ missed it on a live neutral-site game, Dayton vs Northwestern; it used to vanish at tip-off). Soccer shows lineups once announced, no season player stats.
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

## 3.108.0 (Nov 18): Game flow (win-chance line, shot chart)
Code: `src/app/146-game-graphics.js` (styles inside, `GFX_CSS`), two `section("gfx", …)` lines in `140-game.js`.
- Live and final football and basketball games get a "Game flow" section, closed to start. Opening it fetches ESPN's
  game summary (`bxFindEvent` → `bxSummaryUrl`), cached per game (60 s live, kept once final).
- Win chance: `winprobability[].homeWinPercentage`, one point per play; home up, away down; quarter marks from each
  play's period (men's college: halves). Shot chart (basketball): `plays[].coordinate` on shooting plays, hoop at
  (25, 0), x 0-50; free throws and heaves past half court have no spot and are skipped. Made = team color, miss = ring.
- Hidden scores: the section shows `boxGate` until the box score is shown. Nothing is estimated.
- Open: seen on a finished NBA game (iPhone, folded Duo). Not seen: a football game, a live game, the unfolded Duo.
  Hockey shot map not built. `shots.py game:<team>` still finds 0 games; open a card and tap Full matchup instead.
- 3.109.1 (DJ, Nov 18: "Keep the share a game option for the future, remove for now"): the Send button is off behind
  `SHARE_ON = false` in `142-share.js`. Don't switch it back on unless DJ asks.

## 3.121.6 (Nov 20, 2026)
- Players to watch (pwNote, 080-claude.js): "Leads Dayton in…" for college/soccer, "Leads the Nuggets in…" for pro.

## Soccer lineup pitch (3.121.15)
- Players are placed by ESPN's `formationPlace`, which is Opta's numbered spot (1 keeper, 2 right back, 3 left back, 5/6 centre backs, 4/8 midfield pair, 7/11 wide, 9/10 forwards). `SOC_SPOTS` in `090-box-data.js` lists each of the 24 Opta formations as rows from the back line forward, left to right with the team attacking up the screen (from mplsoccer's Opta table; checked against ESPN games that send detailed positions like CD-L, AM-R). Unknown formations fall back to the old guess from position letters.
- Root cause of the Man United at Liverpool bug (Nov 22): that game only had G/D/M/F positions, and the old code sorted by depth then place number, so 4-2-3-1 put the right winger (7) in the holding pair and the RB on the left.
- ESPN changed `subbedIn`/`subbedOut` from true/false to `{didSub: false}`; read through `socSubbed()` (and in `worker/alerts.js`). Before this, every bench player showed ↑ and starters were greyed.

## 3.122.0 (Nov 22, 2026): "Generated by Claude <when>" on every Claude write-up
- DJ: "Everything in the app generated by Claude via buttons should show when it was last generated."
- One helper in `080-claude.js`: `clWhen(at)` ("today at 7:04 PM", "yesterday at…", weekday within a week, else "Nov 12 at…") and `clStamp(at, cls)` (a dim `.pv-at.cl-at` line, "Generated by Claude …"). Use it for any new Claude output.
- Game: the stamp sits right under the quick read and under Claude's recap (not the box-score recap), in the quick look and on the matchup page. Preview time = `newsAt` (a recap later moves `updatedAt`); recap time = `recap.at` (`pvAt`). The old `byLine` (070-navigation.js, shared) is no longer called; remove it next time someone holds that file.

## Soccer lineup: the floodlit pitch (3.123.0)
- DJ passed on eight mockups' worth of plain pitches and lists ("something creative") and picked the floodlit pitch: a night pitch seen from behind the team's own goal, players as pins that get smaller up the pitch, team name and formation in the corner.
- Drawn in `socLineup` (`090-box-data.js`): `P(x, y)` projects pitch metres to the box (camera distance `D`, visible length `L`); grass bands and markings are one SVG; pins are HTML placed by percent and scaled. Styles are the `.soc-pitch` block in `040-components.css`.
- It keeps fixed night colors in every look on purpose (a broadcast graphic, like the Live feed's field). The keeper's pin is white; the rest use the team color.
- Formations with five outfield lines draw pins 16% smaller so far rows don't overlap. Lines of five use narrower name plates (`.tight`).
- Not done: players who came on don't take a place on the pitch (they show on the Bench line with ↑ minute), same as before.
- 3.123.1 (DJ: "don't like the small line beneath each player's name... too small, can we get player pictures in?"): the tick under the name is gone, pins 40px and names 13px, the minute a player came off moved into the tag by his number. Player pictures: ESPN has almost no soccer headshots (1 of 22 starters in Man United at Liverpool, about half of an MLS roster), which is why `bxFace` skips soccer. Photos need another source; waiting on DJ's choice.
- 3.124.0: player pictures on the pitch (DJ said yes to TheSportsDB, Nov 22). `worker/photos.js`: `/api/photos?team=&p=a|b` looks each starter up by name on TheSportsDB (free key), accepts only a soccer player at the same club (or the one exact name match), and answers with `/api/photos/img?u=` paths so the phone only talks to Slate. Kept in the edge cache: found 30 days, none 1 day. **Limit, measured:** about 10 lookups, then TheSportsDB refuses (429, Cloudflare 1015) for about 3 minutes; the worker then sets a 200-second "cool" marker and answers `wait`, and the app (`socPhotoLoad`) asks again every 70 seconds while that pitch is showing. So the first time a team is opened, pictures arrive about 10 at a time; after that they are instant. Players without a picture keep the number circle.
- Coverage checked: all 11 Liverpool starters and the 4 Man United players looked up had pictures. Not measured across other leagues (the limit made a full sweep too slow).
- Layout with pictures: pitch is 10:13.5, camera `D` 130, keeper at 0.02 and lines from 0.27 up; picture circle 46px with the number on a badge; event tags sit centered above the head; a player who came off is greyscale.
- Ideas if the slow first load bothers DJ: warm the pictures from the worker's cron for today's lineups and keep them in Supabase instead of the per-city edge cache.
- TheSportsDB and its image host are blocked from Claude's cloud sessions; test through the live worker (`/api/photos?...&debug=1`).

## Long press on a game card (3.124.1)
- Holding a card's teams for 450 ms (iPhone, folded Duo, All games in either pane) opens the full matchup at once, while the finger is still down (`lpT` in `150-game-row.js`).
- DJ (Nov 22): "a delay and shows a different page first". Cause: the open ran from a timer with the finger down, so `renderHeld` (240-chrome.js) held the redraw until 0.4s after lifting, while `setView` had already scrolled the slate to its top (the "different page"). Fix: the open runs as the press's own redraw (`agTapping`), the press stops counting as a finger down (`agDown = false`), and letting go doesn't add the 0.4s wait (`agSwipeAt`). Test: the long-press script in the thread drove a touchstart and timed the page switch (slate jumped at ~600 ms and the matchup never drew while held; now the matchup is up at ~500 ms).
- 3.130.0: Slate ratings on the pitch and in a list under the bench: see docs/pages/soccer-rating.md.
