# Security (handoff notes)

Full review: Claude Doc "Slate safety, security and scaling review" (Nov 17, 2026), linked in the project thread.

## Done
- 3.83.0: login limit (20 wrong passcodes per network address per 15 min, then every /api POST from it gets 429 for 15 min; Cloudflare cache, per data center). Right passcodes are remembered 5 min (`whoIsCached`, keyed by an HMAC). Daily Claude budget for everyone but the admin: `CLAUDE_DAY_USD` in Cloudflare, $15 if unset; one push to DJ's phones when hit (`stats/usage` day `capNote`). `_headers`: nosniff, SAMEORIGIN framing, referrer policy, permissions policy. `/api/docs` (a person's own documents, read with their passcode). Admin `setpass` action on `/api/invite` (new HMAC passcode for an id, old one stops working).

- 3.83.1: the app reads every non-shared document through `/api/docs` (src/boot/db-shim.js `SHARED` list = what stays public), batched, and polls its own documents every 15 s while on screen (they no longer arrive over the live channel once the lockdown SQL runs). `scripts/shots.py` intercepts `/api/docs` for the Phone setting. The `SHARED` regex in db-shim.js and the policy in lockdown.sql must list the same paths.

- 3.85.0 (cost cuts): `SHARE_MIN` share windows per kind, `LEAN` per kind (effort low/medium, `web_search_20260209`; recaps on `claude-haiku-5-5` with Sonnet fallback). A 400 with the lean settings retries the old way (see worker logs "lean settings refused"). News/deep untouched (News thread owns them). Next levers: News page from shared pieces, Batch overnight.

## Waiting on DJ
- Database lockdown: `docs/security/lockdown.sql`, run in Supabase's SQL editor now safe to run (3.83.1 is live). Until it runs, the data is still public.
- Drew (`bro`) and Doug (`dad`): DJ does NOT want their access reset or their passcodes changed, and they keep the saved passcode on their phones. Later they create real profiles linked to their existing ids (data, settings, rules kept), and the plain-hash entries are retired then.
- `SLATE_PASS` GitHub secret (iPhone CI screenshots, pushed to the public `ios-screenshots` branch): should be the test account's passcode.

## Decisions
- No IP-wide CAPTCHA or account lockout: a lockout per account would let anyone lock DJ out.
- The GitHub "Add a person" action still writes plain SHA-256; prefer invites (HMAC) for new people.
