# Slate release history

Version 1 is everything built before the first efficiency pass. Version 2 is everything from that pass up to Nov 11, 2026, ending with the build below.
Version 3 starts with the real iPhone app (the weekend of Nov 14–15, 2026): its first build is 3.0, and the web app moves to 3.0.0 the same day.
From 2.0.0 on, every change gets a new number: fixes and tweaks bump the last number (2.0.1), new features the middle one (2.1.0).

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
