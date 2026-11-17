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
