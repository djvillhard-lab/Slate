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

## Font (3.157.0)
DJ (Nov 26) asked for app-wide font choices. Settings > Look and text size > **Font**, between Look and Text size.
- Code: `src/app/233-fonts.js` (`FONTS`, `applyFont`, `drawFonts`), styles `src/styles/107-fonts.css`, files in `/fonts/`
  (latin subsets from Google Fonts, all SIL Open Font License). Saved as `state.font` with the settings doc (260/300),
  in `localStorage` `slate-font` for a fast first paint, and passed between Duo panes (`PN_SET_KEYS`).
- Works by setting `--font` on `<html>`; Archivo (embedded) is the default and removes the override. Simple mode uses
  `var(--font)`, so it follows.
- Choices: Archivo, Mona Sans, Roboto Flex, Saira, Noto Sans, Roboto Serif. **Rule: only variable fonts with a width
  (wdth) axis**, because DESIGN.md's type system leans on `font-stretch` (66% scores, 112-118% titles); a font without
  one draws scores full width and they overflow at L/XL. Noto Sans tops out at 100% and Mona Sans bottoms out at 75%;
  both were checked at XL.
- Each row in the list is drawn in its own font with a sample score; those files download only while the Look page
  is open. `sw.js` keeps a font once downloaded. `scripts/shots.py --font <key>` checks a page in a font.

## Open
- Notifications and Slate rules are still separate views rather than `setpg` blocks. They work the same to the eye. Slate rules has its own note: `docs/pages/rules.md` (3.136.0 layout).
