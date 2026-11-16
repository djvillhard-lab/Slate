# Working on right now

Who is changing what, so DJ's and Drew's Claudes never work on the same page at once.
Rules: CLAUDE.md, "Before you start". Add your line and push it to main **before** writing code;
remove it in the same push that ships the work. A line older than 24 hours is abandoned and can be cleared.

| Who asked | Page or area | Files | Started (UTC) |
|---|---|---|---|
| DJ | Settings: main page with sub-pages, new user preview, People list | src/body.html (Settings section), src/app/230-settings.js, src/app/232-welcome.js, src/boot/db-shim.js, src/app/235-morning-email.js and src/app/225-feedback.js (only where their Settings rows sit), worker/signup.js, new src/styles/085-settings-pages.css | 2026-11-16 20:56 |
| DJ | shared: shell.html (one style line), 070-navigation.js and 240-chrome.js (Back and the title for Settings sub-pages) | src/shell.html, src/app/070-navigation.js, src/app/240-chrome.js | 2026-11-16 20:56 |
| DJ | Morning email: logos, preview lines, Claude recaps of your teams' games, app look | worker/morning-email.js, worker/index.js (recap start only), src/app/235-morning-email.js (the save call only, not the Settings rows), docs/pages/morning-email.md | 2026-11-16 21:05 |
| DJ | Soccer live one-liners: own goals and unnamed scorers | src/app/100-highlights.js (soccer part), src/app/040-live.js (liveLeadLine only) | 2026-11-16 21:00 |
