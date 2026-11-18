# Notifications (alerts, live notifications, Dynamic Island)
Last updated: Nov 18, 2026, 3.113.0
Code: `worker/alerts.js` (minute cron: alerts, live notifications, scoreboard), `ios/SlateLive/SlateLiveActivity.swift`,
`ios/Shared/SlateGameAttributes.swift`; settings page `src/app/220-notifications.js`. Plan: `docs/NOTIFICATIONS-PLAN.md`.

## Done
- 3.112.0 (iPhone build, competitor review recs 8 and 9):
  - Tonight's slate widget (`ios/SlateLive/SlateTonightWidget.swift`, kind "SlateTonight", small + medium; large
    added in 3.113.0 at DJ's ask: 8 games in 2 columns of 4 as the Board's BoardLine tiles (height 72), plus
    "N games left"; started games without a recent score show "Live" + channel; the page sends up to 12). The page
    sends `{t:"slate", date, at, games:[SlateBoardGame…]}` from livePoll (040-live.js laSlateWidget, once per change);
    WebModel saves it to the app group as tonight.json (`ios/Shared/SlateTonight.swift`) and reloads the widget.
    Timeline: every 15 min for 6 h plus each start; next 3 not-final games, live first; score hidden after 20 min stale;
    started > 4 h ago = over; data older than 20 h = "Open Slate".
  - Your bet on the card: attributes.bet (SlateBet l/k/sd/ou/ln/d3), first of mybFor(g). The app sends it at start
    (laAttrsOf → laBetOf); the phone also shares today's bets to prefs/livebets (laBetsShare) so the worker's
    push-to-start has it (LBT in laAttrs). Status worked out in Swift (BetLook.say) from the score, like mybSay.
    Fixed at start (attributes): a bet added later shows next time. Props show the label only.
  - Watch Smart Stack: SlateLiveActivity adds .supplementalActivityFamilies([.small]); FamilyLock shows WatchCard
    for .small. The SlateLive extension's deployment target is now iOS 18 (WidgetBundleBuilder can't take
    `if #available`, so a split iOS 17/18 bundle doesn't compile); the app stays at iOS 17.
  - Ended live notifications stay LA_LINGER = 20 min after the final (was 4 h), game and Board.
  - 28 pt narrow island reviewed: NarrowAwareSide keeps MiniSide stacked on both sides (DJ's Duo mockup). Not
    verifiable without an iOS 27 device.
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
- 3.92.0 (build 47, waiting for DJ's OK): the face-off card. DJ picked "slanted panels" from the mockup
  (https://claude.ai/artifact/NmK9P5wVXLsnrzwjeVFm1W; inspired by another app's Live Activity, not copied).
  Logos 40pt with names under them, slanted team-color panels (62% to 30% opacity) at each edge, the score big in the
  middle, the clock in a square-cornered tag. New ContentState keys: ag/hg (soccer scorers per side, 2 lines max),
  yl/ds (football ball spot and drive start, 0 = away goal line). The worker reads the spot from the down text and the
  drive start from situation.lastPlay.drive.start.text (not yet seen live; the bar just skips the drive without it).
- 3.101.0 (waiting for DJ's OK): Board tiles in the face-off style (mockup: Board frame on the same canvas). Lock tiles
  64pt tall (two rows must fit the Lock Screen's 160pt), island tiles 58pt. TeamPanel and ClockTag take sizes now.
  Board one-liners (ln) are no longer drawn; DJ removed them earlier anyway.
- 3.92.0's Xcode Cloud build never reached TestFlight; touching ios/WEEKEND.md on main started it again (arrived as
  3.100.5). If a build goes missing, ask DJ for Xcode Cloud > Builds; we can't see App Store Connect.
## Open
- Check the face-off card on DJ's Duo once build 47 is out: a live football game (field bar) and a soccer game with goals.
- Hockey: ESPN's scoreboard has no per-team leaders during a game (checked Nov 16, MTL-NYR 2nd period), so no standout.
- Not yet seen on DJ's Duo: the expanded island (build 37) and the Lock Screen lines (build 38). Ask for screenshots.
- Hockey and soccer: no extra lines until ESPN's live numbers are checked during a game.
- Football's other-team leader needs ESPN's summary (about 650 KB per game). Skipped because of the worker's CPU time; Cloudflare plan unknown.
- Rest of plan Phase 1: relevance-score, per-sport lines, finals 1 hour, Board auto-start at 3+, Close finish/OT riding the live notification.

## Decisions
- Worth a look missing a game is usually DJ's "National TV only" setting (he turned it off Nov 15), not a bug.
- The Cloudflare "Workers Builds" check fails on branches and sometimes on main while the site still deploys; check
  https://slate.djvillhard.workers.dev/version.json instead.
