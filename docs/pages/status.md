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
  `docs/status-list.json` (the hand-kept half of "Your list"). Release times come from GitHub's public commit list.
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
- Layout (DJ, Nov 16: "locks cards in place until moved, other cards can then be moved around it", then "too
  difficult to drag and drop and get the card where I want it"): zones, a full-width top row plus 1, 2 or 3 columns
  (under 760px, under 1300px, wider). While a card is dragged every card shrinks to its title bar, so the whole layout
  is on screen; each column and the wide row is one big dashed drop area chosen by the finger's position across the
  page (nearest column, any height); above or below a neighbour goes by which half of it the finger is over; the
  accent slot is where it lands. Each card also has a Move menu (Up, Down, Left, Right, full width) and the grip takes
  arrow keys. With a mouse the whole title bar drags. Don't bring back full-height cards during a drag: with one card
  five screens tall, nobody could reach the slot they wanted. Saved per browser and per column count in
  `slate-status-grid` (`LAY`); defaults `DEF`; a new card needs a `data-card` name and a place in `CARDS`.
- Text (DJ, Nov 16): nothing is cut off. Everything wraps; the one clamp is a feedback quote (three lines) and it gets
  a More button. No `text-overflow: ellipsis` and no shortening in code.
- Type (DJ, Nov 16: "too difficult to just look at the dashboard and see what I want to see"): three roles only, set
  in the "type scale" block at the end of the styles. Numbers big, condensed and heavy; titles heavy; details regular
  weight, muted, 14px. The page used to be bold everywhere, so nothing stood out.
- Live pill (DJ, Nov 16): "Live, Updated 4:46:20 PM" from the last answer to the 10-second feedback check. After 45
  seconds without one, or offline, it turns red: "Not updating" or "Offline" with the last time.
- Test account (DJ, Nov 16: "remove anything from the dashboard that wasn't actually drew - and separate drew from
  internal testing account"): id `tester` (added with the "Add, rename or remove a person" action), passcode in
  DJ's Claude project files (`/mnt/project-files/test-account/passcode`). `TEST_IDS` in worker/usage.js keeps it out
  of People, feedback (accepted, not stored) and the admin's people list. `POST /api/usage/reset {key|pass, id}`
  clears one person's counts; Drew's were cleared on Nov 16 because test runs couldn't be told from his own use.
- People versions (DJ, Nov 16): each person shows the Slate version their copy last ran (`doc.web`, sent by
  296-usage.js) and their iPhone build (`doc.app`), outlined in red with "behind <newest>" when older.
- Refresh: feedback every 10 seconds, the files every 30, GitHub every 2 minutes, only while the page is showing.
- Look (DJ, Nov 16: "in the same style as Slate"): docs/DESIGN.md tokens, Archivo at Slate's widths, sentence case,
  4px chips and 8px cards, red = live, the axe-hammer mark in the header. It follows the theme and accent picked in
  Slate when this browser has them saved (`slate-doc:*/settings`), otherwise Midnight in dark mode and Sunday Paper in light.

## Open
- Usage counts don't include features yet (adds, thumbs, summaries tapped per page). Thumbs and adds are already in each
  person's own docs if DJ wants them shown.
- Your list (DJ, Nov 16: he didn't like "Waiting on you"; wants reminders, things to think about, and features he
  hasn't said he's tested). Three groups: To try = the newest dozen feature releases (x.y.0) of the last three days,
  each with "Tested, I like it" / "Needs work" (with an optional note); Reminders and To think about come from
  `docs/status-list.json`, kept by hand: a thread that settles or adds something for DJ updates it (ids must stay stable).
  DJ's taps are saved by the worker (`POST /api/usage/marks`, encrypted in `stats/marks`). **Claude can read them**
  with the feedback reader key: `{key}` returns `{marks: {"rel:3.65.0": {v: "like"|"work", note, at}, "todo:<id>": {v: "done"}}}`.
  A "work" mark with a note is DJ asking for a change to that release.
- The page list (`PAGES` in `status.html`) is a copy of CLAUDE.md's table; add a row when a new page gets a note.

## Decisions
- Not a Claude artifact: those can't call Slate's server, so they can't be live (an hourly copy exists in DJ's project).
- Not inside the app (DJ, Nov 16): no view, no menu row, no version bump. Lots of quick looks, little text (DJ).
