# Send feedback
Last updated: Nov 16, 2026, 3.56.0

## Done
- Settings → **Send feedback** (button above Reset the app): a sheet with Problem / Idea / Other, a text box, an
  optional screenshot from Photos (shrunk to a JPEG, about 900 points), and a line showing what's sent with it.
- Sent with it: who (from the passcode), the page before Settings (and the game on a matchup or Live feed), Web
  version, iPhone app build or Home Screen/browser, phone layout (Duo folded/open, side column), screen size, look.
- All of it is in `src/app/225-feedback.js`, inside its own function (names `sfb*`, classes `.sfb-*`; the thumbs
  feature owns `fb*`). It adds its own Settings button, sheet and a small style block, so it touches no shared file.
- Worker: `worker/feedback.js`, hooked in `worker/index.js` by one route line. Sending needs a valid passcode.
- Storage: the existing Supabase `docs` table (no new table): `feedback/i/<id>` and `feedback/s/<id>` (screenshot).
  The docs table is readable with the public key, so each item is AES-GCM encrypted with a key made from the
  worker's SUPABASE_SECRET; only `at` and `reported` are in the clear.
- Reading: `/api/feedback/inbox`, `/mark`, `/shot` take the reader key (hash in `worker/feedback.js`; the key itself
  is only in DJ's Claude project files, `feedback/.reader-key`) or DJ's passcode. `scripts/feedback.py` prints the
  report (`--mark` marks items reported, `--shots DIR` saves screenshots).
- Daily report: a scheduled task in DJ's Claude project ("Collect in-app feedback for review" thread) runs
  `scripts/feedback.py --mark` at 7:38 AM Central and posts new items there, grouped by type. Quiet when there's none.

- Addressed or open (Nov 16, 2026): each item can carry `done: {at, note, version, by}` beside `reported`
  (`/api/feedback/done`, reader key or an admin passcode). DJ asked for it to be automatic: the thread that ships a
  fix marks the item with `scripts/feedback.py --done <id> --note ... --version ...` (CLAUDE.md, shipping step 8), and
  the daily report thread checks `--open` too. DJ's Project status page shows Open / Addressed and has a manual
  switch on each item (tap the item, then "Mark addressed" or "Open it again").

## Open
- No in-app inbox for DJ yet (the report lives in the Claude project, as DJ asked).
- New people from the sign-up flow can send as soon as they have a passcode.

## Decisions
- Not GitHub issues: the repo is public, so feedback would be public. Not a new Supabase table: that needs a
  migration run by hand. Encrypted docs in the existing table need no setup.
- Screenshots are picked from Photos rather than captured by the app: capturing the page would need a large library
  or a new iPhone build.
- If SUPABASE_SECRET is ever changed, older unreported items can't be decrypted (the report says so).

## Settings sub-pages (3.61.0)
Settings is now a main page of rows with sub-pages. "Send feedback" is still added to `.set-acts` on the main page; Reset the app moved to About and updates, so the row is appended last (see `docs/pages/settings.md`).
