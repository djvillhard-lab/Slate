# Slate: brief for every Claude chat

Slate is DJ's phone sports app: it builds tonight's watch slate automatically, then follows the games live.
Live at https://slate.djvillhard.workers.dev (Cloudflare Workers, deploys every push to `main` in about a minute).
Data lives in Supabase. The iPhone app (`ios/`) is a native shell that loads the live site; Xcode Cloud builds it for TestFlight.
README.md has the full architecture. Several chats work on Slate at once, often one per page, so follow the shipping steps exactly.

## Where the code is
`index.html` is **generated**. Don't read it or edit it (1 MB). Edit `src/`, then run `python3 build.py`.

| Page or area | Files in `src/app/` |
|---|---|
| The slate (Today's Slate) | `170-slate-page.js` (page), `175-best-bets.js` (Best bets, the section at the bottom), `050-slate-engine.js` (which games), `180-worth-a-look.js` (Worth a look, learning, rule wording), `190-rules.js` (Slate rules page) |
| A game: quick look and matchup | `140-game.js` (matchup page), `145-live-feed.js` (Live feed: a live football game play by play), `150-game-row.js` (the card and its quick look; the quick look's box is `trayBlock` in `110-box-score.js`), `100-highlights.js` (live highlight, preview line), `090-box-data.js` + `110-box-score.js` (box scores, soccer lineups) |
| All games (and the ticker) | `160-all-games.js` |
| Teams and team pages | `130-teams.js` |
| Box Office (player rankings) and Moments | `120-box-office.js` |
| News | `200-news.js` |
| On TV | `210-tv.js` |
| Notifications | `220-notifications.js` |
| Settings (and team search) | `230-settings.js` |
| Live scores, Lock Screen scoreboard | `040-live.js` |
| Claude on demand (summaries) | `080-claude.js` |

**Shared files:** check with DJ before big changes, because every page uses them: `010-core.js` (config, leagues, `state`, `SLATE_VERSION`), `020-look.js` (themes), `030-helpers.js`, `060-cards.js` (team block, game strip), `070-navigation.js` (Back, swipe, dock), `240-chrome.js` (top bar, menu, `render()`), `250-actions.js`, `260-persistence.js`, `270-wiring.js`, `280-ios-bridge.js` (window.SlateApp ↔ `ios/Slate/WebModel.swift`), `290-layout.js` (iPhone Duo panes), `300-startup.js`.

Other parts of `src/`:
- `body.html`: the page markup (`#view-*`).
- `styles/`: `020-base.css` (shell), `030-duo.css`, `040-components.css` (everything else; grep for the selector), `050-ux-review.css` (the 2.18.0 UX changes; the restore point is the `pre-ux-review` branch).
- `shell.html`: the skeleton and file order.
- Don't open: `styles/010-fonts.css` (embedded font) and `data/teams.js` (team list). Each is one huge line.

All `src/app/*.js` files run in one shared function scope, in name order. A new file goes in by number (e.g. `205-news-briefs.js`), and code that runs at load must come after whatever it uses.

Elsewhere: `worker/` (Cloudflare API, cron, alerts), `scripts/` (tick.py and the score/odds jobs; `shots.py` for screenshots), `sw.js` (offline copy), `ios/` (native app; `ios/WEEKEND.md`), `docs/` (plans; `DESIGN.md` the design guide; `pages/` handoff notes).

## Before you start
**Who you work for.** In DJ's Claude projects, it's the person named in your session context. In Claude Code that someone runs on their own, it's whoever is running it: Drew starts each session with "I'm Drew", and his session may also show his GitHub login. If you can't tell, ask before you claim or commit. Where this file says "ask DJ", ask the person you work for. Their name, GitHub login and commit author are in **People** below.

**Claim the page first (`docs/WORKING-ON.md`).** DJ and Drew run separate Claudes that can't see each other, so this sheet is how they avoid clashing:
1. `git pull --rebase origin main`, then read `docs/WORKING-ON.md`.
2. If the page or area you need (from the table above), or any file you'll change, is already on the sheet: **stop**. Tell the person who asked who has it and since when. Don't work on it anyway.
3. If it's free, add one row (who asked, page or area, the files, start time in UTC), commit it with a first line like `Drew: started News page`, and push to main **right away, before writing any code**.
4. If that push is rejected, someone else pushed at the same moment: `git pull --rebase origin main`, read the sheet again, and go back to step 2.
5. Shared files (`010-core.js`, `240-chrome.js`, `280-ios-bridge.js`, `styles/040-components.css`, `ios/`, and the other shared files listed above) need their own row with "shared" in the page column, e.g. `shared: 240-chrome.js`. Only one person holds each one.
6. When the work ships, remove your row in the same push. A row older than 24 hours counts as abandoned: remove it and say so in the commit (`DJ: cleared Drew's stale News page claim from Monday`).
7. Before every push to main, pull the latest main and renumber the version if the other side shipped first (steps 1, 3 and 7 below).

- Read `docs/pages/<page>.md` if it exists: what's done, what's open, and why things are the way they are.
- Changing anything people see? Read `docs/DESIGN.md` first and reuse its parts.
- Only one thread works on a file at a time. Shared files (above) and `ios/` get one thread at a time across the project.
- One request = one release. Bundle the fixes from one message into one version instead of shipping each tweak.
- If a request could reasonably go two ways and a wrong guess means redoing it, ask DJ first. Otherwise build.

## Shipping a change (every time)
**Anything that needs a new iPhone build waits for DJ's yes (DJ, Nov 16, 2026).** Apple holds new builds for review, so the web app gets ahead of the app on DJ's phone, and Drew and Dad end up further behind. A push to `main` that touches `ios/` starts an Xcode Cloud build for TestFlight by itself (its start condition is "main changed, files in `ios/`"; `ios/WEEKEND.md`), so:
- Don't push or merge anything under `ios/` to `main`, and don't start a build any other way, until DJ has said yes to that change in so many words.
- Do the work on your branch (`git push origin HEAD:<your branch>`), check it, then tell DJ in plain words what it is, why it needs a new build, and that it's waiting. Keep your row on `docs/WORKING-ON.md` while it waits.
- A change with a web half and an app half: ship the web half now only if it works with the build people already have. If it doesn't, the whole change waits.
- Web-only changes (`src/`, `worker/`, `scripts/`, docs) still ship by themselves, as below.

1. `git pull --rebase origin main`. Another chat may have shipped since you started.
2. Make the change in `src/` (or `worker/`, `scripts/`, `ios/`).
3. Number it from the newest entry in CHANGELOG.md **as it is on main now**: fixes and tweaks bump the last number, new features the middle one. Set `SLATE_VERSION` in `src/app/010-core.js` to match.
4. Add the CHANGELOG.md entry on top, in DJ's plain style, with its TestFlight line: `TestFlight: <last build>, no new build (web only)`, or the new build when `ios/` changed (see the top of CHANGELOG.md).
5. `python3 build.py`. It embeds the changelog, stamps the build time into index.html and version.json together, and refuses if the version and changelog don't match.
6. Check it: `SLATE_PASS=<test passcode> python3 scripts/shots.py <pages> [--sizes folded,open,iphone]` screenshots the pages you touched at DJ's three phone shapes and prints page errors and pages wider than the screen. Look at every screenshot. Sign in as the **test account** (id `tester`, made Nov 16, 2026 so checks never touch a real person's profile; it is left out of the People counts, feedback and the admin's list of people). In DJ's Claude projects its passcode is in the project files at `/mnt/project-files/test-account/passcode` and shots.py reads it by itself when `SLATE_PASS` isn't set. Never use Drew's or anyone else's passcode for checks, and never put a passcode in the repo (it's public). Check them yourself and ship; show DJ screenshots only when DJ asks or when a request could go two ways.
7. Commit following **Commit messages** below, then push. If the push is rejected, another chat shipped first: pull --rebase, renumber, rebuild, push.
   - On a conflict in `index.html` or `version.json`: don't merge them by hand. Resolve `src/` and CHANGELOG.md, then run `python3 build.py --force`.
8. If the change fixes or answers something a person sent from the app (Settings → Send feedback), mark it addressed so it shows on DJ's Project status page: `python3 scripts/feedback.py --open` lists what's still open with ids, then `python3 scripts/feedback.py --done <id> --note "<what fixed it, a few words>" --version <version>`. Only after it has shipped, and only when it really covers what they wrote. (Needs the reader key in DJ's Claude project files; skip it without one.)
9. Start the reply to DJ with the new version number, a short description, then what changed.

If build.py says index.html was edited by hand, it prints those edits. Move them into `src/` before rebuilding, or they're lost.

## Commit messages (DJ and Drew read the feed)
DJ and his brother Drew each run their own Claude on this repo and follow each other's work in the commit feed on GitHub (`/commits/main`). Every commit that lands on main, including a squash or merge commit, must read well there:
- **Author = the person who asked.** Commit with `--author="<Name> <<github-id>+<login>@users.noreply.github.com>"`, for the person you work for (see **People** below). GitHub then shows that person's account on the commit, with Claude as co-author. Only ever use this GitHub noreply address, never a real email, and never a token.
- **First line in plain English**, for someone who doesn't code: who asked, the page, and what changed for the person using the app. Format: `<Name>: <Page>: <what changed>`, e.g. `DJ: All games: the filters are back on the left side`. No file names, function names or jargon. Under about 70 characters.
- **Below a blank line:** the version (`Web 3.53.2`, or `no app change`), then the technical detail, then the required trailer lines.
- Non-app work (docs, scripts, worker) uses the same shape, e.g. `DJ: GitHub feed: commits now show who asked and say what changed in plain words`.
- Squash-merging a pull request: set the squash title and author the same way (the PR's own title follows the same rule).

## People
| Name | GitHub login | Commit author (`--author=`) | First-line prefix |
|---|---|---|---|
| DJ | `djvillhard-lab` | `DJ <269000479+djvillhard-lab@users.noreply.github.com>` | `DJ:` |
| Drew | not added yet | `Drew <id+login@users.noreply.github.com>` (DJ's Claude fills this in when Drew joins; Drew's id is the `id` at `https://api.github.com/users/<login>`) | `Drew:` |

Only GitHub noreply addresses go here, never a real email. Setup for a new person: `docs/SETUP-DREW.md`.

## DJ's rules for Slate
- One design style across the app: `docs/DESIGN.md` (theme colors only, sharp 4–8px corners, Archivo at its widths, red = live, accent = selected, 44-point targets).
- Built for one hand, right-handed. His main phone is the iPhone Duo (folded cover screen, unfolded two panes, and the native app's side strip).
- Any change to the Duo strip menu goes into the regular iPhone menu too, and the other way round.
- When views or native-facing features change, keep `280-ios-bridge.js` and `ios/` (strip buttons, WebModel) in step.
- Show only stats a source actually provides. Never estimate or recreate one (e.g. no made-up xG).
- Anything that costs money (Claude summaries) runs only when tapped. Other profiles (his brother's, his dad's) are capped at 10 Claude summaries a day. Free ESPN data needs no limits.
- Keep the current colors and theme unless DJ asks.
- No features that only work in a Claude-hosted copy. The Cloudflare site and the iPhone app are the only versions.
- Plain, specific wording in the app and the changelog.

## Keeping chats light
- Read only the files for the page you're changing. Use grep with line numbers, then read just those lines.
- End every thread by updating `docs/pages/<page>.md` (a few lines: what's done, what's open, decisions and why), in the same push as the change. The next thread on that page starts from it instead of re-reading the code.
- Don't build your own screenshot or test setup: use `scripts/shots.py`, and improve it if it's missing something.
- Changed the game one-liners (`100-highlights.js`, `105-pv-notes.js`)? Run `node scripts/lines_check.js` before shipping: it runs the real one-liner code on every game today and tomorrow and flags wrong or empty lines (exit 1). Changed what Claude is told (`worker/index.js` RULES, `080-claude.js` facts)? Dates go to Claude in US Eastern time, never UTC.
