// Soccer player pictures for the lineup pitch (Web 3.124.0). GET /api/photos?team=Manchester%20United&p=Bruno%20Fernandes|Kobbie%20Mainoo
// ESPN has almost no soccer headshots, so these come from TheSportsDB (thesportsdb.com), a free community sports
// database. One lookup per player by name; a player only gets a picture when TheSportsDB's player is a soccer player
// at the same club (or the only soccer player with exactly that name), so nobody gets a stranger's face.
// Each answer is kept at the edge: a found picture for 30 days, "no picture" for a day. The free key allows about
// 10 lookups, then refuses for about 3 minutes; the rest get "wait" and the app asks again every minute or so.
const KEY = "123";  // TheSportsDB's public free key
const FOUND_SECS = 30 * 86400, NONE_SECS = 86400, COOL_SECS = 200;  // TheSportsDB shuts the door for about 3 minutes after roughly 10 lookups (measured Nov 22, 2026)
const COOL = new Request("https://slate.cache/photo-cool");
// 3.130.6: the edge only remembers answers in the one Cloudflare location that looked them up, and can drop them early.
// A phone that lands on another location started over and ran into the 10-lookup limit, so a whole team showed numbers
// instead of faces (DJ, Nov 22, 2026). Every answer is now also written to one Supabase document per team
// (photos/<team>), which every location reads before asking TheSportsDB.
const SB = "https://xpkzcdaawaqiqgwkkwst.supabase.co";
async function kept(env, team) {
  try {
    const r = await fetch(SB + "/rest/v1/docs?select=data&path=eq." + encodeURIComponent("photos/" + team), { headers: { apikey: env.SUPABASE_SECRET, Authorization: "Bearer " + env.SUPABASE_SECRET } });
    const rows = r.ok ? await r.json() : []; return (rows[0] && rows[0].data) || {};
  } catch (e) { return {}; }
}
const keep = (env, team, data) => fetch(SB + "/rest/v1/rpc/mirror_doc", { method: "POST", headers: { apikey: env.SUPABASE_SECRET, Authorization: "Bearer " + env.SUPABASE_SECRET, "content-type": "application/json" }, body: JSON.stringify({ p_path: "photos/" + team, p_data: data, p_merge: true }) }).catch(() => {});

const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9 ]/g, " ").replace(/\b(fc|cf|afc|sc|ac|cd|club|de|the)\b/g, " ").replace(/\s+/g, " ").trim();
function sameClub(a, b) {
  a = norm(a); b = norm(b); if (!a || !b) return false;
  if (a === b || a.indexOf(b) !== -1 || b.indexOf(a) !== -1) return true;
  const wa = a.split(" ")[0], wb = b.split(" ")[0];
  return wa.length > 3 && wa === wb;  // "Wolverhampton Wanderers" and "Wolverhampton", "Brighton and Hove Albion" and "Brighton"
}

async function lookup(name, team) {
  const r = await fetch("https://www.thesportsdb.com/api/v1/json/" + KEY + "/searchplayers.php?p=" + encodeURIComponent(name));
  const body = await r.text();
  if (!r.ok) return { wait: true, status: r.status, body: body.slice(0, 200) };
  let d = null; try { d = JSON.parse(body); } catch (e) { return { wait: true, status: r.status, body: body.slice(0, 200) }; }
  const all = ((d && d.player) || []).filter((p) => /soccer/i.test(p.strSport || ""));
  const exact = all.filter((p) => norm(p.strPlayer) === norm(name));
  const hit = all.filter((p) => sameClub(p.strTeam, team) || sameClub(p.strTeam2, team))[0] || (exact.length === 1 ? exact[0] : null);
  const src = hit && (hit.strCutout || hit.strThumb || "");
  return { url: src ? src + "/small" : "", who: hit ? hit.strPlayer + " (" + hit.strTeam + ")" : "", seen: all.length };
}

export async function photosRoute(req, url, ctx, h) {
  // the picture itself, passed through and kept for 7 days, so the phone only ever talks to Slate
  if (url.pathname === "/api/photos/img") {
    const u = String(url.searchParams.get("u") || "");
    if (!/^https:\/\/(r2|www)\.thesportsdb\.com\/images\/media\/player\/[a-z]+\/[a-z0-9]+\.(png|jpg)(\/(tiny|small|medium))?$/i.test(u)) return h.json({ error: "bad picture" }, 400);
    const ck = new Request("https://slate.cache/photo-img/" + encodeURIComponent(u));
    const c = await caches.default.match(ck); if (c) return c;
    const r = await fetch(u);
    if (!r.ok) return new Response("", { status: 404 });
    const res = new Response(r.body, { headers: { "content-type": r.headers.get("content-type") || "image/png", "cache-control": "public, max-age=" + FOUND_SECS } });
    ctx.waitUntil(caches.default.put(ck, res.clone()));
    return res;
  }
  const team = String(url.searchParams.get("team") || "").slice(0, 60);
  const names = String(url.searchParams.get("p") || "").split("|").map((s) => s.trim()).filter((s) => s && s.length <= 50 && !/[<>\/\\]/.test(s)).slice(0, 14);
  if (!team || !names.length) return h.json({ error: "team and p needed" }, 400);
  const cache = caches.default, debug = url.searchParams.get("debug") === "1";
  const out = {}, notes = {}, fresh = {}, env = h.env, tkey = norm(team).replace(/ /g, "-");
  let wait = false, store = null;
  try { if (await cache.match(COOL)) wait = true; } catch (e) {}  // still shut out: answer from what is kept, ask nothing new
  for (const name of names) {
    const key = new Request("https://slate.cache/photo/" + encodeURIComponent(norm(team)) + "/" + encodeURIComponent(norm(name)));
    let v = null;
    try { const c = await cache.match(key); if (c) v = await c.json(); } catch (e) {}
    if (v && !v.s && !v.wait) {  // kept here before 3.130.6: copy it into the team's document once, so other locations get it too
      v.s = 1; fresh[norm(name).replace(/ /g, "-")] = { url: v.url || "", who: v.who || "", at: Date.now() };
      ctx.waitUntil(cache.put(key, new Response(JSON.stringify(v), { headers: { "content-type": "application/json", "cache-control": "max-age=" + (v.url ? FOUND_SECS : NONE_SECS) } })));
    }
    if (!v && env && env.SUPABASE_SECRET && tkey) {  // not kept at this location: the team's document may have it
      if (!store) store = await kept(env, tkey);
      const k = store[norm(name).replace(/ /g, "-")], age = k ? (Date.now() - (k.at || 0)) / 1000 : 0;
      if (k && age < (k.url ? FOUND_SECS : NONE_SECS)) {
        v = { url: k.url || "", who: k.who || "", kept: true, s: 1 };
        ctx.waitUntil(cache.put(key, new Response(JSON.stringify(v), { headers: { "content-type": "application/json", "cache-control": "max-age=" + (v.url ? FOUND_SECS : NONE_SECS) } })));
      }
    }
    if (!v) {
      if (wait) continue;  // the free limit was hit this minute: leave the rest for the next ask
      v = await lookup(name, team).catch((e) => ({ wait: true, err: String(e) }));
      if (v.wait) { wait = true; ctx.waitUntil(cache.put(COOL, new Response("1", { headers: { "cache-control": "max-age=" + COOL_SECS } }))); if (debug) notes[name] = v; continue; }
      v.s = 1;
      ctx.waitUntil(cache.put(key, new Response(JSON.stringify(v), { headers: { "content-type": "application/json", "cache-control": "max-age=" + (v.url ? FOUND_SECS : NONE_SECS) } })));
      fresh[norm(name).replace(/ /g, "-")] = { url: v.url || "", who: v.who || "", at: Date.now() };
    }
    out[name] = v.url ? "/api/photos/img?u=" + encodeURIComponent(v.url) : "";
    if (debug) notes[name] = v;
  }
  if (env && env.SUPABASE_SECRET && tkey && Object.keys(fresh).length) ctx.waitUntil(keep(env, tkey, fresh));
  return new Response(JSON.stringify(debug ? { photos: out, wait, notes } : { photos: out, wait }), { headers: { "content-type": "application/json", "cache-control": wait ? "no-store" : "public, max-age=3600" } });
}
