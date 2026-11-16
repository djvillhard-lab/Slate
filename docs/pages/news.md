# News
Last updated: Nov 16, 2026, 3.49.1
Code: `src/app/200-news.js`, styles under "News (3.45.0)" at the end of `src/styles/040-components.css` (`nx-` classes),
server prompts and saving in `worker/index.js` (kind `news` key `page`, and kind `deep`). Mockups DJ approved:
https://claude.ai/artifact/AhuwhXUWpb47z1e13SGP7C

## Done
- Options screen ("Customize today's news", 3.47.1): three groups, Today's slate, My teams, Leagues. No group
  checkmarks and nothing picked to start; the user picks each game, team and league (chips), with "n of N picked" and
  All / Clear per group. Game chip = league tag and time above the two team badges; team chip = badge + league tag.
  Saved on the phone (`slate-newspicks`: `gs` = picked game ids for one day, `gt` = the teams of those games, so their games start
  picked on a new day (3.49.1), `ts` = picked teams, `lgs` = leagues).
  A running clock shows while Claude writes.
- One Claude request writes the page to `mine/news-<date>`: top (5), games, teams, leagues. Free ESPN and Athletic
  headlines are gathered in the app and sent as facts.
- Page: Generated bar (time, how long ago, what it covered) + Regenerate (reopens the options); Top news, collapsible
  and remembered (`slate-newstop`), with New tags after a regenerate; Games | Teams | Leagues tabs, leftmost first.
- Breakdowns: "Claude's breakdown" on a game or league card, or a team tile, opens a deeper write-up. Written on that
  tap if nobody has written it today, saved to `newsdeep/<date>-<g|t|l>-…`, shared by every account.
- Back (dock, swipe, or the row on top) returns from a breakdown to the page: one line in `goBack()` (070-navigation).
- Every generate, regenerate and breakdown goes through `/api/summary`, so testers' 10-a-day cap counts them.

## Open
- Sizes confirmed with real generates on the test profile (Nov 16): 3 games/4 teams/4 leagues in 62 s, 12/13/4 in 98 s,
  both inside the 24,000-token limit. DJ's Nov 16 "it fails on a small selection" report was the old failure's
  `writing.error` still showing; 3.49.1 shows a failure for 30 minutes at most and hides it once a pick changes.
  The worker no longer returns the 3-minute-old page for a News regenerate, and a too-long failure isn't counted
  toward a tester's 10 (`stats/usage` day.fail).
- A full slate (26 games) plus all teams is untested and may take 2 to 3 minutes (one long Claude answer). If DJ wants it faster, split the
  page into parallel requests (top + games, teams, leagues).
- No "Earlier" list of past days' pages. Top news stories aren't tappable.
- Old `.nw-*` styles in `050-ux-review.css` are unused now and can go.

## Decisions
- Claude writes only on a tap: Generate for the page, and the tap that opens a breakdown. Nothing automatic (cost).
- Top news is only as fresh as the last generate; no background checking (DJ, Nov 15).
- Tags sit on their own line above the text so every card's text starts at the same edge (DJ asked for this).
- Breakdowns stay inside the News view (`nw.deep`), not a new view, so the iPhone app's strip needs no new build.
- Picks are opt-in, nothing pre-picked, no group checkmarks (DJ, Nov 16). "Team logos" = the app's team badges with
  abbreviations (`badgeFor` / `teamBadge`); Slate has no logo images.
