# Best bets
Last updated: Nov 16, 2026, 3.52.11
Code: `src/app/175-best-bets.js`, styles under "Best bets" in `src/styles/040-components.css`. Its own section on Tonight's Slate, at the bottom of the slate, below Finished. (3.49.0 moved it above Finished; DJ had it moved back in 3.51.2. Don't move it up again.)

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
- Where the numbers come from (DJ asked, Nov 16): player props are the app's own milestones (BET_DEF rungs, the highest
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
