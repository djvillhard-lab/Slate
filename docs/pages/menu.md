# Menu and the Slate logo
Last updated: Nov 16, 2026, 3.64.1

## Done
- The Slate logo is an axe-hammer (3.63.0): a hammer face on one side, an axe blade on the other, tilted 35 degrees,
  the handle through a small head, a lighter handle with a grip band, and two sparkles off the blade. One shape,
  drawn on a 24-point grid, in four places that must stay the same:
  - the page header logo: `svg.brand` in `src/body.html` (both panes), colored by `--accent` in `styles/060-header.css`;
  - the web menu's Slate button: `#nav-lineup` in `src/body.html` (head always filled in);
  - the iPhone app's menu: `SlateAxeIcon` in `ios/Slate/RootView.swift` (symbol name `slate.axe`);
  - the Home Screen icon: `icon.svg`, rendered to `icon.png` (180) and `ios/.../AppIcon-1024.png` (headless Chromium).
- iPhone app menu: the page you're on has a disc behind it; on Sunday Paper it's white on dark green (build 40).
- On TV in the web menu is an outline like the other icons.

## Open
- The Swift icon was written without a compiler or a phone to check it on. Look at build 40's menu on DJ's Duo.
- The Lock Screen and Dynamic Island still don't show the logo.

## Decisions
- DJ picked the shape over several rounds (Nov 16): not a wand, not a gavel; tilted, small head, handle through,
  two-tone, sparkle (not a shine line). Pictures are in the Claude project files, `screens/menu-icons/`.
- The other menu icons stay Apple's symbols.
- The hammer's head is always filled in, in every menu, selected or not (3.64.1, build 42). DJ didn't like the outline head.
