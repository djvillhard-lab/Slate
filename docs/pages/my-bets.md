# My bets (track your own bets)
Last updated: Nov 17, 2026, 3.87.1
Code: `src/app/176-my-bets.js` (everything, styles injected from the file as `#myb-css`). Hooks: `mybCard(g)` in `140-game.js`
(under the betting line), `mybBars(g)` in `150-game-row.js` (slate and All games cards), `mybBlock()` in `170-slate-page.js` (under Betting lines).

## Done (3.86.0, Drew's idea from in-app feedback; DJ chose "win/loss only")
- Matchup page: Your bets card with Add my bet (hidden after the final and on past days). Sheet: Spread / Moneyline / Total / Player
  (Player only where `BET_DEF` has the sport: football, basketball, hockey), side or Over/Under, the line. Soccer moneyline has a Draw.
- Prefill: spread and total from the game's posted line (same source as the odds strip: preview, box, then `sbOdds`). Player lines from
  `betLines()` (ESPN core odds, DraftKings, NFL/NBA/WNBA/NHL only). Players come from ESPN's team roster
  (`teams/<id>/roster`, team ids from the game summary); players with a posted line are listed first. College has no player lines: type it.
- Settling (`mybResult`): spread margin + line; moneyline (a tie is a push, lost in soccer); totals and player lines settle early once an over
  passes its line (won) or an under is passed (lost). Player numbers from the box score (`betBoxLine`), "Didn't play" = no bet (void).
  A settled result is saved on the bet (`res.fin` / `res.early`) so old days don't need scores.
- Live wording (`mybSay`): "covering by 2.5 / short by 1", "up 3 / down 2 / tied", "178 points so far, needs 23 more / room for 22 more".
- Slate: My bets (today's bets on any game), "Today: 1 won, 1 live" and "Last 7 days 9-5-1" (settled bets only). Fold state `state.slateFold.__myb`.
- Saved: localStorage `slate-mybets` and the account doc `data/users/<uid>/mybets` ({v, days: {date: {id: bet}}}, 120 days), merged per bet by `ed`
  (removals are kept as `del: 1` so they carry across phones). The other Duo pane picks changes up through the `storage` event.
- No stakes, odds or money (DJ's pick). No new iPhone build.

## 3.87.1 (DJ: "The card in my bets should include the line, spread, total etc." and "add color", same for the small note on the game card)
- Each bet is its own card (`.myb-bet`, `mybRow`): kind tag (`mybKind`: Spread / Puck line / Run line / Handicap, Moneyline, Total points, Player points),
  the matchup, the bet in 18px ("DUKE -8.5", "Under 166.5", "ILL to win +285", "Tatum over 25.5 points"), then a Won/Lost/Push tag or the red Live dot.
- Colors (`mybTone`, through `badgeColor`): the team bet on (a player's team for player lines) as a 4px edge and 10% tint, like News boxes;
  totals and draws split both teams' colors. Won adds an accent outline. The game card's note (`mybBars`) gets the same tint and the kind tag.
- Moneylines save the price shown when added (`b.price`), display only.

- 3.88.1 (DJ): the game card note drops "Your bet"; it starts with the kind tag.

## Open
- Not on the Live feed or in notifications yet (a "your bet" line on the live notification could ride the existing line field without a build).
- Parlays not supported. Stake/odds/profit was option 2 on DJ's card if he wants it later.
- Private only once DJ runs `docs/security/lockdown.sql` (data/users/* is personal); until then the docs table is readable like everything else.
- Not yet seen during a live game on a phone.
