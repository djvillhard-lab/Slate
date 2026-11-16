// Usage: how much each person uses Slate, for DJ's Project status page (status.html, docs/pages/status.md).
//
// POST /api/usage      {pass, opens, secs, views: {view: n}, where}  → adds to that person's counts for today
// POST /api/usage/all  {pass}  (an admin's passcode only)             → everyone's last 30 days
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
const num = (v, max) => Math.max(0, Math.min(max, Math.round(Number(v) || 0)));

export async function usageRoute(req, env, url, h) {
  const { whoIs, getDoc, putDoc, json } = h;
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  if (!env.SUPABASE_SECRET) return json({ error: "not set up" }, 503);
  let p; try { p = await req.json(); } catch { return json({ error: "bad request" }, 400); }
  const me = await whoIs(env, p && p.pass);
  if (!me) return json({ error: "Not allowed" }, 403);

  if (url.pathname === "/api/usage") {
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
    doc.where = ["app", "home", "web"].includes(p.where) ? p.where : (doc.where || "");
    const r = await putDoc(env, path, { enc: await seal(env, doc) });
    return json({ ok: !!r.ok });
  }

  if (url.pathname === "/api/usage/all") {
    if (me.admin !== true) return json({ error: "Not allowed" }, 403);
    const r = await fetch(`${SB}/rest/v1/docs?select=path,data&path=like.${encodeURIComponent("stats/use/")}*&limit=100`,
      { headers: { apikey: env.SUPABASE_SECRET, Authorization: "Bearer " + env.SUPABASE_SECRET } });
    const list = r.ok ? await r.json() : [], people = [];
    for (const row of list) { try { people.push(await open(env, row.data.enc)); } catch (e) { /* an unreadable one is skipped */ } }
    // Claude summaries written today, per person (the worker's running log)
    const claude = ((((await getDoc(env, "stats/usage")) || {}).days || {})[ctDay()] || {}).by || {};
    people.sort((a, b) => String(b.last).localeCompare(String(a.last)));
    return json({ ok: true, today: ctDay(), people, claude });
  }
  return json({ error: "not found" }, 404);
}
