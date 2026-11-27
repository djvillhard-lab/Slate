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

## 3.68.6: dark mode in mail apps, no time links
- `emailize()` runs on the finished HTML: each inline color gets a class with `[data-ogsc]`/`[data-ogsb]` rules so Outlook's dark mode leaves the colors alone, tables and cells get `bgcolor`, and `font:` shorthands are spelled out (Outlook drops them and loses the weights).
- Times and dates in the text get an invisible joiner (`&#8204;`) so iOS and Outlook don't turn them into links; plus the format-detection meta and `a[x-apple-data-detectors]` CSS. Plain-text part is unchanged.
- Theme colors are turned into plain hex (rgba blended on the background) before drawing.
- Decision: lock the email to the phone's own theme rather than let mail apps invert it. Gmail's app can still force its own dark mode; nothing in an email can fully stop that.

## 3.68.11: Outlook on iPhone, second try
- 3.68.6's `[data-ogsc]` locks did nothing in Outlook iOS (DJ checked a fresh send). Now, for dark themes only, every background also gets `background-image:linear-gradient(c,c)`, which Outlook doesn't repaint. Not for light themes: Outlook would lighten the dark text on a locked light background.
- Times use U+2236 (ratio sign) in place of the colon in the HTML; the zero-width joiner alone didn't stop Outlook's links. Plain text keeps real colons.
- Can't render Outlook here; check with a Send from Settings. Fallback if it's still off: a light theme, which Outlook darkens cleanly.

## 3.69.1: light design
- Two tries at locking the dark design (3.68.6, 3.68.11) didn't change Outlook iOS: a gray wash over everything. Decision (coordinator, after DJ's report): the email is always drawn light. `paperLook()` swaps a dark phone look for Sunday Paper's colors plus the person's accent, deepened to 4.5:1 on the cards; the button is the deepened fill with white text. Light phone looks pass through unchanged.
- Kept: color classes, bgcolor, font longhands, the ratio-sign colon in times.

## 3.71.1: preview ranks
- pvCompute gets the game (slate 3.71.0), so its lines use the card's ranks; DJ's saved phone lines (prefs/pvlines) go through `cardRanks()`, which swaps "No. N <team>" for the card's rank (or drops it). Kit regenerated.

## Address check (Web 3.94.0, Nov 17, 2026)
- A new or changed address is stored as `pending` (sealed) with a hashed token; Slate emails a confirm link (`/api/morning-email/confirm?u=<id>&t=<token>`, GET shows a Confirm button, POST confirms). 48-hour window, 3 confirm emails per person per day.
- Sends go only to the confirmed `email`. Addresses saved before 3.94.0 were grandfathered as confirmed.
- Why: the security review found Slate could send from DJ's Gmail to any unverified address.

## 3.174.2: emails stopped Nov 20-26 (fixed Nov 26)
- Cause: `worker/slate-kit.js` was stale. Slate rules for golf and F1 (3.119.1, Nov 19) made `normRules` read `EV_RULES`, which the kit didn't copy, so `buildEmail` threw "EV_RULES is not defined" for anyone with those rules (Drew, Dad). Three fails a day, then `last` was set and nothing more. Test account and DJ (no sports rules) still worked, so it went unnoticed.
- Fix: `email_kit.py` copies `EV_RULES` and `homeFirst`, and now runs the new kit in Node with every rule option on every league before writing it; a kit that throws is never written. `build.py` runs `email_kit.py` on every build, so the copy can't go stale again.
- DJ's Family list shows "On, but the last one didn't send: <reason>. Last sent <day>".
- Claude can check everyone's state without addresses: POST `/api/morning-email` `{action: "status", key: <feedback reader key>}` (on, time, last, sentAt, err, note, fails, whether the address unseals, whether they're in today's alertsets).
- 3.175.1: the email, confirm and expired-link pages say Settings > Alerts and email (Settings reorganized in 3.175.0).
- 3.177.2 (Nov 27): Drew's 8 AM email (53 games) died mid-build in the shared minute cron with no error saved (`sending` stuck, no `stage`), while the same build took 0.7 s and 64 fetches through /api. The morning email now runs alone on a second cron, `*/2 * * * *` (wrangler.jsonc; index.js scheduled() branches on event.cron). `stage` in the doc records when a build finished; `status` with `build: <id>` builds without sending and counts fetches.
