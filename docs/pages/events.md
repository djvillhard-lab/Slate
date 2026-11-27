# Events: golf and F1 (sports without two teams)
Last updated: Nov 27, 2026, 3.178.0
Code: `src/app/165-events.js` (data + card + All games sections + slate block), hooks in `160-all-games.js` (tabs in
`filterOpts`, a GOLF/F1 tab in `renderGames`, sections under the leagues on ALL) and `170-slate-page.js` (`evSlateBlock`
under the games, above Finished). Styles `src/styles/098-events.css`.

## Done
- Data straight from ESPN's free scoreboards in the browser (`evNeed(day)`): `golf/pga`, `golf/lpga`, `racing/f1`.
  Cached per day; refetched every minute while something is live (today only), else every 15 minutes. A change calls `liveRender()`.
- Golf: shown on days from the event's start to its end (ET dates; ESPN's dated scoreboard also returns it the Monday after).
  Position = ESPN's `order`, ties when totals match. Total = sum of the rounds' to-par (`linescores[].displayValue`),
  because the LPGA feed's `score` field disagreed with its rounds on Nov 19. "Thru N" = holes listed for the current round (PGA only has them).
- F1: shown on any day with a session (home time). Card lists all sessions; the leaderboard is the live session's running
  order or the latest finished session's order. No teams or gaps (ESPN's scoreboard doesn't give them). On the slate only
  on qualifying, sprint and race days.
- All games: GOLF and F1 tabs appear only on days with an event (a quiet tab would hit `LEAGUES[k].name` in 240-chrome.js).
  On ALL they fold like leagues (`COLLAPSED` by section title). Events don't count toward the 16/10 card caps.

## 3.119.1: Slate rules (DJ: "golf leaderboards should not show on slate page unless that tournament falls within slate rules")
- `state.rules.sports = { golf: {majors,pga,lpga}, f1: {race,qual} }`, kept by `normRules` (050-slate-engine.js) from `EV_RULES`.
  All off by default; the slate shows an event only when `evRuleOn(x)` says yes. All games always shows everything.
- Slate rules page: "Golf and racing" section after By league (`evRulesBlock`, cards in the league-card style).
- Majors = `GOLF_BIG` name regex (four majors, Players, Tour Championship, Ryder/Presidents/Solheim Cups, LPGA majors, CME).
- Server side (tick.py, alerts) doesn't know about events; they aren't in the stored slate or alerts.

## 3.121.2: men's and women's golf apart (DJ)
- Two sports: `golf` (Men's golf, PGA tab, `golf/pga`) and `wgolf` (Women's golf, LPGA tab, `golf/lpga`); both have `golf: true`
  in EV_SPORTS and events carry `x.golf`. Separate sections, Slate rules cards (majors / every event each) and slate sections.
- normRules moves an old `sports.golf.lpga` / `.majors` to `sports.wgolf` once.

## 3.178.0: made-for-TV golf (DJ: "4 pro golfers playing a match on prime video right now. Would've been cool for slate to know that")
- Why it was missed: ESPN's golf scoreboards (`golf/pga`, `lpga`, `liv`, `eur`) only list tour events. The Skins Game (Prime Video, Nov 27, 2026)
  wasn't in any; neither were last December's Showdown, Grant Thornton Invitational or PNC Championship. TheSportsDB isn't reachable from cloud sessions.
- So `GOLF_TV` in 165-events.js is a hand-kept list: each day's broadcast start (with time zone) and about how many hours it runs, channel(s), a
  one-line "what", and who's playing (pairs for team events). `evTv(day)` turns them into event cards (`x.tv`), added in `evList` (not cached, so
  Live/Final follows the clock). Card: "TV" tag, Live / Day N / start time, a "Playing" list (no positions or scores: no free source has them), Watch buttons.
- Slate rules: Men's golf → "Made-for-TV matches" (`sports.golf.tv`). DJ: on for everyone who had saved rules before 3.178.0 (normRules turns it on
  once and marks `tvg: 1`, so turning it off sticks), off for new people like every rule (welcome and RULE_DEFAULTS carry `tvg: 1`).
- In the list: Skins Game (Nov 27), Grant Thornton Invitational (Dec 11 to 13, Golf Channel then NBC). Left out until times are announced: Golf
  Channel Games (Dec 16, prime time, Golf Channel + USA, McIlroy's team vs Scheffler's) and the PNC Championship (Dec 19 to 20, NBC/Golf Channel).
  Where to look: golf.com / Golf Digest "TV schedule" posts, pgatour.com tournament pages. TGL is in ESPN's `golf/tgl` feed (team matches; not wired up yet).

## Open (DJ's order: golf, F1, then UFC, tennis, NASCAR)
- UFC: on hold (DJ, Nov 20). When it's a go: fight cards are head-to-head (`mma/ufc`, competitions = bouts with 2 competitors) and run every weekend.
- Tennis (`tennis/atp`, `tennis/wta`): off until Davis Cup / the Australian Open in January. NASCAR (`racing/nascar-premier`) back in February; reuses the F1 card.
- All games can't hide golf or F1 tabs yet (Settings' league list is built from `LEAGUES`). The Live button's count doesn't include events.
- `site.web.api.espn.com/.../golf/leaderboard` has richer golf data (cut line, tee times) but cloud sessions can't reach it to test.
