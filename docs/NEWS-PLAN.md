# News page (planned; build after the iOS app is set up)

Decided with DJ on Nov 14, 2026. Anything that costs money is tap-only (no automatic daily briefs).

## 1. News page (free)
- New menu item "News". Tabs: My slate, My teams, then each league.
- Headlines from ESPN's public news feed (per league and per team) and The Athletic's public RSS feeds (already pulled for newsletters/headlines).
- Each item: headline, source, time, ESPN's one-line description; links open the article.

## 2. Claude briefs (tap-only, counts toward the 10-a-day cap for everyone but DJ)
- "Brief me" on each tab: quick hits (5-6 bullets) + a longer read (a few paragraphs on the big storylines), from Claude's own web research, in its own words, with links out.
- My slate brief: built around that day's slate: what to watch, injuries, storylines, why each game matters, in viewing order.
- Saved per day per tab, so reopening is free.

## 3. Learning (free)
- Track opens and time spent (briefs in-app; articles estimated by time away from Slate after tapping).
- Stored per account (Supabase), so it follows the user to the iPhone app.
- Used to order tabs and stories and passed to Claude as interests when writing the My slate brief.
