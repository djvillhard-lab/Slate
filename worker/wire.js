// Injuries, trades and signings for News (Web 3.114.0). GET /api/wire?lg=nfl
// ESPN's free league-wide injury report and transaction list, trimmed and kept for 20 minutes.
// The NFL injury report is about 9 MB (ESPN lists every healthy player with a fantasy note as "Active"), far too
// big for a phone, so the worker drops those and keeps only what the app shows. Nothing here is estimated: every
// status, date and line is ESPN's own.
const WIRE_LGS = { nfl: "football/nfl", nba: "basketball/nba", nhl: "hockey/nhl", mlb: "baseball/mlb", wnba: "basketball/wnba" };
const KEEP_MIN = 20 * 60;

function cut(s, n) { s = String(s || "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : s; }

async function espn(path) {
  const r = await fetch("https://site.api.espn.com/apis/site/v2/sports/" + path, { cf: { cacheTtl: 300 } });
  if (!r.ok) throw new Error("ESPN " + r.status);
  return r.json();
}

async function build(lg) {
  const base = WIRE_LGS[lg];
  const [inj, tx] = await Promise.all([
    espn(base + "/injuries").catch(() => null),
    espn(base + "/transactions?limit=120").catch(() => null),
  ]);
  const out = { lg, at: new Date().toISOString(), inj: [], tx: [] };
  ((inj && inj.injuries) || []).forEach((t) => {
    (t.injuries || []).forEach((x) => {
      const st = String(x.status || "");
      if (!st || /^active$/i.test(st)) return;
      const a = x.athlete || {}, d = x.details || {}, tm = a.team || {};
      out.inj.push({
        team: tm.displayName || t.displayName || "", ab: tm.abbreviation || "",
        p: a.displayName || "", id: String(((a.links || [])[0] || {}).href || "").match(/\/id\/(\d+)/)?.[1] || "",
        pos: (a.position || {}).abbreviation || "", st, at: x.date || "",
        what: [d.side, d.type, d.detail].filter((w, i, l) => w && !/^not specified$/i.test(w) && l.indexOf(w) === i).join(" "), back: d.returnDate || "",
        note: String(x.shortComment || "").trim().toLowerCase() === st.toLowerCase() ? "" : cut(x.shortComment, 260),
      });
    });
  });
  ((tx && tx.transactions) || []).forEach((x) => {
    const tm = x.team || {};
    out.tx.push({ team: tm.displayName || "", ab: tm.abbreviation || "", at: x.date || "", text: cut(x.description, 400) });
  });
  return out;
}

export async function wireRoute(req, url, { json }) {
  const lg = String(url.searchParams.get("lg") || "").toLowerCase();
  if (!WIRE_LGS[lg]) return json({ error: "unknown league" }, 400);
  const cache = caches.default, key = new Request("https://slate-wire.cache/" + lg);
  const hit = await cache.match(key);
  if (hit) return hit;
  let body;
  try { body = await build(lg); } catch (e) { return json({ error: String(e) }, 502); }
  const res = new Response(JSON.stringify(body), { headers: { "content-type": "application/json", "cache-control": "public, max-age=" + KEEP_MIN } });
  await cache.put(key, res.clone());
  return res;
}
