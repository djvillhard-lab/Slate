# Settings

Files: `src/body.html` (`#view-settings`), `src/app/230-settings.js` (the pages, team search, the Slate and Look
controls), `src/styles/085-welcome.css` (bottom section). Other features keep their own rows: `232-welcome.js`
(Account and people), `235-morning-email.js`, `185-thumbs.js`, `225-feedback.js`.

## How it's laid out (3.61.0)
Settings is a main page of rows (`.set-acts`); each row opens a sub-page inside the same view.
- Main page, in order: Slate rules and Notifications (their own views, as before), Morning email, Slate and games,
  Look and text size, Account and people, Share the slate, About and updates, Send feedback (added by `225-feedback.js`).
  Each row's second line says what it's set to (`setPagesDraw`).
- A sub-page is a `<div class="setpg" data-pg="...">` in `body.html`; its row is a button with `data-open="..."`.
  Names are in `SET_PAGES`. `state.setPage` holds the open one ("" = main page). It resets to the main page whenever
  Settings is left.
- Back (button, swipe, the app's strip) returns to the main page first: `goBack` asks `setPageBack()`. The header shows
  the sub-page's name through `setTitle()` in `renderTop`.
- Sub-pages: **email** (everything from Morning email), **slate** (Scores, The Athletic newsletters, Worth a look,
  Thumbs up and down, Quick reads), **look** (Phone, Look, Text size, Open screen layout), **account** (`#acct-slot`,
  filled by `acctRows` in `232-welcome.js`), **about** (On your phone, Claude summaries, version, What's new, Reset).

## Adding a setting
Put it in the sub-page it belongs to, not on the main page. A new group of settings gets its own `setpg` block, a row
with `data-open`, a name in `SET_PAGES` and a summary line in `setPagesDraw`. All element ids stayed the same in the
move, so code that finds a control by id needs no change.

## Quick reads style (3.64.1)
DJ (Nov 16): paragraph vs bullet points is picked only in Settings > Slate and games > Quick reads (`#pvstyle-seg`,
saved as `state.pvStyle`). The small switch that sat on the quick read, the recap and Claude's take on team pages
(`styleSwitch`/`withSwitch` in 070-navigation.js) is gone; `readNode` still follows the saved choice everywhere.
Don't add a per-card switch back.

## Open
- Notifications and Slate rules are still separate views rather than `setpg` blocks. They work the same to the eye.
