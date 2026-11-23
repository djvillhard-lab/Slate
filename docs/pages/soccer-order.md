# Soccer: home team first (3.130.5)

DJ (Nov 22, 2026): "Soccer home team should be on top or left side." This undoes 3.121.12 (away first for every sport).

- One rule, `homeFirst(g)` / `sideOrder(g)` / `sep(g)` in `040-live.js`: soccer = home first with "vs"; every other sport = away first with "@" ("vs" only on neutral ground). `pairText(g, fn, joiner)` joins two sides in that order (soccer swaps " at " for " vs ").
- Code that draws both sides itself uses `sideOrder(g)`: cards (`060`/`150`), matchup (`140`), team stats and box score tabs (`110`), Live feed chip row (`145`), soccer feed score bar, scorers, possession, match stats (`147`: SL/SR, the left/right CSS classes stay fd-tm-away = left), Best bets, My bets, News, search, Board picker.
- iPhone (no new build): the app always draws the "away" fields first, so soccer goes out with the sides swapped (`laFlip` in `040-live.js` for what the page sends; `laFlip` in `worker/alerts.js` for Live Activity starts/updates, the Board, and bet sides). Alerts text uses `pair()` in the worker.
- Known catch: the Watch refreshes scores from ESPN keyed "AWAY|HOME"; swapped soccer games don't match, so soccer scores on the Watch update only from the phone. A future iOS build could match either order.
- A Live Activity started before 3.130.5 and still running would get swapped scores against unswapped teams; none were running at ship time.
