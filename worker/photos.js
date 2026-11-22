// Soccer player pictures for the lineup pitch (Web 3.124.0). GET /api/photos?team=Manchester%20United&p=Bruno%20Fernandes|Kobbie%20Mainoo
// ESPN has almost no soccer headshots, so these come from TheSportsDB (thesportsdb.com), a free community sports
// database. One lookup per player by name; a player only gets a picture when TheSportsDB's player is a soccer player
// at the same club (or the only soccer player with exactly that name), so nobody gets a stranger's face.
// Each answer is kept at the edge: a found picture for 7 days, "no picture" for a day. The free key allows about
// 30 lookups a minute, so a busy minute answers "wait" for the rest and the app asks again later.
const KEY = "123";  // TheSportsDB's public free key
const FOUND_SECS = 7 * 86400, NONE_SECS = 86400;

const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9 ]/g, " ").replace(/\b(fc|cf|afc|sc|ac|cd|club|de|the)\b/g, " ").replace(/\s+/g, " ").trim();
function sameClub(a, b) {
  a = norm(a); b = norm(b); if (!a || !b) return false;
  if (a === b || a.indexOf(b) !== -1 || b.indexOf(a) !== -1) return true;
  const wa = a.split(" ")[0], wb = b.split(" ")[0];
  return wa.length > 3 && wa === wb;  // "Wolverhampton Wanderers" and "Wolverhampton", "Brighton and Hove Albion" and "Brighton"
}

async function lookup(name, team) {
  const r = await fetch("https://www.thesportsdb.com/api/v1/json/" + KEY + "/searchplayers.php?p=" + encodeURIComponent(name));
  if (r.status === 429) return { wait: true };
  if (!r.ok) return { wait: true, status: r.status };
  let d = null; try { d = await r.json(); } catch (e) { return { wait: true }; }
  const all = ((d && d.player) || []).filter((p) => /soccer/i.test(p.strSport || ""));
  const exact = all.filter((p) => norm(p.strPlayer) === norm(name));
  const hit = all.filter((p) => sameClub(p.strTeam, team) || sameClub(p.strTeam2, team))[0] || (exact.length === 1 ? exact[0] : null);
  const src = hit && (hit.strCutout || hit.strThumb || "");
  return { url: src ? src + "/small" : "", who: hit ? hit.strPlayer + " (" + hit.strTeam + ")" : "", seen: all.length };
}

export async function photosRoute(req, url, ctx, h) {
  const team = String(url.searchParams.get("team") || "").slice(0, 60);
  const names = String(url.searchParams.get("p") || "").split("|").map((s) => s.trim()).filter((s) => s && s.length <= 50 && !/[<>\/\\]/.test(s)).slice(0, 14);
  if (!team || !names.length) return h.json({ error: "team and p needed" }, 400);
  const cache = caches.default, debug = url.searchParams.get("debug") === "1";
  const out = {}, notes = {};
  let wait = false;
  for (const name of names) {
    const key = new Request("https://slate.cache/photo/" + encodeURIComponent(norm(team)) + "/" + encodeURIComponent(norm(name)));
    let v = null;
    try { const c = await cache.match(key); if (c) v = await c.json(); } catch (e) {}
    if (!v) {
      if (wait) continue;  // the free limit was hit this minute: leave the rest for the next ask
      v = await lookup(name, team).catch(() => ({ wait: true }));
      if (v.wait) { wait = true; if (debug) notes[name] = v; continue; }
      ctx.waitUntil(cache.put(key, new Response(JSON.stringify(v), { headers: { "content-type": "application/json", "cache-control": "max-age=" + (v.url ? FOUND_SECS : NONE_SECS) } })));
    }
    out[name] = v.url || "";
    if (debug) notes[name] = v;
  }
  return new Response(JSON.stringify(debug ? { photos: out, wait, notes } : { photos: out, wait }), { headers: { "content-type": "application/json", "cache-control": wait ? "no-store" : "public, max-age=3600" } });
}
