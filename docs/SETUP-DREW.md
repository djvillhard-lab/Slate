# Working on Slate: setup for Drew

Slate is DJ's sports app. You'll change it by asking your own Claude in plain words. Your Claude and DJ's
Claude can't see each other, so they coordinate through this repo: a sign-in sheet of who's working on
what, and a change feed where every change says who asked and what changed.

## One-time setup (about 15 minutes)
1. **Claude Pro.** Sign up at https://claude.ai and pick the Pro plan.
2. **GitHub.** Make a free account at https://github.com/signup, then send DJ your username.
3. **Accept the invite.** DJ adds you to the Slate repo. GitHub emails you an invite (also at
   https://github.com/djvillhard-lab/Slate/invitations). Accept it.
4. **Open Claude Code.** Go to https://claude.ai/code (or use the Claude desktop app's Code tab).
   Connect GitHub when it asks, and pick the repo `djvillhard-lab/Slate`.
5. **Your test passcode.** DJ sends you your own Slate passcode privately (text, not the repo: the repo
   is public). Use it to sign in to the app. For screenshots, Claude needs it as `SLATE_PASS`: in Claude Code
   on the web, open the environment settings (the gear beside the environment name) and add the
   environment variable `SLATE_PASS=<your passcode>`. Never paste it into a file or commit.

## Every time you work
1. Start the session with **"I'm Drew."** and then what you want, e.g. "I'm Drew. On the News page,
   show the newest story first." Your Claude reads CLAUDE.md first; it holds all the rules.
2. **It checks the sign-in sheet** (`docs/WORKING-ON.md`). If DJ's Claude is already on that page, yours
   stops and tells you. Pick another page or wait. If it's free, yours adds "Drew: News page" to the sheet
   and saves it straight away so DJ's side sees it.
3. **It builds, tests, and ships.** It takes screenshots at DJ's phone sizes with `scripts/shots.py`,
   then puts the change live (the site updates about a minute later) and takes your line off the sheet.
4. **Check it** at https://slate.djvillhard.workers.dev (or in the iPhone app).

One page per session, and one request per change, keeps things simple for both sides.

## Following each other's work
- The change feed: https://github.com/djvillhard-lab/Slate/commits/main. Your changes start with
  "Drew:" and show your GitHub account; DJ's start with "DJ:".
- Who's working on what right now: https://github.com/djvillhard-lab/Slate/blob/main/docs/WORKING-ON.md

## When you hit Pro's usage limit
Pro has a usage limit that resets every few hours; Claude tells you when it's reached and when it resets.
- Before stopping, ask Claude to either ship what's done or **take your line off the sign-in sheet**, so
  DJ's side isn't blocked. If you can't, it's fine: a line older than 24 hours gets cleared.
- When it resets, open the same session and say "keep going".
- To use less: one page per session, short specific requests, and start a fresh session for a new task
  instead of continuing a long one.

## Things to know
- Never put a passcode, password or real email in the repo. It's public.
- Ask DJ before big changes to shared parts every page uses (the top bar and menu, the iPhone app wrapper,
  the main style file). Your Claude knows which files those are.
- Claude summaries cost money, so other profiles (yours included) get 10 a day.
