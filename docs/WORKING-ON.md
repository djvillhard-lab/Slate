# Working on right now

Who is changing what, so DJ's and Drew's Claudes never work on the same page at once.
Rules: CLAUDE.md, "Before you start". Add your line and push it to main **before** writing code;
remove it in the same push that ships the work. A line older than 24 hours is abandoned and can be cleared.

| Who asked | Page or area | Files | Started (UTC) |
|---|---|---|---|
| DJ | Slate: thumbs up/down learning (slate picks, Worth a look) | src/app/180-worth-a-look.js, new src/app/185-thumbs.js, src/app/230-settings.js (one entry), src/body.html (one Settings row), new src/styles/080-thumbs.css + one line in src/shell.html. No worker/ files. | 2026-11-16 19:47 |
| DJ | Team logos and colors (badges everywhere) | src/app/040-live.js (badgeFor), src/app/110-box-score.js (badgeColor), new src/app/045-team-logos.js, new src/styles/080-team-logos.css, sw.js, scripts/slates.py | 2026-11-16 19:58 |
| DJ | shared: shell.html (adds one style file line) | src/shell.html | 2026-11-16 19:58 |
| DJ | Morning slate email (new: Settings section, the email itself, sending from DJ's Gmail) | worker/morning-email.js (new), worker/index.js (two small hooks: the cron line and one route), src/app/235-morning-email.js (new), src/styles/080-morning-email.css (new), src/body.html (one Settings section), src/shell.html (one line), docs/pages/morning-email.md (new) | 2026-11-16 19:58 |
| DJ | Sign-up, log-in page and new user welcome (new) | src/boot/db-shim.js, new src/app/232-welcome.js, new src/styles/085-welcome.css, new worker/signup.js, worker/index.js (one hook line for the new routes), src/shell.html (one style line, added only after the logos thread's line lands), docs/pages/welcome.md (new) | 2026-11-16 20:05 |
| DJ | Send feedback (new: Settings entry and sheet, worker route, daily report) | src/app/225-feedback.js (new), worker/feedback.js (new), scripts/feedback.py (new), docs/pages/feedback.md (new); worker/index.js two lines only after the morning email ships | 2026-11-16 20:05 |
| DJ | Notifications: game preview line on live notifications and start alerts | worker/alerts.js, src/app/100-highlights.js (one small hook in the preview line), ios/SlateLive/SlateLiveActivity.swift, ios/Shared/SlateGameAttributes.swift, docs/pages/notifications.md | 2026-11-16 20:10 |
