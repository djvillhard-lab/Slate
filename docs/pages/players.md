# Player pages
Last updated: Nov 18, 2026, 3.105.0

Code: `src/app/134-player.js` (its styles are in the same file, `PLR_CSS`, so no shared stylesheet is touched).

## Done
- `openPlayer({ id, lg, name })` opens a sheet (`#sheet-plr`, the same sheet parts as Add my bet) with: headshot, team,
  position, number, height, weight, age, experience; ESPN's four headline season numbers with league rank; season and
  career lines; the last five games with result; the next game; up to three written headlines; "Team page" and "Close".
- Data: `site.api.espn.com/apis/common/v3/sports/<bxBase(lg)>/athletes/<id>` and `…/overview`, cached 10 minutes in
  `PLR.cache`. Nothing is worked out in the app. ESPN's "Projected" season row is left out (a forecast, not a stat).
- `plrTap(node, p)` makes a node open the page; it does nothing when the row has no ESPN id. Used by Box Office cards
  (`mmCard`), box score rows (face and name, `110-box-score.js`) and Top performers rows (`tpRow` in `140-game.js`).

## Open
- Not a full page: it's a sheet, so it has no Back history and no menu entry (a new view would need the Duo strip
  and an iPhone build). Following a player from the sheet isn't built (`state.players` saving lives in shared files).
- Checked on folded Duo and iPhone by opening the sheet directly (NBA, NFL). The unfolded Duo wasn't seen with the
  sheet open, and the taps themselves weren't seen (no games had started; `shots.py game:` finds 0 games).
- Soccer and college players use the same ESPN pages but weren't looked at.

## 3.112.2 (DJ, Nov 18)
- DJ: "Only show player page when selecting the player's profile picture - apply that everywhere in the app." `plrTap` now goes
  on the picture only: `jj` (`playerFace`) on Box Office cards, `fw` (the face) in box score rows, `jj` (the jersey) in Top
  performers rows. A tap anywhere else keeps the row's own behavior (a Box Office card opens its game). Don't put `plrTap` on a
  whole row or a name again.
- DJ: Back was moving the page behind the sheet. `goBack` (070-navigation.js) asks `plrBack()` first, which closes an open sheet.
  Checked on Box Office (iPhone, folded Duo): body tap = no sheet, picture tap = sheet, Back = sheet closed, page unchanged.
