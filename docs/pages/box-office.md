# Box Office (and Player rankings)
Last updated: Nov 17, 2026, 3.73.0

Code: `src/app/120-box-office.js` (Box Office = the `moments` view, `renderMoments`; Player rankings = the `best` view, `renderBest`, not in the menu). Styles: `src/styles/095-box-office.css` (plus older `rk-`/`mm-` rules in 040-components.css).

## Done
- League tabs show the day's game count beside the name ("NBA 8"), on both Box Office and Player rankings (3.73.0). `lgGameCount(day, lg)`: the day the app has loaded counts `games()` (same as All games); any other day reads ESPN's scoreboard once per day and league (dates day and day+1, kept to the Central day, like the rankings) and caches it in `gc`. Postponed, canceled, suspended and forfeited games don't count. Player rankings' ALL tab shows the total; ★ shows none.
- Count is `.lg-n`: about 70% of the tab size, `--dim`, `--muted` on the selected tab (DESIGN.md: counts are dim meta text).

## Open
- Nothing from DJ waiting on this page.

## Decisions
- DJ (Nov 17): wanted the per-league game count on the Box Office tabs for the picked day.
