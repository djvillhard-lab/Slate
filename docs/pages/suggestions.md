# Suggested for you and Worth a look: thumbs up and down

Code: `src/app/185-thumbs.js` (storage, learning, buttons, Settings panel), hooked into `src/app/180-worth-a-look.js`
(`gameSuggestions`, `liveSuggestions`, `walBlock`, `suggestionBlock`), Settings row in `src/body.html` (`#fb-head`)
rendered from `230-settings.js`, styles at the end of `src/styles/070-ux-review-3.css` (shell.html was held by another thread, so no new style file).

## Done (3.57.0, Nov 16, 2026)
- 👍 / 👎 on every Suggested for you card (left of Add to slate) and every Worth a look card (where the ✕ was).
  👎 hides the game (logs the old "skip" so it's gone for the day) with a top Undo. 👍 lights up; tap again to undo.
- Stored per person in `data/users/<uid>/feedback` (`{v:1, list:[{v:±1, t, d, id, src, tag, league, start, away, home,
  *Short, *Conf, *Rank, nat}]}`), last 300 within a year. Drew and Doug's go to `u/<id>/feedback` through the
  existing save path. No database change was needed.
- Learning: each thumb teaches features (team, league, college conference, the suggestion's reason tag, late/early
  start, national TV, ranked-vs-ranked or no ranked team). Weight = sum of ±1 halving every 45 days. Score change =
  sum of coefficient × weight (team 6, reason 5, league/conf/time/ranked 3, TV 2), each weight capped at +2 / −3,
  total capped at +15 / −40.
- Variety guards: likes lift at most 15 and a game still needs its own reason; a team with net ≥ 2 likes gets a
  "You gave X a thumbs up" reason; Suggested for you shows at most two games per league; old thumbs fade.
- Two net thumbs down on a team (not one of your teams) keeps its games out of both sections. Worth a look also drops
  a game when the thumbs push it down by 20 or more.
- Settings › Thumbs up and down: summary, More of / Fewer of chips, Start over (with Undo).

## Open / ideas
- Thumbs on the rule-picked slate cards themselves weren't added (they'd clutter every card); the rules decide those.
- Forgetting a single chip in Settings (tap to remove) if DJ wants finer control.
