# Sign-up, log-in and the welcome walkthrough

Files: `src/boot/db-shim.js` (the log-in and sign-up page, "gate"), `src/app/232-welcome.js` (walkthrough, rules from
answers, a favorite's event, Settings > Account, DJ's invite sheet), `src/styles/085-welcome.css`, `worker/signup.js`
(invites and sign-up; one hook line and one import in `worker/index.js`).

## What's done (3.59.0)
- **Invite only** (DJ's choice, Nov 16, 2026: the site is public and every account can spend Claude summaries).
  Settings > Account > Invite someone (DJ's passcode only) makes a link `/#invite=CODE`. It works once, lasts 7 days,
  and the sheet lists invites (waiting, used and by whom, ran out) with Cancel. No open sign-up, ever, unless DJ asks.
- **Sign-up**: the link (or the code typed in from "I have an invite") opens "Set up your Slate": first name and a
  passcode of 8 or more characters. The worker adds the person to `users/registry` with cap 10, the same as the
  "Add a person" GitHub action, and picks their id from their name (letters only, never an id that already has data
  under `u/<id>/`). That action still works for adding, renaming and removing people.
- **Log-in page** replaces the old pop-up prompts: Log in, I have an invite, Just look around (view only).
  Settings > Account shows who's logged in, with Log out.
- **Welcome walkthrough** (`wlStart`): intro, teams, leagues, how big a slate, a few preferences, notifications, done.
  Shown by itself only to someone new: right after sign-up (`slate-welcome` flag on the phone), or on a first log-in
  when nothing of theirs is saved yet (no settings and no `welcome` document). DJ never gets it by itself. Anyone can
  run it from Settings > Account; then nothing changes until "Replace my rules" on the last step (teams are the
  exception: they save as you pick, like in Settings).
- **Rules from answers** (`wlRules`): the three sizes are the `WL_SIZE` table (each league's starting rules and the
  most games a night). The preferences step overrides ranked college games, national TV, events and earliest start.
  The result is ordinary rules (v2), so Settings > Slate rules edits all of it. "All" events only switches on event
  groups for sports the person follows.
- **A favorite team's event** (`wlFavEvents`, DJ Nov 16): if one of your teams plays in an event your rules weren't
  showing, the event's name is added to `rules.eventsOn`, so its other games go on the slate. Switching it off in
  Slate rules puts it in `eventsOff`, which is respected. Runs for everyone, each time the day's games arrive (it
  wraps `maybeAutoAdd`).
- Notifications step: my teams, slate games, morning brief, morning email (asks for the address, 7 AM), and the
  same "turn on for this phone" as Settings > Notifications. No new native code: no TestFlight build.

## Added in 3.61.0
- Account rows now live on Settings > Account and people (`#acct-slot`; see `docs/pages/settings.md`).
- **Try the new user setup** (DJ only): `window.slatePreviewSignup` shows the sign-up page as a preview (nothing is
  sent), then `wlStart(true, true, name)` runs the walkthrough blank. While `wl.preview` is on, `saveSettings`,
  `saveNotify`, `saveLineup` and `maybeAutoAdd` do nothing (wrapped in `232-welcome.js`), and DJ's teams are put back
  when it closes. It differs from "Welcome walkthrough", which starts from your own setup and replaces your rules.
- **People** (DJ only): `/api/invite` answers now carry `people` (everyone in `users/registry`, with today's Claude
  summaries); `action: "remove"` with an id takes their passcode away. Their data under `u/<id>/` stays, and the
  sign-up code never reuses an id that has data.
- Styles moved out of `db-shim.js` into `src/styles/085-welcome.css`.

## Why things are the way they are
- **Passcodes chosen at sign-up are stored as an HMAC, not a plain SHA-256.** The `docs` table can be read by anyone
  with the page's public key, so a plain hash of a passcode someone picked could be guessed offline. The key comes from
  the worker's `SUPABASE_SECRET`. If that secret is ever replaced, people who signed up by invite need a new invite
  (people added with the GitHub action are not affected). Invite codes are stored the same way.
- Sign-up refuses a passcode that already belongs to someone without saying so, and an invite locks after 8 such
  misses, so an invite can't be used to guess other people's passcodes.
- The walkthrough and the log-in page are laid over the app from JS (no `body.html` markup): other threads held
  `body.html`, `shell.html` and Settings when this was built. Account rows are inserted above the Claude summaries row.
- `scripts/shots.py` gained `--gate [invite]`, `--readonly`, `--eval` and `--name` to screenshot these.
  **The "test passcode" in the project instructions is Drew's real profile**: always use `--readonly` when a
  screenshot run taps anything that saves.

## Open
- "Skip late games" doesn't exist as a rule (the engine only has "starts after"), so the walkthrough asks for an
  earliest start instead. A latest-start rule would be a change to `050-slate-engine.js` and the Slate rules page.
- The thumbs up/down learning could feed the walkthrough's starting rules later.
- An invite link opens in Safari. Someone using the TestFlight app signs up in Safari, then logs in to the app with
  their passcode (or taps "I have an invite" in the app and types the code).
