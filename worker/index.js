// Slate worker: serves the app, and writes Claude summaries on demand.
// POST /api/summary {pass, kind: "preview"|"recap"|"team", date, id | key, game, facts}
//   → checks the passcode, marks the item "writing", starts a background workflow, answers at once.
// The workflow asks Claude (with web search) for the summary and saves it to Supabase; the app sees it appear.
// Secrets (Cloudflare → Workers → slate → Settings → Variables and Secrets): ANTHROPIC_API_KEY, SUPABASE_SECRET.
import { WorkflowEntrypoint } from "cloudflare:workers";
import { runAlerts, sendPush, sendApns } from "./alerts.js";
import { runNewsletters } from "./newsletters.js";

const SB = "https://xpkzcdaawaqiqgwkkwst.supabase.co";
const PUB = "sb_publishable_G7sLoJ7ihWxKivYsmkxRJw_CgomPngZ";
const MODEL = "claude-sonnet-5-5";
// web searches allowed per summary: each one adds a cent plus thousands of input tokens
const SEARCHES = { preview: 2, team: 2, recap: 1, moments: 2 };

const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

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
// who a passcode belongs to: DJ (the Supabase passcode) or someone listed (by passcode hash) in users/registry
async function whoIs(env, pass) {
  pass = String(pass || ""); if (pass.length < 8) return null;
  const chk = await rpc(env, "save_doc", { p_path: "prefs/passcheck", p_data: { at: new Date().toISOString(), via: "worker" }, p_pass: pass, p_merge: false }, PUB);
  if (chk.ok && !/not allowed|error/i.test(chk.text)) return { id: "dj", name: "DJ", cap: 0 };
  const reg = (await getDoc(env, "users/registry")) || {}, u = (reg.users || {})[await sha(pass)];
  // everyone but DJ gets at most 10 Claude summaries a day (a lower cap in the registry still applies)
  return u && u.id ? { id: u.id, name: u.name || u.id, cap: Math.min(Number(u.cap) || 10, 10) } : null;
}
const ctDay = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
// running cost log: stats/usage {days: {D: {n, in, out, search, usd, by: {user: n}}}}
const PRICE = { in: 2 / 1e6, out: 10 / 1e6, search: 10 / 1000 };
const HAIKU = { in: 1 / 1e6, out: 5 / 1e6 };
async function logUsage(env, user, u, model) {
  const d = ctDay(), doc = (await getDoc(env, "stats/usage")) || { days: {} }, day = (doc.days || {})[d] || { n: 0, in: 0, out: 0, search: 0, usd: 0, by: {} };
  const inT = (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0), outT = u.output_tokens || 0, sr = ((u.server_tool_use || {}).web_search_requests) || 0;
  day.n += 1; day.in += inT; day.out += outT; day.search += sr;
  const pr = model === "haiku" ? HAIKU : PRICE;
  day.usd = Math.round((day.usd + inT * pr.in + outT * pr.out + sr * PRICE.search) * 10000) / 10000;
  day.by = day.by || {};
  // Haiku lines (free-tier helpers) don't count toward anyone's daily summary limit
  if (model === "haiku") { day.hl = (day.hl || 0) + 1; day.n -= 1; } else day.by[user] = (Number(day.by[user]) || 0) + 1;
  await mergeDoc(env, "stats/usage", { days: { [d]: day } });
}

const MOMENT_LGS = { nfl: "NFL", nba: "NBA", ncaam: "men's college basketball", ncaaf: "college football (FBS)", epl: "Premier League", nhl: "NHL", ncaaw: "women's college basketball", ucl: "Champions League", mlb: "MLB", wnba: "WNBA" };
function target(p) {
  if (p.kind === "moments") return { path: "moments/" + p.date, patch: (x) => ({ date: p.date, leagues: { [p.key]: x } }) };
  if (p.kind === "team") return { path: "teams/" + p.key, patch: (x) => x };
  return { path: "previews/" + p.date, patch: (x) => ({ games: { [p.id]: x } }) };
}

// the Anthropic key may be saved as ANTHROPIC_API_KEY or as dj-api-key
const apiKey = (env) => env.ANTHROPIC_API_KEY || env["dj-api-key"] || env.DJ_API_KEY || "";

export default {
  // every minute: phone alerts from live ESPN scores
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runAlerts(env).catch((e) => console.log("alerts error", String(e))));
    ctx.waitUntil(runNewsletters(env, getDoc, putDoc).catch((e) => console.log("newsletters error", String(e))));
  },
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    // The Athletic FC is email-only: a small Google Apps Script in DJ's Gmail sends each morning's subject line and
    // "View Online" link here. Only DJ's passcode is accepted, and only the link and subject are stored.
    if (url.pathname === "/api/newsletter" && req.method === "POST") {
      let p; try { p = await req.json(); } catch { return json({ error: "bad request" }, 400); }
      const me = await whoIs(env, p && p.pass);
      if (!me || me.id !== "dj") return json({ error: "Wrong passcode" }, 403);
      if (!p || p.key !== "fc" || !/^https:\/\/(links\.e1\.nytimes\.com|www\.nytimes\.com)\//.test(String(p.url || ""))) return json({ error: "bad newsletter" }, 400);
      const at = String(p.at || new Date().toISOString()).slice(0, 30), title = String(p.title || "The Athletic FC").slice(0, 200);
      const doc = (await getDoc(env, "news/email-dj")) || {}, items = { ...(doc.items || {}) };
      const list = (items.fc || []).filter((x) => x.url !== p.url);
      items.fc = [{ title, url: String(p.url).slice(0, 600), at }, ...list].slice(0, 3);
      await putDoc(env, "news/email-dj", { updatedAt: new Date().toISOString(), items });
      return json({ ok: true });
    }
    // the iPhone app reports its live-notification tokens here (it may be in the background, so it posts directly)
    if (url.pathname === "/api/live-token" && req.method === "POST") {
      let p; try { p = await req.json(); } catch { return json({ error: "bad request" }, 400); }
      const me = await whoIs(env, p && p.pass);
      if (!me) return json({ error: "Wrong passcode" }, 403);
      const tok = String(p.token || ""), kind = p.kind, ev = p.env === "sandbox" ? "sandbox" : "production";
      if (!/^[0-9a-f]{32,400}$/i.test(tok) || !["start", "activity"].includes(kind) || (kind === "activity" && !/^[a-z0-9-]{3,60}$/.test(String(p.gameId || "")))) return json({ error: "bad token" }, 400);
      const path = (me.id === "dj" ? "" : "u/" + me.id + "/") + "prefs/liveacts", now = Date.now();
      const doc = (await getDoc(env, path)) || {}, acts = {};
      for (const [k, v] of Object.entries(doc.acts || {})) if (v && now - Date.parse(v.at) < 20 * 3600000) acts[k] = v;  // a day's games only
      let start = (doc.start || []).filter((x) => x.token !== tok);
      if (kind === "start") start = [{ token: tok, env: ev, at: new Date().toISOString() }, ...start].slice(0, 3);
      else acts[p.gameId] = { token: tok, env: ev, at: new Date().toISOString() };
      await putDoc(env, path, { start, acts, updatedAt: new Date().toISOString() });
      return json({ ok: true });
    }
    if (url.pathname === "/api/summary" && req.method === "POST") {
      let p; try { p = await req.json(); } catch { return json({ error: "bad request" }, 400); }
      if (!p || !["preview", "recap", "team", "moments"].includes(p.kind)) return json({ error: "bad kind" }, 400);
      if (p.kind === "moments" ? !(MOMENT_LGS[p.key] && /^\d{4}-\d{2}-\d{2}$/.test(p.date || "")) : p.kind === "team" ? !/^[a-z0-9-]{2,40}$/.test(p.key || "") : !(/^\d{4}-\d{2}-\d{2}$/.test(p.date || "") && /^[a-z0-9-]{3,60}$/.test(p.id || ""))) return json({ error: "bad target" }, 400);
      if (!apiKey(env) || !env.SUPABASE_SECRET) return json({ error: "Summaries aren't set up yet (missing keys in Cloudflare)." }, 503);
      const me = (env.SUPABASE_SECRET && p.pass === env.SUPABASE_SECRET) ? { id: "dj", cap: 0 } : await whoIs(env, p.pass);
      if (!me) return json({ error: "Wrong passcode" }, 403);
      if (me.cap) {
        const day = (((await getDoc(env, "stats/usage")) || {}).days || {})[ctDay()] || {};
        if (((day.by || {})[me.id] || 0) >= me.cap) return json({ error: "That's today's limit of " + me.cap + " Claude summaries. More tomorrow." }, 429);
      }
      if (p.kind === "moments" && !p.facts) {  // the app only says which night; the free tick job saved the facts
        const fd = await getDoc(env, "mfacts/" + p.date + "-" + p.key);
        if (!fd || !fd.facts) return json({ error: "This night's stats aren't ready yet. Try again in a few minutes." }, 404);
        p.facts = fd.facts;
      }
      const t = target(p), at = new Date().toISOString();
      await mergeDoc(env, t.path, t.patch({ writing: { at, kind: p.kind } }));
      const params = { user: me.id, kind: p.kind, date: p.date || null, id: p.id || null, key: p.key || null, at,
        game: JSON.stringify(p.game || {}).slice(0, 6000), facts: JSON.stringify(p.facts || {}).slice(0, p.kind === "moments" ? 60000 : 16000) };
      try { await env.SUMMARY.create({ params }); }
      catch (e) { await mergeDoc(env, t.path, t.patch({ writing: { at, kind: p.kind, error: "Couldn't start: " + String(e).slice(0, 120) } })); return json({ error: "Couldn't start" }, 500); }
      return json({ ok: true, at }, 202);
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
    if (url.pathname === "/api/whoami" && req.method === "POST") {
      let p; try { p = await req.json(); } catch { return json({ error: "bad request" }, 400); }
      const me = await whoIs(env, p && p.pass);
      return me ? json({ id: me.id, name: me.name }) : json({ error: "Wrong passcode" }, 403);
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
    return env.ASSETS.fetch(req);
  }
};

const RULES = `Rules for all writing: plain text only, no citation tags or markup; every fact must come from the facts you were given or your web searches; never guess rosters or injuries; no betting talk at all (no spreads, totals, moneylines, odds or sportsbooks; the app shows the lines separately); no quote longer than five words; write in your own words, plain and specific, for a knowledgeable fan.`;

function prompt(p) {
  const game = p.game, facts = p.facts;
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
  if (p.kind === "team") return `Write a short summary of this team for a sports fan's app. Today is ${new Date().toDateString()}.
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
ESPN facts (JSON: final score, box score leaders, team stats, key notes): ${facts}
Do one web search for "<away> <home> recap" to find how it was decided.
${RULES}
Answer with only this JSON inside <json></json> tags:
{"text": "4-6 sentences, 80-120 words: final score and winner, how it was decided, top performers with numbers, what it means",
 "bullets": ["3-4 short points covering the same ground"],
 "stars": [{"name": "...", "team": "ABBR", "line": "tonight's box line"}],
 "headlines": [{"title": "...", "source": "The Athletic", "url": "..."}]}
Stars: 2-4 players. Headlines: only The Athletic stories about this game your search found; [] if none.`;
  return `Write a preview of this upcoming game for a sports fan's app. Today is ${new Date().toDateString()}.
Game (JSON: teams, records, standings or conferences, ranks, TV, start time in UTC, notes): ${game}
ESPN facts (JSON: injuries, season leaders, last five results, season series, venue): ${facts}
Do two web searches: "<away short> <home short> preview" and "<away short> <home short> The Athletic". Use results from the last 3 days about this game or these teams.
Look for what makes the game matter: standings stakes, rivalries, recent meetings, a player facing his old team, streaks, injuries, coaching angles.
${RULES}
Answer with only this JSON inside <json></json> tags:
{"summary": "4-6 sentences, 70-110 words: lead with why this game matters, then context (standings, recent meetings, form, key absences), close with what decides it",
 "bullets": ["3-5 short one-line points, about 8-16 words each, covering the same ground"],
 "long": ["3-5 paragraphs, 250-400 words in all: how each team is playing, key matchups, storylines and history, the players who decide it, what it means"],
 "watch": [{"name": "...", "team": "ABBR", "line": "short season stat line", "note": "optional few words"}],
 "series": "one short line on the season series, or empty",
 "headlines": [{"title": "...", "source": "The Athletic", "url": "..."}]}
Watch: 2-4 players, never one who is out. Headlines: only The Athletic stories about this game or these two teams your searches found, newest first, at most 4; [] if none.`;
}

// web search answers can carry <cite index='…'>…</cite> markers: keep the words, drop the tags, everywhere in the answer
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
async function askClaude(env, text, big, searches) {
  const msgs = [{ role: "user", content: text }], usage = { input_tokens: 0, output_tokens: 0, server_tool_use: { web_search_requests: 0 } };
  let out = "";
  for (let turn = 0; turn < 4; turn++) {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: Object.assign({ Authorization: "Bearer " + apiKey(env).trim(), "anthropic-version": "2023-06-01", "content-type": "application/json" }, env.ANTHROPIC_WORKSPACE_ID ? { "anthropic-workspace-id": env.ANTHROPIC_WORKSPACE_ID } : {}),
      body: JSON.stringify({ model: MODEL, max_tokens: big ? 10000 : 4000, tools: [{ type: "web_search_20250305", name: "web_search", max_uses: searches || 2 }], messages: msgs })
    });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error("Claude API " + r.status + ": " + ((body.error || {}).message || "").slice(0, 160));
    const u = body.usage || {}; usage.input_tokens += (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0); usage.output_tokens += u.output_tokens || 0;
    usage.server_tool_use.web_search_requests += ((u.server_tool_use || {}).web_search_requests) || 0;
    out += (body.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
    // a long search turn can pause; hand the partial answer back so Claude finishes it
    if (body.stop_reason === "pause_turn") { msgs.push({ role: "assistant", content: body.content }); continue; }
    if (body.stop_reason === "max_tokens") throw new Error("Claude's answer ran too long");
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
      const res = await step.do("ask Claude", { retries: { limit: 1, delay: "10 seconds" }, timeout: "9 minutes" }, async () => askClaude(this.env, prompt(p), p.kind === "moments", SEARCHES[p.kind]));
      const ans = stripCites(res.ans || res);
      await step.do("log cost", async () => { try { await logUsage(this.env, p.user || "dj", res.usage || {}); } catch (e) {} return true; });
      const now = new Date().toISOString();
      await step.do("save", { retries: { limit: 2, delay: "5 seconds" } }, async () => {
        if (p.kind === "moments") {
          const pick = (a, n) => (Array.isArray(a) ? a : []).filter((x) => x && (x.name || x.away)).slice(0, n).map((x) => Object.fromEntries(Object.entries(x).map(([k, v]) => [k, String(v == null ? "" : v).slice(0, 300)])));
          await mergeDoc(this.env, t.path, t.patch({ over: pick(ans.over, 5), under: pick(ans.under, 5), games: pick(ans.games, 5), top: pick(ans.top, 10), at: now, writing: null }));
        } else if (p.kind === "team") {
          const g = JSON.parse(p.facts || "{}");
          await putDoc(this.env, t.path, { key: p.key, name: g.name || "", league: g.league || "", summary: String(ans.summary || ""), bullets: strs(ans.bullets, 5), long: strs(ans.long, 6), headlines: athletic(ans.headlines), at: now, by: "request", writing: null });
        } else if (p.kind === "recap") {
          await mergeDoc(this.env, t.path, t.patch({ recap: { text: String(ans.text || ""), bullets: strs(ans.bullets, 4), stars: (ans.stars || []).slice(0, 4), endedAt: now, at: now }, headlines: athletic(ans.headlines), writing: null, updatedAt: now }));
        } else {
          await mergeDoc(this.env, t.path, t.patch({ summary: String(ans.summary || ""), bullets: strs(ans.bullets, 5), long: strs(ans.long, 5), watch: (ans.watch || []).slice(0, 4), series: String(ans.series || ""), headlines: athletic(ans.headlines), newsAt: now, updatedAt: now, writing: null, by: "request" }));
        }
        return true;
      });
    } catch (e) {
      await step.do("note the failure", async () => { await mergeDoc(this.env, t.path, t.patch({ writing: { at: p.at, kind: p.kind, error: String(e && e.message || e).slice(0, 200) } })); return true; });
    }
  }
}
