# Slate release history

Version 1 is everything built before the first efficiency pass. Version 2 is everything from that pass up to Nov 11, 2026, ending with the build below.
Version 3 starts with the real iPhone app (the weekend of Nov 14–15, 2026): its first build is 3.0, and the web app moves to 3.0.0 the same day.
From 2.0.0 on, every change gets a new number: fixes and tweaks bump the last number (2.0.1), new features the middle one (2.1.0).
From 3.0.0 on, each release also says which iPhone app build in TestFlight goes with it, shown there as "3.0 (build)". Releases that only change the web app keep the build before them: the app loads the new page by itself.

## 3.28.0 (Nov 15, 2026)
TestFlight: 3.0 (29)
- Live notifications for a game now listen on that game's broadcast channel (Apple's broadcast push): the server sends each score once per game, and every live notification for it updates, whether or not Slate is running or was swiped away. No more stuck scores from a missing token. Works for ones the server starts and ones you switch on from the slate. Needs the new TestFlight build and Broadcast Capability on the app ID (done). If a channel can't be made, it falls back to the old way. The scoreboard stays on its own token (it mixes four games).

## 3.27.0 (Nov 15, 2026)
TestFlight: 3.0 (28)
- A game's Live notification switch now matches what's on your phone: swipe a live notification away and its switch (in the game's tray, and the gray bell) turns off, and the server won't put it back. The same for the scoreboard (its Show on Lock Screen turns back on as an option). The app tells the server the moment it's swiped away; if the app wasn't running, the server notices the next time it tries to update it. Coming back to Slate also picks up any switch the server turned off.

## 3.26.0 (Nov 15, 2026)
TestFlight: 3.0 (27), no new build (web only)
- Quick look on a finished game: a Recap dropdown at the top shows Claude's short read, or the button to have Claude write it right there (shared with everyone, like all write-ups).
- Quick look dropdowns remember how you left them: open one (say Top performers) and it starts open on every quick look you open after that, on this phone; close it and it starts closed.
- All games: finished games show their start time under "Final".
- Pre-game notes: when both teams are on the same streak it reads "Both teams have won four in a row".

## 3.25.4 (Nov 15, 2026)
TestFlight: 3.0 (27)
- Fixed: live notifications the server started could stay stuck on the score they started with (Ole Miss–Oklahoma showed 0-0 early in the 1st while the game was 7-14 in the 2nd). The server can only update one after the phone sends it that notification's token, and iOS doesn't wake Slate to send it when the app has been swiped away. Now every time Slate opens or comes back to the front, it sends the tokens of every live notification showing, so they all catch up within a minute. The scoreboard was updating normally.

## 3.25.3 (Nov 15, 2026)
TestFlight: 3.0 (26)
- Folded iPhone Duo: the open menu now lines up with iOS's menu button below it: the same width, centered over it, and just above it instead of floating higher and to the right.

## 3.25.3 (Nov 15, 2026)
TestFlight: 3.0 (26)
- Dynamic Island on the iPhone Duo (where iOS gives the island less width): mini chips instead of the split ring, a small team chip and its score on each side of the camera ("MIN 7 | 10 GB"), for one game and for the scoreboard (the game that last scored). When the island is shared with another live notification, the smallest spot shows just the score ("7–10") instead of the ring. Needs the new TestFlight build.

## 3.25.2 (Nov 15, 2026)
TestFlight: 3.0 (25), no new build (web only)
- Pre-game notes: when both teams are on a streak, the note says it once ("Both on a roll: England have won four straight, Spain five") instead of also leading with one team's streak ("Spain have won five in a row; Both on a roll: …"). A streak line is never paired with another streak line now. Saved notes in the old wording are rebuilt.

## 3.25.2 (Nov 15, 2026)
TestFlight: 3.0 (25), no new build (web only)
- Pre-game notes: when "Both on a roll" (or a hot team against a cold one) is one of the facts, the single-team streak lines are dropped, whichever ranked higher. "Spain have won five in a row; Both on a roll: England have won four straight, Spain five" now reads "Both on a roll: England have won four straight, Spain five". Saved notes worded the old way are rebuilt.

## 3.25.1 (Nov 15, 2026)
TestFlight: 3.0 (25)
- Live notification (one game): the Watch (channel) button is gone, so the one-liner runs across the whole bottom of the card, on the Lock Screen and in the held-open Dynamic Island (the Matchup button there is gone too; tapping anywhere still opens the matchup).
- Live football: above the one-liner, a football and who has the ball with the down and yard line, in words: "MIN ball · 3rd & 4 at GB 35" (the football by the team's name stays too). When ESPN drops the down text between plays, the server now works it out from the down, distance and yard line, so it stays up. A live notification started from the slate shows it right away too.

## 3.25.0 (Nov 15, 2026)
TestFlight: 3.0 (24)
- Scoreboard live notification, new Lock Screen design: your four games in a 2×2 grid, one square each. Each square has both teams' chips (the same team colors and stripes as the app) with their scores, then the clock in red while live, "Final" (the losing side dimmed) or the start time. Live football also shows a small football next to the team with the ball, and the down and yardage line under the clock ("3rd & 4 · ILL 35"), updated as it changes. Tap a square for that game's matchup. Needs the new TestFlight build.

## 3.24.6 (Nov 15, 2026)
TestFlight: 3.0 (23), no new build (web only)
- Box scores are tighter: smaller player photos, less space above and below each player and between the stat columns, and smaller "Show all" buttons. Same text sizes.

## 3.24.5 (Nov 15, 2026)
TestFlight: 3.0 (23)
- Folded iPhone Duo: the menu's grow-and-fade open and close is back. It now grows up out of the menu button inside the side column (and shrinks back into it), without the flash in the middle of the page.

## 3.24.4 (Nov 15, 2026)
TestFlight: 3.0 (22), no new build (server and web only)
- Claude write-ups are written once for everyone: game previews, recaps, team pages and Box Office were already shared by every account, and now two people can't have the same one written twice. If anyone (you or a tester) is already having Claude write it, everyone else's tap just waits for that one; if it was written or regenerated in the last 3 minutes, a new tap shows that one instead of calling Claude again ("Claude wrote this a moment ago, so here it is"). No second charge either way. The personal News briefs (built from each person's own slate) stay per person.

## 3.24.3 (Nov 15, 2026)
TestFlight: 3.0 (22)
- Folded iPhone Duo: the open menu no longer flashes in the middle of the page for a split second before jumping into the side column. It's now laid over the full-screen page, so it's in the column from its very first frame.

## 3.24.2 (Nov 15, 2026)
TestFlight: 3.0 (21)
- Folded iPhone Duo: the open menu fades in right where it belongs in the side column, instead of starting toward the middle of the page and sliding over into the column.
- Pre-game notes don't repeat themselves: after "Both on a roll" (or a hot team against a cold one), the second fact can't be one of the same streaks again ("Both on a roll: Steelers have won four straight, Bengals four", without "; Bengals have won four straight" after it).

## 3.24.1 (Nov 15, 2026)
TestFlight: 3.0 (20), no new build (server only)
- The number job (scores, odds, start times, Box Office, slates; scripts/tick.py) is now started every 10 minutes by the Cloudflare server instead of GitHub's own schedule, which only ran it every few hours overnight. GitHub's schedule stays as a backup. Needs a GitHub token saved in Cloudflare as GH_TOKEN.

## 3.24.0 (Nov 15, 2026)
TestFlight: 3.0 (20)
- Live notifications show up the moment you switch them on: a game's Live notification switch (live or finished games, or one starting within 15 minutes) and the scoreboard's Show on Lock Screen now put it on your Lock Screen right away, and the server takes it over and keeps it current. Switching off (the tray switch, the gray bell on a slate card, or Turn off on the scoreboard) takes it down right away too. Changing the scoreboard's picks while it's on updates it right away. Needs the new TestFlight build; until then it still takes up to a minute.
- The scoreboard wasn't starting because your phone had never sent the server what it needs to start one on its own; starting it from the app gets around that.
- Betting lines show for every game, on your slate and in All games, whether or not Claude has written a preview: the line now comes straight from ESPN's scoreboard when the server hasn't saved one. Before, a game without a Claude preview showed no line.
- Box Office: last night's top performers were missing. An early-morning run had marked Nov 14 finished with only the overnight games, so the rest never came in. Fixed for Nov 14, and a day now only counts as finished once every game in it is over.

## 3.23.1 (Nov 15, 2026)
TestFlight: 3.0 (19)
- Folded iPhone Duo: the open menu in the side column now always shows every page (Settings, News, On TV, Teams, Box Office, All games, Slate). iOS's own column only fits a few buttons and was tucking the rest (like Slate) into a second "more" menu, so the app now draws the page buttons itself, stacked right above the menu button and sized to fit the column's height. Needs the new TestFlight build.
- Fixed: a late game could stay "in progress" the next morning (Utah–Arizona showed the 4th quarter after it had ended). The app now keeps checking any game it last saw in progress until ESPN calls it final, and the server finishes off the previous night's games that were still marked live.

## 3.23.0 (Nov 15, 2026)
TestFlight: 3.0 (18)
- Live scoreboard: on today's slate, a Board button beside Live (in the iPhone app) opens a picker. Pick up to 4 games and tap Show on Lock Screen: they show together in one live notification on your Lock Screen and in the Dynamic Island, one row per game (chips, scores, then the clock or start time; tap a row for that game's matchup). It starts 15 minutes before your first pick (right away if one's already on), keeps up with every score, and ends after the last final (the finals stay up to 4 hours). The Dynamic Island shows whichever game scored last. Change the picks any time; Turn off takes it down within a minute. Needs the new TestFlight build.
- A game's notifications are two named switches in its tray now: Live notification (its score on your Lock Screen and in the Dynamic Island; for a finished game, its final) and Game alerts (Game starting, Close finish, Overtime, Final, Goals). Lit means on; tap to switch it for that game alone. The small gray bell on a slate card means at least one is on, and tapping it turns both off for that game (Undo in the note that pops up).
- Remove: Keep sits right beside "Remove from slate?".
- Live notifications: the Box score button is gone. After the final, the one-line note gets the whole width and wraps to a second line instead of being cut off (Lock Screen and the held-open Dynamic Island).

## 3.22.0 (Nov 15, 2026)
TestFlight: 3.0 (17), no new build (server and web only)
- Remove asks first: tapping the ✕ in a game's tray turns the row into Keep and "Remove from slate?". Tap that to remove the game; Keep, or 5 seconds, backs out.
- A small gray bell sits next to the time on any slate card whose game will notify you. Tap it to turn off that game's notifications: its live score and its game alerts (Game starting, Close finish, Overtime, Final, Goals). Undo is in the note that pops up.
- The tray's bell now reads On or Off and covers all of that game's notifications the same way. Turning it on also turns on the game's live score where your settings leave it out.
- Finished games get the bell too: turn it on to put the final score on your Lock Screen. It stays like any final (up to 4 hours) until you swipe it away or turn it off.
- Server: each game's live score is checked once a minute (a game on both your slate and your teams was being looked at twice).

## 3.21.0 (Nov 14, 2026)
TestFlight: 3.0 (17), no new build (server and web only)
- Live score for one game: tap a game on your slate and its tray has a Live button with a bell. A lit bell means that game's live score shows on your Lock Screen and in the Dynamic Island (by default, whatever Settings > Notifications > Live score covers). Tap it to switch it off for just that game, or on for a game your settings leave out, like one from Worth a look or All games. Switched off mid-game it leaves within a minute; switched on, it starts within a minute, or when the game starts. A game you switch on yourself shows even during quiet hours. Up to 4 at once, as before.
- The tray's controls are one clean row under Full matchup: star either team on the left (by abbreviation now), and on the right, under your thumb, Remove (the ✕) and the Live bell. The bell shows in the iPhone app, on your own profile, before and during a game.

## 3.20.0 (Nov 14, 2026)
TestFlight: 3.0 (17)
- Live scores on the Lock Screen, redesigned as a scorebug: the slate's team chips (each team's second color as a stripe along the bottom), bigger scores in Slate's own font, the clock in red with a live dot, a football beside the team with the ball, and the down and distance ("2nd & 7 at BC 34"). Under it sits the slate's one-line note, red while the game is on. A Watch button on the right opens the channel's app the way the slate's channel buttons do (YouTube TV; NBC and ESPN's channels ask which), passing through Slate for a moment. After the final the losing team dims and the button becomes Box score.
- Dynamic Island: pressing and holding it opens the same scorebug around the camera: each team's chip and big score on either side, the clock and the down and distance under the camera, then the red one-line note and a Matchup button on the right (Box score after the final). With one game live it shows both teams' chips and scores; with another game live too, the small circle holds both scores, ringed half in each team's color (away on the left, home on the right). Dark team colors are brightened there so they show on black. Where iOS gives the island less width (the iPhone Duo's side column, an iPhone turned sideways), one game live shows that small split-ring circle too, as Apple asks.
- Tapping a live score now opens that game's matchup in Slate instead of the slate's front page.
- Server: live scores now carry each team's second color, college rankings, the channel, and for football ESPN's down and distance and who has the ball (only while ESPN reports them).
- Needs the new TestFlight build. Live scores already running when you update switch to the new look, but their stripes, rankings and Watch button start with the next game.

## 3.19.3 (Nov 14, 2026)
TestFlight: 3.0 (16), no new build (web only)
- One-line notes all read the same way now: the player's first and last name, no colon after it, and spelled-out stats ("TTU: Thomas Castellanos 223 passing yds, 3 TD", "UTAH: Devon Dampier 75 rushing yds, 2 TD"). Before, some lines used initials ("D. Dampier 57 rush yds") and some had a second colon. This applies on slate cards, Worth a look and the Big night notes. Notes saved on your phone in the old wording are rebuilt once.

## 3.19.2 (Nov 14, 2026)
TestFlight: 3.0 (16), no new build (web only)
- Fixed: slate notes saved on your phone before 3.19.0 had no team attached, so finished games kept showing them without the abbreviation. Those saved notes are now rebuilt once (they may be blank for a few seconds while they reload), and any note still without a team works it out from the player it names.
- Game-winner lines also read ESPN's after-the-game wording ("Raleek Brown 4 Yd pass from Arch Manning" becomes "Manning's 4-yd TD pass to Brown"), plus return TDs.

## 3.19.1 (Nov 14, 2026)
TestFlight: 3.0 (16), no new build (server and web only)
- Worth a look notes get the team abbreviation too ("SCU: E. Mahi has 23 points"). The app matches the player named in the note to the game's stat leaders or box score.
- Slate cards' early live lines (the standout so far, before the main note loads) get it as well ("OKST: D. Mestemaker 186 pass yds, 1 TD").
- Server: the live score data now records each stat leader's team.

## 3.19.0 (Nov 14, 2026)
TestFlight: 3.0 (16), no new build (web only)
- One-line notes about a single team now start with that team's abbreviation: "SC: Cutter Woods threw 3 interceptions", "DEN: Nikola Jokic scored 26 (9-14 FG)". This covers live, final and pre-game lines. Lines that already name the team ("Texas won it on…") or cover both teams are left as they are.
- Game-winner lines handle name suffixes ("Smith Jr." reads as Smith).

## 3.18.1 (Nov 14, 2026)
TestFlight: 3.0 (16), no new build (web only)
- Game-winner lines read cleaner: short team names ("Texas", not "Texas Longhorns") and basketball shots in plain words ("LSU won it on Dent's 25-foot three with 0:01 left").

## 3.18.0 (Nov 14, 2026)
TestFlight: 3.0 (16), no new build (web only)
- Worth a look tags on your slate: any live game on your slate that qualifies for Close finish, Upset watch or Big night gets that tag on its own card (red, top right) instead of showing up again in Worth a look. Worth a look now only lists games that aren't on your slate.
- Finished games' one-line notes now tell you how it ended when it came down to the wire: "Texas won it on Manning's 4-yd TD pass to Brown with 0:02 left". This covers the go-ahead-for-good score in the last moments or in overtime (or extra time), a walk-off in baseball, and a late winner in soccer. It leads over other notes, like a big stat line.

## 3.17.2 (Nov 14, 2026)
TestFlight: 3.0 (16), no new build (web only)
- Football full matchup page, shorter box score: it shows Passing, Rushing and Receiving only, with a "Show defense and special teams" button for the rest (fumbles, defense, interceptions, returns, kicking, punting). After the final, Passing shows the starting QB (others behind "Show all"), and Rushing and Receiving show their top 3.

## 3.17.1 (Nov 14, 2026)
TestFlight: 3.0 (16), no new build (web only)
- Soccer quick look: the last dropdown is called "Lineups and stats" instead of "Box score".

## 3.17.0 (Nov 14, 2026)
TestFlight: 3.0 (16), no new build (web only)
- Soccer matchup page: the Scoring section is gone; the match summary covers the goals.
- Slate quick look (tap a live or finished game): each part is now its own dropdown, closed to start. Football, hockey and baseball: Top performers, Scoring, Box score. Basketball: Top performers, Box score. Soccer: Top performers, Match summary, Box score. Each stays open or closed as you left it while you use the app.

## 3.16.1 (Nov 14, 2026)
TestFlight: 3.0 (16), no new build (web only)
- Final box scores now update after the final: once a game ends, the app checks ESPN again every 2 minutes for the first hour. Before, the first final box score was kept for the rest of the session, so late corrections from ESPN never came in (like Jordan Faison's receiving TD against Boston College showing as 0).

## 3.16.0 (Nov 14, 2026)
TestFlight: 3.0 (16), no new build (web only)
- Matchup page after the final: a Scoring timeline sits under Top performers. Football lists every TD and field goal; soccer lists every goal (scorer and assist, penalties and own goals marked); hockey lists every goal with its assists (power play, short-handed and empty net marked); baseball lists every scoring play. Each line shows the score after it. Basketball has none (too many baskets to be useful).
- Live games get the same timeline for hockey, baseball and soccer (football already had it).
- Box score after the final: each long player list shows its first few (basketball: the starters; football: the top 3; other sports: the top 5), with a "Show all N players" button to open the rest.
- Top performers now include every touchdown and goal scorer, beyond the usual top four. Before, a fifth TD scorer (like Jordan Faison) or a defensive TD (like Jaylen Sneed's fumble return) could be left off. Return and defensive TDs say where they came from.
- Finished group: when the slate is sorted by Time, finished games stay in time groups; the league dropdowns are only for the League sort.

## 3.15.2 (Nov 14, 2026)
TestFlight: 3.0 (16), no new build (web only)
- Finished group: each league's dropdown arrow now sits right next to its game count instead of at the far right.

## 3.15.1 (Nov 14, 2026)
TestFlight: 3.0 (16), no new build (web only)
- Finished group: games now fold by league (each league is its own dropdown), and each card shows its start time at the top left.
- Sorted by League: the Reorder button moves under the Finished group, at the very bottom of the slate.

## 3.15.0 (Nov 14, 2026)
TestFlight: 3.0 (16), no new build (web only)
- Scores on your slate's matchup cards now sit in one fixed spot: at the end of the team column, right beside the time and channel column. It's the same on every card, in every rotation and fold, so team names only shorten when there truly isn't room.
- iPhone Duo, unfolded: tapping a game in Worth a look opens it on the right side, the same as a game on your slate.

## 3.14.2 (Nov 14, 2026)
TestFlight: 3.0 (16), no new build (web only)
- Finished games get their one-line notes back.
- With the slate sorted by League, the Finished group is split by league too, instead of by time.

## 3.14.1 (Nov 14, 2026)
TestFlight: 3.0 (16), no new build (web only)
- Upset watch games that are already on your slate no longer show twice: they stay out of Worth a look, and the game's card on your slate gets a red "Upset watch" tag in its corner instead (its own one-line note stays).

## 3.14.0 (Nov 14, 2026)
TestFlight: 3.0 (16), no new build (web only)
- Today's slate leads with what's live: finished games move to a Finished group at the bottom (open to start; tap its header to fold it). Live and upcoming games stay on top in time order (or by league), right under Worth a look.
- Finished rows are tighter: start times stay, while the league line, tags and one-line notes drop, with smaller scores, so the group takes much less room. Tap a game for its box score as usual.
- Other days' slates are unchanged.

## 3.13.0 (Nov 14, 2026)
TestFlight: 3.0 (16), no new build (server and web only)
- Morning brief, new format: the day and how many games ("Sat 11/14: 6 games"), then one line per slate game in start order ("11 AM - Davidson @ Dayton", "1:30 PM - Boston College @ No. 5 Notre Dame"). If your slate is empty it lists your teams' games; with nothing at all it isn't sent.
- Close finish alerts and Worth a look: the final 8 minutes in basketball too (with football and hockey), from the 75th minute in soccer, and from the 7th inning in baseball.
- Worth a look adds upset watch: a ranked college team trailing a lower-ranked or unranked team late (down 8+ in football's second half, 7+ in basketball's). It has its own switch in Worth a look's settings.
- Ideas for the Lock Screen and Dynamic Island redesign are collected in docs/LIVE-IDEAS.md.

## 3.12.5 (Nov 14, 2026)
TestFlight: 3.0 (16), no new build (server only)
- Found why the iPhone app's notifications stopped: Apple push keys added in Cloudflare as plain-text variables get wiped every time GitHub deploys. Deploys now keep dashboard variables (keep_vars), and the keys should be re-added as Secrets.

## 3.12.4 (Nov 14, 2026)
TestFlight: 3.0 (16), no new build (server and web only)
- Close finish notifications use the same window as Worth a look: football in the final 8 minutes of the 4th, hockey in the final 8 minutes of the 3rd (overtime gets its own alert, as before). Basketball stays the final 5 minutes.

## 3.12.3 (Nov 14, 2026)
TestFlight: 3.0 (16), no new build (web only)
- Worth a look's close games now mean the last minutes, not just the last period: football in the final 8 minutes of the 4th (or overtime), hockey in the final 8 minutes of the 3rd (or overtime). Basketball stays the final 5 minutes, soccer from the 75th minute, baseball from the 7th inning.

## 3.12.2 (Nov 14, 2026)
TestFlight: 3.0 (16), no new build (web only)
- Box Office text is back to the app's normal size on a phone. The small, compact type was meant for two or more columns of players (the open Duo) but was also kicking in on a single column.
- Box Office game info is two lines for every player now: live games show the clock, then the score and opponent ("109-100 @ NO"); finished games show W or L with the score, then the opponent. Live rows were taking three lines.

## 3.12.1 (Nov 14, 2026)
TestFlight: 3.0 (16), no new build (web only)
- Box Office, every league tab: Loading… until that league's live check has actually come back. Some tabs were showing "No games have started yet" from an older saved copy before the check finished.

## 3.12.0 (Nov 14, 2026)
TestFlight: 3.0 (16), no new build (web only)
- Slate matchups: scores stay in the middle of the card, but when a team name is long enough to reach them, they move right just enough to clear it (both scores together, so they stay lined up).
- News is parked for now: the menu item stays, and the page just says Coming soon.
- Box Office: today's page says Loading… while a league's live numbers are on their way, instead of "No games have started yet" before it knows.

## 3.11.2 (Nov 14, 2026)
TestFlight: 3.0 (16), no new build (web only)
- Slate matchups: the scores now sit in the middle of the card (replacing 3.11.0's small nudge). Long team names shorten a little sooner to make room.

## 3.11.1 (Nov 14, 2026)
TestFlight: 3.0 (16), no new build (web only)
- Worth a look: close games no longer say "A 5-point game late" or "Tied late"; the score and clock already show that. Their line now names the standout so far (top scorer, passer, rusher or goal scorer), or there's no line if no one stands out yet.

## 3.11.0 (Nov 14, 2026)
TestFlight: 3.0 (16), no new build (web only)
- Slate matchups: the scores sit a little closer to the team names.
- The one-line notes under upcoming games can now carry a second fact when it adds something (for example a streak and an injury), up to about a line and a half instead of one tight line. They refresh within half an hour.

## 3.10.3 (Nov 14, 2026)
TestFlight: 3.0 (16), no new build (web only)
- The day picker's glass is now the same light gray tint as the app's menu button (and the page's own menu button and Back).
- Fixed the day picker flickering when you scroll to the very top or bottom: the page re-pins its bottom controls while it bounces, which replayed the picker's grow-in animation. It now only animates when it first appears.

## 3.10.2 (Nov 14, 2026)
TestFlight: 3.0 (16), no new build (web only)
- The day picker is now clear glass like the app's menu button: mostly see-through with a light blur and a bright edge, instead of the heavier frosted look. The page's own menu button, Back and menu capsule match it.

## 3.10.1 (Nov 14, 2026)
TestFlight: 3.0 (16), no new build (web only)
- Settings' Claude summaries line shows just the month's total and cost; the per-person count (like "brother 1") is gone from it. Each person's summaries are still counted behind the scenes.

## 3.10.0 (Nov 14, 2026)
TestFlight: 3.0 (16), no new build (web only)
- Settings, Notifications and Slate rules now share the style of the rows at the top of Settings: every group sits in a rounded card with a soft shadow, the switches and pickers are fully rounded, and the rule icons are round, in the accent color.
- Back now goes back where you came from on pages you open from another page: Notifications or Slate rules back to Settings, a team back to Teams, a matchup back to All games or On TV (at the same spot in the list). The menu's own pages still go back to your slate.

## 3.9.1 (Nov 14, 2026)
TestFlight: 3.0 (16), no new build (web only)
- The day picker now uses the same frosted, see-through glass as the menu button, and so do the page's own menu button, Back and menu capsule.

## 3.9.0 (Nov 14, 2026)
TestFlight: 3.0 (16), no new build (web only)
- News is now just My slate: the My teams and league tabs are gone.
- Claude's brief (still only on a tap) is rebuilt: it picks the 2-4 biggest or most meaningful games on your slate and writes a paragraph on each, why it matters and the story behind it, with one related story to open right under it. No list of every game. Then "Around sports": quick hits on the top stories across all of sports, not just your slate.
- Headlines are grouped by game, each under a bar naming the matchup, league, time and channel, and every story is tagged with the team it's about. ESPN's roundup stories that tag a dozen teams only count for a team they actually mention.

## 3.8.0 (Nov 14, 2026)
TestFlight: 3.0 (16)
- Settings moves into the menu, at the very top (the strip and the floating capsule too). The Settings and More buttons are gone from the slate's header, so the title has the whole row.
- Everything that was behind More is now at the top of Settings: Slate rules, Notifications, Share the slate and Reset the app, as rows with round icons in the menu's style.
- The day picker at the bottom is now a capsule like the menu, with round arrows, and grows in with the same quick animation.

## 3.7.0 (Nov 14, 2026)
TestFlight: 3.0 (15)
- News page (new, at the top of the menu and the strip): tabs for My slate, My teams, then each league (the ones you follow first). Each tab lists the latest from ESPN and The Athletic, newest first, with ESPN's photo and summary; tap one to read it.
- My slate news only shows stories about the teams on today's slate; My teams only your teams.
- Claude briefs, only when you tap Brief me: quick hits, a longer read and a few stories worth opening, from Claude's own research. On My slate it's built around today's slate (why each game matters, who to watch, injuries) with a Tonight list in viewing order. Each brief is saved for the day, so reopening it is free; league briefs are shared between everyone, My slate and My teams are yours.
- The page learns what you read: the leagues and teams you open and spend time on move up the tabs and lists, and Claude's My slate and My teams briefs lean toward them. It follows your account to other devices.

## 3.6.0 (Nov 14, 2026)
TestFlight: 3.0 (14), no new build (web only)
- Every page now has the slate's header: the Slate mark, the page's name in the same type (All games, Box Office, Teams, On TV, Settings and the rest), and a line under it, so you always know where you are. Only the slate keeps its date and the Settings and More buttons; All games keeps its search button. Pages with the day picker at the bottom don't repeat it up top.
- The header also gives the iPhone Duo's clock and Wi-Fi icons a clear strip at the top of every page.

## 3.5.0 (Nov 14, 2026)
TestFlight: 3.0 (14)
- iPhone app wherever iOS has no side strip (the Duo open and upright, a regular iPhone, or the Duo set to iPhone): the app now draws the menu itself so it matches the strip. One glass capsule at the bottom right with the same icons: Back (when needed) above the three-line menu button; tap it and the capsule grows into On TV, Teams, Box Office, All games and Slate, the open page lit, with the same quick animation; pick one and it shrinks back. The page's day picker sits just left of it.
- In Safari, the page's own menu matches too: the page icons stack in one capsule above the menu button, without labels, the open page lit.

## 3.4.2 (Nov 14, 2026)
TestFlight: 3.0 (13), no new build (web only)
- Release notes: 3.4.0's app build was cancelled by Xcode Cloud when 3.4.1 followed it minutes later; both ship in 3.0 (13).

## 3.4.1 (Nov 14, 2026)
TestFlight: 3.0 (13)
- iPhone Duo open and upright: iOS has no side column there and was putting the strip menu in a bar centred at the bottom. The app now uses the page's own menu button there instead, bottom right like everywhere else (same buttons, same Back above it). Folded, and open sideways, the menu stays in the side strip.

## 3.4.0 (Nov 14, 2026)
TestFlight: none (Xcode Cloud build 12 was cancelled when 3.4.1 replaced it; its changes ship in 3.0 (13))
- iPhone app: when TestFlight has a newer app build than the one on your phone, a note at the top of the slate says so ("New app version 3.0 (12) is ready"). Tap it to open TestFlight and update; ✕ hides it until the next build. It waits about 35 minutes after a release so the build is really there. Builds before 3.0 (13) can't report their number, so the note starts working from 3.0 (13) on.

## 3.3.0 (Nov 14, 2026)
TestFlight: 3.0 (11)
- iPhone Duo strip: Back moves into the strip, right above the menu button, and only shows when there's somewhere to go back to (on a past day's slate it points right, to today). Opening the menu hides it until the menu closes. The page's own Back button steps aside in the strip.
- Regular iPhone (and the Duo set to iPhone): the menu now matches the strip. Back sits above the menu button and hides while the menu is open; the menu button shows three lines; tapping it stacks On TV, Teams, Box Office, All games and Slate above it as round buttons with their names beside them, the open page lit, and picking one closes them. The menu button and Back are round.
- From here on, changes to the Duo strip are mirrored in the regular iPhone menu.

## 3.2.3 (Nov 14, 2026)
TestFlight: 3.0 (10), no new build (web only)
- Box Office: each player's game result takes two lines instead of three: "W 93-77" on top, the opponent under it. Rows are shorter and the stats line has more room.

## 3.2.2 (Nov 14, 2026)
TestFlight: 3.0 (10)
- iPhone Duo strip menu, take three: the strip shows one menu button at the bottom. Tap it and On TV, Teams, Box Office, All games and Slate appear as strip buttons right above it, in the strip itself, the open page lit. Pick one (or tap the ✕) and they fold back into the one button. Same folded and unfolded.

## 3.2.1 (Nov 14, 2026)
TestFlight: 3.0 (9)
- iPhone Duo, unfolded: the two sides now split exactly on the fold. The app tells the page where the middle of the screen is instead of the page guessing (iOS's side column threw the guess off). Settings > Move split still fine-tunes it.
- Release notes now list the TestFlight build for each version.


## 3.2.0 (Nov 14, 2026)
TestFlight: 3.0 (8)
- iPhone Duo strip menu (needs the new TestFlight build): tapping the strip's menu button now pops On TV, Teams, Box Office, All games and Slate up above it as separate round buttons with their names beside them; the open page is lit, and picking one folds them away. The button turns into an ✕ while they're open. Same folded and unfolded.
- Fixed the Slate header's Settings and More buttons covering the title in the app: iOS reports the Duo's side column as screen padding too, so the header was counting it twice.
- Text sizes reworked: XS, S, M, L and XL (XXS is gone; it moves to XS). Each size now stops growing once the page would get too narrow for the game cards, so big sizes never squeeze cards out of shape on the folded Duo or a regular iPhone. At L and XL, team records hide to keep full team names.
- Soccer match summaries: goals now read "Scorer (assist)", "Scorer (penalty)" or "Scorer (own goal)", with the score beside them.

## 3.1.1 (Nov 14, 2026)
TestFlight: 3.0 (7), no new build (web only)
- iPhone app: the Slate header's Settings and More buttons sit in line at the right end, next to the side column, instead of floating over the title (Safari placed the floating buttons wrong at larger text sizes). "Tonight's Slate" shrinks to fit.

## 3.1.0 (Nov 14, 2026)
TestFlight: 3.0 (7)
- iPhone Duo (iPhone app): the side strip has one menu button instead of five; tapping it lists On TV, Teams, Box Office, All games and Slate, with a check on the open page. Needs the new TestFlight build.
- Pages now run all the way under the strip. The header buttons, the day picker, Back and links like Edit order stay just left of it, so nothing hides under the clock.
- The Slate header's Settings and More buttons no longer cover the title: at larger text sizes they stack, and the title shrinks to fit.
- Settings > Phone now controls the strip too: iPhone Duo uses the strip menu, iPhone uses the page's own menu button.

## 3.0.2 (Nov 14, 2026)
TestFlight: 3.0 (6), the first Xcode Cloud build
- Xcode Cloud now prints the TestFlight export's signing errors straight into its build log (ios/ci_scripts/ci_post_xcodebuild.sh), so a failed export shows its real reason.

## 3.0.1 (Nov 14, 2026)
TestFlight: none (Xcode Cloud build 5 failed to sign; fixed in 3.0.2)
- The iPhone project now carries DJ's Apple team, so Xcode Cloud can sign and export builds for TestFlight (the first TestFlight build failed at export without it).

## 3.0.0 (Nov 14, 2026): the iPhone app
TestFlight: 3.0 (1), uploaded from the iMac (Xcode Cloud build 4 failed to sign)
- Slate is now a real iPhone app (build 3.0), installed from Xcode on DJ's iPhone Duo, with Xcode Cloud building it for TestFlight.
- Alerts arrive through Apple's push service, and live scores show on the Lock Screen and in the Dynamic Island.
- The web app moves to 3.0.0 to mark the start of version 3.

## 2.42.0 (Nov 14, 2026)
- Play by play is gone everywhere. In its place, a tapped game (and Full matchup) leads with the game's top individual performances.
- Football games list every score: quarter and clock, team, TD / FG / safety, who scored ("A. Flora run 77 yds"), and the score after it. Soccer keeps its goal timeline (scorer and minute).
- Full matchup's live section is now "Top performers and players".

## 2.41.0 (Nov 14, 2026)
- Worth a look settings (per account, Settings > Worth a look): pick exactly which leagues can show up (starts with your slate-rule leagues and your teams' leagues), plus two new filters: National TV only, and College: ranked teams only. Games already on your slate always qualify. Replaces the old "I watch / All" choice.

## 2.40.0 (Nov 14, 2026)
- Quick reads and Claude's write-ups always show in full (no more "More" link), in the game tray and everywhere else.
- A line under the slate's header (title, date, settings), with even space below it before Time/League and Live.
- Time | League is the same height as the Live button.
- "Scores updated 12:30 PM" moved to the help text at the bottom of the slate.
- The "You've edited this slate" note is gone; "Back to default slate" now sits beside "Clear slate" under the slate, in the same style.

## 2.39.3 (Nov 14, 2026)
- Dropped the "A ranked showdown" pre-game line (the ranks are already on the matchup); those games now get their next-best line (streaks, the line, ESPN's prediction, head-to-head).

## 2.39.2 (Nov 14, 2026)
- Worth a look: the reason line moved under the matchup, styled like the slate's one-liners (red while the game is live, plain once it's final). The league, tag and ✕ stay above the game.

## 2.39.1 (Nov 14, 2026)
- Unfolded: the two headers line up. "Today's Slate" and "All games" start at the same height, the league tabs sit level with the date row, and the Time/League row lines up with the Live row on the right. The "you've edited this slate" note moved under the Time/League row.
- Every live game with a score now has a red line: its highlight, or until one exists, the game's standout so far ("J. Evans 102 pass yds", "D. Dupree 42 rush yds, 1 TD"). Before any score, the pre-game line stays.

## 2.39.0 (Nov 14, 2026)
- Box Office: players from games on your slate that day carry a small "Slate" tag next to their name (today and past days alike).

## 2.38.1 (Nov 14, 2026)
- Worth a look sits in its own tinted, outlined panel with space below it, so it's clearly separate from your slate.

## 2.38.0 (Nov 14, 2026)
- Menu, top to bottom: On TV, Teams, Box Office, All games, Slate (Slate is the left side when unfolded, so it isn't in the menu there).
- Unfolded, the right side opens on All games (it was Box Office); its back button returns to All games.
- Box Office: if it fell back to last night because today's scores hadn't loaded yet, it switches to today as soon as today's games have results.

## 2.37.2 (Nov 14, 2026)
- Menu (bottom right), top to bottom: All games, On TV, Teams, Box Office, Slate. Slate sits at the bottom, nearest your thumb.

## 2.37.1 (Nov 14, 2026)
- Live scores on the Lock Screen stay up after the final, showing the final score, until you swipe them away. iOS removes an ended one on its own after 4 hours at most (Apple's limit), so that's the longest it can stay.

## 2.37.0 (Nov 14, 2026)
- Notifications page reworked: Morning brief; Game alerts as one list with a My slate and a My teams tick for each (Game starting, Close finish, Overtime, Final score, Goals, Hourly score), nothing ticked = off; Upset watch; Live scores on the Lock Screen with the same two ticks (on whenever one is ticked); then When.
- Removed the "Big night" alert completely. Around kickoff ESPN lists each player's season totals, so a Dayton football game at 0-0 sent three alerts with different players.
- Worth a look's Big individual nights now wait until a game has a score and is past the first period/quarter, for the same reason.

## 2.36.3 (Nov 14, 2026)
- Every game on the slate keeps a line under it: once a game goes live, its pre-game line stays until the game's own first line arrives (it used to go blank in between). If a game never had one, the line shows the two records ("Syracuse (4-5) at NC State (4-5)").
- The live game's own line is red while the game is on; pre-game lines stay as they were.

## 2.36.2 (Nov 14, 2026)
- All games: filters with no games that day move to the end of the strip (after the conferences), still dimmed.

## 2.36.1 (Nov 14, 2026)
- All games: a league's filters are always all listed (dimmed when no game matches that day), so leagues with the same rules show the same strip: men's and women's college hoops both show Both ranked, Top-10 team, Any ranked team, National TV, then conferences.
- New NBA rule and filter: NBA Cup (group play, knockouts and the final). NBA now has National TV, Top 4 teams, Winning teams and NBA Cup, in Slate rules and on All games alike.

## 2.36.0 (Nov 14, 2026)
- All games: the filters under each league are now the same choices as that league's slate rules, worded the same way (e.g. College Football: Both ranked, Top-10 team, Any ranked team, National TV, then conferences; NFL: Prime time, Division games, Winning teams; Premier League: Big Six clash, Any Big Six club, Top of the table, National TV; International: USA, Heavyweight clash, Any big nation, Games that count). A choice only shows when some of the day's games match it.

## 2.35.1 (Nov 14, 2026)
- Box Office: the date picker can go to today even before any game has started (it used to bounce back to last night). Opening Box Office still starts on last night until today has results.

## 2.35.0 (Nov 14, 2026)
- The Athletic Newsletters now stay on the day they came out: each day's slate links the editions published that day (with the time), so you can go back a day or two and open one you missed. Opened ones stay grayed out on that phone for two weeks.
- The server keeps two weeks of editions for each newsletter (it kept only the last 3), including The Athletic FC from email.
- Weekends: the newsletters you follow don't publish then, so there's no section on Saturday or Sunday (Friday's are on Friday's slate).

## 2.34.2 (Nov 14, 2026)
- The Athletic Newsletters stay off the slate on Saturdays and Sundays unless a picked newsletter actually publishes that day. All of DJ's picks (The Pulse, The Bounce, Moneycall, Peak, The Athletic FC) are weekday-only, so his weekend slate has no newsletter section.

## 2.34.1 (Nov 14, 2026)
- Removed the Today pill next to the date at the top of the slate (it showed on any other day). The back arrow in the bottom corner still returns to today on another day's slate (put back after 2.34.0 hid it by mistake).

## 2.34.0 (Nov 14, 2026)
- Box Office always opens on a page with results: today once a game has a score, otherwise last night. Postponed and canceled games (which ESPN marks as "over") no longer count as played.
- Box Office no longer shows a decided game as "End of 4th": ESPN sometimes leaves college football games there for a while, and Slate now treats them as final (on the page and in the stored rankings).
- On TV: channels with a game on right now come first, then the rest, alphabetical within each.
- Team cards: today's game fits on one line ("Today 2:30p vs BC").
- Game trays: the venue, betting line and Claude button sit closer together.
- Tapping a started game waits for its box score instead of flashing the Claude button first.
- Full matchup: the quick read shows in full (no More link).
- The slate page no longer shows the Today button (the date picker gets you back to today).

## 2.33.2 (Nov 14, 2026): final review before the iPhone app
- Faster opens, far fewer network calls: reopening Slate went from 57 ESPN requests to 13 in the first 25 seconds.
  - Games that need the same day's scoreboard now share one request instead of each asking (32 duplicate requests on open, gone).
  - A finished game's one-line note is kept on the phone, so reopening doesn't refetch every final's game data.
- Safety: links that come from outside data (Claude's headlines, newsletter feeds) only open as web pages. Checked: no passcodes or keys in the public repo, every save goes through the server's passcode check and stays inside the account's own space, live-notification tokens are validated.
- Cleanup: removed 30 unused pieces of code (old ticker, old preview requests, old cards) and the server's leftover newsletter checker (the Worker does it now). The page is 18 KB smaller.
- Checked every page (Slate, All games, Teams, On TV, Box Office, Settings, a game's tray and Full matchup) folded and unfolded with no errors.

## 2.33.1 (Nov 14, 2026)
- Worth a look football lines no longer include the down and yard line (the play by play has it).
- Football play by play shows who has the ball on every line ("PRST 1st&10"), in true order, without repeats.
- Shorter plays so more fit on one line: "W.Burns pass to D.Spjut for 9 yds to PSU28, 1st down", "Alex Wilkins makes 24-ft 3-pt jumper, ast Otega Oweh", "FT 2/2 good".
- Full matchup: the live section is now "Plays and players" (play by play first, then top performers, then every player); a finished game's is "Recap and players".

## 2.33.0 (Nov 14, 2026)
- Live play by play: tap a live game and the last 5 plays come first (newest on top), the box score under them. Each play is one line; jersey numbers, formations and tacklers are trimmed. Football plays lead with the down ("3rd & 8"); other sports with the period and clock. Scoring plays are bold. Also on the Full matchup page. It uses the game data the box score already loads, so no extra requests.
- Fixed the spot in "who has the ball" during timeouts (ESPN counts the yard line from the home team's goal line).

## 2.32.0 (Nov 13, 2026)
- "Worth a look right now" is now just "Worth a look".
- Football lines add who has the ball and where: "A 6-point game late. PRST ball, 3rd & 4 at SUU 35" (worked out from the yard line during timeouts, when ESPN drops the text).
- Basketball close finishes add the game's top scorer: "A 2-point game late. S. Gilgeous-Alexander 37 pts".
- Finished games (the 10 minutes they stay) swap the old reason for the result at a glance: a game-winner when there was one ("Game-winner: Alex Wilkins makes 24-foot three point jumper"), otherwise the top scorers, top passer/rusher, or goal scorers.

## 2.31.0 (Nov 13, 2026)
- Time | League moved from the bottom bar to the top of the slate, on the left of the Updated / Live row, in the same quiet pill style as Reorder (on every phone, folded or not).
- In League view, Reorder now sits under the last league section.

## 2.30.3 (Nov 13, 2026)
- Worth a look reasons drop the clock and period (it's on the game row right below): "A 6-point game late", "A 4-point game in OT".

## 2.30.2 (Nov 13, 2026)
- Worth a look reasons say "An 8-point game" (and 11, 18) instead of "A 8-point game".

## 2.30.1 (Nov 13, 2026)
- A game that finishes while it's in Worth a look right now stays there for 10 minutes, tagged Final, then drops off. The "N live" count only counts games still going.

## 2.30.0 (Nov 13, 2026)
- Worth a look right now is a permanent section at the top of today's slate: always open (no more folding), and gone only when nothing qualifies.
- Games already on your slate show there too when they qualify (ticked), and stay on your slate as well. A game you add from there stays in the section, ticked.
- ✕ on any game (including one you added) takes it out of Worth a look for the rest of the day; it stays on your slate.
- Up to 5 games instead of 3, since slate games can be in the list now.

## 2.29.0 (Nov 13, 2026)
- Live notifications for the iPhone app: when a game on your slate (or your teams, if you pick it) goes live, its score appears on the Lock Screen and at the top of the screen, updates as it changes, and clears 15 minutes after the final. Up to 4 at a time; none start during quiet hours. Turned on or off per account in Settings > Notifications > Live notifications. Needs the 3.0 app build.
- Settings > Worth a look right now is now one collapsible row with a summary. "Show this section" is clearly the parent: the rules sit indented under it and dim when it's off. The rule text now states the actual rules, shorter.
- Team cards: today's game fits on one line ("Final L 78-85 vs GTWN").
- Even space above and below the Live button on the slate.

## 2.28.0 (Nov 13, 2026)
- More notifications, each switched on or off for your account in Settings > Notifications (every Slate account has its own):
  - Game starts: choose My slate and/or My teams, and when (at the start, 10 or 30 minutes before).
  - Close finishes: a one-score game late (last 5 minutes, 80th minute, 8th inning on), for your slate and/or your teams.
  - Overtime: when a game goes to overtime or extra time.
  - My team scores: every goal in your teams' hockey and soccer games (off to start).
  - Big individual nights: 40 points, 350 passing or 150 rushing or receiving yards, a hat trick (off to start).
  - Still there: the daily brief, hourly score for your teams, upset alerts, and finals for your slate and/or your teams.
- The notifications page is reorganized into Daily brief, Game starts, During games, Final scores, Live notifications and When. "How it works" now says what really happens: Slate checks every minute.
- The Live notifications switches are in place for the iPhone app.

## 2.27.0 (Nov 13, 2026)
- "Worth a look right now" is its own collapsible section at the top of today's slate, like the league sections. Each game keeps its league, label and one-line reason, with a ✕ to hide it. The game row has the + / ✓ from All games, and a game you add stays in the section, ticked, for the rest of the day, so one more tap takes it back off.
- New Settings > Worth a look right now: turn the section on or off, choose close finishes and big individual nights separately, and pick leagues you follow or any league.
- Teams page: each team card shows its sport icon, the same as on the slate. The next-game line is shorter ("Tmrw 7p @ CHI") so it no longer gets cut off.
- Soccer match summary: own goals are credited to the team that benefits. They had been counted for the own goal scorer's team.
- Less empty space under "Updated" and the Live button at the top of the slate.
- Claude summaries: every account except DJ's is limited to 10 a day. Also fixed a counting bug that could let an account go past its limit.

## 2.26.4 (Nov 13, 2026)
- All games: changing the day keeps the league you're looking at instead of jumping back to My teams, even on a day that league has no games (it says so and stays put).

## 2.26.3 (Nov 13, 2026)
- No more flash when Slate opens. It used to show the wrong accent color and a slate built from the default rules (a handful of early-season college tournament games) for a split second before your own settings arrived. Now it shows "Loading your slate…" for that moment, and the team-color accent keeps today's saved color instead of briefly falling back to green.

## 2.26.2 (Nov 13, 2026)
- The newsletter list under your slate is now titled "The Athletic Newsletters".

## 2.26.1 (Nov 13, 2026)
- Newsletters you've opened are grayed out under your slate, the same way a finished game is, so you can see what's left to read. Remembered on this phone for a week.

## 2.26.0 (Nov 13, 2026)
- The Athletic FC, which is only sent by email, can now appear under your slate. A small Google Apps Script in your Gmail sends Slate each morning's subject line and "View Online" link (nothing else from the email). It shows in Settings > The Athletic newsletters for you only, not your brother, since the link is tied to your email.

## 2.25.4 (Nov 13, 2026)
- Newsletters are only looked for on the days they come out. Each one's publishing days are learned from its last six weeks of editions: Money Call and Peak once a week, The Windup twice a week in the offseason (and daily once the season starts, by itself), and so on.
- On a newsletter's day, Slate looks from 3 a.m. Central every 30 minutes until the edition appears, then stops until its next day. Once a week every newsletter gets one full look, in case a schedule changes.
- The checking moved to Slate's own server, which runs every minute, from the GitHub job, which only runs every few hours in practice.

## 2.25.3 (Nov 13, 2026)
- Unfolded and held upright, the page fills the screen. It no longer sits in a narrow column with empty space on both sides, and the gap above the header is smaller.
- The menu button no longer parks in the middle of the screen after folding, unfolding or turning the phone. Right after the screen changes size it stays put while things settle and re-pins itself a few times. It only lifts when the keyboard is really up.

## 2.25.2 (Nov 13, 2026)
- Newsletters are checked smarter. From 4 a.m. Central, Slate looks every 30 minutes for each picked newsletter's edition of the day. Once today's is found it stops checking that one until tomorrow, and all checking ends at 8 p.m. (weekly ones just aren't out that day).

## 2.25.1 (Nov 13, 2026)
- Settings: The Athletic newsletters is now one row like the other settings. It shows what's picked (or None) and opens with a tap to choose.

## 2.25.0 (Nov 13, 2026)
- The Athletic's newsletters under your slate. Settings > Slate > The Athletic newsletters lets you pick any of eight: The Pulse, The Bounce (NBA), The Windup (MLB), Money Call, Peak, Prime Tire (F1), Full Time (women's soccer) and No Offseason (women's basketball). "None" turns them all off; none is picked to start.
- Today's slate shows a "From The Athletic" list with the latest edition of each pick from the last three days, newest first, marked Today, Yesterday or the weekday. Each one opens the edition on The Athletic's site.
- The editions come from The Athletic's public feeds, checked every 30 minutes by the GitHub job. Scoop City, Red Light, The Athletic FC and Until Saturday aren't posted there, so they can't be included.

## 2.24.1 (Nov 13, 2026)
- Suggestions: each card leads with the league (icon and name, like NHL) next to the reason's label. The Not now and Add to slate buttons are smaller and quieter: plain text for Not now, a soft button for Add.

## 2.24.0 (Nov 12, 2026)
- Suggestions reworked. Every suggestion shows its reason on top, with big "Not now" and "Add to slate" buttons (Add on the right).
- Coming up: big games your rules didn't pick, from the media side:
  - rivalries (a built-in list for the NBA, NHL, NFL, MLB, college and soccer)
  - top-of-standings clashes, with the real standing (3rd West vs 4th West)
  - two ranked college teams
  - finals, cups, bowls and other big events (small early-season tournaments count for much less)
  - knockout ties
  - two winning teams
  - two of the biggest clubs or nations
  - a national TV pick
- From how you use the app:
  - teams you keep adding or opening
  - games your starred players are in
  - leagues you follow (adds, opens, rules, your teams), which lift their big games
  - late games in leagues you usually drop, which sink
- Friendlies only get suggested for personal reasons. Being on League Pass (or any one channel) is never a reason any more.
- Live now: a new "Worth a look right now" block at the top of today's slate suggests:
  - a close finish late in a game (a one-score game in the last 5 minutes, the 4th quarter, the 3rd period, the last 15 minutes or the 7th inning on), in leagues you follow
  - a big individual night from the live box score: 35+ points in the NBA, 300 passing or 130 rushing or receiving yards, a hat trick watch in the NHL
  - a truly standout one of either in any league

## 2.23.3 (Nov 12, 2026)
- The Time / League switch on the slate: the blue highlight now fits inside the switch at every text size instead of spilling past it.

## 2.23.2 (Nov 12, 2026)
- Soccer match summary is more compact. Goal lines are plain bullets lined up with the rest, with a ⚽ in place of the bullet as the only marker (no highlight, bold or pill), and the score after the goal in plain gray. Less space between lines.

## 2.23.1 (Nov 12, 2026)
- Soccer match summary: removed the subs line. Bookings stay.

## 2.23.0 (Nov 12, 2026)
- Full matchup page: on finished games, Claude's summary now comes first, above the top performers and the box score. Live games show the top performers above the box score too.
- Soccer goals stand out in the match summary: a ⚽, a tinted card with the scorer's name in bold, and the score after the goal (home team first, like ENG 1–0 CRO).

## 2.22.1 (Nov 12, 2026)
- Full matchup page: the game's top four performers now sit above the box score on finished games, instead of below it.

## 2.22.0 (Nov 12, 2026)
- Soccer: the timeline is replaced by a written match summary in bullet points.
  - Each goal has its minute, the scorer, who set it up, and the score after it ("England lead 2–1").
  - It also covers penalties won, missed or saved, and red cards.
  - It marks half-time and full time with the score.
  - The full matchup adds one line each for bookings and subs per team.
  - The card on the slate keeps to goals, penalties and red cards.

## 2.21.1 (Nov 12, 2026)
- Live hockey games get a one-liner. Before, there was only a line for two-goal games or 30-save goalies. Now there are lines for:
  - who has scored for each team
  - 3-point nights and two-assist games
  - a goalie's shutout in progress (15+ saves)
  - a scoreless game's shots
  - lopsided shot totals
  - hot or cold power plays

## 2.21.0 (Nov 12, 2026)
- Slate: removed the jump to the live or next games. The slate opens at the top of the page again.
- Each time slot folds shut: tap its time (or the folded line) to fold or unfold it. A folded slot shows one line of its games, like DET–WSH, with a red dot on any that are live. Folds are remembered for that day on this phone.
- iPhone app prep: the app's version is set to 3.0 for its first build this weekend.

## 2.20.3 (Nov 12, 2026)
- Slate: the jump to the live or next games measures how far to scroll instead of trusting the page's reported positions. With larger text, iPhone Safari reports those on a different scale, which sent the page too far down.

## 2.20.2 (Nov 12, 2026)
- Slate: the jump to the live or next games now lands on the right game with larger text sizes on iPhone. The browser does the lining-up itself, since Safari measures the zoomed page differently and the old math overshot by one game. A reload also starts fresh instead of reopening where you'd left off, so it always aims at what's on.

## 2.20.1 (Nov 12, 2026)
- Slate: when the earliest live game is in the first time slot, coming back now shows the page from the top instead of cutting that game off. Coming back to the app also re-aims at the live or next games, even if you'd left the page scrolled somewhere else.
- Box Office and other pages always open at the top. The page checks again over the next half second, in case iPhone Safari kept the old scroll position.

## 2.20.0 (Nov 12, 2026)
- Box Office: every player shows five stats. The 4th and 5th are picked from what stood out that night.
  - Basketball: threes, steals, blocks or field goals.
  - Hockey: always goals, assists, shots and +/-, then hits, blocked shots, faceoffs or ice time.
  - Football: completions and passer rating for QBs, carries and yards per carry for runners, targets and longest catch for receivers, tackles for loss, QB hits and pass breakups for defenders.
  - Baseball: hits and walks allowed for pitchers, walks and steals for hitters.
- Coming back to today's slate scrolls to the live or next games, the same as a reload. This happens from the Slate button, Back, swiping back to today, or reopening the app after 5 minutes away.

## 2.19.2 (Nov 12, 2026)
- Box Office: no more empty space on the right. Each player row puts its game (clock or result, score, opponent) in a right-hand column instead of a third line, and the open screen shows two columns of these rows. Headshots no longer cover the first stat.
- The menu button and date pill stay pinned in one spot on the open screen while you scroll, like on the cover screen.

## 2.19.1 (Nov 12, 2026)
- Box scores look the same in every sport and in both places: the quick look under a game now uses the same player rows as the full box score (headshot, name, position, big numbers with small labels), with its key columns and top players. Football, hockey, baseball and soccer match basketball.
- Team stat rows use short labels ("Yards", "3rd down", "PP chances", "Faceoff %") so they fit.

## 2.19.0 (Nov 12, 2026)
- Today's slate opens at what's happening now: it scrolls to the first time slot with a live game, or the next start time if nothing's live. It happens once when you open Slate (and again after it's been away 20+ minutes), and never while you're scrolling.
- Box Office: two columns of players on the open screen again; Text size explains what Auto reads from your iPhone (2.18.4).

## 2.18.4 (Nov 12, 2026)
- Box Office: two columns of players again on the open screen (one column only on the narrow cover screen), so there's no big empty space on the right.
- Settings > Text size shows what Auto is reading from your iPhone ("Your iPhone is at 100% right now…").

## 2.18.3 (Nov 12, 2026)
- Text size settings made clearer: "iPhone" is now "Auto" (it matches your iPhone's own text size), Auto is offered for both Folded and Unfolded, and the note explains folded means the cover screen and unfolded the big screen. The second "Unfolded" heading is now "Open screen layout", with updated wording for the crease nudge.
- Help notes appear at the top center (2.18.2).

## 2.18.2 (Nov 12, 2026)
- Help notes ("Added to slate", "Alerts are on…" and the like) now pop up at the top center of the screen instead of the bottom, clear of the menu button and date pill.

## 2.18.1 (Nov 12, 2026)
- Back is back on every page that isn't your slate (and on another day's slate), still sitting beside the menu button.
- The header's ••• menu shows icons and matches the bottom menu's look (Reset, Slate rules, Share).
- Pulling past the top or bottom of a page no longer drags the menu button and date pill with it.

## 2.18.0 (Nov 12, 2026)
The UX review's changes, all in one version. The version before them is saved on the pre-ux-review branch, so it can be put back in one step.
- Colors (Midnight, cleaned up): easier-to-read gray text, a brighter live red, the menu a little more solid. Finished games go quiet with color instead of fading to 55%. Live highlights are red; the preview line under upcoming games is a plain line, not a box. Red now means live only: losses and underachievers are gray. The Live button reads dark on red. With Increase Contrast on in iPhone settings, a high-contrast Midnight turns on by itself.
- Bigger targets: the slate header has two 44-point buttons, Settings and More (Reset, Slate rules, Share). Day arrows, the Live button, menu items, Time/League, league tabs and channel links all reach 44 points at every text size.
- Larger text: at L and XL, records hide and the status and channel move to their own line so names stay whole. New "iPhone" text size follows the iPhone's own setting.
- Back shows only on pages you drill into (Matchup, Team, rules, notifications) and on another day's slate, and sits beside the menu button instead of above it.
- Teams: dark team colors (Raiders, Notre Dame) use their second color so the tile isn't blank. Tiles at least 190 points wide.
- All games and On TV: one date picker, the bottom pill.
- Settings: the passed-on themes are gone (Midnight only); selected options use the accent; section headings read as headings; the Add to Home Screen steps and the screen check line are hidden where they don't apply.
- "Updated 7:24 PM" beside the Live button, "Scores delayed" after a minute with no new scores.
- Long write-ups (quick read, Claude's take) open at four lines with More. Paid buttons say "Regenerate · Claude".
- Opening the app no longer flashes "No games match your rules" before the slate loads, and a phone without a passcode doesn't try to save.
- Wording: preview times say which day; the share sheet says "Tonight's slate"; load errors point to Reset.
- Watch sheet: YouTube TV is the main button, the network's app is outlined, Cancel is plain text.
- One system for corners (4 / 8 / 16 / round), text sizes (11, 13, 15, 16, 22, 28), weights (500, 700, 800) and spacing (4, 8, 12, 16, 24).
- Cover screen held sideways: a one-line header that scrolls away.

## 2.17.0 (Nov 12, 2026)
- iPhone app (and the preview): the page now runs all the way under the right-side strip, like Sleeper. The strip's buttons float on the page's own background with no separate panel, and the page keeps its content clear of them.
- Full box score: no more empty gap between a player's headshot and name on wide screens (2.16.5).

## 2.16.5 (Nov 12, 2026)
- Full box score: player rows no longer leave a big empty gap between the headshot and the name on wide screens. Stats sit right next to the player.

## 2.16.4 (Nov 12, 2026)
- Teams: removed the double line under the league tabs in Find a team.
- Team tiles: the next-game line always fits on one line ("Nov 22 10:30a @ Liverpool"). Long opponent names use their abbreviation, and the channel stays on the game itself.

## 2.16.3 (Nov 12, 2026)
- App strip: the tapped button lights up right away (preview and the iPhone app), instead of waiting for the page to report back.

## 2.16.2 (Nov 12, 2026)
- iPhone app strip: Settings is out (it stays in the header), and All games moves to the bottom spot, closest to your thumb. Order top to bottom: Slate, Box Office, Teams, On TV, All games. The preview page matches.

## 2.16.1 (Nov 12, 2026)
- Fixed the app preview link opening the regular Slate page: the offline cache was answering every page address with the app. Now only Slate itself is cached, and other pages (like the preview) load normally.

## 2.16.0 (Nov 12, 2026)
- Groundwork for the Slate iPhone app (in the repo under ios/). The app is a native shell around this same page, so every web update shows up in the app too.
- The page now knows when it's inside the app: on iPhone Duo the app's own control strip (Slate, All games, Box Office, Teams, On TV, Settings) replaces the floating menu button, and alerts can come through Apple's push service.
- New preview page, app-preview.html, shows the page next to a stand-in for the app's strip, so the layout can be tried in Safari before the app is built.

## 2.15.2 (Nov 12, 2026)
- Game reminders now arrive right at the start time ("Starting now: …") instead of up to an hour early. Custom games on the slate work the same way. If a game of one of your teams starts, you get the one alert, not a reminder and a live score in the same minute.

## 2.15.1 (Nov 12, 2026)
- Box Office on past nights only shows (and swipes through) leagues that actually played that night. Leagues with no games are gone from the tabs, and it never sits on one.

## 2.15.0 (Nov 12, 2026)
- Box Office never opens on an empty page. Today's league tabs only show leagues with a game underway or finished (soccer stays on the morning finishes). If nothing has started yet today, Box Office opens on yesterday instead, on a league that actually played.

## 2.14.1 (Nov 12, 2026)
- Removed the estimated xG and the xG one-liners. Slate only shows expected goals when ESPN actually provides them (it currently doesn't for team totals), so the stat won't appear for now.

## 2.14.0 (Nov 12, 2026)
- Expected goals (xG) for soccer, second in the team stats row next to possession, live and after the final. ESPN's free feeds don't publish team xG, so Slate estimates it from ESPN's shot-by-shot commentary (where each shot came from, header or foot, penalties, free kicks, fast breaks and through balls). If ESPN ever sends real xG, that's used instead.
- New soccer one-liners from xG: "Brighton have created 2.5 xG to 0.6", and "Fulham won despite an xG of 0.4 to 1.9".

## 2.13.4 (Nov 12, 2026)
- Unfolded: the Time / League switch no longer jumps around. It stays on the left in both modes; Reorder appears just to its right when sorting by league.
- Soccer timeline: nothing is cut off anymore. Long names wrap, and the extra detail (assist, who won and conceded a penalty, who a sub came on for) sits on its own smaller line under the player.

## 2.13.2 (Nov 12, 2026)
- Fixed the preview line and the odds chips disagreeing (line said Giants by 1.5, chips said -2.5). The chips were holding the line from earlier in the day; they now update from the same fetch as the preview line, and an open upcoming game refreshes its odds and injuries every 20 minutes.

## 2.13.1 (Nov 12, 2026)
- All games: a league section with games on right now shows a red live dot and count ("Live", "3 live") next to its name, even when the section is collapsed.

## 2.13.0 (Nov 12, 2026)
- Upcoming games on the slate get a one-line preview too, on any day (today, tomorrow, further out). It's built free from ESPN's pre-game data: win and losing streaks, team leaders who are out or questionable, close or lopsided betting lines, ESPN's predictor (a coin flip or a near-lock), unbeaten home or road records, ranked showdowns, top-of-table and relegation clashes, one-sided head-to-heads, and ESPN's own preview headline when nothing stands out. Two facts about the same team read as one sentence ("Canucks have lost five in a row and are 1-8 at home").
- Games added to the slate later get their line as soon as they appear. Lines refresh every 30 minutes and are kept on the phone so they show right away next time.

## 2.12.0 (Nov 12, 2026)
- Smarter soccer one-liners. They now tell the story of the match instead of just the latest goal: every scorer for a team ("Kane (2), Saka and Foden have scored for England"), comebacks ("came from two goals down to win, through …"), late winners and equalizers, a team running the game (possession plus shots), winning without the ball, no shots on target, goal-fests, still goalless, red cards with the minute, and keepers keeping a clean sheet.
- Penalties: a penalty that's just been given jumps to the top of the line ("Penalty to Belgium — Doku was brought down"), and missed or saved penalties get their own line.
- The soccer timeline now shows penalties too: who won it and who gave it away, plus missed and saved penalties.

## 2.11.4 (Nov 12, 2026)
- Soccer games now get the one-line live summary under them on the slate: goals (with the assist, headers, penalties), braces and hat tricks, two quick goals, red cards, possession, shot gaps and busy keepers. After the final whistle the line switches to past tense.

## 2.11.3 (Nov 12, 2026)
- Notifications read "from Slate" on top with the alert underneath (two lines). The morning brief starts with "Today's games".

## 2.11.2 (Nov 12, 2026)
- Soccer: the full matchup section is called "Lineups and timeline" ("Lineups, timeline and recap" after the final) instead of Box score.
- Goal ⚽ and assist (A) badges are back on the lineup pitch, plus the assister in the timeline ("· assist Doku").
- The team stats row (possession, shots, corners…) shows again above the pitch during and after a match.

## 2.11.1 (Nov 12, 2026)
- Soccer: shirt numbers are readable on light team colours (dark numbers on white kits).
- Removed the player stat table during and after matches (the pitch and timeline show it).
- Before kickoff, the quick look shows each team's season stats (top 6 players and the No. 1 keeper) after the preview; the full matchup has every player. Lineups move to the top once announced.
- Timeline names use full surnames (De Bruyne, not Bruyne).

## 2.11.0 (Nov 12, 2026)
- Soccer gets its own match view, in the quick look and the full matchup:
  - Lineups on a small pitch: formation, the starting XI by position with shirt numbers in team colours, goal and card markers, who came off and when, and the bench (with when subs came on). Shows before kickoff once lineups are announced (about an hour out).
  - Match timeline: goals (with penalties and own goals), cards and substitutions with the minute; newest first while live. The quick look shows goals and cards, the full matchup adds subs.
  - Team stats row with possession, shots, corners, fouls and saves; player stats underneath.
- International matches (Nations League, friendlies, qualifiers) now get box scores too.
- Quick looks opened from All games now refresh as the box score comes in.

## 2.10.2 (Nov 12, 2026)
- Fixed Claude summaries showing raw <cite index=…> tags (left over from its web searches). They're stripped before saving, and today's Belgium–Türkiye preview was cleaned up.

## 2.10.1 (Nov 12, 2026)
- Alerts show times in each person's own time zone (taken from their phone), so Drew sees Eastern times. Quiet hours, the brief time and alert days follow it too.

## 2.10.0 (Nov 12, 2026)
- Box Office: tap a top performer to open his game right beneath him, with the same quick look you get on the slate (score, box score, Claude's recap or preview, and Full matchup). Tap again to close.

## 2.9.2 (Nov 12, 2026)
- Notifications are two lines: the alert itself (like "11:00 AM: Belgium @ Türkiye on FS1") with iPhone's "from Slate" under it, instead of a separate "Starting soon"/"Final" heading on top. The morning brief keeps its "Today's games" heading since it has several lines.

## 2.9.1 (Nov 12, 2026)
- Two-column Box Office cards fit cleanly: smaller photo without the team badge on it, name and team on one line (long names trim), the top three stats on one line, and the result underneath.

## 2.9.0 (Nov 12, 2026)
- Box Office shows the top 20 players every time (no more Show top 25 button).
- Players sit in two columns when your text size leaves room (best first, reading left to right, row by row); bigger text sizes go back to one column. Same for over and underachievers.

## 2.8.2 (Nov 12, 2026)
- League view: Reorder sits level with the Live button (left side), and My teams moved up right under them.

## 2.8.1 (Nov 12, 2026)
- On the ALL tab, league sections now follow the same order as your All games tabs.

## 2.8.0 (Nov 12, 2026)
- All games opens on your teams (★), with ALL as the second tab.
- New filters under ALL: All, Best of each league (up to 3 standout games per league: your teams, ranked matchups, national TV, top teams, winning teams) and National TV.

## 2.7.5 (Nov 12, 2026)
- All games: slimmer header so the games get more room: smaller league tabs, filters and day picker, and less space around the search button.

## 2.7.4 (Nov 12, 2026)
- Quick box score under a game is more compact so the score and the players fit on screen together: slimmer win-chance bar (no caption), shorter team tabs, tighter team stats row, and no venue line once a game has started.

## 2.7.3 (Nov 12, 2026)
- All games: the Live button no longer tucks under the date bar.
- The note at the bottom now says live scores update every 10 seconds (it still said 30, plus a confusing "last refresh" time).

## 2.7.2 (Nov 12, 2026)
- The main page reads "Today's Slate" until 5 PM, then "Tonight's Slate", every day.

## 2.7.1 (Nov 12, 2026)
- Reorder sits on the left, directly above the first section title, in League view only.

## 2.7.0 (Nov 12, 2026)
- The sort switch is back to just Time | League.
- In League view, a small Reorder button sits right above the first section; it lists only the sections on that day's slate.
- My teams is now a section you can move like any league (it starts at the top until you change it).

## 2.6.9 (Nov 12, 2026)
- The ⇅ league-order button now always shows in the Time | League switch, so the buttons never shift. Tapping it from Time view switches to League and opens the order.

## 2.6.8 (Nov 12, 2026)
- League order moved off the top of the slate: in League view, a small ⇅ button sits beside League in the bottom switch. Tap it to reorder leagues, then Done.

## 2.6.7 (Nov 12, 2026)
- The back-to-today arrow points toward today: right on a past day's slate, left on a future one.

## 2.6.6 (Nov 12, 2026)
- Slate's corner buttons are smaller and centered in the header, so they fit inside it.

## 2.6.5 (Nov 12, 2026)
- Menu button stays pinned to the bottom right on iOS 26: iOS 26 sometimes slides the visible screen while you scroll, which dragged the button along; it now follows the visible screen itself.

## 2.6.4 (Nov 12, 2026)
- Removed the scrolling ticker from the top of the slate.

## 2.6.3 (Nov 12, 2026)
- Slate's top buttons are back in the corner (no extra space), each now its own outlined tile so they read as four separate buttons.

## 2.6.2 (Nov 12, 2026)
- The four buttons at the top of the slate are now bigger, labeled buttons in their own row: Reset, Settings, Rules and Share.
- Menu button watchdog: if the menu button ever drifts from the bottom while scrolling, the app snaps it back and records what the screen reported, so the cause can be tracked down.

## 2.6.1 (Nov 12, 2026)
- Swiping the slate to another day shows the back arrow; tap it to jump back to today.
- The Time | League switch moved to the bottom, left of the menu button (where the date picker sits on other pages). Unfolded, it stays at the top of the slate.

## 2.6.0 (Nov 12, 2026)
- Slate can be sorted by League as well as Time (Time stays the default). League view puts My teams first, then each league, with game times inside each.
- Each section in the League view collapses with a tap, and remembers it.
- "Order" sets the league order for that view (with a reset back to the usual order).

## 2.5.2 (Nov 12, 2026)
- Games with no US channel listed now show no channel instead of "Local TV" (it was a guess, and usually wrong for international games). Same in the matchup view and the copied slate.

## 2.5.1 (Nov 12, 2026)
- Team colors: the explanation now pops up briefly when you pick it, instead of a line that always sits under the swatches.

## 2.5.0 (Nov 12, 2026)
- New accent option, Team colors (Drew's idea): the app's accent switches each day to the colors of your first team, in your Teams page order, that plays that day. If none play, it uses the theme's color. It's the last swatch under Settings > Look.
- A phone that isn't signed in now asks for the passcode as soon as you change something, instead of showing "Couldn't save settings" and quietly showing DJ's slate.

## 2.4.4 (Nov 12, 2026)
- Fix for a phone that forgets whose profile it is (settings wouldn't save): it now checks with the server and reopens on the right profile.
- Failed saves are recorded on the server so problems on a phone can be traced.

## 2.4.3 (Nov 12, 2026)
- Finished games get a proper closing line: past tense, the winner's story first, and nothing that only fits a live game (no "triple-double watch", runs or pace).

## 2.4.2 (Nov 12, 2026)
- Fixed Claude summaries failing with a "Bad control character" error (line breaks inside Claude's answer are now handled).
- When a summary doesn't finish, the message is now in plain words instead of a technical error.

## 2.4.1 (Nov 11, 2026)
- Notifications settings: removed "from Slate" from the description.

## 2.4.0 (Nov 11, 2026)
- Alerts are close to instant: Slate's server checks live scores every minute and sends finals, reminders, live scores and upset alerts within about a minute.

## 2.3.3 (Nov 11, 2026)
- Faster live updates while the app is open: slate scores and the open game's box score every 10 seconds (was 30); other live games every minute (was 2).
- Date picker: the month and the day are the same size.

## 2.3.2 (Nov 11, 2026)
- The refresh button at the top now resets the app: it reloads the newest version with fresh data, which fixes anything stuck.
- Removed the Refresh link at the bottom of the slate (scores and games update on their own).

## 2.3.1 (Nov 11, 2026)
- Folding the phone no longer leaves the menu scrolling with the page: the app resets its zoom and size right after a fold.

## 2.3.0 (Nov 11, 2026)
- Release history is viewable in the app: Settings > What's new.

## 2.2.3 (Nov 11, 2026)
- Player headshots no longer show initials behind the photo. Initials appear only when a player has no photo.

## 2.2.2 (Nov 11, 2026)
- Box Office: the league tabs stay in place when you swipe between leagues. Long names like Premier League and Champions League no longer jump out of view.

## 2.2.1 (Nov 11, 2026)
- Quick box score (matchup dropdown on the slate): the picked team's stats show as a sideways-scrolling row under the team tabs, like the full box score.
- Teams: more columns on a wide upright screen, and two columns on the right side when unfolded sideways.
- Box Office: two columns of players on a wide upright screen.

## 2.2.0 (Nov 11, 2026)
- Box Office can be built for any past night and any league with a free "Build this night's Box Office" button (ready within about 10 minutes).
- New Box Office leagues: NHL, women's college basketball (WCBB) and Champions League, plus MLB and WNBA during their seasons.

## 2.1.1 (Nov 11, 2026)
- Quick box score: team stats moved above the players.
- Box Office: two-column layout when unfolded and held upright.

## 2.1.0 (Nov 11, 2026)
- Phone alerts come from Slate itself as push notifications, at no cost: reminders, finals, live scores, upset watch and the daily brief, with the same settings as before.
- New "This phone" switch in Settings > Notifications to turn alerts on for each phone (works for your brother's phone too).
- The hourly Claude alerts run is retired.

## 2.0.0 (Nov 11, 2026): efficiency release
- Claude only writes when you tap a button. Nothing that costs money runs on its own.
- Live highlights under games are written by the app's own rules (free) instead of Claude.
- Box Office: top performers and wild finishes are built free each morning; Claude's over and underachievers are written only when you tap.
- Fewer web searches per Claude summary (preview 2, team 2, recap 1, Box Office 2), which lowers the cost of each summary.
- The day slates (every game, today plus three days) are built by a free script instead of a daily Claude run, and "Build slate" requests go through the same free job.
- The version number now shows in Settings.
