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

## 3.68.7: no cut-off team names (open Duo right pane showed "Char…")
- `agFitNames()` at the end of 160-all-games.js runs after every `renderGames` (wrapped there, with `alignSides` first) and on resize.
  Per card: if any name is clipped, hide both records; if still clipped, both rows show the badge's abbreviation (full name kept in `title`).
- The card's main column is narrow there (about 160px at the Duo's zoom), so the record was what cost the room.

## 3.71.2: live one-liners in the team color
- `agLine` calls the slate's `hlTeamInk` (150-game-row.js, 3.71.0) on live lines, both the highlight and the standout-so-far line. Same contrast rule on both themes; lines about both teams stay red.

## 3.71.4: a game past its start that ESPN still has pre-game
- `livePoll` remembers ESPN pre-game sightings (`LIVE_PRE` in 040-live.js); `status()` returns upcoming with `late: true` for a game past its start but seen pre-game in the last 6 minutes. Cards say "Starting soon" (060-cards.js). Before, the clock fallback said Live with no score (Long Beach State at UCLA, late tip).
- `agLine` re-requests a preview older than 30 min on a "live" card, so stale ranks get redone.

## 3.81.1: watch links
- `statusSide` in 060-cards.js now gives All games the slate's channel block (watchLink, up to two, linkable first, ▶ marker). The old plain "ESPN / ABC" span is gone.
- `agFitNames` re-runs 120 ms after each draw and after fonts load, and treats any scrollWidth > clientWidth as cut (Chargers was off by 1px).

3.91.4 (DJ, Nov 17): live game cards on All games carry the same quick "Feed" button as the slate (`g-feed` in `150-game-row.js`, now for mode "games" as well as "lineup"). Live games only, every sport with a feed.

## 3.93.1: header counts line up
- On a league tab, the My teams header (it folds, so it has a chevron) put "1 game" toward the middle: the Live tag and the chevron both had auto margins and split the space. Now the count takes the auto margin, and plain headers on a page that has a folding one keep 26px on the right for the missing chevron, so every count ends at the same spot (measured equal on folded and iPhone).

## 3.95.1: speed (DJ: pages freezing with lots of games live)
- Profiled with `scripts/shots.py ... --profile 60` (new). With 20 live games, each 10-second score update rebuilt all 14 pages, hidden ones included (All games alone is 143 cards), and All games measured each card one at a time.
- `render()` (240-chrome.js) now redraws only pages that are on screen after `renderTop()`; a hidden page draws when it's opened (every way of opening a page calls render). A page renderer that touches something outside its own `#view-*` must be called when that other page shows too (renderNotify also runs on Settings).
- Score updates wait while a finger is on the screen or the page is moving (`liveRender` in 040-live.js), at most 20s.
- `agFitNames` resets, measures and changes all cards in batches. Date formatters are made once (030-helpers.js).
- Result on a fast computer: long stalls went from 23 in 90s (3.3s, up to 0.38s) to 10 (1.8s, about 0.18s each). Open: All games still rebuilds every card on each score update; next step would be swapping only the cards that changed.
