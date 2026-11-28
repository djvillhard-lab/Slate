# Soccer lineups (matchup page and quick look)

History of the floodlit pitch (3.123.0 to 3.130.6) is in docs/pages/game.md.

## The list (3.185.0, Nov 28, 2026)
- DJ: "scrap the field and formation graphic and just show starting lineups in a list with player positions shown", keep the ratings and make them live, headshots when possible. The floodlit pitch is gone (its CSS in `040-components.css` is now unused: `.soc-pitch`, `.soc-p`, `.soc-nm`, `.soc-tags`, `.soc-rt`; safe to delete next time someone holds that shared file).
- `socLineup` (`090-box-data.js`) → `socLines` (same Opta `formationPlace` order as before) → `socList` / `socRow`. Headings Goalkeeper, Defenders, Midfielders, Forwards follow ESPN's position letters (`SOC_DEPTH`), never going back up. Each row: picture circle (team color ring, number badge; the number in team color until a picture arrives), full name, "#10 · Left striker" (`socPosName` turns ESPN letters like CD-L into words), goal/assist/card/↓↑ minute marks, rating on the right.
- Substitutes who came on get their own rows (with a rating after 15 minutes); unused bench is one line. Styles: `src/styles/096-soc-lineups.css`.
- Ratings: the "Slate ratings · How it works" strip sits above the list; each score is on the player's row and tapping the row opens his sums (`socRtFill` in `092-soc-rating.js`). Live: asked every minute while the lineup is on screen (`SOC_RT_EVERY`), a changed score fades in once, and the strip says "Live · every minute" in red.
- Likely lineup before the real one (DJ: "add a potential starting lineup guess"): `socGuess` shows the team's starting XI from its last finished match in any competition (ESPN `soccer/all/teams/<id>/schedule` → `soccer/all/summary`), labeled "Likely lineup · Guess" with the match it came from. Players sent off in that match, and players ESPN's injury list has for this game, carry a note ("Out: ..."). Kept 6 hours per team on the phone. Once ESPN posts the real lineup (about an hour before kickoff) it replaces the guess.
- Open: the lineup-announced push for favorite teams (next release, worker/alerts.js).
