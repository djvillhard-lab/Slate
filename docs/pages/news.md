# News
Last updated: Nov 15, 2026, 3.45.0
Code: `src/app/200-news.js`, styles under "News (3.45.0)" at the end of `src/styles/040-components.css` (`nx-` classes),
server prompts and saving in `worker/index.js` (kind `news` key `page`, and kind `deep`). Mockups DJ approved:
https://claude.ai/artifact/AhuwhXUWpb47z1e13SGP7C

## Done
- Options screen: Today's slate, My teams, Leagues (chips), then Generate news. Picks saved on the phone (`slate-newsopts`).
- One Claude request writes the page to `mine/news-<date>`: top (5), games, teams, leagues. Free ESPN and Athletic
  headlines are gathered in the app and sent as facts.
- Page: Generated bar (time, how long ago, what it covered) + Regenerate (reopens the options); Top news, collapsible
  and remembered (`slate-newstop`), with New tags after a regenerate; Games | Teams | Leagues tabs, leftmost first.
- Breakdowns: "Claude's breakdown" on a game or league card, or a team tile, opens a deeper write-up. Written on that
  tap if nobody has written it today, saved to `newsdeep/<date>-<g|t|l>-…`, shared by every account.
- Back (dock, swipe, or the row on top) returns from a breakdown to the page: one line in `goBack()` (070-navigation).
- Every generate, regenerate and breakdown goes through `/api/summary`, so testers' 10-a-day cap counts them.

## Open
- Not yet checked with a real generation (it needs DJ's passcode and costs money). Shipped after checking sample pages
  only. Ask DJ how the first real page read before tuning the prompts.
- Doesn't follow docs/DESIGN.md yet (written just before the guide landed): Generate, Regenerate, the tabs and league
  chips use 999px pills (guide: 8px), dividers use `--line` (guide: `--hair`), and the two green buttons use `#fff`
  instead of `--on-accent`. Fix in the next News release and check with `scripts/shots.py`.
- No "Earlier" list of past days' pages. Top news stories aren't tappable.
- Old `.nw-*` styles in `050-ux-review.css` are unused now and can go.

## Decisions
- Claude writes only on a tap: Generate for the page, and the tap that opens a breakdown. Nothing automatic (cost).
- Top news is only as fresh as the last generate; no background checking (DJ, Nov 15).
- Tags sit on their own line above the text so every card's text starts at the same edge (DJ asked for this).
- Breakdowns stay inside the News view (`nw.deep`), not a new view, so the iPhone app's strip needs no new build.
