# Slate release history

Version 1 is everything built before the first efficiency pass. Version 2 is everything from that pass up to Nov 11, 2026, ending with the build below.
Version 3 starts with the real iPhone app (the weekend of Nov 14–15, 2026): its first build is 3.0, and the web app moves to 3.0.0 the same day.
From 2.0.0 on, every change gets a new number: fixes and tweaks bump the last number (2.0.1), new features the middle one (2.1.0).
From 3.0.0 on, each release also says which iPhone app build in TestFlight goes with it, shown there as "3.0 (build)". Releases that only change the web app keep the build before them: the app loads the new page by itself.

## 3.91.2 (Nov 17, 2026)
TestFlight: 3.67.0 (43), no new build (web only)
- Game one-liners: when nothing big stands out, the line now says something real about the game instead of repeating the records, like "Pistons lead the Central by 1.5 games", "Pelicans have lost four of their last five", a strong home or road record, ESPN's win chance, or the better team's top scorer.
- Team logos: a logo that fails to download (the Thunder showed "OKC") is tried again a few seconds later instead of leaving the letters up.

## 3.91.1 (Nov 17, 2026)
TestFlight: 3.67.0 (43), no new build (web only)
- Matchup cards: the team-color edge is always split exactly in half, the first team on the top half of the card and the second on the bottom half, however tall the card is.

## 3.91.0 (Nov 17, 2026)
TestFlight: 3.67.0 (43), no new build (web only)
- Every matchup card now has the News page's team-color edge: a thin stripe down the left side, the first team's color beside its row and the second team's beside its own. It's on Today's Slate, Worth a look, All games, On TV, the matchup page's header card and Betting lines (a game total gets both colors; a player's line gets his team's). Tags like Your team and Ranked stay where they were.

## 3.90.6 (Nov 17, 2026)
TestFlight: 3.81.7 (46), no new build (web only)
- Unfolded Duo: opening the phone puts the page you had on the front screen on the left side. The right side shows the page it had last time, but never the same page as the left (then All games, or the slate if the left is All games).
- Closing the phone shows the left side's page on the front screen, instead of always going to the slate.

## 3.90.5 (Nov 17, 2026)
TestFlight: 3.67.0 (43), no new build (web only)
- All games: the line under an upcoming game stays on one line, as on the slate, and has no team abbreviation in front.
- Slate and All games: the 📰 News line gets shorter instead of ending in "…". Asides in brackets go first, then the end of the sentence: "Duncan Robinson and Ron Holland II are out", "The Irish open Players Era".

## 3.90.4 (Nov 17, 2026)
TestFlight: 3.81.7 (46), no new build (web only)
- News, Press Box: each team's notes on a game card are in that team's color only. On international games they had a two-color flag edge, which read as both teams' colors. Only the Matchup note is split between the two teams now; a note about neither team (kickoff time, TV) uses the app's accent color.
- News: a game's league line is shortened the same way as on Today's Slate ("INTL · Nations League · 2nd leg" instead of the cut-off "2nd Leg - United States lead 6-0 on …").
- Claude checks every headline and line before it answers so it says exactly who is affected: a player's season-ending injury no longer becomes "ends Lions season". This applies to everything Claude writes in the app, from the next one written.

## 3.90.3 (Nov 17, 2026)
TestFlight: 3.81.7 (46), no new build (web only)
- News, Press Box: on the Top news cards the two tags have switched places. The story's tag (🚑 Injury, 📋 Coaching, 🔥 Streak...) now sits beside the team name, and why it made Top news (🚨 Breaking, ⭐ My team, 📺 On your slate, 🔥 Trending) sits in the top right with NEW.

## 3.90.2 (Nov 17, 2026)
TestFlight: 3.67.0 (43), no new build (web only)
- Today's Slate and All games: the 📰 News lines update by themselves as soon as a new News page is generated (or a league briefing is updated), on every open screen and the open Duo's other pane, with no 10-minute wait. A line from the older page is replaced or removed; a line that's still the best story stays the same.

## 3.90.1 (Nov 17, 2026)
TestFlight: 3.68.5 (44), no new build (web only)
- Box Office: the small team badge on each player's headshot now uses the logo from that night's ESPN scoreboard directly. Last night's college players (Kentucky, UCLA, Saint Mary's, Southeastern Louisiana) showed lettered chips on DJ's phone because the badge went through the app's shared logo lookup. The lettered chip only shows now if ESPN has no logo for the team, or it fails to load.

## 3.90.0 (Nov 17, 2026)
TestFlight: 3.67.0 (43), no new build (web only)
- All games: upcoming matchup cards now get the same 📰 News line as the slate.
- Today's Slate and All games: the News lines start from the news Claude already wrote, not from each game. Everything Claude wrote today is gathered once: your News page's game notes, top stories, team lines and league notes, plus the league briefings and their injury lists. Each item is matched to the game of the team it's about. A card only shows a line when one of those items is about its game or its teams and is real news (coaching, last games, injuries, returns, storylines). Still no new Claude requests.

## 3.89.6 (Nov 17, 2026)
TestFlight: 3.67.0 (43), no new build (web only)
- Today's Slate: the line under an upcoming game always stays on one line, on the folded Duo, the open Duo and the iPhone. When it doesn't fit, it gets shorter instead of wrapping: filler goes first ("going into the second leg"), then the second fact, so it might read "USA leads 6-0 on aggregate and has won five in a row" or "No. 2 Michigan State has won four straight".
- The line uses each team's name as the card shows it ("Michigan State", "Central Michigan", not "Michigan St" or "C Michigan"), and never puts a team abbreviation like "MSU:" in front.

## 3.89.5 (Nov 17, 2026)
TestFlight: 3.81.7 (46), no new build (web only)
- Matchup page: adding a bet is now a small "+ Add bet" at the end of the betting line (after DraftKings) instead of a big button in its own box. Your bets only shows once you have one on the game.

## 3.89.4 (Nov 17, 2026)
TestFlight: 3.68.5 (44), no new build (web only)
- Box Office: team logos show on every night and every sport, including last night's college basketball. Box Office used to get logos for teams that weren't on today's slate from a team list kept on the phone, and when that list was missing a team, its badge stayed a plain colored circle. Now each night's own ESPN scoreboard hands over every team's logo, so a team that played that night always has one.

## 3.89.3 (Nov 17, 2026)
TestFlight: 3.67.0 (43), no new build (web only)
- Today's Slate: the 📰 News line under a game always stays on one line. It drops the team in front, says things shorter ("before joining Man United" instead of "before he officially starts at Manchester United Wednesday"), and on a narrow screen keeps just the main fact ("Pochettino's final match in charge").

## 3.89.2 (Nov 17, 2026)
TestFlight: 3.67.0 (43), no new build (web only)
- Today's Slate and All games: long tournament names in a card's league line are shortened so they fit. "Concacaf Nations League · 2nd Leg - United States lead 6-0 on aggregate" is now "Nations League · 2nd leg", and "The Shriners Children's Charleston Classic" is "Charleston Classic".
- The aggregate score of a two-legged tie now always leads the one-liner under the game, in full: "USA leads 6-0 on aggregate going into the second leg and has won five in a row".

## 3.89.1 (Nov 17, 2026)
TestFlight: 3.67.0 (43), no new build (web only)
- Today's Slate: the regular one-liner under an upcoming game is back and always stays. When Claude's news has something newsworthy about the game (a coaching change, a last game, an injury or return, a real storyline), it shows on its own line underneath, starting with a small 📰 News tag and in quieter text, so it's clear it's extra. Example: "📰 News USA: Pochettino's final match in charge before he officially starts at Manchester United Wednesday".
- Live notifications and Starting now alerts keep the plain one-liner.

## 3.89.0 (Nov 17, 2026)
TestFlight: 3.67.0 (43), no new build (web only)
- Today's Slate: the line under an upcoming game now uses what Claude has already found about it. That includes your News page (its notes on each game and team), the game's News breakdown and the game's Claude preview. A note shows only when it says more than the stats line. Pochettino's last match in charge before he leaves for Manchester United, for example, beats "USA leads 6-0 on aggregate". Start times, records, rankings and notes about another sport are never used. When nothing beats the stats line, the stats line stays.
- No new Claude requests: the slate only reads what was already written. Generate or update your News page and the lines pick it up within a few minutes.
- The same line goes to the live notification and Starting now alerts.

## 3.88.3 (Nov 17, 2026)
TestFlight: 3.67.0 (43), no new build (web only)
- Today's Slate: the preview lines under upcoming games read more naturally. Two facts about the same team no longer repeat the verb ("has won five in a row and the last four meetings").
- College teams and soccer sides now get singular verbs, the way they're said in the US ("Florida is a 15.5-point favorite", "USA has won five in a row"). Pro nicknames stay plural ("Spurs have won five in a row").
- Second legs of two-legged soccer ties now lead with the aggregate score: "USA leads 6-0 on aggregate going into the second leg and has won five in a row".
- A line no longer says the favorite twice ("No. 8 Houston is a 17.5-point favorite" without "ESPN gives No. 8 Houston a 89% chance" after it).

## 3.88.2 (Nov 17, 2026)
TestFlight: 3.81.7 (46), no new build (web only)
- My bets: a soccer spread bet is called Spread, like every other sport (it said Handicap).

## 3.88.1 (Nov 17, 2026)
TestFlight: 3.81.7 (46), no new build (web only)
- My bets: the note on a game card no longer starts with "Your bet". It starts with the kind of bet, then the line and how it stands: "Spread DUKE -8.5 · covering by 2.5".

## 3.88.0 (Nov 17, 2026)
TestFlight: 3.81.7 (46), no new build (web only)
- New: live feeds for hockey. Any live or finished NHL game now has the Live feed button, and hockey games show in the feed's switcher and filters with the other sports.
- The score bar shows the period and the time left ("2nd 12:01"), "End 1st" at an intermission, and Final, Final/OT or Final/SO at the end.
- Under it: the goals so far on each team's side with the period and time, then shots on goal as one bar in the teams' colors. A Stats button opens shots, power play (goals out of chances), faceoffs won, hits, blocked shots, giveaways, takeaways and penalty minutes.
- Every play is a box, newest first: 🚨 goals in the scoring team's color with the scorer, his season total and the assists, each with a headshot and his line for the game; ⛔ penalties with the call and the minutes; shots saved, wide and blocked; hits, giveaways and takeaways. A goal says "Power play goal" or "Shorthanded goal" when ESPN marks it that way.
- A "Goals & penalties" button keeps just those. A finished game opens that way.
- Faceoffs and whistles are left out; there are over a hundred a game. The time on each play is the time left in the period, so it matches the score bar.

## 3.87.1 (Nov 17, 2026)
TestFlight: 3.81.7 (46), no new build (web only)
- My bets: each bet is its own card in the colors of the team you bet on, with a colored edge like the News boxes. A total (or a draw) splits the card between both teams' colors. A player line uses the player's team.
- Each card says what kind of bet it is (Spread, Moneyline, Total points, Player points...) above the bet in big type: "DUKE -8.5", "Over 165.5", "DUKE to win -355", "Tatum over 25.5 points". Moneylines now keep the price you saw when you added them.
- Won is a green tag (and a green outline on the card), Lost a red tag, Push a gray one. While the game is on, the card shows the red Live dot with the clock.
- The line under a game card ("Your bet DUKE -8.5 · covering by 2.5") is tinted in the same team color.

## 3.87.0 (Nov 17, 2026)
TestFlight: 3.81.7 (46), no new build (web only)
- New: live feeds for soccer. Any live or finished soccer match (Premier League, the other leagues, internationals) now has the Live feed button, and its games show in the feed's switcher and filters next to football and basketball.
- The score bar shows the half and the minute ("2H 67'"), HT at the break and FT at the end, with the shootout score under it when a match goes to penalties.
- Under it: who scored and in which minute, on each team's side, with red cards. Then possession as one bar in the teams' colors. A Stats button opens shots, shots on target, corners, fouls, offsides, saves, cards and passes completed.
- Every event is a box, newest first: ⚽ goals in the scoring team's color with the scorer and the assist, 🟨 yellow cards, 🟥 red cards, 🔁 subs with who came on and off, 📺 VAR, penalties, shots saved, off target, blocked and off the woodwork, corners, offsides and fouls. Each box has the minute, the team and the score at that moment.
- A Key events button keeps just the goals, cards, subs, VAR, penalties and woodwork. A finished match opens that way.
- Everything is ESPN's own data. ESPN doesn't send xG or mark big chances for these matches, so neither is shown. A few smaller matches have no play-by-play at all; those say so.

## 3.86.0 (Nov 17, 2026)
TestFlight: 3.81.7 (46), no new build (web only)
- My bets: track the bets you made (Drew's idea). On a game's matchup page, under the betting line, tap Add my bet and pick a spread, moneyline, total or a player line (points, rebounds, yards and so on), the side and the line. DraftKings' posted line fills in, and you can change it to the line you got. No amounts or money, just won or lost.
- The game card shows each of your bets while the game is on: "covering by 2.5", "up 3", "47 so far, needs 1 more", "Tatum 18 points so far, needs 7 more". At the final it settles by itself as Won, Lost or Push. An over that has already passed its line counts as won right away.
- On the slate, My bets (under Betting lines) lists today's bets on any game, today's record and the last 7 days. Earlier days show how each one finished. × removes a bet, with Undo.
- Bets are saved to your own account, so they follow you to any phone.

## 3.85.1 (Nov 17, 2026)
TestFlight: 3.81.7 (46), no new build (web only)
- National teams have their own colors now, across every international competition (World Cup qualifiers, Nations League, friendlies...). Before, the app used ESPN's colors, which make many countries the same blue, so Haiti and the USA looked alike. About 85 countries get their flag and kit colors. When two sides still clash, one switches to its second color, the same as club teams.
- News, Press Box: the notes on an international game now find their country (by name, or "the US", "USMNT", "the Americans") and are tinted in its color with a two-color edge from its flag. The matchup note is split between the two countries. Before, every note on those games was the same plain blue.

## 3.85.0 (Nov 17, 2026)
TestFlight: 3.81.7 (46), no new build (web only)
- Claude summaries cost less. Previews, team pages and Box Office use Claude's newer web search, which reads only the useful parts of each page, and think less for short write-ups. Recaps are written by Claude Haiku, about a twentieth of the price; if Haiku can't, Claude Sonnet writes it as before.
- A write-up is now shared for longer: once anyone has a game's preview, everyone gets that one for 6 hours (Box Office 6 hours, team pages and recaps 12 hours), instead of a new one being written after 3 minutes.
- The cost line now prices Haiku correctly.
- News and the tap-in breakdowns are unchanged.

## 3.84.1 (Nov 17, 2026)
TestFlight: 3.81.7 (46), no new build (web only)
- News, Press Box: the notes on each game card no longer have a logo, team name or league pill in the top left. Each note keeps its team's color, and its tag (Streak, Injury...) sits in the top right with the note beside it.
- Each game now gets five notes: two about each team, then one about the matchup, shown in both teams' colors. This starts with the next Regenerate.
- Top news' Show 5 more button appears once the page has 10 stories, so it shows up after the next Regenerate.

## 3.84.0 (Nov 17, 2026)
TestFlight: 3.81.7 (46), no new build (web only)
- News, Press Box: Top news has 10 stories now. The first five show, and Show 5 more under them opens the other five (Show fewer closes them, and the page remembers which you left it on). The heading just says Top news.
- Top news puts breaking news first, from anywhere in sports, then the biggest stories about your teams and leagues, then other big headlines from around sports even if you don't follow them. Claude gets the newest ESPN and Athletic headlines from the NFL, NBA, college football, college hoops, MLB, NHL and Premier League to find them. A story that isn't about your teams says why it's there: 🚨 Breaking or 🔥 Trending. This starts with the next Regenerate.
- News, Press Box: the quick hits on game and league cards now look like the top-five cards. Each one finds the team it's about from its own words (the first team named, by full name, school, city or nickname: "the 76ers beat the Nets" is the 76ers), so it gets that team's color stripe, tint, logo and name. On a game card, only the two teams playing are considered.
- A hit about no team in particular shows its league (🏀 NBA, 🏈 CFB...) in the top left with the accent color, so no card has an empty top row any more.
- More tags get their own emoji: ⚔️ Matchup, 🧩 Depth and Lineup, 🔮 Future and Expansion, 🏆 tournaments, ⚖️ Eligibility, 💰 NIL and money, 🩺 Health.

## 3.83.5 (Nov 17, 2026)
TestFlight: 3.81.7 (46), no new build (web only)
- News, Press Box: each story in a league section is now a short summary of two or three sentences (what happened, the key detail and why it matters) instead of a one-line headline. To make room, each league has 3 to 5 stories instead of 4 to 6. This applies from the next Regenerate.

## 3.83.4 (Nov 17, 2026)
TestFlight: 3.81.7 (46), no new build (web only)
- News: on each story card the tag that says why it's there (🏈 NFL, ⭐ My team, 📺 On your slate) now sits right beside the team name in the top left, and the story's other tags (Injury, Tonight, NEW...) always sit in the top right, even on a card with no team.

## 3.83.3 (Nov 17, 2026)
TestFlight: 3.81.7 (46), no new build (web only)
- News, Press Box: every top-five story now shows its team's logo and name, even when Claude didn't name the team (the app finds it in the story), and why it made your five: ⭐ My team, 📺 On your slate, or its league (🏈 NFL, 🏀 CBB...).
- News, Press Box: the league sections (and each game's quick hits) are in the new look. Each quick hit is a feed box with its team's color, logo and an emoji tag, and each league's name has its sport's emoji.
- Claude now names the team for every top story and quick hit when it writes the page, so the logos and colors are filled in from the next Regenerate.

## 3.83.2 (Nov 17, 2026)
TestFlight: 3.81.7 (46), no new build (web only)
- News: opening News (or tapping Regenerate) after the app was left open overnight now moves to today. Before, the game picker still showed last night's slate.

## 3.83.1 (Nov 17, 2026)
TestFlight: 3.81.7 (46), no new build (web only)
- Your own settings, alerts, slate and News page now load through Slate's server with your passcode, instead of with the app's public key, so they can be made private to you. Changes made on another phone show up within about 15 seconds.
- Looking around without a passcode now shows the standard slate instead of DJ's own settings.

## 3.83.0 (Nov 17, 2026)
TestFlight: 3.81.7 (46), no new build (web only)
- Safer logins: after 20 wrong passcodes from one network in 15 minutes, Slate makes that network wait 15 minutes before trying again, so passcodes can't be guessed by trying them one after another.
- A daily Claude budget for everyone together ($15 a day unless DJ sets another amount). Once it's used up, new summaries for everyone but DJ wait until tomorrow, and DJ's phone gets one notification saying so. The 10-a-day limit per person still applies.
- The server remembers a right passcode for 5 minutes, so the app's regular check-ins don't each look it up again.
- The site sends the usual browser safety headers (no framing by other sites, no camera, microphone or location access).

## 3.82.1 (Nov 17, 2026)
TestFlight: 3.75.1 (45), no new build (web only)
- News: when a league briefing's big story comes from The Athletic (whose stories have no photo), it now shows the newest ESPN photo of a story about the same team.
- News photos load a phone-sized copy from ESPN (smaller and quicker), and a photo still loading no longer starts over when the page redraws (for example as headshots come in).

## 3.82.0 (Nov 17, 2026)
TestFlight: 3.75.1 (45), no new build (web only)
- News: swipe sideways to move between Press Box and the league tabs. A swipe never takes you back to the last page any more. On the first or last tab it just springs back.
- News has the live feed's look now. Every story is a box with a stripe and light tint in its team's color, the team's logo, and a tag on the right with one emoji (🔁 Trade, 🚑 Injury, 🏁 Result, 😱 Upset, 📋 Coaching and so on), plus 🚨 NEW for today's news.
- League briefings open with The big story: ESPN's photo when Claude names the headline, then the headline and why it matters. Tap it to read the story.
- Performances are Box Office-style player cards with the player's headshot in a team-color circle and the stat line as a tag. Injuries are the live feed's red boxes with the player's headshot and a status tag (Out, Day-to-day...). Who's hot and who's not are a red column and a blue column, with each team's logo.
- Read more shows ESPN's photo beside each story when there is one.
- Press Box: the top five stories are feed boxes too, with their team's color and logo. Game cards carry both teams' colors on their edge, and team cards are tinted in the team's color.
- Briefings written before this update still show, in the new look, without the photos and headshots.

## 3.81.13 (Nov 17, 2026)
TestFlight: 3.75.1 (45), no new build (web only)
- Unfolded Duo: pages with just a name in the header (Teams, News, Settings, Live feed, Matchup) now show a bigger name and the full-size Slate mark, centered in the header, so they fill the same space as a page with a date under its name. The line under the header still sits at the same height on both sides.

## 3.81.12 (Nov 17, 2026)
TestFlight: 3.75.1 (45), no new build (web only)
- Unfolded Duo: the headers on the two sides now line up on the phone itself. Each side measures its own header as it's drawn (your text size and fonts included), and both take the same height and the same space above the page name, so the line under the headers sits at exactly the same spot whatever page is on each side.

## 3.81.11 (Nov 17, 2026)
TestFlight: 3.67.0 (43), no new build (web only)
- National teams now show their flags on the slate and All games right away (Nations League, qualifiers, friendlies). The saved games had no logo, so flags waited on ESPN's country list, and on the open Duo's two panes the cards never redrew when it arrived. Flags now come straight from each team's country code.
- Any team chip drawn before its logo was known now picks up the logo as soon as it arrives, without waiting for the page to redraw.

## 3.81.10 (Nov 17, 2026)
TestFlight: 3.75.1 (45), no new build (web only)
- Unfolded Duo: pages with just a name in the header (News, Settings, Live feed) now line their name up exactly with the slate's on the other side.

## 3.81.9 (Nov 17, 2026)
TestFlight: 3.75.1 (45), no new build (web only)
- Unfolded Duo: the two sides' headers line up. Whatever page each side shows, the line under the header sits at the same height, and the page names and dates line up with the slate's.

## 3.81.8 (Nov 17, 2026)
TestFlight: 3.75.1 (45), no new build (web only)
- Unfolded Duo: the left side never shows its own menu or Back button, locked or not. Only the app's menu and Back remain.
- While the sides are locked, the app's Back works whichever side you touched last, so the left side can still go back. The menu still changes the right side.
- No more help text when you lock or unlock; the lock on the bar is enough.
- Touching or dragging on the fold can no longer move or stretch the screen behind the two sides.

## 3.81.7 (Nov 17, 2026)
TestFlight: 3.81.7 (46)
- Live notifications (Lock Screen, Dynamic Island, Board) pick the logo that shows best on their dark background, the same way the rest of the app now does: a team whose dark logo is a plain white mark gets its real logo when that shows up on dark (Clemson's orange paw instead of a gray one). The app saves every logo again the first time you open Slate after updating.

## 3.81.6 (Nov 17, 2026)
TestFlight: 3.75.1 (45), no new build (web only)
- Unfolded Duo: the bar on the fold only takes a tap (swap the sides) or a hold (lock or unlock). Dragging it does nothing now, so it can't pull the two sides out of place.
- Holding the bar no longer highlights or selects anything on the screen.

## 3.81.5 (Nov 17, 2026)
TestFlight: 3.75.1 (45), no new build (web only)
- Unfolded Duo: hold the bar on the fold to lock the two sides apart. A small lock shows on the bar. While locked, each side works on its own: the left side gets its own menu and Back again, and a game or Live feed you pick on the left opens on the left. That's the easy way to watch two Live feeds at once.
- Tapping the bar still swaps the sides while locked. Hold it again to unlock, and a game picked on the left opens on the right again.
- The app's menu still works the right side.

## 3.81.4 (Nov 17, 2026)
TestFlight: 3.75.1 (45), no new build (web only)
- Unfolded Duo: the bar on the fold now just swaps the two sides. Drag it either way (or tap it) and the right page moves to the left while the left page moves to the right. The "Pick a page" screen is gone; use the menu to change the right side.

## 3.81.3 (Nov 17, 2026)
TestFlight: 3.75.1 (45), no new build (web only)
- Logo check, part 1. Morning email on a dark theme: teams whose dark-background logo is a plain white mark but whose real logo shows fine on dark use the real one (Clemson's orange paw, Tennessee, Texas, the Dodgers and Tigers, and a few more). Three soccer clubs with no dark version no longer show a broken picture.
- Live notifications: the app now saves the logo a game itself carries, so national teams (Germany, Netherlands…) and anyone missing from ESPN's team lists get their logo too.

## 3.81.3 (Nov 17, 2026)
TestFlight: 3.75.1 (45), no new build (web only)
- Live feed: when you've scrolled down so the newest play sits under the score bar, a new play now lands right there in view. Before, it was added above and you had to scroll back up to see it.
- If you've scrolled further down into older plays, the page stays put and a small "↑ 1 new play" pill shows under the score bar. Tap it to go up to the newest play. It goes away by itself when you scroll back up.
- Live feed: swiping right no longer takes you back to the previous page. A sideways swipe only ever moves between games; on the first game it just springs back. Use the Back button to leave.
- Live feed: after picking a filter (All, NBA and so on), the games keep their order as you swipe, so a swipe right goes back to the game you just came from. Before, the game on screen jumped to the front each time.
- Live feed: the "All live" tab now reads "All".
- Live feed score bar: three-digit basketball scores no longer cover the team's record on narrow screens. When the bar is tight, the record sits under the logo.
- Football live feed: timeouts are now red boxes like the ones in the basketball feed, with the quarter, clock, team and score on top and "🚨 Timeout, Ravens" (or "🚨 TV timeout") as the headline. Before, they were a loose gray line between plays.

## 3.81.2 (Nov 17, 2026)
TestFlight: 3.75.1 (45), no new build (web only)
- Unfolded Duo, one menu: the app's menu and Back now always work the right side. The two sides no longer have their own menu buttons, so nothing sits under the app's menu any more, and picking a page from the menu changes the right side.
- The left side stays put: tapping a game, a Live feed or a team on the left opens it on the right.
- After you slide the right page over to the left, the menu picks the new right side again.

## 3.81.1 (Nov 17, 2026)
TestFlight: 3.75.1 (45), no new build (web only)
- All games: each matchup's channel is now a watch link, the same as on Today's Slate ("▶ ESPN"). Tap it to open that channel's app, or pick one when there's more than one way to watch. Up to two channels per card, with the ones you can watch first.
- All games: fixed a team name still cut by a hair ("Charg…" for Chargers). The name check now runs again once the page settles, and it catches a clip of even one pixel.

## 3.81.0 (Nov 17, 2026)
TestFlight: 3.75.1 (45), no new build (web only)
- News: a row of tabs across the top. The first tab, Press Box, is the News page you had (Claude's page for your picks), and it's where News opens.
- The other tabs are leagues (NFL, CFB, NBA, CBB, NHL and the rest, in your All games order). Tap one, then Generate, and Claude writes that league's briefing in about a minute: the newest stories first, then the take, who's hot and cold, standout performances, injuries and the best reads. It reads the latest ESPN and Athletic headlines and searches the web for today's news.
- A briefing is saved for everyone for the day, so a league someone already generated shows right away, with when it was written. Update writes a fresh one with one tap.
- On Press Box, a league's card now opens that league's tab ("NFL briefing") instead of a separate breakdown.

## 3.80.0 (Nov 17, 2026)
TestFlight: 3.75.1 (45), no new build (web only)
- Unfolded Duo: the screen is now two separate sides, one on each side of the fold. Each side has its own page, its own menu and Back, and keeps its own live scores, so you can follow two Live feeds at once, or keep the slate open next to Box Office.
- It starts with Tonight's Slate on the left and All games on the right, like before. Any page now works on either side.
- To bring the right page over to the left: drag the small bar on the fold to the left (or tap it). The right side then asks which page to show: live games first (straight to their Live feed), then every page, or keep what it had. Drag the bar to the right to do the opposite.
- The menu and Back buttons in the app's side column work on the side you touched last.
- Changing a setting on one side (teams, theme, rules) changes it on the other side too.
- Folding the phone goes to the slate, as before. Unfolding again brings back the two pages you had.
## 3.79.2 (Nov 17, 2026)
TestFlight: 3.67.0 (43), no new build (web only)
- Team logos: on Midnight, a team whose dark-background logo is a plain white mark now shows its full-color logo when that one stands out on the card. Clemson's orange paw, Texas, Tennessee, Xavier and the Raptors, for example. Duke and the Yankees keep their white logos, because their navy would disappear.
- Team logos: a logo that is slow to arrive no longer leaves an empty box. After 4 seconds the team's colored chip and letters come back until the logo loads, and a logo that comes back empty counts as missing.
- National teams (World Cup qualifiers and friendlies) now show their flags on All games and the slate.

## 3.79.1 (Nov 17, 2026)
TestFlight: 3.75.1 (45), no new build (web only)
- Logo check, part 1. Morning email on a dark theme: teams whose dark-background logo is a plain white mark but whose real logo shows fine on dark use the real one (Clemson's orange paw, Tennessee, Texas, the Dodgers and Tigers, and a few more). Three soccer clubs with no dark version no longer show a broken picture.
- Live notifications: the app now saves the logo a game itself carries, so national teams (Germany, Netherlands…) and anyone missing from ESPN's team lists get their logo too.

## 3.79.0 (Nov 17, 2026)
TestFlight: 3.68.5 (44), no new build (web only)
- Box Office: the college tabs (CBB, WCBB and CFB) have an "All / Power conferences" row under the date. Power conferences keeps only players from the ACC, Big Ten, Big 12 and SEC, plus the Big East in basketball, and re-ranks them 1 to 20. The over and underachievers follow it too, and so does the game count in the heading (games with at least one power-conference team). Your pick is remembered on this phone.
- College top performers now keep the top 80 players a night instead of 25, so the power-conference list still fills up.

## 3.78.0 (Nov 17, 2026)
TestFlight: 3.68.5 (44), no new build (web only)
- Box Office: three new rare tags, shown first on a player's card:
  - 👑 Triple-double, only when one actually happens.
  - 📈 Season-high 39: a basketball player's most points this season, checked against his ESPN game log (at least five earlier games, and 20+ points in the pros or 15+ in college). Early in the season lots of players do that, so only the one who beat his old high by the most that night gets it.
  - 🏆 Game-winner: the player who put his team ahead for good in the last 30 seconds of a basketball game, or the last two minutes of a football game, from ESPN's play-by-play. Only close finals are checked.
- A card still shows two tags at most, and most cards have none.

## 3.77.4 (Nov 17, 2026)
TestFlight: 3.75.1 (45), no new build (web only)
- Live feed: the game chips above the score bar now read quarter first too ("4th 8:39"), matching the score bar.

## 3.77.3 (Nov 17, 2026)
TestFlight: 3.68.5 (44), no new build (web only)
- Box Office: the game result is back on the right of each player card (W 126-115 over vs CHI, or the live clock in red).
- Box Office: the slate's tags are gone from these cards. In their place, a few rare tags under the stats go only to the night's leaders in that league: 🪣 Top scorer, 🧲 Most boards, 🪄 Most assists, 🎯 Most threes and 🔒 Most steals + blocks in basketball. Football gets the most passing, rushing and receiving yards and the most TDs. Hockey gets the most goals, points and saves, and baseball the most hits, homers, RBI and strikeouts. A three-way tie gets no tag, so most cards have none.

## 3.77.2 (Nov 17, 2026)
TestFlight: 3.75.1 (45), no new build (web only)
- Live feed: player headshots in place of the jersey icons, on every play and in Leaders and Top rated, football and basketball. Each one sits in a circle of the team's color. When ESPN has no picture for a player (more common in college), the jersey with the number shows as before.
- The same headshots show in Top performers on a game's matchup page, since it uses the same player rows.
- Live feed score bar: the quarter now comes before the clock ("4th 9:51"), football and basketball.
- Live feed score bar: it no longer bunches up in the middle. Each team's logo, record and score sit together as one group, and the two groups and the clock spread evenly across the bar. Most visible on the open Duo.

## 3.77.1 (Nov 17, 2026)
TestFlight: 3.67.0 (43), no new build (web only)
- Today's Slate: the Feed button now shows only while a game is live. Finished games no longer have it; their feed is still a tap away from the matchup page.

## 3.77.0 (Nov 17, 2026)
TestFlight: 3.67.0 (43), no new build (web only)
- Today's Slate: the small bell in a card's bottom corner is gone. In its place is a Feed button that opens that game's live feed in one tap (a red dot while the game is live). It shows on live and finished football and basketball games, the ones that have a feed. Swiping in the feed still goes through the games on your slate.
- A game's notifications are still in its quick look (tap the card): Live notification and Game alerts.
- The Athletic Newsletters under the slate now fold up like Betting lines: tap the heading to close or open it. It starts open, and once you close it, it stays closed for you.
- Scores on live games stay full brightness for both teams on the slate's cards (only the losing team dims once it's final), the same as the Live feed now.

## 3.76.1 (Nov 17, 2026)
TestFlight: 3.68.5 (44), no new build (web only)
- Box Office: the player cards show the player's headshot again (with his team's badge at the corner) in place of the jersey. The rest of the new card stays.
- Box Office: the game counts are off the league tabs. Inside a league, the Top performers heading says how many games it had that day ("8 games", or "8 games · 1 live" while games are on).

## 3.76.0 (Nov 17, 2026)
TestFlight: 3.68.5 (44), no new build (web only)
- Box Office: top performers, overachievers and underachievers are now cards in the slate's new Top performers look. Each has the team's color down the left edge, the player's jersey with his number, his name, position and team, the stat line under the name, and the game under that (W 126-115 vs CHI, or the live clock in red). The same tags as the slate's Top performers sit on the right (👑 Triple-double, 🎯 4 threes, 🎩 Hat trick, 💨 100-yd rusher and the rest), and move under the stats on narrower screens. Claude's reason sits under an over or underachiever's line. Tap a top performer to open his game, same as before.
- Jersey numbers and tags fill in from tonight on. Nights saved before this update show the cards without them.

## 3.75.2 (Nov 17, 2026)
TestFlight: 3.64.1 (42), no new build (web only)
- Football feed: the down and distance pill moved to its own line, centered at the bottom of the score bar, and it now says the yard line too: the football, the team with the ball in its color, then "4th & 1 at BAL 17". It's tinted in that team's color, so you can tell at a glance who has it and where.
- Live feed: both scores are full brightness while a game is live. The trailing team's score used to be dimmed, which made a live game look finished. Only the loser's score dims, and only once the game is final.
- Live feed: the quarter now sits on the same line as the clock in the score bar ("14:12 4th"), not on a line of its own under it. Football and basketball.

## 3.75.1 (Nov 17, 2026)
TestFlight: 3.75.1 (45)
- Football live notification, Lock Screen: the down and spot sit right next to the football icon by the team that has the ball ("Ravens 🏈 1st & 10 · BAL 6"), and the separate down line is gone. So there are at most two lines under the scores: the standout and the one-liner.
- Dynamic Island held open, football: a football icon next to the score of the team that has the ball. The timeouts line is gone, timeouts and quarter breaks no longer show as the last play ("Timeout #1 by BLT"), and ESPN's win chance only gets its own line when there's no one-liner. That leaves two lines under the scores: the last play and the one-liner.
- Needs build 45. The timeouts and last-play changes work on build 44 too.

## 3.75.0 (Nov 17, 2026)
TestFlight: 3.67.0 (43), no new build (web only)
- Top performers: the big number on the right is gone. That side now holds tags for what made the player's night, in every sport, up to three per player, and nothing when nothing stands out. All of them come straight from the box score. On a regular iPhone the tags sit under the stat line, so names and stats keep their room.
- Football: 🏈 TD (or 2 TD), 🧲 Pick six, ⚡ Return TD, 🎯 TD pass, 🔥 3 TD passes, 🚀 300-yd passer, 💨 100-yd rusher, 🙌 100-yd receiver, 😬 2 picks.
- Basketball: 👑 Triple-double, ✌️ Double-double, 🪣 30-piece, 🔥 Hot hand (60% shooting on 8+ shots), 🎯 3 threes, 🔒 Lockdown (3+ steals and blocks), 🪄 8 assists.
- Hockey: 🎩 Hat trick, 🚨 Two goals, 🚨 Goal, 🍎 2 assists, 🔒 Shutout, 🧱 30 saves.
- Baseball: 💣 Homer, 🔥 3 hits, 🏃 3 RBI, ⚡ 8 strikeouts, 🔒 Scoreless 7 innings.
- Soccer: 🎩 Hat trick, ⚽ Brace, ⚽ Goal, 🅰️ Assist, 🎯 3 on target, 🟥 Sent off.

## 3.74.1 (Nov 17, 2026)
TestFlight: 3.64.1 (42), no new build (web only)
- Football feed: the down and distance moved again. It's now a small pill with the football, centered right under the score of the team that has the ball. The records beside the logos are back to how they were, and both scores stay level.

## 3.74.0 (Nov 17, 2026)
TestFlight: 3.67.0 (43), no new build (web only)
- Top performers (quick look and matchup page) got the Live feed's look. Each player is a small card with their team's color down the left edge and their jersey with its number. Next to that are the name and team, then the full stat line, always on its own line under the name, so every player reads the same way. The standout number sits big on the right in the team's color (215 PASS YDS, 31 PTS), with a 🏈 TD tag under it for football players who scored.
- Scoring now starts with the most recent score and works down to the game's first.

## 3.73.1 (Nov 17, 2026)
TestFlight: 3.64.1 (42), no new build (web only)
- Live feed: fixed the score banner getting stuck. It could freeze on an old clock, leave a gap above itself and sit on top of the field after you scrolled. The page had lost track of your finger lifting when the spot you were touching was redrawn mid-touch, so it kept waiting and never updated. It now always notices.
- Football feed: the down and distance ("2nd & 8") moved out from under the clock. It now sits with the football, next to the score of the team that has the ball.
- Football feed: more room for plays, mainly for the folded Duo. The Leaders card is folded away behind a Leaders button on the "Last play" line (tap to open it right there; it stays how you left it). The field lost its heading line, since the down is in the score bar now, and the win probability is one row.
- Football feed: team codes read like the scoreboard. "Timeout BLT" is now "Timeout BAL" (also HST to HOU, CLV to CLE, ARZ to ARI), in the play text too.

## 3.73.0 (Nov 17, 2026)
TestFlight: 3.68.5 (44), no new build (web only)
- Box Office: each league tab now shows how many games that league has on the day you're looking at, in small numbers beside its name ("NBA 8", "CBB 33"). Postponed and canceled games aren't counted. Today's numbers match All games; earlier days come straight from ESPN's schedule.

## 3.72.2 (Nov 17, 2026)
TestFlight: 3.64.1 (42), no new build (web only)
- Betting lines are saved for each day. Go back to an earlier day on Today's Slate and its lines are still there, each marked "Went over" or "Went under" and whether the lean was right, with the count of right and wrong at the top. They're kept for 60 days on the phone and 45 in your account, so they show up on any phone you sign in on. Days from before this update only have what this phone still had (the last three days).

## 3.72.1 (Nov 17, 2026)
TestFlight: 3.64.1 (42), no new build (web only)
- Live feed: team colors now read on every theme. The colored edge on a play (and the win probability bar) is lightened on the dark themes or darkened on Sunday Paper until it stands out, the same check the slate's live one-liners use. White and yellow teams like the Nets were nearly invisible on Sunday Paper, and dark ones like the Ravens were faint on Midnight.
- Live feed: the channel now sits inside the score bar, under the quarter, with a small play arrow (▶ ESPN). Tap it to open the app for that channel. The separate "On ESPN" row and its Watch button are gone.
- Football scoring plays are now in the scoring team's color: the headline, the outline and the tint. That goes for the live feed and for Scoring in a game's quick look on the slate. They were all in the app's accent color before, so a Ravens touchdown looked the same as a Chargers one.
- Live feed: the number on a jersey is black or white, whichever reads better on that team's color. The jersey outline is a little stronger so a white jersey shows on a white card.

## 3.72.0 (Nov 17, 2026)
TestFlight: 3.67.0 (43), no new build (web only)
- Football game cards: the Scoring section in the quick look (and on the matchup page) now shows each score as the same box the Live feed uses. Each box has the scoring team's color down its left edge, goalposts or an emoji on the headline, the players with their jerseys and stat lines, and the score at the right. Other sports keep the plain list for now.

## 3.71.4 (Nov 17, 2026)
TestFlight: 3.68.5 (44), no new build (web only)
- A game past its start time that hasn't tipped off yet (Long Beach State at UCLA tonight, still pre-game on ESPN after 9:00) now says "Starting soon" instead of Live with no score. It turns live with the score as soon as ESPN starts it. Same on Today's Slate and All games.
- All games redoes an old preview line, so it shows the card's current rank (it said "No. 7 UCLA" on a card showing 9).

## 3.71.3 (Nov 17, 2026)
TestFlight: 3.68.5 (44), no new build (web only)
- Football live notifications: the down line no longer repeats who has the ball ("1st & 10 at BAL 6" instead of "BAL ball · 1st & 10 at BAL 6"). The football icon by the team name already shows that.
- One-liners that are really two thoughts joined by "and" now keep just the first one, so they fit instead of ending in "…" ("Chargers are without WR McConkey").

## 3.71.2 (Nov 17, 2026)
TestFlight: 3.67.0 (43), no new build (web only)
- All games: a live game's one-liner is now in the color of the team it's about, the same as Today's Slate ("CHI: Tre Jones has 14 pts" in Bulls red). A line about both teams stays live red, and team colors are lightened on Midnight and darkened on Sunday Paper so they're easy to read.

## 3.71.1 (Nov 17, 2026)
TestFlight: 3.67.0 (43), no new build (web only)
- Morning email: preview lines use the card's current poll rank too ("No. 9 UCLA", not last week's "No. 7"), same as the slate.

## 3.71.0 (Nov 17, 2026)
TestFlight: 3.67.0 (43), no new build (web only)
- Today's Slate: a live game's one-liner is now in the color of the team it's about ("LAC: Tre' Harris 86 receiving yds" in Chargers blue). A line about both teams stays live red. On Midnight a dark team color is lightened, and on Sunday Paper a light one is darkened, so the line is always easy to read.
- Preview lines use the same ranking as the card. On a Monday with a new poll, ESPN's game preview could still say last week's rank ("No. 7 UCLA" on a card showing 9).

## 3.70.1 (Nov 17, 2026)
TestFlight: 3.64.1 (42), no new build (web only)
- Live feed: a Watch button right under the score bar. It shows what the game is on and opens the app for it, the same way the game cards and On TV do (ESPN and NBC ask whether you want YouTube TV or their own app). Live games only.
- Football feed: every play now has the color of the team that made it down its left edge, like basketball. Touchdowns, field goals, completions, incompletions and runs take the offense's color. A sack, an interception, a fumble the defense recovers and a safety take the defense's color. Penalties and kickoffs stay plain.

## 3.70.0 (Nov 17, 2026)
TestFlight: 3.64.1 (42), no new build (web only)
- Live feed: you can now reach any live game from the feed. A row of filters sits above the games at the top: My slate, All live, and each league that has a live game right now. Tap one and the games at the top (and the swipe) switch to it. If the game you're on isn't part of it, its first game opens.
- The feed starts on the filter that matches where you came from. Opened from your slate: the live games on your slate, as before. Opened from All games on a league's tab, like NBA: just the live NBA games. Opened from All games on All, Live or My teams: every live game.
- Football and basketball only for now, since those are the sports with a feed.
- Football feed: a "Leaders so far" card at the top, like basketball's. Each team's leading passer, rusher and receiver with their line, straight from ESPN. ESPN doesn't rate football players the way it does basketball players, so these are its leaders, not a rating.
- Football feed: player numbers now sit on a football jersey in the team's color (wide shoulders, sleeves) in place of the circle.
- Halftime: the score bar and the game's box at the top show a red dot and "HT". That covers the moment ESPN still says "End of 2nd Quarter". Basketball too.

## 3.69.4 (Nov 17, 2026)
TestFlight: 3.64.1 (42), no new build (web only)
- The live feed no longer disappears when a game ends. A finished football or basketball game has a "Game feed" button where "Live feed" was, on the quick look and the matchup page.
- Football: a finished game opens on its scoring plays (the Scoring button is already on). Tap Scoring off to read every play, drive by drive.
- Basketball: a finished game opens on the final minutes, with every earlier play behind "Show earlier plays", plus the top-rated players and the box score.
- Live feed, football: a made field goal now shows yellow goalposts in place of the hockey net. There's no goalpost emoji, so this one is drawn by Slate. Touchdowns keep the football.
- Nothing is stored by Slate for this: ESPN keeps every play after the game, and the page reads it back when you open it.

## 3.69.3 (Nov 17, 2026)
TestFlight: 3.64.1 (42), no new build (web only)
- Live feed delay: the choices can be put away now. Tap the Delay button to open the control, tap it again to hide it. The button keeps showing your delay ("Delay 30s"), with an × beside it that turns the delay off in one tap.
- The delay is set with a slider in 5-second steps, from Off to 90 seconds, with an Off button next to it. Sliding it doesn't swipe you to another game.

## 3.69.2 (Nov 17, 2026)
TestFlight: 3.64.1 (42), no new build (web only)
- Live feed: after you tap "Show earlier plays", there's now a "Show fewer plays" button next to it. One tap folds the list back to how it started and takes you back to the newest play. It stays there even when you've opened every play.
- Live feed delay is now one tap. The + and − are gone: tap Delay on the "Last play" line and pick Off, 15s, 30s, 45s, 60s or 90s. While a delay is on, those choices stay showing under the line, so Off is always one tap away, and the Delay button shows the number you picked.
- Live feed, football: a "Scoring" button on the line above the newest play. Tap it to see only the scoring plays (touchdowns, field goals and safeties), from the whole game; tap again for every play. It works on finished games too. Basketball doesn't get one, since most plays there are scores.

## 3.69.1 (Nov 17, 2026)
TestFlight: 3.64.1 (42), no new build (web only)
- Morning email is now light: Sunday Paper's cream and dark ink, with your accent color. Outlook on iPhone laid a gray wash over the dark version however it was built, and a light email is what mail apps' dark modes darken cleanly.

## 3.69.0 (Nov 17, 2026)
TestFlight: 3.64.1 (42), no new build (web only)
- Live feed delay, for when the feed is ahead of your TV. On the "Last play" line there's now a Delay control: tap + or − to hold the feed back 5 to 90 seconds, in steps of 5. Everything on the page waits that long: the plays, the score bar, the timer, the win probability and the box score. That game's box in the strip at the top shows the delayed score too.
- The delay is remembered for that game only, on this phone. Every other game starts with no delay until you set one.
- Turning the delay up never jumps the page backwards: it holds where it is until the game catches up. Turning it down catches up right away.
- Not delayed: the other games in the strip, the slate and All games, and live notifications.
- Football live feed: more plays have an emoji in front of the headline: 🎯 completed pass, ❌ incompletion, 🏃 run, 🦵 punt, 🦶 kickoff, ✅ extra point good. Plays with no good match (kneel-downs, spikes, two-point tries) stay plain.

## 3.68.11 (Nov 17, 2026)
TestFlight: 3.64.1 (42), no new build (web only)
- Morning email, second try for Outlook on iPhone: the dark theme's backgrounds are now drawn so Outlook's dark mode can't repaint them gray, and game times use a colon look-alike so no mail app turns them into links.

## 3.68.10 (Nov 17, 2026)
TestFlight: 3.64.1 (42), no new build (web only)
- Football live feed: every player under a play now has a stat line. A receiver with no catch yet shows "0 rec, 2 tgt" (his targets from ESPN), where before he showed nothing. On a pass play the receiver's targets are added to his line ("2 rec, 17 yds, 2 tgt").
- A player the box score has nothing for yet shows a zero for what the play is about ("0 car", "0 rec"), never a blank.

## 3.68.9 (Nov 17, 2026)
TestFlight: 3.64.1 (42), no new build (web only)
- Live feed: the "Last play" timer now starts from 0 the moment a new play shows up on the page, counted on your phone's own clock. It used to start around 30 to 40 seconds, because it counted from the time ESPN logged the play, and ESPN's feed runs that far behind.

## 3.68.8 (Nov 17, 2026)
TestFlight: 3.67.0 (43), no new build (web only)
- Today's Slate: team names are no longer cut short in a narrow card, like Worth a look on the open Duo's left pane ("St. Tho…"). A card whose name doesn't fit drops both records first, then shows both teams' abbreviations (STMN, LIU), the same as All games.

## 3.68.7 (Nov 17, 2026)
TestFlight: 3.64.1 (42), no new build (web only)
- All games: team names are no longer cut short in narrow cards, like the open Duo's right pane ("Char…" for Chargers). When a name doesn't fit, that card drops both teams' records first. If it still doesn't fit, both teams show their abbreviation (LAC, BAL), never half a name.

## 3.68.6 (Nov 17, 2026)
TestFlight: 3.68.5 (44), no new build (web only)
- Morning email: it keeps Slate's own colors in mail apps that use dark mode (Outlook turned the background a muddy gray and washed out the text and the bold), and game times and dates no longer show up as blue underlined links.

## 3.68.5 (Nov 17, 2026)
TestFlight: 3.68.5 (44)
- Live notifications for a single game show the slate card's tag after the header: "Slate • CBB  Upset watch", "Slate • NBA  Rivalry". It follows the card, so a tag like Close finish appears and goes away as the game changes. Needs build 44, and your phone shares the tags whenever Slate is open.

## 3.68.4 (Nov 17, 2026)
TestFlight: 3.64.1 (42), no new build (web only)
- Live feed: the game strip and swiping left and right now go through the live games on your slate (football and basketball), plus the game you opened the live feed from, which comes first. Before, it was your favorite teams' games.

## 3.68.3 (Nov 17, 2026)
TestFlight: 3.67.0 (43), no new build (web only)
- Today's Slate on a regular iPhone: long team names ("The Citadel", "Clemson") are no longer cut short on the slate's cards. The narrower Worth a look card was setting how much room every card's names got; now it only sizes itself.

## 3.68.2 (Nov 17, 2026)
TestFlight: 3.67.0 (43), no new build (web only)
- Today's Slate: scores no longer print on top of the team names and records. Folding a time group (tapping its time) squeezed every card's team column to nothing, so the names vanished and the scores sat over the records. Cards in a folded group are now skipped when the slate lines up its score column.

## 3.68.1 (Nov 17, 2026)
TestFlight: 3.64.1 (42), no new build (web only)
- Basketball live feed: the stats under each play now match the play. A turnover shows the player's turnovers ("3 TO"). An offensive foul shows turnovers and fouls ("3 TO, 2 fouls"), since it counts as both, and gets the foul-trouble tag when it applies.
- A steal leads with the stealer's steals and adds the player who lost the ball with their turnovers. A block leads with blocks. A made shot shows points and field goals ("13 pts, 5-8 FG", plus threes on a three). A technical foul shows no stat line.

## 3.68.0 (Nov 17, 2026)
TestFlight: 3.67.0 (43), no new build (web only)
- Live notifications for a single game, every sport: one standout for the whole game instead of one per team. Basketball picks the higher of the two teams' ESPN in-game ratings; football picks the game leader with the most yards.
- The one-liner under it is a second thing to know about the game, never that player's numbers again. A line about the standout gives way to ESPN's win chance, then both teams' shooting ("Shooting: CIT 38% · CLEM 55%"), then the slate's preview line. Soccer keeps the goal scorers. So the card has two lines of text instead of three.
- The header reads "Slate • CBB" (short league codes: NBA, CBB, WCBB, NFL, CFB, NHL, MLB, EPL, UCL…). It changes for live notifications that start from now on.
- The slate card's tag ("Upset watch", "Rivalry"…) is now sent along too, for the header. Showing it needs a new app build, which is waiting for DJ's OK.

## 3.67.3 (Nov 17, 2026)
TestFlight: 3.64.1 (42), no new build (web only)
- Basketball live feed: every play is now a box, like the green made-shot box.
- Missed shots are gray boxes that show the shooter's field goals made and attempted so far ("2-7 FG", plus threes on a missed three). The rebound goes on the same box, with the rebounder's total rebounds. A rebound after a missed free throw or a block does the same.
- Timeouts are red boxes with 🚨.
- Fouls are gray boxes with the player's foul count; their latest foul is tagged ⚠️ Foul trouble one short of the limit, and 🚪 Fouled out at the limit.
- Made shots add the player who assisted, with their assists so far. Blocked shots add the shooter. Missed free throws show the shooter's free throws made and attempted.
- The end of a quarter or half is its own centered box with 🔔. Substitutions are still left out.
- The "Top rated so far" card is condensed: the two players sit side by side with their stats under their names, and the win probability is one row. It's about a third shorter, with slightly bigger names.
- Fixed: college free throws were headlined "Two-pointer". They now read "Free throw good" or "Both free throws good", and count as one trip to the line.

## 3.67.2 (Nov 17, 2026)
TestFlight: 3.39.1 (38), no new build (web only)
- Settings → Morning email has a Family part, only on DJ's phone: Drew and Doug each get a switch, an email address and a time. Turning one on saves it in that person's own Morning email settings, so they see it and can change it themselves.

## 3.67.1 (Nov 17, 2026)
TestFlight: 3.39.1 (38), no new build (web only)
- Morning email subject now starts with "Today's Slate" and the date, like "Today's Slate, Mon, Nov 17: Magic at Celtics and 6 more".
- DJ can turn on the morning email for someone else in the family with a set-up link. It's saved in that person's own Morning email settings, so they see it in Settings and can change the time, the address or turn it off themselves.

## 3.67.0 (Nov 16, 2026)
TestFlight: 3.67.0 (43)
- Team logos on live notifications: the Lock Screen, the Dynamic Island and the Board show each team's logo in place of its lettered chip, for every team ESPN has a logo for (college and national teams too).
- How: a live notification can't download a picture, so whenever Slate is open the app saves the logos for that day's games on your phone, and the live notifications use them from there. A team whose logo hasn't been saved yet keeps its colored chip.
- Needs build 43, and a one-time setting in Apple's developer account so the app and its live notifications can share the saved logos.

## 3.66.10 (Nov 16, 2026)
TestFlight: 3.64.1 (42), no new build (web only)
- Basketball live feed: players now show a small jersey in their team's color with their number on it, in place of the numbered circle (the top-rated card and every play).
- Live feed: the timer moved out of the score bar. It's now a small "Last play 12s ago" line at the top left, directly above the newest play, and it starts again from 0 each time a new play comes in.

## 3.66.9 (Nov 16, 2026)
TestFlight: 3.64.1 (42), no new build (web only)
- Live feed: the game strip at the top, and swiping left and right, now go between your teams' live games (football and basketball together) plus the game you opened the live feed from, which comes first. Other live games you don't follow are no longer in the strip.
- Live feed on the unfolded Duo: switching teams in the box score no longer jumps the page back to the top.

## 3.66.8 (Nov 16, 2026)
TestFlight: 3.64.1 (42), no new build (web only)
- Live feed: a small timer under the game clock shows how long ago the newest play came in ("12s ago", "1:05 ago"), ticking every second while the game is live. It uses the time ESPN logged each play.
- Live feed: big plays now have an emoji in front of their headline: 🎯 three-pointer, 💥 dunk, 🏀 other baskets, 🚫 block, 🖐️ steal, ⚠️ technical or flagrant, 🟥 ejection, 📺 review; in football 🏈 touchdown, 🥅 field goal, ❌ missed kick, 🧤 interception, 😬 fumble, 💥 sack, 🛡️ safety, 🚩 penalty. The tags on the right keep theirs.
- Basketball live feed: the card's title is just "Top rated so far", without "(ESPN)".
- Folded iPhone Duo: the clock and Wi-Fi no longer cover the right team on the live feed's score bar, and the last game in the strip above it can scroll out from under them. The rest of the page layout is unchanged.

## 3.66.7 (Nov 16, 2026)
TestFlight: 3.64.1 (42), no new build (web only)
- Basketball live feed: the card at the top now shows each team's top-rated player so far, using ESPN's player rating (the same one the live notifications use), so a big all-round game counts, not just points. Their line adds steals and blocks when they have two or more. A team ESPN hasn't rated yet shows its leading scorer until it does.

## 3.66.6 (Nov 16, 2026)
TestFlight: 3.64.1 (42), no new build (web only)
- Players to watch (the quick look and the matchup page): every player now shows real season numbers from ESPN instead of a description like "Boston guard". The numbers fit why the player is worth watching: a shooter gets 3-point percentage (Payton Pritchard: 13.1 pts, 36.3% 3P), a big man gets rebounds, a quarterback gets passing yards and touchdowns. This works on previews already written, with no need to regenerate.
- Claude's previews are now told to give numbers for each player, never a role or position.

## 3.66.5 (Nov 16, 2026)
TestFlight: 3.64.1 (42), no new build (web only)
- Matchup: the "On your slate" (or "Add to slate") button is smaller and sits on the right of the game card, beside the conferences and the arena, instead of taking a whole row under them. It's still easy to tap.

## 3.66.4 (Nov 16, 2026)
TestFlight: 3.64.1 (42), no new build (web only)
- Betting lines keep up with tonight's injury report. Before a game, each line is checked again every 20 minutes in the last 12 hours, and the lean and reasons are redone with the newest news. If the player is now out, or the lean is too close to call, the card goes and the next one takes its place. (It used to stay as first picked: Garza's under stayed after Queta was ruled out.)
- A new reason: a starter at the same position is out, like "Queta (C, 9.1 points a game) is out tonight, so more minutes at center." It counts toward the over for that player's points and rebounds (assists for guards), checks the team's top six scorers instead of only the top three, and makes the player's recent games count for less, since they came in a smaller role. Tonight that takes Garza's points under off the list (too close to call now) and leans his rebounds over.
- A player listed as questionable gets "Listed as questionable tonight."

## 3.66.3 (Nov 16, 2026)
TestFlight: 3.64.1 (42), no new build (web only)
- Live notifications for a single game: one-liners are now sized to fit instead of being cut off mid-word. A two-part line keeps its first part ("Warriors are without Curry"); otherwise it ends on a whole word with "…". Under the two standouts there's room for one short line; on its own (soccer, hockey, before kickoff) it gets two lines.
- Each team's standout is shorter so it fits on one line: last name and three numbers ("Wembanyama 26 PTS 10 REB 6 AST"). Basketball keeps ESPN's own in-game rating to pick the team's best player. Football now picks the team's player with the most yards so far, instead of whoever ESPN listed first.

## 3.66.2 (Nov 16, 2026)
TestFlight: 3.64.1 (42), no new build (web only)
- iPhone app: the "New app version is ready" notice no longer shows up before you can actually get the build. It used to appear about half an hour after a new build was sent to Apple, even while it was still waiting in Apple's processing or review. Now it only appears once someone's phone is already running that build, which proves it's out in TestFlight.

## 3.66.1 (Nov 16, 2026)
TestFlight: 3.64.1 (42), no new build (web only)
- A test account for Claude's checks, so they stop signing in as Drew. It isn't counted in People on the Project status page, its feedback isn't kept, and it doesn't show in the list of people in Settings. Usage counts can also be cleared for one person, which was used to clear Drew's numbers from the test runs.

## 3.66.0 (Nov 16, 2026)
TestFlight: 3.64.1 (42), no new build (web only)
- Project status page, a rework: moving cards is much easier (while you drag, every card shrinks to its title so the whole layout is on screen, each column is one big drop area, and each card has a Move menu with Up, Down, Left, Right and full width). "Waiting on you" is now "Your list": things to try with "Tested, I like it" and "Needs work", reminders, and things to think about, all with check-offs that follow you to any screen. No text is cut off anywhere; a long feedback quote gets a More button. Bigger numbers and calmer details so the key facts stand out. The Live pill shows the time of the last update and turns red if updates stop.
- People: each person now shows the Slate version and the iPhone build they last used, marked in red when it's behind the newest. Slate sends its version along with the usage counts for this.

## 3.65.8 (Nov 16, 2026)
TestFlight: 3.64.1 (42), no new build (web only)
- The Board live notification no longer shows a one-liner under each game. One-liners (the preview line, the live line, soccer goal scorers) stay on live notifications for single games only.

## 3.65.7 (Nov 16, 2026)
TestFlight: 3.64.1 (42), no new build (web only)
- Filters: the second row of filters now looks like the league tabs above it, only smaller. Same wide bold letters, gray until you pick one, dark when picked, with the same green bar under the word. That's the conferences and "Top-10 team" row on All games, All / National TV / Streaming on On TV, and Ranked teams in Box Office. They still read left to right with All first.

## 3.65.6 (Nov 16, 2026)
TestFlight: 3.64.1 (42), no new build (web only)
- Project status, People: someone using the iPhone app no longer shows as "Browser". The screenshot checks Claude runs sign in with a real profile, and they were being counted as that person using Slate in a browser. Those runs are no longer counted, the app is now recognized by the app itself (any build), and the card shows which build each person is on, like "iPhone app 3.64.1 (42)".

## 3.65.5 (Nov 16, 2026)
TestFlight: 3.64.1 (42), no new build (web only)
- iPhone app, Duo unfolded: the pull-down works here too. With two pages side by side, pull down at the top of either one and it slides down with your finger, stiffer the further you go, and springs back when you let go, the same feel as folded. With one page on the unfolded screen it's iOS's own bounce, like the folded slate.

## 3.65.4 (Nov 16, 2026)
TestFlight: 3.64.1 (42), no new build (web only)
- iPhone app, folded Duo: every page now pulls down as far as the slate. They all use iOS's own bounce now, the same one the slate uses, so you can keep pulling and it gets stiffer the further you go, then springs back. Before, other pages stopped after a short pull.
- Pages too short to scroll (an empty day, a short list) get the same pull and the same stretch.

## 3.65.3 (Nov 16, 2026)
TestFlight: 3.64.1 (42), no new build (web only)
- Slate: The Athletic newsletters now sit under Betting lines at the bottom of the slate.
- Slate: Betting lines starts closed. Tap its header to open it. Once you open it, it stays open for you (every day, on every device you sign in on) until you tap it closed again.

## 3.65.2 (Nov 16, 2026)
TestFlight: 3.64.1 (42), no new build (web only)
- iPhone app, folded Duo: every page now has the slate's pull-down. At the top of any page (All games, On TV, News, a matchup, Box Office, Teams, Settings and the rest), pull down to slide the page down with your finger and see anything under the clock and Wi-Fi; it springs back when you let go. No added space anywhere.

## 3.65.1 (Nov 16, 2026)
TestFlight: 3.64.1 (42), no new build (web only)
- Quick reads: the small paragraph and bullet points switch is gone from the quick read, the recap and Claude's take on team pages. You pick the style in one place now: Settings, Slate and games, Quick reads. Your saved choice stays as it was.

## 3.65.0 (Nov 16, 2026)
TestFlight: 3.64.1 (42), no new build (web only)
- For DJ: Slate now counts how much each person uses it, for the People section of his Project status page. It counts three things: how many times the app was opened, minutes on screen, and how many times each page was shown (Slate, All games, News and so on). Nothing about which games or teams anyone looked at.
- The counts are sent every two minutes while Slate is open, kept for 30 days, stored encrypted, and only an admin passcode can read them. Someone looking around without a passcode isn't counted.
- Nothing looks different in the app.

## 3.64.1 (Nov 16, 2026)
TestFlight: 3.64.1 (42)
- Menu: the hammer's head on the Slate button is always filled in, whether or not you're on the slate. It used to be an outline until you were on the slate. The iPhone app's menu changes with build 42.

## 3.64.0 (Nov 16, 2026)
TestFlight: 3.64.0 (41)
- The Board live notification shows each game's one-liner from the slate under its score: the red live line while the game is on, the preview line before it starts. On the Lock Screen it's two lines when the Board has one or two games, one line with three or four. Dropped after the final. Needs build 41.
- Soccer: once a goal has been scored, the live notification's line (single game, Board and Dynamic Island) is just the goal scorers and their minutes, away side first like the score: "ITA Kean 15' · BIH Tabakovic 79'". Penalties say "pen", own goals "OG" and count for the other side; shootout kicks are left out. Before the first goal it's the usual line. The slate card is unchanged.
- A game's live notification no longer goes back to the preview line ("Netherlands are unbeaten in their last five") when Slate hasn't been open for a while. It keeps the last live line your phone shared until a newer one comes, so it matches the slate card.

## 3.63.0 (Nov 16, 2026)
TestFlight: 3.63.0 (40)
- New Slate logo: a hammer with an axe blade on one side, tilted mid-swing, with a sparkle off the blade. It replaces the green S made of tiles next to every page's title, and it takes the theme's accent color (green on Midnight, dark green on Sunday Paper).
- Menu: the Slate button is the new logo in place of the wand. It's an outline like the other buttons and fills in when you're on the slate. On TV is an outline now too, to match the rest.
- Home Screen: the app's icon is the new logo. The iPhone app's icon and its menu change with build 40.
- iPhone app menu on Sunday Paper: the page you're on is white on a solid dark green circle. Green on cream was too faint to see (Drew's feedback).

## 3.62.4 (Nov 16, 2026)
TestFlight: 3.39.1 (38), no new build (web only)
- Team logos: NFL logos could be missing. Logos for teams whose game had not been refreshed yet waited on a team list downloaded from ESPN, one per league, and if that one download failed the whole league showed lettered boxes for an hour.
- NFL, NBA, WNBA, NHL and MLB logos no longer need that download at all. A league whose list fails is tried again in two minutes, not an hour.

## 3.62.3 (Nov 16, 2026)
TestFlight: 3.39.1 (38), no new build (web only)
- Soccer live lines name the player and the team: "Arsenal's Saka has missed a penalty", "Arsenal's Saka had a penalty saved", "an own goal by Chelsea's Smith", "Saka has set up two goals for Arsenal", "Arsenal's Raya has made 5 saves to keep Chelsea out". When ESPN hasn't named the player yet, the line names the team, and it switches to the player as soon as ESPN adds the name.
- A red card with no name from ESPN reads "Arsenal have been down to 10 men since the 60th minute".

## 3.62.2 (Nov 16, 2026)
TestFlight: 3.39.1 (38), no new build (web only)
- Admin-only settings. Your account is the admin; everyone else gets only their own settings. Admin only: Invite someone and the list of invites, People and Remove, Try the new user setup, the Claude summaries cost line, reading the feedback people send, and The Athletic FC (the newsletter that comes from your Gmail).
- The server checks each of those too, so hiding the rows isn't the only lock: an invite, a removal or the feedback list is refused for anyone who isn't an admin.
- The Athletic FC used to be offered to anyone logged in. It's now yours only, since its link comes from your email.
- Admin is a flag on the account, not your name. No one else has it, and nothing in the app can hand it out.

## 3.62.1 (Nov 16, 2026)
TestFlight: 3.39.1 (38), no new build (web only)
- Soccer live lines: when ESPN hasn't named who missed a penalty, the line names the team instead ("Arsenal have missed a penalty") rather than starting with a blank.

## 3.62.0 (Nov 16, 2026)
TestFlight: 3.39.1 (38), no new build (web only)
- Morning email now looks like the slate page. Today's slate comes in the same cards, grouped by time: the league line, the tag in the corner ("Your team", "Heavyweights", "Prime time"), team logos, names with your star and records, the time and channel, and the one-line preview under each game, worked out the same way the slate does it.
- New second section, Your teams yesterday: each of your teams' games from yesterday with the final score and Claude's recap. Slate has Claude write any missing recap about 45 minutes before your email (the same recap the app shows, so it's there in the app too). These don't count toward anyone's 10 summaries a day.
- Last night is the rest of yesterday's slate as final-score cards.
- The email uses your phone's theme and accent color (Midnight or Sunday Paper). It updates whenever you change a Morning email setting or tap Send.
- "Send one now" takes a minute or two, so Claude can finish the recaps first.

## 3.61.1 (Nov 16, 2026)
TestFlight: 3.58.0 (39), no new build (web only)
- Live notifications now carry the red live one-liner from the slate card while a game is on ("GER: Wirtz has scored twice"), not just the preview line from before the game. On the Lock Screen it's the line across the card (under the standouts when there are some), and in the Dynamic Island held open it's under the last play.
- The line comes from your phone, like the preview line: it's shared while Slate is open and refreshed every few minutes. If Slate hasn't been open for 20 minutes, the live notification goes back to the preview line rather than show an old one.
- When two people follow the same game, the line one of them shared is kept for both.

## 3.61.0 (Nov 16, 2026)
TestFlight: 3.39.1 (38), no new build (web only)
- Settings is now a short main page with sub-pages. The main page: Slate rules, Notifications, Morning email, Slate and games, Look and text size, Account and people, Share the slate, About and updates, Send feedback. Each row says what it's set to, and Back returns to the main page.
- Morning email has its own page instead of sitting in the middle of Settings.
- Slate and games: scores, The Athletic newsletters, Worth a look, thumbs up and down, quick reads. Look and text size: phone, theme, accent, text size, the split on the crease. About and updates: version, what's new, Claude summaries, Reset the app.
- New for DJ, in Account and people: "Try the new user setup". It shows the sign-up page and then the welcome exactly as a new person gets them, starting with no teams. Nothing is saved: your teams, rules, slate and alerts are untouched when it closes. ("Welcome walkthrough" is different: it starts from your own setup and really replaces your rules at the end.)
- New for DJ: People. Everyone with an account, how they joined, and how many of their 10 Claude summaries they've used today, with Remove (tap twice). Removing someone takes away their passcode.

## 3.60.2 (Nov 16, 2026)
TestFlight: 3.39.1 (38), no new build (web only)
- Soccer live lines: own goals read properly. "Saka has scored for Arsenal, plus an own goal by Smith", or "An own goal by Smith has Arsenal in front". An own goal is never written as if it were a player who scored.
- An own goal no longer shows up as a team's standout scorer, and a goal ESPN hasn't put a name on yet is left out of the scorer list instead of being guessed.

## 3.60.1 (Nov 16, 2026)
TestFlight: 3.39.1 (38), no new build (web only)
- Suggested for you: thumbs up now adds the game to your slate right away and counts as a like, so the separate Add to slate button is gone. To take it back off, tap its ✓ on your slate. Thumbs down still hides it (with Undo) and counts as a dislike.
- Worth a look is back to how it was: add a game with its +, or close it with the ✕. The ✕ just closes it for today and doesn't teach anything. What you've liked and disliked on Suggested for you still shapes which games show up there.

## 3.60.0 (Nov 16, 2026)
TestFlight: 3.39.1 (38), no new build (web only)
- Team logos. Every team badge now shows the team's official logo from ESPN in place of the lettered box: the slate, All games, the matchup page and quick look, Betting lines, Suggested for you and Worth a look, News, Box Office, the live feed, the Teams page and team pages, Settings and the welcome team picker. Pro, college and soccer teams, and flags for national teams.
- The colored box with the team's letters still shows for a moment while a logo loads, and stays if ESPN has no logo for that team. Nothing moves when the logo arrives.
- Midnight uses ESPN's dark-theme logos and Sunday Paper the regular ones. Each logo is kept on the phone after its first load.
- College teams now use their real ESPN colors. When two teams' colors are too close, or a color disappears into the theme, the live feed and box score use the team's alternate color.
- The morning email shows team logos too.
- International and small-college teams get their logos everywhere after the next overnight slate refresh; until then they show once the game is close to starting.

## 3.59.1 (Nov 16, 2026)
TestFlight: 3.39.1 (38), no new build (web only)
- Thumbs up and down learn mostly from teams now, not whole categories. A team counts from your first thumb. A league, conference or kind of game (national TV, late starts, why it was picked) only shifts after three or more thumbs the same way, and all of those together can move a game only a little. A few thumbs down on weak matchups no longer push out national TV college hoops.
- "College games with no ranked team" is no longer something Slate learns, because that's most college games.
- Suggested for you: national TV games in a league you follow closely (your teams, your rules, what you add) now reach the bar on their own, like a Monday night's college hoops on ESPN or BTN.
- Settings, Thumbs up and down shows only what actually changes your suggestions.

## 3.59.0 (Nov 16, 2026)
TestFlight: 3.39.1 (38), no new build (web only)
- New: invites. Slate is now invite only for new people. In Settings > Account, "Invite someone" makes a link to send. It works once and lasts 7 days. The person picks their own name and passcode, and gets their own teams, rules, alerts and 10 Claude summaries a day. The same sheet lists your invites: waiting, used (and by whom) or ran out, with Cancel.
- New: a log-in page. A phone with no passcode now opens on a real page (Log in, I have an invite, Just look around) instead of the pop-up box.
- New: the welcome walkthrough. Someone new gets it once: what Slate is, then five quick steps: pick your teams, pick your leagues, how big a slate (just the big ones, a good mix, lots of games), a few preferences (ranked college games, national TV, rivalries and big events, earliest start) and notifications (my teams, slate games, morning brief, morning email, and turning alerts on for this phone). The last step shows the rules in plain words and how many games they put on today's slate.
- Slate rules are built from those answers. Nothing is locked in: every part can be changed in Settings > Slate rules.
- Already using Slate? Nothing changes for you. Settings > Account has "Welcome walkthrough" to run it yourself; it replaces your rules only when you tap "Replace my rules" on the last step.
- When one of your teams plays in an event (a college basketball tournament, a bowl, a cup) that your rules weren't showing, that event is switched on for you, so its other games go on your slate too. Switch it off under Big events in Slate rules and it stays off.
- Settings > Account also shows who's logged in on this phone, with Log out.

## 3.58.1 (Nov 16, 2026)
TestFlight: 3.39.1 (38), no new build (web only)
- The "Show extra suggestions today, for testing" switch is gone from Settings, Thumbs up and down. Testing is done, and Suggested for you and Worth a look are back to their usual bar. Your thumbs from the test stay and keep counting.

## 3.58.0 (Nov 16, 2026)
TestFlight: 3.58.0 (39)
- Live notifications carry the game's preview line from the slate ("Celtics have won five in a row and are 6-0 at home"), in every sport. Before kickoff it's the line under the score on the Lock Screen. Once the game is on, it sits as a quiet line under the two standouts, and in the Dynamic Island held open it's under the last play. After the final it's dropped, since it's old news by then.
- Starting now alerts have the preview line under the matchup too.
- Where the line comes from: your phone works it out on the slate as before and now shares it with Slate's server, so it shows up once you've opened Slate that day. A game you haven't seen on your slate yet has no line.
- The preview line before kickoff and in Starting now alerts works on the current TestFlight build. The quiet line during the game and the one in the Dynamic Island need build 39.

## 3.57.1 (Nov 16, 2026)
TestFlight: 3.39.1 (38), no new build (web only)
- For testing the thumbs today: Settings, Thumbs up and down, "Show extra suggestions today, for testing". On this phone until midnight, Suggested for you shows up to five games with a lower bar, and Worth a look shows any live game that isn't on your slate, in any league ("Live now"). It turns itself off at midnight and will be taken out once testing is done.

## 3.57.0 (Nov 16, 2026)
TestFlight: 3.39.1 (38), no new build (web only)
- Thumbs up and thumbs down on Suggested for you and on Worth a look. Thumbs down hides that game (Undo at the top for a few seconds) and shows you fewer like it. Thumbs up keeps it and shows you more like it. Tap a lit thumb again to take it back.
- Slate learns from the whole game, not just the one you rated: the teams, the league, the conference, why it was suggested (Rivalry, Close finish, Big night…), late or early starts, national TV and ranked matchups. A team you've given two thumbs up gets suggested on its own ("You gave Duke a thumbs up"); two thumbs down on a team keeps it out of both sections unless it's one of your teams.
- Each person's thumbs are their own and saved to their account, so they follow you to any phone. Older thumbs count less as time goes by.
- It won't box you in: a like can lift a game only so far, a game still needs its own reason to be suggested, and Suggested for you shows at most two games from one league.
- Settings, Thumbs up and down: see what Slate has learned (More of, Fewer of) and Start over to clear it.
- The ✕ on Worth a look and Not now on Suggested for you are replaced by the thumbs down.

## 3.56.0 (Nov 16, 2026)
TestFlight: 3.39.1 (38), no new build (web only)
- Settings has a new "Send feedback" button at the top. Pick Problem, Idea or Other, write what's on your mind, and add a screenshot from Photos if it helps.
- It sends who you are, the page you were on before Settings (and the game, on a matchup or Live feed), the app version and your phone layout, so a report doesn't need a back-and-forth. The sheet shows that line before you send.
- Feedback is kept private: it's locked before it's stored, and only DJ's Claude project can read it. A report there each morning lists what's new.
- Sending needs your passcode, like saving settings.

## 3.55.0 (Nov 16, 2026)
TestFlight: 3.39.1 (38), no new build (web only)
- New: Morning email. In Settings, turn on "Email me my slate", enter your email address and pick a time (4 AM to noon, your phone's time zone). Every morning it sends your own slate: each game's time, channel, the two teams with their records, and which ones are your teams, then last night's final scores for your slate and teams. Tap a game to open it in Slate.
- Betting lines (the spread and total, DraftKings' from ESPN) can be added under each game with their own switch.
- No games on your slate and no results from last night: no email that day. No games but results: a short one with just the scores.
- It comes from DJ's Gmail, once a day, and "Send one now" sends today's right away to check it. Your address is stored encrypted on Slate's server, so it isn't in the app's public data.

## 3.54.1 (Nov 16, 2026)
TestFlight: 3.39.1 (38), no new build (web only)
- Betting lines cards use the whole card: the stats line, the reasons and the DraftKings note now start at the card's left edge under the team badge instead of under the name, so they wrap less and the cards are shorter.
- "Leans over" and "Leans under" (and "Went over" or "Went under" after the game) now sit on the left of the card's top line, so the folded Duo's clock and Wi-Fi no longer cover them.
- The average on the right is gone: the stats line already gives it. Once a game starts, the card shows tonight's number against the line in its own line ("Tonight so far: 3 threes, line 3.5"), so the menu button can't cover it either.

## 3.54.0 (Nov 16, 2026)
TestFlight: 3.39.1 (38), no new build (web only)
- Betting lines now lean one way. Each card says "Leans over" or "Leans under" up top and reads "Over 23.5 points" (or Under), with one line of stats for that side instead of a case for both.
- Under the stats, up to three things beyond the player's own numbers that point the same way, each from ESPN's data for that game: the second night of a back-to-back, a few days of rest, a key teammate out (like a team's top scorer, so more shots go to the rest, or a starting QB out for his receivers), minutes going up or down, home and road splits, the last game against tonight's opponent, a game total above or below these teams' recent games, a big spread (starters sit in a blowout), the line moving since it opened, and wind or cold at outdoor football games.
- Game totals lean too, using both teams' last five, a team on a back-to-back, a key player out and the wind.
- Lines too close to call aren't shown. The five are the strongest leans, two a game at most when there are enough, with headline lines (points, passing and rushing yards) and the biggest names a little ahead.
- After the game: "✓ Went over" in green when the lean was right, "✗ Went under" when it wasn't, and the top counts how many leaned right and wrong.

## 3.53.1 (Nov 16, 2026)
TestFlight: 3.39.1 (38), no new build (web only)
- News, Games tab: each game is now a drop-down. The card shows the matchup, score and result; tap it to open Claude's summary, quick hits, the article link and the breakdown, and tap again to close it.
- News, Leagues tab: each league is a drop-down the same way, showing its name until you open it.
- They all start closed, so each tab is a short list. What you open stays open for that day's page on this phone.

## 3.53.0 (Nov 16, 2026)
TestFlight: 3.39.1 (38), no new build (web only)
- Best bets is now Betting lines. Each card shows the sportsbook's real posted line (DraftKings, from ESPN's odds feed), like "O/U 79.5 rushing yards", and what changed since it opened.
- No more picks. Each card makes the case both ways from the stats: "Over:" and "Under:" lines from the player's last six games (or both teams' last five for a game total), with how many went each way, the average, the last three, or the high and low.
- Player lines for NFL, NBA, WNBA and NHL: passing, rushing and receiving yards, passing TDs, catches, points, rebounds, assists, threes and shots on goal. College games only get the game total, because the feed has no college player lines.
- Still five at a time, the headline lines first (points, passing and rushing yards, game totals) and the biggest names, not whichever way the numbers lean. Before the game the right side shows the recent average; once it starts, tonight's number against the line. Settled lines say "Went over" or "Went under" with no win or loss color.
- Player lines usually go up the day of the game. Until they do, the section says so and checks again every half hour.

## 3.52.12 (Nov 16, 2026)
TestFlight: 3.39.1 (38), no new build (web only)
- News, "Customize today's news": Today's slate, My teams and Leagues are now drop-downs. Tap a group's name to collapse it or open it again. A collapsed group still shows how many are picked, and your picks stay as they are.
- Open or collapsed is remembered on this phone, so a long slate can stay folded and My teams and Leagues sit right under it.

## 3.52.11 (Nov 16, 2026)
TestFlight: 3.39.1 (38), no new build (web only)
- Best bets: a game total (Over or Under) now shows both teams' badges in their colors, away over home like a matchup card, instead of a gray box with an O or U.

## 3.52.10 (Nov 16, 2026)
TestFlight: 3.39.1 (38), no new build (web only)
- All games on the iPhone Duo: the second row of filters is back on the left and reads left to right (All first), the same as on a regular iPhone.
- All games on the folded Duo: the Live button stops just left of the side column, so the clock and Wi-Fi no longer cover it on any tab.
- The league tabs fade out a little more gently before the side column.

## 3.52.9 (Nov 16, 2026)
TestFlight: 3.39.1 (38), no new build (web only)
- Folded iPhone Duo: the second row of filters (All, Best of each league, a league's conferences and Ranked choices) no longer runs under the clock and Wi-Fi. Both filter rows now stop just left of the side column, like the other rows of buttons, and fade out there while you scroll them. All still sits at the right end of its row.
- Every phone: picking a filter no longer snaps the row back to its start. The row stays where you scrolled it, and the filter you picked is brought fully into view.

## 3.52.8 (Nov 16, 2026)
TestFlight: 3.39.1 (38), no new build (web only)
- Quick look (tap a game on the slate or All games), every sport: before the start it now goes location, betting line, then Claude's preview or the Write Claude's preview button. Claude's preview used to sit above the line and location.
- Soccer quick look: no season player stats before the start. The lineups still show once they're announced.

## 3.52.7 (Nov 16, 2026)
TestFlight: 3.39.1 (38), no new build (web only)
- Matchup page: the Player stats section ("This season") is back before the start for every sport except soccer. Soccer still shows player stats only once the game is on.

## 3.52.6 (Nov 16, 2026)
TestFlight: 3.39.1 (38), no new build (web only)
- The Athletic Newsletters: Monday's The Pulse was missing from under the slate. Slate only looks for a newsletter on the weekdays it has learned it comes out, and it had wrongly dropped Monday for The Pulse (The Athletic's feed only reaches back a few days, so a day with no edition in view got forgotten). The edition was out at 5:12 a.m. Central and was never looked for.
- A newsletter's learned days are no longer forgotten that way, and every newsletter is also looked for on its "off" days, every two hours, so a wrong guess can't hide an edition again.

## 3.52.5 (Nov 16, 2026)
TestFlight: 3.39.1 (38), no new build (web only)
- Matchup page: no more Player stats section before a game starts, in every sport. It was showing on soccer (and the others) as "This season" before kickoff. Player stats now arrive with the box score once the game is on. Team stats stay.
- Matchup page, every sport: Claude's button (Write Claude's preview, Write Claude's recap, or Regenerate) now sits right under the game's location and betting line, instead of down inside the Preview or Recap section.

## 3.52.4 (Nov 16, 2026)
TestFlight: 3.39.1 (38), no new build (web only)
- Live feed: each play tag starts with an emoji, like News. 🔥 Big play and scoring runs, 🔄 lead change, 🤝 tie, ✅ converted on 3rd or 4th down, 🛑 stopped, ⛓️ 1st down, 📈 win-probability swing, 🚩 flag, 🚨 red zone and buzzer-beater, ⏱️ two-minute drill and clutch, 💪 and-one. The play text itself has none.

## 3.52.3 (Nov 16, 2026)
TestFlight: 3.39.1 (38), no new build (web only)
- News: every Hot tag now has the 🔥 and is red. Before, only the Hot label in a league breakdown had it; a tag Claude wrote as "Hot" on a game card, in the quick hits or on a team card was plain gray.
- Cold tags get the 🧊 the same way.

## 3.52.2 (Nov 16, 2026)
TestFlight: 3.39.1 (38), no new build (web only)
- News breakdowns have emojis on their labels: 🔥 Hot and 🧊 Cold, 🔢 The number, ⭐ Performances, 🚑 Injuries, 📰 Latest, 👀 What to watch for, 💬 Said, 🗓️ the timeline, ⏭️ Next up and 📖 Read more.
- On the News page, a "New" tag shows 🚨 and an Injury tag shows 🚑.
- One emoji per label or tag, none inside the text Claude writes.

## 3.52.1 (Nov 16, 2026)
TestFlight: 3.39.1 (38), no new build (web only)
- News breakdowns: text is no longer cut off mid-word. "The number" was being cut at 16 characters ("2 TDs of 65+ yar") and tags at 24 ("223 scrimmage yards, 3 T") when the breakdown was saved. Both limits are higher now, Claude is told to keep them short, and anything still over the limit ends at a whole word with "…".
- A longer "number" (a figure with words) now sits above its sentence in smaller green type and wraps onto a second line if it needs to.
- The same whole-word rule covers every tag, chip and line on the News page and in game, team and league breakdowns.
- News pages have more room at the bottom, so the last rows (like the ESPN label on Read more) scroll clear of the Back and menu buttons.
- Breakdowns saved before this version keep their cut text for the rest of the day; new ones are right.

## 3.52.0 (Nov 16, 2026)
TestFlight: 3.39.1 (38), no new build (web only)
- New theme: Sunday Paper, a light look with warm cream pages, dark ink and a navy accent. Pick it in Settings under Look. Midnight is still there and still the default.
- A new Navy accent color comes with it, and works on Midnight too.
- In the iPhone app on the folded Duo, the side strip stays a slightly cooler light gray beside the cream page until the next iPhone build.
- Slate rules, By league: the round icon no longer covers the first letter of the league name.

## 3.51.2 (Nov 16, 2026)
TestFlight: 3.39.1 (38), no new build (web only)
- Best bets is back at the bottom of the slate, below Finished.
- All games and Box Office: the accent line is under the selected league tab again. Since 3.48.0 it sat at the top of the tab, off to the side.

## 3.51.1 (Nov 16, 2026)
TestFlight: 3.39.1 (38), no new build (web only)
- News: tapping a team, a league or a game no longer starts Claude writing its breakdown. The breakdown page opens with a Generate button, and Claude writes only when you tap it. A breakdown that's already been generated today still opens right away.
- News, Teams tab: each team card shows its last game with the result and its next game, from ESPN's schedule (for example "Last W 35-10 vs NE", "Next Sat 7:30p @ LIV").
- News, Games tab: the scores sit in the middle of the card with Final or the live clock out on the right, laid out like a slate card.

## 3.51.0 (Nov 16, 2026)
TestFlight: 3.39.1 (38), no new build (web only)
Fourth and last release from the UX review: tighter layouts.
- Open Duo: less empty space between the slate's header and its first game, so more of the slate fits on the short screen.
- Box Office: on the open Duo's right side and at large text sizes, every player is two tidy lines (points, rebounds and assists on top, the rest smaller underneath) in place of lines that broke wherever they ran out of room.
- On TV: a long channel name ("NBA League Pass") gets the whole line, with Live and the game count under it.
- Teams: today's line on a tile uses the short team code ("Final L 13-21 vs SEA") and wraps to a second line when it needs to, so it's no longer cut off.
- The "Live scores update every 10 seconds…" sentence and Enter passcode moved off every page; they're at the bottom of Settings. Tonight's Slate still says when scores last updated.
- Quick look of a live game: Live feed is the one big button, and Full matchup is a plain row under it.
- Best bets and the Live feed use the same text sizes as the rest of the app. Settings' Text size note is one short line.

## 3.50.1 (Nov 16, 2026)
TestFlight: 3.39.1 (38), no new build (web only)
- News, Games tab: each game card now shows the result itself: both scores beside the teams (the loser dimmed), with Final, the live clock in red, or the start time on the right. Same ESPN numbers as the slate.
- Claude's short summary and quick hits for a game no longer repeat that game's score. For a finished game they say how it was won and what it means. This applies to pages generated from now on.
- News, Teams tab: only the favorite teams you picked under My teams, not every team from the games you picked. A team playing today still shows who it plays.

## 3.50.0 (Nov 16, 2026)
TestFlight: 3.39.1 (38), no new build (web only)
Third release from the UX review: one style on every page.
- Settings, Slate rules and Notifications have the same sharp corners as the rest of the app, in place of the rounded rows and cards. So do Best bets cards, the Live feed (score bar, field, play cards, game switcher) and the box score team picker.
- One kind of on/off switch. Notifications, Morning brief, Upset watch, Quiet hours and Scores in Settings use the same sliding switch as Slate rules, in place of the On | Off pills. A choice between two things (iPhone Duo or iPhone, Paragraph or Bullets) keeps its two-part control, and "Paragraph" now fits.
- Notifications: "It lists" is three check boxes (My slate, My teams, Top national games), so on and off are easy to tell apart.
- Slate rules has its own icon (sliders) in Settings and the header. The wand now means the Slate page only, in the menu and in the iPhone app's strip.
- Colors keep one meaning: "Red zone" on the Live feed is a plain gray tag (red stays for live and for what went wrong), and a Best bets Hit uses your accent color in place of a fixed green.
## 3.49.1 (Nov 16, 2026)
TestFlight: 3.39.1 (38), no new build (web only)
- News: the red "too much for one page" message no longer hangs around. It was left over from an earlier try that failed and showed above the options for the rest of the day, so it looked like every new pick was failing. A failed try now shows with its time ("The try at 9:42 PM…"), for half an hour at most, and goes away as soon as you change a pick.
- Tested for real on the test profile: 3 games, 4 teams and 4 leagues wrote in about a minute; 12 games, 13 teams and 4 leagues in about a minute and a half.
- Your picked games are remembered too. Reopen the options the same day and they're still picked; on a new day, games with the teams from the games you picked last time start picked. Someone new still starts with nothing picked.
- Regenerate right after a page was written now writes a new page with your new picks, instead of handing back the page from a moment ago.
- A try that fails because the answer ran too long no longer uses up one of a tester's 10 for the day.

## 3.49.0 (Nov 16, 2026)
TestFlight: 3.39.1 (38), no new build (web only)
Second release from the UX review.
- The day picker and Back no longer sit on top of what you're reading. While you scroll down they step out of the way, and only the menu button stays; scroll up a little, reach the bottom or change pages and they're back. On iPhone and on the open Duo's right side.
- Tonight's Slate: Best bets moved above Finished, so the picks aren't buried under a night of finished games.
- Tonight's Slate has the same day picker at the bottom right as All games, On TV and Box Office (folded Duo and iPhone). The arrows at the top and swiping still work.

## 3.48.0 (Nov 16, 2026)
TestFlight: 3.39.1 (38), no new build (web only)
First of four releases from the Nov 16 UX review. Each one can be undone by itself, and the branch pre-ux-review-3 holds the app from before all four.
- Tonight's Slate: upcoming games show full team names. "Ger…", "Neth…" and "Cel…" are now "Germany", "Netherlands" and "Celtics"; the name was being cut to leave room for a score the game doesn't have yet.
- On TV: Watch is a full-size outlined button, and the channel row you tap to fold a channel is full height.
- Every button is at least 44 points to the thumb, at every text size. Small ones keep their look and get a larger invisible touch area: Time and League, Live, the time headings, the × on a Best bets pick, the check mark and + on a game, Edit order, Close all channels. Others grow a little: the quick look's Top performers, Scoring and Box score rows, the team star buttons and ×, On your slate, Clear slate, the league filter on Teams, On TV's All / National TV / Streaming, and the switches in Settings and Notifications.
- Team chips with light colors are readable: gold, tan and bright orange chips (Alabama State, Georgia Tech, Clemson, the Bengals) get dark letters where white was too faint.
- Best bets: the Hit tag has dark letters on its green. Full matchup's second line is as bright as its first. The day picker's month and "Today" are easier to read.
- For Claude chats: scripts/shots.py runs without a passcode (read-only, saves blocked) and takes --text, --tomorrow and --full.

## 3.47.1 (Nov 16, 2026)
TestFlight: 3.39.1 (38), no new build (web only)
- News: nothing is picked when you open "Customize today's news". The checkmarks for Today's slate, My teams and Leagues are gone; you pick each game, team and league yourself. Each group shows how many are picked and has an All / Clear button.
- Each slate game shows its league and start time above the two team badges with their abbreviations. Your teams show as a team badge with its league.
- Picked games start fresh each day. Picked teams and leagues are remembered. Picks made before this version are cleared.

## 3.47.0 (Nov 16, 2026)
TestFlight: 3.39.1 (38), no new build (web only)
- Best bets shows five picks instead of seven. A day that already had seven keeps its best five.
- Once every game on your slate is over, Best bets freezes: the picks stay with their Hit or Miss, and nothing new is picked, not even after you remove one. A line under them says the picks are final until the next slate.

## 3.46.1 (Nov 16, 2026)
TestFlight: 3.39.1 (38), no new build (web only)
- Game one-liners (All games and Tonight's Slate): no more position letter before NBA and other basketball and hockey players' names. "G Curry" is now "Curry", "C Embiid is a question mark" is now "Embiid is a question mark". Football keeps it ("QB Wilson").
- One-liners already saved on the phone with the old wording are thrown out and redone.

## 3.46.0 (Nov 16, 2026)
TestFlight: 3.39.1 (38), no new build (web only)
- News: the options are now titled "Customize today's news", and you can pick specific games and specific teams. Under Today's slate every game is listed (NE @ DET · 2:30p), and under My teams every team; they all start picked, and a tap leaves one out. Left-out games reset each day; left-out teams are remembered.
- While Claude writes, the page shows a running clock and an accurate wait: how long your last page actually took (for example "Your last page took 2:14"), or "usually 1 to 3 minutes" before there is one. Claude takes the time it needs; nothing was cut from its research. The options are locked until it finishes.
- Fixed: the first real page (12 games, 13 teams, 4 leagues) never finished, because Claude's answer ran past its length limit. The limit is higher, Claude no longer writes extra lines for each team that the page never showed, and a too-long answer is no longer tried (and paid for) twice. If one still runs over, the page says to leave out a few games or teams.
- News buttons, tabs and chips now have the same sharp corners as the rest of the app, and chips are full-size tap targets.

## 3.45.1 (Nov 16, 2026)
TestFlight: 3.39.1 (38), no new build (web only)
- Best bets disappeared from Tonight's Slate once every game was over, and a pick dropped out as soon as its game finished, so you never saw it hit or miss. Finished games move to their own group at the bottom, and Best bets was treating them as taken off the slate. Fixed: finished games count again, so picks stay with their Hit or Miss and the section shows after the last game ends. The Live-only filter no longer takes picks away either.
- Best bets: a player is picked only once, and a pick from a finished game is only made for a player who shows up in that game's box score (one pick had Kirk Cousins for two teams, from an out-of-date team list).

## 3.45.0 (Nov 16, 2026)
TestFlight: 3.39.1 (38), no new build (web only)
- News is back, rebuilt as a quick-look page that Claude writes. Nothing is written until you tap Generate news.
- Before generating, pick what it covers: today's slate, My teams (even when they aren't playing) and any leagues. Your picks are remembered.
- The page says when it was generated and how long ago. Regenerate reopens the picks, so you can change them, and pulls in whatever is new.
- Top news: Claude reads everything, then leads with the five stories it thinks you most want to know. It stays open until you collapse it, then stays collapsed until you open it again. After a regenerate, stories that weren't there before are marked New.
- Three tabs. Games: a card for each slate game with the story, tagged quick hits and one article to open. Teams: a tile for every team on the slate and each of your teams, with one line and a status like Won 6 or Injury. Leagues: the biggest stories around each league you picked.
- Tap "Claude's breakdown" on a game or league, or tap a team tile, for a deeper write-up, written the first time anyone opens it and saved for the day: Claude's take, one number that tells the story, what to watch for, a timeline of how they got here, and stories to read. Games get a watchability verdict and Claude's hunch; teams get the latest developments and what was said; leagues get who's hot and cold, top performances and injuries.
- Every Generate, Regenerate and breakdown counts as one Claude summary, so testers' 10 a day covers them too.
- Tags sit on their own line above the text, so every card's text lines up the same way.

## 3.44.0 (Nov 16, 2026)
TestFlight: 3.39.1 (38), no new build (web only)
- Page headers reworked, the same on every page. The Slate mark now sits level with the page name and is sized to it, with less space above and below the header.
- Tonight's Slate: the date row sits right under the title, without the extra space below it.
- Pages without a date (Teams, News, Live feed, Settings and others) get a single-line header: a smaller mark and the name on one line, with no blank second row. All games, On TV and Box Office keep their date under the name.

## 3.43.4 (Nov 16, 2026)
TestFlight: 3.39.1 (38), no new build (web only)
- Box Office, football: when a player both ran and caught (or threw and ran), each TD says which kind: "161 rec yds · 2 rec TD · 62 rush yds · 1 rush TD". A player with just one kind keeps a plain "3 TD".

## 3.43.3 (Nov 16, 2026)
TestFlight: 3.39.1 (38), no new build (web only)
- Box Office, football: the bold line leads with what a player did best, whatever his position. Christian McCaffrey now reads "161 rec yds · 2 TD · 62 rush yds · 1 TD · 4 rec", and the details (targets, long, carries, yards per carry) move to the gray line. A quarterback who also ran shows his rushing yards in the bold line too. Receiving reads "161 rec yds" like rushing's "62 rush yds". Saved rankings pick this up at the next hourly refresh.

## 3.43.2 (Nov 16, 2026)
TestFlight: 3.39.1 (38), no new build (web only)
- Box scores: the team picker is a bigger, clear two-way switch. Each side shows the team's badge and name ("Thunder", "Kings"), and the team you're looking at fills with its color and gets a colored outline; the other side is dimmed. Taller buttons, easier to hit. Same everywhere a box score shows: under a slate game, the quick look, the matchup page and the Live feed.

## 3.43.1 (Nov 16, 2026)
TestFlight: 3.39.1 (38), no new build (web only)
- Live feed: "Show earlier plays" adds one more batch each time you tap it, the same size as the first (8 more plays in football, 12 more lines in basketball), instead of the whole game at once.
- Live feed: when you leave the page and come back, it starts with just the latest plays again.

## 3.43.0 (Nov 16, 2026)
TestFlight: 3.39.1 (38), no new build (web only)
- Best bets: each card now says in words why it's a good bet, in place of the row of six little stat boxes. For example: "Siakam has had 15 or more points in five of the last six games, averaging 20.8, 5.8 above the line. Hit in each of the last three." Game totals say how many of both teams' last five games went over (or under) and by how much on average.
- The words come from the same ESPN game logs as before: real numbers from games already played, nothing projected.

## 3.42.1 (Nov 16, 2026)
TestFlight: 3.39.1 (38), no new build (web only)
- Live feed: no more scroll box inside the page. It shows just the latest plays (8 in football, 12 lines in basketball), and as a new one comes in at the top, the oldest drops off, so the section stays about the same size. "Show earlier plays" (the button) brings back the rest.
- Live feed: when you're scrolled down reading a play or the box score, it stays where it is on screen when new plays come in.

## 3.42.0 (Nov 16, 2026)
TestFlight: 3.39.1 (38), no new build (web only)
- All games: live games now come first in each league, then the games still to come, then the finished ones, the same order as Tonight's Slate.
- All games: every upcoming and live game gets the slate's corner tag. Games on your slate show why they're on it; any other game shows what your rules would call it (Your team, Ranked, Prime time, National TV, Top teams, Winning teams and so on). Live games can show Close finish, Upset watch or Big night, like the slate. Finished games have no tag, same as the slate's Finished group.

## 3.41.1 (Nov 16, 2026)
TestFlight: 3.39.1 (38), no new build (web only)
- Live feed: the plays sit in a box of fixed height that scrolls by itself. New plays come in at the top of the box without making the page longer, so the page and the box score under it stay where they are. If you've scrolled down inside the box, the play you're reading stays put.
- "Show earlier plays" is a proper button at the bottom of that box.

## 3.41.0 (Nov 16, 2026)
TestFlight: 3.39.1 (38), no new build (web only)
- Best bets: each pick has a × button. Tap it and the pick is gone for the day, and the next best one takes its place (upcoming games first, then live, then finished). An Undo button shows right after, in case of a mistaken tap.
- Each pick now opens with a line that says where its game is: "Starts 7:20 PM", "Live · Q3 5:12" in red with a dot, or "Final". When it settles, a pill says ✓ Hit (green) or ✗ Miss (red) next to it.
- Live picks get a red edge, hits a green edge and a light green card, and misses a red edge with the rest faded. The number on the right is tonight's stat against the line ("11 of 15"), and stays there after the final.
- The top of the section counts them: "2 live · 3 hit · 1 missed".

## 3.40.3 (Nov 16, 2026)
TestFlight: 3.39.1 (38), no new build (web only)
- Live feed: shows just the recent plays (the last 15 in football, the last 20 lines in basketball). "Show earlier plays" brings back the rest.
- Live feed: the game's box score is now under the plays, the same one as the quick look's, kept up to date with the feed.

## 3.40.2 (Nov 16, 2026)
TestFlight: 3.39.1 (38), no new build (web only)
- Live feed for basketball: turnovers read plainly. A steal says "Steal by A. Sengun" with "Trae Young bad pass, stolen by Alperen Sengun" under it. Other turnovers say what happened: "Turnover: traveling", "Turnover: offensive foul", "Turnover: shot clock violation", and so on. Before, a turnover ESPN hadn't labeled yet showed as "Turnover: no".
- Shot headlines fit the shot: "Shot at the rim" for a 1-foot shot (it said "Jumper"), plus Floater, Putback and Heave.
- Technicals say why ("Technical foul: flopping"), and replay reviews and coach's challenges say how they came out ("Coach's challenge: call overturned") in a plain sentence instead of ESPN's all-caps line.
## 3.40.1 (Nov 16, 2026)
TestFlight: 3.39.1 (38), no new build (web only)
- Box scores: every player who got into the game is listed, all the starters and the whole bench, in the quick look and the full box score, for every sport. The quick look used to show only the top 6 scorers, and the full box score folded the bench behind a button. Players who didn't play are still left out.

## 3.40.0 (Nov 16, 2026)
TestFlight: 3.38.0 (37), no new build (web only)
- Best bets is now always seven picks. They stay put once chosen, so the list doesn't reshuffle while you watch.
- Take a game off your slate and its picks go with it; the open spots are filled from the games still on it: upcoming games first, then live games, then finished ones. A pick from a game that already started still only uses the games before it.
- Once a game starts, each pick shows tonight's number from the live box score (for example "14 of 20" points, or the game total against the line). It turns into Hit (green) as soon as it's reached, or Miss after the final. A player who doesn't play shows "Didn't play" instead of a result.
- Settled picks stay in the list with their result, and the top of the section counts how many hit and missed so far. Live picks come first, then upcoming, then settled.
- "Show all" is gone: it's always the seven.
## 3.39.3 (Nov 16, 2026)
TestFlight: 3.39.1 (38), no new build (web only)
- Updates: the app already moves to a new version each time it's opened or brought back. Now it also checks every 2 minutes while it stays open, and moves to the new version only while Tonight's Slate is showing and you haven't touched the screen for 20 seconds.

## 3.39.2 (Nov 16, 2026)
TestFlight: 3.39.1 (38), no new build (web only)
- Worth a look: a live game no longer shows its line twice ("NY: Jalen Brunson has 21 points" two times). The card shows only Worth a look's own line.

## 3.39.1 (Nov 16, 2026)
TestFlight: 3.39.1 (38)
- Live notifications on the Lock Screen: the scores are smaller (closer to the team names), and each team's standout gets its own line under the score, with the team's abbreviation: "SA  V. Wembanyama 26 PTS, 10 REB, 6 AST, 5 BLK" and "UTAH  M. Bamba 26 PTS". They stay after the final too.
- Football: ESPN's live scoreboard lists only three leaders for the whole game, so sometimes one team has none. Then the next biggest game of the three shows instead, with its own team's abbreviation ("SF  C. McCaffrey 4 REC, 161 YDS, 2 TD").
- Needs this TestFlight build. The new lines need build 38; the expanded Dynamic Island stats came with build 37.

## 3.39.0 (Nov 16, 2026)
TestFlight: 3.38.0 (37), no new build (web only)
- All games: every game now has the same one-liner as on Tonight's Slate. Upcoming games show the pre-game note (streaks, injuries, the line), live games show the standout so far in red, and finished games show the top performer.
- To keep a long list light, a missing line is only fetched from ESPN once its game has been on screen for a moment. Lines already on the phone show straight away.

## 3.38.6 (Nov 16, 2026)
TestFlight: 3.38.0 (37), no new build (web only)
- All games on the folded iPhone Duo: the filter row now runs all the way to the right edge, into the side column, so All sits at the far right, nudged down 6 points so the clock and Wi-Fi never touch it.

## 3.38.5 (Nov 16, 2026)
TestFlight: 3.38.0 (37), no new build (web only)
- All games on the iPhone Duo: the second row of filters runs right to left. All sits at the far right under your thumb, then Best of each league to its left, then National TV (a league's conferences work the same way). On a regular iPhone the row is back on the left, in the usual order.

## 3.38.4 (Nov 16, 2026)
TestFlight: 3.38.0 (37), no new build (web only)
- All games on the iPhone Duo: the second row of filters (All / Best of each league / National TV) now really lines up on the right. 3.38.2 only did it on a regular iPhone. It ends just left of the clock and Wi-Fi, which reach down to that row.
- All games in the app: the Live button goes all the way right, in line with the right edge of the game cards (it's below the clock and Wi-Fi, so nothing covers it).

## 3.38.3 (Nov 16, 2026)
TestFlight: 3.38.0 (37), no new build (web only)
- Tonight's Slate: finished games in the Finished group are the same size as the games above them again: the same team names, scores, start times and spacing, instead of a smaller, tighter version. They still drop the tags (Big night, Your team) and stay a little dimmed.

## 3.38.2 (Nov 16, 2026)
TestFlight: 3.38.0 (37), no new build (web only)
- All games: the Live button sits on the right side of the page, under your thumb.
- All games on iPhone: the second row of filters (All / Best of each league / National TV, or a league's conferences) lines up on the right. On the folded Duo it stops just left of the clock and Wi-Fi column so they never cover it.

## 3.38.1 (Nov 16, 2026)
TestFlight: 3.38.0 (37), no new build (web only)
- Live feed for basketball is simpler. The shot graphic is gone. Under the score bar you now see each team's top scorer so far (points, rebounds, assists) and ESPN's win probability, then the plays.
- The plays are one plain list, newest first. Baskets, blocks, steals and turnovers get a card. Misses, rebounds and fouls are a single gray line each, with no folded rows to tap open. Subs and the quarter headers are left out, and ESPN's "End of the 2nd Quarter" lines mark where quarters change.

## 3.38.0 (Nov 16, 2026)
TestFlight: 3.38.0 (37)
- Live notifications use the room in the expanded Dynamic Island (touch and hold it). Under each team's score is its standout so far, with ESPN's full line: "V. Wembanyama 26 PTS, 10 REB, 6 AST, 5 BLK" in basketball, the passing, rushing or receiving leader in football ("B. Purdy 22/28, 389 YDS, 3 TD"). Across the bottom, each team's line facing the other: field goal %, threes made and tried, and rebounds in basketball, timeouts left in football. Then the last play in ESPN's words ("Derrick White defensive rebound"), and ESPN's win probability, labeled as ESPN's ("ESPN win chance: BOS 100%").
- Everything comes from ESPN's live scoreboard while the game is on, and a line is left out when ESPN doesn't send it. Hockey and soccer keep the current view until ESPN's live numbers for them are checked during a game.
- Needs this TestFlight build. Until you update, live notifications look the same as before.

## 3.37.0 (Nov 16, 2026)
TestFlight: 3.33.1 (36), no new build (web only)
- Live feed for basketball: NBA, WNBA and college games now have the Live feed button in the quick look (right above Full matchup) and on the matchup page. Same page as football: the game switcher (live basketball games), swiping between games, the score bar that stays on top, and updates every few seconds.
- In place of the football field, a court card: each team's shots this quarter on its own half court (filled for made, hollow for missed, the latest one circled), field goals and team fouls this quarter, any scoring run of 6-0 or more, a Clutch label in the last 5 minutes of a close game, and ESPN's win probability. Shot spots and fouls come straight from ESPN's play-by-play.
- Plays are grouped under their quarter with that quarter's score. Baskets, free throws, blocks, steals, turnovers and technicals get a card with ESPN's description and the player's line so far (points, rebounds, assists). Misses, rebounds, fouls and subs in between fold into one short row; tap it to see them.
- Tags on the right of a card: Lead change, Tie game, a run (like "BOS 10-0 run"), And-one, Buzzer-beater, Clutch, and big swings in ESPN's win probability.

## 3.36.8 (Nov 16, 2026)
TestFlight: 3.33.1 (36), no new build (web only)
- Live feed: play descriptions are short and readable. ESPN's one long run-on text (often in capitals) is split into a line per part, in plain sentence case, with first initials dropped: "Purdy pass short right to McCaffrey, 66 yds, touchdown", then "2-pt good: Purdy to McCaffrey" or "Extra point good (Moody)". Tacklers, snapper and holder are left out, and penalties stay in the yellow Flag tag instead of the text. A play wiped out by a penalty starts "No play:". Fumbles read "Fumble, recovered by DAL (Lamb) at DAL 29".
- Headlines are shorter: "TD: Purdy to McCaffrey, 66 yds", "Jeanty runs for 10 yds".

## 3.36.7 (Nov 16, 2026)
TestFlight: 3.33.1 (36), no new build (web only)
- Live feed: the game switcher at the top shows even when only one football game is live. Before, it disappeared, and the score box moved up under the folded Duo's clock and Wi-Fi.
- Live feed, folded Duo: pulling down at the top of the page now works in the app. The page slides down with your finger and springs back, done by the page itself instead of relying on iOS's bounce.

## 3.36.6 (Nov 16, 2026)
TestFlight: 3.33.1 (36), no new build (web only)
- iPhone app, folded Duo: the Live feed gets the slate's pull-down too. At the top of the page, pull down a little to see the score bar's right end under the clock and Wi-Fi; it springs back when you let go. Further down, while the score bar is pinned, pulling down slides just the score bar down below them (it moves with your finger as you scroll back up) and it springs back when you let go. No added space anywhere.

## 3.36.5 (Nov 16, 2026)
TestFlight: 3.33.1 (36), no new build (web only)
- Live feed: scrolling no longer catches. Since the feed started checking every 4 seconds, an update could rebuild the page in the middle of a scroll, which stopped the scroll and made the score bar jump. Now an update waits until your finger is off the screen and the page has stopped moving (well under a second), then drops in.

## 3.36.4 (Nov 16, 2026)
TestFlight: 3.33.1 (36), no new build (web only)
- iPhone app, folded Duo: everything is back to how it was in 3.36.0. No gutter on the right, no extra space at the top, and the Live feed's score bar pins right under the top bar again.
- The one change kept: on Tonight's Slate, you can pull the page down a little at the top to see anything under the clock and Wi-Fi; it springs back when you let go. Other pages work as before.

## 3.36.3 (Nov 16, 2026)
TestFlight: 3.33.1 (36), no new build (web only)
- iPhone app, folded Duo: pages start right under the top bar again, with no empty space for the clock and Wi-Fi. To see what's under them, pull the page down at the top; it springs back when you let go.
- The Live feed's score bar still pins just below the clock and Wi-Fi, because it stays on screen while you scroll and a pull can't reach it there.

## 3.36.2 (Nov 16, 2026)
TestFlight: 3.33.1 (36), no new build (web only)
- iPhone app, folded Duo: undid 3.36.1. Pages stretch the full width again, under the right column like before.
- Instead, the page now starts just below the clock and Wi-Fi at the top of that column (they reach a little past the top bar), so nothing sits under them when a page opens. On the Live feed, the score bar pins below them too, so it never slides under the Wi-Fi ring. Everything else scrolls past them as usual.

## 3.36.1 (Nov 15, 2026)
TestFlight: 3.33.1 (36), no new build (web only)
- iPhone app, folded Duo: the column on the right (the clock, Wi-Fi and the menu) no longer covers anything on the page. Every page now stops short of it, below the top bar too: the Live feed's score bar and plays, the slate's cards, the league and day bars, and pop-up sheets. Before, only the top bar and a few buttons kept clear of it.

## 3.36.0 (Nov 15, 2026)
TestFlight: 3.33.1 (36), no new build (web only)
- Live feed checks ESPN for new plays every 4 seconds while the game is being played (it was every 8), so a play shows up about 2 seconds after ESPN posts it on average, instead of about 4. At halftime and between quarters it checks every 12 seconds, before kickoff every 30, and after the final every 2 minutes.
- It only checks while the Live feed is open and on screen; leave the page or lock the phone and it stops, and it checks right away when you come back.
- If ESPN doesn't answer, it waits longer each time (6, 12, 24, up to 60 seconds) instead of asking again and again, and a request that hangs is dropped after 7 seconds so it can't hold up the next one.
- When nothing changed since the last check, the page isn't redrawn, which saves battery and keeps scrolling smooth.

## 3.35.3 (Nov 15, 2026)
TestFlight: 3.33.1 (36), no new build (web only)
- Live feed: the score no longer changes before the play that scored it. The score bar and the switcher now follow the play-by-play, so a touchdown, field goal, extra point, two-point try or safety moves the score at the same moment its play shows up in the feed. ESPN sometimes updates the score a little before the play; if the play still hasn't come through after 90 seconds, the new score shows anyway so it can't get stuck.

## 3.35.2 (Nov 15, 2026)
TestFlight: 3.33.1 (36), no new build (web only)
- Live feed: play tags sit on the right side of the play card, stacked in the open space beside the headline, instead of on a row of their own. Cards are no longer taller because of them; a long headline wraps beside the tags.

## 3.35.1 (Nov 15, 2026)
TestFlight: 3.33.1 (36), no new build (web only)
- Live feed: swiping between games is smoother. The page now moves with your finger one to one, and once you're swiping sideways the page no longer scrolls up and down at the same time. When you let go it carries on off the side and the next game comes in from the other side.
- No more "Loading the play-by-play" flash when you switch games: the games on either side are fetched in the background, so a swipe opens straight to their plays, then they update as usual.
- An update that lands mid-swipe waits until you let go, so the page no longer jumps under your finger. The switcher at the top keeps its place instead of jumping back each update.

## 3.35.0 (Nov 15, 2026)
TestFlight: 3.33.1 (36), no new build (web only)
- New: play tags on the Live feed, under each play's headline. Takes the lead / Ties it (a score that changes who's ahead), Big play (a run of 20+ yards or a catch of 25+), Converted on 3rd / Stopped on 4th, Win probability swings of 10 points or more on one play ("+18% LV", from ESPN's win probability), Flag (a penalty on a play that still counted, or declined or offsetting, with its yards; a play that is only a penalty already says so in its headline), Red zone (the play started inside the 20), 1st down, and Two-minute drill (the last two minutes of each half). A play shows its three most important tags at most, in that order, so rows stay readable. Everything comes from ESPN's play-by-play.

## 3.34.3 (Nov 15, 2026)
TestFlight: 3.33.1 (36), no new build (web only)
- Live feed plays: players show as "F. Mendoza" instead of their full name, with their position beside it (QB, WR, LB). The position comes from ESPN, from the box score or the team's roster; if ESPN doesn't give one, none is shown.
- Live feed plays: ESPN's description of the play is bigger and brighter, and sits right under the headline, above the players.

## 3.34.2 (Nov 15, 2026)
TestFlight: 3.33.1 (36), no new build (web only)
- A live football game's quick look: the Live feed button moved from the top of the card down to right above Full matchup, so the score details (win probability, lines, top performers, box score) come first.

## 3.34.1 (Nov 15, 2026)
TestFlight: 3.33.1 (36), no new build (web only)
- Live feed: the field graphic is shorter (about a quarter less tall), so more plays show below it.
- The Live feed button in a game's quick look no longer squeezes its text against the red dot. It keeps the same size and spacing it has on the matchup page.

## 3.34.0 (Nov 15, 2026)
TestFlight: 3.33.1 (36), no new build (web only)
- Live feed: swipe sideways to change games. Swipe left for the next live football game in the switcher at the top, right for the one before. On the first game, a swipe right goes back, like on other pages. The page follows your finger and the switcher stays put. Swiping on the switcher itself still scrolls it.
- Live feed fits more plays on screen. The score (with the clock, quarter and down and distance) now stays pinned under the top bar while you scroll the plays, so it never scrolls away. The score bar, switcher, field and win probability are shorter, and each play is tighter, so two or three plays show before you scroll and four or five once the score is pinned (it used to be one). Every detail is still there: the field, the line to gain, the Red zone tag, win probability, players with their game so far, and ESPN's play text.

## 3.33.1 (Nov 15, 2026)
TestFlight: 3.33.1 (36)
- iPhone app, folded Duo: the Dynamic Island in the side column is a tall pill, and a game's live notification was cut off ("SEA 2" and "1 LV" with the scores half gone). Each team's chip now sits with its score stacked beside the camera, away on top and home below, so both scores show in full. The scoreboard's Island gets the same fix.
- iPhone app: before kickoff, a game's live notification no longer shows 0-0 in the Dynamic Island. It shows the two team chips and the start time.
- Scoreboard live notification: games still to come show their real abbreviations and team colors from the start (DAL at BOS, PIT at CIN), instead of gray MAV at CEL and STE at BEN until close to the start. A game's own live notification that starts before kickoff gets them too. (Server, works on the current build too.)
- Scoreboard and live notifications: once a game's listed start time has passed but it hasn't begun yet (NBA games tip a few minutes late), it reads "Starting" instead of the start time. It switches to the score as soon as ESPN has the game under way. (Server.)

## 3.33.0 (Nov 15, 2026)
TestFlight: 3.31.0 (35), no new build (web only)
- Home Screen web app: tapping a game alert (starting, close finish, overtime, goal, upset watch, final, hourly score) opens that game's matchup. If Slate is already open it switches to the game; if not, it opens straight to it. The morning brief still just opens Slate. The iPhone app's alerts get the same tap-through with its next build; the server already sends them the game.
- Behind the scenes: removed scripts/alerts.py, the old alert script nothing ran anymore (the server has sent alerts every minute since the worker took over), and fixed comments that still said alerts came from a 10-minute job.

## 3.32.1 (Nov 15, 2026)
TestFlight: 3.31.0 (35), no new build (web only)
- A game you add to your slate (or a game of a team you add) is followed right away: its alerts and live notification start from the next minute, instead of after a wait of up to 10 minutes for the server's slate refresh. A game you remove still drops off at that refresh.

## 3.32.0 (Nov 15, 2026)
TestFlight: 3.31.0 (35), no new build (web only)
- Alerts now use Apple's two everyday levels. Active lights the screen and plays the sound: Starting now, Close finish, Overtime, Upset watch, Goal, and a Final you aren't already watching. Passive goes quietly into Notification Center: the morning brief, the hourly score, and a Final when that game's live notification (or the scoreboard) already shows it. Nothing is Time Sensitive, so no alert breaks through a Focus.
- Alerts stack by game in Notification Center: a game's Starting now, Close finish and Final sit together under it, instead of every Final in one pile.
- Live notifications for a game now start 10 minutes before kickoff instead of when it goes live. Before the start they show 0-0 with the start time and the channel ("On NBC"), and the start alert reads "Starts at 7:30 PM on NBC".
- These are server changes in the alert job, so they work on the current TestFlight build.

## 3.31.0 (Nov 15, 2026)
TestFlight: 3.31.0 (35)
- New: Live feed, for live football games. Open it from "Live feed" at the top of a live game's quick look, or on its matchup page. At the top, the other live football games to switch between; then the score in big numbers with the clock and who has the ball; the field with the ball, the line of scrimmage (blue) and the line to gain (yellow), the down and distance, and a Red zone tag; ESPN's win probability; then every play, newest first, under its drive. Each play says what happened in plain words ("Mendoza to Jeanty for 7 yards"), shows the players with their jersey number in team colors and their game so far ("11/13, 90 yds"), and ESPN's play text. Scores are highlighted, turnovers outlined in red. It updates every 8 seconds while it's open; new plays slide in on top without moving the play you're reading. Football first: once this format is right, the other sports get it too.
- New: Best bets, its own section at the bottom of the slate. Stat-based bets for the games on your slate: a player's best mark over his last six games this season ("Anytime TD, 5 of last 6", "25+ points, 6 of 6", "4+ shots"), and game totals against tonight's over/under from both teams' last five games. Each one shows the real number from every game, oldest to newest, with the hits in green. Everything comes from ESPN's game logs; nothing is estimated. Six show at first (no more than two of one kind), Show all opens the rest; games still to come lead, live ones follow. NFL, college football, NBA, WNBA, college basketball and NHL.
- Pre-game notes: a quarterback's first start of the season leads ("Raiders QB Fernando Mendoza makes his first start of the season; Seahawks are without RB Wilson"). It comes from ESPN's depth chart and the quarterback's game log.
- Top performers (football): one line per player. A quarterback who also ran (John Mateer) shows once, passing and rushing together, instead of twice.
- Matchup scores on the slate sit in one column for the whole page, just past the longest team name, in every rotation and fold.
- All games: the red "N live" sits right beside the league name, and the Live button lines up on the left under the tabs.
- Every page's header matches the slate's: the mark, the page name and a second line in the same spots, with the line under the header at the same height. Side by side on the unfolded Duo, only the page name changes.
- iPhone app: on the folded Duo the menu is one glass capsule in the side column, drawn by Slate: the menu button, Back above it, and the pages inside the same capsule when it's open (the X closes it), so the pages always line up with the button.
- iPhone app: the team chips on live notifications use dark text on light team colors. England's chip was white on white.
- Fixed (server, already live): live notifications on a game's broadcast channel stopped updating, so England–Spain missed the goal and halftime. Apple turned every update down for a missing expiry time; each one now carries it.

## 3.30.1 (Nov 15, 2026)
TestFlight: 3.30.0 (34), no new build (web only)
- Fixed: since 3.30.0, open copies of Slate kept reloading themselves every couple of minutes (the page and version.json carried different build times). Both now come from one build step, so they always match.
- Behind the scenes: the app's code is split into one file per page in src/ (the slate, All games, a matchup, Teams, Box Office, News, On TV, Settings…), and build.py puts index.html back together. The phone still loads one page, so nothing looks or works differently. Each Claude chat now reads only the page it's changing, which uses less of DJ's usage and lets several chats work on different pages at once. CLAUDE.md in the repo is the brief every chat starts from.

## 3.30.0 (Nov 15, 2026)
TestFlight: 3.30.0 (34)
- The live scoreboard has a new look, "Score line": on the Lock Screen and in the Dynamic Island held open, each of your picks is one line ("KC 14 – 3 ATL") with the clock under it, red with a dot while it's being played. A final stays in its spot with the loser dimmed. Before kickoff a game reads "KC at ATL" with its start time and channel. Games stay in the order you picked them; tap one for its matchup.
- The Dynamic Island on its own now shows your first pick (it used to follow whichever game scored last). Once your first pick is final, it moves to your next pick that's live.
- Before kickoff the Dynamic Island no longer shows 0–0: it shows both team chips and a countdown to the start (the start time when that's more than an hour away). On iPhone Duo the countdown sits inside a ring in the two teams' colors. The countdown runs on the phone itself.
- The new look needs the new TestFlight build; the build before it keeps the old scoreboard.

## 3.29.4 (Nov 15, 2026)
TestFlight: 3.29.0 (33), no new build (web only)
- Worth a look: a game that finishes while it's showing keeps its reason in the tag, now "Upset watch · Final" (or "Close finish · Final") instead of just "Final", for the 10 minutes it stays before it drops off.

## 3.29.3 (Nov 15, 2026)
TestFlight: 3.29.0 (33), no new build (web only)
- Removing a game from Worth a look (its ✕) shows a small "Removed from Worth a look · Undo" note at the top center of the page for 5 seconds. Undo puts the game back.

## 3.29.2 (Nov 15, 2026)
TestFlight: 3.29.0 (33), no new build (web only)
- Soccer quick look: the Match summary shows from kickoff, even before anything big happens. It says "No goals yet" and lists the bookings, instead of being left out until the first goal (England–Spain had only a yellow card, so there was no summary at all).
- Pre-game notes about injuries name the position: "Seahawks are without RB Wilson", "Raptors are without F Barnes". Saved notes in the old wording are rebuilt.

## 3.29.1 (Nov 15, 2026)
TestFlight: 3.29.0 (33), no new build (web only)
- Fixed: live games on the slate (and in Worth a look) showed their start time beside the red clock. The clock sits where the start time was again, and live games no longer show the start time (the slate's time groups already say it).
- Tap anywhere on a matchup card to open or close its quick look: the team rows, the clock, the one-liner, the corner tag. Only the channel links and the bell do their own thing.
- The bell moved to the card's bottom right corner (hidden while the quick look is open, where the Live notification and Game alerts switches are).

## 3.29.0 (Nov 15, 2026)
TestFlight: 3.29.0 (33)
- TestFlight now shows Slate's own version before the build number ("3.29.0 (33)" instead of "3.0 (32)"): each build takes the web app's version number when it's made. Earlier entries keep the "3.0 (N)" they were built as. (The build numbers in this history from 3.23.1 on are corrected to match TestFlight: build 3.28.1 is 32.)
- The scoreboard syncs like the game switches: once any of your picks is on (or about to start), the Board button and "Turn off / Show on Lock Screen" show whether the scoreboard is actually on your Lock Screen; before that, they show it's scheduled. Tap Show on Lock Screen when it's off and it goes up right away.
- Quick look on an upcoming game: Claude's preview (or the button to write one) is always at the top, above the betting line, the venue and lineups.

## 3.28.1 (Nov 15, 2026)
TestFlight: 3.0 (32)
- The Live notification switch on a live or finished game now shows exactly what's on your phone: on only while that game's live notification is actually on your Lock Screen. The app tells the slate which ones are showing (when Slate opens, and the moment one starts, ends or is swiped away). Before, a game could read "on" because your settings included it even though nothing was showing (the server shows at most four at once, and holds them back during quiet hours). Tap a switch that reads off and the live notification goes up right away. Upcoming games still show your setting. Needs the new TestFlight build.

## 3.28.0 (Nov 15, 2026)
TestFlight: 3.0 (31)
- Live notifications for a game now listen on that game's broadcast channel (Apple's broadcast push): the server sends each score once per game, and every live notification for it updates, whether or not Slate is running or was swiped away. No more stuck scores from a missing token. Works for ones the server starts and ones you switch on from the slate. Needs the new TestFlight build and Broadcast Capability on the app ID (done). If a channel can't be made, it falls back to the old way. The scoreboard stays on its own token (it mixes four games).

## 3.27.0 (Nov 15, 2026)
TestFlight: 3.0 (30)
- A game's Live notification switch now matches what's on your phone: swipe a live notification away and its switch (in the game's tray, and the gray bell) turns off, and the server won't put it back. The same for the scoreboard (its Show on Lock Screen turns back on as an option). The app tells the server the moment it's swiped away; if the app wasn't running, the server notices the next time it tries to update it. Coming back to Slate also picks up any switch the server turned off.

## 3.26.0 (Nov 15, 2026)
TestFlight: 3.0 (29), no new build (web only)
- Quick look on a finished game: a Recap dropdown at the top shows Claude's short read, or the button to have Claude write it right there (shared with everyone, like all write-ups).
- Quick look dropdowns remember how you left them: open one (say Top performers) and it starts open on every quick look you open after that, on this phone; close it and it starts closed.
- All games: finished games show their start time under "Final".
- Pre-game notes: when both teams are on the same streak it reads "Both teams have won four in a row".

## 3.25.4 (Nov 15, 2026)
TestFlight: 3.0 (29)
- Fixed: live notifications the server started could stay stuck on the score they started with (Ole Miss–Oklahoma showed 0-0 early in the 1st while the game was 7-14 in the 2nd). The server can only update one after the phone sends it that notification's token, and iOS doesn't wake Slate to send it when the app has been swiped away. Now every time Slate opens or comes back to the front, it sends the tokens of every live notification showing, so they all catch up within a minute. The scoreboard was updating normally.

## 3.25.3 (Nov 15, 2026)
TestFlight: 3.0 (28)
- Folded iPhone Duo: the open menu now lines up with iOS's menu button below it: the same width, centered over it, and just above it instead of floating higher and to the right.

## 3.25.3 (Nov 15, 2026)
TestFlight: 3.0 (27)
- Dynamic Island on the iPhone Duo (where iOS gives the island less width): mini chips instead of the split ring, a small team chip and its score on each side of the camera ("MIN 7 | 10 GB"), for one game and for the scoreboard (the game that last scored). When the island is shared with another live notification, the smallest spot shows just the score ("7–10") instead of the ring. Needs the new TestFlight build.

## 3.25.2 (Nov 15, 2026)
TestFlight: 3.0 (26), no new build (web only)
- Pre-game notes: when both teams are on a streak, the note says it once ("Both on a roll: England have won four straight, Spain five") instead of also leading with one team's streak ("Spain have won five in a row; Both on a roll: …"). A streak line is never paired with another streak line now. Saved notes in the old wording are rebuilt.

## 3.25.2 (Nov 15, 2026)
TestFlight: 3.0 (26), no new build (web only)
- Pre-game notes: when "Both on a roll" (or a hot team against a cold one) is one of the facts, the single-team streak lines are dropped, whichever ranked higher. "Spain have won five in a row; Both on a roll: England have won four straight, Spain five" now reads "Both on a roll: England have won four straight, Spain five". Saved notes worded the old way are rebuilt.

## 3.25.1 (Nov 15, 2026)
TestFlight: 3.0 (26)
- Live notification (one game): the Watch (channel) button is gone, so the one-liner runs across the whole bottom of the card, on the Lock Screen and in the held-open Dynamic Island (the Matchup button there is gone too; tapping anywhere still opens the matchup).
- Live football: above the one-liner, a football and who has the ball with the down and yard line, in words: "MIN ball · 3rd & 4 at GB 35" (the football by the team's name stays too). When ESPN drops the down text between plays, the server now works it out from the down, distance and yard line, so it stays up. A live notification started from the slate shows it right away too.

## 3.25.0 (Nov 15, 2026)
TestFlight: 3.0 (25)
- Scoreboard live notification, new Lock Screen design: your four games in a 2×2 grid, one square each. Each square has both teams' chips (the same team colors and stripes as the app) with their scores, then the clock in red while live, "Final" (the losing side dimmed) or the start time. Live football also shows a small football next to the team with the ball, and the down and yardage line under the clock ("3rd & 4 · ILL 35"), updated as it changes. Tap a square for that game's matchup. Needs the new TestFlight build.

## 3.24.6 (Nov 15, 2026)
TestFlight: 3.0 (24), no new build (web only)
- Box scores are tighter: smaller player photos, less space above and below each player and between the stat columns, and smaller "Show all" buttons. Same text sizes.

## 3.24.5 (Nov 15, 2026)
TestFlight: 3.0 (24)
- Folded iPhone Duo: the menu's grow-and-fade open and close is back. It now grows up out of the menu button inside the side column (and shrinks back into it), without the flash in the middle of the page.

## 3.24.4 (Nov 15, 2026)
TestFlight: 3.0 (23), no new build (server and web only)
- Claude write-ups are written once for everyone: game previews, recaps, team pages and Box Office were already shared by every account, and now two people can't have the same one written twice. If anyone (you or a tester) is already having Claude write it, everyone else's tap just waits for that one; if it was written or regenerated in the last 3 minutes, a new tap shows that one instead of calling Claude again ("Claude wrote this a moment ago, so here it is"). No second charge either way. The personal News briefs (built from each person's own slate) stay per person.

## 3.24.3 (Nov 15, 2026)
TestFlight: 3.0 (23)
- Folded iPhone Duo: the open menu no longer flashes in the middle of the page for a split second before jumping into the side column. It's now laid over the full-screen page, so it's in the column from its very first frame.

## 3.24.2 (Nov 15, 2026)
TestFlight: 3.0 (22)
- Folded iPhone Duo: the open menu fades in right where it belongs in the side column, instead of starting toward the middle of the page and sliding over into the column.
- Pre-game notes don't repeat themselves: after "Both on a roll" (or a hot team against a cold one), the second fact can't be one of the same streaks again ("Both on a roll: Steelers have won four straight, Bengals four", without "; Bengals have won four straight" after it).

## 3.24.1 (Nov 15, 2026)
TestFlight: 3.0 (21), no new build (server only)
- The number job (scores, odds, start times, Box Office, slates; scripts/tick.py) is now started every 10 minutes by the Cloudflare server instead of GitHub's own schedule, which only ran it every few hours overnight. GitHub's schedule stays as a backup. Needs a GitHub token saved in Cloudflare as GH_TOKEN.

## 3.24.0 (Nov 15, 2026)
TestFlight: 3.0 (21)
- Live notifications show up the moment you switch them on: a game's Live notification switch (live or finished games, or one starting within 15 minutes) and the scoreboard's Show on Lock Screen now put it on your Lock Screen right away, and the server takes it over and keeps it current. Switching off (the tray switch, the gray bell on a slate card, or Turn off on the scoreboard) takes it down right away too. Changing the scoreboard's picks while it's on updates it right away. Needs the new TestFlight build; until then it still takes up to a minute.
- The scoreboard wasn't starting because your phone had never sent the server what it needs to start one on its own; starting it from the app gets around that.
- Betting lines show for every game, on your slate and in All games, whether or not Claude has written a preview: the line now comes straight from ESPN's scoreboard when the server hasn't saved one. Before, a game without a Claude preview showed no line.
- Box Office: last night's top performers were missing. An early-morning run had marked Nov 14 finished with only the overnight games, so the rest never came in. Fixed for Nov 14, and a day now only counts as finished once every game in it is over.

## 3.23.1 (Nov 15, 2026)
TestFlight: 3.0 (20)
- Folded iPhone Duo: the open menu in the side column now always shows every page (Settings, News, On TV, Teams, Box Office, All games, Slate). iOS's own column only fits a few buttons and was tucking the rest (like Slate) into a second "more" menu, so the app now draws the page buttons itself, stacked right above the menu button and sized to fit the column's height. Needs the new TestFlight build.
- Fixed: a late game could stay "in progress" the next morning (Utah–Arizona showed the 4th quarter after it had ended). The app now keeps checking any game it last saw in progress until ESPN calls it final, and the server finishes off the previous night's games that were still marked live.

## 3.23.0 (Nov 15, 2026)
TestFlight: 3.0 (18)
- Live scoreboard: on today's slate, a Board button beside Live (in the iPhone app) opens a picker. Pick up to 4 games and tap Show on Lock Screen: they show together in one live notification on your Lock Screen and in the Dynamic Island, one row per game (chips, scores, then the clock or start time; tap a row for that game's matchup). It starts 15 minutes before your first pick (right away if one's already on), keeps up with every score, and ends after the last final (the finals stay up to 4 hours). The Dynamic Island shows whichever game scored last. Change the picks any time; Turn off takes it down within a minute. Needs the new TestFlight build.
- A game's notifications are two named switches in its tray now: Live notification (its score on your Lock Screen and in the Dynamic Island; for a finished game, its final) and Game alerts (Game starting, Close finish, Overtime, Final, Goals). Lit means on; tap to switch it for that game alone. The small gray bell on a slate card means at least one is on, and tapping it turns both off for that game (Undo in the note that pops up).
- Remove: Keep sits right beside "Remove from slate?".
- Live notifications: the Box score button is gone. After the final, the one-line note gets the whole width and wraps to a second line instead of being cut off (Lock Screen and the held-open Dynamic Island).

## 3.22.0 (Nov 15, 2026)
TestFlight: 3.0 (17), no new build (server and web only)
- Remove asks first: tapping the ✕ in a game's tray turns the row into Keep and "Remove from slate?". Tap that to remove the game; Keep, or 5 seconds, backs out.
- A small gray bell sits next to the time on any slate card whose game will notify you. Tap it to turn off that game's notifications: its live score and its game alerts (Game starting, Close finish, Overtime, Final, Goals). Undo is in the note that pops up.
- The tray's bell now reads On or Off and covers all of that game's notifications the same way. Turning it on also turns on the game's live score where your settings leave it out.
- Finished games get the bell too: turn it on to put the final score on your Lock Screen. It stays like any final (up to 4 hours) until you swipe it away or turn it off.
- Server: each game's live score is checked once a minute (a game on both your slate and your teams was being looked at twice).

## 3.21.0 (Nov 14, 2026)
TestFlight: 3.0 (17), no new build (server and web only)
- Live score for one game: tap a game on your slate and its tray has a Live button with a bell. A lit bell means that game's live score shows on your Lock Screen and in the Dynamic Island (by default, whatever Settings > Notifications > Live score covers). Tap it to switch it off for just that game, or on for a game your settings leave out, like one from Worth a look or All games. Switched off mid-game it leaves within a minute; switched on, it starts within a minute, or when the game starts. A game you switch on yourself shows even during quiet hours. Up to 4 at once, as before.
- The tray's controls are one clean row under Full matchup: star either team on the left (by abbreviation now), and on the right, under your thumb, Remove (the ✕) and the Live bell. The bell shows in the iPhone app, on your own profile, before and during a game.

## 3.20.0 (Nov 14, 2026)
TestFlight: 3.0 (17)
- Live scores on the Lock Screen, redesigned as a scorebug: the slate's team chips (each team's second color as a stripe along the bottom), bigger scores in Slate's own font, the clock in red with a live dot, a football beside the team with the ball, and the down and distance ("2nd & 7 at BC 34"). Under it sits the slate's one-line note, red while the game is on. A Watch button on the right opens the channel's app the way the slate's channel buttons do (YouTube TV; NBC and ESPN's channels ask which), passing through Slate for a moment. After the final the losing team dims and the button becomes Box score.
- Dynamic Island: pressing and holding it opens the same scorebug around the camera: each team's chip and big score on either side, the clock and the down and distance under the camera, then the red one-line note and a Matchup button on the right (Box score after the final). With one game live it shows both teams' chips and scores; with another game live too, the small circle holds both scores, ringed half in each team's color (away on the left, home on the right). Dark team colors are brightened there so they show on black. Where iOS gives the island less width (the iPhone Duo's side column, an iPhone turned sideways), one game live shows that small split-ring circle too, as Apple asks.
- Tapping a live score now opens that game's matchup in Slate instead of the slate's front page.
- Server: live scores now carry each team's second color, college rankings, the channel, and for football ESPN's down and distance and who has the ball (only while ESPN reports them).
- Needs the new TestFlight build. Live scores already running when you update switch to the new look, but their stripes, rankings and Watch button start with the next game.

## 3.19.3 (Nov 14, 2026)
TestFlight: 3.0 (16), no new build (web only)
- One-line notes all read the same way now: the player's first and last name, no colon after it, and spelled-out stats ("TTU: Thomas Castellanos 223 passing yds, 3 TD", "UTAH: Devon Dampier 75 rushing yds, 2 TD"). Before, some lines used initials ("D. Dampier 57 rush yds") and some had a second colon. This applies on slate cards, Worth a look and the Big night notes. Notes saved on your phone in the old wording are rebuilt once.

## 3.19.2 (Nov 14, 2026)
TestFlight: 3.0 (16), no new build (web only)
- Fixed: slate notes saved on your phone before 3.19.0 had no team attached, so finished games kept showing them without the abbreviation. Those saved notes are now rebuilt once (they may be blank for a few seconds while they reload), and any note still without a team works it out from the player it names.
- Game-winner lines also read ESPN's after-the-game wording ("Raleek Brown 4 Yd pass from Arch Manning" becomes "Manning's 4-yd TD pass to Brown"), plus return TDs.

## 3.19.1 (Nov 14, 2026)
TestFlight: 3.0 (16), no new build (server and web only)
- Worth a look notes get the team abbreviation too ("SCU: E. Mahi has 23 points"). The app matches the player named in the note to the game's stat leaders or box score.
- Slate cards' early live lines (the standout so far, before the main note loads) get it as well ("OKST: D. Mestemaker 186 pass yds, 1 TD").
- Server: the live score data now records each stat leader's team.

## 3.19.0 (Nov 14, 2026)
TestFlight: 3.0 (16), no new build (web only)
- One-line notes about a single team now start with that team's abbreviation: "SC: Cutter Woods threw 3 interceptions", "DEN: Nikola Jokic scored 26 (9-14 FG)". This covers live, final and pre-game lines. Lines that already name the team ("Texas won it on…") or cover both teams are left as they are.
- Game-winner lines handle name suffixes ("Smith Jr." reads as Smith).

## 3.18.1 (Nov 14, 2026)
TestFlight: 3.0 (16), no new build (web only)
- Game-winner lines read cleaner: short team names ("Texas", not "Texas Longhorns") and basketball shots in plain words ("LSU won it on Dent's 25-foot three with 0:01 left").

## 3.18.0 (Nov 14, 2026)
TestFlight: 3.0 (16), no new build (web only)
- Worth a look tags on your slate: any live game on your slate that qualifies for Close finish, Upset watch or Big night gets that tag on its own card (red, top right) instead of showing up again in Worth a look. Worth a look now only lists games that aren't on your slate.
- Finished games' one-line notes now tell you how it ended when it came down to the wire: "Texas won it on Manning's 4-yd TD pass to Brown with 0:02 left". This covers the go-ahead-for-good score in the last moments or in overtime (or extra time), a walk-off in baseball, and a late winner in soccer. It leads over other notes, like a big stat line.

## 3.17.2 (Nov 14, 2026)
TestFlight: 3.0 (16), no new build (web only)
- Football full matchup page, shorter box score: it shows Passing, Rushing and Receiving only, with a "Show defense and special teams" button for the rest (fumbles, defense, interceptions, returns, kicking, punting). After the final, Passing shows the starting QB (others behind "Show all"), and Rushing and Receiving show their top 3.

## 3.17.1 (Nov 14, 2026)
TestFlight: 3.0 (16), no new build (web only)
- Soccer quick look: the last dropdown is called "Lineups and stats" instead of "Box score".

## 3.17.0 (Nov 14, 2026)
TestFlight: 3.0 (16), no new build (web only)
- Soccer matchup page: the Scoring section is gone; the match summary covers the goals.
- Slate quick look (tap a live or finished game): each part is now its own dropdown, closed to start. Football, hockey and baseball: Top performers, Scoring, Box score. Basketball: Top performers, Box score. Soccer: Top performers, Match summary, Box score. Each stays open or closed as you left it while you use the app.

## 3.16.1 (Nov 14, 2026)
TestFlight: 3.0 (16), no new build (web only)
- Final box scores now update after the final: once a game ends, the app checks ESPN again every 2 minutes for the first hour. Before, the first final box score was kept for the rest of the session, so late corrections from ESPN never came in (like Jordan Faison's receiving TD against Boston College showing as 0).

## 3.16.0 (Nov 14, 2026)
TestFlight: 3.0 (16), no new build (web only)
- Matchup page after the final: a Scoring timeline sits under Top performers. Football lists every TD and field goal; soccer lists every goal (scorer and assist, penalties and own goals marked); hockey lists every goal with its assists (power play, short-handed and empty net marked); baseball lists every scoring play. Each line shows the score after it. Basketball has none (too many baskets to be useful).
- Live games get the same timeline for hockey, baseball and soccer (football already had it).
- Box score after the final: each long player list shows its first few (basketball: the starters; football: the top 3; other sports: the top 5), with a "Show all N players" button to open the rest.
- Top performers now include every touchdown and goal scorer, beyond the usual top four. Before, a fifth TD scorer (like Jordan Faison) or a defensive TD (like Jaylen Sneed's fumble return) could be left off. Return and defensive TDs say where they came from.
- Finished group: when the slate is sorted by Time, finished games stay in time groups; the league dropdowns are only for the League sort.

## 3.15.2 (Nov 14, 2026)
TestFlight: 3.0 (16), no new build (web only)
- Finished group: each league's dropdown arrow now sits right next to its game count instead of at the far right.

## 3.15.1 (Nov 14, 2026)
TestFlight: 3.0 (16), no new build (web only)
- Finished group: games now fold by league (each league is its own dropdown), and each card shows its start time at the top left.
- Sorted by League: the Reorder button moves under the Finished group, at the very bottom of the slate.

## 3.15.0 (Nov 14, 2026)
TestFlight: 3.0 (16), no new build (web only)
- Scores on your slate's matchup cards now sit in one fixed spot: at the end of the team column, right beside the time and channel column. It's the same on every card, in every rotation and fold, so team names only shorten when there truly isn't room.
- iPhone Duo, unfolded: tapping a game in Worth a look opens it on the right side, the same as a game on your slate.

## 3.14.2 (Nov 14, 2026)
TestFlight: 3.0 (16), no new build (web only)
- Finished games get their one-line notes back.
- With the slate sorted by League, the Finished group is split by league too, instead of by time.

## 3.14.1 (Nov 14, 2026)
TestFlight: 3.0 (16), no new build (web only)
- Upset watch games that are already on your slate no longer show twice: they stay out of Worth a look, and the game's card on your slate gets a red "Upset watch" tag in its corner instead (its own one-line note stays).

## 3.14.0 (Nov 14, 2026)
TestFlight: 3.0 (16), no new build (web only)
- Today's slate leads with what's live: finished games move to a Finished group at the bottom (open to start; tap its header to fold it). Live and upcoming games stay on top in time order (or by league), right under Worth a look.
- Finished rows are tighter: start times stay, while the league line, tags and one-line notes drop, with smaller scores, so the group takes much less room. Tap a game for its box score as usual.
- Other days' slates are unchanged.

## 3.13.0 (Nov 14, 2026)
TestFlight: 3.0 (16), no new build (server and web only)
- Morning brief, new format: the day and how many games ("Sat 11/14: 6 games"), then one line per slate game in start order ("11 AM - Davidson @ Dayton", "1:30 PM - Boston College @ No. 5 Notre Dame"). If your slate is empty it lists your teams' games; with nothing at all it isn't sent.
- Close finish alerts and Worth a look: the final 8 minutes in basketball too (with football and hockey), from the 75th minute in soccer, and from the 7th inning in baseball.
- Worth a look adds upset watch: a ranked college team trailing a lower-ranked or unranked team late (down 8+ in football's second half, 7+ in basketball's). It has its own switch in Worth a look's settings.
- Ideas for the Lock Screen and Dynamic Island redesign are collected in docs/LIVE-IDEAS.md.

## 3.12.5 (Nov 14, 2026)
TestFlight: 3.0 (16), no new build (server only)
- Found why the iPhone app's notifications stopped: Apple push keys added in Cloudflare as plain-text variables get wiped every time GitHub deploys. Deploys now keep dashboard variables (keep_vars), and the keys should be re-added as Secrets.

## 3.12.4 (Nov 14, 2026)
TestFlight: 3.0 (16), no new build (server and web only)
- Close finish notifications use the same window as Worth a look: football in the final 8 minutes of the 4th, hockey in the final 8 minutes of the 3rd (overtime gets its own alert, as before). Basketball stays the final 5 minutes.

## 3.12.3 (Nov 14, 2026)
TestFlight: 3.0 (16), no new build (web only)
- Worth a look's close games now mean the last minutes, not just the last period: football in the final 8 minutes of the 4th (or overtime), hockey in the final 8 minutes of the 3rd (or overtime). Basketball stays the final 5 minutes, soccer from the 75th minute, baseball from the 7th inning.

## 3.12.2 (Nov 14, 2026)
TestFlight: 3.0 (16), no new build (web only)
- Box Office text is back to the app's normal size on a phone. The small, compact type was meant for two or more columns of players (the open Duo) but was also kicking in on a single column.
- Box Office game info is two lines for every player now: live games show the clock, then the score and opponent ("109-100 @ NO"); finished games show W or L with the score, then the opponent. Live rows were taking three lines.

## 3.12.1 (Nov 14, 2026)
TestFlight: 3.0 (16), no new build (web only)
- Box Office, every league tab: Loading… until that league's live check has actually come back. Some tabs were showing "No games have started yet" from an older saved copy before the check finished.

## 3.12.0 (Nov 14, 2026)
TestFlight: 3.0 (16), no new build (web only)
- Slate matchups: scores stay in the middle of the card, but when a team name is long enough to reach them, they move right just enough to clear it (both scores together, so they stay lined up).
- News is parked for now: the menu item stays, and the page just says Coming soon.
- Box Office: today's page says Loading… while a league's live numbers are on their way, instead of "No games have started yet" before it knows.

## 3.11.2 (Nov 14, 2026)
TestFlight: 3.0 (16), no new build (web only)
- Slate matchups: the scores now sit in the middle of the card (replacing 3.11.0's small nudge). Long team names shorten a little sooner to make room.

## 3.11.1 (Nov 14, 2026)
TestFlight: 3.0 (16), no new build (web only)
- Worth a look: close games no longer say "A 5-point game late" or "Tied late"; the score and clock already show that. Their line now names the standout so far (top scorer, passer, rusher or goal scorer), or there's no line if no one stands out yet.

## 3.11.0 (Nov 14, 2026)
TestFlight: 3.0 (16), no new build (web only)
- Slate matchups: the scores sit a little closer to the team names.
- The one-line notes under upcoming games can now carry a second fact when it adds something (for example a streak and an injury), up to about a line and a half instead of one tight line. They refresh within half an hour.

## 3.10.3 (Nov 14, 2026)
TestFlight: 3.0 (16), no new build (web only)
- The day picker's glass is now the same light gray tint as the app's menu button (and the page's own menu button and Back).
- Fixed the day picker flickering when you scroll to the very top or bottom: the page re-pins its bottom controls while it bounces, which replayed the picker's grow-in animation. It now only animates when it first appears.

## 3.10.2 (Nov 14, 2026)
TestFlight: 3.0 (16), no new build (web only)
- The day picker is now clear glass like the app's menu button: mostly see-through with a light blur and a bright edge, instead of the heavier frosted look. The page's own menu button, Back and menu capsule match it.

## 3.10.1 (Nov 14, 2026)
TestFlight: 3.0 (16), no new build (web only)
- Settings' Claude summaries line shows just the month's total and cost; the per-person count (like "brother 1") is gone from it. Each person's summaries are still counted behind the scenes.

## 3.10.0 (Nov 14, 2026)
TestFlight: 3.0 (16), no new build (web only)
- Settings, Notifications and Slate rules now share the style of the rows at the top of Settings: every group sits in a rounded card with a soft shadow, the switches and pickers are fully rounded, and the rule icons are round, in the accent color.
- Back now goes back where you came from on pages you open from another page: Notifications or Slate rules back to Settings, a team back to Teams, a matchup back to All games or On TV (at the same spot in the list). The menu's own pages still go back to your slate.

## 3.9.1 (Nov 14, 2026)
TestFlight: 3.0 (16), no new build (web only)
- The day picker now uses the same frosted, see-through glass as the menu button, and so do the page's own menu button, Back and menu capsule.

## 3.9.0 (Nov 14, 2026)
TestFlight: 3.0 (16), no new build (web only)
- News is now just My slate: the My teams and league tabs are gone.
- Claude's brief (still only on a tap) is rebuilt: it picks the 2-4 biggest or most meaningful games on your slate and writes a paragraph on each, why it matters and the story behind it, with one related story to open right under it. No list of every game. Then "Around sports": quick hits on the top stories across all of sports, not just your slate.
- Headlines are grouped by game, each under a bar naming the matchup, league, time and channel, and every story is tagged with the team it's about. ESPN's roundup stories that tag a dozen teams only count for a team they actually mention.

## 3.8.0 (Nov 14, 2026)
TestFlight: 3.0 (16)
- Settings moves into the menu, at the very top (the strip and the floating capsule too). The Settings and More buttons are gone from the slate's header, so the title has the whole row.
- Everything that was behind More is now at the top of Settings: Slate rules, Notifications, Share the slate and Reset the app, as rows with round icons in the menu's style.
- The day picker at the bottom is now a capsule like the menu, with round arrows, and grows in with the same quick animation.

## 3.7.0 (Nov 14, 2026)
TestFlight: 3.0 (15)
- News page (new, at the top of the menu and the strip): tabs for My slate, My teams, then each league (the ones you follow first). Each tab lists the latest from ESPN and The Athletic, newest first, with ESPN's photo and summary; tap one to read it.
- My slate news only shows stories about the teams on today's slate; My teams only your teams.
- Claude briefs, only when you tap Brief me: quick hits, a longer read and a few stories worth opening, from Claude's own research. On My slate it's built around today's slate (why each game matters, who to watch, injuries) with a Tonight list in viewing order. Each brief is saved for the day, so reopening it is free; league briefs are shared between everyone, My slate and My teams are yours.
- The page learns what you read: the leagues and teams you open and spend time on move up the tabs and lists, and Claude's My slate and My teams briefs lean toward them. It follows your account to other devices.

## 3.6.0 (Nov 14, 2026)
TestFlight: 3.0 (14), no new build (web only)
- Every page now has the slate's header: the Slate mark, the page's name in the same type (All games, Box Office, Teams, On TV, Settings and the rest), and a line under it, so you always know where you are. Only the slate keeps its date and the Settings and More buttons; All games keeps its search button. Pages with the day picker at the bottom don't repeat it up top.
- The header also gives the iPhone Duo's clock and Wi-Fi icons a clear strip at the top of every page.

## 3.5.0 (Nov 14, 2026)
TestFlight: 3.0 (14)
- iPhone app wherever iOS has no side strip (the Duo open and upright, a regular iPhone, or the Duo set to iPhone): the app now draws the menu itself so it matches the strip. One glass capsule at the bottom right with the same icons: Back (when needed) above the three-line menu button; tap it and the capsule grows into On TV, Teams, Box Office, All games and Slate, the open page lit, with the same quick animation; pick one and it shrinks back. The page's day picker sits just left of it.
- In Safari, the page's own menu matches too: the page icons stack in one capsule above the menu button, without labels, the open page lit.

## 3.4.2 (Nov 14, 2026)
TestFlight: 3.0 (13), no new build (web only)
- Release notes: 3.4.0's app build was cancelled by Xcode Cloud when 3.4.1 followed it minutes later; both ship in 3.0 (13).

## 3.4.1 (Nov 14, 2026)
TestFlight: 3.0 (13)
- iPhone Duo open and upright: iOS has no side column there and was putting the strip menu in a bar centred at the bottom. The app now uses the page's own menu button there instead, bottom right like everywhere else (same buttons, same Back above it). Folded, and open sideways, the menu stays in the side strip.

## 3.4.0 (Nov 14, 2026)
TestFlight: none (Xcode Cloud build 12 was cancelled when 3.4.1 replaced it; its changes ship in 3.0 (13))
- iPhone app: when TestFlight has a newer app build than the one on your phone, a note at the top of the slate says so ("New app version 3.0 (12) is ready"). Tap it to open TestFlight and update; ✕ hides it until the next build. It waits about 35 minutes after a release so the build is really there. Builds before 3.0 (13) can't report their number, so the note starts working from 3.0 (13) on.

## 3.3.0 (Nov 14, 2026)
TestFlight: 3.0 (11)
- iPhone Duo strip: Back moves into the strip, right above the menu button, and only shows when there's somewhere to go back to (on a past day's slate it points right, to today). Opening the menu hides it until the menu closes. The page's own Back button steps aside in the strip.
- Regular iPhone (and the Duo set to iPhone): the menu now matches the strip. Back sits above the menu button and hides while the menu is open; the menu button shows three lines; tapping it stacks On TV, Teams, Box Office, All games and Slate above it as round buttons with their names beside them, the open page lit, and picking one closes them. The menu button and Back are round.
- From here on, changes to the Duo strip are mirrored in the regular iPhone menu.

## 3.2.3 (Nov 14, 2026)
TestFlight: 3.0 (10), no new build (web only)
- Box Office: each player's game result takes two lines instead of three: "W 93-77" on top, the opponent under it. Rows are shorter and the stats line has more room.

## 3.2.2 (Nov 14, 2026)
TestFlight: 3.0 (10)
- iPhone Duo strip menu, take three: the strip shows one menu button at the bottom. Tap it and On TV, Teams, Box Office, All games and Slate appear as strip buttons right above it, in the strip itself, the open page lit. Pick one (or tap the ✕) and they fold back into the one button. Same folded and unfolded.

## 3.2.1 (Nov 14, 2026)
TestFlight: 3.0 (9)
- iPhone Duo, unfolded: the two sides now split exactly on the fold. The app tells the page where the middle of the screen is instead of the page guessing (iOS's side column threw the guess off). Settings > Move split still fine-tunes it.
- Release notes now list the TestFlight build for each version.

## 3.2.0 (Nov 14, 2026)
TestFlight: 3.0 (8)
- iPhone Duo strip menu (needs the new TestFlight build): tapping the strip's menu button now pops On TV, Teams, Box Office, All games and Slate up above it as separate round buttons with their names beside them; the open page is lit, and picking one folds them away. The button turns into an ✕ while they're open. Same folded and unfolded.
- Fixed the Slate header's Settings and More buttons covering the title in the app: iOS reports the Duo's side column as screen padding too, so the header was counting it twice.
- Text sizes reworked: XS, S, M, L and XL (XXS is gone; it moves to XS). Each size now stops growing once the page would get too narrow for the game cards, so big sizes never squeeze cards out of shape on the folded Duo or a regular iPhone. At L and XL, team records hide to keep full team names.
- Soccer match summaries: goals now read "Scorer (assist)", "Scorer (penalty)" or "Scorer (own goal)", with the score beside them.

## 3.1.1 (Nov 14, 2026)
TestFlight: 3.0 (7), no new build (web only)
- iPhone app: the Slate header's Settings and More buttons sit in line at the right end, next to the side column, instead of floating over the title (Safari placed the floating buttons wrong at larger text sizes). "Tonight's Slate" shrinks to fit.

## 3.1.0 (Nov 14, 2026)
TestFlight: 3.0 (7)
- iPhone Duo (iPhone app): the side strip has one menu button instead of five; tapping it lists On TV, Teams, Box Office, All games and Slate, with a check on the open page. Needs the new TestFlight build.
- Pages now run all the way under the strip. The header buttons, the day picker, Back and links like Edit order stay just left of it, so nothing hides under the clock.
- The Slate header's Settings and More buttons no longer cover the title: at larger text sizes they stack, and the title shrinks to fit.
- Settings > Phone now controls the strip too: iPhone Duo uses the strip menu, iPhone uses the page's own menu button.

## 3.0.2 (Nov 14, 2026)
TestFlight: 3.0 (6), the first Xcode Cloud build
- Xcode Cloud now prints the TestFlight export's signing errors straight into its build log (ios/ci_scripts/ci_post_xcodebuild.sh), so a failed export shows its real reason.

## 3.0.1 (Nov 14, 2026)
TestFlight: none (Xcode Cloud build 5 failed to sign; fixed in 3.0.2)
- The iPhone project now carries DJ's Apple team, so Xcode Cloud can sign and export builds for TestFlight (the first TestFlight build failed at export without it).

## 3.0.0 (Nov 14, 2026): the iPhone app
TestFlight: 3.0 (1), uploaded from the iMac (Xcode Cloud build 4 failed to sign)
- Slate is now a real iPhone app (build 3.0), installed from Xcode on DJ's iPhone Duo, with Xcode Cloud building it for TestFlight.
- Alerts arrive through Apple's push service, and live scores show on the Lock Screen and in the Dynamic Island.
- The web app moves to 3.0.0 to mark the start of version 3.

## 2.42.0 (Nov 14, 2026)
- Play by play is gone everywhere. In its place, a tapped game (and Full matchup) leads with the game's top individual performances.
- Football games list every score: quarter and clock, team, TD / FG / safety, who scored ("A. Flora run 77 yds"), and the score after it. Soccer keeps its goal timeline (scorer and minute).
- Full matchup's live section is now "Top performers and players".

## 2.41.0 (Nov 14, 2026)
- Worth a look settings (per account, Settings > Worth a look): pick exactly which leagues can show up (starts with your slate-rule leagues and your teams' leagues), plus two new filters: National TV only, and College: ranked teams only. Games already on your slate always qualify. Replaces the old "I watch / All" choice.

## 2.40.0 (Nov 14, 2026)
- Quick reads and Claude's write-ups always show in full (no more "More" link), in the game tray and everywhere else.
- A line under the slate's header (title, date, settings), with even space below it before Time/League and Live.
- Time | League is the same height as the Live button.
- "Scores updated 12:30 PM" moved to the help text at the bottom of the slate.
- The "You've edited this slate" note is gone; "Back to default slate" now sits beside "Clear slate" under the slate, in the same style.

## 2.39.3 (Nov 14, 2026)
- Dropped the "A ranked showdown" pre-game line (the ranks are already on the matchup); those games now get their next-best line (streaks, the line, ESPN's prediction, head-to-head).

## 2.39.2 (Nov 14, 2026)
- Worth a look: the reason line moved under the matchup, styled like the slate's one-liners (red while the game is live, plain once it's final). The league, tag and ✕ stay above the game.

## 2.39.1 (Nov 14, 2026)
- Unfolded: the two headers line up. "Today's Slate" and "All games" start at the same height, the league tabs sit level with the date row, and the Time/League row lines up with the Live row on the right. The "you've edited this slate" note moved under the Time/League row.
- Every live game with a score now has a red line: its highlight, or until one exists, the game's standout so far ("J. Evans 102 pass yds", "D. Dupree 42 rush yds, 1 TD"). Before any score, the pre-game line stays.

## 2.39.0 (Nov 14, 2026)
- Box Office: players from games on your slate that day carry a small "Slate" tag next to their name (today and past days alike).

## 2.38.1 (Nov 14, 2026)
- Worth a look sits in its own tinted, outlined panel with space below it, so it's clearly separate from your slate.

## 2.38.0 (Nov 14, 2026)
- Menu, top to bottom: On TV, Teams, Box Office, All games, Slate (Slate is the left side when unfolded, so it isn't in the menu there).
- Unfolded, the right side opens on All games (it was Box Office); its back button returns to All games.
- Box Office: if it fell back to last night because today's scores hadn't loaded yet, it switches to today as soon as today's games have results.

## 2.37.2 (Nov 14, 2026)
- Menu (bottom right), top to bottom: All games, On TV, Teams, Box Office, Slate. Slate sits at the bottom, nearest your thumb.

## 2.37.1 (Nov 14, 2026)
- Live scores on the Lock Screen stay up after the final, showing the final score, until you swipe them away. iOS removes an ended one on its own after 4 hours at most (Apple's limit), so that's the longest it can stay.

## 2.37.0 (Nov 14, 2026)
- Notifications page reworked: Morning brief; Game alerts as one list with a My slate and a My teams tick for each (Game starting, Close finish, Overtime, Final score, Goals, Hourly score), nothing ticked = off; Upset watch; Live scores on the Lock Screen with the same two ticks (on whenever one is ticked); then When.
- Removed the "Big night" alert completely. Around kickoff ESPN lists each player's season totals, so a Dayton football game at 0-0 sent three alerts with different players.
- Worth a look's Big individual nights now wait until a game has a score and is past the first period/quarter, for the same reason.

## 2.36.3 (Nov 14, 2026)
- Every game on the slate keeps a line under it: once a game goes live, its pre-game line stays until the game's own first line arrives (it used to go blank in between). If a game never had one, the line shows the two records ("Syracuse (4-5) at NC State (4-5)").
- The live game's own line is red while the game is on; pre-game lines stay as they were.

## 2.36.2 (Nov 14, 2026)
- All games: filters with no games that day move to the end of the strip (after the conferences), still dimmed.

## 2.36.1 (Nov 14, 2026)
- All games: a league's filters are always all listed (dimmed when no game matches that day), so leagues with the same rules show the same strip: men's and women's college hoops both show Both ranked, Top-10 team, Any ranked team, National TV, then conferences.
- New NBA rule and filter: NBA Cup (group play, knockouts and the final). NBA now has National TV, Top 4 teams, Winning teams and NBA Cup, in Slate rules and on All games alike.

## 2.36.0 (Nov 14, 2026)
- All games: the filters under each league are now the same choices as that league's slate rules, worded the same way (e.g. College Football: Both ranked, Top-10 team, Any ranked team, National TV, then conferences; NFL: Prime time, Division games, Winning teams; Premier League: Big Six clash, Any Big Six club, Top of the table, National TV; International: USA, Heavyweight clash, Any big nation, Games that count). A choice only shows when some of the day's games match it.

## 2.35.1 (Nov 14, 2026)
- Box Office: the date picker can go to today even before any game has started (it used to bounce back to last night). Opening Box Office still starts on last night until today has results.

## 2.35.0 (Nov 14, 2026)
- The Athletic Newsletters now stay on the day they came out: each day's slate links the editions published that day (with the time), so you can go back a day or two and open one you missed. Opened ones stay grayed out on that phone for two weeks.
- The server keeps two weeks of editions for each newsletter (it kept only the last 3), including The Athletic FC from email.
- Weekends: the newsletters you follow don't publish then, so there's no section on Saturday or Sunday (Friday's are on Friday's slate).

## 2.34.2 (Nov 14, 2026)
- The Athletic Newsletters stay off the slate on Saturdays and Sundays unless a picked newsletter actually publishes that day. All of DJ's picks (The Pulse, The Bounce, Moneycall, Peak, The Athletic FC) are weekday-only, so his weekend slate has no newsletter section.

## 2.34.1 (Nov 14, 2026)
- Removed the Today pill next to the date at the top of the slate (it showed on any other day). The back arrow in the bottom corner still returns to today on another day's slate (put back after 2.34.0 hid it by mistake).

## 2.34.0 (Nov 14, 2026)
- Box Office always opens on a page with results: today once a game has a score, otherwise last night. Postponed and canceled games (which ESPN marks as "over") no longer count as played.
- Box Office no longer shows a decided game as "End of 4th": ESPN sometimes leaves college football games there for a while, and Slate now treats them as final (on the page and in the stored rankings).
- On TV: channels with a game on right now come first, then the rest, alphabetical within each.
- Team cards: today's game fits on one line ("Today 2:30p vs BC").
- Game trays: the venue, betting line and Claude button sit closer together.
- Tapping a started game waits for its box score instead of flashing the Claude button first.
- Full matchup: the quick read shows in full (no More link).
- The slate page no longer shows the Today button (the date picker gets you back to today).

## 2.33.2 (Nov 14, 2026): final review before the iPhone app
- Faster opens, far fewer network calls: reopening Slate went from 57 ESPN requests to 13 in the first 25 seconds.
  - Games that need the same day's scoreboard now share one request instead of each asking (32 duplicate requests on open, gone).
  - A finished game's one-line note is kept on the phone, so reopening doesn't refetch every final's game data.
- Safety: links that come from outside data (Claude's headlines, newsletter feeds) only open as web pages. Checked: no passcodes or keys in the public repo, every save goes through the server's passcode check and stays inside the account's own space, live-notification tokens are validated.
- Cleanup: removed 30 unused pieces of code (old ticker, old preview requests, old cards) and the server's leftover newsletter checker (the Worker does it now). The page is 18 KB smaller.
- Checked every page (Slate, All games, Teams, On TV, Box Office, Settings, a game's tray and Full matchup) folded and unfolded with no errors.

## 2.33.1 (Nov 14, 2026)
- Worth a look football lines no longer include the down and yard line (the play by play has it).
- Football play by play shows who has the ball on every line ("PRST 1st&10"), in true order, without repeats.
- Shorter plays so more fit on one line: "W.Burns pass to D.Spjut for 9 yds to PSU28, 1st down", "Alex Wilkins makes 24-ft 3-pt jumper, ast Otega Oweh", "FT 2/2 good".
- Full matchup: the live section is now "Plays and players" (play by play first, then top performers, then every player); a finished game's is "Recap and players".

## 2.33.0 (Nov 14, 2026)
- Live play by play: tap a live game and the last 5 plays come first (newest on top), the box score under them. Each play is one line; jersey numbers, formations and tacklers are trimmed. Football plays lead with the down ("3rd & 8"); other sports with the period and clock. Scoring plays are bold. Also on the Full matchup page. It uses the game data the box score already loads, so no extra requests.
- Fixed the spot in "who has the ball" during timeouts (ESPN counts the yard line from the home team's goal line).

## 2.32.0 (Nov 13, 2026)
- "Worth a look right now" is now just "Worth a look".
- Football lines add who has the ball and where: "A 6-point game late. PRST ball, 3rd & 4 at SUU 35" (worked out from the yard line during timeouts, when ESPN drops the text).
- Basketball close finishes add the game's top scorer: "A 2-point game late. S. Gilgeous-Alexander 37 pts".
- Finished games (the 10 minutes they stay) swap the old reason for the result at a glance: a game-winner when there was one ("Game-winner: Alex Wilkins makes 24-foot three point jumper"), otherwise the top scorers, top passer/rusher, or goal scorers.

## 2.31.0 (Nov 13, 2026)
- Time | League moved from the bottom bar to the top of the slate, on the left of the Updated / Live row, in the same quiet pill style as Reorder (on every phone, folded or not).
- In League view, Reorder now sits under the last league section.

## 2.30.3 (Nov 13, 2026)
- Worth a look reasons drop the clock and period (it's on the game row right below): "A 6-point game late", "A 4-point game in OT".

## 2.30.2 (Nov 13, 2026)
- Worth a look reasons say "An 8-point game" (and 11, 18) instead of "A 8-point game".

## 2.30.1 (Nov 13, 2026)
- A game that finishes while it's in Worth a look right now stays there for 10 minutes, tagged Final, then drops off. The "N live" count only counts games still going.

## 2.30.0 (Nov 13, 2026)
- Worth a look right now is a permanent section at the top of today's slate: always open (no more folding), and gone only when nothing qualifies.
- Games already on your slate show there too when they qualify (ticked), and stay on your slate as well. A game you add from there stays in the section, ticked.
- ✕ on any game (including one you added) takes it out of Worth a look for the rest of the day; it stays on your slate.
- Up to 5 games instead of 3, since slate games can be in the list now.

## 2.29.0 (Nov 13, 2026)
- Live notifications for the iPhone app: when a game on your slate (or your teams, if you pick it) goes live, its score appears on the Lock Screen and at the top of the screen, updates as it changes, and clears 15 minutes after the final. Up to 4 at a time; none start during quiet hours. Turned on or off per account in Settings > Notifications > Live notifications. Needs the 3.0 app build.
- Settings > Worth a look right now is now one collapsible row with a summary. "Show this section" is clearly the parent: the rules sit indented under it and dim when it's off. The rule text now states the actual rules, shorter.
- Team cards: today's game fits on one line ("Final L 78-85 vs GTWN").
- Even space above and below the Live button on the slate.

## 2.28.0 (Nov 13, 2026)
- More notifications, each switched on or off for your account in Settings > Notifications (every Slate account has its own):
  - Game starts: choose My slate and/or My teams, and when (at the start, 10 or 30 minutes before).
  - Close finishes: a one-score game late (last 5 minutes, 80th minute, 8th inning on), for your slate and/or your teams.
  - Overtime: when a game goes to overtime or extra time.
  - My team scores: every goal in your teams' hockey and soccer games (off to start).
  - Big individual nights: 40 points, 350 passing or 150 rushing or receiving yards, a hat trick (off to start).
  - Still there: the daily brief, hourly score for your teams, upset alerts, and finals for your slate and/or your teams.
- The notifications page is reorganized into Daily brief, Game starts, During games, Final scores, Live notifications and When. "How it works" now says what really happens: Slate checks every minute.
- The Live notifications switches are in place for the iPhone app.

## 2.27.0 (Nov 13, 2026)
- "Worth a look right now" is its own collapsible section at the top of today's slate, like the league sections. Each game keeps its league, label and one-line reason, with a ✕ to hide it. The game row has the + / ✓ from All games, and a game you add stays in the section, ticked, for the rest of the day, so one more tap takes it back off.
- New Settings > Worth a look right now: turn the section on or off, choose close finishes and big individual nights separately, and pick leagues you follow or any league.
- Teams page: each team card shows its sport icon, the same as on the slate. The next-game line is shorter ("Tmrw 7p @ CHI") so it no longer gets cut off.
- Soccer match summary: own goals are credited to the team that benefits. They had been counted for the own goal scorer's team.
- Less empty space under "Updated" and the Live button at the top of the slate.
- Claude summaries: every account except DJ's is limited to 10 a day. Also fixed a counting bug that could let an account go past its limit.

## 2.26.4 (Nov 13, 2026)
- All games: changing the day keeps the league you're looking at instead of jumping back to My teams, even on a day that league has no games (it says so and stays put).

## 2.26.3 (Nov 13, 2026)
- No more flash when Slate opens. It used to show the wrong accent color and a slate built from the default rules (a handful of early-season college tournament games) for a split second before your own settings arrived. Now it shows "Loading your slate…" for that moment, and the team-color accent keeps today's saved color instead of briefly falling back to green.

## 2.26.2 (Nov 13, 2026)
- The newsletter list under your slate is now titled "The Athletic Newsletters".

## 2.26.1 (Nov 13, 2026)
- Newsletters you've opened are grayed out under your slate, the same way a finished game is, so you can see what's left to read. Remembered on this phone for a week.

## 2.26.0 (Nov 13, 2026)
- The Athletic FC, which is only sent by email, can now appear under your slate. A small Google Apps Script in your Gmail sends Slate each morning's subject line and "View Online" link (nothing else from the email). It shows in Settings > The Athletic newsletters for you only, not your brother, since the link is tied to your email.

## 2.25.4 (Nov 13, 2026)
- Newsletters are only looked for on the days they come out. Each one's publishing days are learned from its last six weeks of editions: Money Call and Peak once a week, The Windup twice a week in the offseason (and daily once the season starts, by itself), and so on.
- On a newsletter's day, Slate looks from 3 a.m. Central every 30 minutes until the edition appears, then stops until its next day. Once a week every newsletter gets one full look, in case a schedule changes.
- The checking moved to Slate's own server, which runs every minute, from the GitHub job, which only runs every few hours in practice.

## 2.25.3 (Nov 13, 2026)
- Unfolded and held upright, the page fills the screen. It no longer sits in a narrow column with empty space on both sides, and the gap above the header is smaller.
- The menu button no longer parks in the middle of the screen after folding, unfolding or turning the phone. Right after the screen changes size it stays put while things settle and re-pins itself a few times. It only lifts when the keyboard is really up.

## 2.25.2 (Nov 13, 2026)
- Newsletters are checked smarter. From 4 a.m. Central, Slate looks every 30 minutes for each picked newsletter's edition of the day. Once today's is found it stops checking that one until tomorrow, and all checking ends at 8 p.m. (weekly ones just aren't out that day).

## 2.25.1 (Nov 13, 2026)
- Settings: The Athletic newsletters is now one row like the other settings. It shows what's picked (or None) and opens with a tap to choose.

## 2.25.0 (Nov 13, 2026)
- The Athletic's newsletters under your slate. Settings > Slate > The Athletic newsletters lets you pick any of eight: The Pulse, The Bounce (NBA), The Windup (MLB), Money Call, Peak, Prime Tire (F1), Full Time (women's soccer) and No Offseason (women's basketball). "None" turns them all off; none is picked to start.
- Today's slate shows a "From The Athletic" list with the latest edition of each pick from the last three days, newest first, marked Today, Yesterday or the weekday. Each one opens the edition on The Athletic's site.
- The editions come from The Athletic's public feeds, checked every 30 minutes by the GitHub job. Scoop City, Red Light, The Athletic FC and Until Saturday aren't posted there, so they can't be included.

## 2.24.1 (Nov 13, 2026)
- Suggestions: each card leads with the league (icon and name, like NHL) next to the reason's label. The Not now and Add to slate buttons are smaller and quieter: plain text for Not now, a soft button for Add.

## 2.24.0 (Nov 12, 2026)
- Suggestions reworked. Every suggestion shows its reason on top, with big "Not now" and "Add to slate" buttons (Add on the right).
- Coming up: big games your rules didn't pick, from the media side:
  - rivalries (a built-in list for the NBA, NHL, NFL, MLB, college and soccer)
  - top-of-standings clashes, with the real standing (3rd West vs 4th West)
  - two ranked college teams
  - finals, cups, bowls and other big events (small early-season tournaments count for much less)
  - knockout ties
  - two winning teams
  - two of the biggest clubs or nations
  - a national TV pick
- From how you use the app:
  - teams you keep adding or opening
  - games your starred players are in
  - leagues you follow (adds, opens, rules, your teams), which lift their big games
  - late games in leagues you usually drop, which sink
- Friendlies only get suggested for personal reasons. Being on League Pass (or any one channel) is never a reason any more.
- Live now: a new "Worth a look right now" block at the top of today's slate suggests:
  - a close finish late in a game (a one-score game in the last 5 minutes, the 4th quarter, the 3rd period, the last 15 minutes or the 7th inning on), in leagues you follow
  - a big individual night from the live box score: 35+ points in the NBA, 300 passing or 130 rushing or receiving yards, a hat trick watch in the NHL
  - a truly standout one of either in any league

## 2.23.3 (Nov 12, 2026)
- The Time / League switch on the slate: the blue highlight now fits inside the switch at every text size instead of spilling past it.

## 2.23.2 (Nov 12, 2026)
- Soccer match summary is more compact. Goal lines are plain bullets lined up with the rest, with a ⚽ in place of the bullet as the only marker (no highlight, bold or pill), and the score after the goal in plain gray. Less space between lines.

## 2.23.1 (Nov 12, 2026)
- Soccer match summary: removed the subs line. Bookings stay.

## 2.23.0 (Nov 12, 2026)
- Full matchup page: on finished games, Claude's summary now comes first, above the top performers and the box score. Live games show the top performers above the box score too.
- Soccer goals stand out in the match summary: a ⚽, a tinted card with the scorer's name in bold, and the score after the goal (home team first, like ENG 1–0 CRO).

## 2.22.1 (Nov 12, 2026)
- Full matchup page: the game's top four performers now sit above the box score on finished games, instead of below it.

## 2.22.0 (Nov 12, 2026)
- Soccer: the timeline is replaced by a written match summary in bullet points.
  - Each goal has its minute, the scorer, who set it up, and the score after it ("England lead 2–1").
  - It also covers penalties won, missed or saved, and red cards.
  - It marks half-time and full time with the score.
  - The full matchup adds one line each for bookings and subs per team.
  - The card on the slate keeps to goals, penalties and red cards.

## 2.21.1 (Nov 12, 2026)
- Live hockey games get a one-liner. Before, there was only a line for two-goal games or 30-save goalies. Now there are lines for:
  - who has scored for each team
  - 3-point nights and two-assist games
  - a goalie's shutout in progress (15+ saves)
  - a scoreless game's shots
  - lopsided shot totals
  - hot or cold power plays

## 2.21.0 (Nov 12, 2026)
- Slate: removed the jump to the live or next games. The slate opens at the top of the page again.
- Each time slot folds shut: tap its time (or the folded line) to fold or unfold it. A folded slot shows one line of its games, like DET–WSH, with a red dot on any that are live. Folds are remembered for that day on this phone.
- iPhone app prep: the app's version is set to 3.0 for its first build this weekend.

## 2.20.3 (Nov 12, 2026)
- Slate: the jump to the live or next games measures how far to scroll instead of trusting the page's reported positions. With larger text, iPhone Safari reports those on a different scale, which sent the page too far down.

## 2.20.2 (Nov 12, 2026)
- Slate: the jump to the live or next games now lands on the right game with larger text sizes on iPhone. The browser does the lining-up itself, since Safari measures the zoomed page differently and the old math overshot by one game. A reload also starts fresh instead of reopening where you'd left off, so it always aims at what's on.

## 2.20.1 (Nov 12, 2026)
- Slate: when the earliest live game is in the first time slot, coming back now shows the page from the top instead of cutting that game off. Coming back to the app also re-aims at the live or next games, even if you'd left the page scrolled somewhere else.
- Box Office and other pages always open at the top. The page checks again over the next half second, in case iPhone Safari kept the old scroll position.

## 2.20.0 (Nov 12, 2026)
- Box Office: every player shows five stats. The 4th and 5th are picked from what stood out that night.
  - Basketball: threes, steals, blocks or field goals.
  - Hockey: always goals, assists, shots and +/-, then hits, blocked shots, faceoffs or ice time.
  - Football: completions and passer rating for QBs, carries and yards per carry for runners, targets and longest catch for receivers, tackles for loss, QB hits and pass breakups for defenders.
  - Baseball: hits and walks allowed for pitchers, walks and steals for hitters.
- Coming back to today's slate scrolls to the live or next games, the same as a reload. This happens from the Slate button, Back, swiping back to today, or reopening the app after 5 minutes away.

## 2.19.2 (Nov 12, 2026)
- Box Office: no more empty space on the right. Each player row puts its game (clock or result, score, opponent) in a right-hand column instead of a third line, and the open screen shows two columns of these rows. Headshots no longer cover the first stat.
- The menu button and date pill stay pinned in one spot on the open screen while you scroll, like on the cover screen.

## 2.19.1 (Nov 12, 2026)
- Box scores look the same in every sport and in both places: the quick look under a game now uses the same player rows as the full box score (headshot, name, position, big numbers with small labels), with its key columns and top players. Football, hockey, baseball and soccer match basketball.
- Team stat rows use short labels ("Yards", "3rd down", "PP chances", "Faceoff %") so they fit.

## 2.19.0 (Nov 12, 2026)
- Today's slate opens at what's happening now: it scrolls to the first time slot with a live game, or the next start time if nothing's live. It happens once when you open Slate (and again after it's been away 20+ minutes), and never while you're scrolling.
- Box Office: two columns of players on the open screen again; Text size explains what Auto reads from your iPhone (2.18.4).

## 2.18.4 (Nov 12, 2026)
- Box Office: two columns of players again on the open screen (one column only on the narrow cover screen), so there's no big empty space on the right.
- Settings > Text size shows what Auto is reading from your iPhone ("Your iPhone is at 100% right now…").

## 2.18.3 (Nov 12, 2026)
- Text size settings made clearer: "iPhone" is now "Auto" (it matches your iPhone's own text size), Auto is offered for both Folded and Unfolded, and the note explains folded means the cover screen and unfolded the big screen. The second "Unfolded" heading is now "Open screen layout", with updated wording for the crease nudge.
- Help notes appear at the top center (2.18.2).

## 2.18.2 (Nov 12, 2026)
- Help notes ("Added to slate", "Alerts are on…" and the like) now pop up at the top center of the screen instead of the bottom, clear of the menu button and date pill.

## 2.18.1 (Nov 12, 2026)
- Back is back on every page that isn't your slate (and on another day's slate), still sitting beside the menu button.
- The header's ••• menu shows icons and matches the bottom menu's look (Reset, Slate rules, Share).
- Pulling past the top or bottom of a page no longer drags the menu button and date pill with it.

## 2.18.0 (Nov 12, 2026)
The UX review's changes, all in one version. The version before them is saved on the pre-ux-review branch, so it can be put back in one step.
- Colors (Midnight, cleaned up): easier-to-read gray text, a brighter live red, the menu a little more solid. Finished games go quiet with color instead of fading to 55%. Live highlights are red; the preview line under upcoming games is a plain line, not a box. Red now means live only: losses and underachievers are gray. The Live button reads dark on red. With Increase Contrast on in iPhone settings, a high-contrast Midnight turns on by itself.
- Bigger targets: the slate header has two 44-point buttons, Settings and More (Reset, Slate rules, Share). Day arrows, the Live button, menu items, Time/League, league tabs and channel links all reach 44 points at every text size.
- Larger text: at L and XL, records hide and the status and channel move to their own line so names stay whole. New "iPhone" text size follows the iPhone's own setting.
- Back shows only on pages you drill into (Matchup, Team, rules, notifications) and on another day's slate, and sits beside the menu button instead of above it.
- Teams: dark team colors (Raiders, Notre Dame) use their second color so the tile isn't blank. Tiles at least 190 points wide.
- All games and On TV: one date picker, the bottom pill.
- Settings: the passed-on themes are gone (Midnight only); selected options use the accent; section headings read as headings; the Add to Home Screen steps and the screen check line are hidden where they don't apply.
- "Updated 7:24 PM" beside the Live button, "Scores delayed" after a minute with no new scores.
- Long write-ups (quick read, Claude's take) open at four lines with More. Paid buttons say "Regenerate · Claude".
- Opening the app no longer flashes "No games match your rules" before the slate loads, and a phone without a passcode doesn't try to save.
- Wording: preview times say which day; the share sheet says "Tonight's slate"; load errors point to Reset.
- Watch sheet: YouTube TV is the main button, the network's app is outlined, Cancel is plain text.
- One system for corners (4 / 8 / 16 / round), text sizes (11, 13, 15, 16, 22, 28), weights (500, 700, 800) and spacing (4, 8, 12, 16, 24).
- Cover screen held sideways: a one-line header that scrolls away.

## 2.17.0 (Nov 12, 2026)
- iPhone app (and the preview): the page now runs all the way under the right-side strip, like Sleeper. The strip's buttons float on the page's own background with no separate panel, and the page keeps its content clear of them.
- Full box score: no more empty gap between a player's headshot and name on wide screens (2.16.5).

## 2.16.5 (Nov 12, 2026)
- Full box score: player rows no longer leave a big empty gap between the headshot and the name on wide screens. Stats sit right next to the player.

## 2.16.4 (Nov 12, 2026)
- Teams: removed the double line under the league tabs in Find a team.
- Team tiles: the next-game line always fits on one line ("Nov 22 10:30a @ Liverpool"). Long opponent names use their abbreviation, and the channel stays on the game itself.

## 2.16.3 (Nov 12, 2026)
- App strip: the tapped button lights up right away (preview and the iPhone app), instead of waiting for the page to report back.

## 2.16.2 (Nov 12, 2026)
- iPhone app strip: Settings is out (it stays in the header), and All games moves to the bottom spot, closest to your thumb. Order top to bottom: Slate, Box Office, Teams, On TV, All games. The preview page matches.

## 2.16.1 (Nov 12, 2026)
- Fixed the app preview link opening the regular Slate page: the offline cache was answering every page address with the app. Now only Slate itself is cached, and other pages (like the preview) load normally.

## 2.16.0 (Nov 12, 2026)
- Groundwork for the Slate iPhone app (in the repo under ios/). The app is a native shell around this same page, so every web update shows up in the app too.
- The page now knows when it's inside the app: on iPhone Duo the app's own control strip (Slate, All games, Box Office, Teams, On TV, Settings) replaces the floating menu button, and alerts can come through Apple's push service.
- New preview page, app-preview.html, shows the page next to a stand-in for the app's strip, so the layout can be tried in Safari before the app is built.

## 2.15.2 (Nov 12, 2026)
- Game reminders now arrive right at the start time ("Starting now: …") instead of up to an hour early. Custom games on the slate work the same way. If a game of one of your teams starts, you get the one alert, not a reminder and a live score in the same minute.

## 2.15.1 (Nov 12, 2026)
- Box Office on past nights only shows (and swipes through) leagues that actually played that night. Leagues with no games are gone from the tabs, and it never sits on one.

## 2.15.0 (Nov 12, 2026)
- Box Office never opens on an empty page. Today's league tabs only show leagues with a game underway or finished (soccer stays on the morning finishes). If nothing has started yet today, Box Office opens on yesterday instead, on a league that actually played.

## 2.14.1 (Nov 12, 2026)
- Removed the estimated xG and the xG one-liners. Slate only shows expected goals when ESPN actually provides them (it currently doesn't for team totals), so the stat won't appear for now.

## 2.14.0 (Nov 12, 2026)
- Expected goals (xG) for soccer, second in the team stats row next to possession, live and after the final. ESPN's free feeds don't publish team xG, so Slate estimates it from ESPN's shot-by-shot commentary (where each shot came from, header or foot, penalties, free kicks, fast breaks and through balls). If ESPN ever sends real xG, that's used instead.
- New soccer one-liners from xG: "Brighton have created 2.5 xG to 0.6", and "Fulham won despite an xG of 0.4 to 1.9".

## 2.13.4 (Nov 12, 2026)
- Unfolded: the Time / League switch no longer jumps around. It stays on the left in both modes; Reorder appears just to its right when sorting by league.
- Soccer timeline: nothing is cut off anymore. Long names wrap, and the extra detail (assist, who won and conceded a penalty, who a sub came on for) sits on its own smaller line under the player.

## 2.13.2 (Nov 12, 2026)
- Fixed the preview line and the odds chips disagreeing (line said Giants by 1.5, chips said -2.5). The chips were holding the line from earlier in the day; they now update from the same fetch as the preview line, and an open upcoming game refreshes its odds and injuries every 20 minutes.

## 2.13.1 (Nov 12, 2026)
- All games: a league section with games on right now shows a red live dot and count ("Live", "3 live") next to its name, even when the section is collapsed.

## 2.13.0 (Nov 12, 2026)
- Upcoming games on the slate get a one-line preview too, on any day (today, tomorrow, further out). It's built free from ESPN's pre-game data: win and losing streaks, team leaders who are out or questionable, close or lopsided betting lines, ESPN's predictor (a coin flip or a near-lock), unbeaten home or road records, ranked showdowns, top-of-table and relegation clashes, one-sided head-to-heads, and ESPN's own preview headline when nothing stands out. Two facts about the same team read as one sentence ("Canucks have lost five in a row and are 1-8 at home").
- Games added to the slate later get their line as soon as they appear. Lines refresh every 30 minutes and are kept on the phone so they show right away next time.

## 2.12.0 (Nov 12, 2026)
- Smarter soccer one-liners. They now tell the story of the match instead of just the latest goal: every scorer for a team ("Kane (2), Saka and Foden have scored for England"), comebacks ("came from two goals down to win, through …"), late winners and equalizers, a team running the game (possession plus shots), winning without the ball, no shots on target, goal-fests, still goalless, red cards with the minute, and keepers keeping a clean sheet.
- Penalties: a penalty that's just been given jumps to the top of the line ("Penalty to Belgium — Doku was brought down"), and missed or saved penalties get their own line.
- The soccer timeline now shows penalties too: who won it and who gave it away, plus missed and saved penalties.

## 2.11.4 (Nov 12, 2026)
- Soccer games now get the one-line live summary under them on the slate: goals (with the assist, headers, penalties), braces and hat tricks, two quick goals, red cards, possession, shot gaps and busy keepers. After the final whistle the line switches to past tense.

## 2.11.3 (Nov 12, 2026)
- Notifications read "from Slate" on top with the alert underneath (two lines). The morning brief starts with "Today's games".

## 2.11.2 (Nov 12, 2026)
- Soccer: the full matchup section is called "Lineups and timeline" ("Lineups, timeline and recap" after the final) instead of Box score.
- Goal ⚽ and assist (A) badges are back on the lineup pitch, plus the assister in the timeline ("· assist Doku").
- The team stats row (possession, shots, corners…) shows again above the pitch during and after a match.

## 2.11.1 (Nov 12, 2026)
- Soccer: shirt numbers are readable on light team colours (dark numbers on white kits).
- Removed the player stat table during and after matches (the pitch and timeline show it).
- Before kickoff, the quick look shows each team's season stats (top 6 players and the No. 1 keeper) after the preview; the full matchup has every player. Lineups move to the top once announced.
- Timeline names use full surnames (De Bruyne, not Bruyne).

## 2.11.0 (Nov 12, 2026)
- Soccer gets its own match view, in the quick look and the full matchup:
  - Lineups on a small pitch: formation, the starting XI by position with shirt numbers in team colours, goal and card markers, who came off and when, and the bench (with when subs came on). Shows before kickoff once lineups are announced (about an hour out).
  - Match timeline: goals (with penalties and own goals), cards and substitutions with the minute; newest first while live. The quick look shows goals and cards, the full matchup adds subs.
  - Team stats row with possession, shots, corners, fouls and saves; player stats underneath.
- International matches (Nations League, friendlies, qualifiers) now get box scores too.
- Quick looks opened from All games now refresh as the box score comes in.

## 2.10.2 (Nov 12, 2026)
- Fixed Claude summaries showing raw <cite index=…> tags (left over from its web searches). They're stripped before saving, and today's Belgium–Türkiye preview was cleaned up.

## 2.10.1 (Nov 12, 2026)
- Alerts show times in each person's own time zone (taken from their phone), so Drew sees Eastern times. Quiet hours, the brief time and alert days follow it too.

## 2.10.0 (Nov 12, 2026)
- Box Office: tap a top performer to open his game right beneath him, with the same quick look you get on the slate (score, box score, Claude's recap or preview, and Full matchup). Tap again to close.

## 2.9.2 (Nov 12, 2026)
- Notifications are two lines: the alert itself (like "11:00 AM: Belgium @ Türkiye on FS1") with iPhone's "from Slate" under it, instead of a separate "Starting soon"/"Final" heading on top. The morning brief keeps its "Today's games" heading since it has several lines.

## 2.9.1 (Nov 12, 2026)
- Two-column Box Office cards fit cleanly: smaller photo without the team badge on it, name and team on one line (long names trim), the top three stats on one line, and the result underneath.

## 2.9.0 (Nov 12, 2026)
- Box Office shows the top 20 players every time (no more Show top 25 button).
- Players sit in two columns when your text size leaves room (best first, reading left to right, row by row); bigger text sizes go back to one column. Same for over and underachievers.

## 2.8.2 (Nov 12, 2026)
- League view: Reorder sits level with the Live button (left side), and My teams moved up right under them.

## 2.8.1 (Nov 12, 2026)
- On the ALL tab, league sections now follow the same order as your All games tabs.

## 2.8.0 (Nov 12, 2026)
- All games opens on your teams (★), with ALL as the second tab.
- New filters under ALL: All, Best of each league (up to 3 standout games per league: your teams, ranked matchups, national TV, top teams, winning teams) and National TV.

## 2.7.5 (Nov 12, 2026)
- All games: slimmer header so the games get more room: smaller league tabs, filters and day picker, and less space around the search button.

## 2.7.4 (Nov 12, 2026)
- Quick box score under a game is more compact so the score and the players fit on screen together: slimmer win-chance bar (no caption), shorter team tabs, tighter team stats row, and no venue line once a game has started.

## 2.7.3 (Nov 12, 2026)
- All games: the Live button no longer tucks under the date bar.
- The note at the bottom now says live scores update every 10 seconds (it still said 30, plus a confusing "last refresh" time).

## 2.7.2 (Nov 12, 2026)
- The main page reads "Today's Slate" until 5 PM, then "Tonight's Slate", every day.

## 2.7.1 (Nov 12, 2026)
- Reorder sits on the left, directly above the first section title, in League view only.

## 2.7.0 (Nov 12, 2026)
- The sort switch is back to just Time | League.
- In League view, a small Reorder button sits right above the first section; it lists only the sections on that day's slate.
- My teams is now a section you can move like any league (it starts at the top until you change it).

## 2.6.9 (Nov 12, 2026)
- The ⇅ league-order button now always shows in the Time | League switch, so the buttons never shift. Tapping it from Time view switches to League and opens the order.

## 2.6.8 (Nov 12, 2026)
- League order moved off the top of the slate: in League view, a small ⇅ button sits beside League in the bottom switch. Tap it to reorder leagues, then Done.

## 2.6.7 (Nov 12, 2026)
- The back-to-today arrow points toward today: right on a past day's slate, left on a future one.

## 2.6.6 (Nov 12, 2026)
- Slate's corner buttons are smaller and centered in the header, so they fit inside it.

## 2.6.5 (Nov 12, 2026)
- Menu button stays pinned to the bottom right on iOS 26: iOS 26 sometimes slides the visible screen while you scroll, which dragged the button along; it now follows the visible screen itself.

## 2.6.4 (Nov 12, 2026)
- Removed the scrolling ticker from the top of the slate.

## 2.6.3 (Nov 12, 2026)
- Slate's top buttons are back in the corner (no extra space), each now its own outlined tile so they read as four separate buttons.

## 2.6.2 (Nov 12, 2026)
- The four buttons at the top of the slate are now bigger, labeled buttons in their own row: Reset, Settings, Rules and Share.
- Menu button watchdog: if the menu button ever drifts from the bottom while scrolling, the app snaps it back and records what the screen reported, so the cause can be tracked down.

## 2.6.1 (Nov 12, 2026)
- Swiping the slate to another day shows the back arrow; tap it to jump back to today.
- The Time | League switch moved to the bottom, left of the menu button (where the date picker sits on other pages). Unfolded, it stays at the top of the slate.

## 2.6.0 (Nov 12, 2026)
- Slate can be sorted by League as well as Time (Time stays the default). League view puts My teams first, then each league, with game times inside each.
- Each section in the League view collapses with a tap, and remembers it.
- "Order" sets the league order for that view (with a reset back to the usual order).

## 2.5.2 (Nov 12, 2026)
- Games with no US channel listed now show no channel instead of "Local TV" (it was a guess, and usually wrong for international games). Same in the matchup view and the copied slate.

## 2.5.1 (Nov 12, 2026)
- Team colors: the explanation now pops up briefly when you pick it, instead of a line that always sits under the swatches.

## 2.5.0 (Nov 12, 2026)
- New accent option, Team colors (Drew's idea): the app's accent switches each day to the colors of your first team, in your Teams page order, that plays that day. If none play, it uses the theme's color. It's the last swatch under Settings > Look.
- A phone that isn't signed in now asks for the passcode as soon as you change something, instead of showing "Couldn't save settings" and quietly showing DJ's slate.

## 2.4.4 (Nov 12, 2026)
- Fix for a phone that forgets whose profile it is (settings wouldn't save): it now checks with the server and reopens on the right profile.
- Failed saves are recorded on the server so problems on a phone can be traced.

## 2.4.3 (Nov 12, 2026)
- Finished games get a proper closing line: past tense, the winner's story first, and nothing that only fits a live game (no "triple-double watch", runs or pace).

## 2.4.2 (Nov 12, 2026)
- Fixed Claude summaries failing with a "Bad control character" error (line breaks inside Claude's answer are now handled).
- When a summary doesn't finish, the message is now in plain words instead of a technical error.

## 2.4.1 (Nov 11, 2026)
- Notifications settings: removed "from Slate" from the description.

## 2.4.0 (Nov 11, 2026)
- Alerts are close to instant: Slate's server checks live scores every minute and sends finals, reminders, live scores and upset alerts within about a minute.

## 2.3.3 (Nov 11, 2026)
- Faster live updates while the app is open: slate scores and the open game's box score every 10 seconds (was 30); other live games every minute (was 2).
- Date picker: the month and the day are the same size.

## 2.3.2 (Nov 11, 2026)
- The refresh button at the top now resets the app: it reloads the newest version with fresh data, which fixes anything stuck.
- Removed the Refresh link at the bottom of the slate (scores and games update on their own).

## 2.3.1 (Nov 11, 2026)
- Folding the phone no longer leaves the menu scrolling with the page: the app resets its zoom and size right after a fold.

## 2.3.0 (Nov 11, 2026)
- Release history is viewable in the app: Settings > What's new.

## 2.2.3 (Nov 11, 2026)
- Player headshots no longer show initials behind the photo. Initials appear only when a player has no photo.

## 2.2.2 (Nov 11, 2026)
- Box Office: the league tabs stay in place when you swipe between leagues. Long names like Premier League and Champions League no longer jump out of view.

## 2.2.1 (Nov 11, 2026)
- Quick box score (matchup dropdown on the slate): the picked team's stats show as a sideways-scrolling row under the team tabs, like the full box score.
- Teams: more columns on a wide upright screen, and two columns on the right side when unfolded sideways.
- Box Office: two columns of players on a wide upright screen.

## 2.2.0 (Nov 11, 2026)
- Box Office can be built for any past night and any league with a free "Build this night's Box Office" button (ready within about 10 minutes).
- New Box Office leagues: NHL, women's college basketball (WCBB) and Champions League, plus MLB and WNBA during their seasons.

## 2.1.1 (Nov 11, 2026)
- Quick box score: team stats moved above the players.
- Box Office: two-column layout when unfolded and held upright.

## 2.1.0 (Nov 11, 2026)
- Phone alerts come from Slate itself as push notifications, at no cost: reminders, finals, live scores, upset watch and the daily brief, with the same settings as before.
- New "This phone" switch in Settings > Notifications to turn alerts on for each phone (works for your brother's phone too).
- The hourly Claude alerts run is retired.

## 2.0.0 (Nov 11, 2026): efficiency release
- Claude only writes when you tap a button. Nothing that costs money runs on its own.
- Live highlights under games are written by the app's own rules (free) instead of Claude.
- Box Office: top performers and wild finishes are built free each morning; Claude's over and underachievers are written only when you tap.
- Fewer web searches per Claude summary (preview 2, team 2, recap 1, Box Office 2), which lowers the cost of each summary.
- The day slates (every game, today plus three days) are built by a free script instead of a daily Claude run, and "Build slate" requests go through the same free job.
- The version number now shows in Settings.
