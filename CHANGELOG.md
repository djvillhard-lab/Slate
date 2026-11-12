# Slate release history

Version 1 is everything built before the first efficiency pass. Version 2 is everything from that pass up to Nov 11, 2026, ending with the build below.
From 2.0.0 on, every change gets a new number: fixes and tweaks bump the last number (2.0.1), new features the middle one (2.1.0).

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
