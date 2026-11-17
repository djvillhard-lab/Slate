# Notifications (alerts, live notifications, Dynamic Island)
Last updated: Nov 16, 2026, 3.65.8
Code: `worker/alerts.js` (minute cron: alerts, live notifications, scoreboard), `ios/SlateLive/SlateLiveActivity.swift`,
`ios/Shared/SlateGameAttributes.swift`; settings page `src/app/220-notifications.js`. Plan: `docs/NOTIFICATIONS-PLAN.md`.

## Done
- Apple interruption levels: Active for starting/close/OT/upset/goal/final, Passive for brief, hourly score, and a final the
  live notification already shows. Never Time Sensitive. thread-id is `game-<id>`, so a game's alerts stack (3.32.0).
- Live notifications start 10 min before kickoff: 0-0, start time, "On NBC"; "Starting" once the listed time passes (3.32.0, 3.33.1).
- Real abbreviations and team colors before kickoff, and the scoreboard looks up its picks all day (3.33.1).
- Folded Duo island: chip and score stacked in the tall pill; no 0-0 before kickoff (3.33.1, build 36).
- Expanded island: each team's standout (ESPN "rating" leader in basketball, game leaders in football), team lines
  (FG%, 3PT, REB / timeouts), last play, "ESPN win chance" (3.38.0, build 37). Fields ap, hp, at, ht, lp, wp.
- Lock Screen: smaller scores (24), a standout line per team, kept after the final; football fallback ox/op (3.39.1, build 38).
- Preview line (the slate's one-liner) on live notifications and in Starting now alerts (3.58.0, build 39): the phone
  shares PV lines to prefs/pvlines (100-highlights.js pvShare); the worker reads them per person (PVL). Field pv; pre-game
  it also goes in line for older builds. Dropped after the final. Only games the phone has shown on its slate that day.

- Live one-liner (the slate card's red line while a game is on) on live notifications (3.61.1, web only): pvShare also
  sends `live` lines + `liveAt` (re-sent every 5 min while Slate is open); the worker uses them for pv and line while
  the game is in progress (LVL). 3.64.0: no 20-minute cutoff any more (DJ saw the preview line while his slate card
  showed the live line); the last shared live line stays. Shared game channels keep
  a line someone shared when the next person has none (bcPick).
- Board one-liners (3.64.0, build 41), TAKEN OFF in 3.65.8 at DJ's ask (single games only; the server sends no ln): SlateBoardGame.ln, live line else preview line, not after the final; 2 lines on the
  Lock Screen with 1-2 games, 1 line otherwise and in the island. The Board the phone starts itself has no ln until the
  server's first update.
- Soccer scorers line (3.64.0): goalLine() from the ESPN scoreboard's competitions[0].details (scoringPlay, not
  shootout; ownGoal flips the side; penaltyKick "pen"). sc.gl replaces pv/line and the Board ln while live.
- Fitted lines (3.66.3): fitLine() sizes pv to 44 letters under standouts, 80 alone (first clause of a two-part line,
  else whole words + "…"); standout() shortens ap/hp/op to last name + 3 numbers. Football standout = most yards.
- Team logos (3.67.0, build 43, needs DJ's App Group setup): App Group group.com.djvillhard.slate on both targets
  (ios/Slate.entitlements, ios/SlateLive.entitlements). The page sends {t:"logos", segs:["nba/bos.png",…]} for today's
  games (040-live.js laLogos, from livePoll); WebModel -> SlateLogos.fetch saves 64 px ESPN 500-dark (else 500) logos to
  the group's Logos/ folder, refreshed weekly. Attributes awayLogo/homeLogo (server laAttrs from the scoreboard's team.logo,
  page laAttrsOf from teamLook) and Board al/hl; Chip draws the saved image, else the colored chip.
- Redesign (3.68.0, DJ): one standout per game (bball: higher ESPN rating value; football: most yards), pv never about
  the standout (s.tn last name) -> wp, shooting, preview line; header "Slate • CBB" (LA_CODE / LA_LG); tag shared from
  the phone (pvlines.tags) and sent as st.tag. The app shows tag in the header from build 44 (3.68.5).
- Football (3.71.3): sit is just ESPN's down and spot when possession is known; fitLine also splits on ", and have/are/…".
  Build 45 (3.75.1) moves the down next to the football icon by the team name and drops its own row; the island gets
  a football icon by the score, no timeouts (at/ht for football), no timeout/break last plays, and wp only without pv.
- Logo pick (3.81.7, build 46): SlateLogos.fetch measures the dark logo; under 0.12 average saturation it tries the
  regular one and keeps it if saturation > 0.3 and brightness >= 0.3 (same rule as 045-team-logos.js and the email's
  LOGO_PLAIN). Saved to Logos2 so old picks are replaced. The page sends the game's own logo first (national teams).
## Open
- Hockey: ESPN's scoreboard has no per-team leaders during a game (checked Nov 16, MTL-NYR 2nd period), so no standout.
- Not yet seen on DJ's Duo: the expanded island (build 37) and the Lock Screen lines (build 38). Ask for screenshots.
- Hockey and soccer: no extra lines until ESPN's live numbers are checked during a game.
- Football's other-team leader needs ESPN's summary (about 650 KB per game). Skipped because of the worker's CPU time; Cloudflare plan unknown.
- Rest of plan Phase 1: relevance-score, per-sport lines, finals 1 hour, Board auto-start at 3+, Close finish/OT riding the live notification.

## Decisions
- Worth a look missing a game is usually DJ's "National TV only" setting (he turned it off Nov 15), not a bug.
- The Cloudflare "Workers Builds" check fails on branches and sometimes on main while the site still deploys; check
  https://slate.djvillhard.workers.dev/version.json instead.
