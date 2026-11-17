# Team logos and colors

Files: `src/app/045-team-logos.js`, `src/styles/080-team-logos.css`, `badgeFor` in `040-live.js`, `badgeColor` in `110-box-score.js`, `sw.js`, `scripts/slates.py`.

## What's done
- Every team chip comes from `badgeFor()`, so the logo goes in there once and shows on the slate, All games, matchup, quick look,
  Betting lines, News, Box Office, live feed, Teams and Settings. No page file changed.
- The chip keeps its 42x24 box. The logo is an absolutely placed image inside it (30px tall), so nothing moves while it loads.
  Colors and letters show first; the chip gets class `lg` when the image has loaded. A failed image leaves the old chip.
- Where a logo comes from: the game (`awayLogo` / `homeLogo`, saved by `slates.py`), then ESPN's live scoreboard (`logoNote`),
  then ESPN's teams feed per league, kept in localStorage `slate-logos-v1` for a week (name -> logo, color, alternate).
- Images are ESPN's resized copies (`a.espncdn.com/combiner/i?...&w=96&h=96`, about 4 KB). `sw.js` keeps them in the
  `slate-logos-v1` cache, so each downloads once. Midnight uses ESPN's `500-dark` logo; Sunday Paper the regular one.
- Colors: `slates.py` now saves ESPN's color and alternate for college teams too. `pairColors(g)` picks the alternate when the
  two teams are within 90 (RGB distance) or the main color vanishes on the theme; `badgeColor()` uses it (live feed, box score tints).

- Shipped in 3.60.0. The morning email (`worker/morning-email.js`, `mark()`) uses the dark logo as a 30px image when the game carries `awayLogo` / `homeLogo`, else the lettered chip.
- Teams, Settings and the welcome picker get logos through `teamBadge()` -> `badgeFor()`; nothing to do there.

- 3.62.4: DJ reported NFL logos missing. Pro leagues (NFL, NBA, WNBA, NHL, MLB) now build the logo path from the app's own team list (`LOGO_PRO` in `teamLook`: league + abbreviation, checked against ESPN for all 138 teams), so they never wait on the teams feed. A failed feed retries in 2 minutes. The exact failure on DJ's phone was not reproduced; a failed NFL feed download is the likely cause.

- 3.79.2: On Midnight, `addLogo` reads each dark logo once (`logoStats`, canvas): average saturation under 0.12 = one-color mark, then the regular logo is used if it is colorful (over 0.3) and bright (at least 0.3), the same rule the live notifications and email use. The choice is kept per logo in localStorage `slate-logos-pick`. A remembered logo that hasn't loaded in 4 s drops `lg` so the chip shows; an empty picture counts as a failed one. National teams come from ESPN's `soccer/fifa.friendly` teams feed (`intl` in LOGO_FEEDS), since games don't carry their logo.
- 3.81.11: DJ saw GER/NED/SUI/SCO as plain chips. Saved intl games carry no awayLogo/homeLogo, and two-pane mode (288-panes.js) makes render() do nothing, so the chips never redrew when the intl team list loaded. Now `logoGames` builds `countries/<abbr>.png` for intl games, and chips with no logo yet carry `data-lg-wait`; `logoFill()` fills them after a team list or a live-scoreboard logo arrives.

## Open
- iPhone Lock Screen and Dynamic Island still show text only. Logos there need `ios/` work and a TestFlight build; not done.
- Teams ESPN has no logo for (some small colleges, lower-division opponents) keep the colored chip.

## Decisions
- Logo replaces the abbreviation in the chip rather than sitting next to it: no room on the folded Duo for both.
- No worker proxy for logos: the phone's own cache plus ESPN's CDN is enough, and it costs nothing.
