# Best bets
Last updated: Nov 15, 2026, 3.43.4 (written from the changelog; the thread that next works on it should correct anything off)
Code: `src/app/175-best-bets.js`, styles under "Best bets" in `src/styles/040-components.css`. Its own section at the bottom of Tonight's Slate.

## Done
- Stat-based picks from ESPN game logs only: a player's mark over his last six games, game totals vs the over/under from
  both teams' last five. Nothing projected (3.31.0).
- Always seven picks, fixed once chosen; follow the slate (a removed game's picks go, spots refill) (3.40.0).
- Live picks show tonight's number from the box score and settle as Hit or Miss; the top counts live/hit/missed (3.40.0, 3.41.0).
- × removes a pick for the day and the next best fills in, with Undo (3.41.0).
- Each card explains the pick in words instead of six stat boxes (3.43.0).

## Open
- Sportsbook prices for the props (none yet: the picks are stat-based only).
- Hit green is a fixed color; decide whether it should be the accent (see Known drift in docs/DESIGN.md).

## Decisions
- The six little stat boxes were replaced by a sentence in 3.43.0: DJ found words clearer.
- "Show all" was dropped in 3.40.0: it's always the seven.
