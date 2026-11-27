# My bets (track your own bets)
Last updated: Nov 18, 2026, 3.106.0
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

- 3.88.2 (DJ): soccer spreads say Spread, not Handicap. Hockey still says Puck line and baseball Run line.

- 3.89.5 (DJ: the big Add my bet was "too prominent"): a small outlined "+ Add bet" (`mybChip`) at the end of the odds strip on the matchup page; the Your bets card only appears with bets. The quiet look is on purpose; don't make it a big button again.

- 3.99.0 (DJ: "easily add bets from the betting line to my bets"): each Betting lines card has "+ Add to My bets" (`mybLineBtn` from `betRow`): opens the sheet prefilled (`mybFromLine` → `mybOpen(g, pre)`) with the card's line, player and stat, and the lean side; Save confirms. Already added = "✓ In My bets". Checked on a live game (ILL at DUKE under, live status on the slate).

- 3.106.0 (DJ said yes to the Nov 18 review's "My bets completed"; this replaces the earlier "no stakes, odds or money" pick, but
  both boxes are optional so a bet with neither works exactly as before): the sheet has Odds (American, `b.odds`, |n| >= 100) and
  Stake (`b.stake`, dollars). A moneyline fills the posted price. `mybOddsOf` (odds, else the saved moneyline price), `mybNet`
  (settled money; null without a stake, or on a win with no odds), `mybMoneyLine` (the card's money line), `mybTotals(upTo, nDays)`
  (net of staked bets and the record per league). The slate block adds "up/down $X" to Last 7 days and a "Last 30 days" line by
  league once two leagues have settled bets. Checked with made-up bets on iPhone and folded Duo, and the sheet on iPhone.

- 3.109.0 parlays: saved beside the day's bets as `{ kind: "parlay", d, legs: [ids], odds?, stake? }`; legs keep living as normal
  bets with `par: <parlay id>` and are skipped by `mybRecord` / `mybTotals` (the parlay counts once, under "Parlays").
  `mybParResult` (lost on the first lost leg, push/void legs drop out), `mybParRow`, `mybParRemove` (legs become single bets again),
  the sheet `mybParOpen` / `mybParDraw` / `mybParAdd` (same `#sheet-myb`). `mybRes(b)` picks the right result function; anything
  that walks `mybList()` must not call `mybResult` on a parlay. Parlay odds are typed, never worked out.
  Checked with made-up bets (iPhone list, folded Duo sheet).

## 3.110.0: closing line (DJ, from the competitor review)
- No worker job: ESPN's core odds (`sports.core.api.espn.com/.../competitions/<ev>/odds`, DraftKings id 100) keep `close.pointSpread`, `close.total` and `close.moneyLine` after the game, and player lines keep their last pre-game number (`betLines`). Checked on ILL at DUKE (Nov 17): close DUKE -9.5, 167.5, ILL +350.
- `mybCloseNeed` reads it once per game after the start (`mybCloseGet`), saves `b.close = {v, src}` on every bet of that game (synced with the account), `mybClv` writes "Closing line X · yours was N points better/worse" (moneyline by implied chance, so it needs the price you saved). Green when better.
- Record line: "Beat the closing line W of N" over 7 days (`mybClvCount`). Parlays are left out.

- 3.113.6 (DJ): the game card note (`mybBars`) leaves out the final score (`mybSay(..., noScore)`); the card shows it already.

## Open
- Your line against the closing line is not built (the closing line would have to be saved at the start, in the worker).
- A parlay's legs must all be on the same day. Legs still show as single bets on their own game pages and cards.
- Not on the Live feed or in notifications yet (a "your bet" line on the live notification could ride the existing line field without a build).
- Parlays not supported. Stake/odds/profit was option 2 on DJ's card if he wants it later.
- Private only once DJ runs `docs/security/lockdown.sql` (data/users/* is personal); until then the docs table is readable like everything else.
- Not yet seen during a live game on a phone.

- 3.173.1 (DJ: "show I won the bet without forcing a second line"): the game card's bet note (`mybBars`) is one line: kind tag, the bet,
  then the result as a small tag at the end (`mybTag`: ✓ Won accent, ✗ Lost red, Push, No bet; live: Covering / Short 2 / Up 3 / Down 3 /
  Tied / Needs 4 / Room for 3 / Waiting). Its detail ("48 points", "by 2.5", "180 so far") sits before the tag in `.myb-dw`, which is one line
  tall: if the detail doesn't fit it wraps out of sight instead of making a second line. "already over" is gone from the card (the tag says
  Won while the card shows the game live). Only a very long player bet label can still wrap, and the tag stays on its first line.
  The My bets section rows (`mybRow`) keep the full `mybSay` wording. Checked folded and iPhone with test bets (won, lost, push, live).
