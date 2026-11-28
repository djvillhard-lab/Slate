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
- 3.130.1 (DJ: "I'd rather use headshots than full body pictures. And I don't like graying them out when they are subbed off"): `socFace` in `090-box-data.js` reads the cut-out picture on a canvas (same origin through `/api/photos/img`), finds the head (width near the top, then the row where the shoulders make it 1.45x wider) and `socPhotoPut` zooms the picture so the face fills the circle (`.soc-ph` clips it; the medium 350px picture is used so it stays sharp). A picture with no clear background keeps the old top crop. Subbed-off players are no longer dimmed or gray; the ↓minute tag is the only mark. (The same release tuned ratings toward FotMob; 3.130.2 undid that, see docs/pages/soccer-rating.md.)
- 3.130.3 (DJ, with a matchup-page screenshot: "They're too small"): the picture circle is `clamp(52px, 15cqw, 84px)` of the pitch's width (`.soc-pitch` is a size container), 12cqw when five stand across (`.tight`); the pitch is now 10:15 and the lines are spread `0.25 + 0.77 * t^1.12` so the far rows no longer overlap. Ratings changes in the same release: docs/pages/soccer-rating.md.
- 3.130.6 (DJ's screenshot: Man Utd showed numbers, no faces, hours after they had shown): not reproducible from the cloud (the list and all 33 picture sizes answered fine), so the likely cause is the edge cache being per Cloudflare location plus TheSportsDB's 10-lookup limit. Now: `worker/photos.js` also writes every answer to a Supabase doc per team (`photos/<team>`, read before any lookup; older edge entries are copied in once, flag `s`), the app keeps found pictures in localStorage `slate-soc-photos` for 30 days, and `socPhotoPut` falls back medium to small, then retries, before removing the picture. If it happens again, ask DJ which team and check `/api/photos?team=..&p=..&debug=1`. The formation label moved next to the team name (left) because the folded Duo's clock and Wi-Fi cover the top right.
- 3.133.1 (DJ: "Basketball box score doesn't show free throws and percentages for shooting stats"): the quick look's box score (also the Live feed's, which reuses it) now lists FT after FG and 3PT (`BX_COMPACT.bball`); the full box score already had it. Every basketball made-attempted cell (FG, 3PT, FT) gets its % beside the number in small muted type (`bxPct` / `.bxp-pct`), worked out from ESPN's made and attempted numbers (ESPN gives players no % in the box score); none with 0 attempts. The column width math counts the % so the columns still line up; the rows already scroll sideways, so narrow screens don't break. Team row already showed FG/3FG/FT % under each number.

## Tournament name on game cards (3.138.1)
- DJ (Nov 25, screenshot of "College Hoops Southwest Maui Invitational - Fifth Place Game" cut off with "…"): wants the whole name. The card's top line (`leagueLine` / `noteShort` in `150-game-row.js`) now flows like a sentence (icon, league, event) and wraps back to the card's left edge instead of ending in "…" (`src/styles/105-event-label.css`; display block beats the old flex + ellipsis, including the Finished section's `display:flex !important`). Measured on Nov 25's 43-game slate: every name fits in 2 lines on iPhone, folded and open Duo.
- `noteShort` also tidies names: "Southwest Maui Invitational" → "Maui Invitational" (the only sponsor word removed by name), "pres. by X" dropped, "Fifth Place Game" → "5th place", "Championship Game" → "Championship", " - " → " · " with a no-break space so the dot never starts a line. Add other sponsor words by exact name only, never a general rule.
- Kept the league name ("College Hoops") on purpose: it's how men's and women's hoops tell apart, and the event names rarely say so. The 2-column small cards on All games still hide this line (unchanged).

## The long preview (3.187.0, Nov 28, 2026)
- DJ (Nov 27): previews were "too much talk of recent results". The quick read (3.183.4) is now one paragraph about storylines, with at most one past result, and form in a few words.
- The long read is no longer paragraphs. DJ picked a mix of two mockups (A storyboard + B tale of the tape; mockups in project files `matchup-preview/`) and asked for "more to read/see at once" and team logos. It is drawn by `pdBlock` in `src/app/141-preview-deep.js` (styles inside, `PD_CSS`):
  tale of the tape (logos, table spot or rank and record, form, the season-leader categories both teams have, past meetings bar), Claude's big question, "The preview" in up to 4 storylines (tag tinted by team color, team logo), recent results tiles, "What decides it", the Generated by Claude stamp.
- Claude writes only words: `deep: {question, parts[{tag, side, title, text}], decides}` (worker/index.js preview prompt, `deepOf`). Every number, result and logo comes from ESPN's game summary (leaders, lastFiveGames, seasonseries), fetched by `pdLoad` and cached 30 minutes per game.
- Data-only version (DJ: "If there isn't enough... a simple version just based on data"): no preview written, or Claude returned no parts, shows the tape and recent results only. Before kickoff only.
- After the game the full preview folds under "Before the game" (same saved open/closed choice as the old deep dive). Old previews without parts still show the old paragraphs; Regenerate works right away for them (PREVIEW_V in the worker).
- DJ dropped a "Key duel" section ("doesn't provide much"). The big question must name the team each part is about.
- Fact check: "winless in five" is now checked against the last five results instead of the season record (it was dropping true sentences); `question`, `decides` and `parts` are checked like other text.
- 3.189.0, after the game (DJ: "the same for post game"; mockup `matchup-preview/postgame-mockup.png`): `pgBlock` / `pgTape` in 141-preview-deep.js. Scoreboard (logos, final, line score), five team stats per sport as split bars (`PG_STATS`, ESPN boxscore team stat names; lower-is-better ones flagged), Claude's headline ("The story"), top performers (`boxStars`, unchanged), "How it was won" parts, "What it means". Claude's recap JSON has `story {headline, parts, means}`, saved as `recap.deep` in the preview's shape (question/parts/decides). RECAP_V 3 lets older recaps be regenerated at once.
- DJ removed a win-chance chart from the post-game mockup ("confusing"); the Game flow section still has the full one. Shown only once the score is shown (boxShown); the parts also wait for the recap to be shown (recapShown). Older recaps keep their paragraph inside the new layout.
- 3.189.0 also (DJ, Nov 28): storyline (big question / story) at the very top of both; part tags are the app's `fd-tag hot` pills with an emoji (`PD_EMOJI`); Players to watch moved inside the preview (`pwRow`, the separate card is skipped when the new preview shows); leader rows are headshot + name + one key number (`pdKeyVal`, `pdFace`; DJ: football was "too much focus on player stats"). Prompts: stories and things to watch for first, numbers only when extraordinary (PREVIEW_V 4, RECAP_V 4).
- 3.189.2 (DJ: Players to watch "just doesn't match up with other designs"): `pdWatch` draws it with `tpRow`, the Top performers card and rows; a team lead from `pwNote` becomes a "👑 Most …" pill.
- 3.189.3 (DJ: "Need either team logos or player headshots"): Players to watch swaps the jersey for the headshot from ESPN's leaders (`pdFace`) or the team logo (`pdBadge`).
- 3.191.0 (DJ: "highlighting surprises or changes from last starting lineup"): soccer pre-game "Lineup changes" in pdBlock (`pdXI`, `pdLastXI`, `pdLineup`): this game's ESPN starters vs the starters in each team's newest lastFiveGames match (fetched once per event). In / benched / not in squad, as tpRow rows with pill tags. ESPN's summary is fetched every 2 minutes in the 90 minutes before kickoff until the XI appears.

## 3.191.3 (Nov 28)
- Recent results tiles moved right under the tale of the tape; the Form dots row shows only when ESPN gave no tiles (DJ: duplicate).
- Players to watch rows have no tags (DJ disliked "👑 Most ..." and the cut-off team-leader note); photo, name and season line only.

## 3.192.0 (Nov 28): quick look for finished games
- 143-quick-final.js (qlFinal), hooked in trayBlock0 (110-box-score.js). Football and soccer only (QL_SPORTS); other sports keep the old drop-downs until DJ picks a design.
- Line: Claude recap headline if written, else from period scores (football) or goal order (soccer). Bet chips from the pregame line (who covered, over/under); replaces the line strip.
- Football: Player of the game = winner's best by yds/10 + TD*6 - INT*4, plus next two. Soccer: goal scorers per side + possession, shots, on target bars.
- Next (DJ, Nov 28): redesign the quick look before, during and after the game for every sport, one sport at a time with mockups, football first.
