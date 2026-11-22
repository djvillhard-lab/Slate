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
- Brackets for other leagues wait for DJ to like the MLS one (his rule). Next candidates: NFL (seeds already in the standings; real bracket in January), College Football Playoff (12 teams, set Dec 6), NBA Cup knockouts (December), Champions League knockouts (February), March Madness.
- UCL, UEL and FA Cup are left out: group and cup formats need their own layout.
- MLB's clinch letters (ESPN `clincher`) and magic numbers aren't shown.

## Decisions
- Standings lives inside Teams, not as a new menu page: a new menu entry would need the Duo strip changed too, which is an iPhone build.
- No games-played column for soccer: it cut club names short on a regular iPhone, and W-D-L adds up to it.

## 3.108.1 (Nov 18): teams playing today for new people
- In `renderTeams` → `list()`: with nothing typed, no league picked and fewer than three teams followed, the result area lists up
  to 12 teams from the day's games (slate games first, teams already followed left out), using the normal `row(t)` with its star.
  Not "popular teams": Slate has no source for popularity, so it uses who is playing. The welcome walkthrough (232-welcome.js) already
  covers first-run team and league picking; Sign in with Apple needs an iPhone build and belongs to the Security thread.

## 3.113.15 (Nov 19): Claude's take expires after 24 hours
- DJ: Man United's take was still last Friday's. `TM_TAKE_TTL` (24 h) in 130-teams.js: a take older than that (or with no `at`)
  is hidden on the team page, with "Claude's take from <day> is more than a day old" and a "Write a fresh take" button.
- Decision: no automatic rewrite. Each take costs money and DJ's rule is that paid Claude runs only when tapped. The worker's
  12-hour share window (`SHARE_MIN.team`) is shorter than 24 h, so a tap on an expired take always writes a new one.
- Team takes now go through the ESPN fact check too (`teamFacts` in worker/factcheck.js turns the page's record and recent
  results into the preview checker's shape; dates in US Eastern).

## 3.118.0 (Nov 19): MLS Cup playoffs bracket
- `src/app/133-brackets.js` (styles injected as `#brk-css`). `sdgRender` calls `brkSeg(body, lg)` right after the league tabs: for a league in `BRK_LGS` with playoff games on ESPN it draws Table / Bracket (bracket first, `BRK.view[lg]` = "table" when picked) and the bracket.
- Data: ESPN scoreboard `?dates=YYYYMM` for last, this and next month (soccer won't take a date range), kept 10 minutes (1 minute while a game is live). Playoff games are picked by the season slug (`wild-card`, `round-one`, `semifinals`, `eastern/western-conference-playoffs---final`, `mls-cup`); canceled game 3s are dropped. Seeds = ESPN standings rank.
- Series: games grouped by ESPN's season type (each round-one series has its own) plus shared teams; wins counted from ESPN's `winner` flag (shootouts included). Tree slots follow MLS's fixed bracket (`slot1`: 1/8, 4/5, 2/7, 3/6; no reseeding). Later rounds before they're scheduled show the teams that already won the series feeding them, otherwise TBD.
- Tested on 2025's finished playoffs: `scripts/shots.py teams --espn-swap "dates=202610=>dates=202510,dates=202611=>dates=202511,dates=202612=>dates=202512,usa.1/standings=>usa.1/standings?season=2025"` (new shots.py option) plus an `--eval` that taps Standings, then MLS. It matched the real results (Miami beat Vancouver in MLS Cup).
- Decisions: the bracket sits in Standings, not a new menu page (that would need an iPhone build for the Duo strip). DJ picked MLS first (Nov 19) because it's the bracket being played right now.
- Open: a "Bracket" link from a playoff game's matchup page; other leagues (see Open above).

## 3.119.2 (Nov 19): DJ's bracket feedback
- DJ: "looks great". No matchup is open by default (`BRK.sel[lg]` starts empty; a tap opens, a second tap closes).
- MLS Cup moves above both conference trees once both finalists are set (ESPN's MLS Cup game has two teams, or both conference finals are won); at the bottom before that (`cupSet` / `cupBlock` in `brkRender`).

## 3.122.0 (Nov 22, 2026): "Generated by Claude <when>" on every Claude write-up
- DJ: "Everything in the app generated by Claude via buttons should show when it was last generated."
- One helper in `080-claude.js`: `clWhen(at)` ("today at 7:04 PM", "yesterday at…", weekday within a week, else "Nov 12 at…") and `clStamp(at, cls)` (a dim `.pv-at.cl-at` line, "Generated by Claude …"). Use it for any new Claude output.
- Team page: Claude's take shows the stamp (was "Written Sat 7:04 PM").
