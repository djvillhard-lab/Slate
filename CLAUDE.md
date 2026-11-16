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
- Read `docs/pages/<page>.md` if it exists: what's done, what's open, and why things are the way they are.
- Changing anything people see? Read `docs/DESIGN.md` first and reuse its parts.
- Only one thread works on a file at a time. Shared files (above) and `ios/` get one thread at a time across the project.
- One request = one release. Bundle the fixes from one message into one version instead of shipping each tweak.
- If a request could reasonably go two ways and a wrong guess means redoing it, ask DJ first. Otherwise build.

## Shipping a change (every time)
1. `git pull --rebase origin main`. Another chat may have shipped since you started.
2. Make the change in `src/` (or `worker/`, `scripts/`, `ios/`).
3. Number it from the newest entry in CHANGELOG.md **as it is on main now**: fixes and tweaks bump the last number, new features the middle one. Set `SLATE_VERSION` in `src/app/010-core.js` to match.
4. Add the CHANGELOG.md entry on top, in DJ's plain style, with its TestFlight line: `TestFlight: <last build>, no new build (web only)`, or the new build when `ios/` changed (see the top of CHANGELOG.md).
5. `python3 build.py`. It embeds the changelog, stamps the build time into index.html and version.json together, and refuses if the version and changelog don't match.
6. Check it: `SLATE_PASS=<test passcode> python3 scripts/shots.py <pages> [--sizes folded,open,iphone]` screenshots the pages you touched at DJ's three phone shapes and prints page errors and pages wider than the screen. Look at every screenshot. The test passcode is in the project instructions, never in the repo (it's public). Check them yourself and ship; show DJ screenshots only when DJ asks or when a request could go two ways.
7. Commit as `X.Y.Z: what changed`, then push. If the push is rejected, another chat shipped first: pull --rebase, renumber, rebuild, push.
   - On a conflict in `index.html` or `version.json`: don't merge them by hand. Resolve `src/` and CHANGELOG.md, then run `python3 build.py --force`.
8. Start the reply to DJ with the new version number, a short description, then what changed.

If build.py says index.html was edited by hand, it prints those edits. Move them into `src/` before rebuilding, or they're lost.

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
