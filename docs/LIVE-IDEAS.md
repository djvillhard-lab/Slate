# Live scores on the Lock Screen and Dynamic Island: ideas for the redesign

Decided Nov 14, 2026 and built in 3.20.0 (ios/SlateLive/SlateLiveActivity.swift): the Lock Screen is the scorebug
(design A) with the slate's red one-liner; the expanded Dynamic Island is A's too (one-liner red); one game live
shows both chips and scores ("Chips"); a second game live shows the split ring. Mockups: the "Slate live notifications
redesign" design canvas. The ideas below that weren't used are kept for later.

## Lock Screen card
- Possession and down-and-distance for football ("ND ball · 2nd & 7 at BC 34"), bonus/fouls for basketball, power play for hockey.
- Win-probability bar along the bottom (ESPN predictor), filling toward the leader.
- Last scoring play in place of the stat line right after a score ("TD: J. Walton 12-yd run"), then back to the standout line.
- Team logos instead of the abbreviation chips; the team color as a thin edge on each row.
- The standout line in the app's own wording ("141 rush yds, 2 TD") instead of ESPN's raw text.
- Final state: winner bold with a small "W", the card turning neutral, and the time it ended.
- Stack: one card per game is the iOS rule; a "+2 more live" hint when several are running.

## Dynamic Island
- Compact: team color dots beside the abbreviations; a red dot while the clock runs.
- Expanded: possession arrow, timeouts left, last play, and a button to open that game's matchup in Slate.
- Minimal (sharing the Island): the leader's abbreviation and margin ("ND +34") instead of both scores.
- A short pulse/animation on a score change (iOS allows an alert with the update).

## Behavior
- Tap opens that game's matchup, not the home page.
- Fewer clock-only updates (every 2-3 minutes) to save battery; every score change still immediate.
- Choose which games get one: slate, my teams, close finishes only, or games added from Worth a look.
- End it a set time after the final (15 min, 1 hour, or iOS's 4-hour max) as a setting.
