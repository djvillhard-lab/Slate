// Sign in with Google (3.95.0). A Google account is tied to an existing Slate profile, so the profile keeps
// everything it has (teams, rules, favorites, alerts): nothing moves, the profile id stays the same.
//
// Google never runs inside the iPhone app (Google blocks sign-in in app web views), so every Google step happens in
// a browser tab or Safari, joined to the app by a one-time ticket:
//   POST /api/google/start   {kind: "link", pass} or {kind: "signin"}  → {t, s}   t goes in the browser link, s stays here
//   POST /api/google/peek    {t}                                        → {kind, name}   what the browser page shows
//   POST /api/google/finish  {t, token}    (the browser, after Google)  → {ok, kind, name} or {error}
//   POST /api/google/poll    {t, s}        (the app, every few seconds) → {wait} | {ok, ...} | {error}; the answer is given once
//   POST /api/google/status  {pass}                                     → {linked, email}
//   POST /api/google/unlink  {pass}                                     → {ok}
// "link" (Settings → Account, while logged in with the passcode): ties the Google account to that profile.
// "signin" (the log-in page): a Google account already tied to a profile gets a new device key for this phone. A device
// key works like a passcode (users/devices, HMAC only, never the key itself), so the rest of the app needs no change.
// The token is checked with Supabase Auth (Google is set up there); Slate keeps the Supabase user id and the email.
// DJ's own profile can be tied to Google but still logs in with its passcode: DJ's saves are checked in the database.
const SB = "https://xpkzcdaawaqiqgwkkwst.supabase.co";
const PUB = "sb_publishable_G7sLoJ7ihWxKivYsmkxRJw_CgomPngZ";
const TICKET_MIN = 15, MAX_OPEN = 40;
const hex = (n) => [...crypto.getRandomValues(new Uint8Array(n))].map((x) => x.toString(16).padStart(2, "0")).join("");
async function sha(s) { const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(s))); return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join(""); }

// the Google account behind a Supabase access token, or null
async function googleUser(token) {
  token = String(token || ""); if (token.length < 20 || token.length > 4000) return null;
  const r = await fetch(`${SB}/auth/v1/user`, { headers: { apikey: PUB, Authorization: "Bearer " + token } });
  if (!r.ok) return null;
  const u = await r.json();
  const g = (u.identities || []).find((i) => i.provider === "google");
  if (!u.id || !g) return null;
  return { uid: u.id, email: String(u.email || (g.identity_data || {}).email || "").slice(0, 120) };
}

export async function googleRoutes(req, env, url, h) {
  const { json, whoIs, getDoc, putDoc, passKey } = h;
  if (req.method !== "POST") return json({ error: "bad request" }, 400);
  if (!env.SUPABASE_SECRET) return json({ error: "not set up" }, 503);
  let p; try { p = await req.json(); } catch { return json({ error: "bad request" }, 400); }
  p = p || {};
  const op = url.pathname.slice("/api/google/".length);
  const now = Date.now();
  const loadT = async () => { const d = (await getDoc(env, "users/gtickets")) || {}; d.t = d.t || {}; Object.keys(d.t).forEach((k) => { if (now - Date.parse(d.t[k].at || 0) > TICKET_MIN * 60000) delete d.t[k]; }); return d; };
  const nameOf = async (id) => { const reg = ((await getDoc(env, "users/registry")) || {}).users || {}; const u = Object.values(reg).find((x) => x && x.id === id); return u ? u.name || u.id : id === "dj" ? "DJ" : id; };

  if (op === "status" || op === "unlink") {
    const me = await whoIs(env, p.pass);
    if (!me) return json({ error: "Wrong passcode" }, 403);
    const d = (await getDoc(env, "users/google")) || {}, links = d.links || {};
    const mine = Object.keys(links).filter((k) => links[k].id === me.id);
    if (op === "status") return json({ linked: mine.length > 0, email: mine.length ? links[mine[0]].email || "" : "" });
    mine.forEach((k) => delete links[k]); d.links = links;
    const w = await putDoc(env, "users/google", d);
    return w.ok ? json({ ok: true }) : json({ error: "Couldn't save. Try again." }, 502);
  }

  if (op === "start") {
    const kind = p.kind === "link" ? "link" : "signin";
    let id = "";
    if (kind === "link") { const me = await whoIs(env, p.pass); if (!me) return json({ error: "Wrong passcode" }, 403); id = me.id; }
    const d = await loadT();
    if (Object.keys(d.t).length >= MAX_OPEN) return json({ error: "Too many people are signing in right now. Try again in a few minutes." }, 429);
    const t = hex(18), s = hex(18);
    d.t[await sha(t)] = { kind, id, s: await sha(s), at: new Date().toISOString() };
    const w = await putDoc(env, "users/gtickets", d);
    return w.ok ? json({ t, s }) : json({ error: "Couldn't start. Try again." }, 502);
  }

  if (!/^[0-9a-f]{36}$/.test(String(p.t || ""))) return json({ error: "That link isn't right. Start again from Slate." }, 400);
  const d = await loadT(), tk = await sha(p.t), x = d.t[tk];
  if (!x) return json({ error: "That link ran out. Start again from Slate." }, 404);

  if (op === "peek") return json({ kind: x.kind, name: x.kind === "link" ? await nameOf(x.id) : "", done: !!x.res });

  if (op === "finish") {
    if (x.res) return json({ error: "This link was already used. Start again from Slate." }, 409);
    const g = await googleUser(p.token);
    if (!g) return json({ error: "Google didn't confirm who you are. Try again." }, 403);
    const gd = (await getDoc(env, "users/google")) || {}, links = gd.links || {};
    if (x.kind === "link") {
      if (links[g.uid] && links[g.uid].id !== x.id) return json({ error: "That Google account is already connected to another Slate profile." }, 409);
      Object.keys(links).forEach((k) => { if (links[k].id === x.id) delete links[k]; });  // one Google account per profile
      links[g.uid] = { id: x.id, email: g.email, at: new Date().toISOString() }; gd.links = links;
      const w = await putDoc(env, "users/google", gd);
      if (!w.ok) return json({ error: "Couldn't save. Try again." }, 502);
      x.res = { ok: true, kind: "link", email: g.email };
    } else {
      const l = links[g.uid];
      if (!l) return json({ error: "This Google account isn't connected to Slate yet. Open Slate, log in with your passcode, then go to Settings → Account and people → Connect Google." }, 404);
      if (l.id === "dj") return json({ error: "DJ's profile still logs in with its passcode." }, 403);
      const reg = ((await getDoc(env, "users/registry")) || {}).users || {}, u = Object.values(reg).find((v) => v && v.id === l.id);
      if (!u) return json({ error: "That Slate profile isn't active any more. Ask DJ." }, 403);
      const key = "g1-" + hex(24), dv = (await getDoc(env, "users/devices")) || {}, keys = dv.keys || {};
      keys[await passKey(env, key)] = { id: l.id, via: "google", at: new Date().toISOString(), ua: String(req.headers.get("user-agent") || "").slice(0, 80) };
      dv.keys = keys;
      const w = await putDoc(env, "users/devices", dv);
      if (!w.ok) return json({ error: "Couldn't save. Try again." }, 502);
      l.last = new Date().toISOString(); await putDoc(env, "users/google", gd);
      x.res = { ok: true, kind: "signin", pass: key, id: l.id, name: u.name || l.id, admin: u.admin === true };
    }
    d.t[tk] = x; await putDoc(env, "users/gtickets", d);
    return json({ ok: true, kind: x.kind, name: x.kind === "link" ? await nameOf(x.id) : x.res.name, email: g.email });
  }

  if (op === "poll") {
    if (!x.s || x.s !== (await sha(p.s))) return json({ error: "That link isn't right. Start again." }, 403);
    if (!x.res) return json({ wait: true });
    delete d.t[tk]; await putDoc(env, "users/gtickets", d);  // the answer (and any device key) is handed over once
    return json(x.res);
  }
  return json({ error: "bad request" }, 400);
}
