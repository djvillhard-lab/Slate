# Betting lines (was Best bets)
Last updated: Nov 16, 2026, 3.65.3
Code: `src/app/175-best-bets.js`, styles under "Best bets" in `src/styles/040-components.css`. Its own section on Tonight's Slate, at the bottom of the slate, below Finished. (3.49.0 moved it above Finished; DJ had it moved back in 3.51.2. Don't move it up again.) Since 3.65.3 The Athletic newsletters sit under it (DJ).

## Done
- Stat-based picks from ESPN game logs only: a player's mark over his last six games, game totals vs the over/under from
  both teams' last five. Nothing projected (3.31.0).
- Always seven picks, fixed once chosen; follow the slate (a removed game's picks go, spots refill) (3.40.0).
- Live picks show tonight's number from the box score and settle as Hit or Miss; the top counts live/hit/missed (3.40.0, 3.41.0).
- × removes a pick for the day and the next best fills in, with Undo (3.41.0).
- Each card explains the pick in words instead of six stat boxes (3.43.0).
- Finished games count as on the slate (3.45.1). The slate page moves finished games into their own group and used to pass
  Best bets only the rest, so picks vanished as games ended and the section was gone after the last game. `betsBlock` now gets
  the whole slate (`lgAll` in 170-slate-page.js), Live-only filter included.
- A player is picked once; a pick from a finished game needs the player in that game's box score (3.45.1).
- Five picks, not seven (3.47.0, DJ). Older seven-pick days are cut to their first five.
- Frozen once every slate game is over (3.47.0, DJ): `betPicks()` returns early, so no refills, not even after ×.

## How it works (for the next thread)
- Picks live in localStorage `slate-picks`, per slate day: `{ list: [...], gone: {uid: 1} }`. `gone` = removed with ×.
- `betPicks()` drops picks whose game left the slate, then fills to 5 (unless frozen): upcoming games first, then live, then finished,
  three a game and two of a kind first. A tier is only used once every game in it (and the tiers before) has loaded.
- Games that started use the team's season leaders (summary leaders turn into tonight's leaders once a game starts).
- Tonight's numbers: `betResult()` reads the raw ESPN summary that `bxFetch` keeps in `bx.live[id].sum`; game totals use
  the live score. `bxRedraw` calls `betTouch()` to redraw the slate when a pick's number moves.

- Game totals show both teams' badges (3.52.11); they were a gray O/U box.
- Before 3.53.0: player props were the app's own milestones (BET_DEF rungs, the highest
  one a player reached in 5 of 6), not sportsbook lines. Game totals use the real posted over/under from ESPN's game summary
  (pickcenter, DraftKings), read when the picks are built (refreshed every 3 hours before a pick is locked).

## Open
- Real player prop lines: ESPN's free odds API (sports.core.api.espn.com .../odds/<provider>/propBets) may carry them;
  it couldn't be reached from the cloud sandbox to check. A paid feed needs DJ's OK first.
- Sportsbook prices for the props (none yet: the picks are stat-based only).
- Hit green is a fixed color; decide whether it should be the accent (see Known drift in docs/DESIGN.md).

## Decisions
- The six little stat boxes were replaced by a sentence in 3.43.0: DJ found words clearer.
- "Show all" was dropped in 3.40.0: it's always the seven.

## 3.53.0: real lines, a case both ways (DJ: "Don't give recommendations, but rather show the line and make an argument either way based on stats")
- Renamed Betting lines. No picks, no Hit/Miss: each card shows the posted line ("O/U 79.5 rushing yards"), an "Over:" and an
  "Under:" line built from the last six games (`betCase`), the book and its opening line. Settled: "Went over" / "Went under", neutral.
- Player lines: ESPN core odds API (sports.core.api.espn.com, CORS open, free). `betLines()` takes the provider with propBets
  (100 = DraftKings), reads every page, keeps "Total …" types mapped in `BET_DEF[].re`. Each line appears twice (over/under); deduped.
  NFL, NBA, WNBA, NHL only (`BET_PROPS`); college has none, so college gets game totals only.
- Up to 12 players a game (most lines first, then biggest scoring line); athlete doc gives name, position, team.
- Order is prominence, not lean (DJ wanted no recommendations): `BET_W` kind weight + rank of the line within its kind + a small lean tiebreak.
  Five max, freeze, ×/undo, three a game, two of a kind all kept.
- No player lines yet and more than 2h to start: `short`, re-checked every 30 min, and totals don't fill the spare spots meanwhile.
- localStorage keys moved to `slate-bets3` / `slate-picks2` (old picks don't carry over).
- Open: lines can move after a card is chosen; the card keeps the line it was chosen with.

## 3.54.0: one lean per card, plus context (DJ: "make it obvious whether the stats favor the over or the under", creative one-liners like back-to-backs)
- `betJudge`: stats lean (`betLean`, -2..2) + weighted facts from `betFacts`; under 0.4 total = too close, not shown. Card shows only the lean side's stats (`betCase`) and up to 3 facts that agree.
- Facts (all from ESPN, never guessed): back-to-back / 3–6 days rest (gamelog dates), key teammate out (injuries × team season leaders via `seasonFetch`),
  minutes trend (bball), home/road split, last game vs tonight's opponent (gamelog atVs/opponent), game total vs teams' recent totals (pace),
  spread ≥12 bball / ≥14 NFL, line move since open, wind ≥20 mph / ≤25° (NFL weather). Totals: back-to-back teams, key player out, wind.
- DJ's "Tatum vs Brown" example was read as the teammate angle: one star out, the others' usage goes up.
- Order: strongest lean first (edge×20) plus a little prominence. Two a game first pass, three if needed. Settled: green "✓ Went over" when the lean was right.
- localStorage keys `slate-bets4` / `slate-picks3`.
- Ideas not built: opponent defense vs position (no free per-position data found), revenge games (no former-team data).

## 3.54.1 (DJ: "Not using enough of the card")
- Card body (stats line, reasons, source) spans the full card from the left edge; only the name and line sit beside the badge.
- The lean / result tag leads the top row on the left; the right-hand number column is gone (the folded Duo clock and the menu button covered it).
  Tonight's number is its own line (`.bet-now`) once the game starts. Keep important things off the card's right edge.

## 3.65.3: closed by default, newsletters under it (DJ: "make betting line defaulted to close until opened", "once opened, it's always open for the user until closed")
- Open/closed is `state.slateFold.__betsOpen` (was `__bets` = closed, now dropped on the next tap). slateFold is saved in the person's
  Supabase settings, so the choice follows them across days and devices. Picks still load while closed, so the count shows on the header.
- `newsletterBlock()` moved below `betsBlock()` in 170-slate-page.js. Both appear only on the slate page.
