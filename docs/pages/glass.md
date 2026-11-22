# Glass controls (Liquid Glass look)
Last updated: Nov 22, 2026, 3.126.0
The review with before and after pictures: https://claude.ai/artifact/Rs1HiiTausoiKqduM5Zo4m. DJ chose level A: glass on
controls, content stays solid Scorebug. Rules are in `docs/DESIGN.md`, "Glass".
Code: `src/styles/100-glass.css` only (loaded last in `src/shell.html`). No JS.

## Done
- Release 1, 3.125.0: header with no bar or line and a blurred scroll edge (`header.top::before`), header buttons as
  glass circles, tab rows (`.strip`, `.nw-tabs`: All games, News, Box Office) as one glass capsule with a lit lozenge,
  second-row filters (`.substrip`) as plain words with the accent, Time/League, Board and Live as glass pills.

- Part 2, 3.126.0: painted capsules for buttons on cards and pages (`.g-feed`, `.gv-act`, `.myb-chip`, `.outline`,
  `.chwatch`, `.csp-c`, `.fd-scf`, `.nx-all`, `.tray-acts button`, `.ta-nt`, On TV's `.tv-bar .rlink`); the main action
  at 16px with a lit edge (`.full-mu`, `.feed-go`, `.cl-go`, `.nx-go`); capsule fields and pickers (`input.field`,
  `input.search`, `select.sel`); segmented choices (`.seg`) as capsules; a glass switch track (`.switch`); the Live
  feed's switcher (`.fd-strip.fd-filt`) as a capsule with a lit lozenge.

## Open (in the order DJ saw in the review)
- Part 3: sheets, pop-ups, Undo, the update banner as floating glass sheets.
- Idea to try: a pinned glass score bar on the Live feed.
- One iPhone build (needs DJ's yes): Home Screen widget clear/tinted styles, layered app icon, Watch buttons.
- Left alone on purpose: quick-look drop-downs (`.tdd-h`, plain rows), "It lists" chips (`.lgchip`: capsules crowded
  their check boxes), On/Off pairs drawn as switches (`#score-seg`, `.seg2[data-pref]`), Live feed game chips.
- Not from this work: at Text size XL on the folded Duo the slate's Time/League pill is cut off at the left edge
  (same on `pre-glass-controls`).

## How to undo
- Remove the `{{styles/100-glass.css}}` line from `src/shell.html` and rebuild: the whole look is off.
- Branch `pre-glass-controls` is main from just before 3.125.0.

## Decisions
- Older rules use `:not(#_):not(#_)` to force 8px corners (`070-ux-review-3.css`), so some glass rules repeat that
  trick to win. Check the computed style, not the rule.
- Only the header blurs. Tab capsules and toggles are painted (no `backdrop-filter`), so a long list of games costs
  nothing extra to scroll. The header's fade is nearly solid behind the title and the tabs so scores under it never
  compete with them.
- The old tab underline (`::after`) is reused as an invisible taller tap area, so tabs keep a 44-point target.
- Selected tab is lit glass with white text, not the accent (DJ went with the recommendation).
- No Settings switch for the look; the restore point is the way back.
- Mockups for later releases: `/mnt/project-files/liquid-glass/mock.js` through `scripts/shots.py --eval`.
