# Player pages
Last updated: Nov 19, 2026, 3.117.0

Code: `src/app/134-player.js` (its styles are in the same file, `PLR_CSS`, so no shared stylesheet is touched).

## Done
- `openPlayer({ id, lg, name })` opens a sheet (`#sheet-plr`, the same sheet parts as Add my bet) with: headshot, team,
  position, number, height, weight, age, experience; ESPN's four headline season numbers with league rank; season and
  career lines; the last five games with result; the next game; up to three written headlines; "Team page" and "Close".
- Data: `site.api.espn.com/apis/common/v3/sports/<bxBase(lg)>/athletes/<id>` and `…/overview`, cached 10 minutes in
  `PLR.cache`. Nothing is worked out in the app. ESPN's "Projected" season row is left out (a forecast, not a stat).
- `plrTap(node, p)` makes a node open the page; it does nothing when the row has no ESPN id. Used by Box Office cards
  (`mmCard`), box score rows (face and name, `110-box-score.js`) and Top performers rows (`tpRow` in `140-game.js`).

- 3.121.1 (Drew's feedback, DJ chose top left): an X (`.plr-x`) closes the sheet. It sits in a sticky top bar
  (`.plr-bar`) with Follow on the right, so both stay in reach while the sheet scrolls. Follow moved out of the
  name row into that bar (the name now gets the full width). The Close button at the bottom stays.

## Open
- Not a full page: it's a sheet, so it has no Back history and no menu entry (a new view would need the Duo strip
  and an iPhone build).
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

## 3.117.0 Follow a player (DJ, Nov 19, from the competitor gap list)
- Follow button top right of the sheet (`.plr-fol`, accent fill + "Following" when on), only for a signed-in profile
  (`state.isOwner`). It adds/removes `{id, name, lg, team (ESPN abbr), teamName}` in `state.players`: the same list Box
  Office's ★ tab already reads (`rkFavPoll`), saved with the settings. The old row stars (`playerStar`) stay hidden.
- `saveNotify` (260-persistence.js) also sends `players` to prefs/notify, so the worker knows who you follow.
  `NOTIFY_DEFAULTS.follow = {start, final}` (010-core.js) and worker `DEFAULTS.follow`; both on.
- Worker (`worker/alerts.js`): `followedIn(p, games)` finds today's games by league + team abbr or ESPN full name.
  Those games join the live-score set. Alerts: `plstart` at the start (same lead time as Game starting), skipped when the
  game already gets its own start alert, which then gets a "You follow X" line instead; `plfinal` once per player per
  game, from ESPN's summary box score (`playerLine`: basketball PTS/REB/AST (+STL/BLK at 3+) and FG; football passing,
  rushing, receiving, tackles; hockey G/A/SOG or goalie saves/GA; baseball H-AB etc. or IP/H/ER/K; soccer goals,
  assists, saves from rosters). "didn't play" when ESPN marks it; not in the box score = nothing sent. Spoiler-free = "has ended" only.
  Tested on real ESPN summaries (NBA, NFL, NHL, MLB) with a copy of the module; not yet seen on a phone.
- Settings → Notifications: "Players you follow" section with two On/Off rows (follow.start, follow.final) and a line
  naming who you follow (`#nt-follow-who`).
- Full game log: a button under the last games loads `…/athletes/<id>/gamelog` (cached 10 min, `PLR.log`) and shows each
  season type (regular season, postseason, preseason) newest first, with ESPN's averages/totals rows (`tr.sum`).
  `PLR.full[key]` remembers it's open while the app is open.

## Open
- No in-game alerts for a followed player (a big night while it happens); only start and final. Ask DJ before adding.
- No list of followed players outside Box Office ★ and the Notifications line; unfollow is on the player page.
- Following needs the player page, which opens from a picture only (DJ, 3.112.2). Search (another thread) may add a way in.
