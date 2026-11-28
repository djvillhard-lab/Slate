# Buttons: one kit
Last updated: Nov 27, 2026, 3.181.0
Review: https://claude.ai/artifact/LajCd8TxtmjXzmUDZzjTPh (DJ picked "Build all three, one at a time": navigation tidy 3.180.0, this kit, then All games in two rows).
Code: `src/styles/112-button-kit.css` only (loaded last in `src/shell.html`). No JS. The rules are in `docs/DESIGN.md`, "Buttons: one kit".

## Done (3.181.0)
- One capsule height, 32 points: Feed on game cards (was 26), Add bet (26), sport chips on Teams (28), Add to slate (30), On TV's picker (40), Swap and Watch (44, squared), Rules and Edit on On TV (green words).
- Matchup: Add bet and Add to slate share the glass capsule; with a Live feed block on the page, Claude's button takes the plain glass fill; the folding section's title is ink.
- Live feed game chips: picked is lit glass, not an accent outline.

## Open
- On TV's Rules and Edit are still two buttons (one "Edit TVs" would need JS in `215-tv-setups.js`).
- My TVs / Channels and All / Best of each league / National TV are still accent words (the glass release's second-row rule). Release 3 looks at All games' rows.
- Not touched: News (its own look), Settings' rows, the wide "Show ..." rows in box scores (`.bx-more`, 36), Simple mode, Classic menu.
- The Live feed's focus button stays beside Back (DJ, Nov 26).

## How to undo
Remove the `{{styles/112-button-kit.css}}` line from `src/shell.html` and rebuild. Branch `pre-button-kit` is main from just before.

## Decisions
- On TV's styles are injected by `215-tv-setups.js` after the page's CSS, so kit rules for `.tvs-*` carry `html` and `:not(#_)` to win.
- `.tvs-acts` is two things in that file (the top row's Rules/Edit and the edit page's action row); the kit only aligns the one inside `.tvs-top`.
- Toolbar rows stay 32 tall (`.lo-row` is tuned to fit the folded Duo at XL), so 32 became the one height instead of 36.

- 3.187.1: the kit sets `display` with `!important`, which un-hid the corner Feed button on an open card (DJ's screenshot, Nov 27). The kit now ends with a rule that keeps hidden things hidden; when adding a selector to the kit, check whether anything hides it with `display: none` and add it there.
