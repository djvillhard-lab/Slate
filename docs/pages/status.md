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
- Refresh: feedback every 10 seconds, the files every 30, GitHub every 2 minutes, only while the page is showing.
- Look: Midnight in dark mode, Sunday Paper in light (the browser's setting), one column on a phone, two on a PC.

## Open
- `docs/status-waiting.json` is kept by hand: a thread that settles or adds something DJ has to do updates it
  (`title`, `tag`, `do`, `tf` true when it needs a TestFlight build). Keep it to a few short lines.
- The page list (`PAGES` in `status.html`) is a copy of CLAUDE.md's table; add a row when a new page gets a note.

## Decisions
- Not a Claude artifact: those can't call Slate's server, so they can't be live (an hourly copy exists in DJ's project).
- Not inside the app (DJ, Nov 16): no view, no menu row, no version bump. Lots of quick looks, little text (DJ).
