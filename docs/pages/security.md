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

## Code review, Nov 27, 2026 (Web 3.178.3)
Full report: Claude Doc "Slate code review: security and speed" (linked in the project thread "Review code for security and speed").
- Shipped: links carrying a passcode (`#pass=`) or a handoff ticket (`slateHandoff`) ask before replacing a saved login (src/boot/db-shim.js `swapOk`). `sendPush` only posts to Apple, Google, Mozilla and Microsoft push hosts (worker/alerts.js `PUSH_HOST`). tick.yml and person.yml run with `contents: read`.
- Shipped, speed: the service worker downloads the page again only when version.json's build differs from the build saved with its copy (sw.js `refresh`, 3.178.4; the server sends `/` without an ETag, so a conditional request can't do it). build.py embeds only the newest 40 changelog entries (`RECENT`); Release history fetches /CHANGELOG.md when opened. The tap check (297-diag.js) does nothing unless it is on (admin phone or `slate-diag`).
- Checked and fine: the Nov 17 lockdown still holds (the public key reads only shared paths, 289 rows on Nov 27). No markup built from data: every `innerHTML` in src/ is a fixed icon. No secrets in the working tree or the last 100 commits.
- Open, ranked in the report: one master key (SUPABASE_SECRET) for database, encryption, passcode HMAC, VAPID and the internal header, so it can't be rotated; passcodes never expire and there is no list of logged-in phones; shared write-ups trust facts sent by the phone; no script CSP; /api/photos needs no login and writes `photos/<team>`; whole-document read-modify-write on users/registry, users/devices, stats/usage; morning-email recaps skip the daily budget; `morningStatus` run/build debug options.
- iPhone (needs a build and DJ's yes, not started): `isInspectable` on in release builds, passcode in UserDefaults not the Keychain, the page's message handler doesn't check which frame sent a message.
- 3.179.0 (speed): build.py strips comments and whitespace from the app's code with `scripts/rjsmin.py` (a copy of rJSmin 1.3.0, Apache 2.0; no renaming). 740 KB to 600 KB compressed. Checked by printing the original and the shrunk code through esbuild's whitespace-only pass: byte-identical. `python3 build.py --plain` builds unshrunk for line numbers. The iPhone build greps `SLATE_VERSION = "x"` from index.html, so build.py puts that line's spaces back. CSS is not shrunk (about 29 KB more to gain; most of the CSS is the embedded font).
- 3.179.3 (DJ, Nov 27: "I want everything implemented. If anything has an impact to user experience, tell me first"): `/api/docs` takes `since: {path: updated_at | "none"}` and answers unchanged documents as names in `same` (db-shim.js passes it only from the 15-second check). Styles are shrunk too (`scripts/rcssmin.py`). `/api/photos` writes `photos/<team>` only once a real picture was found or the record exists. Morning-email recaps stop at `CLAUDE_DAY_USD`. `morningStatus` lost its run/build options. The tap check is gone (297-diag.js and the two `diag` branches in worker/usage.js). `SLATE_KEY`: every non-database use of SUPABASE_SECRET now reads `env.SLATE_KEY || env.SUPABASE_SECRET` (comment at the top of worker/index.js). It must be set to the exact current SUPABASE_SECRET value, by DJ, before the database key is ever replaced.
- Found while checking the styles: a stray `}` in styles/040-components.css (after the `@container bxpl (min-width: 640px)` block, from commit cfff301) makes browsers drop the `.fd-pls` rule right after it, so 3.177.0's "players side by side" never applied. Not fixed here: it changes the look, DJ was asked on a card.
- Waiting on DJ's cards (Nov 27): Phones logged in list; iPhone build for the three items; server-gathered facts for shared write-ups; the `.fd-pls` fix. Still to do without a card: script CSP, realtime only for subscribed paths, folding the layout timers, SQL functions for the read-modify-write documents (DJ runs the SQL).

### Script rule for the page (CSP), Web 3.181.1
- Two halves. `_headers` (every file on the site): what the page may fetch (`connect-src`: Slate, `*.espn.com`, `*.espncdn.com`, the Supabase project over https and wss, api.github.com for status.html), frames only from Slate, no plugins, no `<base>` tricks, scripts from Slate's own address or inline. Images and video stay open (`*`) because logos, headshots and news pictures come from many hosts.
- The strict half is a `<meta http-equiv="Content-Security-Policy">` in index.html, written by build.py (`script_rule`): `script-src 'self'` plus a sha256 fingerprint of every inline `<script>` block. It is in the page, not in `_headers`, so it can never be out of step with the code (a mismatch would mean a blank app) and it also covers the copy sw.js keeps. Browsers apply both rules, so on the app's page injected inline script and `on...=` attributes do not run. status.html, google.html and app-preview.html only get the `_headers` half (their inline scripts are edited by hand).
- Why it is safe for the iPhone app: the app's own injected script (WKUserScript) and `evaluateJavaScript` calls are not subject to a page's rule. Checked in Chromium only (shots.py); the rule uses nothing newer than what Safari has had since 2016.
- supabase.js has one `new Function("return this")` behind a `globalThis` check that returns first, so no `unsafe-eval` is needed.
- The app had no `on...=` attributes and no `javascript:` links when this shipped. CLAUDE.md tells chats not to add any.
- shots.py sends index.html with the `/*` headers from `_headers` and prints `blocked by the script rule: <what>` (a `securitypolicyviolation` listener).
- Still open: styles are `'unsafe-inline'` (the app sets style attributes everywhere); `img-src *` means a script that did get in could still leak through an image address.

