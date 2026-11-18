// Usage: how much each person uses Slate, for DJ's Project status page (status.html, docs/pages/status.md).
//
// POST /api/usage      {pass, opens, secs, views: {view: n}, where}  → adds to that person's counts for today
// POST /api/usage/all  {pass}  (an admin's passcode only)             → everyone's last 30 days
// POST /api/usage/reset {pass | key, id}  → forgets that person's counts (an admin's passcode or the reader key). For
//   clearing numbers that weren't really theirs, e.g. test runs made with their profile before the test account existed.
// POST /api/usage/marks {pass | key, set?: {id: {v, note?} | null}}  → DJ's check-offs on the status page's "Your list"
//   (an admin's passcode reads and writes; the feedback reader key only reads, so Claude can see what DJ has tried
//   and liked or wants changed). Ids: "rel:<version>" (v: like | work), "todo:<id>" (v: done). Kept in stats/marks.
// POST /api/usage/app-build {}  → {build}: the newest iPhone app build someone is actually running (no passcode needed).
//   The app's "New app version is ready" notice uses it (src/app/280-ios-bridge.js, 3.66.2): a build counts as ready only
//   once a phone has really installed it from TestFlight, not when it's pushed (it can sit in Apple's processing or
//   review for hours). Kept in stats/app-build, raised by the counts below.
//
// The app sends a small count every couple of minutes while it's open (src/app/296-usage.js): how many times it was
// opened, seconds on screen, and how many times each page was shown. Nothing about what was looked at.
// Storage: the existing docs table, one document per person, stats/use/<id>. That table can be read with the app's
// public key, so each document is encrypted (AES-GCM, key made from the worker's SUPABASE_SECRET), like feedback.
const SB = "https://xpkzcdaawaqiqgwkkwst.supabase.co";
const b64 = (u8) => { let s = ""; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
async function cryptoKey(env) {
  const raw = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("slate-usage|" + env.SUPABASE_SECRET));
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}
async function seal(env, obj) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await cryptoKey(env), new TextEncoder().encode(JSON.stringify(obj)));
  return { iv: b64(iv), ct: b64(new Uint8Array(ct)) };
}
async function open(env, enc) {
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(enc.iv) }, await cryptoKey(env), unb64(enc.ct));
  return JSON.parse(new TextDecoder().decode(pt));
}
const ctDay = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" }).format(d || new Date());
// The test account (DJ, Nov 16, 2026): the profile Claude's screenshot checks sign in with, so they never touch a real
// person's. Its id is fixed; it is left out of People, of feedback, and of the admin's list of people.
export const TEST_IDS = ["tester"];
const READER_HASH = "c67723111b4760fef693da748e542a933145f2ee29eae1dfe5fb551e478b0c58";   // the same reader key as worker/feedback.js
const shaHex = async (s) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(s || ""))))].map((x) => x.toString(16).padStart(2, "0")).join("");
const num = (v, max) => Math.max(0, Math.min(max, Math.round(Number(v) || 0)));

export async function usageRoute(req, env, url, h) {
  const { whoIs, getDoc, putDoc, json } = h;
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  if (!env.SUPABASE_SECRET) return json({ error: "not set up" }, 503);
  let p; try { p = await req.json(); } catch { return json({ error: "bad request" }, 400); }
  if (url.pathname === "/api/usage/marks") {
    const admin = p && p.pass && ((await whoIs(env, p.pass)) || {}).admin === true;
    const reader = admin || (p && p.key && (await shaHex(p.key)) === READER_HASH);
    if (!reader) return json({ error: "Not allowed" }, 403);
    if (p.diag === true) {   // 3.96.1: the tap check's logs (src/app/297-diag.js), newest last
      const r = await fetch(`https://xpkzcdaawaqiqgwkkwst.supabase.co/rest/v1/docs?select=path,data&path=like.${encodeURIComponent("stats/diag/")}*&limit=20`,
        { headers: { apikey: env.SUPABASE_SECRET, Authorization: "Bearer " + env.SUPABASE_SECRET } });
      const rows = r.ok ? await r.json() : [], out = {};
      for (const row of rows) { try { out[row.path] = await open(env, row.data.enc); } catch (e) { out[row.path] = { error: "unreadable" }; } }
      return json({ ok: true, diag: out });
    }
    let doc = { marks: {} };
    try { const cur = await getDoc(env, "stats/marks"); if (cur && cur.enc) doc = await open(env, cur.enc); } catch (e) { doc = { marks: {} }; }
    doc.marks = doc.marks || {};
    if (p.set && typeof p.set === "object") {
      if (!admin) return json({ error: "Not allowed" }, 403);
      for (const id of Object.keys(p.set).slice(0, 50)) {
        if (!/^(rel|todo):[A-Za-z0-9._-]{1,40}$/.test(id)) continue;
        const m = p.set[id];
        if (!m || !["like", "work", "done"].includes(m.v)) delete doc.marks[id];
        else doc.marks[id] = { v: m.v, note: String(m.note || "").slice(0, 300), at: new Date().toISOString() };
      }
      const ids = Object.keys(doc.marks); if (ids.length > 400) ids.sort((a, b) => String(doc.marks[a].at).localeCompare(String(doc.marks[b].at))).slice(0, ids.length - 400).forEach((k) => delete doc.marks[k]);
      const r = await putDoc(env, "stats/marks", { enc: await seal(env, doc) });
      if (!r.ok) return json({ error: "Couldn't save" }, 502);
    }
    return json({ ok: true, marks: doc.marks });
  }

  if (url.pathname === "/api/usage/reset") {
    const okd = (p && p.pass && ((await whoIs(env, p.pass)) || {}).admin === true) || (p && p.key && (await shaHex(p.key)) === READER_HASH);
    if (!okd) return json({ error: "Not allowed" }, 403);
    const id = String(p.id || "").replace(/[^a-z0-9_-]/gi, "").slice(0, 40);
    if (!id) return json({ error: "Whose?" }, 400);
    const r = await putDoc(env, "stats/use/" + id, { enc: await seal(env, { id, days: {}, reset: new Date().toISOString() }) });
    return json({ ok: !!r.ok });
  }

  if (url.pathname === "/api/usage/app-build") {
    const cur = (await getDoc(env, "stats/app-build")) || {};
    return json({ ok: true, build: Number(cur.build) || 0 });
  }

  const me = await whoIs(env, p && p.pass);
  if (!me) return json({ error: "Not allowed" }, 403);

  if (url.pathname === "/api/usage" && p.diag && typeof p.diag === "object") {   // 3.96.1: the tap check (src/app/297-diag.js)
    const path = "stats/diag/" + String(me.id).replace(/[^a-z0-9_-]/gi, "").slice(0, 40);
    let doc = { sends: [] };
    try { const cur = await getDoc(env, path); if (cur && cur.enc) doc = await open(env, cur.enc); } catch (e) { doc = { sends: [] }; }
    const d = p.diag, log = Array.isArray(d.log) ? d.log.slice(-150) : [];
    const head = {}; for (const k of ["ver", "build", "app", "pane", "w", "h", "ua", "sw", "renders", "why", "at"]) if (d[k] !== undefined) head[k] = String(d[k]).slice(0, 200);
    head.got = new Date().toISOString();
    const clean = log.map((e) => { const o = {}; if (e && typeof e === "object") for (const k of Object.keys(e).slice(0, 12)) o[String(k).slice(0, 12)] = typeof e[k] === "number" || typeof e[k] === "boolean" ? e[k] : String(e[k]).slice(0, 200); return o; });
    doc.sends = (doc.sends || []).concat([{ head, log: clean }]);
    let n = 0; for (let i = doc.sends.length - 1; i >= 0; i--) { n += doc.sends[i].log.length; if (n > 300) { doc.sends = doc.sends.slice(i + 1); break; } }
    const r = await putDoc(env, path, { enc: await seal(env, doc) });
    return json({ ok: !!r.ok });
  }

  if (url.pathname === "/api/usage") {
    // The iPhone app says so in its user agent ("SlateApp/<version>", every build since 3.24), which is surer than
    // what the page reports. A headless browser is a screenshot or test run, not the person: not counted.
    const ua = req.headers.get("user-agent") || "", appV = (ua.match(/SlateApp\/([0-9][0-9A-Za-z.() -]{0,20})/) || [])[1] || "";
    if (/HeadlessChrome|Playwright|Puppeteer/i.test(ua) || p.auto || TEST_IDS.includes(me.id)) return json({ ok: true, skipped: true });
    const path = "stats/use/" + String(me.id).replace(/[^a-z0-9_-]/gi, "").slice(0, 40);
    let doc = { days: {} };
    try { const cur = await getDoc(env, path); if (cur && cur.enc) doc = await open(env, cur.enc); } catch (e) { doc = { days: {} }; }
    const d = ctDay(), day = (doc.days || {})[d] || { opens: 0, secs: 0, views: {} };
    day.opens += num(p.opens, 5); day.secs += num(p.secs, 300); day.views = day.views || {};
    const v = p.views && typeof p.views === "object" ? p.views : {};
    for (const k of Object.keys(v).slice(0, 30)) if (/^[a-z][a-z0-9-]{1,19}$/.test(k)) day.views[k] = (day.views[k] || 0) + num(v[k], 200);
    doc.days = doc.days || {}; doc.days[d] = day;
    const keep = ctDay(new Date(Date.now() - 30 * 86400000));
    for (const k of Object.keys(doc.days)) if (k < keep) delete doc.days[k];
    doc.id = me.id; doc.name = me.name; doc.last = new Date().toISOString();
    doc.where = appV ? "app" : ["app", "home", "web"].includes(p.where) ? p.where : (doc.where || "");
    if (appV) doc.app = appV.trim() + (/^[0-9]{1,5}$/.test(String(p.build || "")) ? " (" + p.build + ")" : "");                       // the build they last used, shown beside "iPhone app"
    if (/^\d+\.\d+\.\d+$/.test(String(p.ver || ""))) doc.web = p.ver;   // the Slate version their copy is running (a saved copy can be older than the newest)
    doc.seen = doc.seen || {}; if (doc.where) doc.seen[doc.where] = doc.last;   // last time in each place
    const r = await putDoc(env, path, { enc: await seal(env, doc) });
    // the newest build anyone's phone is running: proof that build is out in TestFlight (see /api/usage/app-build)
    const bn = appV && /^[0-9]{1,5}$/.test(String(p.build || "")) ? Number(p.build) : 0;
    if (bn) {
      const top = (await getDoc(env, "stats/app-build")) || {};
      if (bn > (Number(top.build) || 0)) await putDoc(env, "stats/app-build", { build: bn, at: new Date().toISOString() });
    }
    return json({ ok: !!r.ok });
  }

  if (url.pathname === "/api/usage/all") {
    if (me.admin !== true) return json({ error: "Not allowed" }, 403);
    const r = await fetch(`${SB}/rest/v1/docs?select=path,data&path=like.${encodeURIComponent("stats/use/")}*&limit=100`,
      { headers: { apikey: env.SUPABASE_SECRET, Authorization: "Bearer " + env.SUPABASE_SECRET } });
    const list = r.ok ? await r.json() : [], people = [];
    for (const row of list) { try { const d = await open(env, row.data.enc); if (d.last && !TEST_IDS.includes(d.id)) people.push(d); } catch (e) { /* an unreadable one is skipped */ } }   // no "last": cleared and not seen since
    // Claude summaries written today, per person (the worker's running log)
    const claude = ((((await getDoc(env, "stats/usage")) || {}).days || {})[ctDay()] || {}).by || {};
    people.sort((a, b) => String(b.last).localeCompare(String(a.last)));
    return json({ ok: true, today: ctDay(), people, claude });
  }
  return json({ error: "not found" }, 404);
}
