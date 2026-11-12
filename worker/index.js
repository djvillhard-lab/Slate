// Slate worker: serves the app, and writes Claude summaries on demand.
// POST /api/summary {pass, kind: "preview"|"recap"|"team", date, id | key, game, facts}
//   → checks the passcode, marks the item "writing", starts a background workflow, answers at once.
// The workflow asks Claude (with web search) for the summary and saves it to Supabase; the app sees it appear.
// Secrets (Cloudflare → Workers → slate → Settings → Variables and Secrets): ANTHROPIC_API_KEY, SUPABASE_SECRET.
import { WorkflowEntrypoint } from "cloudflare:workers";

const SB = "https://xpkzcdaawaqiqgwkkwst.supabase.co";
const PUB = "sb_publishable_G7sLoJ7ihWxKivYsmkxRJw_CgomPngZ";
const MODEL = "claude-sonnet-5-5";

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
  return u && u.id ? { id: u.id, name: u.name || u.id, cap: Number(u.cap) || 0 } : null;
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
  if (model === "haiku") { day.hl = (day.hl || 0) + 1; day.n -= 1; day.by[user] -= 1; }
  day.by = day.by || {}; day.by[user] = (day.by[user] || 0) + 1;
  await mergeDoc(env, "stats/usage", { days: { [d]: day } });
}

const MOMENT_LGS = { nba: "NBA", ncaam: "men's college basketball", ncaaf: "college football (FBS)", epl: "Premier League" };
function target(p) {
  if (p.kind === "moments") return { path: "moments/" + p.date, patch: (x) => ({ date: p.date, leagues: { [p.key]: x } }) };
  if (p.kind === "team") return { path: "teams/" + p.key, patch: (x) => x };
  return { path: "previews/" + p.date, patch: (x) => ({ games: { [p.id]: x } }) };
}

// the Anthropic key may be saved as ANTHROPIC_API_KEY or as dj-api-key
const apiKey = (env) => env.ANTHROPIC_API_KEY || env["dj-api-key"] || env.DJ_API_KEY || "";

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
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
      const t = target(p), at = new Date().toISOString();
      await mergeDoc(env, t.path, t.patch({ writing: { at, kind: p.kind } }));
      const params = { user: me.id, kind: p.kind, date: p.date || null, id: p.id || null, key: p.key || null, at,
        game: JSON.stringify(p.game || {}).slice(0, 6000), facts: JSON.stringify(p.facts || {}).slice(0, p.kind === "moments" ? 60000 : 16000) };
      try { await env.SUMMARY.create({ params }); }
      catch (e) { await mergeDoc(env, t.path, t.patch({ writing: { at, kind: p.kind, error: "Couldn't start: " + String(e).slice(0, 120) } })); return json({ error: "Couldn't start" }, 500); }
      return json({ ok: true, at }, 202);
    }
    // live highlight wording: one short Claude call per new headline, saved to live/<date> for everyone
    if (url.pathname === "/api/highlight" && req.method === "POST") {
      let p; try { p = await req.json(); } catch { return json({ error: "bad request" }, 400); }
      if (!p || !/^\d{4}-\d{2}-\d{2}$/.test(p.date || "") || !/^[a-z0-9-]{3,60}$/.test(p.id || "") || !p.key || !p.raw) return json({ error: "bad request" }, 400);
      const me = await whoIs(env, p.pass); if (!me) return json({ error: "Wrong passcode" }, 403);
      if (!apiKey(env)) return json({ error: "no key" }, 503);
      const path = "live/" + p.date, cur = (((await getDoc(env, path)) || {}).games || {})[p.id] || {};
      if (cur.key === p.key) return json({ ok: true, text: cur.text });
      if ((cur.n || 0) >= 20) return json({ error: "limit" }, 429);
      const ask = `You write the one live highlight shown under a game on a sports fan's slate. Game: ${String(p.game || "").slice(0, 120)}. Clock: ${String(p.when || "").slice(0, 40)}.
Facts (JSON: candidate angles ranked by an algorithm, the score, team shooting, each team's top three players, the pregame players to watch, and the pregame storylines and headlines about this matchup): ${JSON.stringify(p.facts || {}).slice(0, 1500)}
Pick the single most interesting thing a fan glancing at the score would want to know right now, and write it as one line of about 10-16 words (two very short sentences only if one won't do; never more than 22 words). Be specific and a little creative: a player going off early, a duel between two stars ("Tatum vs. Brown: 14 apiece at the half"), a team that can't miss or can't buy a bucket, a run that flipped the game. Early in a game with little happening, frame the matchup to watch using the stars or a pregame storyline, and tie it to how it's going so far. Use only numbers from the facts, exactly. No hype words, no emojis, no hashtags.
Reply with only the highlight inside <line></line>. Do not explain or think out loud.`;
      const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST",
        headers: Object.assign({ Authorization: "Bearer " + apiKey(env).trim(), "anthropic-version": "2023-06-01", "content-type": "application/json" }, env.ANTHROPIC_WORKSPACE_ID ? { "anthropic-workspace-id": env.ANTHROPIC_WORKSPACE_ID } : {}),
        body: JSON.stringify({ model: "claude-haiku-5-5", max_tokens: 120, thinking: { type: "disabled" }, messages: [{ role: "user", content: ask }] }) });
      const b = await r.json().catch(() => ({}));
      if (!r.ok) return json({ error: "claude " + r.status + ": " + String((b.error || {}).message || "").slice(0, 120) }, 502);
      const rawOut = (b.content || []).filter((x) => x.type === "text").map((x) => x.text).join(" ");
      const lm = /<line>([\s\S]*?)(<\/line>|$)/.exec(rawOut);
      let text = (lm ? lm[1] : rawOut).trim().replace(/^["']|["']$/g, "");
      // a line that rambles or second-guesses itself is dropped; the app keeps its own wording instead
      if (!text || text.length > 220 || /\b(wait|actually|hmm|the stat says|I think|let me)\b/i.test(text)) return json({ error: "unusable" }, 502);
      await mergeDoc(env, path, { date: p.date, games: { [p.id]: { key: String(p.key).slice(0, 80), text, n: (cur.n || 0) + 1, at: new Date().toISOString() } } });
      ctx.waitUntil(logUsage(env, me.id, b.usage || {}, "haiku").catch(() => {}));
      return json({ ok: true, text });
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
      if (!me || me.id === "dj") return json({ error: "Wrong passcode" }, 403);
      const path = String(p.path || "");
      if (!path.startsWith("u/" + me.id + "/") || path.length > 200 || JSON.stringify(p.data || {}).length > 400000) return json({ error: "Not allowed" }, 403);
      const r = await rpc(env, "mirror_doc", { p_path: path, p_data: p.data || {}, p_merge: !!p.merge });
      return r.ok ? json({ ok: true }) : json({ error: "Couldn't save" }, 502);
    }
    return env.ASSETS.fetch(req);
  }
};

const RULES = `Rules for all writing: every fact must come from the facts you were given or your web searches; never guess rosters or injuries; no betting talk at all (no spreads, totals, moneylines, odds or sportsbooks; the app shows the lines separately); no quote longer than five words; write in your own words, plain and specific, for a knowledgeable fan.`;

function prompt(p) {
  const game = p.game, facts = p.facts;
  if (p.kind === "moments") return `You're writing the "Moments" page of a sports fan's app: what mattered in ${MOMENT_LGS[p.key]} on the night of ${p.date}.
ESPN facts (JSON): every finished game that night (score, ranks, records, pregame line, overtime, notes, team leaders), plus "performers" (the night's best stat lines, ranked) and, where present, "lines" (every regular's box line): ${facts}
You may do up to three web searches (for example "${MOMENT_LGS[p.key]} last night upsets" or a player's season averages) to judge what was unusual.
${RULES}
Answer with only this JSON inside <json></json> tags:
{"over": [{"name": "full name", "id": "the player's ESPN id from the facts, or empty", "team": "ABBR", "line": "that night's box line in this form: 31 PTS · 9 REB · 5 AST (football: 312 YDS · 3 TD; soccer: 2 G · 1 A)", "why": "one line, 10-20 words: why this was well above his usual level, with the comparison (season average, role, opponent)"}],
 "under": [{"name": "...", "id": "...", "team": "ABBR", "line": "same form", "why": "one line, 10-20 words: why this was well below what's expected of him"}],
 "games": [{"away": "ABBR", "home": "ABBR", "score": "AWY 98, HOM 101", "tag": "Upset" | "Thriller" | "Comeback" | "Overtime" | "Blowout" | "Statement", "why": "one or two sentences, 20-40 words: what happened and how it ended"}],
 "top": [{"name": "...", "team": "ABBR", "line": "...", "why": "a few words"}]}
over: exactly 5 players who beat their norms by the most (not just the biggest totals). under: exactly 5 established players (starters or stars, judged against their own season averages, which you may look up) who fell well short; take them from "lines" when present; never someone who left hurt unless you say so. In both lists use five different teams: one player per team. games: the 5 most dramatic games (crazy endings, upsets by rank or line, comebacks, overtime, one-score finishes), best first; fewer only if fewer were played. top: only for the Premier League (10 best performances from goals, assists and key moments); [] otherwise. Use only players and games in the facts. Inside the JSON strings, never use double quotation marks; use single quotes if you must quote.`;
  if (p.kind === "team") return `Write a short summary of this team for a sports fan's app. Today is ${new Date().toDateString()}.
Team facts (JSON): ${facts}
Do two or three web searches for this team's news and season story (recent news from the last 4 days, and one including "The Athletic").
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

async function askClaude(env, text, big) {
  const msgs = [{ role: "user", content: text }], usage = { input_tokens: 0, output_tokens: 0, server_tool_use: { web_search_requests: 0 } };
  let out = "";
  for (let turn = 0; turn < 4; turn++) {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: Object.assign({ Authorization: "Bearer " + apiKey(env).trim(), "anthropic-version": "2023-06-01", "content-type": "application/json" }, env.ANTHROPIC_WORKSPACE_ID ? { "anthropic-workspace-id": env.ANTHROPIC_WORKSPACE_ID } : {}),
      body: JSON.stringify({ model: MODEL, max_tokens: big ? 10000 : 4000, tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 4 }], messages: msgs })
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
  catch (e) {  // curly quotes and stray trailing commas are the usual slips
    raw = raw.replace(/[\u201c\u201d]/g, '\\"').replace(/,\s*([\]}])/g, "$1");
    return { ans: JSON.parse(raw), usage };
  }
}

const athletic = (list) => (Array.isArray(list) ? list : []).filter((h) => h && h.title && /^https:\/\/(www\.)?(nytimes\.com\/athletic|theathletic\.com)/.test(h.url || "")).slice(0, 4).map((h) => ({ title: String(h.title).slice(0, 200), source: "The Athletic", url: h.url }));
const strs = (a, n) => (Array.isArray(a) ? a : []).map((x) => String(x || "").trim()).filter(Boolean).slice(0, n);

export class SummaryWorkflow extends WorkflowEntrypoint {
  async run(event, step) {
    const p = event.payload, t = target(p);
    try {
      const res = await step.do("ask Claude", { retries: { limit: 1, delay: "10 seconds" }, timeout: "9 minutes" }, async () => askClaude(this.env, prompt(p), p.kind === "moments"));
      const ans = res.ans || res;
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
