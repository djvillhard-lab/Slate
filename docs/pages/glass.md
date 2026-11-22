# Glass controls (Liquid Glass look)
Last updated: Nov 22, 2026, 3.125.0
The review with before and after pictures: https://claude.ai/artifact/Rs1HiiTausoiKqduM5Zo4m. DJ chose level A: glass on
controls, content stays solid Scorebug. Rules are in `docs/DESIGN.md`, "Glass".
Code: `src/styles/100-glass.css` only (loaded last in `src/shell.html`). No JS.

## Done
- Release 1, 3.125.0: header with no bar or line and a blurred scroll edge (`header.top::before`), header buttons as
  glass circles, tab rows (`.strip`, `.nw-tabs`: All games, News, Box Office) as one glass capsule with a lit lozenge,
  second-row filters (`.substrip`) as plain words with the accent, Time/League, Board and Live as glass pills.

## Open (in the order DJ saw in the review)
- Release 2: buttons on cards (Feed, Add to slate, Add bet, Game alerts) as painted capsules, the main action at 16px,
  search boxes, switches, segmented controls (`.seg`), the Live feed's league switcher and On TV's channel buttons.
- Release 3: sheets, pop-ups, Undo, the update banner as floating glass sheets.
- Idea to try: a pinned glass score bar on the Live feed.
- One iPhone build (needs DJ's yes): Home Screen widget clear/tinted styles, layered app icon, Watch buttons.
- The new sizes (44px circle, 36px tabs) are plain px, not divided by `--z`; check them at Text size L and XL in
  release 2.

## How to undo
- Remove the `{{styles/100-glass.css}}` line from `src/shell.html` and rebuild: the whole look is off.
- Branch `pre-glass-controls` is main from just before 3.125.0.

## Decisions
- Only the header blurs. Tab capsules and toggles are painted (no `backdrop-filter`), so a long list of games costs
  nothing extra to scroll. The header's fade is nearly solid behind the title and the tabs so scores under it never
  compete with them.
- The old tab underline (`::after`) is reused as an invisible taller tap area, so tabs keep a 44-point target.
- Selected tab is lit glass with white text, not the accent (DJ went with the recommendation).
- No Settings switch for the look; the restore point is the way back.
- Mockups for later releases: `/mnt/project-files/liquid-glass/mock.js` through `scripts/shots.py --eval`.
