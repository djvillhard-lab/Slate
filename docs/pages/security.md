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

## Sign in with Google (Web 3.95.0, Nov 17, 2026)
- Google is turned on in Supabase Auth (DJ's Google Cloud project "Slate", OAuth client set up Nov 17). Slate only uses Supabase Auth to confirm who someone is; it keeps the Supabase user id and email in `users/google` (private).
- Connect (Settings → Account and people) ties Google to the profile the phone is logged in as. Nothing moves: the profile id (u/bro, u/dad...) stays, so all data, settings, favorites and rules stay. Passcodes keep working.
- Sign in with Google (log-in page) gives that phone a device key (`g1-...`), stored only as an HMAC in `users/devices`; whoIs treats it like the profile's passcode, so the rest of the app is unchanged. Removing a person also drops their device keys and Google link.
- The Google step always runs in a browser (`google.html`), joined to the app by a one-time ticket (`users/gtickets`, 15 minutes, poll secret stays on the phone). In the iPhone app it opens in Safari and the app polls; on the website the same tab goes and comes back. No new iPhone build needed.
- DJ's profile can connect Google but still logs in with its passcode (DJ's saves are checked in the database, `save_doc`).
- Open: Sign in with Apple and sign-in inside the app (ASWebAuthenticationSession) need an iPhone build and DJ's yes. Retire the old plain-hash passcodes for Drew and Doug only after they've connected Google and DJ says so.

## Sign in with Apple and Google inside the app (Web 3.114.0, Nov 19, 2026)
- Web half live: `/api/google/apple` checks Apple's signed token against Apple's keys (audience com.djvillhard.slate, SHA-256 nonce), then links or signs in exactly like Google. Apple links are keyed `apple:<sub>` in `users/google`; status returns `apple`/`appleEmail`; unlink takes `p: "apple"`.
- The page uses the new paths only when `SLATE_NATIVE.auth` is true (the next iPhone build). Then Google opens in Apple's sign-in sheet (ASWebAuthenticationSession, `google.html#t=..&app=1`, closes at `slate-auth://done`) and the log-in page shows Sign in with Apple. Older builds keep the Safari flow and show no Apple button.
- App half: commit e10074f (SignIn.swift, WebModel "auth"/"apple", entitlement), cherry-picked into the Live notifications thread's build branch. Needs DJ's yes for the build, and the "Sign In with Apple" capability on the App ID com.djvillhard.slate.
