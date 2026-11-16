# All games
Last updated: Nov 16, 2026, 3.44.0
Code: `src/app/160-all-games.js`, the card in `150-game-row.js`, styles in `src/styles/040-components.css`.

## Done
- Live button on the right, in line with the cards (3.38.2, 3.38.4).
- Folded and open Duo: the secondary filters (All, Best of each league, National TV) run right to left, All at the far
  right; on the folded Duo the row runs into the side column, nudged down 6 points under the clock (3.38.5, 3.38.6).
  Regular iPhone: filters stay on the left in normal order.
- One-liners on every card, the slate's own lines: pre-game note, live standout in red, top performer after the final
  (3.39.0, `agLine`). A missing line is fetched only once its card has been on screen for 300 ms (`agSeen`).
- Worth a look reuses this card and replaces the card's line with its own, so only one line shows (3.39.2).
- Finished games are the same size as other cards (3.38.3).

## Open
- Live and finished one-liners have no fetch limit (only pre-game notes are capped at 3 at a time). Fine so far.

## Decisions
- No gutter or top spacing for the folded Duo's clock and Wi-Fi anywhere (DJ rejected both in 3.36.1 to 3.36.3).
- Box scores list everyone who played, no "top 6" and no fold behind a button (3.40.1, DJ asked).
- Headers: one compact header on every page (3.44.0); see docs/DESIGN.md. On the open Duo the slate pane's header is
  taller than a one-line page beside it; DJ hasn't objected.
