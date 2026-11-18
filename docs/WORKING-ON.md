# Working on right now

Who is changing what, so DJ's and Drew's Claudes never work on the same page at once.
Rules: CLAUDE.md, "Before you start". Add your line and push it to main **before** writing code;
remove it in the same push that ships the work. A line older than 24 hours is abandoned and can be cleared.

| Who asked | Page or area | Files | Started (UTC) |
|---|---|---|---|
| DJ | Sign in with Google (log-in page, Settings → Account) | worker/google.js, worker/index.js (one route, passcode check), worker/signup.js, google.html, src/boot/db-shim.js, src/app/232-welcome.js, docs/pages/security.md | 2026-11-17 23:35 |
| DJ | Live feed: baseball | src/app/149-live-feed-baseball.js (new), src/app/145-live-feed.js, shared: src/styles/040-components.css (fd- feed rules only), docs/pages/live-feed.md | 2026-11-18 15:58 |
| DJ | Live notifications + new Tonight's slate widget (iPhone build, waits for DJ) | ios/SlateLive/, ios/Shared/, ios/Slate/WebModel.swift, src/app/040-live.js, worker/alerts.js, docs/pages/notifications.md | 2026-11-18 15:55 |
| DJ | shared: 280-ios-bridge.js, ios/ | (same as above) | 2026-11-18 15:55 |
