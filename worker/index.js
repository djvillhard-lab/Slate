// Slate worker: serves the app, and writes Claude summaries on demand.
// POST /api/summary {pass, kind: "preview"|"recap"|"team", date, id | key, game, facts}
//   → checks the passcode, marks the item "writing", starts a background workflow, answers at once.
// The workflow asks Claude (with web search) for the summary and saves it to Supabase; the app sees it appear.
// Secrets (Cloudflare → Workers → slate → Settings → Variables and Secrets): ANTHROPIC_API_KEY, SUPABASE_SECRET.
import { WorkflowEntrypoint } from "cloudflare:workers";
import { runAlerts, followNow, sendPush, sendApns, bcRequest, bcChannel, bcLoad, bcSave, bcTest } from "./alerts.js";
import { runNewsletters, rss } from "./newsletters.js";
import { runMorningEmail, morningApi, confirmEmail } from "./morning-email.js";
import { feedbackRoute } from "./feedback.js";
import { factCheck, teamFacts } from "./factcheck.js";
import { usageRoute } from "./usage.js";
import { photosRoute } from "./photos.js";
import { googleRoutes } from "./google.js";
import { wireRoute } from "./wire.js";

const SB = "https://xpkzcdaawaqiqgwkkwst.supabase.co";
const PUB = "sb_publishable_G7sLoJ7ihWxKivYsmkxRJw_CgomPngZ";
const MODEL = "claude-sonnet-5-5";
// web searches allowed per summary: each one adds a cent plus thousands of input tokens
const SEARCHES = { preview: 2, team: 2, recap: 1, moments: 2, news: 4, deep: 2 };

const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json", "cache-control": "no-store", "x-content-type-options": "nosniff" } });

async function rpc(env, fn, body, key) {
  const k = key || env.SUPABASE_SECRET;
  const r = await fetch(`${SB}/rest/v1/rpc/${fn}`, { method: "POST", headers: { apikey: k, Authorization: "Bearer " + k, "content-type": "application/json" }, body: JSON.stringify(body) });
  const t = await r.text(); return { ok: r.ok, status: r.status, text: t };
}
// deep-merge a patch into a document (service key)
const mergeDoc = (env, path, data) => rpc(env, "mirror_doc", { p_path: path, p_data: data, p_merge: true });
const putDoc = (env, path, data) => rpc(env, "mirror_doc", { p_path: path, p_data: data, p_merge: false });

async function getDoc(env, path) {
  const r = await fetch(`${SB}/rest/v1/docs?select=data&path=eq.${encodeURIComponent(path)}`, { headers: { apikey: env.SUPABASE_SECRET, Authorization: "Bearer " + env.SUPABASE_SECRET } });
  const rows = r.ok ? await r.json() : []; return rows[0] ? rows[0].data : null;
}
async function sha(s) { const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)); return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join(""); }
import { signupRoutes, passKey } from "./signup.js";  // invite-only sign-up; kept down here, next to the one place that uses passKey
// who a passcode belongs to: DJ (the Supabase passcode) or someone listed (by passcode hash) in users/registry
async function whoIsRaw(env, pass) {
  pass = String(pass || ""); if (pass.length < 8) return null;
  const chk = await rpc(env, "save_doc", { p_path: "prefs/passcheck", p_data: { at: new Date().toISOString(), via: "worker" }, p_pass: pass, p_merge: false }, PUB);
  // admin: may invite and remove people and use the other admin-only actions. The owner's passcode always is one;
  // anyone else only if their users/registry entry says admin: true (nobody does today, and nothing in the app sets it).
  if (chk.ok && !/not allowed|error/i.test(chk.text)) return { id: "dj", name: "DJ", cap: 0, admin: true };
  const reg = (await getDoc(env, "users/registry")) || {}, u = (reg.users || {})[await sha(pass)] || (reg.users || {})[await passKey(env, pass)];  // the second: a passcode chosen at sign-up (signup.js)
  // a phone signed in with Google (worker/google.js, 3.95.0) has its own device key, kept in users/devices; it acts as that profile
  if (!u && pass.startsWith("g1-")) {
    const dv = ((await getDoc(env, "users/devices")) || {}).keys || {}, d = dv[await passKey(env, pass)];
    const p = d && d.id && d.id !== "dj" ? Object.values(reg.users || {}).find((x) => x && x.id === d.id) : null;
    if (p) return { id: p.id, name: p.name || p.id, cap: Math.min(Number(p.cap) || 10, 10), admin: p.admin === true };
  }
  // everyone but DJ gets at most 10 Claude summaries a day (a lower cap in the registry still applies)
  return u && u.id ? { id: u.id, name: u.name || u.id, cap: Math.min(Number(u.cap) || 10, 10), admin: u.admin === true } : null;
}
// ---- login limits and the passcode check's short memory (security review, 3.82.0) ----
// A wrong passcode is counted per network address (Cloudflare's cache, per data center, 15 minutes). After 20 wrong
// tries every /api call from that address waits 15 minutes, so passcodes can't be guessed by trying them one by one.
// A right passcode is remembered for 5 minutes (keyed by an HMAC of it, never the passcode), so the app's regular calls
// don't each re-check it in Supabase.
const FAIL_MAX = 20, FAIL_SECS = 900, WHO_SECS = 300;
const failReq = (ip) => new Request("https://slate.cache/login-fail/" + encodeURIComponent(ip));
async function failCount(ip) {
  if (!ip || typeof caches === "undefined") return 0;
  try { const r = await caches.default.match(failReq(ip)); return r ? Number(await r.text()) || 0 : 0; } catch (e) { return 0; }
}
async function noteFail(ip) {
  if (!ip || typeof caches === "undefined") return;
  try { const n = (await failCount(ip)) + 1; await caches.default.put(failReq(ip), new Response(String(n), { headers: { "cache-control": "max-age=" + FAIL_SECS } })); } catch (e) {}
  console.log("wrong passcode", ip.replace(/[.:][^.:]*$/, ".x"));  // the address without its last part
}
async function whoIsCached(env, pass) {
  pass = String(pass || ""); if (pass.length < 8) return null;
  let key = null;
  if (typeof caches !== "undefined" && env.SUPABASE_SECRET) {
    key = new Request("https://slate.cache/who/" + (await passKey(env, "who|" + pass)).slice(3));
    try { const hit = await caches.default.match(key); if (hit) return await hit.json(); } catch (e) {}
  }
  const me = await whoIsRaw(env, pass);
  if (me && key) { try { await caches.default.put(key, new Response(JSON.stringify(me), { headers: { "content-type": "application/json", "cache-control": "max-age=" + WHO_SECS } })); } catch (e) {} }
  return me;
}
// the passcode check every route uses: remembers right ones, counts wrong ones for this address
const guardWho = (ip) => async (env, pass) => {
  const me = await whoIsCached(env, pass);
  if (!me && String(pass || "")) await noteFail(ip);
  return me;
};
const ctDay = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
// running cost log: stats/usage {days: {D: {n, in, out, search, usd, by: {user: n}}}}
const PRICE = { in: 2 / 1e6, out: 10 / 1e6, search: 10 / 1000 };
const HAIKU = { in: 1 / 1e6, out: 5 / 1e6 };   // the old Haiku helper lines (none run today)
const HAIKU55 = { in: 0.1 / 1e6, out: 0.5 / 1e6 };  // Claude Haiku 5.5: recaps since 3.85.0
async function logUsage(env, user, u, model, failed) {
  const d = ctDay(), doc = (await getDoc(env, "stats/usage")) || { days: {} }, day = (doc.days || {})[d] || { n: 0, in: 0, out: 0, search: 0, usd: 0, by: {} };
  const inT = (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0), outT = u.output_tokens || 0, sr = ((u.server_tool_use || {}).web_search_requests) || 0;
  day.n += 1; day.in += inT; day.out += outT; day.search += sr;
  const pr = model === "haiku" ? HAIKU : model === "haiku55" ? HAIKU55 : PRICE;
  day.usd = Math.round((day.usd + inT * pr.in + outT * pr.out + sr * PRICE.search) * 10000) / 10000;
  day.by = day.by || {};
  // Haiku lines (free-tier helpers) don't count toward anyone's daily summary limit
  // a request that failed (an answer that ran too long) is still paid for, so its cost is logged, but it doesn't use up one of the person's 10
  if (model === "haiku") { day.hl = (day.hl || 0) + 1; day.n -= 1; } else if (failed) day.fail = (day.fail || 0) + 1; else day.by[user] = (Number(day.by[user]) || 0) + 1;
  await mergeDoc(env, "stats/usage", { days: { [d]: day } });
}

// the daily Claude budget ran out: note it once, and tell the admin's phones
async function budgetAlert(env, capUsd) {
  const d = ctDay(), cur = (((await getDoc(env, "stats/usage")) || {}).days || {})[d] || {};
  if (cur.capNote) return;
  await mergeDoc(env, "stats/usage", { days: { [d]: { capNote: new Date().toISOString() } } });
  const doc = (await getDoc(env, "prefs/push")) || {};
  for (const sub of doc.subs || []) await (sub.apns ? sendApns : sendPush)(env, sub, { title: " ", body: "Today's Claude budget ($" + capUsd + ") is used up. Summaries for others are paused until tomorrow.", tag: "budget" }).catch(() => {});
}
// Claude cost cuts (3.85.0, security and cost review). How long one write-up is handed to everyone who asks, in
// minutes: a second tap within this time gets the same write-up instead of a new (paid) one. News and tap-in
// breakdowns keep 3 minutes (the News page's own rules).
const RECAP_V = 2;  // the recap instructions' version (2: standout performances lead, 3.100.6)
const SHARE_MIN = { preview: 360, team: 720, recap: 720, moments: 360 };
// How each kind is written: the newer web search (it filters results before Claude reads them, so far fewer input
// tokens), and less thinking for short write-ups. Recaps are written by Claude Haiku 5.5 (a twentieth of the price)
// from ESPN's facts plus one search; if Haiku can't, Sonnet writes it as before. News and tap-ins are unchanged.
const LEAN = { preview: { effort: "low" }, team: { effort: "low" }, moments: { effort: "medium" }, recap: { effort: "low", model: "claude-haiku-5-5" } };
const MOMENT_LGS = { nfl: "NFL", nba: "NBA", ncaam: "men's college basketball", ncaaf: "college football (FBS)", epl: "Premier League", nhl: "NHL", ncaaw: "women's college basketball", ucl: "Champions League", mlb: "MLB", wnba: "WNBA" };
// News briefs: My slate and My teams are personal (under the person's own space); league briefs are shared
// The News page (3.45.0): one personal page a day ("page"), written only when its Generate button is tapped.
// Tap-in breakdowns ("deep": g-<game id>, t-<league>-<team>, l-<league>) are written on first tap and shared by everyone.
const DEEP_KEY = /^(g|t|l)-[a-z0-9-]{2,70}$/;
const NEWS_KEY = /^(page|slate|teams|nfl|ncaaf|nba|mlb|nhl|ncaam|ncaaw|wnba|mls|epl|ucl|uel|facup|laliga|seriea|bundesliga|ligue1|intl)$/;
function target(p) {
  if (p.kind === "deep") return { path: "newsdeep/" + p.date + "-" + p.key, patch: (x) => x };
  if (p.kind === "news" && p.key === "page") return { path: (p.user && p.user !== "dj" ? "u/" + p.user + "/" : "") + "mine/news-" + p.date, patch: (x) => x };
  if (p.kind === "news") {
    const mine = p.key === "slate" || p.key === "teams", path = mine ? (p.user && p.user !== "dj" ? "u/" + p.user + "/" : "") + "mine/newsbrief-" + p.date + "-" + p.key : "newsbrief/" + p.date + "-" + p.key;
    return { path, patch: (x) => x };
  }
  if (p.kind === "moments") return { path: "moments/" + p.date, patch: (x) => ({ date: p.date, leagues: { [p.key]: x } }) };
  if (p.kind === "team") return { path: "teams/" + p.key, patch: (x) => x };
  return { path: "previews/" + p.date, patch: (x) => ({ games: { [p.id]: x } }) };
}

// the Anthropic key may be saved as ANTHROPIC_API_KEY or as dj-api-key
const apiKey = (env) => env.ANTHROPIC_API_KEY || env["dj-api-key"] || env.DJ_API_KEY || "";

async function startTick(env) {
  const r = await fetch("https://api.github.com/repos/djvillhard-lab/Slate/actions/workflows/tick.yml/dispatches", {
    method: "POST", body: JSON.stringify({ ref: "main" }),
    headers: { authorization: "Bearer " + env.GH_TOKEN, accept: "application/vnd.github+json", "user-agent": "slate-worker", "x-github-api-version": "2022-11-28", "content-type": "application/json" },
  });
  if (r.status !== 204) console.log("tick dispatch", r.status, (await r.text()).slice(0, 200));
}

export default {
  // every minute: phone alerts from live ESPN scores
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runAlerts(env).catch((e) => console.log("alerts error", String(e))));
    ctx.waitUntil(runNewsletters(env, getDoc, putDoc).catch((e) => console.log("newsletters error", String(e))));
    ctx.waitUntil(runMorningEmail(env).catch((e) => console.log("morning email error", String(e))));  // the morning email (worker/morning-email.js)
    // the number job (scripts/tick.py on GitHub) every 10 minutes, started from here: GitHub's own schedule only
    // ran it every few hours at night. Needs a GitHub token (Actions: read and write on this repo) saved in Cloudflare as GH_TOKEN.
    if (env.GH_TOKEN && new Date(event.scheduledTime || Date.now()).getUTCMinutes() % 10 === 3) ctx.waitUntil(startTick(env).catch((e) => console.log("tick error", String(e))));
  },
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    // the link in a morning-email confirmation (worker/morning-email.js, 3.86.0): no passcode, a one-time token
    if (url.pathname === "/api/morning-email/confirm") return confirmEmail(env, req, url);
    // every passcode check below goes through the login limit (see guardWho)
    const ip = req.headers.get("cf-connecting-ip") || "", whoIs = guardWho(ip);
    if (url.pathname.startsWith("/api/") && req.method === "POST" && (await failCount(ip)) >= FAIL_MAX)
      return json({ error: "Too many wrong passcodes from this network. Try again in 15 minutes." }, 429);
    // News: ESPN's injury report and trades and signings, trimmed for the phone (worker/wire.js, 3.114.0)
    if (url.pathname === "/api/wire") return wireRoute(req, url, { json });
    // Soccer player pictures for the lineup pitch, from TheSportsDB (worker/photos.js, 3.124.0)
    if (url.pathname === "/api/photos" || url.pathname === "/api/photos/img") return photosRoute(req, url, ctx, { json });
    // Settings → Send feedback, and the daily report that reads it (worker/feedback.js)
    if (url.pathname.startsWith("/api/feedback")) return feedbackRoute(req, env, url, { rpc, whoIs, json });
    // how much each person uses Slate, for DJ's Project status page (worker/usage.js)
    if (url.pathname === "/api/usage" || url.pathname === "/api/usage/all" || url.pathname === "/api/usage/marks" || url.pathname === "/api/usage/reset" || url.pathname === "/api/usage/app-build") return usageRoute(req, env, url, { whoIs, getDoc, putDoc, json });
    // The Athletic FC is email-only: a small Google Apps Script in DJ's Gmail sends each morning's subject line and
    // "View Online" link here. Only DJ's passcode is accepted, and only the link and subject are stored.
    if (url.pathname === "/api/newsletter" && req.method === "POST") {
      let p; try { p = await req.json(); } catch { return json({ error: "bad request" }, 400); }
      const me = await whoIs(env, p && p.pass);
      if (!me || !me.admin) return json({ error: "Wrong passcode" }, 403);
      if (!p || p.key !== "fc" || !/^https:\/\/(links\.e1\.nytimes\.com|www\.nytimes\.com)\//.test(String(p.url || ""))) return json({ error: "bad newsletter" }, 400);
      const at = String(p.at || new Date().toISOString()).slice(0, 30), title = String(p.title || "The Athletic FC").slice(0, 200);
      const doc = (await getDoc(env, "news/email-dj")) || {}, items = { ...(doc.items || {}) };
      const list = (items.fc || []).filter((x) => x.url !== p.url);
      items.fc = [{ title, url: String(p.url).slice(0, 600), at }, ...list].slice(0, 14);  // two weeks, for earlier days' slates
      await putDoc(env, "news/email-dj", { updatedAt: new Date().toISOString(), items });
      return json({ ok: true });
    }
    // the iPhone app reports its live-notification tokens here (it may be in the background, so it posts directly)
    if (url.pathname === "/api/live-token" && req.method === "POST") {
      let p; try { p = await req.json(); } catch { return json({ error: "bad request" }, 400); }
      const me = await whoIs(env, p && p.pass);
      if (!me) return json({ error: "Wrong passcode" }, 403);
      // started by the app on the game's broadcast channel (3.28.0): no token to keep, just that it's running there
      if (p.kind === "activity-ch") {
        if (!/^[a-z0-9-]{3,60}$/.test(String(p.gameId || ""))) return json({ error: "bad game" }, 400);
        const lp = (me.id === "dj" ? "" : "u/" + me.id + "/") + "prefs/liveacts", ld = (await getDoc(env, lp)) || {};
        ld.acts = ld.acts || {}; ld.acts[p.gameId] = { ch: 1, env: p.env === "sandbox" ? "sandbox" : "production", at: new Date().toISOString() };
        ld.updatedAt = new Date().toISOString(); ld.start = ld.start || [];
        await putDoc(env, lp, ld);
        return json({ ok: true });
      }
      // swiped away on the phone (3.27.0): that game's Live notification switch goes off (the scoreboard's too), so the
      // slate's button matches what's showing, and the server doesn't put it back
      if (p.kind === "gone" || p.kind === "board-gone") {
        const np = (me.id === "dj" ? "" : "u/" + me.id + "/") + "prefs/notify", nd = (await getDoc(env, np)) || {};
        const lv = nd.liveAct = nd.liveAct && typeof nd.liveAct === "object" ? nd.liveAct : {};
        if (p.kind === "gone") { if (!/^[a-z0-9-]{3,60}$/.test(String(p.gameId || ""))) return json({ error: "bad game" }, 400); lv.games = lv.games && typeof lv.games === "object" ? lv.games : {}; lv.games[p.gameId] = 0; }
        else if (lv.board && typeof lv.board === "object") lv.board.on = false;
        nd.updatedAt = new Date().toISOString();
        await putDoc(env, np, nd);
        return json({ ok: true });
      }
      const tok = String(p.token || ""), kind = p.kind, ev = p.env === "sandbox" ? "sandbox" : "production";
      // kinds: "start" and "activity" (one game's live notification), "start-board" and "board" (the four-game scoreboard, 3.23.0)
      if (!/^[0-9a-f]{32,400}$/i.test(tok) || !["start", "activity", "start-board", "board"].includes(kind) || (kind === "activity" && !/^[a-z0-9-]{3,60}$/.test(String(p.gameId || "")))) return json({ error: "bad token" }, 400);
      const path = (me.id === "dj" ? "" : "u/" + me.id + "/") + "prefs/liveacts", now = Date.now(), at = new Date().toISOString();
      const doc = (await getDoc(env, path)) || {}, acts = {};
      for (const [k, v] of Object.entries(doc.acts || {})) if (v && now - Date.parse(v.at) < 20 * 3600000) acts[k] = v;  // a day's games only
      let start = (doc.start || []).filter((x) => x.token !== tok), startBoard = (doc.startBoard || []).filter((x) => x.token !== tok);
      let board = doc.board && now - Date.parse(doc.board.at) < 20 * 3600000 ? doc.board : null;
      if (kind === "start") start = [{ token: tok, env: ev, at }, ...start].slice(0, 3);
      else if (kind === "start-board") startBoard = [{ token: tok, env: ev, at }, ...startBoard].slice(0, 3);
      else if (kind === "board") board = { token: tok, env: ev, at };
      else acts[p.gameId] = { token: tok, env: ev, at };
      const out = { start, acts, startBoard, updatedAt: at }; if (board) out.board = board;
      await putDoc(env, path, out);
      return json({ ok: true });
    }
    if (url.pathname === "/api/summary" && req.method === "POST") {
      let p; try { p = await req.json(); } catch { return json({ error: "bad request" }, 400); }
      if (!p || !["preview", "recap", "team", "moments", "news", "deep"].includes(p.kind)) return json({ error: "bad kind" }, 400);
      if (p.kind === "deep" ? !(DEEP_KEY.test(p.key || "") && /^\d{4}-\d{2}-\d{2}$/.test(p.date || "")) : p.kind === "news" ? !(NEWS_KEY.test(p.key || "") && /^\d{4}-\d{2}-\d{2}$/.test(p.date || "")) : p.kind === "moments" ? !(MOMENT_LGS[p.key] && /^\d{4}-\d{2}-\d{2}$/.test(p.date || "")) : p.kind === "team" ? !/^[a-z0-9-]{2,40}$/.test(p.key || "") : !(/^\d{4}-\d{2}-\d{2}$/.test(p.date || "") && /^[a-z0-9-]{3,60}$/.test(p.id || ""))) return json({ error: "bad target" }, 400);
      if (!apiKey(env) || !env.SUPABASE_SECRET) return json({ error: "Summaries aren't set up yet (missing keys in Cloudflare)." }, 503);
      const me = (env.SUPABASE_SECRET && p.pass === env.SUPABASE_SECRET) ? { id: "dj", cap: 0, admin: true } : await whoIs(env, p.pass);
      if (!me) return json({ error: "Wrong passcode" }, 403);
      if (me.cap || !me.admin) {
        const day = (((await getDoc(env, "stats/usage")) || {}).days || {})[ctDay()] || {};
        if (me.cap && ((day.by || {})[me.id] || 0) >= me.cap) return json({ error: "That's today's limit of " + me.cap + " Claude summaries. More tomorrow." }, 429);
        // Slate's daily Claude budget for everyone together (CLAUDE_DAY_USD in Cloudflare, $15 if unset); the admin isn't held to it
        const capUsd = Number(env.CLAUDE_DAY_USD) || 15;
        if (!me.admin && (Number(day.usd) || 0) >= capUsd) {
          if (!day.capNote) ctx.waitUntil(budgetAlert(env, capUsd).catch((e) => console.log("budget alert", String(e))));
          return json({ error: "Slate has used today's Claude budget. Summaries are back tomorrow." }, 429);
        }
      }
      if (p.kind === "moments" && !p.facts) {  // the app only says which night; the free tick job saved the facts
        const fd = await getDoc(env, "mfacts/" + p.date + "-" + p.key);
        if (!fd || !fd.facts) return json({ error: "This night's stats aren't ready yet. Try again in a few minutes." }, 404);
        p.facts = fd.facts;
      }
      p.user = me.id;
      const t = target(p), at = new Date().toISOString();
      // one write-up for everyone: previews, recaps, team pages and Box Office are shared by every account, so if
      // anyone's already having Claude write this one (or just did, in the last 3 minutes), that's the one everyone
      // gets: no second Claude call, no second charge
      const curDoc = (await getDoc(env, t.path)) || {};
      const entry = p.kind === "moments" ? (curDoc.leagues || {})[p.key] : (p.kind === "team" || p.kind === "news" || p.kind === "deep") ? curDoc : (curDoc.games || {})[p.id];
      const w = entry && entry.writing, nowMs = Date.now();
      if (w && w.at && !w.error && nowMs - Date.parse(w.at) < 10 * 60000) return json({ ok: true, at: w.at, shared: true }, 202);
      const last = entry && (p.kind === "recap" ? (entry.recap || {}).at : p.kind === "preview" ? entry.newsAt : entry.at);
      // (a person's own News page is the exception: Regenerate with different picks must write a new page)
      // 3.100.6: a recap written before the current recap instructions can be rewritten once (Regenerate), instead of waiting 12 hours
      const oldRecap = p.kind === "recap" && entry && entry.recap && entry.recap.v !== RECAP_V;
      if (last && !oldRecap && !(p.kind === "news" && p.key === "page") && nowMs - Date.parse(last) < (SHARE_MIN[p.kind] || 3) * 60000) return json({ ok: true, at: last, shared: true, done: true }, 202);
      await mergeDoc(env, t.path, t.patch({ writing: { at, kind: p.kind } }));
      // a big News pick: thin the headlines until the facts fit, so Claude gets whole JSON instead of a cut-off end (3.113.12)
      let size = null;
      if (p.kind === "news" && p.key === "page" && p.facts && typeof p.facts === "object") {
        const f = p.facts, hl = f.headlines || {};
        size = { g: (f.games || []).length, t: (f.teams || []).length, l: (f.leagues || []).length };
        const thin = (o, n) => { for (const k of Object.keys(o || {})) if (Array.isArray(o[k])) o[k] = o[k].slice(0, n); };
        for (const [part, n] of [["byLeague", 5], ["around", 3], ["byLeague", 3], ["byTeam", 1], ["byGame", 2], ["around", 1], ["byLeague", 1]]) {
          if (JSON.stringify(f).length <= 60000) break; thin(hl[part], n);
        }
      }
      const params = { user: me.id, kind: p.kind, date: p.date || null, id: p.id || null, key: p.key || null, at, size,
        game: JSON.stringify(p.game || {}).slice(0, 6000), facts: JSON.stringify(p.facts || {}).slice(0, p.kind === "moments" ? 60000 : p.kind === "news" && p.key === "page" ? 60000 : p.kind === "deep" ? 24000 : 16000) };
      try { await env.SUMMARY.create({ params }); }
      catch (e) { await mergeDoc(env, t.path, t.patch({ writing: { at, kind: p.kind, error: "Couldn't start: " + String(e).slice(0, 120) } })); return json({ error: "Couldn't start" }, 500); }
      return json({ ok: true, at }, 202);
    }
    // The Athletic's public RSS feed for one section (News page); cached 15 minutes at the edge
    if (url.pathname === "/api/athletic") {
      const slug = String(url.searchParams.get("slug") || "");
      if (!/^[a-z0-9-]{2,40}$/.test(slug)) return json({ error: "bad slug" }, 400);
      const cache = caches.default, key = new Request("https://slate.cache/athletic/" + slug);
      const hit = await cache.match(key); if (hit) return hit;
      const items = (await rss(slug)).slice(0, 30).map((x) => ({ title: x.title, url: x.url, at: x.at ? new Date(x.at).toISOString() : "", desc: x.desc }));
      const res = new Response(JSON.stringify({ items }), { headers: { "content-type": "application/json", "cache-control": "public, max-age=900" } });
      ctx.waitUntil(cache.put(key, res.clone()));
      return res;
    }
    // live highlights are written by the app's own rules now (free); Claude no longer words them
    if (url.pathname === "/api/highlight") return json({ error: "off" }, 410);
    // a test notification to this person's phones (Settings experiments): {pass, title, body}
    if (url.pathname === "/api/testpush" && req.method === "POST") {
      let p; try { p = await req.json(); } catch { return json({ error: "bad request" }, 400); }
      const me = await whoIs(env, p && p.pass); if (!me) return json({ error: "Wrong passcode" }, 403);
      const doc = (await getDoc(env, (me.id === "dj" ? "" : "u/" + me.id + "/") + "prefs/push")) || {};
      const out = [];
      for (const sub of doc.subs || []) out.push(await (sub.apns ? sendApns : sendPush)(env, sub, { title: typeof p.title === "string" ? p.title.slice(0, 80) : "", body: String(p.body || "Test from Slate").slice(0, 200), tag: "test" }).catch((e) => String(e)));
      return json({ ok: true, sent: out });
    }
    // the game's broadcast channel, for a live notification the app starts itself (3.28.0); made on first ask
    if (url.pathname === "/api/live-channel" && req.method === "POST") {
      let p; try { p = await req.json(); } catch { return json({ error: "bad request" }, 400); }
      const me = await whoIs(env, p && p.pass); if (!me) return json({ error: "Wrong passcode" }, 403);
      if (!/^[a-z0-9-]{3,60}$/.test(String(p.gameId || ""))) return json({ error: "bad game" }, 400);
      const doc = await bcLoad(env), ch = await bcChannel(env, doc, String(p.gameId), p.env === "sandbox" ? "sandbox" : "production");
      if (doc.dirty) await bcSave(env, doc);
      return json(ch ? { channel: ch } : { channel: "" });
    }
    // a quick check that the server can reach Apple's broadcast channel host (DJ only)
    if (url.pathname === "/api/bc-probe" && req.method === "POST") {
      let p; try { p = await req.json(); } catch { return json({ error: "bad request" }, 400); }
      const me = await whoIs(env, p && p.pass); if (!me || !me.admin) return json({ error: "no" }, 403);
      if (p.channel && p.state) return json({ send: await bcTest(env, String(p.channel), p.state) });
      return json({ prod: await bcRequest(env, "production", "GET", "/all-channels"), sandbox: await bcRequest(env, "sandbox", "GET", "/all-channels") });
    }
    // the slate or teams just changed on the phone: follow those games now, not at the next 10-minute tick
    if (url.pathname === "/api/follow" && req.method === "POST") {
      let p; try { p = await req.json(); } catch { return json({ error: "bad request" }, 400); }
      const me = await whoIs(env, p && p.pass); if (!me) return json({ error: "Wrong passcode" }, 403);
      if (!env.SUPABASE_SECRET) return json({ error: "not set up" }, 503);
      return json(await followNow(env, me.id === "dj" ? "" : "u/" + me.id + "/", p));
    }
    // the morning email's settings, test send and preview (worker/morning-email.js)
    if (url.pathname === "/api/morning-email" && req.method === "POST") {
      let p; try { p = await req.json(); } catch { return json({ error: "bad request" }, 400); }
      const me = await whoIs(env, p && p.pass); if (!me) return json({ error: "Wrong passcode" }, 403);
      if (!env.SUPABASE_SECRET) return json({ error: "not set up" }, 503);
      try { const out = await morningApi(env, me, p); return json(out, out.error ? 400 : 200); } catch (e) { return json({ error: String(e && e.message || e).slice(0, 200) }, 500); }
    }
    // a person's own documents (settings, alerts, their News page...): read here, with their passcode, instead of with the
    // app's public key, so nobody can read anyone else's (security review, 3.82.0). {pass, paths: [...]} → {rows: [{path, data, updated_at}]}
    if (url.pathname === "/api/docs" && req.method === "POST") {
      let p; try { p = await req.json(); } catch { return json({ error: "bad request" }, 400); }
      const me = await whoIs(env, p && p.pass); if (!me) return json({ error: "Wrong passcode" }, 403);
      const own = (x) => (me.id === "dj" ? /^(mine|prefs)\//.test(x) : x.startsWith("u/" + me.id + "/"));
      const paths = [...new Set((Array.isArray(p.paths) ? p.paths : []).map(String))].slice(0, 60)
        .filter((x) => x.length <= 200 && /^[A-Za-z0-9._\/-]+$/.test(x) && (own(x) || (me.admin && /^(news\/email-dj|stats\/usage)$/.test(x))));
      if (!paths.length) return json({ ok: true, rows: [] });
      const r = await fetch(`${SB}/rest/v1/docs?select=path,data,updated_at&path=in.(${paths.map((x) => encodeURIComponent('"' + x + '"')).join(",")})`, { headers: { apikey: env.SUPABASE_SECRET, Authorization: "Bearer " + env.SUPABASE_SECRET } });
      if (!r.ok) return json({ error: "Couldn't read " + r.status }, 502);
      return json({ ok: true, rows: await r.json() });
    }
    if (url.pathname === "/api/whoami" && req.method === "POST") {
      let p; try { p = await req.json(); } catch { return json({ error: "bad request" }, 400); }
      const me = await whoIs(env, p && p.pass);
      return me ? json({ id: me.id, name: me.name, admin: !!me.admin }) : json({ error: "Wrong passcode" }, 403);
    }
    // saves for everyone but DJ: only inside their own u/<id>/ space
    if (url.pathname === "/api/save" && req.method === "POST") {
      let p; try { p = await req.json(); } catch { return json({ error: "bad request" }, 400); }
      const me = await whoIs(env, p && p.pass);
      const path = String(p.path || "");
      // failed saves are noted (last 20) so a problem on someone's phone can be traced
      const fail = async (why, code) => { try { const d = (await getDoc(env, "stats/savefail")) || {}; const l = (d.list || []).slice(-19); l.push({ at: new Date().toISOString(), who: me ? me.id : "?", path: path.slice(0, 80), why, ua: String(req.headers.get("user-agent") || "").slice(0, 80) }); await rpc(env, "mirror_doc", { p_path: "stats/savefail", p_data: { list: l }, p_merge: false }); } catch (e) {} return json({ error: why }, code); };
      if (!me || me.id === "dj") return fail("Wrong passcode", 403);
      if (!path.startsWith("u/" + me.id + "/") || path.length > 200 || JSON.stringify(p.data || {}).length > 400000) return fail("Not allowed", 403);
      const r = await rpc(env, "mirror_doc", { p_path: path, p_data: p.data || {}, p_merge: !!p.merge });
      return r.ok ? json({ ok: true }) : fail("Couldn't save " + r.status, 502);
    }
    // Sign in with Google, tied to an existing profile (worker/google.js)
    if (url.pathname.startsWith("/api/google/")) return googleRoutes(req, env, url, { json, whoIs, getDoc, putDoc, passKey });
    // invite-only sign-up (signup.js)
    if (url.pathname === "/api/invite" || url.pathname === "/api/invite-check" || url.pathname === "/api/signup") return signupRoutes(req, env, url, { json, whoIs, getDoc, putDoc });
    return env.ASSETS.fetch(req);
  }
};

// 3.113.2 (DJ: "lots of errors in the claude summaries"): today's date as US fans have it. The worker runs on UTC, so after
// 7 PM Eastern "today" was already tomorrow, and Claude dated night games a day late
const etToday = () => new Date().toLocaleDateString("en-US", { timeZone: "America/New_York", weekday: "long", year: "numeric", month: "long", day: "numeric" });
const RULES = `Rules for all writing: plain text only, no citation tags or markup; every fact must come from the facts you were given or your web searches; never guess rosters or injuries; no betting talk at all (no spreads, totals, moneylines, odds or sportsbooks; the app shows the lines separately); no quote longer than five words; write in your own words, plain and specific, for a knowledgeable fan, as a news report: never in the first person (no I, me, my, we, our) and never about your own searching or sources (no "I found", "the last table I saw", "my search"); state the fact and, if it may be out of date, say as of when. Before you answer, reread every headline and line against its facts: each must say exactly who or what is affected (a player, a coach, a team, a league) and never widen it (a player out for the season is not his team's season ending; one loss is not a team eliminated; a report is not a confirmation); fix any that overstate. Then check every win, loss, streak and "last game" against each team's record and dated results: a team's latest game is the first one in its newestFirst list; a game from last season is never "recent" or "last time out"; the number of losses you mention this season can never be more than the record shows (a 4-0 team has not lost; a 3-1 team has lost once); when a web result disagrees with the record you were given, trust the record and leave that result out. Dates: every date you write is the US Eastern date; use the "day" given for this game and the dates in the facts as they are, and never work a date out from a UTC start time. Seasons: a game from before this season began (last season's tournament, bowl game, playoffs or March results) is last season, never a recent result, a "first loss" or a "last game"; web pages often describe last season, so check every result you take from a search against this season's dated results in the facts and leave out any that isn't there. Head-to-head lists in the facts cover only recent meetings: say "the last N meetings", never all-time. Player lines are numbers only (26.5 PPG, 7.1 AST, 3 goals), never a role, a position or a description.`;

function prompt(p) {
  const game = p.game, facts = p.facts;
  // 3.113.12: with many leagues picked (DJ follows 15) the page ran past Claude's length limit and was lost, so a big pick
  // gets shorter league sections; a few leagues keep the full ones
  const nL = Number((p.size || {}).l) || 0, lgHits = nL > 8 ? "2" : nL > 4 ? "2-3" : "3-5";
  const lgStory = nL > 8 ? "one or two sentences, 20-35 words: the state of the league right now" : "two or three sentences, 35-60 words: the state of the league right now";
  if (p.kind === "news" && p.key === "page") return `You're writing the News page of a sports fan's app: a quick-look dashboard of everything this person would want to know today. Today is ${etToday()} (US Eastern).
Facts (JSON): "cover" (what they asked this page to cover), "games" (the games on their slate today: id, league, teams, records, start time in UTC, status (not started, live now or finished), TV, note (the round or event), playoff (true for a playoff or postseason game: write about it as one, never about regular-season standings as still at stake)), "teams" (their favorite teams), "leagues" (leagues they picked), "headlines" (free ESPN and The Athletic headlines with url: byGame by slate game id, byTeam by team name, byLeague by league key, and around: the newest headlines from the major leagues, whether or not this person follows them) and "prev" (the top stories from the last time this page was written today, if any): ${facts}
Do up to four web searches for what the headlines don't tell you: breaking news from the last day or two about these teams (injuries, trades, coaching, lineup changes), the biggest sports stories anywhere today, and the story behind the biggest games. Compile everything first, then decide what this person most needs to know.
${RULES}
Answer with only this JSON inside <json></json> tags:
{"top": [{"title": "a headline in your own words, 4-9 words, exactly true: say who it happened to (an injury ends a player's season, not his team's)", "why": "one or two sentences, 15-35 words: what happened and why it matters to this person today", "tag": "one or two words: Injury, Trade, Result, Streak, Milestone, Coaching, Tonight, Record or similar", "team": "the one team the story is mainly about, its full name (such as Detroit Lions); for a league-wide story, the team most involved; empty only when no single team is", "lg": "the story's league key (nfl, nba, ncaam...), always given", "reason": "breaking" | "mine" | "trending" | "league", "new": true}],
 "games": [{"id": "the slate game's id", "story": "two sentences, 30-50 words: the story of this game and why to watch", "hits": [{"tag": "one or two words (Injury, Streak, Milestone, Coaching, Storyline, Hot, Matchup...)", "team": "the team it is about, full name, or empty", "text": "one line, 8-20 words, with the specific fact"}], "read": {"title": "...", "url": "...", "source": "ESPN"}}],
 "teams": [{"name": "the team's name exactly as given in the facts", "lg": "its league key from the facts", "chip": "its status in one to three words: Won 6, Lost 3, Injury, Back-to-back, Winless, Clinched...", "tone": "up" | "down" | "alert" | "", "line": "one line, 8-16 words: the one thing to know about this team right now"}],
 "leagues": [{"key": "the league key from the facts", "story": "${lgStory}", "hits": [{"tag": "...", "team": "the team it is about, full name, or empty", "text": "a short summary of the story in two or three sentences, 30-55 words: what happened, the key detail, and why it matters; not a headline"}], "read": {"title": "...", "url": "...", "source": "ESPN"}}]}
Keep to the lengths given: with many games and teams this page is long, and an answer that runs over is lost. top: exactly 10 stories, most important first: breaking news always comes first (a major injury, trade, firing, signing, suspension or other news from the last day that fans everywhere are talking about), anywhere in sports; then the biggest stories about this person's teams and leagues; then the biggest headlines from around sports even outside what they follow, anything popular enough that a fan would want to know. "reason": breaking for breaking news, mine for a story about their teams or the games on their slate, trending for a big story outside what they follow, league for a story from a league they picked. "new" is true unless the story was already in "prev". games: every game in "games", in the order given, 5 hits each: two about the away team (its "team" set to that team), then two about the home team, then one about the matchup itself (tag Matchup, "team" empty): how the two sides line up against each other; [] if none. A hit is never just how a team's previous game went (no "The Bucks lost to the Hawks on Sunday"): a past result belongs in a hit only as part of a real story, such as a streak, a milestone, an injury or a coaching change. The app prints each game's score and result on the card itself, so a game's "story" and "hits" never give that game's score (no 35-10, no "won by 12"): for a finished or live game write how it was won, who decided it and what it means; for one not started, why to watch. teams: every team in "teams" and no others, each once; [] if "teams" is empty; "tone" is up for good form, down for bad form, alert for an injury or other trouble. leagues: every league in "leagues", ${lgHits} hits each on the biggest stories league-wide, each hit a short two-to-three-sentence summary (never a one-line headline) (not just this person's teams); [] if none. read: the one provided headline (use its exact url) most worth opening for that game or league, or null; never invent a url. Inside the JSON strings, never use double quotation marks.`;
  if (p.kind === "deep") {
    const type = p.key[0], shape = type === "g" ? `{"verdict": "your watchability call in two to five words, such as Must watch, Worth the first half, Background game",
 "take": ["two paragraphs, 90-140 words in all: your honest read on this game: form, stakes, what makes it interesting or not"],
 "number": {"value": "one striking number or score from your sources, such as 42-9: the figure alone or with one or two words, 14 characters at most", "text": "one sentence on what it is and why it matters"},
 "watch": [{"tag": "one or two words", "text": "one line: a specific thing to watch for"}],
 "sides": [{"team": "team name as given", "text": "one line: what this team needs tonight"}],
 "timeline": [{"when": "a short date like Nov 11", "text": "one line: what happened"}],
 "hunch": "one sentence: how it likely plays out, worded as an opinion without first person (Expect..., Feels like..., Likeliest script:...), never My hunch or I think",
 "reads": [{"title": "...", "url": "...", "source": "..."}]}
watch: exactly 3. sides: both teams, away first. timeline: 3-4 dated events that led to this game, oldest first.` : type === "t" ? `{"mood": "the mood around this team in one or two words, such as Rolling, Anxious, Rebuilding",
 "take": ["two paragraphs, 90-140 words in all: the state of this team right now and what its season turns on"],
 "number": {"value": "one striking number from your sources: the figure alone or with one or two words, such as 7 straight, 14 characters at most", "text": "one sentence on what it is and why it matters"},
 "latest": [{"tag": "one or two words", "text": "one line: a recent development"}],
 "said": {"text": "one sentence paraphrasing what a coach or player said this week, quoting at most five words", "who": "who said it and where it was reported"},
 "timeline": [{"when": "a short date like Nov 11", "text": "one line: what happened"}],
 "next": "one line: the next game or two, with day and opponent",
 "reads": [{"title": "...", "url": "...", "source": "..."}]}
latest: 3-4, newest first. timeline: 3-4 dated events in the team's biggest current storyline, oldest first. said: null if your sources have nothing.` : `{"lead": {"title": "the single biggest story right now, as a headline in your own words, 5-10 words", "text": "two sentences, 25-45 words: what happened and why it matters", "team": "the team it is about, full name such as Philadelphia 76ers, or empty", "url": "the exact url of the provided headline about it, or empty"},
 "take": ["two paragraphs, 90-140 words in all: what is going on around this league right now, the newest news first; don't just repeat the lead"],
 "latest": [{"tag": "one or two words: Trade, Injury, Result, Upset, Coaching, Signing, Record, Streak, Suspension, Rumor, Rankings or similar", "team": "the team it is mainly about, full name, or empty", "fresh": true, "text": "one line: a specific development from the last day or two"}],
 "hot": [{"team": "team name", "text": "two to four words, such as won 12 straight"}],
 "cold": [{"team": "team name", "text": "two to four words"}],
 "perf": [{"player": "the player's full name, such as Joel Embiid", "team": "his or her team, full name", "tag": "the stat line or feat in a few words, such as 43 points or 223 yards, 3 TDs: 30 characters at most", "text": "one line: the game and why it stood out"}],
 "number": {"value": "one striking number or milestone from your sources: the figure alone or with one or two words, such as 223 yards, 14 characters at most", "text": "one sentence on what it is and why it matters", "team": "the team it belongs to, full name, or empty"},
 "injuries": [{"player": "full name", "team": "team, full name", "status": "one or two words: Out, Out for season, Day-to-day, Questionable, Returning", "text": "one line: the injury and how long"}],
 "reads": [{"title": "...", "url": "...", "source": "..."}]}
lead: never null. latest: 4-6 of the newest stories (last 48 hours), newest first, each a different story and not the lead; "fresh" is true only for news from today. hot and cold: up to 3 each. perf: 3-5 standout performances from the last two days. injuries: up to 4; [] if none.`;
    return `${type === "l" ? "You're writing a league news briefing for the News page of a sports fan's app: the most up-to-date news around one league, the kind a fan taps to catch up in a minute. Lead with what happened most recently." : `You're writing a tap-in breakdown for the News page of a sports fan's app: a deeper, more creative look at one ${type === "g" ? "game" : "team"} than the dashboard card they just tapped.`} Today is ${etToday()} (US Eastern).
Subject (JSON): ${game}
Facts (JSON: free ESPN data and headlines with url, plus what the dashboard card already said, so go beyond it): ${facts}
${type === "l" ? "Do up to three web searches for the newest news around this league (today and the last two days): trades, injuries, firings, results, rankings." : "Do up to two web searches for the latest news and the story behind it (last 3 days)."}
${RULES}
Every number, date and statement must come from the facts or your searches; your opinions (the take${type === "g" ? ", the verdict and the hunch" : type === "t" ? " and the mood" : ""}) are yours and should read like a sharp friend's.
Answer with only this JSON inside <json></json> tags:
${shape}
reads: 2-3 stories most worth opening, only from the provided headlines or pages your searches actually returned, with their exact url; never invent a url. Leave out any section you have no sourced material for (use null or []). Inside the JSON strings, never use double quotation marks.`;
  }
  if (p.kind === "news" && p.key === "slate") return `You're writing the News page of a sports fan's app, built around this person's slate of games today. Today is ${etToday()} (US Eastern).
Facts (JSON): "slate" (today's games on their slate: id, league, teams, time, TV, why it's on the slate), "byGame" (ESPN and The Athletic headlines about each slate game's teams, with url), "top" (today's top headlines across all of sports, with url), and "interests" (what this person reads most): ${facts}
Do up to three web searches: the biggest storylines behind the most important slate games, and the biggest sports stories of the last day across all sports.
${RULES}
Answer with only this JSON inside <json></json> tags:
{"games": [{"id": "the slate game's id", "game": "Away at Home", "story": "one paragraph, 70-120 words: why this is one of the day's biggest games and the story behind it (stakes, rivalry, form, a player or coach angle, injuries)", "read": {"title": "...", "url": "...", "source": "ESPN" | "The Athletic"}}],
 "around": ["4-6 quick hits, one line each, 12-25 words: the top stories in all of sports right now (not limited to the slate), most important first"]}
games: pick only the 2-4 biggest or most meaningful games on the slate, best first; never list the rest. read: the one headline from byGame for that game (use its exact url) most worth opening, or null if none fits; never invent a url. Inside the JSON strings, never use double quotation marks.`;
  if (p.kind === "news") return `You're writing the News page of a sports fan's app. Today is ${etToday()} (US Eastern).
This brief is for: ${JSON.parse(game || "{}").label || p.key}.
Facts (JSON): the headlines the app already shows for this page (ESPN and The Athletic: title, source, time, description, url)${p.key === "slate" ? ", the games on this person's slate today (teams, time, TV, why it's on the slate)" : p.key === "teams" ? ", this person's favorite teams" : ""}, and what this person reads most ("interests"): ${facts}
Do up to three web searches for the biggest storylines here right now (news from the last 2 days: injuries, trades, coaching, results, what's next). Use your own research, not just the headlines.
${RULES}
Answer with only this JSON inside <json></json> tags:
{"quick": ["5-7 quick hits, one line each, 12-25 words: the most important things to know right now, most important first${p.key === "slate" ? "; lead with what matters for tonight's games" : ""}"],
 "long": ["3-5 paragraphs, 300-450 words in all: a longer read that connects the storylines, with context and what to watch next${p.key === "slate" ? "; walk through tonight's slate in viewing order: why each game matters, who to watch, injuries" : ""}"],
 ${p.key === "slate" ? `"watch": [{"game": "AWY at HOM", "why": "one line: why to watch tonight"}],
 ` : ""}"reads": [{"title": "...", "url": "...", "source": "ESPN" | "The Athletic", "why": "a few words on why it's worth reading"}]}
${p.key === "slate" ? "watch: every game on the slate, in start order. " : ""}reads: 2-4 of the provided headlines (use their exact url) that are most worth opening${p.key === "slate" || p.key === "teams" ? ", favoring this person's interests" : ""}; never invent a url. Inside the JSON strings, never use double quotation marks.`;
  if (p.kind === "moments") return `You're writing the "Moments" page of a sports fan's app: what mattered in ${MOMENT_LGS[p.key]} on the night of ${p.date}.
ESPN facts (JSON): every finished game that night (score, ranks, records, pregame line, overtime, notes, team leaders), plus "performers" (the night's best stat lines, ranked) and, where present, "lines" (every regular's box line): ${facts}
You may do up to two web searches (for example "${MOMENT_LGS[p.key]} last night upsets" or a player's season averages) to judge what was unusual.
${RULES}
Answer with only this JSON inside <json></json> tags:
{"over": [{"name": "full name", "id": "the player's ESPN id from the facts, or empty", "team": "ABBR", "line": "that night's box line in this form: 31 PTS · 9 REB · 5 AST (football: 312 YDS · 3 TD; hockey: 2 G · 1 A · 5 SOG; baseball: 3-4 · HR · 3 RBI or 7 IP · 9 K; soccer: 2 G · 1 A)", "why": "one line, 10-20 words: why this was well above his usual level, with the comparison (season average, role, opponent)"}],
 "under": [{"name": "...", "id": "...", "team": "ABBR", "line": "same form", "why": "one line, 10-20 words: why this was well below what's expected of him"}],
 "games": [{"away": "ABBR", "home": "ABBR", "score": "AWY 98, HOM 101", "tag": "Upset" | "Thriller" | "Comeback" | "Overtime" | "Blowout" | "Statement", "why": "one or two sentences, 20-40 words: what happened and how it ended"}],
 "top": [{"name": "...", "team": "ABBR", "line": "...", "why": "a few words"}]}
over: exactly 5 players who beat their norms by the most (not just the biggest totals). under: exactly 5 established players (starters or stars, judged against their own season averages, which you may look up) who fell well short; take them from "lines" when present; never someone who left hurt unless you say so. In both lists use five different teams: one player per team. games: the 5 most dramatic games (crazy endings, upsets by rank or line, comebacks, overtime, one-score finishes), best first; fewer only if fewer were played. top: only for soccer (Premier League, Champions League: the 10 best performances from goals, assists and key moments); [] otherwise. Use only players and games in the facts. Inside the JSON strings, never use double quotation marks; use single quotes if you must quote.`;
  if (p.kind === "team") return `Write a short summary of this team for a sports fan's app. Today is ${etToday()} (US Eastern).
Team facts (JSON): ${facts}
Do two web searches for this team's news and season story (recent news from the last 4 days, and one including "The Athletic").
${RULES}
Answer with only this JSON inside <json></json> tags:
{"summary": "4-6 sentences, 80-120 words: how the team is playing (record, recent results, streaks, what's working or not), the storylines from the news (injuries, trades, coaching, a standout player), and what's next (the next one or two games, with day)",
 "bullets": ["3-5 short one-line points covering the same ground"],
 "long": ["4-6 paragraphs, 350-550 words in all, going well beyond the summary: the season so far (how they got here, best and worst stretches), the key players with their numbers, injuries and roster moves, coaching and tactics, where they stand in the standings or rankings and what's at stake, and the schedule ahead with the games that matter most"],
 "headlines": [{"title": "...", "source": "The Athletic", "url": "https://www.nytimes.com/athletic/..."}]}
Headlines: only The Athletic stories about this team from the last 2 weeks that your searches actually found, newest first, at most 4; [] if none.`;
  if (p.kind === "recap") return `Write a recap of this finished game for a sports fan's app.
Game (JSON): ${game}
ESPN facts (JSON: final score, box score leaders, team stats, key notes, and "standouts": the night's big individual games from the box score, such as 30+ points, a triple-double, a hat trick or 150 rushing yards): ${facts}
Standouts lead: if "standouts" has anyone, or your search finds a record or a career high, put the biggest one in the first or second sentence with its full line (Stojakovic scored 46 on 14-of-21 shooting), make it the first bullet after the score, and list that player first in "stars". Never leave a standout out.
Do one web search for "<away> <home> recap" to find how it was decided.
${RULES}
Answer with only this JSON inside <json></json> tags:
{"text": "4-6 sentences, 80-120 words: final score and winner, the standout performance if there is one, how it was decided, other top performers with numbers, what it means",
 "bullets": ["3-4 short points covering the same ground"],
 "stars": [{"name": "...", "team": "ABBR", "line": "tonight's box line"}],
 "headlines": [{"title": "...", "source": "The Athletic", "url": "..."}]}
Stars: 2-4 players. Headlines: only The Athletic stories about this game your search found; [] if none.`;
  return `Write a preview of this upcoming game for a sports fan's app. Today is ${etToday()} (US Eastern).
Game (JSON: teams, records, standings or conferences, ranks, TV, start time in UTC, notes): ${game}
ESPN facts (JSON: injuries, season leaders, last5 (each team's results this season, newestFirst, each with its date; the first one is its most recent game), season series, venue): ${facts}
Do two web searches: "<away short> <home short> preview" and "<away short> <home short> The Athletic". Use results from the last 3 days about this game or these teams.
If the game has "post": true, it is a playoff or postseason game (its round is in "note"): frame it that way (the round, the series or aggregate score, win or go home only if it truly is), and never write about regular-season standings, playoff races or seeding as still at stake.
Look for what makes the game matter: standings stakes, rivalries, recent meetings, a player facing his old team, streaks, injuries, coaching angles.
${RULES}
Answer with only this JSON inside <json></json> tags:
{"summary": "4-6 sentences, 70-110 words: lead with why this game matters, then context (standings, recent meetings, form, key absences), close with what decides it",
 "bullets": ["3-5 short one-line points, about 8-16 words each, covering the same ground"],
 "long": ["3-5 paragraphs, 250-400 words in all: how each team is playing, key matchups, storylines and history, the players who decide it, what it means"],
 "watch": [{"name": "...", "team": "ABBR", "line": "short season stat line", "note": "optional few words; a team lead names the exact stat (\"leads Denver in rebounds and assists\"), never \"both categories\""}],
 "series": "one short line on the season series, or empty",
 "headlines": [{"title": "...", "source": "The Athletic", "url": "..."}]}
Watch: 2-4 players, never one who is out. Each "line" is real numbers from the ESPN facts or your searches, the ones that fit why the player is worth watching (3-point percentage for a shooter, rebounds for a big man), never a role or position such as "Boston guard"; if you can't find numbers for a player, pick another. Headlines: only The Athletic stories about this game or these two teams your searches found, newest first, at most 4; [] if none.`;
}

// web search answers can carry <cite index='…'>…</cite> markers: keep the words, drop the tags, everywhere in the answer
// 3.113.2 (DJ: accuracy review): a last check on every write-up before it's saved, for the slips the instructions alone didn't stop.
// First person ("My hunch is that…", "the last table I found") is reworded or the sentence dropped; player lines with no
// number in them ("Boston guard", "Bicycle kick that helped decide the game") are left out of Watch and Stars.
const FIRST = /(^|[^\w'])(I|I'm|I've|I'd|I'll|[Mm]e|[Mm]y|[Ww]e|[Ww]e're|[Ww]e've|[Oo]ur|[Oo]urs|us)(?![\w'])/;
function noFirst(t) {
  t = t.replace(/^(My|Our) (hunch|guess|pick|read|take|call|bet|sense) (is|says) (that )?/i, "").replace(/^I (think|expect|suspect|believe|bet|reckon|would guess|'d guess) (that )?/i, "");
  t = t.replace(/^\s*\S/, (c) => c.toUpperCase());
  if (!FIRST.test(t)) return t;
  const parts = t.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || [t], keep = parts.filter((x) => !FIRST.test(x));
  return keep.length ? keep.join("").trim() : t;
}
function tidy(v, key) {
  if (typeof v === "string") return /^(url|id|title|source|name|team|player|lg|key|tag|tone|reason|value)$/.test(key || "") ? v : noFirst(v);
  if (Array.isArray(v)) return v.map((x) => tidy(x, key)).filter((x) => !((key === "watch" || key === "stars") && x && typeof x === "object" && "line" in x && !/\d/.test(String(x.line || ""))));
  if (v && typeof v === "object") { const o = {}; for (const [k, x] of Object.entries(v)) o[k] = tidy(x, k); return o; }
  return v;
}
function stripCites(v) {
  if (typeof v === "string") return v.replace(/<\/?cite\b[^>]*>/gi, "").replace(/\s{2,}/g, " ").trim();
  if (Array.isArray(v)) return v.map(stripCites);
  if (v && typeof v === "object") { const o = {}; for (const [k, x] of Object.entries(v)) o[k] = stripCites(x); return o; }
  return v;
}
// escape raw line breaks and tabs that Claude sometimes leaves inside JSON strings (paragraph breaks in long text)
function fixJson(t) {
  let out = "", inStr = false, esc = false;
  for (const ch of t) {
    if (inStr) {
      if (esc) { out += ch; esc = false; continue; }
      if (ch === "\\") { out += ch; esc = true; continue; }
      if (ch === '"') { inStr = false; out += ch; continue; }
      if (ch === "\n") { out += "\\n"; continue; }
      if (ch === "\r") continue;
      if (ch === "\t") { out += " "; continue; }
      if (ch < " ") continue;
      out += ch;
    } else { if (ch === '"') inStr = true; out += ch; }
  }
  return out;
}
async function askClaude(env, text, big, searches, lean) {
  if (lean && lean.model) { try { const r = await askClaude(env, text, big, searches, { effort: lean.effort, model: lean.model, only: true }); r.model = "haiku55"; return r; } catch (e) { console.log("lean model failed, Sonnet instead", String(e).slice(0, 160)); lean = { effort: lean.effort }; } }
  const msgs = [{ role: "user", content: text }], usage = { input_tokens: 0, output_tokens: 0, server_tool_use: { web_search_requests: 0 } };
  let out = "";
  for (let turn = 0; turn < 4; turn++) {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: Object.assign({ Authorization: "Bearer " + apiKey(env).trim(), "anthropic-version": "2023-06-01", "content-type": "application/json" }, env.ANTHROPIC_WORKSPACE_ID ? { "anthropic-workspace-id": env.ANTHROPIC_WORKSPACE_ID } : {}),
      body: JSON.stringify(Object.assign({ model: (lean && lean.model) || MODEL, max_tokens: big === true ? 10000 : big || 4000, tools: [{ type: lean && !lean.model ? "web_search_20260209" : "web_search_20250305", name: "web_search", max_uses: searches || 2 }], messages: msgs }, lean && lean.effort ? { output_config: { effort: lean.effort } } : {}))
    });
    const body = await r.json().catch(() => ({}));
    // a request the API won't take with the 3.85.0 settings (newer search, effort) goes again the old way
    if (!r.ok && r.status === 400 && lean && !lean.only) { console.log("lean settings refused, old way", ((body.error || {}).message || "").slice(0, 160)); return askClaude(env, text, big, searches, null); }
    if (!r.ok) throw new Error("Claude API " + r.status + ": " + ((body.error || {}).message || "").slice(0, 160));
    const u = body.usage || {}; usage.input_tokens += (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0); usage.output_tokens += u.output_tokens || 0;
    usage.server_tool_use.web_search_requests += ((u.server_tool_use || {}).web_search_requests) || 0;
    out += (body.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
    // a long search turn can pause; hand the partial answer back so Claude finishes it
    if (body.stop_reason === "pause_turn") { msgs.push({ role: "assistant", content: body.content }); continue; }
    // an answer cut off at the limit would be cut off again: hand that back instead of throwing, so the step isn't retried (and paid for) a second time
    if (body.stop_reason === "max_tokens") return { ans: null, tooLong: true, usage, why: "turn " + (turn + 1) + ", " + (u.output_tokens || 0) + " out of " + (big === true ? 10000 : big || 4000) + ", " + usage.input_tokens + " in, " + usage.server_tool_use.web_search_requests + " searches" };
    break;
  }
  const all = [...out.matchAll(/<json>([\s\S]*?)<\/json>/g)], m = all.length ? all[all.length - 1] : /(\{[\s\S]*\})/.exec(out);
  if (!m) throw new Error("No summary in Claude's answer: " + out.slice(-140));
  let raw = m[1].trim().replace(/^```(json)?/, "").replace(/```$/, "");
  try { return { ans: JSON.parse(raw), usage }; }
  catch (e) {  // the usual slips: line breaks or tabs inside strings, curly quotes, stray trailing commas
    raw = fixJson(raw).replace(/,\s*([\]}])/g, "$1");
    try { return { ans: JSON.parse(raw), usage }; }
    catch (e2) { return { ans: JSON.parse(raw.replace(/[\u201c\u201d]/g, '\\"')), usage }; }
  }
}

const athletic = (list) => (Array.isArray(list) ? list : []).filter((h) => h && h.title && /^https:\/\/(www\.)?(nytimes\.com\/athletic|theathletic\.com)/.test(h.url || "")).slice(0, 4).map((h) => ({ title: String(h.title).slice(0, 200), source: "The Athletic", url: h.url }));
const strs = (a, n) => (Array.isArray(a) ? a : []).map((x) => String(x || "").trim()).filter(Boolean).slice(0, n);

export class SummaryWorkflow extends WorkflowEntrypoint {
  async run(event, step) {
    const p = event.payload, t = target(p);
    try {
      const res = await step.do("ask Claude", { retries: { limit: 1, delay: "10 seconds" }, timeout: "9 minutes" }, async () => askClaude(this.env, prompt(p), p.kind === "moments" ? true : p.kind === "news" && p.key === "page" ? 32000 : p.kind === "deep" ? 6000 : false, p.kind === "deep" && p.key[0] === "l" ? 3 : SEARCHES[p.kind], LEAN[p.kind]));
      // 3.113.3 (DJ: "I do want the server check"): sentences that contradict ESPN's records and dated results are left out (factcheck.js)
      const fcKind = p.kind === "recap" ? "recap" : p.kind === "preview" || !p.kind || p.kind === "deep" && p.key[0] === "g" || p.kind === "news" && p.key === "page" || p.kind === "team" ? "preview" : "";
      const chk = fcKind ? factCheck(fcKind, tidy(stripCites(res.ans || res)), p.kind === "team" ? teamFacts(p.facts, p.key) : p.facts, p.kind === "team" ? "{}" : p.game) : { ans: tidy(stripCites(res.ans || res)), dropped: [] }, ans = chk.ans, fc = chk.dropped.slice(0, 20);
      if (fc.length) console.log("fact check left out", fc.length, JSON.stringify(fc).slice(0, 1500));
      await step.do("log cost", async () => { try { await logUsage(this.env, p.user || "dj", res.usage || {}, res.model || null, !!res.tooLong); } catch (e) {} return true; });
      if (res.tooLong) { console.log("ran too long", p.kind, p.key, res.why || ""); throw new Error("Claude's answer ran too long" + (res.why ? " (" + res.why + ")" : "")); }
      const now = new Date().toISOString();
      await step.do("save", { retries: { limit: 2, delay: "5 seconds" } }, async () => {
        // H cuts hard (ids, keys, urls). S is for words people read: text over the limit is cut back to a whole word
        // and ends in an ellipsis, never mid-word ("3 T", "65+ yar").
        const H = (v, n) => String(v == null ? "" : v).trim().slice(0, n);
        const S = (v, n) => { const t = String(v == null ? "" : v).trim(); if (t.length <= n) return t; const c = t.slice(0, n - 1), i = c.lastIndexOf(" "); return (i > n * 0.4 ? c.slice(0, i) : c).replace(/[\s,;:.\-]+$/, "") + "\u2026"; };
        const rd = (r) => r && r.title && /^https:\/\//.test(r.url || "") ? { title: S(r.title, 200), url: H(r.url, 600), source: S(r.source, 40) } : null;
        const hits = (a, n, len) => (Array.isArray(a) ? a : []).filter((h) => h && h.text).slice(0, n).map((h) => ({ tag: S(h.tag, 48), team: H(h.team, 60), text: S(h.text, len || 260) }));
        const num = (x) => x && x.value && x.text ? { value: S(x.value, 28), text: S(x.text, 300), team: H(x.team, 60) } : null;
        if (p.kind === "news" && p.key === "page") {
          let f = {}; try { f = JSON.parse(p.facts || "{}"); } catch (e) {}
          const top = (Array.isArray(ans.top) ? ans.top : []).filter((x) => x && x.title).slice(0, 10).map((x) => ({ title: S(x.title, 140), why: S(x.why, 360), tag: S(x.tag, 32), team: H(x.team, 60), lg: H(x.lg, 12), reason: ["breaking", "mine", "trending", "league"].indexOf(x.reason) !== -1 ? x.reason : "", new: x.new !== false }));
          const games = (Array.isArray(ans.games) ? ans.games : []).filter((g) => g && g.id && g.story).slice(0, 40).map((g) => ({ id: H(g.id, 60), story: S(g.story, 600), hits: hits(g.hits, 5), read: rd(g.read) }));
          const teams = (Array.isArray(ans.teams) ? ans.teams : []).filter((x) => x && x.name).slice(0, 100).map((x) => ({ name: H(x.name, 60), lg: H(x.lg, 12), chip: S(x.chip, 24), tone: ["up", "down", "alert"].includes(x.tone) ? x.tone : "", line: S(x.line, 240), hits: hits(x.hits, 3) }));
          const leagues = (Array.isArray(ans.leagues) ? ans.leagues : []).filter((x) => x && x.key && x.story).slice(0, 16).map((x) => ({ key: H(x.key, 12), story: S(x.story, 700), hits: hits(x.hits, 6, 520), read: rd(x.read) }));
          if (!top.length && !games.length && !teams.length && !leagues.length) throw new Error("Claude's page came back empty");
          await putDoc(this.env, t.path, { date: p.date, cover: f.cover || {}, top, games, teams, leagues, fc, took: Math.max(0, Math.round((Date.parse(now) - Date.parse(p.at)) / 1000)) || 0, at: now, by: p.user || "dj", writing: null });
        } else if (p.kind === "deep") {
          const type = p.key[0], pairs = (a, n, k) => (Array.isArray(a) ? a : []).filter((x) => x && x[k] && x.text).slice(0, n).map((x) => ({ [k]: S(x[k], 60), text: S(x.text, 260) }));
          const out = { key: p.key, date: p.date, type, take: strs(ans.take, 3).map((x) => x.slice(0, 1200)), number: num(ans.number), reads: (Array.isArray(ans.reads) ? ans.reads : []).map(rd).filter(Boolean).slice(0, 3), at: now, by: p.user || "dj", writing: null };
          if (!out.take.length) throw new Error("Claude's breakdown came back empty");
          if (fc.length) out.fc = fc;
          if (type === "g") Object.assign(out, { verdict: S(ans.verdict, 40), watch: hits(ans.watch, 3), sides: pairs(ans.sides, 2, "team"), timeline: pairs(ans.timeline, 4, "when"), hunch: S(ans.hunch, 300) });
          else if (type === "t") Object.assign(out, { mood: S(ans.mood, 32), latest: hits(ans.latest, 4), said: ans.said && ans.said.text ? { text: S(ans.said.text, 300), who: S(ans.said.who, 120) } : null, timeline: pairs(ans.timeline, 4, "when"), next: S(ans.next, 200) });
          else Object.assign(out, { lead: ans.lead && ans.lead.title ? { title: S(ans.lead.title, 140), text: S(ans.lead.text, 400), team: H(ans.lead.team, 60), url: /^https:\/\//.test(ans.lead.url || "") ? H(ans.lead.url, 600) : "" } : null,
            latest: (Array.isArray(ans.latest) ? ans.latest : []).filter((h) => h && h.text).slice(0, 6).map((h) => ({ tag: S(h.tag, 48), team: H(h.team, 60), fresh: h.fresh === true, text: S(h.text, 260) })),
            perf: (Array.isArray(ans.perf) ? ans.perf : []).filter((h) => h && h.text).slice(0, 5).map((h) => ({ player: H(h.player, 60), team: H(h.team, 60), tag: S(h.tag, 48), text: S(h.text, 260) })),
            injuries: (Array.isArray(ans.injuries) ? ans.injuries : []).filter((x) => x && (x.text || typeof x === "string")).slice(0, 5).map((x) => typeof x === "string" ? { text: S(x, 240) } : { player: H(x.player, 60), team: H(x.team, 60), status: S(x.status, 24), text: S(x.text, 240) }),
            hot: pairs(ans.hot, 3, "team"), cold: pairs(ans.cold, 3, "team") });
          await putDoc(this.env, t.path, out);
        } else if (p.kind === "news") {
          const reads = (Array.isArray(ans.reads) ? ans.reads : []).filter((r) => r && r.title && /^https:\/\//.test(r.url || "")).slice(0, 4).map((r) => ({ title: String(r.title).slice(0, 200), url: String(r.url).slice(0, 600), source: String(r.source || "").slice(0, 40), why: String(r.why || "").slice(0, 160) }));
          const watch = (Array.isArray(ans.watch) ? ans.watch : []).slice(0, 12).map((w) => ({ game: String((w || {}).game || "").slice(0, 80), why: String((w || {}).why || "").slice(0, 200) })).filter((w) => w.game);
          const games = (Array.isArray(ans.games) ? ans.games : []).filter((g) => g && g.story).slice(0, 4).map((g) => {
            const r = g.read && /^https:\/\//.test(g.read.url || "") ? { title: String(g.read.title || "").slice(0, 200), url: String(g.read.url).slice(0, 600), source: String(g.read.source || "").slice(0, 40) } : null;
            return { id: String(g.id || "").slice(0, 60), game: String(g.game || "").slice(0, 100), story: String(g.story).slice(0, 1200), read: r };
          });
          await putDoc(this.env, t.path, { key: p.key, date: p.date, games, around: strs(ans.around, 6), quick: strs(ans.quick, 7), long: strs(ans.long, 6), watch, reads, at: now, by: p.user || "dj", writing: null });
        } else if (p.kind === "moments") {
          const pick = (a, n) => (Array.isArray(a) ? a : []).filter((x) => x && (x.name || x.away)).slice(0, n).map((x) => Object.fromEntries(Object.entries(x).map(([k, v]) => [k, String(v == null ? "" : v).slice(0, 300)])));
          await mergeDoc(this.env, t.path, t.patch({ over: pick(ans.over, 5), under: pick(ans.under, 5), games: pick(ans.games, 5), top: pick(ans.top, 10), at: now, writing: null }));
        } else if (p.kind === "team") {
          const g = JSON.parse(p.facts || "{}");
          await putDoc(this.env, t.path, { key: p.key, name: g.name || "", league: g.league || "", summary: String(ans.summary || ""), bullets: strs(ans.bullets, 5), long: strs(ans.long, 6), headlines: athletic(ans.headlines), at: now, by: "request", writing: null });
        } else if (p.kind === "recap") {
          await mergeDoc(this.env, t.path, t.patch({ recap: { v: RECAP_V, fc, text: String(ans.text || ""), bullets: strs(ans.bullets, 4), stars: (ans.stars || []).slice(0, 4), endedAt: now, at: now }, headlines: athletic(ans.headlines), writing: null, updatedAt: now }));
        } else {
          await mergeDoc(this.env, t.path, t.patch({ fc, summary: String(ans.summary || ""), bullets: strs(ans.bullets, 5), long: strs(ans.long, 5), watch: (ans.watch || []).slice(0, 4), series: String(ans.series || ""), headlines: athletic(ans.headlines), newsAt: now, updatedAt: now, writing: null, by: "request" }));
        }
        return true;
      });
    } catch (e) {
      await step.do("note the failure", async () => { await mergeDoc(this.env, t.path, t.patch({ writing: { at: p.at, kind: p.kind, error: String(e && e.message || e).slice(0, 200) } })); return true; });
    }
  }
}
