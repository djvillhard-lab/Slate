# Box Office (and Player rankings)
Last updated: Nov 17, 2026, 3.78.0

Code: `src/app/120-box-office.js` (Box Office = the `moments` view, `renderMoments`; Player rankings = the `best` view, `renderBest`, not in the menu). Styles: `src/styles/095-box-office.css` (plus older `rk-`/`mm-` rules in 040-components.css).

## Done
- Game count: in the Top performers heading of the open league ("8 games · 1 live"), from `lgGameCount(day, lg)`: the loaded day counts `games()` (same as All games), other days read ESPN's scoreboard once and cache it. Postponed and canceled games don't count.

- Player cards (3.76.0, DJ: "the same design" as the slate's Top performers): `mmCard` draws top performers, overachievers and underachievers with the slate's tp- card look (tp- rules in 050-ux-review.css, owned by the slate page) plus Box Office's own grid in 095-box-office.css: rank (or ▲/▼), headshot (`playerFace`, shared helper: ESPN headshot in a team-color circle with the badge; DJ 3.76.1 preferred it to the jersey), name + position + team, stat line (each stat kept whole), Claude's why, a rare night-leader tag under the stats (`mmLeaders` + `MM_LEAD`: one per category to the league's leader in the list; ties of 3+ get none), and the game on the right (W/L score over vs/@ opp, or live clock).
- Rows carry `jer` (jersey) and `st` (ESPN box score labels → values; football keys are "group.LABEL", e.g. "passing.YDS"): scripts/standouts.py saves them, and the live rows (`rkGameRows`) add them too. Claude's over/under rows borrow color, jersey and `st` from the night's rankings by player id (or team) with `mmLookup`.
- Player rankings (`best` view) still uses the old `bestRow` and isn't in the menu.

## Open
- Best plus-minus tag: offered, DJ didn't pick it (3.78.0). Football/hockey season highs not built (only basketball points).
- Nights saved before 3.76.0 have no stat maps, so no leader tags. Could re-run standouts.py for recent nights if DJ wants them filled.
- "+12 vs avg" on over/underachievers needs season averages, which Box Office doesn't load yet (ESPN's athlete pages have them). Not built: DJ's rule is only stats a source provides.
- Nothing from DJ waiting on this page.

- Rare tags (3.78.0, `mmRare` → `mmTags`, shown before leader tags, two per card max): 👑 Triple-double (box score); 📈 Season-high N (basketball points, ESPN gamelog at site.api.espn.com/apis/common/v3/sports/<path>/athletes/<id>/gamelog, 5+ earlier games, 20+ pts pro / 15+ college, finals only, only the night's biggest jump past an old high); 🏆 Game-winner (basketball and football close finals: the go-ahead-for-good scoring play in the last 30 s / 2 min of regulation or OT, from the summary's plays / scoringPlays; football matches the scorer by name at the start of the play text).

## Decisions
- DJ (Nov 17, 3.77.3): no slate tags (tpTags) on Box Office, too many and hard to follow. Only night-leader tags, so most cards have none. Game result stays on the right.
- DJ (Nov 17, 3.76.1): no game counts on the league tabs (tried in 3.73.0, didn't like it); the count goes in the heading instead. Headshots, not jerseys, on Box Office cards.
- DJ (Nov 17): wanted the per-league game count on the Box Office tabs for the picked day.
