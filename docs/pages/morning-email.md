# Morning email

Each person can get their own slate by email every morning (3.55.0). Asked by DJ, Nov 16, 2026.

## How it works
- Settings > Morning email (`src/app/235-morning-email.js`, markup in `src/body.html`): switch, address, time (4 AM to noon, every 30 minutes, the phone's time zone), Betting lines switch, "Send one now" (five a day).
- Server: `worker/morning-email.js`, called from the worker's minute cron and `/api/morning-email` (`get`, `save`, `test`, `preview`; passcode checked with `whoIs`).
- Sent from DJ's Gmail over SMTP (smtp.gmail.com:465, Workers TCP socket) with an app password. Cloudflare secrets: `GMAIL_USER`, `GMAIL_APP_PASSWORD`. Chosen over the Gmail API because that needs a Google Cloud project and its sign-in expires every 7 days in testing mode. Gmail allows about 500 sends a day, far more than needed.
- Settings and send state are in the doc `mail/schedule` (`people.<id>`). Docs are readable with the public key, so the address is AES-GCM encrypted with a key derived from `SUPABASE_SECRET` (if that secret changes, people re-enter their address). No database change was needed.
- Content: `alertsets/<date>` (the person's slate and teams, from the tick job), `slates/<date>` (records, colors), `previews/<date>` (odds), `scores/<yesterday>`.
- Once a day: due from the chosen time until 4 hours after; `last` (their local date) plus a 10-minute `sending` lease stop double sends. A failed send retries on the next minutes, three times a day at most (`err` shows in Settings).
- No games and no results: no email. No games but results: a short one.

## 3.62.0: looks like the slate page (DJ asked, Nov 16)
- Sections: Today's slate (time groups, slate cards: league line, corner tag, logos, star, records, time, channel, preview line), Your teams yesterday (final card + Claude's recap), Last night (the rest of yesterday's slate).
- Tag and preview line use the app's own code: `worker/slate-kit.js` is generated from src/app/ by `python3 scripts/email_kit.py` (word for word). Run it after changing the slate engine, preview lines or trimEspn; `--check` says if it's stale.
- Preview lines: DJ's phone's shared lines (`prefs/pvlines`) when they're today's, otherwise worked out from ESPN's summary like the app.
- Logos: from the game, else ESPN's team list per league (edge-cached a week), else the summary (national teams).
- Recaps: 45 minutes before the send (or on "Send one now"), missing recaps of the person's teams' finals are started through the normal summary workflow (user "email", so they don't count toward the 10 a day; at most 6 a person a day). The send waits up to 20 minutes (5 for a test) for one still being written.
- Theme: the phone sends its computed colors (`look`) with every save and test; Midnight if none.
- Not in the email: the live countdown ("in 3h") and the bell, which only make sense in the app.

## 3.67.1
- Subject: "Today's Slate, Mon, Nov 17: <first game> and N more" (DJ).
- DJ-only set-up for someone else: `/api/morning-email` takes `for: <registry id>` (get and save only, DJ's passcode). The app reads a link `#mail-for=<id>&email=<address>&at=06:00`, keeps it for the tab until a passcode is in, then saves it once. It lands in that person's own settings (Doug = `dad`, set up for 6:00 AM Central on Nov 17).

## 3.67.2
- DJ's Family list in Settings → Morning email (`state.isOwner` only): `/api/morning-email` action `family` (DJ only) lists everyone in users/registry but DJ and `tester`, with their on/time/address; saves go through `save` with `for`. The set-up link (#mail-for=) still works but needs the passcode in Safari, so the Family list is the way.

## Open
- Ideas: The Athletic newsletters under the slate, Claude preview lines when already written (free), links into the iPhone app instead of Safari.
- Testing locally: `SMTP_HOST`/`SMTP_PORT`/`SMTP_PLAIN` point the sender at a stand-in mail server (never set them in Cloudflare).

## Settings sub-page (3.61.0)
The Morning email controls moved from the Settings main page to their own sub-page (Settings > Morning email, `data-pg="email"` in `body.html`; see `docs/pages/settings.md`). Ids and behavior are unchanged. `meDraw` also refreshes the row's on or off line on the main page.
