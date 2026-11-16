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

## Open
- Ideas: The Athletic newsletters under the slate, Claude preview lines when already written (free), links into the iPhone app instead of Safari.
- Testing locally: `SMTP_HOST`/`SMTP_PORT`/`SMTP_PLAIN` point the sender at a stand-in mail server (never set them in Cloudflare).
