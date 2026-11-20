# Events: golf and F1 (sports without two teams)
Last updated: Nov 20, 2026, 3.121.2
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

## Open (DJ's order: golf, F1, then UFC, tennis, NASCAR)
- UFC: on hold (DJ, Nov 20). When it's a go: fight cards are head-to-head (`mma/ufc`, competitions = bouts with 2 competitors) and run every weekend.
- Tennis (`tennis/atp`, `tennis/wta`): off until Davis Cup / the Australian Open in January. NASCAR (`racing/nascar-premier`) back in February; reuses the F1 card.
- All games can't hide golf or F1 tabs yet (Settings' league list is built from `LEAGUES`). The Live button's count doesn't include events.
- `site.web.api.espn.com/.../golf/leaderboard` has richer golf data (cut line, tee times) but cloud sessions can't reach it to test.
