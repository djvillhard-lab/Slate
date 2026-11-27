# Settings

Files: `src/body.html` (`#view-settings`), `src/app/230-settings.js` (the pages, team search, the Slate and Look
controls), `src/styles/085-welcome.css` (bottom section). Other features keep their own rows: `232-welcome.js`
(Account and people), `235-morning-email.js`, `185-thumbs.js`, `225-feedback.js`.

## How it's laid out (3.175.0, "Five doors")
DJ (Nov 27) said Settings was "still too confusing" and picked option A of three mockups
(`/mnt/project-files/settings-menu/option-a|b|c.png` in DJ's project). The main page is five rows (`.set-acts`), each
opening a sub-page inside the same view, and each row's second line says what it's set to (`setPagesDraw`):
- **My slate** (`slate`): Slate rules row (`#open-rules`, still its own view), Worth a look, The Athletic newsletters,
  Thumbs (hidden while Suggested for you is off), then "While you watch": Show scores, Quick reads (choice under the words).
- **Alerts and email**: the Notifications view (`#view-notify`, title in `240-chrome.js`). Morning brief, then the
  Morning email block (`#me-set`, moved here from its own sub-page; `235-morning-email.js` is unchanged, and
  `220-notifications.js` calls `meLoad()` when the view opens). Game alerts, Players you follow, Live scores on the
  Lock Screen and Quiet hours fold (`[data-fold]`, `ntFolds()`), each with a summary line; they close when you leave.
  The row's line is `alertsSummary()` (alerts plus "email 7 AM" when on).
- **Look and text** (`look`): Look, Font, Text size, Simple mode (`#sm-slot`, filled by `287-simple.js`), then Phone,
  Navigation (added by `283-three-pages.js` after Phone) and Open screen layout at the bottom.
- **Account** (`account`, `acctRows` in `232-welcome.js`): This phone, Welcome, then **Admin** (only `isAdmin()`):
  Try the new user setup, Invite someone, People.
- **Help and about** (`about`): Send feedback (row added by `225-feedback.js` into `#help-acts`), Share the slate,
  version, What's new, Reset, On your phone (web only), Claude cost (admin).
- `state.setPage` holds the open sub-page ("" = main page), reset when Settings is left. Back returns to the main page
  first (`setPageBack()`). Names are in `SET_PAGES`. Layout fixes for the rows live in `styles/111-settings.css`.
- Still open: the morning email's own text (worker/morning-email.js) says "Settings > Morning email"; it should say
  "Settings > Alerts and email" (that file belonged to the Morning email thread on Nov 27).

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
DJ (Nov 26) asked for app-wide font choices. Settings > Look and text > **Font**, between Look and Text size.
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
