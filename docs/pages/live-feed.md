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
