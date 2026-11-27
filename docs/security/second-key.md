# Slate's second key: DJ's steps

From the code review, Nov 27, 2026. About five minutes, once. Nothing in the app changes.

## Why
One key (the database's secret key, `SUPABASE_SECRET`) does two jobs today: it opens the database, and it is the seed
for everything else the server keeps safe (Drew's and Dad's passcodes and phones, invites, the scrambling of feedback
and email addresses, browser notifications). Because of the second job it can never be replaced: a new key would log
Drew and Dad out and make saved feedback unreadable. A second key, `SLATE_KEY`, takes over that second job. After
that, the database key can be replaced any time, for example if it ever leaked.

## Part 1: add the second key
1. Supabase: open the Slate project, then **Project Settings > API keys**. Under **Secret keys**, reveal the secret
   key (it starts with `sb_secret_`; on older projects it is the one labelled `service_role`) and copy it.
2. Cloudflare: **Workers & Pages > slate > Settings > Variables and Secrets > Add**.
   Type: **Secret**. Name: `SLATE_KEY`. Value: paste the key from step 1. **Deploy**.
3. Tell Claude it is done. Claude opens `https://slate.djvillhard.workers.dev/api/keycheck` and reads the answer.

It is safe to get this wrong. The server compares what you pasted with a fingerprint of the right value. If they do
not match (a typo, a missing letter, the wrong key), the server ignores `SLATE_KEY` and carries on exactly as before,
and the check in step 3 says so. Nobody is logged out either way.

## Part 2: replace the database key (only if you ever want or need to)
Do this only after step 3 says "added and right".
1. Supabase > API keys: create a new secret key. Copy it.
2. Cloudflare > slate > Variables and Secrets: edit `SUPABASE_SECRET`, paste the new key, Deploy.
3. GitHub > the Slate repository > Settings > Secrets and variables > Actions: edit `SUPABASE_SECRET`, paste the new key.
   (The score jobs use it.)
4. Check the app shows scores and that Settings opens, then delete the old secret key in Supabase.

Leave `SLATE_KEY` alone forever. It keeps the old value on purpose; once the old key is deleted in Supabase it no
longer opens anything, it is only a seed.

## For Claude
`worker/key.js` holds `KEY_PRINT`, `keyGuard`, `slateKey`. `POST` or `GET /api/keycheck` answers
`{second: "not added yet" | "added and right" | "added but it is not the right value, so it is being ignored", print}`.
`print` is the first 8 bytes of SHA-256("slate-keyprint|" + the key in use).
