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

## Testing (Nov 16, 2026)
- On a light Monday nothing reached the 45 bar (the best was 40), so both sections were empty. 3.57.1 added a temporary
  per-phone test switch (bar 25, up to five; Worth a look took any live game), and 3.58.1 removed it after DJ rated 7 games.
- DJ's 7 thumbs (2 up: two women's/late college games; 5 down: unranked national-TV men's college, an event, NHL, a live
  game) taught: fewer college games with no ranked team, men's college hoops, NHL and "Spotlight" picks; more women's
  hoops and late starts. A conference can net to zero when one team in it is liked and another disliked (Big Ten here).

## Specific beats broad (3.59.1)
- DJ didn't want a few thumbs down on weak national-TV men's college games to stop those games being suggested.
  Now: teams count from the first thumb (coef 6); categories (league, conf, reason tag, time, TV, ranked) ignore the
  first 2 net thumbs (FB_FREE), count at most ±2 after that, coef 2 (TV 1), and all categories together are capped at
  ±8 (FB_BROAD_CAP). "No ranked team" was dropped as a feature. Settings lists only features that actually bite.
- Spotlight (national TV) suggestions get +10 in a league with affinity ≥ 8, so they reach the 45 bar on their own.
  On Nov 16 that put Alcorn State at Maryland and WKU at Tulsa in DJ's Suggested for you (46 each).

## Thumbs only on Suggested for you (3.60.1)
- DJ: thumbs up should add the game to the slate, and Worth a look should keep just + and ✕. So: 👍 = fbSet(+1) +
  logAct accept + toggle() (its "Added to slate" toast; undo = the ✓ on the slate). Add to slate button removed.
  Worth a look's ✕ is restored as before 3.57.0 (logs "skip" only, hides for today; no learning). Its scoring still
  uses fbAdj, so thumbs from Suggested for you shape it.

## Open / ideas
- Thumbs on the rule-picked slate cards themselves weren't added (they'd clutter every card); the rules decide those.
- Forgetting a single chip in Settings (tap to remove) if DJ wants finer control.
