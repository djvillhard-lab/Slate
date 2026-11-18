# Working on right now

Who is changing what, so DJ's and Drew's Claudes never work on the same page at once.
Rules: CLAUDE.md, "Before you start". Add your line and push it to main **before** writing code;
remove it in the same push that ships the work. A line older than 24 hours is abandoned and can be cleared.

| Who asked | Page or area | Files | Started (UTC) |
|---|---|---|---|
| DJ | Sign in with Google (log-in page, Settings → Account) | worker/google.js, worker/index.js (one route, passcode check), worker/signup.js, google.html, src/boot/db-shim.js, src/app/232-welcome.js, docs/pages/security.md | 2026-11-17 23:35 |
| DJ | Live feed: swipe between games from anywhere on the page | shared: src/app/280-ios-bridge.js (the swipe's touchstart only), src/app/145-live-feed.js, docs/pages/live-feed.md | 2026-11-18 00:25 |
| DJ | All games: still freezing, draw cards in small batches and keep unchanged ones | src/app/160-all-games.js, docs/pages/all-games.md | 2026-11-18 00:20 |
