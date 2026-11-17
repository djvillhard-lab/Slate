# Box Office (and Player rankings)
Last updated: Nov 17, 2026, 3.76.0

Code: `src/app/120-box-office.js` (Box Office = the `moments` view, `renderMoments`; Player rankings = the `best` view, `renderBest`, not in the menu). Styles: `src/styles/095-box-office.css` (plus older `rk-`/`mm-` rules in 040-components.css).

## Done
- League tabs show the day's game count beside the name ("NBA 8"), on both Box Office and Player rankings (3.73.0). `lgGameCount(day, lg)`: the day the app has loaded counts `games()` (same as All games); any other day reads ESPN's scoreboard once per day and league (dates day and day+1, kept to the Central day, like the rankings) and caches it in `gc`. Postponed, canceled, suspended and forfeited games don't count. Player rankings' ALL tab shows the total; ★ shows none.
- Count is `.lg-n`: about 70% of the tab size, `--dim`, `--muted` on the selected tab (DESIGN.md: counts are dim meta text).

- Player cards (3.76.0, DJ: "the same design" as the slate's Top performers): `mmCard` draws top performers, overachievers and underachievers with the slate's tp- card look (tp- rules in 050-ux-review.css, owned by the slate page) plus Box Office's own grid in 095-box-office.css: rank (or ▲/▼), jersey (fdJersey / hpJersey via a one-team stand-in game; tp-num square for hockey, baseball, soccer), name + position + team, stat line (each stat kept whole), the game (W/L score vs opp, or live clock), Claude's why, and the slate's tags on the right (`tpTags` / `tpFootTags` in 140-game.js; football's numbers come from `mmFoot`). Tags drop under the stats when the list is under 400px wide (container query).
- Rows carry `jer` (jersey) and `st` (ESPN box score labels → values; football keys are "group.LABEL", e.g. "passing.YDS"): scripts/standouts.py saves them, and the live rows (`rkGameRows`) add them too. Claude's over/under rows borrow color, jersey and `st` from the night's rankings by player id (or team) with `mmLookup`.
- Player rankings (`best` view) still uses the old `bestRow` and isn't in the menu.

## Open
- Nights saved before 3.76.0 have no jersey numbers or tags (blank jerseys). Could re-run standouts.py for recent nights if DJ wants them filled.
- "+12 vs avg" on over/underachievers needs season averages, which Box Office doesn't load yet (ESPN's athlete pages have them). Not built: DJ's rule is only stats a source provides.
- Nothing from DJ waiting on this page.

## Decisions
- DJ (Nov 17): wanted the per-league game count on the Box Office tabs for the picked day.
