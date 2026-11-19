# Working on right now

Who is changing what, so DJ's and Drew's Claudes never work on the same page at once.
Rules: CLAUDE.md, "Before you start". Add your line and push it to main **before** writing code;
remove it in the same push that ships the work. A line older than 24 hours is abandoned and can be cleared.

| Who asked | Page or area | Files | Started (UTC) |
|---|---|---|---|
| DJ | Lock Screen widgets and Apple Watch app (iPhone build, waits for DJ) | ios/ (new Watch target, SlateLive widgets), src/app/040-live.js, docs/pages/notifications.md | 2026-11-19 17:07 |
| DJ | shared: ios/ | (same as above; Sign in with Apple from the Security thread rides in this build) | 2026-11-19 17:07 |
| DJ | Teams: Standings brackets (playoffs, tournaments) | src/app/132-standings.js, new src/app/133-brackets.js, docs/pages/teams.md | 2026-11-19 17:10 |
| DJ | News (injuries, trades and signings) | src/app/200-news.js, src/app/205-wire.js (new), docs/pages/news.md | 2026-11-19 17:12 |
| DJ | More sports: golf, F1, UFC as events on All games and the slate | new src/app/165-events.js, src/app/160-all-games.js, src/app/170-slate-page.js, new src/styles/095-events.css, docs/pages/events.md | 2026-11-19 17:15 |
| DJ | App-wide search (new) | src/app/236-search.js, docs/pages/search.md | 2026-11-19 17:15 |
| DJ | shared: 240-chrome.js, 270-wiring.js, 070-navigation.js | (one line each: the Search button on every page, Back closes it) | 2026-11-19 17:15 |
| DJ | Player page: follow a player, full game log, alerts for followed players | src/app/134-player.js, src/app/220-notifications.js, worker/alerts.js, src/body.html (Notifications section only), docs/pages/players.md | 2026-11-19 17:20 |
| DJ | shared: 260-persistence.js | (one line: followed players go to the alert settings) | 2026-11-19 17:20 |
