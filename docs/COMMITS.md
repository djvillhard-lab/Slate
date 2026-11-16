# The commit feed

DJ and Drew follow each other's changes at https://github.com/djvillhard-lab/Slate/commits/main.
The rule for every commit is in CLAUDE.md under "Commit messages". This note says why.

- Before 2026-11-16, every commit was authored by "Claude <noreply@anthropic.com>", so the feed said
  "claude committed" for everything and nobody could tell whose request it was. The first lines were
  developer wording ("3.52.9: folded Duo filter rows stop before the clock").
- Now the commit author is the person who asked, using their GitHub noreply address
  (`<id>+<login>@users.noreply.github.com`). GitHub shows their account and picture on the commit,
  with Claude as co-author. No token or real email is needed or stored.
- The first line reads `<Name>: <Page>: <what changed>` in plain words. The version and technical
  detail go in the lines below it, which GitHub hides behind the "..." button in the feed.
- Older commits keep their old look; history isn't rewritten.
- For Drew: his Claude uses Drew's own GitHub login and id from its session, e.g.
  `Drew <id+login@users.noreply.github.com>`.
