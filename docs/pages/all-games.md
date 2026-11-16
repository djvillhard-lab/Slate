# All games
Last updated: Nov 16, 2026, 3.65.7
Code: `src/app/160-all-games.js`, the card in `150-game-row.js`, styles in `src/styles/040-components.css`.

## Done
- The second filter row (conferences, Top-10 team; also On TV's channel filters and Box Office's Ranked teams, all `.cf-tab` in a
  `.substrip`) looks like the league tabs, only smaller (3.65.7, DJ asked): 13px wide bold type (`font-stretch: 112%`), muted until
  picked, ink when picked, a 3px accent bar as wide as the word on the hairline. Styles in `src/styles/090-filter-rows.css`
  (040-components.css was claimed at the time); the 44-point touch area is a `::before`, so "All" keeps a short bar.
- Live button on the right, in line with the cards (3.38.2, 3.38.4).
- Secondary filters read left to right on every phone, All first (3.52.10, DJ asked; 3.38.5 to 3.52.9 ran them right to
  left on the Duo with All at the far right).
- Folded Duo: the Live button stops left of the side column (3.52.10): the clock and Wi-Fi reach that row since 3.44.0.
- 3.52.9: on the folded Duo both filter rows stop short of the side column again (padding + a fade mask, `--strip-w`), because
  after the compact header (3.44.0) the clock and Wi-Fi covered the right end, All included. A redraw keeps the second row's
  scroll and scrolls the picked filter into view (240-chrome.js). shots.py can now tap a league and a filter:
  `--league WCBB --filter "Both ranked"`.
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
