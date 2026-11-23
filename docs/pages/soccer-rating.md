# The Slate rating for soccer

Slate's own match score for each soccer player (Web 3.130.0, DJ, Nov 22, 2026). It is not an official rating: ESPN's rating fields are always 0.0, TheSportsDB has none, and SofaScore/FotMob ratings are private. DJ chose a Slate rating worked out from real ESPN match stats, more precise than a whole number, with its own values per position.

## How it works
- Everyone starts at **6.0**. Each thing in the table adds or takes points, times how often he did it. Above 8.5 each extra point counts 0.55 (3.130.3). The total is kept between 3.0 and 10.0 and shown to one decimal.
- **FotMob comparison (Nov 23, 2026).** DJ sent FotMob's ratings for Liverpool 4-0 Manchester United. 3.130.1 tuned the values toward them (ESPN xG/xA counted, missed big chances cost less, conceding cost defenders more, keeper clean sheet +0.5, points above 8.5 counted 0.55; mean gap 0.47 to 0.24). DJ then said: "Don't try to get the same as FotMob, rather show me the comparison and we can see where it's off", so 3.130.2 put every value back to 3.130.0. The tuned table is in git at commit 0f1f37e if DJ picks any of it. Biggest gaps with the current values: Barcola 5.9 vs 7.9, Isak 6.4 vs 7.7 (big chances missed), de Ligt 6.4 vs 5.1, Martínez 5.5 vs 4.6 (conceding four), Szoboszlai 9.6 vs 8.9, Wirtz 10.0 vs 9.4, Alisson 8.3 vs 7.8. DJ's answer: "Those all sound like they need to be adjusted." **3.130.3** changed only the four things shown to DJ: a big chance missed −0.1 (striker −0.12) instead of −0.2 to −0.3; goals conceded −0.4 for a centre back, −0.3 full back, −0.12 midfielder (were −0.25, −0.2, −0.08); keeper clean sheet +0.5 (was +0.9); and above 8.5 each extra point counts 0.55 (`SOC_RATE_SOFT`, shown as its own line in the breakdown). Mean gap on that match 0.47 to 0.30. Still off: Barcola 6.3 vs 7.9 and Isak 6.7 vs 7.7; the likely fix is counting ESPN's real expected goals and expected assists (FotMob rewards getting chances), offered to DJ, not done. Change values only when DJ picks them.
- No rating under 15 minutes played, or when ESPN has no stats for him.
- Six jobs. A starter's job comes from where he lines up in the formation (`socRoleAt`): GK keeper; CB centre back; FB full back or wing-back; MID central or holding midfielder; ATT winger or attacking midfielder; ST striker. A substitute's job comes from the club's ESPN squad list (G, D, M, F become GK, CB, MID, ST).
- Clean sheet counts only with 60+ minutes and no goals conceded while he was on. Goals conceded are the ones while he was on the pitch (ESPN's own count). "Goals prevented" is ESPN's shot-quality number for keepers and can be negative.
- Stats come from ESPN's per-player match stats: `sports.core.api.espn.com/v2/sports/soccer/leagues/<league>/events/<id>/competitions/<id>/competitors/<team>/roster/<player>/statistics/0`, one request per player, asked from the phone only for the team being looked at (live: at most every 90 seconds).
- Code: `src/app/092-soc-rating.js` (the table is `SOC_RATE`; change a value there and update this page). Drawn by `socRatingBox`/`socRtFill`, called from `socLineup`.
- Checked on 8 finished matches (Premier League, La Liga, MLS; 213 players): typical scores sit around 6.1 to 7.2 by position, standout games reach 9 to 10.

## Points for each thing, by position

| What he did | GK | CB | FB | MID | ATT | ST |
|---|---:|---:|---:|---:|---:|---:|
| Goals | +1.5 | +1.2 | +1.1 | +1 | +0.9 | +0.85 |
| Penalties scored | +0.5 | +0.5 | +0.5 | +0.5 | +0.5 | +0.5 |
| Assists | +0.8 | +0.8 | +0.75 | +0.7 | +0.65 | +0.65 |
| Chances created | +0.1 | +0.12 | +0.14 | +0.14 | +0.12 | +0.12 |
| Big chances created | +0.12 | +0.12 | +0.12 | +0.12 | +0.12 | +0.12 |
| Shots on target (saved) | +0.05 | +0.08 | +0.08 | +0.08 | +0.1 | +0.1 |
| Big chances missed | −0.1 | −0.1 | −0.1 | −0.1 | −0.1 | −0.12 |
| Dribbles won | 0 | +0.05 | +0.08 | +0.08 | +0.1 | +0.1 |
| Touches in their box | 0 | 0 | +0.02 | +0.02 | +0.02 | +0.03 |
| Passes completed | +0.008 | +0.01 | +0.008 | +0.01 | +0.006 | +0.005 |
| Passes missed | −0.03 | −0.03 | −0.025 | −0.03 | −0.02 | −0.015 |
| Passes in the final third | 0 | +0.005 | +0.008 | +0.008 | +0.006 | +0.006 |
| Long balls completed | +0.03 | +0.03 | +0.02 | +0.02 | +0.01 | 0 |
| Crosses completed | 0 | +0.05 | +0.12 | +0.1 | +0.12 | +0.08 |
| Tackles won | 0 | +0.15 | +0.15 | +0.13 | +0.08 | +0.06 |
| Interceptions | +0.05 | +0.15 | +0.13 | +0.12 | +0.06 | +0.05 |
| Clearances | +0.03 | +0.07 | +0.05 | +0.03 | +0.02 | +0.02 |
| Shots blocked | 0 | +0.15 | +0.12 | +0.1 | +0.05 | +0.05 |
| Balls recovered | +0.03 | +0.04 | +0.04 | +0.05 | +0.03 | +0.02 |
| Headers won | +0.05 | +0.08 | +0.06 | +0.05 | +0.05 | +0.08 |
| Duels lost | 0 | −0.05 | −0.05 | −0.04 | −0.03 | −0.03 |
| Fouls won | +0.04 | +0.04 | +0.04 | +0.04 | +0.04 | +0.04 |
| Fouls given away | −0.08 | −0.08 | −0.08 | −0.08 | −0.08 | −0.08 |
| Times he lost the ball | −0.04 | −0.04 | −0.04 | −0.04 | −0.03 | −0.03 |
| Offsides | −0.05 | −0.05 | −0.05 | −0.05 | −0.05 | −0.05 |
| Yellow card | −0.4 | −0.4 | −0.4 | −0.4 | −0.4 | −0.4 |
| Red card | −1.8 | −1.8 | −1.8 | −1.8 | −1.8 | −1.8 |
| Own goals | −1.2 | −1.2 | −1.2 | −1.2 | −1.2 | −1.2 |
| Penalties given away | −0.8 | −0.8 | −0.8 | −0.8 | −0.8 | −0.8 |
| Penalties missed | −0.8 | −0.8 | −0.8 | −0.8 | −0.8 | −0.8 |
| Clean sheet | +0.5 | +0.7 | +0.6 | +0.2 | 0 | 0 |
| Goals conceded while on | −0.25 | −0.4 | −0.3 | −0.12 | 0 | 0 |
| Saves | +0.25 | 0 | 0 | 0 | 0 | 0 |
| Goals prevented (ESPN's shot quality) | +0.5 | 0 | 0 | 0 | 0 | 0 |
| Penalties saved | +1.2 | 0 | 0 | 0 | 0 | 0 |
| High balls claimed | +0.08 | 0 | 0 | 0 | 0 | 0 |
| Sweeper clearances | +0.08 | 0 | 0 | 0 | 0 | 0 |

## Open
- Values are a first pass; DJ may want them tuned after watching a few matches.
- Not shown for a team until its lineup is opened (no ratings on game cards or in Box Office).
