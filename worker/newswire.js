// The News front page, written by Claude on a schedule (3.138.0, reworked 3.139.0). DJ, Nov 25, 2026: "Yes, only when
// there is news" to the card "Allow Claude to write the News wire on a schedule, without a tap?", then: "Make this page
// the same for every user and update on a schedule. No generation or customization." This is the one place Slate
// spends Claude money without a tap, so it is held tight:
//   - only between 6 AM and midnight Central
//   - only when there is something the last write-up hasn't seen:
//       the first write of the day, or a new breaking item (ESPN "HeadlineNews") or 3 newly finished games at least
//       GAP_BREAK minutes after the last write, or NEW_MIN new stories at least GAP_QUIET minutes after it
//   - never more than DAY_MAX write-ups a day, and never past Slate's daily Claude budget (checked in index.js)
// The write-up is kind "deep", key "w-wire", one doc for everyone: newsdeep/<Central day>-w-wire. Its facts are built
// here: real headlines from ESPN and The Athletic, and the day's games from ESPN's scoreboards (scores, leaders, TV),
// so Claude can preview what's coming and recap what's finished. State (what's been seen, how many today) lives in the
// doc newsdeep/wire-auto. Notes: docs/pages/news.md.
import { rss } from "./newsletters.js";

const LGS = [  // key (the app's league key), ESPN path, The Athletic's feed, how much a game here counts
  ["nfl", "football/nfl", "nfl", 5], ["nba", "basketball/nba", "nba", 3], ["ncaaf", "football/college-football", "college-football", 3],
  ["ncaam", "basketball/mens-college-basketball", "college-basketball", 2], ["nhl", "hockey/nhl", "nhl", 2], ["mlb", "baseball/mlb", "mlb", 2],
  ["epl", "soccer/eng.1", "premier-league", 2], ["ncaaw", "basketball/womens-college-basketball", "womens-college-basketball", 1],
];
// 3.141.2 (DJ, Nov 26: "rewrite one an hour from 6am to midnight"): one write-up in every Central hour from 6 AM through 11 PM, 18 a day,
// news or not. DAY_MAX leaves room for a few retries of failed passes. The GAP_ and NEW_ numbers are no longer used.
// 3.141.4 (DJ picked "Every 2 hours" the same night): one write-up in every 2-hour block from 6 AM (6, 8, ... 10 PM), 9 a day.
export const WIRE_AUTO = { DAY_MAX: 12, EVERY: 2, GAP_BREAK: 90, GAP_QUIET: 180, NEW_MIN: 5, NEW_FINALS: 3, FROM_HOUR: 6 };
const FRESH_MS = 30 * 3600000;
const NATIONAL = /^(ABC|CBS|NBC|FOX|ESPN|ESPN2|TNT|TBS|FS1|Prime Video|Peacock|NFL Network|NBA TV|truTV|USA Net|USA)$/i;
const slot = (h) => Math.floor((h - 6) / 2);   // which 2-hour block of the day an hour falls in (6 AM is block 0)
const ctParts = (t) => { const p = {}; new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" }).formatToParts(new Date(t)).forEach((x) => { p[x.type] = x.value; }); return { day: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour) }; };
const et = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const hex = (c) => (/^[0-9a-f]{6}$/i.test(String(c || "")) ? "#" + c : "");

async function feed(lg, path, slug, now) {
  const espn = fetch(`https://site.api.espn.com/apis/site/v2/sports/${path}/news?limit=40`, { cf: { cacheTtl: 120 } }).then((r) => (r.ok ? r.json() : {})).then((d) =>
    ((d || {}).articles || []).map((a) => ({ lg, title: a.headline, desc: a.description || "", url: (((a.links || {}).web || {}).href) || "", ts: Date.parse(a.published || a.lastModified || "") || 0, src: "ESPN", kind: a.type || "" }))).catch(() => []);
  const ath = slug ? rss(slug).then((l) => l.slice(0, 12).map((x) => ({ lg, title: x.title, desc: x.desc || "", url: x.url, ts: x.at || 0, src: "The Athletic", kind: "Story" }))).catch(() => []) : Promise.resolve([]);
  const [a, b] = await Promise.all([espn, ath]);
  return a.concat(b).filter((x) => x.title && x.url && x.kind !== "Media" && !/highlights$/i.test(x.title) && now - x.ts < FRESH_MS)
    .sort((x, y) => (x.kind === "HeadlineNews" ? 0 : 1) - (y.kind === "HeadlineNews" ? 0 : 1) || y.ts - x.ts);
}

// one league's games on one ESPN (Eastern) date, as plain facts
async function board(lg, path, weight, ymd) {
  const d = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${path}/scoreboard?dates=${ymd}`, { cf: { cacheTtl: 60 } }).then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
  return ((d || {}).events || []).map((ev) => {
    const c = (ev.competitions || [])[0] || {}, cs = c.competitors || [], A = cs.find((x) => x.homeAway === "away"), H = cs.find((x) => x.homeAway === "home");
    if (!A || !H || !A.team || !H.team) return null;
    const st = ((ev.status || {}).type || {}), state = st.state === "post" ? "final" : st.state === "in" ? "live" : "not started";
    if (/postponed|canceled|cancelled/i.test(st.description || "")) return null;
    const rank = (x) => { const r = Number((x.curatedRank || {}).current); return r > 0 && r <= 25 ? r : 0; };
    const rec = (x) => ((x.records || [])[0] || {}).summary || "";
    const lead = (x) => { const l = ((x.leaders || [])[0] || {}), p = (l.leaders || [])[0]; return p && p.athlete ? `${x.team.abbreviation}: ${p.athlete.displayName} ${p.displayValue}` : ""; };
    const tv = [].concat(...(c.broadcasts || []).map((b) => b.names || [])).slice(0, 3);
    const g = { ev: String(ev.id), lg, status: state, away: A.team.displayName, home: H.team.displayName, aa: A.team.abbreviation, ha: H.team.abbreviation, ac: hex(A.team.color), hc: hex(H.team.color),
      ar: rec(A), hr: rec(H), ak: rank(A), hk: rank(H), start: ev.date, tv, loc: [A.team.location, A.team.shortDisplayName, H.team.location, H.team.shortDisplayName] };
    if (state !== "not started") { g.as = String(A.score ?? ""); g.hs = String(H.score ?? ""); g.detail = st.shortDetail || ""; g.leaders = [lead(A), lead(H)].filter(Boolean); }
    const note = ((c.notes || [])[0] || {}).headline, hl = ((c.headlines || [])[0] || {}).shortLinkText; if (note) g.note = String(note).slice(0, 90); if (hl) g.headline = String(hl).slice(0, 140);
    g.w = weight + (g.ak && g.hk ? 4 : g.ak || g.hk ? 2 : 0) + (tv.some((n) => NATIONAL.test(n)) ? 2 : 0) + (note ? 1 : 0);
    return g;
  }).filter(Boolean);
}

// has today's page been written in the current format (or is it being written right now)?
async function written(env, getDoc, day, now) { const d = (await getDoc(env, "newsdeep/" + day + "-w-wire")) || {}, w = d.writing; return d.v === 2 || !!(w && w.at && !w.error && now - Date.parse(w.at) < 10 * 60000); }
// The cheap first look, from the every-minute job (one read): inside the hours, under the day's count, and long enough
// since the last pass for anything to be due.
export async function wireSoon(env, getDoc, nowMs) {
  const now = nowMs || Date.now(), ct = ctParts(now); if (ct.hour < WIRE_AUTO.FROM_HOUR) return false;
  const saved = (await getDoc(env, "newsdeep/wire-auto")) || {}; if (saved.day !== ct.day) return true;
  if ((saved.n || 0) >= WIRE_AUTO.DAY_MAX) return false;
  if (slot(ctParts(Number(saved.lastAt) || 0).hour) !== slot(ct.hour) || now - (Number(saved.lastAt) || 0) > 2 * 3600000) return true;   // nothing written this hour yet
  return !(await written(env, getDoc, ct.day, now));   // today's page has no finished pass yet (the first one failed): don't wait 90 minutes
}
// Should Claude write now? Returns null (no), or { facts, day, state } for the caller to start the write-up with.
export async function wireDue(env, getDoc, nowMs) {
  const now = nowMs || Date.now(), ct = ctParts(now);
  if (ct.hour < WIRE_AUTO.FROM_HOUR) return null;
  const saved = (await getDoc(env, "newsdeep/wire-auto")) || {}, st = saved.day === ct.day ? saved : { day: ct.day, n: 0, lastAt: 0, seen: [] };
  if ((st.n || 0) >= WIRE_AUTO.DAY_MAX) return null;
  const gap = (now - (Number(st.lastAt) || 0)) / 60000;
  const first = !st.n || !(await written(env, getDoc, ct.day, now));   // nothing finished yet today
  const hourly = slot(ctParts(Number(st.lastAt) || 0).hour) !== slot(ct.hour) || gap > 120;   // nothing written this hour yet
  if (!first && !hourly) return null;   // too soon for anything: don't even fetch
  // 3.140.7: the Central day, not the Eastern one (after 11 PM Central, Eastern is already tomorrow and the night's finals were missed): today's, plus yesterday's until noon Central so last night's late games get their recap
  const ymd = (off) => new Date(Date.parse(ct.day + "T12:00:00Z") + off * 86400000).toISOString().slice(0, 10).replace(/-/g, ""), days = [ymd(0)].concat(ct.hour < 12 ? [ymd(-1)] : [], ct.hour >= 18 ? [ymd(1)] : []);   // and tomorrow's from 6 PM, for the next games up
  const [lists, boards] = await Promise.all([
    Promise.all(LGS.map(([lg, path, slug]) => feed(lg, path, slug, now))),
    Promise.all([].concat(...LGS.map(([lg, path, , w]) => days.map((d) => board(lg, path, w, d))))),
  ]);
  // the same order the app used: each league's first story, then each league's second, and so on
  const hs = [], dup = {};
  for (let i = 0; i < 9; i++) lists.forEach((l) => { const a = l[i]; if (a && !dup[a.url] && !dup[a.title.toLowerCase()]) { dup[a.url] = dup[a.title.toLowerCase()] = 1; hs.push(a); } });
  if (hs.length < 4) return null;
  const all = [].concat(...boards), byW = (a, b) => b.w - a.w || String(a.start).localeCompare(String(b.start));
  const finals = all.filter((g) => g.status === "final" && now - Date.parse(g.start) < 26 * 3600000).sort(byW).slice(0, 12);
  const live = all.filter((g) => g.status === "live").sort(byW).slice(0, 5);
  const next = all.filter((g) => g.status === "not started" && Date.parse(g.start) - now < 20 * 3600000 && Date.parse(g.start) > now - 3600000).sort(byW).slice(0, 10);
  const seen = new Set(st.seen || []), fresh = hs.filter((a) => !seen.has(a.url)), freshF = finals.filter((g) => !seen.has("f:" + g.ev));
  const due = first || hourly;
  if (!due) return null;
  // new stories first, so they're the ones kept if the facts have to be trimmed
  const ordered = fresh.concat(hs.filter((a) => seen.has(a.url)));
  const headlines = ordered.map((a, i) => ({ n: i + 1, lg: a.lg, type: a.kind || a.src, title: a.title, desc: String(a.desc).slice(0, 140), at: et.format(new Date(a.ts || now)) + " ET", ts: a.ts, url: a.url, source: a.src }));
  // the app's own id for each game (from the day's saved list), so a tap on a preview or recap can open its matchup
  const slate = (await getDoc(env, "slates/" + ct.day)) || {}, sg = (Array.isArray(slate.games) ? slate.games : []).filter((g) => g && g.id && g.home);
  const appId = (g) => { const want = g.loc.concat([g.away, g.home]).map(norm), m = sg.find((x) => x.league === g.lg && Math.abs(Date.parse(x.start) - Date.parse(g.start)) < 12 * 3600000 && (want.includes(norm(x.home)) || (x.homeAbbr && x.homeAbbr === g.ha)) && (want.includes(norm(x.away)) || (x.awayAbbr && x.awayAbbr === g.aa))); return m ? String(m.id) : ""; };
  const games = next.concat(live, finals).map((g, i) => { const o = Object.assign({ g: i + 1 }, g, { id: appId(g), start: g.start, when: et.format(new Date(g.start)) + " ET" }); delete o.loc; delete o.w; if (!o.id) delete o.id; return o; });
  const doc = (await getDoc(env, "newsdeep/" + ct.day + "-w-wire")) || {};
  const facts = { headlines, games, prev: (doc.items || []).slice(0, 20).map((x) => x.title) };
  while (JSON.stringify(facts).length > 38000 && facts.headlines.length > 14) facts.headlines.pop();   // the workflow cuts these facts at 40,000 characters
  const keep = hs.map((a) => a.url).concat(finals.map((g) => "f:" + g.ev), st.seen || []).filter((u, i, a) => a.indexOf(u) === i).slice(0, 500);
  return { day: ct.day, facts, fresh: fresh.length + freshF.length, state: { day: ct.day, n: (st.n || 0) + 1, lastAt: now, seen: keep } };
}
