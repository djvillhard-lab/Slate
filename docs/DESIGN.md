# Slate design guide

Read this before changing anything people see. It describes how Slate already looks, so a new page or feature fits in
without a redesign. When this guide and the code disagree, the code shows what's live: fix the guide or the code,
whichever is wrong, in the same change.

## The look in one paragraph
"Scorebug": sharp, clean, broadcast (the note at the top of the Scorebug section in `src/styles/030-duo.css`). A navy
night base (black and light looks too), one type family (Archivo) used at different widths, team chips like a TV score
bug, thin hairlines between things instead of boxes around them. Two layers (3.125.0): **content is Scorebug** (solid,
small sharp corners, hairlines) and **controls are glass** (anything you tap to move, switch or act: see "Glass"). **Red means live. The accent means selected or yours.** Nothing else gets a color of its own.

## Color
Use the theme variables. They change with the look (navy, black, light) and the accent is DJ's own setting, so a
hard-coded color breaks in the other looks.

| Variable | Use it for |
|---|---|
| `--bg` | the page |
| `--card` | cards and panels on the page |
| `--raise` | things on a card: chips, quiet buttons, empty bars |
| `--hair` | 1px dividers between rows and sections (the usual line) |
| `--line` | borders that need to show more than a hairline (inputs, outlined buttons) |
| `--ink` | main text, numbers |
| `--head` | section titles |
| `--muted` | secondary text (records, details) |
| `--dim` | meta text (counts, timestamps, "last 6") |
| `--accent` / `--accent-fill` + `--on-accent` | selected, yours, the one main action, a hit |
| `--live` | live, and things that went wrong (a miss, a turnover) |
| `--glass` / `--glass-line` | floating controls only |

Allowed fixed colors: team colors (always through `badgeFor()` / `badgeColor()`, which keep text readable), and
broadcast conventions inside a graphic (the blue line of scrimmage and yellow line to gain on the Live feed's field).
Blend with `color-mix(in srgb, var(--accent) 10%, var(--card))` for tinted cards rather than new colors.

## Glass (the controls layer, 3.125.0)
DJ chose "glass controls, solid content" on Nov 22, 2026 (review: https://claude.ai/artifact/Rs1HiiTausoiKqduM5Zo4m;
notes `docs/pages/glass.md`). All of it lives in `src/styles/100-glass.css`.
- Glass goes on controls only: the page header and its buttons, tab rows, toggles, the floating menu, Back and day
  pill. Never on content (game cards, scores, one-liners, box scores, news cards), and never glass on top of glass.
- Blur (`backdrop-filter`) only on things that stay put while the page scrolls: the header's scroll edge, the bottom
  controls, an open sheet. Anything that scrolls with the page is painted glass: `--lg-fill`, a `--lg-edge` border and
  the `--lg-hi` lit edge, no blur.
- A selected tab is a lit lozenge (`--lg-lit`, `--ink` text). The accent still marks the chosen filter in a second
  row and the chosen side of a segmented control. Red is still only live.
- The header has no bar and no hairline: content blurs and fades under it.
- Reduce Transparency and Increase Contrast get solid fills (the media query at the end of the file).

## Type
- One family: Archivo (`--font`). Width does the work: `font-stretch` about **66%** for scores and times (condensed
  numerals), **78–92%** for chips and small labels, **112–118%** for page titles and league tabs.
- Weights: 700 for text, 800 for names, numbers and titles. No light weights.
- Sizes: 11 (small chip text) · 12–13 (meta: records, counts, times under things) · 15 (section titles, secondary
  lines) · 16 (body, team and player names) · 18–22 (key numbers; 22 condensed for scores in a card) · 28 (page title).
- Numbers are tabular everywhere (set on `body`). A losing or trailing score goes `--muted`.

## Shape and spacing
- Corners: **4px** for chips, tags and channel links (`.badge`, `.bug`, `.net`), **8px** for cards, buttons,
  inputs and segmented controls. **999px** capsules for glass controls: tab rows, the small toggle pills (`.lo-btn`,
  `.sl-seg`), round header buttons and the floating menu.
- Spacing steps: 4, 8, 12, 16, 24. Page side padding 16. Between sections 18–24.
- Rows are separated by `--hair` lines; use a card (`--card`, 8px) only for something that's one tappable unit.
- Tap targets are at least 44 points tall (40 is the floor for header icons).

## One hand, three phone shapes
- DJ is right-handed and uses one hand. Anything used often goes **bottom right**, under the thumb: Back, the menu,
  day pickers, a page's main toggle. Nothing important in the top left.
- Check every look change at all three shapes (`scripts/shots.py`):
  - **folded** iPhone Duo: narrow, with the app's side column on the right (the menu capsule lives there, and
    nothing may sit under it);
  - **open** iPhone Duo, sideways: two panes (3.80.0), each its own copy of the app laid out like the folded phone,
    with its own menu and Back. The slate on the left and All games on the right to start; the grip on the fold moves a
    page across (`288-panes.js`, `docs/pages/panes.md`). A page that fits the folded phone fits a pane;
  - **iphone**: a regular iPhone, the page's own floating menu bottom right.
- Every page's header is the same (3.44.0, `src/styles/060-header.css`): the Slate mark level with the page name,
  then the hairline. A second line only where there is one (the slate's date picker; the day on All games, On TV and
  Box Office); other pages get a one-line header with a smaller mark. No blank second row, no extra space on top.
- Nothing important under the clock and Wi-Fi at the top of the folded Duo's side column.

## Parts to reuse (before making new ones)
| Part | Where | Notes |
|---|---|---|
| Team chip | `badgeFor(abbr, name, color, alt)` | 42×24 box. Shows ESPN's team logo (`045-team-logos.js`) once it has loaded; until then, or if there is none, the team color with the abbreviation and alternate-color stripe. Never size a logo outside this box |
| Game card | `gameRow(g, mode)` in `150-game-row.js` | the same card on the slate, All games, On TV |
| Section header | `.sl-h` (button: bold title, `.count`, `icon("more")` chevron) | folds; fold state saved in `state.slateFold` |
| Section title (not folding) | `.sec h2` + `.count` | |
| Dropdowns in a quick look | `.tdd` / `.tdd-h` (`dd()` in `trayBlock`) | remembers open or closed per section |
| Segmented control | `.seg` with `aria-pressed` | a choice between two or more named options; selected = accent fill |
| On/off switch | `.switch` (`aria-checked`); an On/Off `.seg2[data-pref]` in Notifications draws as one too | one thing that is on or off. Never a two-part pill for on/off |
| Small toggle pill | `.lo-btn` (with `.lo-dot`, count in `b`) | live = red |
| Status tag | `.bug` (`.bug.live` red) | "Final", "Q3 5:12" |
| Channel link | `.net` | accent play triangle when it opens an app |
| The one main action | `.full-mu` (accent block, title + one line under it) | one per screen at most |
| Quiet note / empty state | `.notice`, `.pv-none` | say what to do next |
| Undo | `topUndo(text, fn)` | small, top center, 5 seconds |

## Motion
Only to show what changed: a section opening or closing, a new play arriving, a menu growing out of its button.
Short (0.15–0.3s), and none at all with Reduce Motion (`@media (prefers-reduced-motion: reduce)`). The live dot's
pulse is the only motion that loops.

## Words
- Plain and specific, sentence case: "Starts 7:20 PM", "Live · Q3 5:12", "Final", "5 of last 6", "Show all 12".
- No all caps (team abbreviations aside), no exclamation marks (scoring plays aside: "Touchdown!").
- Name the thing by what DJ sees, not how it's built: "Live notification", not "Live Activity token".
- A button says what happens: "Add to slate", "Live feed", "Show earlier plays".

## Data
Show only numbers a source gives (ESPN, Apple, the sportsbook line). Never estimate, project or recreate a stat. If a
source has nothing, leave the line out rather than filling it.

## One feature, many sports
When a feature reaches another sport, it keeps the same skeleton (switcher, score bar, the sport's own graphic,
the list, the box score) and only the sport's own parts change.

## Styles are layered
`020-base.css` → `030-duo.css` (the Scorebug look) → `040-components.css` → `050-ux-review.css`; later files win
and some rules use `!important`. Don't trust one rule you read: check the computed style or a screenshot.
New styles go at the end of `040-components.css` under a comment naming the feature and version.

## Known drift (bring in line when you next touch these)
- Live feed and Best bets use plain-width big numbers; the rest of the app uses condensed numerals. (Their corners and
  the Hit color were brought in line in 3.50.0.)

## Emojis
Only on the News page, at DJ's request (Nov 16, 2026): one emoji in front of a section label or tag (🔥 Hot, 🧊 Cold,
🚑 Injuries, 🔢 The number, ⭐ Performances, 🚨 New). Never inside body text, and not on other pages unless DJ asks.
The Live feed's play tags too (DJ, Nov 16, 2026): one emoji in front of each tag (🔥 Big play or a run, 🔄 lead change,
🤝 tie, ✅ converted, 🛑 stopped, ⛓️ 1st down, 📈 win-probability swing, 🚩 flag, 🚨 red zone or buzzer-beater,
⏱️ two-minute drill or clutch, 💪 and-one), never in the play text. `fdTagText` in `146-live-feed-hoops.js`.
Hot tags on News are red (`--live`) with their 🔥, DJ's approved exception to "red = live" (Nov 16, 2026).
