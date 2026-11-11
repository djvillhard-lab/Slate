# Slate

**Your night of sports, already planned.**

Slate builds tonight's watch list for you. It picks the games you care about from your own rules, tells you where to watch each one, and has a short read ready on every matchup before tip-off. When the games start, it follows them live. When they end, it tells you what happened.

It's a Home Screen app for iPhone (open https://slate.djvillhard.workers.dev in Safari, then Share → Add to Home Screen), made for one person's taste in sports: St. Louis teams, Manchester United, the Celtics, Dayton and Clemson hoops, and whatever big games are on that night.

---

## Features

### Tonight's slate, built for you
- **Rules you set once.** Your teams' games are always on it, plus whatever else you choose: both-ranked college games, national TV, prime time, top-of-the-table soccer, division games, winning teams, big events and rivalries.
- **Your edits stick.** Add a game, remove a game or add your own event, and the slate keeps it.
- **Where to watch.** Every game shows its channels, with a tap straight to the app that streams it.
- **Start times that follow the real clock.** A delayed or moved game shows its new time, with "Was 8:30" underneath.

### Previews that read like a friend who follows everything
- **The quick read.** A few sentences on why the game matters, as a paragraph or as bullet points (your choice in Settings).
- **The deep dive.** A longer read for the big screen: form, key matchups, storylines and what's at stake.
- **Players to watch, injuries, recent form and the season series**, all in one place.
- **Always current.** Previews are rewritten when something actually changes: the line moves, someone gets hurt, the start time shifts or a new story breaks. Otherwise they're left alone.
- **Any game on request.** Not on your slate? Tap "Get preview" and it arrives at the next :55. Changed your mind? Cancel it.

### Live
- **Live scores every 30 seconds** while your games are on, with a ticker across the top that shows only live games when any are live.
- **Box scores and team stats** styled for a phone: swipe a player row sideways to see every stat.
- **Live win chance and the betting line** at the top of every matchup.
- **A "Live" button** that hides everything except the games being played right now.

### After the final
- **An instant box-score recap** the moment a game ends: the final score and each team's top performer.
- **A written recap** at the next :55: how it was decided, who starred and what it means.

### All games
- **Every game of the day**, with your teams first and All at the end.
- **Filters inside every league:** ranked teams (or both ranked) and conferences in college; national TV, top teams and winning teams for the pros.
- **Swipe sideways** to move between filters, and **fold away** any league you don't need.
- **Arrange the filters** in any order you like in Settings.

### Team pages
- **Every team has one:** schedule with results and what's next, season player stats and the latest news.
- **Claude's take** on each of your teams, written every morning and again after every game.
- **Any other team on request**, with a tap.

### Player rankings
- **The night's best performances** in every league, ranked, with headshots and the numbers that mattered.
- **Any date, any league**, including a live list while tonight's games are still going.

### Alerts
- **Reminders** before your games, **finals** for your teams, **upset watch** in college and **a morning brief** of what's on tonight.
- **Quiet hours and spoiler-free mode**, so a score never reaches you before you want it.

### Made for the phone in your hand
- **Opens instantly,** even with no signal, from the copy saved on your phone, then catches up.
- **One-handed:** the menu and Back sit in the bottom-right corner, and you can swipe to go back.
- **Tap a game for the quick menu, press and hold for the full matchup.**
- **Built for the iPhone Duo:** folded it's one page; opened up, your slate is on the left and the matchup on the right.
- **Themes, accent colors and text sizes**, set separately for folded and unfolded.

---

## How it works

Slate has four parts. Each one does a single job.

```
            ESPN (scores, odds, stats, schedules, news)
                 │                         │
                 ▼                         ▼
   ┌───────────────────────────┐   ┌──────────────────────────┐
   │  GitHub script, every 10  │   │  The app on your phone   │
   │  minutes (free)           │   │  (live scores, box       │
   │  scores, odds, standings, │   │  scores, team pages)     │
   │  rankings, to-do list     │   └────────────┬─────────────┘
   └────────────┬──────────────┘                │ reads and saves
                │ writes                        │
                ▼                               ▼
          ┌───────────────────────────────────────────┐
          │  Supabase: one table of documents         │
          │  slates, scores, previews, teams, work,   │
          │  settings, requests                       │
          └───────────────────────────────────────────┘
                ▲ reads the to-do list, writes the words
                │
   ┌────────────┴──────────────────────────────────────┐
   │  Claude scheduled tasks                            │
   │  4:39 AM  load the next four days of games         │
   │  :55      write previews, recaps, team summaries   │
   │  hourly   send alerts to the phone                 │
   └────────────────────────────────────────────────────┘
```

### 1. The app (this repo, hosted on Cloudflare)
`index.html` is the whole app: one self-contained page you add to the Home Screen. It reads everything from Supabase and gets live updates as documents change. It talks to ESPN directly for the things that change by the second: live scores, box scores, win chances and team pages. `sw.js` keeps a copy of the app on the phone so it opens instantly and offline. `version.json` lets an open app notice a new version and reload onto it.

### 2. Supabase (the data)
A single `docs` table holds JSON documents, one per path:

| Path | What it holds | Written by |
|---|---|---|
| `slates/<date>` (+ `-ncaam`, `-ncaaw`, `-ncaaf`) | Every game of the day, with teams, times, records, ranks and TV | Morning task |
| `scores/<date>` | Live and final scores, moved start times | GitHub script |
| `previews/<date>` | Previews, recaps, odds, standings, polls, league news | Script (numbers) + Claude (words) |
| `work/<date>` | Your slate, and the to-do list of what Claude should write and why | GitHub script |
| `teams/<league>-<abbr>` | Claude's take on a team | Claude |
| `standouts/<date>` | Player rankings | GitHub script |
| `mine/...`, `prefs/...` | Your settings, slate edits, alerts and requests | The app |
| `code/...` | Copies of the scripts, so tasks can run them | Kept in sync from this repo |

Anyone with the app's public key can read. Only the app (with your passcode) can save your settings, and only the scripts and tasks (with the secret key) can write everything else.

### 3. The GitHub script (`scripts/tick.py`, every 10 minutes, free)
All the number work, no AI: it reads your settings, works out your slate with the same rules as the app, and then:
- updates scores and moved start times for every game of the day
- keeps the betting line current on each preview
- refreshes standings, polls and league news every three hours
- freezes a written recap 50 minutes after it was written
- ranks the night's player performances
- writes `work/<date>`, the to-do list: which previews are new, which need rewriting (and why), which games need a recap and which team summaries are due, with all the ESPN facts needed to write them

It runs from `.github/workflows/tick.yml` and needs one repository secret, `SUPABASE_SECRET`.

### 4. Claude scheduled tasks (the words)
- **Morning slate (4:39 AM):** loads every game for today and the next three days.
- **Previews (5:55 AM, then every hour at :55):** reads the to-do list and writes only what's on it, in order: your slate games first, then games you asked for, then recaps, then team summaries. With nothing on the list, the run ends in seconds. If the GitHub script ever stops, the task runs it once itself.
- **Alerts (hourly):** reads your slate and scores, and pushes reminders, finals, upset watch and the morning brief to your phone.

### Updating the app
`index.html` is built from the app's source plus a small layer (`supabase.js` and a shim) that connects it to Supabase. After a change, the new `index.html` and `version.json` are pushed here. Cloudflare picks up each push and publishes it to https://slate.djvillhard.workers.dev within about a minute, and open apps reload onto the new version by themselves. Settings → **Update now** forces it if a phone is holding an old copy. (GitHub Pages was the old host; it stopped publishing reliably, so it is no longer used.)

> GitHub pauses scheduled scripts after 60 days with no changes to the repo. Any push restarts the clock.
