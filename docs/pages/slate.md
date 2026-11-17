# Today's Slate
Last updated: Nov 17, 2026, 3.77.0

## Done
- Game cards line up one score column for the whole slate (fitScores in 240-chrome.js sets --tmw on #lineup-body):
  just past the longest team name, rank and record, the same spot on every card.
- 3.68.2: cards inside a folded time group (or a hidden slate) are skipped when measuring. They have no width,
  and measuring them set the column to 0px, so names vanished and scores printed over the records.

- 3.68.3: the Worth a look card no longer sets the column (it's narrower: its box and the +), so long names
  aren't cut on a regular iPhone; it gets its own --tmw sized to its width.

- 3.68.8: names never cut short. After fitScores, slateFitNames (170-slate-page.js) hides a cut card's records,
  then swaps both names for the badge abbreviations (STMN, LIU), like All games 3.68.7. fitScores calls
  slateUnfitNames first so the column is always measured from the full names.

- 3.71.0: a live game's one-liner is in the color of the team it's about (hlLine marks data-side; hlTeamInk in
  150-game-row.js uses pairColors, then lightens/darkens to 4.5:1 against --card). No side (both teams) = live red.
  Slate cards only; All games and Worth a look keep red.
- 3.71.0: preview lines take the card's ranks (pvCompute's 4th arg g), since ESPN's summary can lag a new poll.
- 3.72.0: football Scoring (quick look and matchup) is the live feed's own play box: fdPlayCard in 145-live-feed.js
  (pulled out of the feed loop), listed by fdScoringList from the summary the quick look already has. Oldest first.
  Checked team text colors: all 1,287 team colors (660 teams) reach 4.5:1 on Midnight and Sunday Paper after hlInk.
- 3.74.0: Top performers (boxStars in 140-game.js, quick look and matchup) are cards: team edge (hlInk color),
  the feed's jerseys (fdJersey football, hpJersey basketball, a numbered square otherwise; numbers from the
  summary), name + team, stat line always under the name.
  Scoring lists newest first (scoringBlock reverses both the boxes and the plain list).
- 3.75.0 (DJ): no big numbers; the right side holds up to three tags (tpTags(sport, v, over) for basketball, hockey,
  baseball, soccer; tpFootTags for football's summed groups), fd-tag pills. Under 340px wide the tags drop under the
  stat line (container query on .gv-watch). Box Office reuses tpTags and the tp- classes.
- 3.89.6 (DJ: one-liner wrapped on the folded Duo; "MSU: No. 2 Michigan St"): the stats line is `.hl-one` (one line); `pvStatAlts` gives shorter versions (filler cut, best fact alone, first clause) and `pvFit` keeps the longest that fits after layout. pvCompute names teams with the card's `awayShort`/`homeShort`; pvNode drops the `.hl-tm` prefix. Cached lines without g4 are recomputed.
- 3.89.3 (DJ: news line must not wrap): `.hl-news` is one line (nowrap, ellipsis only as a safety net). `pvnShorts` tightens the note by rule (club short names, filler words, "before he starts at X" -> "before joining X", trailing weekday) and offers a clause cut; after layout the longest version that fits is kept. No team prefix on the news line.
- 3.89.2 (DJ): `noteShort` in 150-game-row.js trims ESPN event notes for the league line (drops the "X lead a-b on aggregate" tail, "Concacaf/UEFA Nations League" to "Nations League", "2nd leg", leading "The"). The aggregate line in pvCompute scores 70 so it always leads.
- 3.89.1 (DJ: keep the original one-liners): the stats line never changes; pvNewsNode adds a second line `p.hl.hl-news` with a `.hl-news-tag` "📰 News" under it when pvNote scores 60+ (story tag or story words). Notifications send the stats line only. Styles at the end of 050-ux-review.css.
- 3.89.0 (DJ): preview lines use Claude's saved notes (105-pv-notes.js, pvBlend): mine/news-<date> game hits and team lines, newsdeep/<date>-g-<id> watch and number, state.previews bullets. Read with db get, 10-minute cache, or News's own nw.docs. pvNoteScore: tag (Schedule/Record/Ranking/Matchup/Aggregate skipped; Last game, Staff, Coaching, Storyline, Injury and similar 62, others 46) plus 16 for story words (final match, in charge, debut, return, fired...). Wins only over the stats line's top score (PV sc, stored since this version). Lines about another sport, start times and TV are dropped. No new Claude calls.
- 3.88.3 (DJ): preview lines (pvCompute): singular verbs for college and soccer (conj), no repeated verb when two facts about one team merge, soccer second legs lead with the aggregate (comp.series leg 2), spread and predictor never both. Saved lines without g2 are rewritten. Pochettino-style news angles come from Claude's saved notes since 3.89.0.
- 3.77.1 (DJ): Feed button on live games only, not finished ones (DJ, Nov 17).
- 3.77.0 (DJ): no bell on slate cards; a Feed button in its corner opens openFeed(g) (feedOk: live or final football and
  basketball). Notifications stay in the quick look. The Athletic Newsletters fold like Betting lines (slNlFold wraps
  newsletterBlock from 130-teams.js; slateFold.__nlShut, open by default).

## Open
- No position chip on Top performers: ESPN's game summary doesn't carry positions for these players.
- Live feed's own colors don't use hlInk: 36 teams' edge colors (white/yellow, e.g. Nets, Columbus Crew) barely show
  on Sunday Paper (fdTint only guards dark backgrounds), and 17 jerseys' numbers are under 3:1 (e.g. Marlins).
- Scoring boxes for other sports wait until DJ likes football's.
- The morning email's copy of pvCompute (worker/slate-kit.js) still uses the summary's ranks.
- If DJ likes team-colored lines, All games and Worth a look could follow.
- Open Duo's left pane is under 330px, so records hide there (050-ux-review.css container rule), by design.

## Decisions
- Keep one shared score column (3.31.0) rather than per-card positions, so scores line up down the page.
