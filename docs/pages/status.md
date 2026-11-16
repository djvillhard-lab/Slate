# Project status (DJ's live dashboard)
Last updated: Nov 16, 2026 (no app version: it is not part of the app)

## Done
- `status.html` at the site root: https://slate.djvillhard.workers.dev/status.html. DJ asked for a live dashboard he can
  open on his PC or phone, **separate from the app**: it is its own page, not a view, not in any menu, and it loads none
  of the app's code. Don't link it from the app.
- For DJ only: it asks for a passcode unless this browser already has one from Slate (`slate-pass`), and keeps what's
  typed in `slate-status-pass`. Feedback comes from the existing admin-only `/api/feedback/inbox` and `/shot`
  (`worker/feedback.js`), so a non-admin passcode is refused by the server. It never marks feedback reported.
- Everything else is read from files the site already serves: `CHANGELOG.md` (versions, today's releases, the newest
  TestFlight build), `docs/WORKING-ON.md` (working now), `docs/pages/*.md` (open items per page, the `## Open` bullets),
  `docs/status-waiting.json` (the short "Waiting on you" list). Release times come from GitHub's public commit list.
- People (3.65.0): per person, last active, minutes and opens today, Claude summaries today, most-shown pages over 7
  days and a 7-day minutes chart. The app counts it in `src/app/296-usage.js` (opens, seconds visible, times each
  `state.view` was shown; polled, so it touches no shared file) and posts to `/api/usage` every two minutes and when it
  goes to the background. `worker/usage.js` keeps 30 days per person in `stats/use/<id>`, encrypted like feedback
  (the docs table is public-readable); `/api/usage/all` is admin only. No passcode, no count.
- People, app or browser (3.65.6): the worker trusts the app's user agent (`SlateApp/<version>`, every build) over what the
  page says, and stores the build (`doc.app`, shown beside "iPhone app"). Test and screenshot runs are not counted
  (`navigator.webdriver` in the page, headless user agents in the worker): shots.py signs in with Drew's profile, and
  before this fix those runs made Drew show as "Browser" and added to his numbers for Nov 16.
- Feedback shows Open first, with Addressed and All beside it; the tile counts what's open. Tap an item for its
  screenshot, phone and the "Mark addressed" / "Open it again" switch (see docs/pages/feedback.md for the automatic part).
- Cards (DJ, Nov 16): every section is a card. Drag the grip (or focus it and use the arrow keys) to move it, the
  arrow folds it, the x closes it; closed cards come back from the row at the bottom, which also has Reset layout.
- Layout (DJ, Nov 16: "locks cards in place until moved, other cards can then be moved around it"): a snap grid of
  zones, a full-width top row plus 1, 2 or 3 columns (under 760px, under 1300px, wider). A card belongs to one zone
  and one position and stays there; while dragging, a floating copy follows the finger and an outlined slot shows
  exactly where it will land, and only the cards in that zone shift. Each column count keeps its own arrangement.
  Saved per browser in `slate-status-grid` (`LAY`); defaults are `DEF`; a new section needs a `data-card` name and
  a place in `CARDS`. Feedback sits in the top row by default (DJ: "feedback should be more prominent").
  The earlier CSS-columns layout reflowed every card after a move, which DJ found unintuitive; don't go back to it.
- Refresh: feedback every 10 seconds, the files every 30, GitHub every 2 minutes, only while the page is showing.
- Look (DJ, Nov 16: "in the same style as Slate"): docs/DESIGN.md tokens, Archivo at Slate's widths, sentence case,
  4px chips and 8px cards, red = live, the axe-hammer mark in the header. It follows the theme and accent picked in
  Slate when this browser has them saved (`slate-doc:*/settings`), otherwise Midnight in dark mode and Sunday Paper in light.

## Open
- Usage counts don't include features yet (adds, thumbs, summaries tapped per page). Thumbs and adds are already in each
  person's own docs if DJ wants them shown.
- `docs/status-waiting.json` is kept by hand: a thread that settles or adds something DJ has to do updates it
  (`title`, `tag`, `do`, `tf` true when it needs a TestFlight build). Keep it to a few short lines.
- The page list (`PAGES` in `status.html`) is a copy of CLAUDE.md's table; add a row when a new page gets a note.

## Decisions
- Not a Claude artifact: those can't call Slate's server, so they can't be live (an hourly copy exists in DJ's project).
- Not inside the app (DJ, Nov 16): no view, no menu row, no version bump. Lots of quick looks, little text (DJ).
