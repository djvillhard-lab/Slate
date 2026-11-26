// The News wire, written without a tap (3.138.0). DJ, Nov 25, 2026: "Yes, only when there is news" to the card
// "Allow Claude to write the News wire on a schedule, without a tap?". This is the one place Slate spends Claude money
// without a tap, so it is held tight:
//   - only between 6 AM and midnight Central
//   - only when ESPN or The Athletic has headlines the last write-up hasn't seen:
//       the first write of the day, or a new breaking item (ESPN "HeadlineNews") at least GAP_BREAK minutes after the
//       last write, or NEW_MIN new stories at least GAP_QUIET minutes after it
//   - never more than DAY_MAX write-ups a day
// The write-up itself is the same one the Generate / Update button asks for (kind "deep", key "w-wire", one doc for
// everyone: newsdeep/<Central day>-w-wire), built from the same facts the app sends (src/app/203-news-lab.js nlAsk).
// State (what's been seen, how many today) lives in the doc newsdeep/wire-auto. Notes: docs/pages/news.md.
import { rss } from "./newsletters.js";

const LGS = [  // key (the app's league key), ESPN path, The Athletic's feed
  ["nfl", "football/nfl", "nfl"], ["nba", "basketball/nba", "nba"], ["ncaaf", "football/college-football", "college-football"],
  ["ncaam", "basketball/mens-college-basketball", "college-basketball"], ["nhl", "hockey/nhl", "nhl"], ["mlb", "baseball/mlb", "mlb"],
  ["epl", "soccer/eng.1", "premier-league"], ["ncaaw", "basketball/womens-college-basketball", "womens-college-basketball"],
];
export const WIRE_AUTO = { DAY_MAX: 8, GAP_BREAK: 90, GAP_QUIET: 180, NEW_MIN: 5, FROM_HOUR: 6 };
const FRESH_MS = 30 * 3600000;
const ctParts = (t) => { const p = {}; new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" }).formatToParts(new Date(t)).forEach((x) => { p[x.type] = x.value; }); return { day: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour) }; };
const et = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

async function feed(lg, path, slug, now) {
  const espn = fetch(`https://site.api.espn.com/apis/site/v2/sports/${path}/news?limit=40`, { cf: { cacheTtl: 120 } }).then((r) => (r.ok ? r.json() : {})).then((d) =>
    ((d || {}).articles || []).map((a) => ({ lg, title: a.headline, desc: a.description || "", url: (((a.links || {}).web || {}).href) || "", ts: Date.parse(a.published || a.lastModified || "") || 0, src: "ESPN", kind: a.type || "" }))).catch(() => []);
  const ath = slug ? rss(slug).then((l) => l.slice(0, 12).map((x) => ({ lg, title: x.title, desc: x.desc || "", url: x.url, ts: x.at || 0, src: "The Athletic", kind: "Story" }))).catch(() => []) : Promise.resolve([]);
  const [a, b] = await Promise.all([espn, ath]);
  return a.concat(b).filter((x) => x.title && x.url && x.kind !== "Media" && !/highlights$/i.test(x.title) && now - x.ts < FRESH_MS)
    .sort((x, y) => (x.kind === "HeadlineNews" ? 0 : 1) - (y.kind === "HeadlineNews" ? 0 : 1) || y.ts - x.ts);
}

// Should Claude write now? Returns null (no), or { facts, day, state } for the caller to start the write-up with.
export async function wireDue(env, getDoc, nowMs) {
  const now = nowMs || Date.now(), ct = ctParts(now);
  if (ct.hour < WIRE_AUTO.FROM_HOUR) return null;
  const saved = (await getDoc(env, "newsdeep/wire-auto")) || {}, st = saved.day === ct.day ? saved : { day: ct.day, n: 0, lastAt: 0, seen: [] };
  if ((st.n || 0) >= WIRE_AUTO.DAY_MAX) return null;
  const gap = (now - (Number(st.lastAt) || 0)) / 60000;
  if (st.n && gap < WIRE_AUTO.GAP_BREAK) return null;   // too soon for anything: don't even fetch
  const lists = await Promise.all(LGS.map(([lg, path, slug]) => feed(lg, path, slug, now)));
  // the same order the app sends: each league's first story, then each league's second, and so on
  const hs = [], dup = {};
  for (let i = 0; i < 9; i++) lists.forEach((l) => { const a = l[i]; if (a && !dup[a.url] && !dup[a.title.toLowerCase()]) { dup[a.url] = dup[a.title.toLowerCase()] = 1; hs.push(a); } });
  if (hs.length < 4) return null;
  const seen = new Set(st.seen || []), fresh = hs.filter((a) => !seen.has(a.url));
  const due = !st.n || (fresh.some((a) => a.kind === "HeadlineNews") && gap >= WIRE_AUTO.GAP_BREAK) || (fresh.length >= WIRE_AUTO.NEW_MIN && gap >= WIRE_AUTO.GAP_QUIET);
  if (!due) return null;
  // new stories first, so they're the ones kept if the facts have to be trimmed
  const ordered = fresh.concat(hs.filter((a) => seen.has(a.url)));
  const headlines = ordered.map((a, i) => ({ n: i + 1, lg: a.lg, type: a.kind || a.src, title: a.title, desc: String(a.desc).slice(0, 140), at: et.format(new Date(a.ts || now)) + " ET", ts: a.ts, url: a.url, source: a.src, new: !seen.has(a.url) || undefined }));
  // today's games, from the day's saved list (the ids the app knows them by); no scores here, so none are stated
  const slate = (await getDoc(env, "slates/" + ct.day)) || {}, KEEP = ["league", "away", "home", "awayAbbr", "homeAbbr", "awayRank", "homeRank", "awayRecord", "homeRecord", "tv", "note", "neutral"];
  const score = (g) => (g.awayRank && g.homeRank ? 3 : g.awayRank || g.homeRank ? 1 : 0) + ((g.tv || []).length ? 1 : 0);
  const games = (Array.isArray(slate.games) ? slate.games : []).filter((g) => g && g.id && g.home && g.start && Date.parse(g.start) > now - 4 * 3600000)
    .sort((a, b) => score(b) - score(a) || String(a.start).localeCompare(String(b.start))).slice(0, 18).map((g) => {
      const o = { id: g.id, start: et.format(new Date(g.start)) + " ET", status: Date.parse(g.start) > now ? "not started" : "started (score not known here: do not state one)" };
      KEEP.forEach((k) => { if (g[k] != null && g[k] !== "") o[k] = g[k]; }); return o;
    });
  const doc = (await getDoc(env, "newsdeep/" + ct.day + "-w-wire")) || {};
  const facts = { headlines, games, prev: (doc.items || []).slice(0, 20).map((x) => x.title) };
  while (JSON.stringify(facts).length > 23000 && facts.headlines.length > 12) facts.headlines.pop();   // the workflow cuts facts at 24,000 characters
  const keep = hs.map((a) => a.url).concat(st.seen || []).filter((u, i, a) => a.indexOf(u) === i).slice(0, 400);
  return { day: ct.day, facts, fresh: fresh.length, state: { day: ct.day, n: (st.n || 0) + 1, lastAt: now, seen: keep } };
}
