# Live feed
Last updated: Nov 16, 2026, 3.52.4 (checked by the basketball feed thread)
Code: `src/app/145-live-feed.js` (shared page, football) and `src/app/146-live-feed-hoops.js` (basketball: `hpFeed` draws everything under the switcher; `feedBox` draws the box score for both sports), styles under "Live feed" in `src/styles/040-components.css`. Football and basketball.

## Done
- Game switcher of live games of the same sport (shows even with one game), swipe sideways to change games (3.34.0, 3.35.1).
- Score bar pinned under the top bar while scrolling; score moves with the play that scored, not before (3.34.0, 3.35.3).
- Football: field graphic (ball, line of scrimmage, line to gain), plays by drive. Basketball: each team's top scorer and
  win probability under the score bar, then one plain list: baskets, blocks, steals, turnovers as cards; misses, rebounds,
  fouls as one gray line each; subs hidden; a trip to the line is one card (3.37.0, 3.38.1).
- Basketball headlines in plain words for every ESPN play type: "Steal by A. Sengun", "Turnover: traveling", "Shot at the rim",
  "Technical foul: flopping", "Coach's challenge: call overturned". ESPN sometimes posts a turnover before labeling it (type "No Turnover"):
  a second player from the other team is the steal (3.40.2).
- Each play tag starts with one emoji (3.52.4, DJ asked; list in docs/DESIGN.md "Emojis"; `fdTagText`).
- Play tags beside the headline: lead change, ties, big play, 3rd/4th down, win-probability swings, runs (3.35.0, 3.35.2).
- Short, plain play text in sentence case; players as "F. Mendoza" with position (3.34.3, 3.36.8).
- Latest plays only (8 football, 12 basketball lines); "Show earlier plays" adds one batch per tap; resets on leaving (3.43.1).
- Box score under the plays (3.40.3). Checks ESPN every 4 seconds while open and on screen, waits until the finger is up (3.36.0, 3.36.5).

## Open
- Hockey and soccer versions (DJ: perfect the format first, then other sports).
- Corners and big numbers don't match the rest of the app yet (see Known drift in docs/DESIGN.md).

## Decisions (tried and undone; don't repeat)
- Basketball: no bonus or timeouts-left indicator. ESPN doesn't give them, and counting fouls ourselves would be a guess.
- Basketball: no folded "minor plays" rows or quarter headers (3.38.1): DJ found them confusing. ESPN's "End of the Nth Quarter" lines mark quarters.
- A fixed-height scroll box for the plays (3.41.1) was removed in 3.42.1: no inner scroll box on this page.
- A basketball shot chart (3.37.0) was removed in 3.38.1: simpler is better.
- Folded Duo spacing changes in 3.36.1–3.36.3 were undone in 3.36.4; only the pull-down at the top was kept.

## Top-rated players card (3.66.7)
- DJ: "show two top rated players in the game so far, not just the top scorers". The basketball card shows each team's top-rated player from ESPN's own `rating` leader on the live scoreboard (`scoreRaw(g.id).ld`, matched to the box score by full name and team abbreviation). It's the same rating the live notifications use (worker/alerts.js), so the feed and the Lock Screen agree. No rating of our own: DJ's rule is source stats only.
- A team ESPN hasn't rated yet shows its leading scorer; the title then reads "Top players so far" (mixed) or "Top scorers so far" (none rated). Lines add steals and blocks at 2+.

## 3.66.8: timer, headline emojis, folded Duo score bar
- "Xs ago" under the game clock (both sports) = time since the newest play's ESPN `wallclock`; ticks every second (one setInterval in 146), hidden when not live or over an hour old.
- Big-play headlines get one emoji (`fdTitleText` in 146; tags keep `fdTagText`). Minor plain lines get none.
- "Top rated so far" without "(ESPN)" (DJ).
- Folded Duo: the clock/Wi-Fi cluster covered the score bar's right team. Fixed with padding inside `.fd-bug` and `.fd-strip` only (var(--strip-w)), not a page gutter (DJ rejected that in 3.36.1/3.36.3).

## 3.66.9: switcher = your teams + where you came from; box score keeps your place
- `fdList` (strip and swipe): live football/basketball games with one of your teams (`isFav`), plus the game the page was opened from (`FD.from`, set in openFeed when coming from another page), which sorts first. Sports mix now. DJ: "swipe between my teams games + whatever game I went to the live feed from".
- Box score team switch redraws the page; it now restores the scroll (pane-r on the unfolded Duo, window elsewhere). DJ reported the jump to the top on the unfolded Duo.

## 3.66.10: jersey icons, timer above the newest play
- Basketball players show a tank-top jersey in the team color with their number (`hpJersey` in 146, inline SVG and styles); football keeps the circle (`fdJersey`). DJ asked for this for basketball only.
- The timer left the score bar (DJ): it's a small left-aligned "Last play 12s ago" line as the first child of `.fd-list`, restarting when a newer play's wallclock arrives.

## 3.67.3: basketball, every play is a box (DJ: "let's get creative")
- No more plain one-line rows. `hpRead` gives every play a kind: `score` (green), `turn` (red edge), `miss` (gray: misses, rebounds, jump balls, violations), `foul` (gray), `to` (red timeout, 🚨), `end` (centered, 🔔). Subs still left out.
- A rebound right after a miss, block or missed last free throw rides on that play's box (`rebOf`/`rebSkip`); ESPN's dead-ball team rebound between free throws is dropped.
- Player lines lead with what the play is about (`hpLine` k: `fg`/`fg3` "2-7 FG", `ft`, `reb`, `ast`, `foul`). They are the box score's game-so-far numbers, not the count at that moment, so the foul-trouble/fouled-out tag goes only on a player's latest foul (limit 6 NBA/WNBA, 5 college).
- Made shots add the assister's row; blocks add the shooter's.
- `hpFT`: college types free throws "MadeFreeThrow", so every free throw test goes through it (they were headlined "Two-pointer").
- Top card condensed (DJ): `.hp-two` two columns, win probability on one row.

## 3.68.1: the stat line matches the play (DJ)
- `hpLine` k per play: turnover `to` ("3 TO"), offensive foul `tofoul` ("3 TO, 2 fouls": it's both), steal `stl` plus the player who lost it (`to`), block `blk`, made shot `pts`/`3` ("13 pts, 5-8 FG"), technical `none` (not a personal foul in the NBA). Foul-trouble tags also go on an offensive-foul turnover when it's the player's latest foul.

## 3.68.4: the switcher is the slate's live games
- DJ changed 3.66.9's rule: `fdList` (strip and swipe) is now the live football/basketball games on the slate (`inLineup`), plus the game the page was opened from (`FD.from`), which sorts first; the rest by start time. Not favorite teams any more.

## 3.68.9: the timer counts from when a play appears
- ESPN's feed is 30 to 40 seconds behind the `wallclock` it stamps on plays, so the timer "reset" to ~40s. `fdAgo` now keeps `FD_AGO[gameId] = {key, t}`: when the newest play changes (play count + last id), `t` = the device's clock. Only the first look at a game uses ESPN's time. DJ expects 0 on every new play.

## 3.68.10: football, no player without a stat line
- `fdLine`: receiving counts with targets alone ("0 rec, 2 tgt", ESPN's TGTS); on a pass play the receiver's line adds targets. If the box score has nothing for the play's stat yet, a zero ("0 rec", "0 car"), never blank (DJ).
- Open: the floating Back/menu buttons (bottom right, 070-navigation, shared) cover the right-aligned tags of whichever card scrolls under them. Not changed here; it needs DJ's call since it's the app-wide dock.

## 3.69.0: the delay (DJ: "It's faster than the game on TV")
- Per game, on this phone: `localStorage["slate-feed-delay"] = {gameId: seconds}` (0 to 90 in fives, today's games only). DJ: remember it for the specific game; a game nobody set starts with none.
- How: `feedPoll` hands each summary to `fdTake`, which keeps arrivals in `FD.bufs[gameId]` (only when `fdSig` changed) and `fdRelease` puts the newest one old enough into `FD.sum` (what the page draws), with a timeout for the next one due. It never steps back: turning the delay up holds the page until the game catches up. `FD.last[gameId]` is what a delayed game returns to when you swipe back.
- Control: `fdDelayCtl` on the "Last play" line (`.fd-bar`), minus / value / plus, 44-point buttons.
- Delayed: everything from the summary (plays, score bar, timer, win probability, box score) and that game's chip in the strip. Not delayed: other chips, the top-rated pick (live scoreboard leader; its numbers are from the delayed box), other pages, notifications (worker/ios: would need DJ's OK and a design).
- Football headlines got more emojis (`fdTitleText`): 🎯 completion, ❌ incompletion, 🏃 run, 🦵 punt, 🦶 kickoff, ✅ extra point. None where nothing fits.

## 3.69.2: fold back up, Scoring filter (DJ, Nov 17)
- `fdMoreRow` (146) draws "Show earlier plays" and, once `FD.more > 0`, "Show fewer plays" (sets `FD.more = 0`, scrolls to `.fd-bar`). Both sports.
- Football only: `fdScoringBtn` in `.fd-bar` toggles `FD.scOnly` (reset when leaving the feed). On = only plays `fdRead` calls `score`, no 8-play cap, drives with none are skipped. Shown on finished games too. DJ: not for basketball; soccer and hockey have no live feed yet, give them the same button when they do.
- Delay control redone (DJ: + and − too fiddly, Off must be quick): `fdDelayCtl` is now a "Delay" button in `.fd-bar`; `fdDelayRow` draws the choices (`FD_DELAYS` = Off 15 30 45 60 90) under the bar when the button was tapped (`FD.dlOpen`) or a delay is on. Don't bring the stepper back.
- 3.69.3 (DJ: no way to hide the chips, and wants 5-second steps): the Delay pill now toggles `fdDelayRow` open and closed (`FD.dlOpen`), and the row is an Off button + a range slider (0 to 90, step 5) + the value. Closed with a delay on, an × beside the pill turns it off. The row stops touchstart/touchmove from bubbling so sliding doesn't swipe games. The 3.69.2 chips are gone.

## 3.69.4: the feed on finished games (DJ, Nov 17)
- `feedOk` is now live or over (it decides the button on the quick look and matchup page); `feedLive` is the old live-only test and still picks the strip's other games. `feedBtn` reads "Game feed" (`.feed-done`, not red) once the game is over.
- Nothing is saved: ESPN's summary keeps `plays`/`drives` after the game, and the page reads it back. Football opens with `FD.scOnly` on; basketball opens as usual (newest 12 = the final minutes).
- Open idea told to DJ: a "key plays" filter for basketball (lead changes, last two minutes). Not built.
- Made field goals show Slate's own goalposts drawing (`fdGoalposts`, inline SVG, `.fd-gp`), because no goalpost emoji exists and DJ didn't want the hockey net or the touchdown football. `fdTitleText` returns the private-use marker `\uE0F0` for it and `fdTitle` swaps in the drawing; always draw headlines with `fdTitle`.

## 3.70.0: filters, any live game (DJ, Nov 17)
- `FD.scope` = "slate", "all" or a league key. `openFeed` sets it when you enter the page: All games on a league tab = that league; All games on All/Live/My teams = "all"; anywhere else = "slate" if the game is on the slate, else its league.
- `fdFilters` draws the row above the switcher (`.fd-strip.fd-filt`, `cf-tab` buttons like All games' secondary filters): My slate, All live, each league with a live feed game. Picking one clears `FD.from` and opens that set's first game when the game on screen isn't in it.
- `fdList` = live games in the scope (`fdIn`) + the game on screen + `FD.from`. The swipe uses the same list.
- Football leaders card: `fdLeaders` reads `sum.leaders` (each team's passingYards / rushingYards / receivingYards leader and ESPN's `displayValue`). ESPN has no football rating, so nothing is ranked or picked by Slate. Sacks and tackles leaders exist in the same data but aren't shown.
- `fdJersey` is now a football jersey SVG (basketball keeps `hpJersey`).
- Halftime: `fdIsHT` + `fdHT` draw a red dot and "HT" in the score bar and the switcher chip, including "End of 2nd Quarter" and men's college "End of 1st Half".

## 3.70.1: Watch button, football team colors (DJ, Nov 17)
- `fdWatch` (145) draws the row under the score bar on live games: "On <channels>" and up to two `watchLink` buttons (same links as the cards and On TV).
- Football cards get `--fd-team` (left edge). `fdRead` returns `offTid`, plus `def` (sack, interception, fumble recovered by the defense, safety), `teamP` (the scorer on a return touchdown) or `noTeam` (penalty, kickoff).

## 3.72.1: colors readable on every theme (Nov 17)
- `fdTint` now ends with `hlInk` (150-game-row.js): the team color is pushed to 4.5:1 against the card on the current theme. Every edge and the win probability bar use it. Don't use `badgeColor` raw for anything that must be seen against the card.
- Jersey numbers use `fdNumInk` (black or white by contrast, not a brightness cutoff). The jersey fill stays the true team color.
- Watch moved (DJ, with a screenshot): `fdWatch` now returns a small "▶ ESPN" link that goes inside `.fd-mid` under the quarter (`.fd-mw`), and the 3.70.1 row under the score bar is gone. Don't bring the row back.
- Football scoring cards (`.fd-k-score` with `--fd-team`) take the team's color for headline, outline and tint in place of the accent. Same boxes in the quick look's Scoring (`fdPlayCard`).

## 3.73.1: stuck score banner (DJ, Nov 17)
- Cause: a touch whose target is removed from the page mid-touch (any non-poll `renderFeed`, e.g. from the app's `render()`) ends on the removed element only, so the document never saw `touchend`. `FD.touch` stayed true (poll redraws wait for it: stale clock) and the folded Duo pull-down (`pk`) kept its transform (gap above the banner, banner over the field).
- Fix: `touchend`/`touchcancel` are also listened for on the touched element (`fdLetGo`), each new touch runs `fdPeekEnd` first, and `FD.touch` older than 10 seconds (`FD.touchAt`, refreshed by touchmove) no longer blocks redraws. Keep all three.
- Down and distance now lives in the possession team's block (`.fd-poss` inside `.fd-tm.fd-has`), not in `.fd-mid`.
- `fdAb` maps the NFL's codes in ESPN play text (BLT, HST, CLV, ARZ) to the scoreboard's; `fdClean` runs it.
- Compact top (DJ, folded Duo: no plays visible without scrolling): the football Leaders card is closed by default behind a `Leaders` button in `.fd-bar` (`localStorage["slate-feed-leaders"]`), opens inside the list under the bar. The field card's heading shows only when there's no down (kickoff). Win probability is one row (`hp-wp1`). Don't add new always-open cards above the plays.
- 3.74.1 (DJ didn't like it beside the record): down and distance is a pill under the possession team's score (`.fd-scw` wraps the score and a `.fd-poss` slot on both sides so the scores stay level). Don't move it back under the clock or beside the record.
- 3.75.2 (DJ): clock and quarter share one line in `.fd-mid` (`.fd-ck`). The pill is now `.fd-sit`: its own centered line at the bottom of `.fd-bug` (grid-column 1 / -1), tinted in the possession team's color, reading "LAC 4th & 1 at BAL 17" (DJ: it must be obvious, with the down and the yard line). `.fd-scw` is gone.
- Scores in the score bar: `.trail` (dimmed) only when the game is over (DJ: a dimmed trailing score made a live game look finished).

## 3.77.2: headshots (DJ, Nov 17)
- `fdFace` wraps the jersey (`fdJerseyOnly` / `hpJerseyOnly`) and lays ESPN's headshot over it once it loads (`BX_HEAD` dirs, same URL as the box score). `FD_FACE[id]` remembers 1 = has a picture, 0 = none, so redraws don't flicker. `fdJersey` and `hpJersey` return the face, so the matchup page's Top performers get it too.

Also in 3.77.2 (DJ, Nov 17): the quarter comes before the clock in `.fd-ck` ("4th 9:51"), both feeds. The score bar grid is now 9 columns (spacer, team, score, spacer, clock, spacer, score, team, spacer) so each team's badge, record and score read as one group and the groups spread evenly. DJ found the old layout (badges at the edges, scores huddled in the middle) too compact on the open Duo. The situation pill stays on row 2.

3.77.4 (DJ, Nov 17): the game chips in `fdStrip` flip ESPN's "8:39 - 4th" to "4th 8:39" to match the score bar.

## 3.81.3: new plays stay in view (DJ, Nov 17)
`fdSettle` (145) runs after every redraw, both feeds. If the first play in `.fd-list` is the one under the score bar, the anchor is the list's top, so a new play appears where the last one was. If the reader is deeper (another play is the anchor), that play holds still and `.fd-newpill` ("↑ N new plays", counted in `FD.unseen`) hangs under the sticky score bar; tapping it scrolls the list top under the bar, and it clears when the reader gets back up. DJ's complaint was having to scroll up for each new play.
Also 3.81.3: no swipe-back from the feed (`fdSwipe` returns true at either end, so the shared swipe code in 280 never calls Back; done here because 280 was claimed by another thread). The "All live" tab reads "All".
Also 3.81.3: football timeouts (team and TV) are `.fd-play.fd-k-to` boxes built in the play loop, matching basketball. Two-minute warning and end-of-quarter lines stay as `.fd-note`.
Also 3.81.3: `fdList` no longer pins the on-screen game first once a filter was picked (`FD.from` null); that reshuffle was why swipe right kept hitting the front of the list. Score bar: `.fd-tm` wraps (record under the badge) when three-digit scores make the bar tight, checked down to 330pt.

## 3.87.0: soccer feed (DJ, Nov 17)
`147-live-feed-soccer.js`: `scFeed` draws the soccer page (dispatched from `renderFeed`), `scRead` turns one ESPN commentary entry into a box (kind, emoji, title, `key` for the Key events filter), `scIndex` is the roster by player name (commentary gives names only, no ids, so no headshots; jerseys with numbers instead).
- Data: `sum.commentary` (falls back to `sum.keyEvents` when a match has none; then there is no Key events button and no sentence under the title), `header.competitions[0].details` for the scorers card, `boxscore.teams[].statistics` for possession and the Stats card (open/closed in `localStorage["slate-feed-stats"]`).
- The running score in each box comes from ESPN's "Goal! A 1, B 0." text, counted by team when that isn't there.
- ESPN sends no xG and no big-chance mark, so neither is shown (DJ's rule: only stats a source provides).
- `feedHas` now includes soccer; a finished match opens on Key events (`fdQuietStart`); soccer polls every 8s.
- Open: the shootout kick-by-kick (`sum.shootout`) isn't drawn, only "Pens 4–5" in the score bar.

## 3.88.0: hockey feed (DJ, Nov 17)
`148-live-feed-hockey.js`: `hkFeed` (dispatched from `renderFeed`), `hkRead` (one ESPN play → a box), `hkIndex` (box score players by id, for headshots and the game line), `hkLeft` (ESPN's play clock counts up; shown as time left so it matches the score bar: 20-minute periods, 5-minute regular-season overtime).
- Data: `sum.plays` (goals with scorer and assisters and season totals, penalties with `type.penaltyMinutes`, shots, hits, giveaways, takeaways; `strength` marks power-play and shorthanded goals), `boxscore.teams[].statistics` for the shots bar and the Stats card. Reuses soccer's `sc-who`, `sc-stats` and `sc-play` styles and the `slate-feed-stats` setting.
- Faceoffs and stoppages are skipped. "Goals & penalties" is the filter (`FD.scOnly`); finished games open on it.
- ESPN files a blocked shot under the blocker's team, so that box is titled with the blocker.
- Open: no live "on the power play now" indicator (ESPN's summary has no clear field for it), no shootout attempt list beyond the plays ESPN sends.

3.91.4 (DJ, Nov 17): on the folded Duo, `#feed-body > .fd-field` gets the same right padding as the score bar (`--strip-w`), so the possession bar and the other top cards end left of the clock/Wi-Fi island. Only those cards move; the page itself keeps its width (DJ rejected a page gutter in 3.36.1).

3.91.5 (DJ, Nov 17): a fresh soccer event arrives as a bare sentence (no `play`: no type, team or participants) and ESPN fills it in a minute later. `scFill` reads the type, team and names out of the sentence so it gets its box at once; ids are by `sequence` so the box does not count as new again when the details arrive. The scorers card is redrawn from the events when they hold more goals than `details` does (details lag too).

3.93.4 (DJ, Nov 17): unfolded Duo, feed in the right pane. A pane never gets `side-col` or `--strip-w` (only the host page does), so `fdIsland()` in 145 reads the host's `--strip-w` when this pane's iframe reaches the right edge of the screen, and sets class `fd-isl` and `--fd-isl` on `#view-feed`. The same three things as folded get the padding (score bar, row of games, cards right under the bar). Kept in the feed's own files so the shared pane files are untouched.

3.94.1 (DJ, Nov 17): the 3.93.4 spacing stuck when the feed was moved to the left side, because the side was only checked when the feed was drawn. Now `fdIsland()` only copies the island width, and the CSS applies it under `html.pn-right` (the class the host puts on the right pane's page), so it follows a swap at once with no redraw.

3.95.2 (DJ, Nov 17): swipe between games from anywhere. The swipe code (280-ios-bridge.js, touchstart) refused any touch that started in a box score (`.bx`, `.bxp`, `.bx-pl`), which on a basketball feed is most of the lower page. In feed mode that refusal is skipped; a table that scrolls sideways is still the `scroller`, so it scrolls first and the swipe only counts when it did not move. Still not swipe zones: the outer 24 points at each screen edge (iOS's own edge gestures) and the delay slider.

3.97.1 (DJ, Nov 17): the "Last play" timer counts the delay. `fdTake` notes when each newest-play key first reached the page (`FD.keyAt[gameId][key]`), and `fdAgo` starts the timer from that moment when the play is finally shown, so a play released after a 30s delay reads "30s ago". DJ's words were "when I have the delay on, it should be reflected in the last play timer"; I read that as the timer including the delay (before, it restarted from 0 when the delayed play appeared).

3.98.0 (DJ, Nov 17): the loose gray lines between plays (`p.fd-note`) are now boxes. `fdNoteRead(text)` in 145 turns ESPN's sentence into an emoji, a short title, a sub line and a tone (go / stop / clock / end); `fdNoteCard` draws it as `.fd-play.fd-k-note` with the minute and score on top where the sport has them. Used by football (145), soccer (147) and hockey (148); basketball already boxed its period ends (`fd-k-end`) and timeouts. Only wording changes: nothing is added that ESPN's sentence doesn't say. An unknown sentence falls through to a 📣 box. To add a new kind, add one regex line to `fdNoteRead`.

3.98.1 (DJ, Nov 17): the row of games (`fdStrip`). The chosen chip used to snap flush to the left edge (scroll-snap ignored the row's padding, so its border was cut off) and the game before it scrolled out of sight. Snapping is off. When the chosen game changes (`FD.stripOn`), the row scrolls so the game before it sits whole at the left padding with the chosen game after it; when the two don't fit, the chosen game sits at the right (with a 44px peek of the next game where no island covers that corner) so most of the previous one shows. Between updates the row keeps its place.

3.100.2 (DJ, Nov 17): "Remove the all filter option". The All tab is gone from the feed's filter row (`fdFilters`): My slate plus one tab per league with a live game. The tab choice is not saved (`FD.scope`, in memory); a feed opened from All games' ALL tab uses My slate if the game is on the slate, else its league. `fdIn` still understands "all" but nothing sets it.

3.100.10 (DJ, Nov 17): a basketball steal box takes the stealer's team (color and the label on the top line). ESPN's `pl.team` on a steal is the team that turned it over; `hpFeed` now uses `rd.P.tid` when `rd.k === "stl"`. Blocks follow the same rule since 3.101.1 (DJ said yes): the blocker's team, when ESPN names the blocker.

3.111.0 (DJ, Nov 18, competitor review recommendation 12): baseball, in `149-live-feed-baseball.js` (`bbFeed`, dispatched from `renderFeed`; `feedHas` and `fdQuietStart` now include baseball).
- ESPN's MLB summary: `plays[]` is one flat list. Per at-bat: "Start Batter/Pitcher", one play per pitch (`atBatPitchNumber`, `pitchType.text`, `pitchVelocity`, `pitchCount` before the pitch and `resultCount` after), then a "Play Result" whose `alternativeType` is the outcome and whose `text` is the sentence, then "End Batter/Pitcher". A "Play Result" not followed by "End Batter/Pitcher" is an event (stolen base, "X relieved Y", "X hit for Y"). Every play carries `outs`, `onFirst/onSecond/onThird`, `period.type` (Top/Bottom/Mid/End) and the score. Participants are ids only; names and lines come from `boxscore.players` (batting and pitching groups, by `keys`). The line score is `header.competitions[0].competitors[].linescores` plus `hits` and `errors`; pitchers of record are `status.featuredAthletes`.
- The "now batting" card reads only the newest play (count, outs, runners, batter, pitcher). No `situation` object is assumed, because a finished game has none to check against.
- Built and checked against MIL at TB, Oct 28, 2026 (event 401908046), plus a copy cut off mid-inning with its status set to in progress to see the live card. NOT yet seen on a real live game: check on the first spring training game (late Feb 2027). Things to look at then: the count right after strike three or ball four, the "at bat" box while pitches come in, extra innings (the line score shows the last nine innings), a home run's wording, and the delay.
- The box score under the plays is the app's normal baseball box score (`feedBox`); it could not be exercised in the test because Slate has no MLB games saved for 2026.

## 3.141.3: games after midnight Eastern (DJ: "Clemson live feed not loading")
- Clemson vs Colorado State (Maui, 11:30 PM CT = 12:30 AM ET) stayed on "Loading the play-by-play". ESPN files late games under the evening
  before (it was on the Nov 25 scoreboard), but `bxFindEvent` (110-box-score.js) only looked at the Eastern date of the start (Nov 26).
- Fix: `bxDayEvents` fetches one league-day list; `bxFindEvent` tries the start's Eastern date, then the day before (or the day after for a
  start after noon ET). `sbOdds` reads both lists; the live score poller (040-live.js) also asks the day before for games before 6 AM ET (`etHour`).

## 3.146.0: Leaders and Big plays for every sport (DJ: "add equivalents for all sports" of football's Scoring and Leaders)
- Leaders button on every sport (`fdLdHook` + `fdLeaders` in 145, spec `FD_LD`): ESPN's own `sum.leaders` for football (pass/rush/rec),
  basketball (pts/reb/ast; points add ESPN's FG line), hockey (goals/assists/points), soccer (shots, accurate passes, defensive actions, saves; home team first).
  Baseball has no ESPN leaders: each team's pitcher in the game (its starter once final) and best batter by the box score (hits, then RBIs, then HRs).
  One open/closed setting on this phone for every sport (`slate-feed-leaders`). The button sits just before Delay; the card opens under the line (after Stats).
- Basketball Big plays (146, uses `FD.scOnly`): only plays with a tag (lead change, tie, run, and-one, buzzer-beater, clutch, win-prob swing) plus made threes and dunks.
  Hockey (Goals & penalties), soccer (Key events) and baseball (Scoring) already had their filter.
- `.fd-bar` wraps (040-components.css) so up to four buttons plus "Last play" fit the folded Duo.
- Open: golf and F1 have no Live feed, so nothing to add there. Baseball checked against a September game's data only (no MLB games in November).

## 3.147.1: basketball Big plays tightened, Leaders show full lines (DJ: "big plays has too many plays"; "leaders should show all stats")
- Big plays = `hpTags(...).big` only: a lead change, tie, or go-ahead basket in the last 5 minutes of regulation or in OT; the basket that first makes a run 10-0;
  buzzer-beaters; ESPN win-probability swings of 15%+. Routine threes, dunks, and-ones and early lead changes are out (a close game had 8, a blowout 1).
- Basketball Leaders rows show pts, reb, ast from the box score for every leader (`hix` in `fdLeaders`).

## 3.159.0: play cards with more flair (DJ: "more creativity and flair to live plays ... more than the basic sentence"; he picked basketball first)
- Basketball (`hpStory` in 146, all counted from ESPN's plays): a banner (`fdBanner` in 145, `.fd-ban`) in the team's color on the Big plays moments
  (late go-ahead or tie, 10-0 run, buzzer-beater, 15%+ swing) and when a player reaches 30/40/50 points; the shooter's last five shots as dots
  (`hpDots`, at the end of the shooter's row); one story line (`.fd-story`): scoring drought ended (3+ minutes), a player scoring the team's last 8+,
  20 points, 3rd+ three, 4+ makes or misses in a row, 3rd+ block or steal, every 5th team turnover from 10, first double-digit lead, lead hits 20,
  back within single digits, one-possession game (last 5 minutes only). Tags the banner already says are dropped from that card.
- Football is built and switched off: `FD_FLAIR_FOOT = false` in 145 (`fdStory`, `fdTracer`: banner on scores, turnovers and 20+ yard gains; the play
  traced on a thin field; drive, score and player lines). Turn it on once DJ likes basketball's; it was checked on data only, never on screen.
- Not seen on the unfolded Duo: shots.py couldn't reach a finished game there (16-game cap). The feed pane there is phone width, same cards.
- Motion: the banner wipes in and the newest dot pops, only on `.fd-new`, off with Reduce Motion.
- 3.161.1 (DJ: the score was repeated): a banner whose number is the score leaves the score off the card's top line.
- 3.161.1 (DJ): basketball's "Top rated so far" card removed (Leaders button covers it); win probability sits alone in a slim card (`.hp-wponly`). Football, hockey, soccer and baseball never had a top-players card.
- 3.161.1 (DJ: "the dots are confusing"): shot dots removed. Instead: `.hp-plus` points stamp on made baskets (+1/+2/+3, a trip to the line adds up), streak tags from hpStory (`st.tag`: Heating up at 3 straight makes, On fire at 4+, Ice cold at 4+ straight misses), and context lines: Second-chance points (basket within 12s of the team's offensive rebound), Points off the turnover (within 8s), Answers right back (within 10s of the other team's basket).
- 3.161.2 (DJ: "I don't like the +2 and +3"): the `.hp-plus` points stamp removed. Don't bring it back. What stays: banners, streak tags, story lines.

## 3.162.0: Box score button replaces Leaders; highlights in the box score (DJ, Nov 26)
- DJ: "I want box score to be a button, rather than show beneath the live feed", "Box score should replace leaders". `fdLdHook(list, g, sum)` in 145 now draws
  a "Box score" button (`.fd-bxb`, open state in `slate-feed-box`, default closed) and puts `feedBox` inside `.fd-list` under the bar. Nothing is appended under the plays.
  `fdLeaders`/`FD_LD` are still in 145 but not drawn.
- DJ: "highlighting specific players or stats to catch the users eye". `fdBoxShine` (145) decorates the feed's box score only (the quick look and matchup box
  scores are untouched): `.bx-hi` on the team's best number per column (ties of 3+ and "more isn't better" columns in `FD_BX_SKIP` are skipped), `.bx-star` row +
  `.bx-chip` for a basketball double/triple-double, else the player with the most team highs ("Team high: 24 PTS").
- Seen on screen for basketball only (folded Duo); football, hockey, soccer and baseball had no games on at the time.
- The unfolded Duo's wide feed layout in 097-panes.css keys on `#feed-body > .fd-box`, which no longer exists: told the panes thread.

## 3.162.2: filter pill clear of the Dynamic Island, box score scrolls sideways
- DJ: "Make the gray pill filter bar fit without going behind the Dynamic Island". The filter bar became a glass pill in 100-glass.css, which sets its padding
  and margin with `!important`, so the older `padding-right` island rules (040-components.css, `.fd-strip`) stopped working for it. Fix: `margin-right` with
  `!important` on `.fd-strip.fd-filt`, `--strip-w` on the folded Duo and `--fd-isl` in the unfolded right pane (end of 040-components.css). Buttons wrap inside.
- DJ: "I can't scroll on box score, it wants to swipe between games". The Nov 17 rule (a swipe anywhere on the feed changes games, a wide table scrolls first)
  didn't hold on the phone: the swipe locked before the table had moved. Now a touch that starts inside `.fd-box` never starts a game swipe
  (280-ios-bridge.js, touchstart). Swipes on the plays, score bug and bar are unchanged. Checked with synthetic touches, not on a real phone.

## 3.162.3: streak tags name the player
- DJ: "Ice cold 5 straight misses, idk if that's team or player". Streaks are always the shooter's own shots (free throws not counted), so the tag is now
  "<Last name>: N straight makes" (3+, flame) or "<Last name>: N straight misses" (4+, ice). The words "Heating up", "On fire" and "Ice cold" are gone.

## 3.165.0: box score highlights app-wide, football play cards on
- DJ: "Implement the new box score design and such app wide. Everything we've edited today should be app wide". `fdBoxShine` now runs at the end of
  `bxPlayers` (110) for every game box score (quick look, matchup, finished games, feed), not season stats. Styles are scoped to `.bx-pl`, not `.fd-box`.
- DJ picked "Every sport" for the play cards: `FD_FLAIR_FOOT = true` (banner, field tracer, drive and player lines). Seen on screen on CHI@DET, folded
  Duo and iPhone: banner and tracer showed, no story line had come up yet. OPEN: hockey, soccer and baseball play cards are not built yet (next release).

## 3.167.0: play cards for hockey, soccer and baseball
- DJ picked "Every sport". Each sport has a story pass over its plays in order (`hkStory` 148, `scStory` 147, `bbStory` 149) returning
  `{ ban, lines }` per play id, and `fdFlair(card, g, st)` (145) adds the banner and the first line to the sport's own card. The header score is
  dropped when the banner shows it. Banner score order follows each sport's header (soccer home first, the others away first).
- Kept out on purpose (DJ's earlier rejections): no dots, no points stamps, no repeated score, streak or count lines always name whose it is.
  No "down to 10 men" line: a red card can go to someone not on the pitch, so it would be a guess.
- Checked: soccer on screen on a live Europa League match (folded Duo). Hockey and baseball on data only (node run of the story pass on
  finished NHL games and a World Series game): no games were on. OPEN: look at both on screen at the next live game.

## 3.169.0: football Drives button
- DJ: "Football should have a 'drive result' during live game so I can see the result of all past team drives quickly". `fdDrvHook` (145) adds a
  Drives button to the bar (Scoring, Drives, Box score, Delay) and, when open (`slate-feed-drives`), a card listing every drive from ESPN's `drives`,
  newest first: team, start quarter/clock/spot, `description`, `displayResult`. Drives and Box score close each other. Styled inline with existing
  classes because 040-components.css was claimed by another thread. Seen on screen on CHI@DET (folded Duo, iPhone).

## 3.170.1: football play wording fixes (wrong names)
- DJ: "intended for Goff" and "Gibbs left tackle" "don't seem right". Causes and fixes in 145: `fdPre` strips the NFL's pre-play notes ("X reported in
  as eligible.", "X in at QB.") and `fdRev` keeps only the final play after a replay reversal; passer/target are read from "X pass ... to Y" itself;
  an interception's second player is the one after "INTERCEPTED by" (it used to be the intended receiver: wrong name on every pick);
  run directions are worded as runs; "1 yd" singular; kneel, spike and onside kick get their own titles; "St. Brown" survives the sentence split.
- Checked by running `fdRead`/`fdLines` over every play of four real games (515 plays) and reading the odd ones.

## 3.170.2: tighter box score rows
- DJ: "Too much unused space here" (football box score, upright unfolded Duo). `bxRows` (110) marks a group whose columns total 215px or less as
  `.bxp-few`; `.bx-pl` is a size container and the CSS at the end of 040-components.css lays those groups out by the box score's own width:
  one line per player under 440px, two players per row from 440px, two per row on one line from 640px (640px+ not seen on screen).
  The standout chip is hidden in few-column groups under 640px (the tinted row and lit numbers stay). Basketball-width groups unchanged.
- Not done: both teams side by side. The team tabs stay.

## 3.171.1: end-zone logos
- DJ: "use team logos in end zones". `fdEzLogo` (145) puts the ESPN logo in the end zones of the top field (`.fd-ez`) and each play's thin field
  (`.fd-tr-ez`), on a darkened end zone with a team-color edge. Falls back to the old color and letters if the logo is unknown or fails to load.

## 3.172.0: football fun lines ("sayings")
- DJ: "spruce them up with fun sayings and some flare ... a few seconds after the current play comes through"; chose built-in sayings on a card,
  then "do a lot and make them fun but accurate". `FD_SAY` (145) holds 192 lines in 20 categories; the category is worked out in `fdStory` from the
  play's type, down, distance and yards (`st.say`), `fdSayPick` fills in names/numbers and walks each list from a per-game start so lines don't repeat.
  `fdSayEl` shows the line 3 seconds after a play first appears as new (space reserved, fades in). No Claude, no cost.
- Accuracy rules to keep when adding lines: a line may only claim what its category guarantees (no "untouched", "wide open", "held the ball").
  No running counts in the line (4th-down and three-and-out counts were dropped because the classifier doesn't see every attempt).
- Football only so far. DJ: "Start with football, then we'll move to other sports". Wait for his word before adding other sports.
- Checked on screen on CHI@DET and by running a full finished game (39 of 187 plays got a line) through the pass and reading every line.

## 3.177.0 (Nov 26): frozen stat lines, shorter football cards, yard lines
- DJ: "I don't think I want player stats to continue to update on past live feed plays". He chose freeze. `FZ` / `fdFzStart` / `fdFzMark` /
  `fdFzLine` / `fdFzEnd` in `145-live-feed.js`, used by all five sports. Each render marks every play newest first (before any Scoring / Big
  plays filter), so the first play seen for a player is his newest: that card shows the live line and saves it; older cards show what was saved
  (`localStorage` `slate-fd-fz-<game id>`, last 4 games kept). No saved line = no line. Nothing is computed: it is ESPN's box line as read then.
  A basketball rebound shown on the miss's card is keyed by the rebound's own play id. Baseball keys batter and pitcher lines apart.
- Known limit: plays from before the feed was first opened on that phone (and all but each player's last play of a finished game) show no line.
  ESPN's box can lag a play by a few seconds; the line keeps refreshing until the player's next play, so it settles on the right numbers.
- Football cards shorter (DJ: flair "creates too many lines of text"): story and saying share one line (`span.fd-say`), player rows wrap side
  by side in `.fd-pls`, "Caps a N-play drive" is off (the drive header says it), tighter banner and margins (end of `040-components.css`).
- Top field yard lines are now real marks placed with the same sum as the ball and the numbers (the striped background had a 7% period where
  the numbers use 8.4%).
- The scoring list on the matchup page (`fdScoringList`) is not frozen; it still shows current lines.
