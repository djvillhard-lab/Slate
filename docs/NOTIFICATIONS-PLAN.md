# Slate notifications: where they are and where they're going

Nov 15, 2026 · DJ Villhard

Published readout with the mockups inline: https://claude.ai/artifact/EqCuZwu1LJHedBY6oUDMqx (private to DJ). This file is the copy future sessions build from. It was written against main at commit baf80d8 (Slate 3.29.0, TestFlight 3.29.0 (33)) and is a plan only: no app code, version or build changed with it. DJ answered all 11 decisions on Nov 15; they're at the end and override anything above that disagrees.

**Where we are.** Slate 3.29.0 sends alerts through Apple and Web Push, runs live notifications for single games (each on its game's Apple broadcast channel since 3.28.0) and a 4-game Board from a server job that runs every minute, and lets you, Drew and Dad each set your own alerts. Missing: Apple's urgency levels, tapping an alert to open its game, buttons on alerts, per-team and per-league control, and a lag of up to 10 minutes before a game you add is followed.

**Where we're going.** 13 alerts, each at an honest Apple urgency level, grouped by game, with Watch, Live score and Mute buttons. A sport-specific line on every live notification, using only stats ESPN actually sends. The Board takes over once three or more games are live. A Notifications page with Teams, Leagues and Recent alerts. Still free to run, and no alert ever calls Claude.

**Top 3 next steps.**

1. **Server-only quick wins**, no app build: urgency levels, grouping by game, the right game in the Dynamic Island, instant follow for added games, sport-specific lines.
2. **One app build through Xcode Cloud**, no Mac: tap opens the game, the three buttons, live-notification polish for Duo and StandBy.
3. **The new Notifications page**: Teams, Leagues and Recent alerts, right-thumb controls, same on Duo and iPhone.

## Part 1: Where notifications stand today

Slate 3.29.0 (TestFlight 3.29.0 (33)) already sends alerts through Apple and the web, runs live notifications for single games on per-game broadcast channels and a 4-game scoreboard, and lets each profile pick what it gets. The weak spots: no interruption levels, no tap-through to the game, no per-team or per-league control, and a 10-minute lag before a newly added slate game reaches the alert engine. Ratings come from reading the code on main (commit baf80d8, Slate 3.29.0); anything I could only infer is marked.

### Push notifications

| What | Rating | Evidence and notes |
| --- | --- | --- |
| Alerts through Apple (iPhone app) | Working | `worker/alerts.js` sendApns: title, body, default sound, 1-hour expiry, priority 10. Permission asked in `ios/Slate/WebModel.swift` (alert, sound, badge). |
| Web Push (Home Screen web app) | Working | `worker/alerts.js` sendPush (VAPID, encrypted); `sw.js` shows it; `index.html` subscribes through pushManager. |
| Banners while Slate is open | Working | `ios/Slate/SlateApp.swift` willPresent returns banner, list and sound. |
| Grouping in Notification Center | Partial | thread-id is the alert kind, so every Close finish stacks together rather than by game. A repeat of the same alert replaces the old one (collapse-id). |
| Tap opens that game | Missing | No notification-response handler in `ios/Slate/SlateApp.swift`; a tap opens Slate wherever it was. Web: `sw.js` just focuses the app. |
| Buttons on a notification | Missing | No notification categories or actions anywhere in `ios/`. |
| Interruption levels | Missing | No interruption-level in the payload; `ios/Slate.entitlements` holds only aps-environment, so Time Sensitive isn't available. Every alert is the default level. |
| App icon badge | Missing | Badge permission is asked for but never set. |

### Live notifications (Live Activities)

| What | Rating | Evidence and notes |
| --- | --- | --- |
| One game, Lock Screen scorebug | Working | `ios/SlateLive/SlateLiveActivity.swift`, `ios/Shared/SlateGameAttributes.swift`: chips, Archivo scores, red clock, football possession and down, the slate's one-liner. |
| Started by the server | Working | `worker/alerts.js` runLive pushes a start to the phone's push-to-start token, telling it to listen on the game's channel (3.28.0) (reported by `ios/Slate/LiveActivities.swift`). |
| Started and stopped by the app on a tap | Working | `LiveActivities.swift` fromPage (3.24.0): instant, before the server's next minute. |
| Updates | Working | Once a minute when the score, clock or down changes; priority 10 only on a score. Since 3.28.0 each game's update goes out once on its broadcast channel (bcSend); the scoreboard and any game without a channel still get per-phone pushes (runLive). Stale after 10 minutes. `ios/Slate-Info.plist` sets NSSupportsLiveActivitiesFrequentUpdates. |
| Ends after the final, stays up to 4 hours | Working | runLive end with a 4-hour dismissal. |
| Swiped away stays away | Working | `LiveActivities.swift` watches for dismissed and tells the server (3.27.0). |
| Before kickoff | Partial | A single game starts only once it's live; the scoreboard starts 15 minutes early. |
| StandBy | Partial | No StandBy-specific layout; iOS scales the Lock Screen view. Not checked on a device. |
| Apple Watch and CarPlay | Partial | No small layout of its own; iOS combines the two compact pieces. |
| Scoreboard, up to 4 games | Working | `ios/Shared/SlateBoardAttributes.swift`, `ios/SlateLive/SlateBoardActivity.swift` (2×2 grid), runBoard in `worker/alerts.js`. |
| How many at once | Working | Server caps single games at 4 (runLive) plus the scoreboard. |

### Dynamic Island

| What | Rating | Evidence and notes |
| --- | --- | --- |
| Compact, one live game | Working | Chips: a chip and score each side of the camera. Narrow islands get mini chips (3.25.3). |
| Minimal, island shared | Partial | Split ring; narrow islands show just "7–10". Its look beside other apps isn't confirmed from code. |
| Expanded, held open | Working | Scorebug around the camera, no buttons since 3.25.1. |
| iPhone Duo side island | Partial | Uses isDynamicIslandLimitedInWidth. How it looks on the unfolded inner display isn't confirmed from code. |

### In-app alerts

| What | Rating | Evidence and notes |
| --- | --- | --- |
| Badges inside the app | Missing | None. The Live and Board pills show counts, not unread alerts. |
| Toasts | Working | `index.html` toast(msg, undo): every switch and remove shows one, with Undo. |
| Banners in the app | Working | The new-build note (app-upd) and Apple's own banner for alerts while Slate is open. No in-app list of past alerts. |

### Settings

| What | Rating | Evidence and notes |
| --- | --- | --- |
| One Notifications page per profile | Working | `index.html` #view-notify, saved to prefs/notify under each profile's prefix (DJ "", others u/id/). |
| Event by source matrix | Working | Game starting (with a lead time), Close finish, Overtime, Final, Goals and Hourly score, each ticked for My slate and/or My teams; Upset watch; Live score; Morning brief. |
| Per team | Missing | My teams is all or nothing. |
| Per game | Working | The game's panel: Live notification and Game alerts switches; the gray bell on the card turns both off (liveAct.games, alerts.games). |
| Per league | Partial | Only through slate rules and Worth a look leagues, not notification settings. |
| Quiet hours and days | Working | Hold back alerts and new live notifications, in the phone's own time zone. |

### Delivery

| What | Rating | Evidence and notes |
| --- | --- | --- |
| Minute job | Working | `wrangler.jsonc` cron every minute → `worker/index.js` scheduled → runAlerts: fetches ESPN scoreboards for the games anyone follows, sends due alerts, updates live notifications. |
| Legacy alert script | Stubbed | `scripts/alerts.py` is still in the repo but nothing calls it (`scripts/tick.py` says the worker sends alerts). `sw.js` still says "10-minute job". |
| Tokens | Working | /api/live-token (`worker/index.js`) stores start, game and scoreboard tokens in prefs/liveacts; device tokens live in prefs/push. The app resends them whenever it comes forward (3.25.4). Game live notifications on a channel need no token of their own; the game-to-channel record lives in bc/channels, and the changelog says Broadcast Capability is on for the app. |
| Who follows what | Partial | alertsets/D, rebuilt by `scripts/tick.py` every 10 minutes (GitHub Actions, started by the worker). A game added to the slate can take up to about 10 minutes to reach the minute job; the panel switches and the app's own start skip that wait. |
| Supabase notification tables or functions | Missing | Everything lives in the one docs table (path, data) through the mirror\_doc call. No notification tables, triggers or Supabase functions in the repo; I can't see the Supabase dashboard to confirm nothing runs there. |

**Web app vs iPhone app.** The Home Screen web app gets the same alerts through Web Push, quiet hours and settings. Live notifications, the Dynamic Island, the scoreboard, the per-game switches and the gray bell are iPhone-app only (`liveCtl` and `boardCtl` in `index.html` check for the app).

## Part 2a: Notification catalog

The target is 13 events, each with one Apple interruption level. By your decision, none is Time Sensitive, so nothing breaks through Focus: Active for alerts worth lighting the screen, Passive for things to read later ([Managing notifications](https://developer.apple.com/design/human-interface-guidelines/managing-notifications)). Every text is built from ESPN data and Slate's own free one-liners; no notification ever calls Claude. A new account starts with every alert off; the Default column is what a future first-run setup would suggest (decision 8).

How the levels behave, per Apple: Passive goes to the list without lighting the screen; Active lights the screen and can play a sound; Time Sensitive also breaks through Focus and scheduled summaries; Critical also overrides the silent switch and needs a special entitlement, so Slate never uses it ([UNNotificationInterruptionLevel](https://developer.apple.com/documentation/usernotifications/unnotificationinterruptionlevel), [Managing notifications](https://developer.apple.com/design/human-interface-guidelines/managing-notifications)). iOS asks people the first time a Time Sensitive alert arrives and keeps checking that they still want them, so overusing it gets it switched off.

| Event | Trigger | Who gets it by default | Default | Level | Example |
| --- | --- | --- | --- | --- | --- |
| Morning brief | Each profile's chosen hour (9 AM) | My slate, My teams, top national games | On | Passive | Sat 11/15: 6 games · 11 AM Davidson @ Dayton · 1:30 PM Boston College @ No. 5 Notre Dame |
| Game starting | Start time, or 10 or 30 minutes before | My slate, My teams | On | Active | Starting now: Boston College @ No. 5 Notre Dame on NBC |
| Live notification starts | The game goes live (target: 10 minutes before) | My slate | On | Comes with the live notification (Apple requires an alert on a server start) | BC @ ND · Live now: BC 0, ND 0 |
| Score change | Every score | My teams, hockey and soccer only | Off | Active, or none when a live notification is showing (it updates in place) | Goal! Man United 2, Everton 1 · 67' |
| Close finish | A one-score game in its last minutes | My slate, My teams | On | Active; rides on the live notification when one is showing | Close finish: Pistons 110, Knicks 112 · 4th 2:31 |
| Overtime | Overtime or extra time starts | My slate, My teams | On | Active; rides on the live notification when one is showing | Overtime: Texas 31, Georgia 31 |
| Upset watch | A ranked college team trails late | Every ranked game, opt-in | Off | Active | Upset watch: No. 5 Notre Dame trails Boston College 24-17 · 4th 5:00 |
| Big game starting (new) | Both teams ranked, or a national-TV game Slate ranks highly | Opt-in | Off | Active | Starting now: No. 3 Texas @ No. 7 Georgia on ABC |
| Final | The game ends | My teams (on), My slate (off) | On | Active; Passive when a live notification already shows the final | Final: No. 5 Notre Dame 34, Boston College 10 |
| Game winner (new) | A go-ahead score in the last moments decided it | My teams | Off | Active | Texas won it on Manning's 4-yd TD pass to Brown with 0:02 left |
| Hourly score | Once an hour while live | My teams | Off | Passive | Pistons 88, Knicks 90 · 3rd 8:12 |
| Delayed or postponed (new) | ESPN marks the game delayed or postponed | My slate, My teams | On | Active | Rain delay: Cubs @ Cardinals, top 6th |
| New app build | TestFlight has a newer build | You | On | In-app note only, never a push | New app version 3.0 (29) is ready |

Four rules sit on top of the table:

- **One notification per moment.** Apple warns against sending several notifications for the same thing ([Notifications](https://developer.apple.com/design/human-interface-guidelines/notifications)). While a game's live notification is showing, scores update it silently with no separate alert, and Close finish and Overtime ride on it as an alert: the screen lights and the expanded Dynamic Island opens, with no separate banner. That update reaches everyone following the game on its channel, by design: having the live notification on means you want that game's big moments (decision 11; [ActivityKit push notifications](https://developer.apple.com/documentation/activitykit/starting-and-updating-live-activities-with-activitykit-push-notifications)).
- **Grouped by game.** thread-id becomes the game, so a game's starting, close-finish and final alerts stack together in Notification Center.
- **Tap goes to the game.** Every alert carries the game's id; tapping opens its matchup, the same way the live notification does.
- **Same catalog for everyone.** DJ, Drew and Dad each start from these defaults and change their own in Settings.

### Banners, Notification Center and buttons

- **Banners stay iOS's.** Slate controls only the words: short title-case titles, no app name, full sentences in the body ([Notifications HIG](https://developer.apple.com/design/human-interface-guidelines/notifications)). With previews hidden, the body reads "Game update".
- **Three buttons on touch and hold**, on Game starting, Close finish, Overtime, Upset watch and Big game starting. Apple allows up to four and says not to add one that only opens the app ([Notifications HIG](https://developer.apple.com/design/human-interface-guidelines/notifications)).
  - **Watch on YouTube TV** is labeled with the channel ("Watch on NBC") and opens YouTube TV through tv.youtube.com/live, the link Slate's watch buttons use today. For a game YouTube TV doesn't carry, it names and opens that app instead ("Watch on Prime Video"), per decision 5.
  - **Live score** turns on that game's live notification.
  - **Mute this game** stops that game's alerts, the same as the gray bell.
- **Web app.** Same words and the same tap-through to the game. I can't confirm from Apple or WebKit that buttons show on iOS web notifications, so the web gets none.

> Mockup in the published readout: Lock Screen alerts grouped by game, and a held Starting now alert with Watch on NBC, Live score and Mute this game

### Inside the app

- **Toasts** stay as they are.
- **While Slate is open**, Apple suggests showing news quietly instead of a full banner ([Notifications HIG](https://developer.apple.com/design/human-interface-guidelines/notifications)). Target: a Slate toast for other games, nothing for the game on screen. Today `ios/Slate/SlateApp.swift` shows the full iOS banner.
- **Recent alerts**, a list of the last 24 hours, lives on the Notifications page (Part 2c).
- **No app icon badge.** Apple says badges are only for unread notifications and not for game scores. Slate asks for badge permission but never uses it, so the plan drops the request.

## Part 2b: Live notifications and the Dynamic Island, by sport

The scorebug you picked stays the base everywhere: two team chips with the second-color stripe, big Archivo scores, the red clock, one line underneath. What changes by sport is that line and one small marker. Every field below comes from ESPN's free scoreboard, the same request the worker already makes once a minute. I checked them against today's live NFL, NBA and college basketball feeds and last week's Premier League results.

Slate's own soccer xG stays out because it's Slate's estimate. ESPN's win probability goes in, labeled as ESPN's ("ESPN win prob: KC 91%"), for football and basketball, from the same scoreboard request (decision 10).

### What each sport shows

| Sport | Line under the score | Marker | ESPN field | Read today? |
| --- | --- | --- | --- | --- |
| NFL, college football | KC ball · 3rd & 18 at KC 19 | Ball on the side with it; red-zone tint; three timeout ticks per team | situation: downDistanceText, possession, isRedZone, homeTimeouts, awayTimeouts | Down and possession yes; red zone and timeouts no |
| NBA, college basketball | Cunningham 31 · Brunson 28 (each side's top scorer) | None | Each team's points leader | One top scorer yes; both sides no |
| NHL | Matthews 2 G · Hughes 2 A (each side's points leader) | None yet | Each team's goals, assists and points leaders | No |
| Soccer | Gómez 15' (last goal) | Red card square on that team's chip | details: goals with scorer and minute, red cards | No |
| MLB | R H E: 4 7 0 · 3 6 1 | Inning half arrow | Each team's hits and errors; status shows the inning | No |
| College, any sport | Same as the pro sport | Rank before the abbreviation | Rank on the game | Yes |

Two I can't confirm yet. Hockey power play: no NHL game was live while I checked, and the scoreboard I pulled had no power-play field (the page gets it from play-by-play after a goal). Baseball bases, outs and count: the season is over, so there's no live game to check. Both get a reserved spot in the design and get built only after a live check.

> Mockup in the published readout: Lock Screen live notification for each sport (NFL, college football, NBA, college basketball, NHL, soccer, MLB) with real ESPN scores and ESPN win probability on football and basketball

### The four presentations

- **Lock Screen.** 84 to 160 points tall on a regular iPhone; past 160, iOS may cut it off. Apple's standard margin is 14 points ([Live Activities HIG](https://developer.apple.com/design/human-interface-guidelines/live-activities), [Displaying live data](https://developer.apple.com/documentation/activitykit/displaying-live-data-with-live-activities)). The line wraps to two lines rather than cutting off (fixed after your Duo screenshot), so the tallest version is still under 160.
- **Compact.** Chip and score on each side, snug against the camera. Apple's own example for this spot is two team logos and the score. Each side is 52.33 points wide on a 393-point iPhone.
- **Minimal.** The split ring with both scores. Apple asks for live information here rather than a logo, which the ring does.
- **Expanded.** The scorebug around the camera, 84 to 160 points tall. It also pops open by itself on a Close finish or Overtime alert, which rides on the live notification (decision 11).

Two small upgrades from Apple's guidance: scores should roll with a number transition when they change, and a live notification that hasn't heard from the server in 10 minutes should say so ("Updated 3:14") instead of looking current. Neither is in `ios/SlateLive/SlateLiveActivity.swift` today.

> Mockup in the published readout: Dynamic Island on a regular iPhone: compact, minimal beside another app, expanded, expanded on a Close finish alert, and the 28-point limited-width view

### Several live games

Apple's advice is to track several events with one Live Activity rather than many ([Live Activities HIG](https://developer.apple.com/design/human-interface-guidelines/live-activities)). So the Board becomes the default once three or more of your games are live; one or two games run as their own scorebugs.

Which one sits in the Dynamic Island is set by relevance-score: the highest score wins ([ActivityKit push notifications](https://developer.apple.com/documentation/activitykit/starting-and-updating-live-activities-with-activitykit-push-notifications)). Slate would give 100 to the game that just scored or is in a close finish and 50 to the rest. Slate sends no relevance-score today, so iOS shows the first one started. On a broadcast channel the score is the same for everyone following that game, which suits game-level moments like a score or a close finish but can't reflect one person's favorites.

Apple doesn't publish a fixed limit on how many can run; it says the number depends on several factors and starting one can fail. Slate keeps its cap of 4 plus the Board and handles a failed start quietly.

> Mockup in the published readout: iPhone Lock Screen with the 4-game Board and the top-relevance game in the Dynamic Island

### iPhone Duo, folded and unfolded

What Apple says:

- The Dynamic Island runs vertically along the side of both the outer and inner displays and expands there for Live Activities and alerts ([Apple Newsroom](https://www.apple.com/newsroom/2026/09/apple-unveils-iphone-duo/)).
- On the outer display, the camera region is always present and expands into the Dynamic Island for Live Activities; the island, status bar, toolbar and tab bar sit on the trailing edge ([Designing for iPhone Duo](https://developer.apple.com/design/human-interface-guidelines/designing-for-iphone-duo)). For you that's the right edge, under your right thumb.
- On iPhone Duo, compact and minimal views run at limited width: fit inside a 28-point circle, or show the leading view only and leave the trailing one empty ([Displaying live data](https://developer.apple.com/documentation/activitykit/displaying-live-data-with-live-activities)).
- StandBy works on either display ([Apple Newsroom](https://www.apple.com/newsroom/2026/09/apple-unveils-iphone-duo/)).

What Apple doesn't say: the expanded and Lock Screen sizes on Duo, and how a Live Activity moves while the phone folds. Apple publishes Duo screenshot sizes (outer 1398 × 2034, inner 2007 × 2853 pixels) but no point sizes ([Screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications)). The mockups use those pixel proportions and are labeled as approximate. The real check is a TestFlight build on your Duo, folded and unfolded.

The Duo design: leading view only at limited width (the split ring with both scores), trailing view empty so iOS hides it. Nothing to press inside the live notification; a tap anywhere opens the game, which works one-handed on either display.

> Mockup in the published readout: Regular iPhone Lock Screen above a folded iPhone Duo Lock Screen, drawn to the same scale, each with the same live notification

> Mockup in the published readout: Unfolded iPhone Duo inner display with the Board and the side Dynamic Island

### StandBy

In StandBy the minimal view sits at the top, and a tap shows the Lock Screen view scaled up 2× to fill the screen. Apple suggests a custom layout for the extra space and checking it under Night Mode's red tint ([Live Activities HIG](https://developer.apple.com/design/human-interface-guidelines/live-activities)). Slate's target: the same scorebug, plus both teams' leaders from the table above, using iOS's isActivityFullscreen signal ([Displaying live data](https://developer.apple.com/documentation/activitykit/displaying-live-data-with-live-activities)).

> Mockup in the published readout: StandBy in landscape with the live notification scaled up to fill the screen

### After the final

Apple's guidance is 15 to 30 minutes on the Lock Screen after the end, with 4 hours the most iOS allows ([Live Activities HIG](https://developer.apple.com/design/human-interface-guidelines/live-activities)). Slate keeps finals for the full 4 hours today; the target is 1 hour (decision 2).

## Part 2c: Notification settings, per profile

Each profile (you, Drew, Dad) gets the same page in the same order, saved under its own prefix as today. A new account starts with everything off until the person turns it on; a first-run setup flow comes later (decision 8). Apple requires an in-app place to change notification choices, and the page links to Slate's page in iOS Settings for the system switches ([Managing notifications](https://developer.apple.com/design/human-interface-guidelines/managing-notifications)).

The page, top to bottom:

1. **This phone.** Alerts allowed, Live notifications allowed, Frequent updates allowed, each with a fix-it link when off. Apple says to detect when someone turns off frequent updates and ask them to turn it back on ([ActivityKit push notifications](https://developer.apple.com/documentation/activitykit/starting-and-updating-live-activities-with-activitykit-push-notifications)).
2. **Alerts.** The catalog's events as rows, each with one switch and, under it, the level in plain words: "Lights the screen" for Active, "Silent, in the list" for Passive.
3. **Teams.** Every team in My teams with a three-way control: All, Big moments, Off. Big moments means Game starting, Close finish, Overtime and Final. Each team also gets a Live notification switch for its games.
4. **Leagues.** The same three-way control per league, for slate games you don't follow by team. Upset watch sits under the college leagues.
5. **Live notifications.** Start for: My slate, My teams. Set by your decisions rather than switches: they start 10 minutes before kickoff, the Board takes over once 3 or more games are live, and a final stays 1 hour.
6. **Recent alerts.** The last 24 hours of what was sent, newest first, each tapping through to its game.

When settings disagree, the most specific wins: the game's own switches, then the team, then the league, then the event row. There are no quiet hours or day limits: the When section is removed (decision 9).

Design rules this page follows:

- **Right thumb.** Every switch and three-way control sits on the right edge, the iOS default, so the column you tap stays under your thumb on both phones.
- **Duo matches iPhone.** The Notifications entry sits in the same place in the Duo strip menu and the regular menu, and the page shows the same sections in the same order on both.
- **Slate's look.** The current dark navy cards, sharp 4-point team chips and Slate red only for live state; no new colors.
- **Accessibility.** 44-point tap targets, labels that read as full sentences to VoiceOver ("Notre Dame, Big moments"), and the level text never relies on color alone.

The trade-off: a per-team and per-league control is more to scan than today's two-column grid. Keeping Teams and Leagues collapsed to a one-line summary ("6 teams: 4 All, 2 Big moments") until tapped keeps the first screen as short as today's.

> Mockup in the published readout: Notifications settings page on a regular iPhone and on a folded iPhone Duo, with right-edge controls for Alerts, Teams and Leagues

## Part 2d: Delivery, from ESPN to your phone

Today's path:

1. **Every 10 minutes**, `scripts/tick.py` on GitHub Actions rebuilds alertsets: who follows which games today. The worker starts it.
2. **Every minute**, the Cloudflare cron runs runAlerts: it reads alertsets and each profile's settings, fetches ESPN's scoreboards for those games, and sends alerts and live-notification updates.
3. **Apple or the web push service** delivers them. Live-notification updates go out at priority 10 on a score and 5 otherwise; since 3.28.0 each game's update is sent once to its broadcast channel instead of once per phone.

### Is the 10-minute job fast enough?

For scores, the 10-minute job isn't the bottleneck: live scores already run on the 1-minute cron, so a score reaches your Lock Screen up to about a minute after ESPN has it.

The 10-minute job does slow two things. A game you add to your slate can wait up to 10 minutes before its alerts follow it. And a new day's games can wait up to 10 minutes to be known at all. The per-game switches and the app's own start already skip that wait.

### Apple's limits that shape speed

- **Update budget.** Apple allows a budget of priority-10 Live Activity pushes per hour but doesn't publish the number. Priority 5 doesn't count against it, and Apple suggests a mix ([ActivityKit push notifications](https://developer.apple.com/documentation/activitykit/starting-and-updating-live-activities-with-activitykit-push-notifications)). Slate already sends 10 only for scores.
- **Frequent updates.** NSSupportsLiveActivitiesFrequentUpdates raises the budget for apps like sports; Slate has it on. People can turn it off in iOS Settings, so the app should read frequentPushesEnabled and tell the server.
- **Size and time.** 4 KB for everything a Live Activity carries; 8 hours live, then up to 4 more on the Lock Screen ([Displaying live data](https://developer.apple.com/documentation/activitykit/displaying-live-data-with-live-activities)).
- **Starting early.** Push-to-start has worked since iOS 17.2, needs an alert in the start payload, and can't be done by broadcast ([ActivityKit push notifications](https://developer.apple.com/documentation/activitykit/starting-and-updating-live-activities-with-activitykit-push-notifications)). Nothing stops a start 10 minutes before kickoff.

### Faster, cheapest first

| Option | What it fixes | Cost | Effort |
| --- | --- | --- | --- |
| Patch alertsets the moment a slate or team changes | The 10-minute wait for added games | Free: one more worker call | Small |
| 20-second updates during live games, using a Durable Object alarm | Scores land in about 20 seconds instead of 60 | Free plan allows 100,000 Durable Object requests a day; alarms count. A 20-second loop for 8 hours is 1,440 | Medium |
| Broadcast channels: one push per game for everyone following it | Fewer pushes as users grow | Free; turned on at developer.apple.com, no Mac. iOS 18 and later | Done in 3.28.0 |
| Workers Paid | More CPU per run if the minute job outgrows the free limit | $5 a month minimum | None |

Sources for the table: [Cloudflare Workers limits](https://developers.cloudflare.com/workers/platform/limits/), [Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/), [Setting up broadcast push notifications](https://developer.apple.com/documentation/usernotifications/setting-up-broadcast-push-notifications).

One thing I can't confirm from the repo: which Cloudflare plan your account is on. On Workers Free, each cron run gets 10 ms of CPU (waiting on ESPN doesn't count). If the minute job ever starts failing on busy Saturdays, that limit is the first suspect.

### What it costs today

Nothing beyond what you already pay Apple. Cloudflare Workers Free allows 100,000 requests a day, and the minute cron uses 1,440. GitHub Actions is free on public repos, and Slate's repo is public ([GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions)). Supabase Free covers 500 MB and 5 GB of egress, and only pauses a project after a week with no activity, which Slate's minute job prevents ([Supabase pricing](https://supabase.com/pricing)).

No notification path calls Claude. `worker/alerts.js` has no Anthropic call; the only one in the worker (askClaude in `worker/index.js`) runs on request, never from the cron's alert job. The plan keeps it that way: every alert text is built from ESPN data and Slate's own free one-liners.

## Part 3: Gaps and the plan

Effort: S is about one session, M is two or three. Every step is built by Claude; app steps ship through Xcode Cloud to TestFlight, server and page steps deploy to Cloudflare with no app build.

### Phase 1: server and page only, no app build

| Step | Closes | Effort | Needs a Mac? |
| --- | --- | --- | --- |
| Interruption levels (Passive, Active) and per-game grouping in `worker/alerts.js` | No levels; grouping by kind | S | No |
| relevance-score on live updates; start live notifications 10 minutes before kickoff | Island shows the first one started; starts late | S | No |
| Update who-follows-what the moment a slate or team changes | 10-minute wait for added games | S | No |
| Per-sport lines through the existing text line (both top scorers, NHL leaders, soccer last goal) | Same line for every sport | S | No |
| Web push tap opens the game (`sw.js`) | Tap opens Slate wherever it was | S | No |
| Remove `scripts/alerts.py`; fix "10-minute job" in `sw.js` | Leftovers | S | No |
| Finals stay 1 hour; Board starts by itself at 3+ live games; Close finish and Overtime ride on the live notification; ESPN win probability in the live line | Decisions 2, 4, 10 and 11 | S | No |

The per-sport lines ride the text field the app already shows, so current builds display them with no update.

### Phase 2: one app build

| Step | Closes | Effort | Needs a Mac? |
| --- | --- | --- | --- |
| Tap opens the game; Watch (channel or app), Live score and Mute this game buttons | No tap-through, no buttons | M | No |
| Report alert, live-notification and frequent-update permission to the page | "This phone" can't tell what's off | S | No |
| Live notification polish: stale label, score roll, red-zone tint, timeout ticks, red-card mark, H and E columns, leading-only view at limited width, StandBy layout | Partial Duo and StandBy; missing sport markers | M | No; checking it needs your phones |
| Quiet in-app banner while Slate is open | Full iOS banner over the app | S | No |

New live-notification fields stay optional so older builds keep working while TestFlight catches up.

### Phase 3: settings, page only

| Step | Closes | Effort | Needs a Mac? |
| --- | --- | --- | --- |
| Teams and Leagues with All, Big, Off; Alerts rows with plain-word levels; remove quiet hours and days; everything off for new accounts | All-or-nothing My teams; no league control | M | No |
| Recent alerts list | No history in the app | S | No |

### Phase 4: speed (decided: 20-second updates)

| Step | Closes | Effort | Needs a Mac? |
| --- | --- | --- | --- |
| 20-second updates during live games with a Durable Object alarm | 60-second scores | M | No |

### Phase 5: checks on real devices and live games

- **Your Duo, folded and unfolded, plus StandBy, Night Mode and Always-On**, on a TestFlight build. You look; I adjust.
- **Hockey power play** during an NHL game and **baseball bases, outs and count** on Opening Day: I read ESPN's live feed during a game before building either.

Nothing here needs a Mac. A Mac would only add iOS Simulator push tests, which Apple limits to Apple-silicon or T2 Macs ([ActivityKit push notifications](https://developer.apple.com/documentation/activitykit/starting-and-updating-live-activities-with-activitykit-push-notifications)), and Xcode's previews of Duo poses ([Designing for iPhone Duo](https://developer.apple.com/design/human-interface-guidelines/designing-for-iphone-duo)). TestFlight on your Duo covers both, and `.github/workflows/ios.yml` already builds simulator screenshots for free.

## Decisions (answered Nov 15)

Your answers. Where anything above disagrees, these win.

1. **Time Sensitive:** none. Every alert is Active or Passive, so nothing breaks through Focus, and no Time Sensitive entitlement is needed.
2. **Finals** stay on the Lock Screen for 1 hour.
3. **Live notifications start** 10 minutes before kickoff.
4. **The Board starts by itself** once 3 or more of your games are live.
5. **Buttons on regular alerts:** Watch (the game's channel in YouTube TV, or the streaming app for a game YouTube TV doesn't carry), Live score and Mute this game. Live notifications get no buttons. Tapping any alert or live notification opens the matchup in Slate.
6. **App icon badge:** dropped, and Slate stops asking for badge permission.
7. **Score speed:** build the free 20-second updates during live games.
8. **Defaults:** nothing is on for a new account; every alert and live notification has to be turned on. A first-run setup flow comes later. Existing profiles keep what they've set.
9. **Quiet hours and Days:** removed from Slate entirely.
10. **ESPN win probability:** shown, labeled as ESPN's, for football and basketball.
11. **Close finish and Overtime** ride on the live notification when it's showing, for everyone following that game. Having the live notification on counts as wanting that game's big moments.

## Sources

Apple:

- [Starting and updating Live Activities with ActivityKit push notifications](https://developer.apple.com/documentation/activitykit/starting-and-updating-live-activities-with-activitykit-push-notifications)
- [Displaying live data with Live Activities](https://developer.apple.com/documentation/activitykit/displaying-live-data-with-live-activities)
- [Human Interface Guidelines: Live Activities](https://developer.apple.com/design/human-interface-guidelines/live-activities)
- [Human Interface Guidelines: Notifications](https://developer.apple.com/design/human-interface-guidelines/notifications)
- [Human Interface Guidelines: Managing notifications](https://developer.apple.com/design/human-interface-guidelines/managing-notifications)
- [Human Interface Guidelines: Designing for iPhone Duo](https://developer.apple.com/design/human-interface-guidelines/designing-for-iphone-duo)
- [UNNotificationInterruptionLevel](https://developer.apple.com/documentation/usernotifications/unnotificationinterruptionlevel)
- [Generating a remote notification](https://developer.apple.com/documentation/usernotifications/generating-a-remote-notification)
- [Setting up broadcast push notifications](https://developer.apple.com/documentation/usernotifications/setting-up-broadcast-push-notifications)
- [Screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications)
- [Apple unveils iPhone Duo (Newsroom)](https://www.apple.com/newsroom/2026/09/apple-unveils-iphone-duo/)
- [WebKit: Web Push for Web Apps on iOS and iPadOS](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)

Services:

- [Cloudflare Workers limits](https://developers.cloudflare.com/workers/platform/limits/)
- [Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions)
- [Supabase pricing](https://supabase.com/pricing)

Slate code, on main at commit baf80d8 (3.29.0): `worker/alerts.js`, `worker/index.js`, `wrangler.jsonc`, `sw.js`, `index.html`, `scripts/tick.py`, `ios/Slate/SlateApp.swift`, `ios/Slate/WebModel.swift`, `ios/Slate/LiveActivities.swift`, `ios/SlateLive/SlateLiveActivity.swift`, `ios/SlateLive/SlateBoardActivity.swift`, `ios/Shared/SlateGameAttributes.swift`, `ios/Shared/SlateBoardAttributes.swift`, `ios/Slate.entitlements`, `ios/Slate-Info.plist`.

Live data in the mockups: ESPN's public scoreboard, pulled Nov 15, 2026 (NFL, NBA, college football and basketball live; NHL Nov 14; Premier League Nov 8; MLB's last game).
