# App-wide search
Last updated: Nov 19, 2026, 3.119.0

Code: `src/app/236-search.js` (its styles are in the same file, `FIND_CSS`, so no shared stylesheet is touched).
One line each in shared files: `240-chrome.js` (the magnifier `#btn-find` shows on every page), `270-wiring.js`
(it calls `openFind()`), `070-navigation.js` (`goBack` asks `findBack()` right after `plrBack()`).

## Done
- The magnifier at the top right of every page's header opens a sheet (`#sheet-find`, the same sheet parts as the
  player page) with one box: "Teams, players or games". On the open Duo each pane has its own.
- Teams: `teamSearch` (the built-in list), top 5, your teams first, then an exact name ("north carolina" = Tar Heels),
  then teams playing on the day showing. Star = add to my teams (`toggleFav`). Tap = team page; a college opens the
  sport it plays that day, else the starred sport, else men's hoops (as on the Teams page).
- Games: the day the app is showing (`visibleGames()`), every word matching the start of a team, abbreviation,
  conference, league or channel word (or TEAM_ALIAS, e.g. "mizzou"); live first, then by start. 6 shown, "Show all N".
  Tap = matchup. This replaces the old All games filter box (`#search`, now never shown; its code is left in place).
- Players: ESPN's free search `site.api.espn.com/apis/search/v2?type=player&query=` (CORS open), 300 ms after typing
  stops, 3+ letters, cached per query. Only leagues Slate follows (`FIND_LG`; national-team slugs go to `intl`).
  Tap = `openPlayer` sheet on top of the search; its Close or Back returns to the search.
- Back closes the search; it remembers the last query (selected, so typing replaces it).

## Open
- No recent searches and nothing shown before typing beyond a one-line hint.
- The native iPhone menu and the Duo strip have no Search entry (would need an iPhone build). The header icon covers it.
- Games only for the day showing, not upcoming days (a team's next game is on its team page).
- Checked with scripts/shots.py on folded Duo, open Duo and iPhone (teams, games, players, taps into matchup, team
  and player pages). Not checked on a real phone with the keyboard up.
