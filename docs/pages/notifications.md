# Notifications (alerts, live notifications, Dynamic Island)
Last updated: Nov 16, 2026, 3.58.0 (iPhone 3.58.0 (39))
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

## Open
- Not yet seen on DJ's Duo: the expanded island (build 37) and the Lock Screen lines (build 38). Ask for screenshots.
- Hockey and soccer: no extra lines until ESPN's live numbers are checked during a game.
- Football's other-team leader needs ESPN's summary (about 650 KB per game). Skipped because of the worker's CPU time; Cloudflare plan unknown.
- Rest of plan Phase 1: relevance-score, per-sport lines, finals 1 hour, Board auto-start at 3+, Close finish/OT riding the live notification.

## Decisions
- Worth a look missing a game is usually DJ's "National TV only" setting (he turned it off Nov 15), not a bug.
- The Cloudflare "Workers Builds" check fails on branches and sometimes on main while the site still deploys; check
  https://slate.djvillhard.workers.dev/version.json instead.
