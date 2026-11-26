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
- 3.91.1 (DJ): the stripe is always 50/50 of the card's height; no more measuring the team rows.
- 3.91.0 (DJ: News game cards' colors on all matchup cards): `teamStripe(box, g, rowSel)` in 155-team-stripe.js adds `.tstripe` with --ts-a/--ts-h from pairColors and measures --ts-split between the two team rows after layout; CSS at the end of 050-ux-review.css paints two 4px pieces on a card-sized ::before (rounded with the card). Used by gameRow (every .g.panel), the matchup header (.gv-head), and bet cards (teamStripe1 for a player line).
- 3.90.5 (DJ: lines still cut with … on All games): `pvCuts` lists every shorter version (brackets removed, then cut at each clause word), longest first, for both the news line and the stats line; All games stats line gets `.hl-one` + `pvFit` in 150-game-row.js.
- 3.90.2 (DJ: lines update with every new News page): `pvnGet` watches each source with onSnapshot (mine/news-<date>, newsdeep l-<league>) instead of a 10-minute get; a changed snapshot redraws the slate and All games, and `pvNewsIndex` rebuilds when any source object changes.
- 3.90.0 (DJ: news first, on All games too): `pvNewsIndex` gathers today's Claude notes once (mine/news game hits, top stories with team, team lines, league hits; newsdeep l-<league> briefing lead, latest, injuries for leagues with cards drawn; an open game breakdown; preview bullets) by game id and by team; `pvNote` only looks a card up there. `pvnSide` matches full name, card name, or a full-name start at least as long as the card name. All games appends `pvNewsNode` for upcoming games (150-game-row.js, no 160 change).
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

## One-liner fallback facts (3.91.2)
When no strong fact exists, pvCompute (100-highlights.js) now tries quieter facts before the plain records line: a slump (1 or 0 wins in the last five), division leader by N games or last in the division (pro leagues only, 8+ games played, from the summary's standings groups), a .700+ home/road record (6+ games), ESPN's predictor at 58–84%, and the better team's top scorer (basketball). Cached records-only lines (fb) are dropped on load so they recompute.

## Last season's games in "last five" (3.91.3)
ESPN's lastFiveGames pads early-season lists with last season's games (Central Michigan's March loss on a 4-0 team). `l5Season(events, gameDate)` in 080-claude.js keeps this season only (cut at a 60+ day gap, drop anything 60+ days old). Used by trimEspn (Claude facts: `last5[].newestFirst`, dated), pvCompute form, Best bets totals, slate-kit (regenerated with email_kit.py) and tick.py (`season_only`). The worker RULES now make Claude check every result and "last game" against the record. Old previews keep their text until regenerated.

## Color edge order (3.91.6)
`teamStripe(box, g, order)` paints the top half with the color of the team listed on top: `sideOrder(g)` by default (soccer lists home first), or an explicit order (Betting lines game totals pass ["away","home"] because their badges are away over home).

## Playoff games (3.93.0)
scripts/slates.py `playoff_round()` sets `g.post = true` for postseason games: ESPN season type 3 / slug "post-season" (US leagues, college), or an MLS round slug ("eastern-conference-playoffs---round-one" → note "MLS Cup Playoffs · East Round One"; MLS playoff games have no ESPN note). The series summary is appended to the note. pvCompute adds a "pser" series line (72) and drops regular-season-only facts (div, table, season series) when post. clGame sends `post` to previews, News facts send `playoff`; the worker prompts tell Claude to frame them as playoffs. Other soccer cups already carry rounds in note/stage. Existing slates pick it up on the next slates.py run.

## Nothing the record already shows (3.101.3)
DJ (Nov 18, 2026): one-liners must add what the record does not. pvCompute clears a team's form when its games played <= the last-five window, skips a win streak when the team has no losses (or a losing streak with no wins), and no longer adds "still unbeaten" (unb0, unbs) or "looking for a first win". Cache flag is g5, so old lines recompute.

## Worth watching back (3.103.0)
DJ, from the Nov 18 competitor review. `src/app/152-watch-back.js`: `wwbCompute(lg, sum)` counts facts from ESPN's summary (`plays`, or `scoringPlays` in football): overtime or shootout, lead changes (basketball: 3+ in the last period and overtime; football: 3+ all game), the winning side going in front for good in the last 30 or 10 seconds (basketball) or the last two minutes or overtime (football), a one-possession (3), one-score (8) or one-goal finish, and a comeback from 15 (basketball), 14 (football) or 2 goals (hockey). Three facts at most. Never a team or a score, so it shows with scores hidden. Saved per game in `localStorage` `slate-wwb` for four days (`wwbPut`, called from bxFetch in 110-box-score.js); `wwbNode` in gameRow draws it on finished cards on the slate and All games and asks for the summary once if nothing is saved (All games: only after the card has been on screen, `agSeen`). Checked against the Nov 17 NBA night (Timberwolves 106-105 on a layup with 2.6 left; Lakers in overtime after trailing by 18).
Open: soccer and baseball (no facts yet); hockey has no late-goal fact because ESPN's hockey clock counts up; the thresholds are our own choices, so say if DJ wants them moved. `scripts/shots.py --yesterday` now opens the day before.
Tag wording (3.134.2): DJ found "Worth watching back" too long, so the tag reads "▶ Rewatch" (the ▶ forced to text style with U+FE0E so iOS doesn't draw an emoji). Other options offered: "Replay", "Watch back".

## Spread check (3.111.1)
The favorite line needs pickcenter.spread to match the number in details (and be 45 or under); otherwise details is a moneyline and the line is skipped.

## Bet line vs Feed button (Nov 18, 2026)
On a live card with a Feed button, the last .myb-bar gets margin-right 72px (050-ux-review.css) so its text wraps clear of the button. pvCompute no longer joins a same-team second fact onto a line that names both teams (has "; " or starts "Both").

## Accuracy review (3.113.2, DJ: "lots of errors in the claude summaries and the one-liners")
Checked all of Nov 18–19's one-liners (236 games) against ESPN with the new `node scripts/lines_check.js`: it runs the real pvCompute/pvStatAlts from src/app and flags streaks longer than the record, "N of its last N", "100% chance", a second fact joined onto the wrong team, a spread on the wrong team, and shortened versions that end on a fragment. Exits 1 when anything is flagged. Run it after any change to 100-highlights.js or 105-pv-notes.js. Before 3.113.2: 36 flagged; after: 0.
- ESPN's predictor is shown at 99% at most. form5/slump lines never say "five of its last five" / "lost five of its last five" (they stepped in when the streak line was left out on an unbeaten record).
- pvCuts never keeps a cut that ends on a fragment (PVN_DANGLE: a word or two after a comma, or a dangling verb like "takes").
- Claude side (080-claude.js, worker/index.js): last5 dates and the game's `day` (clGame) are US Eastern via clDay; the worker's "Today is" is Eastern (etToday). RULES now cover dates, last season vs this season (web results checked against this season's dated results), head-to-head = "last N meetings", numbers-only player lines. `tidy()` in the worker rewords or drops first-person sentences and drops Watch/Stars entries without a number, before saving.
- Open: Claude write-ups saved before 3.113.2 keep their text (today's Celtics–Nuggets preview still has the late dates) until they're written again. A second-opinion check by a cheaper model on each write-up was considered and left for DJ (costs money per write-up).

## Server fact check (3.113.3, DJ: "I do want the server check"; DJ declined a "Wrong fact?" tap)
`worker/factcheck.js` runs on every preview, recap, game breakdown (deep g) and News page before it's saved (worker/index.js save step). It only leaves sentences out, never rewrites. It checks against the facts sent with the write-up: each team's record, and this season's dated results (`last5[].newestFirst`, now with the opponent's full name, "Nov 13: L vs Georgetown Hoyas (GTWN) 85-78"). Catches: a score paired with the wrong date; a record next to a team's name that isn't its record (recaps allow the record either side of the game; "would/if" sentences skipped); a win or loss against a team not on this season's schedule, only when the dated results cover the whole season (early season, where the errors were); streaks the results or record don't allow; "unbeaten"/"winless" against the record. What was left out is saved with the write-up as `fc` [{where, said, why}] and logged ("fact check left out").
Tested on Nov 16–18's saved write-ups (rebuilding pre-game facts from team schedules): 13 wrong sentences caught, 0 correct ones dropped. A test lives in this thread's notes only; to re-test, run factCheck from worker/factcheck.js on a write-up with trimEspn facts from worker/slate-kit.js.
Not covered: "all on the road"-type claims, standings ("second in the East"), player stats. A paid second-opinion check (Haiku) is on hold until DJ asks.

## Rules from DJ (3.113.4)
- "Won it on …" (hlWinner, finals): only when the deciding score kept the game close: basketball final margin 3 or less, football 8 or less (hockey, soccer, baseball walk-offs unchanged). Otherwise hlWinner returns null and the next line wins. DJ: Notre Dame 110-100 in OT "didn't really win the game on this guy's three".
- 📰 News line (pvNoteScore): a team's last result is not news on its own (DJ: "a team losing their game before isn't newsworthy"). "Last game"/"Result" tags and notes that open "<Team> lost/beat/won…" score -1 unless they carry PVN_WOW story words; "last game" left PVN_TOP and PVN_WOW. The News page prompt no longer offers a "Last game" tag and says a hit is never just a previous result.

**3.113.5 (Nov 18, DJ: "Text cut off"):** the 📰 News line wraps to its full text now (no ellipsis, no clause cuts; that reverses 3.89.3's one-line rule because the cuts read as fragments). Notes that tie a player to the other team are dropped: `wrongTeamLine` in 105-pv-notes.js (players from the game's ESPN summary leaders and injuries, `pvnPlayers`) and the same function in worker/factcheck.js (players from facts.leaders/injuries). It only fires on ownership phrases ("the Heat's Giannis", "Heat star Giannis", "the Heat's depth beyond Giannis", "Giannis leads the Heat"), so "Giannis faces the Heat" stays. Limit: the client check needs the game's ESPN summary loaded; the News page itself has no player list, so the server check doesn't cover it.

**3.113.7:** saved final lines (this phone's `slate-hlc` copy, the day's `live/<date>` doc, the in-memory line) go through `hlStaleWin` in 100-highlights.js: a "won it" line with a final margin over 3 (basketball) or 8 (football) is skipped, the phone copy deleted, and the game refetched so the line is worked out again.

## Full width (Nov 18, 2026)
.wwb has grid-column 1 / -1: the card is a grid, and without it the line stayed in the team column and wrapped early.

**3.113.9 (Players to watch):** a note claiming a team lead (top/leads/best/both…) is rewritten from ESPN season stats by `pwNote`/`pwLeads` in 080-claude.js (basketball: points, rebounds, assists; players with at least half the team's most games). Leads nothing = note dropped. Worker prompt asks Claude to name the stat.

**3.113.10 (DJ: "some of these one-liners provide no value"):** `pvBlandHead` drops ESPN's preview headline when it only restates the matchup (team + take on/host/visit…, no number, no other name); pvNode hides the plain records fallback (p.fb) and such saved headlines; `pvAllHome` skips a home/road record equal to the whole record. Both functions are in lines_check.js and email_kit.py's lists.

## Ranks are not news (3.120.3)
pvBlandHead strips "No. 8" / "#8" / "8th-ranked" before its has-a-number test, so "No. 8 Houston faces No. 11 Kansas" counts as matchup-only filler. lines_check.js flags any line pvBlandHead calls filler.

## Verified against the card record (3.120.4)
pvCompute stores the total records it used (recs); pvRecOff hides a line whose records differ from g.awayRecord/g.homeRecord (checked when computed and when drawn; cache flag g6). Home/road records bigger than the total are dropped. Soccer form only counts games in the same competition. slates.py refreshes slates/D-ncaa* documents that already exist for days 2+ ahead (they went stale after an early load). lines_check.js flags home/road records bigger than the total and treats a missing record as unknown.

## Early-loaded days stay fresh (Nov 20, 2026)
tick.py slates_work: after the morning check, any slates/D-ncaa* document 2-7 days ahead older than 6 hours is refreshed (one day per tick) through slates.run(non-full), which rewrites existing college documents.

## 3.121.0 (Nov 20, 2026): records update in the app
- 040-live.js: REC_NOW (league|team → record) is learned from every ESPN scoreboard read (livePoll, plus recSweep: one scoreboard per league and day shown, at most every 30 min, no retries). games() applies it via recApply. A game going final re-checks its day's records 5 min later.
- 100-highlights.js pvNode: a cached line whose records disagree with the card is rebuilt within a minute instead of 30.

## 3.121.1 (Nov 20, 2026): a one-liner on every game
- DJ: "We need some one-liner text to show for every slate game." pvCompute's last real-fact fallbacks (below pred/scorer): goals leader (hockey, soccer, 19), division place (pro, 16), soccer table places (15), any home/road split not already used (12-15). NHL div lines use PTS (no GB in hockey standings).
- `node scripts/lines_check.js --missing` lists games with no usable line; Nov 20-22: only TBD-vs-TBD tournament games.

## 3.121.4 (Nov 20, 2026): game count
- Drew (feedback 20261120152537-bro-8074): "N games on your slate" (.sl-count, 050-ux-review.css) sits above the Time/League/Board/Live row in renderLineup; counts the whole day even with Live only on.

## 3.121.5 (Nov 20, 2026): the odd game, by name
- DJ: "I'd like to know who Murray State lost to." form5/slump lines add ", losing only to X" / ", beating only X" (+ " last time out" when it was the latest game), from lastFiveGames opponent; short name from TEAM_LIST col 6. A line with a ", " clause is never "and"-merged with a same-team fact. Soccer slump needs no draws.

## 3.121.7
- PV cache flag g6 -> g7: saved lines from before 3.121.5 are dropped on load. Bump it again whenever line wording changes and DJ needs it at once.
- 3.121.8: pvStatAlts (105-pv-notes.js) adds short forms of the odd-game line ("X's only loss in the last five: Y", "X's lone loss in five: Y") ahead of pvCuts, which used to drop the clause on one-line cards.

## 3.121.10 (Nov 21, 2026)
- Worth a look hide X (.wal-x) gets margin-right = strip width on html.side-col (not in the left pane), like .rlink, so the folded island never covers it.

## 3.131.1 (Nov 25, 2026): the same one-liner on every phone
- DJ: "one liners on regular iPhone are shorter than duo. Make sure all are the same, lean towards the longer current versions and make them two lines if needed." The shortening was in drawing, not in writing the line: `.hl-one` forced one line and `pvFit` swapped in the longest shorter version (`pvStatAlts`) that fit, so the 390pt iPhone got shorter lines than the wider folded Duo.
- Now `.hl-one` wraps (no clamp) and pvNode / All games no longer call pvFit, so every phone shows the full line, two lines when needed. `pvFit`, `pvStatAlts` and `pvCuts` stay in 105-pv-notes.js (unused by the stats line now); lines_check.js no longer flags shorter versions.
