# Teams, team pages and Standings
Last updated: Nov 18, 2026, 3.102.0
Code: `src/app/130-teams.js` (Teams page, team pages), `src/app/132-standings.js` (Standings tab; its styles are injected from the file as `#sdg-css`).

## Done
- 3.102.0 (DJ, from the Nov 18 competitor review): Standings tab on the Teams page. `sdgSeg` draws the My teams / Standings choice (`state.teamsTab`, not saved); `sdgRender` draws the league tabs (`SDG_LGS`), the Playoff picture / Divisions choice (`SDG_DIV` leagues; Divisions asks ESPN for `?level=3`), and one table per conference, division or league.
- Data: ESPN `apis/v2/sports/<path>/standings`, fetched by the phone, kept 10 minutes (`sdgLoad`). `sdgParse` keeps the first stat of each name (college repeats names for home, away and conference splits) and sorts by ESPN's `rank` (soccer) or `playoffSeed`.
- Playoff lines (`SDG_LINES`) are league rules, not stats: NFL 7, NBA 6 plus play-in at 10, WNBA 8, NHL 8, MLB 6. Soccer zone labels are ESPN's own note text (`sdgZone` shortens MLS's).
- Ways in: `openStandings(lg)` from the team page ("Standings" under the name) and the matchup's standings box ("Full standings", 140-game.js).

## Open
- A new person's My teams tab is still nearly empty (review item 10: offer popular teams).
- No brackets yet (playoffs, NCAA tournament). ESPN has them per league in season.
- UCL, UEL and FA Cup are left out: group and cup formats need their own layout.
- MLB's clinch letters (ESPN `clincher`) and magic numbers aren't shown.

## Decisions
- Standings lives inside Teams, not as a new menu page: a new menu entry would need the Duo strip changed too, which is an iPhone build.
- No games-played column for soccer: it cut club names short on a regular iPhone, and W-D-L adds up to it.
