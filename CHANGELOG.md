# Slate release history

Version 1 is everything built before the first efficiency pass. Version 2 is everything from that pass up to Nov 11, 2026, ending with the build below.
From 2.0.0 on, every change gets a new number: fixes and tweaks bump the last number (2.0.1), new features the middle one (2.1.0).

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
