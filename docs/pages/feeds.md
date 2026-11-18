# ESPN feed check
Last updated: Nov 18, 2026 (no app version: scripts and worker only)
Code: `scripts/feedcheck.py` (the check), `scripts/tick.py` (runs it at the end, at most once every 55 minutes), `worker/alerts.js` `feedsAlert` (the push).

## Done
- DJ, from the Nov 18 competitor review (Slate's data comes from ESPN's unofficial feeds, which can change without notice).
- Each hour: one scoreboard for NBA, NFL, NHL, college hoops and the Premier League, one game summary, and the NBA standings. It looks for the fields the app reads (teams, scores, status, start time, box score players, plays with score and period, standings stats).
- Result in Supabase `stats/feeds` {at, problems, bad, told}. `bad` counts failed checks in a row.
- The worker looks every 10 minutes. Two failed checks in a row with a new set of problems: one push to DJ's own devices ("Slate: an ESPN feed changed" and the first problem). All clear after that: one push ("ESPN feeds are back to normal").
- `python3 scripts/feedcheck.py` prints what the check finds and writes nothing.

## Open
- Not on DJ's Project status page yet (`stats/feeds` could be a card there).
- Doesn't check odds, team pages, athlete game logs or the college standings.
- Project push notifications didn't reach DJ's phone in a Nov 15 test; this uses Slate's own push list (the one feedback alerts use), not the project's.
