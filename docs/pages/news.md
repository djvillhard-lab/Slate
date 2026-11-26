# News
Last updated: Nov 25, 2026, 3.131.3
Code: `src/app/200-news.js`, styles under "News (3.45.0)" at the end of `src/styles/040-components.css` (`nx-` classes),
server prompts and saving in `worker/index.js` (kind `news` key `page`, and kind `deep`). Mockups DJ approved:
https://claude.ai/artifact/AhuwhXUWpb47z1e13SGP7C

## Done
- Injuries, trades and signings (3.115.0, DJ picked News over team pages): `src/app/205-wire.js`, styles injected as `#wire-css`.
  Data from the worker's `GET /api/wire?lg=` (`worker/wire.js`): ESPN's league-wide `injuries` and `transactions?limit=120`,
  trimmed (ESPN's NFL report is ~9 MB because it lists healthy players as "Active"; those are dropped) and cached 20 minutes.
  Leagues: NFL, NBA, NHL, MLB, WNBA (ESPN has nothing for soccer; college is near empty). Press Box: "Injuries and moves",
  one card per followed team (`wirePress`): injuries from the last 45 days (off-season notes go stale), worst status first,
  then moves from the last 10 days; closed shows 4 injuries + 3 moves. League tabs (`wireLeague`, placed under the briefing's
  top card by `wirePlace`): injury changes from the last 3 days as red headshot boxes, then trades/signings/injury-list moves
  from 7 days, minus practice squad and minor-league shuffles (`wireMinor`), your teams first. `wireKind` labels each move.
  ESPN's `returnDate` is left out on purpose: it's often a placeholder (MLB "Mar 1"). shots.py serves /api/wire from
  the local worker/wire.js (`scripts/wire_local.mjs`), so worker changes show before they deploy.
- Tabs (3.80.0, DJ's ask: "the current news page called something special, first and default in a row of filter
  tabs, then one-click news for each league"): the row is the app's league tabs (`.strip` / `.lg-tab`, as in Box Office),
  built in `nwStrip()`. First tab **Press Box** (`NW_HOME`) is the personal page below; News opens on it, and the picked
  tab lasts while the app is open (`nw.lg`, null = Press Box). Then one tab per league, in the All games order
  (`state.gamesOrder`, else `ORDER`; `nwBriefLgs()`). Names offered to DJ: Press Box (picked, echoes Box Office),
  The Wire, Newsroom. Renaming = change `NW_HOME`.
- League briefing (`nwRenderBriefTop` + `nwRenderDeep(body, brief)`): the same shared doc as a league breakdown,
  always for today: `newsdeep/<today>-l-<league>`. Top card: "<League> briefing", Updated time + how long ago, and
  one button: Generate (no briefing yet today) or Update (one tap, no confirm). Claude writes only on that tap. The
  tap re-fetches the ESPN and Athletic headlines (`nwFeed(lg, true)`), sends 20 of them plus today's league games
  (slate first). Worker prompt for `l-` keys is a briefing ("newest first", up to 3 searches) and adds `latest`
  (4-6 newest stories, rendered right after the take).
- Redesign (3.82.0, DJ: "match the live feed designs, be creative"): styles in `050-ux-review.css` ("News redesign"),
  overriding the older `nx-` rules in 040. Every story is a feed box (`nwBox`): 4px edge + light tint in the team's color
  (`--nx-team` via `nwTint`), meta row with logo + team (`nwTeam` matches Claude's team name to the app's teams) and tag
  pills on the right (`nwPill`, one emoji from `nwCatEm`'s list; 🚨 NEW for today's). Players are Box Office headshots
  (`nwFace` → `playerFace`); ids come from ESPN's athlete tags on the news feed, else the team roster
  (`teams/<abbr>/roster`, pro leagues; college often misses and shows initials). Briefings: The big story (ESPN photo
  when Claude names the headline url), Latest boxes, the number, hot (red) / cold (blue) columns, Performances cards,
  Injuries as red timeout boxes, Read more with photos. Press Box: top five as feed boxes, game cards with both teams'
  colors on the edge, team tiles tinted. Worker: briefing adds `lead`, team on latest/number, player+team on perf,
  injuries as {player, team, status, text} (old string injuries still render); Press Box top items carry team + lg.
- Photos (3.82.1): `nwPic` asks ESPN's combiner for a phone-sized copy; `nwImg` keeps one <img> per picture across
  redraws (redraws happen as rosters arrive). An Athletic lead (no photo) borrows the newest ESPN photo about its team.
- News is always today (3.83.2, DJ: Regenerate showed last night's games): the app keeps its day while left open, so
  `renderNews` moves the app to `todayInHome()` when News is shown on an earlier day (rolls at 4 AM Central).
- Top five and quick hits (3.83.3, DJ: "#5 should show Detroit Lions and NFL, since that's why it was chosen"): every top
  story shows its team (Claude's `team`, else `nwFindTeam` finds a full name or a nickname unique in its league; with no league,
  the page's leagues are tried) and a why pill (3.83.4, DJ: beside the team name, top left; `nwBox(..., why)`; other tags top right): ⭐ My team, 📺 On your slate, or the league tag with its sport emoji. Quick hits on
  game and league cards are feed boxes (`nwBoxHits`). Worker asks for `team` on top stories (lg always) and on hits.
- League section stories (3.83.5, DJ: "read as headlines"): the page prompt asks for 3-5 hits per league, each a 2-3 sentence
  summary (30-55 words); saved up to 520 characters (`hits(x.hits, 6, 520)`). Game hits stay one line.
- Swipe (3.82.0, DJ): sideways on News moves between Press Box and the league tabs, never Back (mode "news" in
  280-ios-bridge.js, `nwSwipe`); ends spring back; a breakdown page has no swipe. Works per pane on the open Duo.
- On Press Box, a league card's button is "<TAG> briefing" and switches to that league's tab.
- Options screen ("Customize today's news", 3.47.1): three groups, Today's slate, My teams, Leagues. No group
  checkmarks and nothing picked to start; the user picks each game, team and league (chips), with "n of N picked" and
  All / Clear per group. Game chip = league tag and time above the two team badges; team chip = badge + league tag.
  Saved on the phone (`slate-newspicks`: `gs` = picked game ids for one day, `gt` = the teams of those games, so their games start
  picked on a new day (3.49.1), `ts` = picked teams, `lgs` = leagues).
  A running clock shows while Claude writes.
- One Claude request writes the page to `mine/news-<date>`: top (10), games, teams, leagues. Free ESPN and Athletic
  headlines are gathered in the app and sent as facts.
- Page: Generated bar (time, how long ago, what it covered) + Regenerate (reopens the options); Top news, collapsible
  and remembered (`slate-newstop`), with New tags after a regenerate; Games | Teams | Leagues tabs, leftmost first.
- Breakdowns: "Claude's breakdown" on a game or league card, or a team tile, opens the breakdown page. A saved one shows
  right away; otherwise the page has a Generate button and Claude writes only on that tap (3.51.1). It's saved to `newsdeep/<date>-<g|t|l>-…`, shared by every account.
- Back (dock, swipe, or the row on top) returns from a breakdown to the page: one line in `goBack()` (070-navigation).
- Every generate, regenerate and breakdown goes through `/api/summary`, so testers' 10-a-day cap counts them.
- Quick hits in the top-five look (3.84.0, DJ: "No color. Bad formatting"): `nwFindTeam` finds the team from the hit's words
  (earliest match of full name, school, unique city or pro nickname; game cards only consider the two teams). No team gives
  class `lgx` (accent edge) with a league pill. A tag equal to the team name is dropped.
- Top news is 10 stories (3.84.0, DJ): five show, `.nx-more` "Show 5 more"/"Show fewer" (localStorage `slate-newsmore`).
  Heading is just "Top news" (DJ didn't want "Claude's picks"). Order in the prompt: breaking (anywhere in sports), then
  my teams and leagues, then big headlines from around sports. Facts get `headlines.around` (newest 5 from nfl, nba,
  ncaaf, ncaam, mlb, nhl, epl). Each story has `reason` (breaking/mine/trending/league); the why pill is 🚨 Breaking
  first, then ⭐ My team, 📺 On your slate, 🔥 Trending, then the league tag.

- Game-card notes (3.84.1, DJ: label row "doesn't add anything"): `nwBoxHits(list, lg, only)` with `only` (a game) draws
  bare boxes: no logo/name/league row, tag floats top right, tinted in the note's team color. Sorted away team, home team,
  then matchup (`.mx`: two-color edge and a blended tint; any note with no team of the two, or tag Matchup). The prompt
  asks for 5 per game: 2 away, 2 home, 1 Matchup; saved `hits(g.hits, 5)`. League section hits keep the label row.
- Show 5 more only appears when a page has more than 5 top stories (pages written from 3.84.0 on).
- National teams (3.85.1, DJ: Haiti-USA notes all one blue): `NATION_COLORS` / `nationColors(name)` in 045-team-logos.js
  (about 85 countries, flag and kit colors) win over ESPN's in `pairColors` for any team not in the app's club list, so it
  applies app-wide. News `nwSides(g)` makes a pseudo team for a nation (main from pairColors, second from the flag,
  aliases like us/usmnt/americans in `k`); its notes are one color (3.90.4: the two-color flag edge read as both teams', removed). Notes match by `h.team` first.
- Top news pills swapped (3.90.3, DJ): the story's tag sits beside the team name, the why pill (Breaking, My team, On your
  slate, Trending, league) top right with NEW. Reverses 3.83.4 for Top news only; quick hits are unchanged.
- Game notes colors (3.90.4, DJ): a team note is that team's color only; only a Matchup-tagged note is split (`.mx`); a
  note about neither team gets the accent (`lgx`). Game header uses `noteShort` from 150-game-row.js like the slate.
- Headline precision (3.90.4, DJ: "ends Lions season" for one player's injury): RULES in worker/index.js (all prompts) now
  ends with a reread-and-fix check that each line names exactly who is affected and never widens it.
- While Claude writes (3.93.2, DJ: the timer sat top right under the island on the folded Duo and the open Duo's right
  pane): `nwWriting` replaces the page (options, Press Box page, or a league briefing) with one centered card holding the
  clock (`.nx-wr`). The league tabs stay so swipe still works. No timer in any top corner.
- Big story photo (3.94.2, DJ: a Pochettino story showed Ratcliffe): `nwFeed` keeps ESPN's photo name/caption (`inm`);
  `nwLeadPic` takes capitalized headline words that aren't team-name words in that league (the person) and uses only a
  photo whose name has one, from the story or any feed item; none, no photo. Team-only headlines keep the 3.82.1 rule.
- No first person (3.94.2, DJ): RULES say write as a news report, no I/we, no "I found"; date a fact that may be stale.
- Logos (3.94.2): an empty ESPN team list no longer gets saved for a week (045-team-logos.js); couldn't reproduce DJ's
  missing Premier League logos on the test account.
- Lost taps (3.100.6, DJ's phone log): `renderNews` waits while a finger is down and 0.4s after (agBusy/agTapping from
  160-all-games.js); `renderNews(true)` for swipe, league tab pick, opening/closing a breakdown. The redraw loop came from
  3.94.2's logo change (an empty ESPN league list was re-fetched on every missing logo); reverted the due rule.
- Logos (3.105.1, DJ's picker showed DAY/SIUE/MAN/STL letters): lists saved empty on a phone are refetched (once per two
  minutes, `tried` stamp), 25s cap per download, localStorage key now slate-logos-v2 (fresh start). 045-team-logos.js.
## Open
- Sizes confirmed with real generates on the test profile (Nov 16): 3 games/4 teams/4 leagues in 62 s, 12/13/4 in 98 s,
  both inside the 24,000-token limit. DJ's Nov 16 "it fails on a small selection" report was the old failure's
  `writing.error` still showing; 3.49.1 shows a failure for 30 minutes at most and hides it once a pick changes.
  The worker no longer returns the 3-minute-old page for a News regenerate, and a too-long failure isn't counted
  toward a tester's 10 (`stats/usage` day.fail).
- A full slate (26 games) plus all teams is untested and may take 2 to 3 minutes (one long Claude answer). If DJ wants it faster, split the
  page into parallel requests (top + games, teams, leagues).
- No "Earlier" list of past days' pages. Top news stories aren't tappable.
- Old `.nw-*` styles in `050-ux-review.css` are unused now and can go.

## Decisions
- Claude writes only on a Generate tap: the page, and each breakdown (DJ, Nov 16: opening a team, league or game
  must not start a breakdown by itself). Nothing automatic (cost).
- Top news is only as fresh as the last generate; no background checking (DJ, Nov 15).
- Tags sit on their own line above the text so every card's text starts at the same edge (DJ asked for this).
- Breakdowns stay inside the News view (`nw.deep`), not a new view, so the iPhone app's strip needs no new build.
- Picks are opt-in, nothing pre-picked, no group checkmarks (DJ, Nov 16). "Team logos" = the app's team badges with
  abbreviations (`badgeFor` / `teamBadge`); Slate has no logo images.
- Game cards show the score and Final / live clock / start time from ESPN (`scoreOf`, `status`); Claude's game story
  and hits must not repeat the score (DJ, Nov 16). The facts send each game's `status` so Claude knows it's over.
- Teams tab = only the favorites picked in the options (`cover.picked`, "lg|name"), DJ, Nov 16. Claude no longer
  writes a line for every team in the picked games.
- Team tiles show Last (with W/L and score) and Next from ESPN's team schedule, reusing `tmLite` / `tmGameLine` from
  130-teams.js (DJ, Nov 16). Game cards keep the scores mid-card like the slate (`.nx-gh .nx-gr { min-width: 30% }`).
- Length limits live in the worker's save step: `S(text, n)` cuts at a whole word and adds an ellipsis, `H` cuts hard
  (ids, keys, urls). 3.52.1 after DJ saw "2 TDs of 65+ yar" and "…, 3 T": never cut mid-word; raise the cap or tell
  Claude the length in the prompt instead. A number value over 7 characters renders stacked (`.nx-num.long`).
- Emojis (DJ, Nov 16): one in front of a breakdown section label, the Hot/Cold chips, and the New and Injury tags
  (`nwEm`, `nwTag`). Never in Claude's text. Recorded in DESIGN.md as a News-only exception.
- Hot tags and chips are red with 🔥 wherever they render (`NW_HOT` in `nwTag` / `nwChip`), DJ, Nov 16.

- Options groups (Today's slate, My teams, Leagues) collapse and expand from their header; state in `slate-newsfold`
  ({g, t, l}: 1 = collapsed). DJ, Nov 16: "make games and leagues sections drop downs"; read as the options screen,
  since the page's Games and Leagues are tabs.

- Games and Leagues tabs: each card is a drop-down, closed to start (DJ, Nov 16: this is what he meant, not the
  options screen; the options groups from 3.52.12 still fold too). Open cards are kept per day in `slate-newsopen`
  (`nwIsOpen`, `nwFoldBtn`).

## The Athletic Newsletters (under the slate, not the News page)
Code: `worker/newsletters.js` (the cron that finds editions in The Athletic's RSS feeds, doc `news/newsletters`) and
`newsletterBlock()` in `src/app/130-teams.js`. Nov 16 (3.52.6): The Pulse's Monday edition was never looked for
because its learned schedule had lost Monday. Learned days are now only added between weekly full looks, and
off-schedule newsletters are still looked for every two hours (`offAt`). To check: compare
`/api/athletic?slug=nfl` (or news, nba, mlb) with the `news/newsletters` doc.


## 3.104.0 (Nov 18): headlines before generating, earlier days, story links
Code: `src/app/202-news-extras.js` (`nwx`, `nwxHeads`, `nwxDays`, `nwxBackRow`, `nwxLink`), hooked from `200-news.js`.
- Press Box with no page yet today opens with "Headlines right now": 6 rows from the free ESPN and Athletic feeds
  (`nwRead`), for the person's leagues (`nwxLgs`). No Claude call, so it costs nothing. The options sit below it.
- "Earlier" at the bottom lists the last six days that have a saved page (`mine/news-<date>`). Tapping one sets
  `nwx.past` and the date; News normally forces today, and skips that only while `nwx.past === state.date`.
  A past day shows "Back to today's news" and no Regenerate.
- Top stories get "Read it on ESPN ›" when a feed headline matches (word overlap: 3+ shared words and half the
  shorter title). Matched in the app because `worker/index.js` was claimed; asking Claude for the url in the worker
  prompt would be more exact.
- Open: "Earlier", the past-day view and story links were not seen on screen, since the test account has no saved
  pages. Check on a profile that generates news.
- 3.113.12 (Nov 19): DJ couldn't generate News. With 15 leagues picked, Claude's page ran past max_tokens (24000) and was thrown away ("too much for one page"). Fix: worker sends `size` {g,t,l}; more than 4 leagues means 2-3 league hits, more than 8 means 2 hits and a shorter league story; max_tokens 32000; facts over 60000 chars are thinned (headlines) instead of cut mid-JSON. Game notes stay 5 per game (DJ's rule). If it still runs over, next step is fewer leagues per page or salvaging the partial answer.
- 3.113.13 (Nov 19, DJ): Top news always opens on 5 (Show 5 more is in memory per page, `nw.moreAt`, no longer saved). Each top story shows its sport beside the team (`nwSportName`: college spelled out, pros by tag). Earlier (202-news-extras.js) always shows the last 3 days (dimmed "No page" when none is saved) plus a Pick a date button (hidden date input, max yesterday). A no-page day opens on that day's options.
- 3.113.14 (Nov 19, DJ): sport label is the short league tag (CBB, CFB, WCBB), as long names wrapped. Earlier buttons removed; the dock day picker (070-navigation.js `renderDockDay`) now shows on News (not in a breakdown), capped at today, and sets `nwx.past` so a past day stays put. Open: on the open Duo, News's day and the slate's share `state.date`.

## 3.122.0 (Nov 22, 2026): "Generated by Claude <when>" on every Claude write-up
- DJ: "Everything in the app generated by Claude via buttons should show when it was last generated."
- One helper in `080-claude.js`: `clWhen(at)` ("today at 7:04 PM", "yesterday at…", weekday within a week, else "Nov 12 at…") and `clStamp(at, cls)` (a dim `.pv-at.cl-at` line, "Generated by Claude …"). Use it for any new Claude output.
- News: the Press Box header and league briefings read "Generated by Claude <when>"; a game/team/league breakdown shows the stamp under its top card (its bottom line no longer has the time).
- 3.128.2 (Nov 22, DJ): Press Box with no page yet today starts with a card (`nwGenTop`): "No page yet today", when Claude last wrote one (newest saved page in the last 7 days, `nwLastGen`), and Generate (runs `nwGenerate` with the saved picks; with none it scrolls to the picks). With a page, the existing Generated by Claude card + Regenerate is already at the top.
- 3.130.7 (Nov 23, DJ): on the Duo (folded and unfolded), Press Box and the league tabs moved into the glass filter button bottom right (283-three-pages.js `n3FiltOn` covers News; `n3Rail` lists `n3NewsOpts()` with Press Box nearest the thumb; the button shows the league tag). `nwStrip` draws nothing then; a regular iPhone keeps the strip, like All games. Folded Duo: the first card's Generate/Regenerate stops short of the clock (099-duo-corner.css).

## 3.131.0 (Nov 25, 2026): Custom news page + automatic headlines (DJ)
DJ: "News page should feature 'generate custom news page' at top while also showing popular headlines, breaking news,
etc. generated automatically beneath it. Make the choices very brief and just be related to specific leagues or matchups."
Code: `src/app/201-news-custom.js` (`nc*`), styles `src/styles/102-news-custom.css`.
- Press Box (today) = `ncCard` (Custom news page: Matchups chips = the slate's games "DET @ GB" + league tag, Leagues chips =
  leagues with a game today, slate's/my teams' first; 6 of each, then "+N more"; Generate, or Open your page + Regenerate),
  then `ncAuto` (Breaking = ESPN items of type HeadlineNews from the last 6 hours, newest first, feed boxes in the team's
  color, NEW under 2 hours; Top headlines = each league's feed in ESPN's own order, round-robin across leagues, up to 3 of
  my teams' stories first, videos/"highlights" left out, 8 shown + Show more to 16), then `wirePress`. No Claude below the card.
  Leagues fetched: `nwxLgs()` + nfl, nba, ncaaf, ncaam, nhl, epl. `nwFeed` now keeps ESPN's `kind` (type) and `rk` (order).
- The written page opens on its own screen: `nw.deep = {type:"c"}` (`ncOpen`, `ncRenderCustom`), so Back/swipe/filter
  button behave as for a breakdown. A breakdown opened from it has `d.from` and Back returns to the page.
  Generate opens that screen with the clock. Regenerate inside it is one tap with the same picks.
- Removed: the long Customize screen (`nwRenderOpts`), `nwGenTop`/`nwLastGen` (3.128.2) and `nwxHeads` (3.104.0).
  Team picks are no longer offered or sent (`nwCover` teams = []); the Teams tab only appears for older pages.
- Past days still show their saved page inline, read only.
- Open: "Breaking" relies on ESPN's own HeadlineNews type (its short news bites), not a breaking flag; ESPN has none.
  A real generate from the new card wasn't run in checks (costs money); it uses the same request as before.
- 3.131.2 (DJ): the Custom news page card folds from its title (`.nc-hd` button, chevron right after the title so it
  never sits under the folded Duo's clock). Open to start; remembered per phone in localStorage `slate-newscustom` ("0" = folded).
  Folded it keeps one line: when the page was generated, or that Claude is writing it.
- 3.131.3 (DJ: "Default it closed"): the card starts folded; `slate-newscustom` "1" = open.
